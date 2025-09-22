require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const JobQueue = require('./lib/jobQueue');
const ImageProcessor = require('./lib/imageProcessor');
const SessionManager = require('./lib/sessionManager');
const EmailService = require('./lib/emailService');
const OrderParser = require('./lib/OrderParser');
const FileValidator = require('./lib/fileValidator');

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
    imageConversionThreshold: parseInt(process.env.IMAGE_CONVERSION_THRESHOLD_MB) || 2,
    supportedFormats: (process.env.SUPPORTED_FORMATS || 'jpeg,png,webp,gif').split(','),
    processedDir: process.env.PROCESSED_DIR || './processed'
});

const sessionManager = new SessionManager({
    sessionsDir: process.env.SESSIONS_DIR || './sessions',
    sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_HOURS) * 60 * 60 * 1000 || 24 * 60 * 60 * 1000,
    maxSessionsPerIP: parseInt(process.env.MAX_SESSIONS_PER_IP) || 10
});

const emailService = new EmailService();

const orderParser = new OrderParser({
    sessionsDir: process.env.SESSIONS_DIR || './sessions'
});

// Initialize secure file validator
const fileValidator = new FileValidator();

// Constants
const IMAGE_SIZE_THRESHOLD = parseInt(process.env.IMAGE_SIZE_THRESHOLD_BYTES) || 1048576; // 1MB default

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
        console.log(`🔍 Validating file: ${file.originalname} (${file.mimetype})`);
        console.log(`🔍 File object details:`, {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            hasBuffer: !!file.buffer,
            bufferSize: file.buffer ? file.buffer.length : 'no buffer',
            size: file.size,
            hasStream: !!file.stream,
            keys: Object.keys(file)
        });

        try {
            // Basic checks that don't require buffer (since buffer isn't available in fileFilter yet)
            if (!file.originalname || !file.mimetype) {
                return cb(new Error('Missing filename or mime type'));
            }

            // Check mime type
            const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!supportedMimeTypes.includes(file.mimetype)) {
                return cb(new Error(`Unsupported file type: ${file.mimetype}`));
            }

            // Check filename for basic safety
            if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
                return cb(new Error('Invalid filename: contains path traversal characters'));
            }

            console.log(`✅ Basic file validation PASSED for ${file.originalname}`);
            cb(null, true);

        } catch (error) {
            console.error(`❌ File validation error for ${file.originalname}:`, error);
            cb(new Error(`Validation error: ${error.message}`));
        }
    }
});

// Enhanced Security Middleware with configurable CSP
const isDevelopment = process.env.NODE_ENV !== 'production';
const cspConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'",
                "data:",
                "blob:",
                ...(process.env.CSP_UNSAFE_INLINE_STYLES === 'true' ? ["'unsafe-inline'"] : [])
            ],
            scriptSrc: [
                "'self'",
                "data:",
                "blob:",
                ...(process.env.CSP_UNSAFE_EVAL_SCRIPTS === 'true' ? ["'unsafe-eval'"] : [])
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                ...(isDevelopment ? ["http://localhost:*", "https://localhost:*"] : [])
            ],
            connectSrc: [
                "'self'",
                ...(isDevelopment ? [
                    "http://localhost:*",
                    "https://localhost:*",
                    "ws://localhost:*",
                    "wss://localhost:*"
                ] : [])
            ],
            fontSrc: ["'self'", "data:", "blob:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "data:", "blob:"],
            frameSrc: ["'none'"],
            childSrc: ["'self'", "blob:"],
            workerSrc: ["'self'", "blob:"],
            manifestSrc: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            ...(isDevelopment ? {} : { upgradeInsecureRequests: [] })
        },
        reportOnly: process.env.CSP_REPORT_ONLY === 'true',
        ...(process.env.CSP_REPORT_URI && {
            reportUri: process.env.CSP_REPORT_URI
        })
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000,
        includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS === 'true',
        preload: !isDevelopment
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    permittedCrossDomainPolicies: false,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true
};

// CORS must be applied before helmet to prevent interference
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGINS_PROD.split(',')
        : process.env.CORS_ORIGINS_DEV.split(','),
    credentials: true
}));

app.use(helmet(cspConfig));

