require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');

const JobQueue = require('./lib/jobQueue');
const ImageProcessor = require('./lib/imageProcessor');

const app = express();
if (!process.env.PORT) {
    throw new Error('❌ PORT environment variable is required. Please set PORT in your .env file.');
}
const PORT = process.env.PORT;

// Initialize services
const jobQueue = new JobQueue({
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 3,
    jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS) || 30000,
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || 100,
    cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS) || 60000,
    defaultProcessingTime: parseInt(process.env.DEFAULT_PROCESSING_TIME_MS) || 5000
});

const imageProcessor = new ImageProcessor({
    maxWidth: parseInt(process.env.MAX_IMAGE_WIDTH) || 1024,
    maxHeight: parseInt(process.env.MAX_IMAGE_HEIGHT) || 1024,
    maxInputWidth: parseInt(process.env.MAX_INPUT_IMAGE_WIDTH) || 8192,
    maxInputHeight: parseInt(process.env.MAX_INPUT_IMAGE_HEIGHT) || 8192,
    quality: parseInt(process.env.COMPRESSION_QUALITY * 100) || 80,
    webpConversionThreshold: parseInt(process.env.WEBP_CONVERSION_THRESHOLD_MB) || 2,
    supportedFormats: (process.env.SUPPORTED_FORMATS || 'jpeg,png,webp,gif').split(','),
    processedDir: process.env.PROCESSED_DIR || './processed'
});

// Ensure upload directories exist
async function ensureDirectories() {
    const dirs = [
        process.env.UPLOAD_DIR || './uploads',
        process.env.PROCESSED_DIR || './processed',
        process.env.TEMP_DIR || './temp'
    ];
    
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`Directory ensured: ${dir}`);
        } catch (error) {
            console.error(`Error creating directory ${dir}:`, error);
        }
    }
}

// Setup multer for file uploads
const maxFileSizeBytes = (parseInt(process.env.MAX_IMAGE_FILE_SIZE_MB) || 5) * 1024 * 1024;
console.log(`📏 Maximum file size limit: ${process.env.MAX_IMAGE_FILE_SIZE_MB || 5}MB (${maxFileSizeBytes} bytes)`);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: maxFileSizeBytes, // File size limit
        files: 10 // Maximum 10 files per request
    },
    fileFilter: (req, file, cb) => {
        // Check if it's an image
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        
        // Check supported formats
        const supportedFormats = (process.env.SUPPORTED_FORMATS || 'jpeg,png,webp,gif').split(',');
        const format = file.mimetype.split('/')[1];
        
        if (!supportedFormats.includes(format.toLowerCase())) {
            return cb(new Error(`Unsupported image format: ${format}`));
        }
        
        cb(null, true);
    }
});

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.CORS_ORIGINS_PROD.split(',')
        : process.env.CORS_ORIGINS_DEV.split(','),
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const uploadLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many upload requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to upload endpoints
app.use('/api/process', uploadLimiter);

