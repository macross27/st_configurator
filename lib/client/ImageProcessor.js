export class ImageProcessor {
    constructor(config = {}) {
        this.maxFileSize = config.maxFileSize;
        this.imageConversionThreshold = config.imageConversionThreshold;
        this.maxImageDimensions = config.maxImageDimensions;
        this.compressionQuality = config.compressionQuality;
        this.memoryWarningThreshold = config.memoryWarningThreshold;
        this.validationErrorDuration = config.validationErrorDuration;
        this.defaultErrorDuration = config.defaultErrorDuration;
        
        this.userUploadedImages = new Map();
    }
    
    async processImage(file) {
        return new Promise((resolve, reject) => {
            if (file.size > this.maxFileSize) {
                const fileSizeMB = Math.round(file.size / 1024 / 1024 * 10) / 10;
                const maxSizeMB = this.maxFileSize / 1024 / 1024;
                reject(new Error(`File too large: ${fileSizeMB}MB. Maximum size: ${maxSizeMB}MB.`));
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const originalSize = { width: img.width, height: img.height };
                    const originalFileSize = file.size;
                    
                    let { width, height } = this.calculateOptimalDimensions(img.width, img.height);
                    
                    const wasResized = (width !== img.width || height !== img.height);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Check if original image has transparency by testing file type and canvas content
                    const hasTransparency = file.type === 'image/png' || file.type === 'image/webp';
                    
                    // For images with transparency, clear canvas with transparent background
                    if (hasTransparency) {
                        ctx.clearRect(0, 0, width, height);
                    }
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Choose output format based on transparency support
                    let compressedData;
                    if (hasTransparency) {
                        // Preserve transparency - use PNG format
                        compressedData = canvas.toDataURL('image/png');
                        console.log('Preserving transparency: output as PNG');
                    } else {
                        // No transparency - use JPEG for better compression
                        compressedData = canvas.toDataURL('image/jpeg', this.compressionQuality);
                        console.log('No transparency detected: output as JPEG');
                    }
                    
                    const fileSizeReduced = originalFileSize > this.imageConversionThreshold || 
                                          compressedData.length < originalFileSize * 0.8;
                    
                    canvas.remove();
                    
                    resolve({
                        processedImageData: compressedData,
                        wasResized,
                        originalSize,
                        newSize: { width, height },
                        fileSizeReduced,
                        originalFileSize,
                        compressedFileSize: compressedData.length,
                        hasTransparency // Add this information for debugging
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    calculateOptimalDimensions(originalWidth, originalHeight) {
        const maxWidth = this.maxImageDimensions.width;
        const maxHeight = this.maxImageDimensions.height;
        
        if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
            return { width: originalWidth, height: originalHeight };
        }
        
        const aspectRatio = originalWidth / originalHeight;
        
        let newWidth, newHeight;
        
        if (aspectRatio > maxWidth / maxHeight) {
            newWidth = maxWidth;
            newHeight = maxWidth / aspectRatio;
        } else {
            newHeight = maxHeight;
            newWidth = maxHeight * aspectRatio;
        }
        
        return { 
            width: Math.round(newWidth), 
            height: Math.round(newHeight) 
        };
    }
    
    checkMemoryUsage() {
        const estimatedUsage = this.estimateMemoryUsage();
        
        if (estimatedUsage > this.memoryWarningThreshold) {
            const usageMB = Math.round(estimatedUsage / 1024 / 1024);
            const warningMsg = `High memory usage detected (${usageMB}MB). Consider deleting unused layers to improve performance.`;
            
            console.warn(warningMsg);
            
            if (estimatedUsage > this.memoryWarningThreshold * 1.5) {
                if (confirm(`${warningMsg}\n\nWould you like to continue anyway?`)) {
                    return true;
                } else {
                    return false;
                }
            }
        }
        return true;
    }
    
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const [assetId, base64Data] of this.userUploadedImages) {
            totalSize += base64Data.length;
        }
        
        return totalSize;
    }
    
    validateFile(file) {
        if (!file.type.startsWith('image/')) {
            throw new Error('Only image files are allowed');
        }
        
        const fileSizeMB = file.size / (1024 * 1024);
        const maxFileSizeMB = this.maxFileSize / (1024 * 1024);
        
        if (fileSizeMB > maxFileSizeMB) {
            throw new Error(`File "${file.name}" (${fileSizeMB.toFixed(1)}MB) exceeds the maximum size limit of ${maxFileSizeMB}MB. Please resize your image and try again.`);
        }
        
        return true;
    }
    
    storeProcessedImage(assetId, imageData) {
        this.userUploadedImages.set(assetId, imageData);
    }
    
    getProcessedImage(assetId) {
        return this.userUploadedImages.get(assetId);
    }
    
    removeProcessedImage(assetId) {
        this.userUploadedImages.delete(assetId);
        
        if (window.gc && typeof window.gc === 'function') {
            setTimeout(() => window.gc(), 100);
        }
    }
    
    clearProcessedImages() {
        this.userUploadedImages.clear();
    }
}