// Log CSP configuration on startup
console.log(`🔒 Content Security Policy: ${process.env.CSP_REPORT_ONLY === 'true' ? 'Report-Only Mode' : 'Enforcement Mode'}`);
console.log(`🔒 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`🔒 Unsafe inline styles: ${process.env.CSP_UNSAFE_INLINE_STYLES === 'true' ? 'Enabled' : 'Disabled'}`);
console.log(`🔒 Unsafe eval scripts: ${process.env.CSP_UNSAFE_EVAL_SCRIPTS === 'true' ? 'Enabled' : 'Disabled'}`);

// Security utility functions for path validation
class PathSecurity {
    static validateSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error('Invalid session ID: must be a non-empty string');
        }
        if (sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\')) {
            throw new Error('Invalid session ID: contains path traversal characters');
        }
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(sessionId)) {
            throw new Error('Invalid session ID: must contain only alphanumeric characters, underscores, and hyphens (max 50 chars)');
        }
        return sessionId;
    }

    static validateLayerId(layerId) {
        if (!layerId || typeof layerId !== 'string') {
            throw new Error('Invalid layer ID: must be a non-empty string');
        }
        if (layerId.includes('..') || layerId.includes('/') || layerId.includes('\\')) {
            throw new Error('Invalid layer ID: contains path traversal characters');
        }
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(layerId)) {
            throw new Error('Invalid layer ID: must contain only alphanumeric characters, underscores, and hyphens (max 100 chars)');
        }
        return layerId;
    }

    static validateOrderNumber(orderNumber) {
        if (!orderNumber || typeof orderNumber !== 'string') {
            throw new Error('Invalid order number: must be a non-empty string');
        }
        if (orderNumber.includes('..') || orderNumber.includes('/') || orderNumber.includes('\\')) {
            throw new Error('Invalid order number: contains path traversal characters');
        }
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(orderNumber)) {
            throw new Error('Invalid order number: must contain only alphanumeric characters, underscores, and hyphens (max 50 chars)');
        }
        return orderNumber;
    }

    static validateFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            throw new Error('Invalid filename: must be a non-empty string');
        }
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
            throw new Error('Invalid filename: contains dangerous characters');
        }
        if (!/^[a-zA-Z0-9_.-]{1,255}$/.test(filename)) {
            throw new Error('Invalid filename: must contain only safe characters (max 255 chars)');
        }
        return filename;
    }
}

// Path validation middleware
const validateSessionId = (req, res, next) => {
    try {
        if (req.params.sessionId) {
            PathSecurity.validateSessionId(req.params.sessionId);
        }
        next();
    } catch (error) {
        console.warn(`🚨 Path traversal attempt blocked: ${error.message} - IP: ${req.ip}`);
        res.status(400).json({
            error: 'Invalid session ID format',
            details: error.message
        });
    }
};

const validateLayerId = (req, res, next) => {
    try {
        if (req.params.layerId) {
            PathSecurity.validateLayerId(req.params.layerId);
        }
        next();
    } catch (error) {
        console.warn(`🚨 Path traversal attempt blocked: ${error.message} - IP: ${req.ip}`);
        res.status(400).json({
            error: 'Invalid layer ID format',
            details: error.message
        });
    }
};

const validateOrderNumber = (req, res, next) => {
    try {
        if (req.params.orderNumber) {
            PathSecurity.validateOrderNumber(req.params.orderNumber);
        }
        next();
    } catch (error) {
        console.warn(`🚨 Path traversal attempt blocked: ${error.message} - IP: ${req.ip}`);
        res.status(400).json({
            error: 'Invalid order number format',
            details: error.message
        });
    }
};

const validateFilename = (req, res, next) => {
    try {
        if (req.params.filename) {
            PathSecurity.validateFilename(req.params.filename);
        }
        next();
    } catch (error) {
        console.warn(`🚨 Path traversal attempt blocked: ${error.message} - IP: ${req.ip}`);
        res.status(400).json({
            error: 'Invalid filename format',
            details: error.message
        });
    }
};

// CORS configuration moved above helmet middleware

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logging
app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

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
        
        // ENHANCED SECURITY: Comprehensive validation with detailed reporting
        const validation = imageProcessor.validateImageSecurity(req.file);
        if (!validation.isValid) {
            console.warn(`🚨 Image processing blocked for ${req.file.originalname}:`, {
                errors: validation.errors,
                warnings: validation.warnings,
                fileInfo: validation.fileInfo
            });

            return res.status(400).json({
                error: 'Image security validation failed',
                details: validation.errors,
                warnings: validation.warnings,
                securityInfo: {
                    detectedType: validation.fileInfo.detectedType,
                    claimedType: validation.fileInfo.mimeType,
                    magicByteValid: validation.magicByteValid,
                    contentSafe: validation.contentSafe
                }
            });
        }

        // Log security validation success
        if (validation.warnings.length > 0) {
            console.warn(`⚠️  Image processing proceeding with warnings for ${req.file.originalname}:`, validation.warnings);
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
                // ENHANCED SECURITY: Comprehensive validation for batch processing
                const validation = imageProcessor.validateImageSecurity(file);
                if (!validation.isValid) {
                    console.warn(`🚨 Batch processing blocked for ${file.originalname}:`, validation.errors);
                    errors.push({
                        file: file.originalname,
                        error: `Security validation failed: ${validation.errors[0]}`,
                        details: validation.errors,
                        securityInfo: {
                            detectedType: validation.fileInfo.detectedType,
                            claimedType: validation.fileInfo.mimeType,
                            magicByteValid: validation.magicByteValid,
                            contentSafe: validation.contentSafe
                        }
                    });
                    continue;
                }

                // Log warnings for batch processing
                if (validation.warnings.length > 0) {
                    console.warn(`⚠️  Batch processing with warnings for ${file.originalname}:`, validation.warnings);
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

// Security monitoring endpoint
app.get('/api/security/status', (req, res) => {
    try {
        res.json({
            timestamp: new Date().toISOString(),
            securityFeatures: {
                magicByteValidation: true,
                contentScanning: true,
                dangerousSignatureDetection: true,
                filenameValidation: true,
                pathTraversalProtection: true,
                contentSecurityPolicy: process.env.CSP_REPORT_ONLY !== 'true',
                rateLimiting: true,
                corsProtection: true
            },
            validationStats: {
                supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
                maxFileSize: parseInt(process.env.MAX_IMAGE_FILE_SIZE_MB) || 5,
                absoluteFileLimit: 50, // MB
                magicByteSignatures: Object.keys(fileValidator.magicBytes).length,
                dangerousSignatures: fileValidator.dangerousSignatures.length,
                suspiciousPatterns: fileValidator.suspiciousPatterns.length
            },
            recommendations: [
                'Monitor logs for security validation failures',
                'Regularly update magic byte signatures',
                'Review and tighten CSP policies',
                'Consider implementing file quarantine for suspicious uploads'
            ]
        });
    } catch (error) {
        console.error('Error getting security status:', error);
        res.status(500).json({
            error: 'Failed to get security status'
        });
    }
});

// Session API Endpoints

// Create new session
app.post('/api/sessions', async (req, res) => {
    try {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const sessionId = await sessionManager.createSession(clientIP);
        
        res.json({
            success: true,
            sessionId: sessionId,
            url: `/${sessionId}`,
            message: 'Session created successfully'
        });
        
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            error: 'Failed to create session'
        });
    }
});

// Get session data
app.get('/api/sessions/:sessionId', validateSessionId, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionData = await sessionManager.getSession(sessionId);
        
        if (!sessionData) {
            return res.status(404).json({
                error: 'Session not found'
            });
        }
        
        res.json({
            success: true,
            session: sessionData
        });
        
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({
            error: 'Failed to get session'
        });
    }
});

// Update session data
app.put('/api/sessions/:sessionId', validateSessionId, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const updates = req.body;
        
        const updatedSession = await sessionManager.updateSession(sessionId, updates);
        
        res.json({
            success: true,
            session: updatedSession,
            message: 'Session updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating session:', error);
        if (error.message === 'Session not found') {
            res.status(404).json({
                error: 'Session not found'
            });
        } else {
            res.status(500).json({
                error: 'Failed to update session'
            });
        }
    }
});

// Add layer to session with image upload
app.post('/api/sessions/:sessionId/layers', validateSessionId, upload.single('image'), async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Check if session exists
        const sessionData = await sessionManager.getSession(sessionId);
        if (!sessionData) {
            return res.status(404).json({
                error: 'Session not found'
            });
        }
        
        console.log(`🔄 POST /api/sessions/${sessionId}/layers - Request received`);
        console.log(`🔄 Request body: ${JSON.stringify(req.body, null, 2)}`);
        console.log(`🔄 Request file: ${req.file ? 'present' : 'not present'}`);
        
        let layerData;
        try {
            // Handle both form-data (req.body.layerData) and direct JSON (req.body)
            if (req.body.layerData) {
                layerData = JSON.parse(req.body.layerData);
                console.log(`🔄 Using form-data layerData`);
            } else if (req.body && Object.keys(req.body).length > 0) {
                layerData = req.body;
                console.log(`🔄 Using direct JSON body`);
            } else {
                layerData = {};
                console.log(`🔄 Using empty layerData`);
            }
        } catch (parseError) {
            console.error(`❌ Parse error: ${parseError.message}`);
            return res.status(400).json({
                error: 'Invalid layer data format'
            });
        }
        
        console.log(`🔄 Final layerData: ${JSON.stringify(layerData, null, 2)}`);
        
        let processedImageBuffer = null;
        let originalImageBuffer = null;
        
        // Check if this is a server-processed image reference
        if (layerData.serverImageUrl) {
            console.log(`🔄 Processing server image reference: ${layerData.serverImageUrl}`);
            
            try {
                // Extract the image filename from the server URL
                const urlMatch = layerData.serverImageUrl.match(/\/api\/images\/(.+)$/);
                console.log(`🔄 URL match result: ${urlMatch ? urlMatch[1] : 'NO MATCH'}`);
                
                if (urlMatch) {
                    const imageFileName = urlMatch[1];
                    const processedImagePath = path.resolve('./processed', imageFileName);
                    
                    console.log(`🔄 Looking for existing processed image: ${processedImagePath}`);
                    
                    if (fsSync.existsSync(processedImagePath)) {
                        // Copy the existing processed image to session
                        processedImageBuffer = fsSync.readFileSync(processedImagePath);
                        originalImageBuffer = processedImageBuffer; // Use processed as original for server images
                        console.log(`✅ Successfully loaded existing image: ${processedImagePath} (${Math.round(processedImageBuffer.length / 1024)}KB)`);
                    } else {
                        console.error(`❌ Processed image not found at: ${processedImagePath}`);
                        // List available files for debugging
                        try {
                            const processedFiles = fsSync.readdirSync('./processed').filter(f => f.includes('generated-image'));
                            console.log(`🔍 Available processed files matching 'generated-image': ${processedFiles.slice(0, 5).join(', ')}${processedFiles.length > 5 ? `... and ${processedFiles.length - 5} more` : ''}`);
                        } catch (listError) {
                            console.error(`❌ Could not list processed directory: ${listError.message}`);
                        }
                    }
                } else {
                    console.error(`❌ Could not extract filename from serverImageUrl: ${layerData.serverImageUrl}`);
                }
            } catch (serverImageError) {
                console.error(`❌ Error processing server image URL: ${serverImageError.message}`);
                console.error(`❌ Stack trace: ${serverImageError.stack}`);
            }
        } else if (req.file) {
            console.log(`🔄 Processing uploaded file for layer: ${req.file.originalname}`);
            console.log(`🔄 File buffer available: ${!!req.file.buffer}, size: ${req.file.buffer ? req.file.buffer.length : 'no buffer'}`);

            // ENHANCED SECURITY: Comprehensive validation for session layer upload (now with buffer available)
            const validation = fileValidator.validateFile(req.file);
            if (!validation.isValid) {
                console.warn(`🚨 Session layer upload blocked for ${req.file.originalname}:`, {
                    sessionId: sessionId,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    fileInfo: validation.fileInfo
                });

                return res.status(400).json({
                    error: 'Image security validation failed',
                    details: validation.errors,
                    warnings: validation.warnings,
                    securityInfo: {
                        detectedType: validation.fileInfo.detectedType,
                        claimedType: validation.fileInfo.mimeType,
                        magicByteValid: validation.magicByteValid,
                        contentSafe: validation.contentSafe
                    }
                });
            }

            // Log warnings for session layer processing
            if (validation.warnings.length > 0) {
                console.warn(`⚠️  Session layer processing with warnings for ${req.file.originalname}:`, validation.warnings);
            }
            
            console.log(`Processing image for session ${sessionId}: ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`);
            
            // Process image with async pattern
            const jobId = jobQueue.addJob(
                (data, id) => imageProcessor.processImage(data, id),
                req.file,
                {
                    priority: parseInt(req.body.priority) || 0,
                    maxRetries: 2,
                    metadata: {
                        layerData: layerData,
                        originalBuffer: req.file.buffer
                    }
                }
            );
            
            // Return immediately with job ID for client polling
            if (req.body.async === 'true') {
                return res.json({
                    success: true,
                    jobId: jobId,
                    message: 'Layer processing started',
                    pollUrl: `/api/sessions/${sessionId}/layers/job/${jobId}`
                });
            }
            
            // Synchronous processing (existing behavior)
            let processingComplete = false;
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds timeout

            while (!processingComplete && attempts < maxAttempts) {
                const status = jobQueue.getJobStatus(jobId);
                console.log(`🔍 Job ${jobId} status check ${attempts + 1}: ${status.status}`);

                if (status.status === 'completed') {
                    // Handle different result formats from job queue
                    if (status.result && status.result.processedFile) {
                        // ImageProcessor result format - use the URL and set serverImageUrl
                        layerData.serverImageUrl = status.result.processedFile.url;
                        console.log(`🔧 Sync processing: Using server image URL: ${layerData.serverImageUrl}`);
                        processedImageBuffer = null; // Will be handled via serverImageUrl in addLayer
                    } else if (status.result && status.result.buffer) {
                        processedImageBuffer = status.result.buffer;
                        console.log(`🔧 Sync processing: Using direct buffer: ${Math.round(processedImageBuffer.length / 1024)}KB`);
                    } else if (status.result && status.result.processedData) {
                        processedImageBuffer = Buffer.from(status.result.processedData, 'base64');
                        console.log(`🔧 Sync processing: Using base64 buffer: ${Math.round(processedImageBuffer.length / 1024)}KB`);
                    } else if (status.result) {
                        console.warn('⚠️ Unexpected result format from job queue:', Object.keys(status.result));
                    }
                    originalImageBuffer = req.file.buffer;
                    processingComplete = true;
                    console.log(`✅ Job ${jobId} completed after ${attempts + 1} attempts`);
                } else if (status.status === 'failed') {
                    console.error(`❌ Job ${jobId} failed: ${status.error?.message || 'Unknown error'}`);
                    throw new Error(status.error?.message || 'Image processing failed');
                } else {
                    // Wait 1 second before checking again
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }
            }

            if (!processingComplete) {
                console.error(`❌ Job ${jobId} timed out after ${maxAttempts} attempts`);
                throw new Error('Image processing timeout');
            }
        } else if (layerData.type === 'text') {
            console.log(`🔄 Processing text layer without image file`);
            // Text layers don't always need image files, just save the layer data
        } else {
            console.log(`🔄 Processing layer without image file: ${layerData.type || 'unknown type'}`);
        }
        
        // Debug: Log what we're passing to addLayer
        console.log(`🔄 About to call addLayer with:`);
        console.log(`  - sessionId: ${sessionId}`);
        console.log(`  - layerData.type: ${layerData.type}`);
        console.log(`  - layerData.name: ${layerData.name}`);
        console.log(`  - processedImageBuffer: ${processedImageBuffer ? `${Math.round(processedImageBuffer.length / 1024)}KB` : 'null'}`);
        console.log(`  - originalImageBuffer: ${originalImageBuffer ? `${Math.round(originalImageBuffer.length / 1024)}KB` : 'null'}`);
        
        // Add layer to session with enhanced error handling
        let layer;
        try {
            layer = await sessionManager.addLayer(
                sessionId,
                layerData,
                processedImageBuffer,
                originalImageBuffer
            );
            console.log(`✅ Successfully added layer to session ${sessionId}: ${layer.id}`);
        } catch (addLayerError) {
            console.error(`❌ Failed to add layer to session ${sessionId}:`, addLayerError);
            console.error(`❌ Layer data:`, JSON.stringify(layerData, null, 2));
            console.error(`❌ Has processedImageBuffer: ${!!processedImageBuffer}`);
            console.error(`❌ Has originalImageBuffer: ${!!originalImageBuffer}`);
            throw new Error(`Failed to add layer to session: ${addLayerError.message}`);
        }

        res.json({
            success: true,
            layer: layer,
            message: 'Layer added successfully'
        });
        
    } catch (error) {
        console.error('Error adding layer to session:', error);
        res.status(500).json({
            error: error.message || 'Failed to add layer'
        });
    }
});

// Update layer in session
app.put('/api/sessions/:sessionId/layers/:layerId', validateSessionId, validateLayerId, async (req, res) => {
    try {
        const { sessionId, layerId } = req.params;
        const updates = req.body;
        
        const updatedLayer = await sessionManager.updateLayer(sessionId, layerId, updates);
        
        res.json({
            success: true,
            layer: updatedLayer,
            message: 'Layer updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating layer:', error);
        if (error.message === 'Session not found' || error.message === 'Layer not found') {
            res.status(404).json({
                error: error.message
            });
        } else {
            res.status(500).json({
                error: 'Failed to update layer'
            });
        }
    }
});

// Remove layer from session
app.delete('/api/sessions/:sessionId/layers/:layerId', validateSessionId, validateLayerId, async (req, res) => {
    try {
        const { sessionId, layerId } = req.params;
        
        await sessionManager.removeLayer(sessionId, layerId);
        
        res.json({
            success: true,
            message: 'Layer removed successfully'
        });
        
    } catch (error) {
        console.error('Error removing layer:', error);
        if (error.message === 'Session not found' || error.message === 'Layer not found') {
            res.status(404).json({
                error: error.message
            });
        } else {
            res.status(500).json({
                error: 'Failed to remove layer'
            });
        }
    }
});

// Poll job status for async layer processing
app.get('/api/sessions/:sessionId/layers/job/:jobId', validateSessionId, async (req, res) => {
    try {
        const { sessionId, jobId } = req.params;
        console.log(`🔄 GET /api/sessions/${sessionId}/layers/job/${jobId} - Polling job status`);
        
        // Check if session exists
        const sessionData = await sessionManager.getSession(sessionId);
        if (!sessionData) {
            console.error(`❌ Session not found: ${sessionId}`);
            return res.status(404).json({
                error: 'Session not found'
            });
        }
        
        // Get job status
        const status = jobQueue.getJobStatus(jobId);
        console.log(`🔍 Job ${jobId} status: ${status.status}`);
        
        if (status.status === 'completed') {
            console.log(`✅ Job ${jobId} completed, adding layer to session`);

            const jobMetadata = status.options?.metadata || {};
            const layerData = jobMetadata.layerData || {};
            const originalImageBuffer = jobMetadata.originalBuffer;

            console.log(`🔧 Job result keys:`, status.result ? Object.keys(status.result) : 'null');
            console.log(`🔧 layerData: ${JSON.stringify(layerData, null, 2)}`);
            console.log(`🔧 originalImageBuffer: ${originalImageBuffer ? `${Math.round(originalImageBuffer.length / 1024)}KB` : 'null'}`);

            // For ImageProcessor results, we need to handle the serverImageUrl case
            let processedImageBuffer = null;
            let serverImageUrl = null;

            if (status.result && status.result.processedFile) {
                // ImageProcessor result format - use the URL instead of buffer
                serverImageUrl = status.result.processedFile.url;
                console.log(`🔧 Using server image URL: ${serverImageUrl}`);

                // Update layerData to include server image reference
                layerData.serverImageUrl = serverImageUrl;
            } else if (status.result && status.result.buffer) {
                // Direct buffer result
                processedImageBuffer = status.result.buffer;
                console.log(`🔧 Using direct buffer: ${Math.round(processedImageBuffer.length / 1024)}KB`);
            } else {
                console.warn('⚠️ Unexpected result format in async job completion:', status.result ? Object.keys(status.result) : 'null result');
            }

            try {
                const layer = await sessionManager.addLayer(
                    sessionId,
                    layerData,
                    processedImageBuffer,
                    originalImageBuffer
                );

                res.json({
                    success: true,
                    status: 'completed',
                    layer: layer,
                    message: 'Layer processing completed'
                });
            } catch (addLayerError) {
                console.error(`❌ Failed to add async layer to session ${sessionId}:`, addLayerError);
                res.status(500).json({
                    success: false,
                    status: 'failed',
                    error: `Failed to add layer to session: ${addLayerError.message}`
                });
            }
        } else if (status.status === 'failed') {
            console.error(`❌ Job ${jobId} failed: ${status.error?.message || 'Unknown error'}`);
            res.status(500).json({
                success: false,
                status: 'failed',
                error: status.error?.message || 'Image processing failed'
            });
        } else {
            // Still processing
            res.json({
                success: true,
                status: 'processing',
                message: 'Layer processing in progress'
            });
        }
        
    } catch (error) {
        console.error('Error polling job status:', error);
        res.status(500).json({
            error: error.message || 'Failed to get job status'
        });
    }
});

// Get layer image
app.get('/api/sessions/:sessionId/layers/:layerId/image', validateSessionId, validateLayerId, async (req, res) => {
    try {
        const { sessionId, layerId } = req.params;
        
        const imageBuffer = await sessionManager.getLayerImage(sessionId, layerId);
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        res.send(imageBuffer);
        
    } catch (error) {
        console.error('Error getting layer image:', error);
        if (error.message === 'Session not found' || error.message.includes('not found')) {
            res.status(404).json({
                error: 'Image not found'
            });
        } else {
            res.status(500).json({
                error: 'Failed to get image'
            });
        }
    }
});

// Get original layer image
app.get('/api/sessions/:sessionId/original/:layerId', validateSessionId, validateLayerId, async (req, res) => {
    try {
        const { sessionId, layerId } = req.params;

        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const layer = session.layers.find(l => l.id === layerId);
        if (!layer || !layer.originalPath) {
            return res.status(404).json({ error: 'Original image not found' });
        }

        const originalImagePath = path.join('./sessions', sessionId, layer.originalPath);

        // Check if file exists
        if (!fsSync.existsSync(originalImagePath)) {
            return res.status(404).json({ error: 'Original image file not found' });
        }

        // Send file
        res.sendFile(path.resolve(originalImagePath));

    } catch (error) {
        console.error('Error getting original image:', error);
        res.status(500).json({ error: 'Failed to get original image' });
    }
});

// Reprocess layer from original image
app.post('/api/sessions/:sessionId/layers/:layerId/reprocess', validateSessionId, validateLayerId, upload.single('image'), async (req, res) => {
    try {
        const { sessionId, layerId } = req.params;
        const { layerData, async: asyncProcessing } = req.body;

        console.log(`🔄 Reprocessing layer ${layerId} for session ${sessionId}`);

        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const layerIndex = session.layers.findIndex(l => l.id === layerId);
        if (layerIndex === -1) {
            return res.status(404).json({ error: 'Layer not found' });
        }

        const existingLayer = session.layers[layerIndex];

        // Use original image if no new image provided
        let imageFile = req.file;
        if (!imageFile && existingLayer.originalPath) {
            const originalPath = path.join('./sessions', sessionId, existingLayer.originalPath);
            if (fsSync.existsSync(originalPath)) {
                // Read original file as buffer
                const buffer = fsSync.readFileSync(originalPath);
                const originalExt = path.extname(existingLayer.originalPath);
                imageFile = {
                    buffer: buffer,
                    originalname: existingLayer.name || `layer_${layerId}${originalExt}`,
                    mimetype: originalExt === '.jpg' || originalExt === '.jpeg' ? 'image/jpeg' :
                             originalExt === '.png' ? 'image/png' : 'image/jpeg'
                };
            }
        }

        if (!imageFile) {
            return res.status(400).json({ error: 'No image provided and no original image found' });
        }

        // Parse layer data
        let parsedLayerData;
        try {
            parsedLayerData = typeof layerData === 'string' ? JSON.parse(layerData) : layerData;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid layer data' });
        }

        // Process image (async or sync based on request)
        if (asyncProcessing === 'true' && imageFile.buffer && imageFile.buffer.length > IMAGE_SIZE_THRESHOLD) {
            // Async processing for large images
            const jobId = jobQueue.addJob(
                (data, id) => imageProcessor.processImage(data, id),
                imageFile,
                {
                    priority: parseInt(req.body.priority) || 0,
                    maxRetries: 2,
                    metadata: {
                        layerData: parsedLayerData,
                        originalBuffer: imageFile.buffer,
                        sessionId: sessionId,
                        layerId: layerId,
                        isReprocess: true
                    }
                }
            );

            res.json({
                success: true,
                jobId: jobId,
                status: 'processing',
                message: 'Reprocessing started'
            });
        } else {
            // Synchronous processing
            const processedImage = await imageProcessor.processImage(imageFile);

            // Create result structure similar to layer processing
            const result = {
                layer: {
                    id: layerId,
                    ...parsedLayerData,
                    imagePath: processedImage.serverImageUrl || null,
                    processedAt: new Date().toISOString()
                }
            };

            // Update session with reprocessed layer
            session.layers[layerIndex] = {
                ...existingLayer,
                ...result.layer,
                properties: {
                    ...existingLayer.properties,
                    ...parsedLayerData.properties
                }
            };
            session.lastModified = new Date().toISOString();

            await sessionManager.saveSession(sessionId, session);

            res.json({
                success: true,
                layer: result.layer,
                status: 'completed'
            });
        }

    } catch (error) {
        console.error('Error reprocessing layer:', error);
        res.status(500).json({
            error: error.message || 'Failed to reprocess layer'
        });
    }
});

// Send session files via email
app.post('/api/sessions/:sessionId/email', validateSessionId, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { recipient } = req.body; // Optional recipient override
        
        // Get session data
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        console.log(`📧 Sending session files for session: ${sessionId}`);
        
        // Send session files via email
        const result = await emailService.sendSessionFiles(sessionId, session, recipient);
        
        res.json({
            success: true,
            messageId: result.messageId,
            message: 'Session files sent successfully',
            recipient: recipient || process.env.EMAIL_RECIPIENT
        });
        
    } catch (error) {
        console.error('Error sending session files:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send session files',
            details: error.message
        });
    }
});

// Session stats endpoint
app.get('/api/sessions/stats', async (req, res) => {
    try {
        const stats = await sessionManager.getStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error getting session stats:', error);
        res.status(500).json({
            error: 'Failed to get session stats'
        });
    }
});

// Email API endpoints
app.post('/api/email/test', async (req, res) => {
    try {
        await emailService.testConnection();
        res.json({ success: true, message: 'Email service connection successful' });
    } catch (error) {
        console.error('Email test failed:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Email service connection failed',
            details: error.message 
        });
    }
});

app.post('/api/email/send', async (req, res) => {
    try {
        const { to, subject, html, text } = req.body;
        
        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject, html'
            });
        }

        const result = await emailService.sendEmail(to, subject, html, text);
        res.json({ 
            success: true, 
            messageId: result.messageId,
            message: 'Email sent successfully' 
        });
    } catch (error) {
        console.error('Failed to send email:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send email',
            details: error.message 
        });
    }
});

app.post('/api/email/notification', async (req, res) => {
    try {
        const { to, title, message, actionUrl } = req.body;
        
        if (!to || !title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, title, message'
            });
        }

        // Check if email service is configured
        if (!emailService.transporter) {
            console.warn('Email notification skipped: SMTP not configured');
            return res.json({ 
                success: false, 
                error: 'Email service not configured',
                message: 'SMTP credentials not set in environment variables' 
            });
        }
        
        const result = await emailService.sendNotification(to, title, message, actionUrl);
        res.json({ 
            success: true, 
            messageId: result.messageId,
            message: 'Notification sent successfully' 
        });
    } catch (error) {
        console.error('Failed to send notification:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send notification',
            details: error.message 
        });
    }
});

app.post('/api/email/welcome', async (req, res) => {
    try {
        const { to, name } = req.body;
        
        if (!to) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: to'
            });
        }

        const result = await emailService.sendWelcome(to, name);
        res.json({ 
            success: true, 
            messageId: result.messageId,
            message: 'Welcome email sent successfully' 
        });
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send welcome email',
            details: error.message 
        });
    }
});

// Order Processing API Endpoints

// Submit order and save XLSX to session
app.post('/api/sessions/:sessionId/orders', validateSessionId, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const orderData = req.body;
        
        // Validate required fields
        if (!orderData.customerName || !orderData.customerPhone || !orderData.players || orderData.players.length === 0) {
            return res.status(400).json({
                error: 'Missing required order data: customerName, customerPhone, and players'
            });
        }
        
        // Generate order number if not provided
        if (!orderData.orderNumber) {
            const today = new Date();
            const dateStr = today.getFullYear().toString().slice(-2) + 
                           (today.getMonth() + 1).toString().padStart(2, '0') + 
                           today.getDate().toString().padStart(2, '0');
            const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            orderData.orderNumber = `ORD${dateStr}${randomNum}`;
        }
        
        // Save order to session
        const result = await orderParser.saveToSession(orderData, sessionId);
        
        res.json({
            success: true,
            orderNumber: result.parsedData.orderNumber,
            filename: result.filename,
            sessionId: sessionId,
            xlsxPath: result.xlsxPath,
            totalPrice: result.parsedData.totalPrice,
            summary: result.parsedData.summary,
            message: 'Order saved successfully'
        });
        
    } catch (error) {
        console.error('Error submitting order:', error);
        res.status(500).json({
            error: 'Failed to submit order'
        });
    }
});

// List orders for a session
app.get('/api/sessions/:sessionId/orders', validateSessionId, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const orders = await orderParser.listSessionOrders(sessionId);
        
        res.json({
            success: true,
            orders: orders,
            count: orders.length
        });
        
    } catch (error) {
        console.error('Error listing orders:', error);
        res.status(500).json({
            error: 'Failed to list orders'
        });
    }
});

// Download order XLSX file
app.get('/api/sessions/:sessionId/orders/:filename', validateSessionId, validateFilename, async (req, res) => {
    try {
        const { sessionId, filename } = req.params;
        
        // Validate filename to prevent directory traversal
        if (!filename.endsWith('.xlsx') && !filename.endsWith('.json')) {
            return res.status(400).json({
                error: 'Invalid file type. Only .xlsx and .json files are allowed'
            });
        }
        
        const filePath = await orderParser.getOrderFilePath(sessionId, filename);
        
        // Set appropriate headers for download
        const isXlsx = filename.endsWith('.xlsx');
        res.setHeader('Content-Type', isXlsx ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Send file
        res.sendFile(path.resolve(filePath));
        
    } catch (error) {
        console.error('Error downloading order file:', error);
        if (error.message === 'Order file not found') {
            res.status(404).json({
                error: 'Order file not found'
            });
        } else {
            res.status(500).json({
                error: 'Failed to download order file'
            });
        }
    }
});

// Delete order from session
app.delete('/api/sessions/:sessionId/orders/:orderNumber', validateSessionId, validateOrderNumber, async (req, res) => {
    try {
        const { sessionId, orderNumber } = req.params;
        
        await orderParser.deleteOrder(sessionId, orderNumber);
        
        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({
            error: 'Failed to delete order'
        });
    }
});

// Generate and download XLSX without saving to session
app.post('/api/orders/generate-xlsx', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Validate required fields
        if (!orderData.customerName || !orderData.customerPhone || !orderData.players || orderData.players.length === 0) {
            return res.status(400).json({
                error: 'Missing required order data: customerName, customerPhone, and players'
            });
        }
        
        // Generate XLSX
        const { buffer, filename } = await orderParser.generateXLSX(orderData);
        
        // Set headers for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Send buffer
        res.send(buffer);
        
    } catch (error) {
        console.error('Error generating XLSX:', error);
        res.status(500).json({
            error: 'Failed to generate XLSX file'
        });
    }
});



// Session URL routing - serve the main app for session URLs
app.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Validate session ID format (12 characters, alphanumeric)
        if (!/^[A-Za-z0-9_-]{12}$/.test(sessionId)) {
            return res.status(404).send('Session not found');
        }
        
        // Check if session exists
        const sessionData = await sessionManager.getSession(sessionId);
        if (!sessionData) {
            return res.status(404).send('Session not found');
        }
        
        // For now, redirect to main app with session parameter
        // In production, you would serve the same index.html but inject the sessionId
        res.redirect(`/?session=${sessionId}`);
        
    } catch (error) {
        console.error('Error handling session URL:', error);
        res.status(500).send('Internal server error');
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
            
            // Start periodic session cleanup
            setInterval(() => {
                sessionManager.cleanupExpiredSessions();
            }, 60 * 60 * 1000); // Every hour
        });
        
        // Store server reference for graceful shutdown
        global.server = server;
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();// Trigger restart
