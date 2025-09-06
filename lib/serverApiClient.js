class ServerApiClient {
    constructor(options = {}) {
        this.serverUrl = options.serverUrl; // Must be provided from configuration
        this.pollInterval = options.pollInterval; // Must be provided from configuration
        this.maxPollTime = options.maxPollTime; // Must be provided from configuration
        
        // Track active jobs
        this.activeJobs = new Map();
        this.jobCallbacks = new Map();
    }
    
    /**
     * Process a single image on the server
     * @param {File} file - The image file to process
     * @param {Object} options - Processing options
     * @returns {Promise} - Promise that resolves when processing is complete
     */
    async processImage(file, options = {}) {
        try {
            console.log(`Sending image ${file.name} to server for processing...`);
            
            // Prepare form data
            const formData = new FormData();
            formData.append('image', file);
            
            if (options.priority) {
                formData.append('priority', options.priority.toString());
            }
            
            // Submit job to server
            const response = await fetch(`${this.serverUrl}/api/process/single`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                } catch (jsonError) {
                    // If we can't parse JSON, it might be a multer error or other issue
                    if (response.status === 400) {
                        throw new Error('File too large or invalid. Please check file size and format.');
                    } else {
                        throw new Error(`Server error: ${response.status} - ${response.statusText}`);
                    }
                }
            }
            
            const jobData = await response.json();
            console.log(`Job queued: ${jobData.jobId}, estimated time: ${jobData.estimatedTime}ms`);
            
            // Wait for job completion
            return await this.waitForJob(jobData.jobId, file.name);
            
        } catch (error) {
            console.error('Error processing image on server:', error);
            throw error;
        }
    }
    
    /**
     * Process multiple images in batch
     * @param {File[]} files - Array of image files
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise} - Promise that resolves with all results
     */
    async processImageBatch(files, progressCallback = null) {
        try {
            console.log(`Sending batch of ${files.length} images to server...`);
            
            // Prepare form data
            const formData = new FormData();
            files.forEach(file => {
                formData.append('images', file);
            });
            
            // Submit batch job to server
            const response = await fetch(`${this.serverUrl}/api/process/batch`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }
            
            const batchData = await response.json();
            console.log(`Batch queued: ${batchData.jobs.length} jobs, ${batchData.errors.length} errors`);
            
            // Wait for all jobs to complete
            const jobPromises = batchData.jobs.map(async (job, index) => {
                try {
                    const result = await this.waitForJob(job.jobId, job.filename);
                    
                    if (progressCallback) {
                        progressCallback({
                            completed: index + 1,
                            total: batchData.jobs.length,
                            currentFile: job.filename,
                            result
                        });
                    }
                    
                    return { success: true, jobId: job.jobId, result };
                } catch (error) {
                    console.error(`Job ${job.jobId} failed:`, error);
                    
                    if (progressCallback) {
                        progressCallback({
                            completed: index + 1,
                            total: batchData.jobs.length,
                            currentFile: job.filename,
                            error: error.message
                        });
                    }
                    
                    return { success: false, jobId: job.jobId, error: error.message };
                }
            });
            
            const results = await Promise.allSettled(jobPromises);
            
            return {
                results: results.map(r => r.value),
                errors: batchData.errors,
                totalProcessed: batchData.jobs.length,
                totalFailed: batchData.errors.length + results.filter(r => r.value && !r.value.success).length
            };
            
        } catch (error) {
            console.error('Error processing batch on server:', error);
            throw error;
        }
    }
    
    /**
     * Wait for a job to complete by polling its status
     * @param {string} jobId - Job ID to monitor
     * @param {string} filename - Original filename for logging
     * @returns {Promise} - Promise that resolves with job result
     */
    async waitForJob(jobId, filename = 'unknown') {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const pollJob = async () => {
                try {
                    const status = await this.getJobStatus(jobId);
                    
                    if (status.status === 'completed') {
                        console.log(`✅ Job ${jobId} (${filename}) completed`);
                        resolve(this.processServerResult(status.result));
                        return;
                    }
                    
                    if (status.status === 'failed') {
                        console.error(`❌ Job ${jobId} (${filename}) failed:`, status.error);
                        reject(new Error(status.error.message || 'Job failed'));
                        return;
                    }
                    
                    // Check timeout
                    if (Date.now() - startTime > this.maxPollTime) {
                        reject(new Error(`Job ${jobId} timed out after ${this.maxPollTime}ms`));
                        return;
                    }
                    
                    // Continue polling
                    setTimeout(pollJob, this.pollInterval);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            // Start polling
            setTimeout(pollJob, this.pollInterval);
        });
    }
    
    /**
     * Get job status from server
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} - Job status
     */
    async getJobStatus(jobId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/job/${jobId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to get job status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error getting job status:', error);
            throw error;
        }
    }
    
    /**
     * Get multiple job statuses
     * @param {string[]} jobIds - Array of job IDs
     * @returns {Promise<Object>} - Job statuses
     */
    async getMultipleJobStatuses(jobIds) {
        try {
            const response = await fetch(`${this.serverUrl}/api/jobs/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ jobIds })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get job statuses: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error getting job statuses:', error);
            throw error;
        }
    }
    
    /**
     * Process server result to match client expectations
     * @param {Object} serverResult - Result from server
     * @returns {Object} - Processed result
     */
    processServerResult(serverResult) {
        // Convert relative URL to absolute URL using server base URL
        const imageUrl = serverResult.processedFile.url.startsWith('http') 
            ? serverResult.processedFile.url  // Already absolute
            : `${this.serverUrl}${serverResult.processedFile.url}`; // Make absolute
        
        console.log('Converting server image URL:', {
            original: serverResult.processedFile.url,
            absolute: imageUrl
        });
        
        return {
            processedImageData: imageUrl, // Now an absolute URL
            wasResized: serverResult.optimization.wasResized,
            originalSize: serverResult.originalFile.dimensions,
            newSize: serverResult.processedFile.dimensions,
            fileSizeReduced: serverResult.optimization.sizeSaved > 0,
            originalFileSize: serverResult.originalFile.size * 1024, // Convert KB to bytes
            compressedFileSize: serverResult.processedFile.size * 1024,
            serverProcessed: true,
            processingTime: serverResult.processingTime,
            optimizationDetails: serverResult.optimization
        };
    }
    
    /**
     * Get server statistics
     * @returns {Promise<Object>} - Server stats
     */
    async getServerStats() {
        try {
            const response = await fetch(`${this.serverUrl}/api/stats`);
            
            if (!response.ok) {
                throw new Error(`Failed to get server stats: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error getting server stats:', error);
            throw error;
        }
    }
    
    /**
     * Check if server is available
     * @returns {Promise<boolean>} - Server availability
     */
    async checkServerHealth() {
        try {
            const response = await fetch(`${this.serverUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                return false;
            }
            
            const health = await response.json();
            return health.status === 'healthy';
            
        } catch (error) {
            console.error('Server health check failed:', error);
            return false;
        }
    }
    
    /**
     * Get image URL from server
     * @param {string} filename - Image filename
     * @returns {string} - Full image URL
     */
    getImageUrl(filename) {
        return `${this.serverUrl}/api/images/${filename}`;
    }
    
    /**
     * Load image from server URL
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>} - Loaded image element
     */
    async loadImageFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image from: ${url}`));
            
            // Handle CORS
            img.crossOrigin = 'anonymous';
            img.src = url;
        });
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerApiClient;
} else {
    window.ServerApiClient = ServerApiClient;
}