// Configuration endpoint for client settings
app.get('/api/config', (req, res) => {
    res.json({
        maxImageFileSize: parseInt(process.env.MAX_IMAGE_FILE_SIZE_MB) || 5,
        imageConversionThreshold: parseInt(process.env.IMAGE_CONVERSION_THRESHOLD_MB) || 2,
        maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH) || 1024,
        maxImageHeight: parseInt(process.env.MAX_IMAGE_HEIGHT) || 1024,
        compressionQuality: parseFloat(process.env.COMPRESSION_QUALITY) || 0.8,
        memoryWarningThreshold: parseInt(process.env.MEMORY_WARNING_THRESHOLD_MB) || 50,
        validationErrorDuration: parseInt(process.env.VALIDATION_ERROR_DURATION_MS) || 8000,
        defaultErrorDuration: parseInt(process.env.DEFAULT_ERROR_DURATION_MS) || 5000,
        clientPollInterval: parseInt(process.env.CLIENT_POLL_INTERVAL_MS) || 1000,
        clientMaxPollTime: parseInt(process.env.CLIENT_MAX_POLL_TIME_MS) || 120000,
        serverPort: parseInt(process.env.PORT)
    });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const queueStats = jobQueue.getStats();
        const processorStats = await imageProcessor.getStats();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            queue: queueStats,
            processor: processorStats
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Process single image endpoint
app.post('/api/process/single', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No image file provided'
            });
        }
        
        // Validate image
        if (!imageProcessor.isValidImage(req.file)) {
            return res.status(400).json({
                error: 'Invalid image format'
            });
        }
        
        console.log(`Received single image: ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`);
        
        // Get estimated processing time
        const estimatedTime = await imageProcessor.getEstimatedProcessingTime(req.file);
        
        // Add job to queue
        const jobId = jobQueue.addJob(
            (data, id) => imageProcessor.processImage(data, id),
            req.file,
            {
                priority: parseInt(req.body.priority) || 0,
                maxRetries: 2
            }
        );
        
        res.json({
            success: true,
            jobId,
            estimatedTime,
            message: 'Image processing job queued successfully'
        });
        
    } catch (error) {
        console.error('Error processing single image:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Process multiple images endpoint
app.post('/api/process/batch', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No image files provided'
            });
        }
        
        console.log(`Received batch of ${req.files.length} images`);
        
        const jobs = [];
        const errors = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            
            try {
                // Validate image
                if (!imageProcessor.isValidImage(file)) {
                    errors.push({
                        file: file.originalname,
                        error: 'Invalid image format'
                    });
                    continue;
                }
                
                // Get estimated processing time
                const estimatedTime = await imageProcessor.getEstimatedProcessingTime(file);
                
                // Add job to queue with lower priority for batch processing
                const jobId = jobQueue.addJob(
                    (data, id) => imageProcessor.processImage(data, id),
                    file,
                    {
                        priority: -1, // Lower priority for batch jobs
                        maxRetries: 1
                    }
                );
                
                jobs.push({
                    jobId,
                    filename: file.originalname,
                    estimatedTime
                });
                
            } catch (error) {
                errors.push({
                    file: file.originalname,
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            jobs,
            errors,
            message: `${jobs.length} images queued for processing${errors.length ? `, ${errors.length} failed` : ''}`
        });
        
    } catch (error) {
        console.error('Error processing batch images:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Get job status endpoint
app.get('/api/job/:jobId', (req, res) => {
    try {
        const jobId = req.params.jobId;
        const status = jobQueue.getJobStatus(jobId);
        
        res.json({
            jobId,
            ...status
        });
        
    } catch (error) {
        console.error('Error getting job status:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Get multiple job statuses
app.post('/api/jobs/status', (req, res) => {
    try {
        const { jobIds } = req.body;
        
        if (!Array.isArray(jobIds)) {
            return res.status(400).json({
                error: 'jobIds must be an array'
            });
        }
        
        const statuses = jobIds.map(jobId => ({
            jobId,
            ...jobQueue.getJobStatus(jobId)
        }));
        
        res.json({
            jobs: statuses
        });
        
    } catch (error) {
        console.error('Error getting job statuses:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Serve processed images
app.get('/api/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(process.env.PROCESSED_DIR || './processed', filename);
        
        // Security check: ensure filename doesn't contain path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                error: 'Invalid filename'
            });
        }
        
        // Check if file exists
        await fs.access(filePath);
        
        // Set appropriate headers
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Stream the file
        res.sendFile(path.resolve(filePath));
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({
                error: 'Image not found'
            });
        } else {
            console.error('Error serving image:', error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
});

// Get queue statistics
app.get('/api/stats', async (req, res) => {
    try {
        const queueStats = jobQueue.getStats();
        const processorStats = await imageProcessor.getStats();
        
        res.json({
            timestamp: new Date().toISOString(),
            queue: queueStats,
            processor: processorStats,
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version
            }
        });
        
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: `File too large. Maximum file size allowed: ${process.env.MAX_IMAGE_FILE_SIZE_MB || 5}MB. Please resize your image and try again.`
            });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files. Maximum 10 files per request'
            });
        }
    }
    
    res.status(500).json({
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// Setup job queue event listeners
jobQueue.on('jobStarted', (job) => {
    console.log(`🔄 Job ${job.id} started processing`);
});

jobQueue.on('jobCompleted', (job) => {
    console.log(`✅ Job ${job.id} completed in ${job.processingTime}ms`);
});

jobQueue.on('jobFailed', (job) => {
    console.log(`❌ Job ${job.id} failed: ${job.error.message}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
    
    // Stop accepting new connections
    server.close(() => {
        console.log('📡 HTTP server closed');
    });
    
    // Shutdown job queue
    await jobQueue.shutdown();
    
    // Clean up old files
    await imageProcessor.cleanupOldFiles();
    
    console.log('👋 Server shutdown complete');
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        await ensureDirectories();
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 Image Processing Server running on port ${PORT}`);
            console.log(`📊 Max concurrent jobs: ${jobQueue.maxConcurrentJobs}`);
            console.log(`⏱️  Job timeout: ${jobQueue.jobTimeoutMs}ms`);
            console.log(`📁 Processed images: ${process.env.PROCESSED_DIR || './processed'}`);
            console.log(`🌐 CORS origins: ${process.env.NODE_ENV === 'production' ? 'production origins' : 'development origins'}`);
            
            // Start periodic cleanup
            setInterval(() => {
                imageProcessor.cleanupOldFiles();
            }, 60 * 60 * 1000); // Every hour
        });
        
        // Store server reference for graceful shutdown
        global.server = server;
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();