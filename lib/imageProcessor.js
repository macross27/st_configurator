const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class ImageProcessor {
    constructor(options = {}) {
        this.maxWidth = options.maxWidth || 1024;
        this.maxHeight = options.maxHeight || 1024;
        this.maxInputWidth = options.maxInputWidth || 8192;
        this.maxInputHeight = options.maxInputHeight || 8192;
        this.quality = options.quality || 80;
        this.imageConversionThreshold = options.imageConversionThreshold || 2;
        this.supportedFormats = options.supportedFormats || ['jpeg', 'png', 'webp', 'gif'];
        this.processedDir = options.processedDir || './processed';
        
        // Ensure processed directory exists
        this.ensureDirectoryExists();
    }
    
    async ensureDirectoryExists() {
        try {
            await fs.mkdir(this.processedDir, { recursive: true });
        } catch (error) {
            console.error('Error creating processed directory:', error);
        }
    }
    
    /**
     * Process an image file
     * @param {Object} fileData - File data with buffer, originalname, mimetype
     * @param {string} jobId - Job ID for tracking
     * @returns {Object} - Processing result
     */
    async processImage(fileData, jobId) {
        const startTime = Date.now();
        console.log(`Processing image ${fileData.originalname} for job ${jobId}`);
        
        try {
            // Check if image size is below conversion threshold
            const fileSizeMB = fileData.buffer.length / (1024 * 1024);
            const thresholdMB = this.imageConversionThreshold;
            
            if (fileSizeMB < thresholdMB) {
                console.log(`Image ${fileData.originalname} (${fileSizeMB.toFixed(2)}MB) is below conversion threshold (${thresholdMB}MB) - returning original`);
                
                // Return original image data without processing
                return {
                    success: true,
                    originalName: fileData.originalname,
                    processedData: fileData.buffer.toString('base64'),
                    mimeType: fileData.mimetype,
                    processingTime: Date.now() - startTime,
                    message: `Image below ${thresholdMB}MB threshold - no processing needed`,
                    originalSize: { 
                        width: null, 
                        height: null, 
                        fileSize: Math.round(fileData.buffer.length / 1024) 
                    },
                    newSize: { 
                        width: null, 
                        height: null, 
                        fileSize: Math.round(fileData.buffer.length / 1024) 
                    },
                    format: fileData.mimetype.split('/')[1] || 'unknown'
                };
            }
            
            console.log(`Image ${fileData.originalname} (${fileSizeMB.toFixed(2)}MB) exceeds threshold (${thresholdMB}MB) - processing`);
            
            // Get image metadata
            const image = sharp(fileData.buffer);
            const metadata = await image.metadata();
            
            console.log(`Original image: ${metadata.width}x${metadata.height}, ${metadata.format}, ${Math.round(fileData.buffer.length / 1024)}KB`);
            
            // Log info about very large images but process them anyway
            if (metadata.width > this.maxInputWidth || metadata.height > this.maxInputHeight) {
                console.log(`Processing very large image: ${metadata.width}x${metadata.height} - will be resized to ${this.maxWidth}x${this.maxHeight} or smaller`);
            }
            
            // Determine if resizing is needed
            const needsResize = metadata.width > this.maxWidth || metadata.height > this.maxHeight;
            const originalSize = { width: metadata.width, height: metadata.height };
            
            // Calculate new dimensions maintaining aspect ratio
            let newWidth = metadata.width;
            let newHeight = metadata.height;
            
            if (needsResize) {
                const aspectRatio = metadata.width / metadata.height;
                
                if (aspectRatio > this.maxWidth / this.maxHeight) {
                    // Width is constraining
                    newWidth = this.maxWidth;
                    newHeight = Math.round(this.maxWidth / aspectRatio);
                } else {
                    // Height is constraining
                    newHeight = this.maxHeight;
                    newWidth = Math.round(this.maxHeight * aspectRatio);
                }
            }
            
            // Process the image
            let processedImage = image;
            
            if (needsResize) {
                processedImage = processedImage.resize(newWidth, newHeight, {
                    kernel: sharp.kernel.lanczos3,
                    withoutEnlargement: true
                });
            }
            
            // Convert to optimized format (prefer WebP for better compression)
            let outputFormat = 'webp';
            let outputOptions = { quality: this.quality };
            
            // Check file size for format decisions (reuse existing variable)
            // const fileSizeMB = fileData.buffer.length / (1024 * 1024); // Already declared above
            
            // For PNG images with transparency, always preserve alpha channel
            // Files 2-5MB: Convert to WebP but preserve alpha if present
            if (metadata.format === 'png' && metadata.hasAlpha) {
                if (fileSizeMB >= this.imageConversionThreshold) {
                    // Large PNG with alpha - convert to WebP but preserve alpha
                    outputFormat = 'webp';
                    outputOptions = { quality: this.quality, effort: 6, alphaQuality: 90 };
                    console.log(`Preserving alpha channel for large PNG (${fileSizeMB.toFixed(1)}MB) -> WebP with alpha`);
                } else {
                    // Small PNG with alpha - keep as PNG
                    outputFormat = 'png';
                    outputOptions = { compressionLevel: 9, progressive: true };
                    console.log(`Keeping small PNG (${fileSizeMB.toFixed(1)}MB) with alpha channel as PNG`);
                }
            }
            
            // Apply format-specific optimizations
            switch (outputFormat) {
                case 'webp':
                    processedImage = processedImage.webp(outputOptions);
                    break;
                case 'jpeg':
                    processedImage = processedImage.jpeg({
                        quality: this.quality,
                        progressive: true,
                        mozjpeg: true
                    });
                    break;
                case 'png':
                    processedImage = processedImage.png(outputOptions);
                    break;
            }
            
            // Generate output filename
            const originalName = path.parse(fileData.originalname).name;
            const timestamp = Date.now();
            const outputFilename = `${originalName}_${timestamp}_${jobId}.${outputFormat}`;
            const outputPath = path.join(this.processedDir, outputFilename);
            
            // Process and save
            const outputBuffer = await processedImage.toBuffer();
            await fs.writeFile(outputPath, outputBuffer);
            
            // Get final metadata
            const finalMetadata = await sharp(outputBuffer).metadata();
            
            const processingTime = Date.now() - startTime;
            const originalSizeKB = Math.round(fileData.buffer.length / 1024);
            const finalSizeKB = Math.round(outputBuffer.length / 1024);
            const compressionRatio = ((fileData.buffer.length - outputBuffer.length) / fileData.buffer.length * 100).toFixed(1);
            
            const result = {
                success: true,
                processingTime,
                originalFile: {
                    name: fileData.originalname,
                    size: originalSizeKB,
                    format: metadata.format,
                    dimensions: originalSize
                },
                processedFile: {
                    filename: outputFilename,
                    path: outputPath,
                    size: finalSizeKB,
                    format: outputFormat,
                    dimensions: { width: finalMetadata.width, height: finalMetadata.height },
                    url: `/api/images/${outputFilename}` // API endpoint to serve the image
                },
                optimization: {
                    wasResized: needsResize,
                    formatChanged: metadata.format !== outputFormat,
                    compressionRatio: `${compressionRatio}%`,
                    sizeSaved: originalSizeKB - finalSizeKB
                }
            };
            
            console.log(`Image processing completed for job ${jobId}:`, {
                originalSize: `${originalSize.width}x${originalSize.height}`,
                newSize: `${finalMetadata.width}x${finalMetadata.height}`,
                fileSize: `${originalSizeKB}KB → ${finalSizeKB}KB`,
                compression: `${compressionRatio}%`,
                time: `${processingTime}ms`
            });
            
            return result;
            
        } catch (error) {
            console.error(`Image processing failed for job ${jobId}:`, error);
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }
    
    /**
     * Validate if file is a supported image
     * @param {Object} fileData - File data
     * @returns {boolean} - Is valid image
     */
    isValidImage(fileData) {
        if (!fileData.mimetype.startsWith('image/')) {
            return false;
        }
        
        const format = fileData.mimetype.split('/')[1];
        return this.supportedFormats.includes(format) || this.supportedFormats.includes(format.toLowerCase());
    }
    
    /**
     * Get estimated processing time based on file size and dimensions
     * @param {Object} fileData - File data
     * @returns {number} - Estimated time in milliseconds
     */
    async getEstimatedProcessingTime(fileData) {
        try {
            const metadata = await sharp(fileData.buffer).metadata();
            const megapixels = (metadata.width * metadata.height) / 1000000;
            const fileSizeMB = fileData.buffer.length / (1024 * 1024);
            
            // Base time + pixel processing + file I/O time
            const baseTime = 500; // 500ms base
            const pixelTime = megapixels * 200; // 200ms per megapixel
            const ioTime = fileSizeMB * 100; // 100ms per MB
            
            return Math.round(baseTime + pixelTime + ioTime);
        } catch (error) {
            return 5000; // Default 5 seconds if metadata read fails
        }
    }
    
    /**
     * Clean up old processed files
     * @param {number} maxAgeMs - Maximum age in milliseconds
     */
    async cleanupOldFiles(maxAgeMs = 24 * 60 * 60 * 1000) { // Default 24 hours
        try {
            const files = await fs.readdir(this.processedDir);
            const now = Date.now();
            let cleanedCount = 0;
            
            for (const filename of files) {
                const filePath = path.join(this.processedDir, filename);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAgeMs) {
                    await fs.unlink(filePath);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`Cleaned up ${cleanedCount} old processed files`);
            }
        } catch (error) {
            console.error('Error cleaning up old files:', error);
        }
    }
    
    /**
     * Get processing statistics
     */
    async getStats() {
        try {
            const files = await fs.readdir(this.processedDir);
            const now = Date.now();
            
            let totalSize = 0;
            let recentFiles = 0;
            const dayAgo = now - (24 * 60 * 60 * 1000);
            
            for (const filename of files) {
                const filePath = path.join(this.processedDir, filename);
                const stats = await fs.stat(filePath);
                
                totalSize += stats.size;
                if (stats.mtime.getTime() > dayAgo) {
                    recentFiles++;
                }
            }
            
            return {
                totalFiles: files.length,
                totalSizeMB: Math.round(totalSize / (1024 * 1024)),
                filesProcessedLast24h: recentFiles
            };
        } catch (error) {
            return { totalFiles: 0, totalSizeMB: 0, filesProcessedLast24h: 0 };
        }
    }
}

module.exports = ImageProcessor;