const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class JobQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration from .env
        this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
        this.jobTimeoutMs = options.jobTimeoutMs || 30000;
        this.maxQueueSize = options.maxQueueSize || 100;
        this.cleanupIntervalMs = options.cleanupIntervalMs || 60000;
        this.defaultProcessingTime = options.defaultProcessingTime || 5000;
        
        // Queue state
        this.queue = [];
        this.processing = new Map(); // jobId -> { job, startTime, timeout }
        this.completed = new Map(); // jobId -> { result, completedAt, expiresAt }
        this.failed = new Map(); // jobId -> { error, failedAt, expiresAt }
        
        // Statistics
        this.stats = {
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            currentQueueSize: 0,
            currentProcessingCount: 0
        };
        
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
        
        console.log(`JobQueue initialized: maxConcurrent=${this.maxConcurrentJobs}, timeout=${this.jobTimeoutMs}ms`);
    }
    
    /**
     * Add a job to the queue
     * @param {Function} processor - Function that processes the job
     * @param {Object} data - Job data
     * @param {Object} options - Job options (priority, delay, etc.)
     * @returns {string} - Job ID
     */
    addJob(processor, data, options = {}) {
        if (this.queue.length >= this.maxQueueSize) {
            throw new Error(`Queue is full (max: ${this.maxQueueSize})`);
        }
        
        const job = {
            id: uuidv4(),
            processor,
            data,
            options: {
                priority: options.priority || 0,
                maxRetries: options.maxRetries || 0,
                retryCount: 0,
                ...options
            },
            createdAt: Date.now(),
            status: 'queued'
        };
        
        // Insert job based on priority (higher priority first)
        const insertIndex = this.queue.findIndex(queuedJob => queuedJob.options.priority < job.options.priority);
        if (insertIndex === -1) {
            this.queue.push(job);
        } else {
            this.queue.splice(insertIndex, 0, job);
        }
        
        this.stats.totalJobs++;
        this.stats.currentQueueSize = this.queue.length;
        
        console.log(`Job ${job.id} added to queue (position: ${this.queue.length}, priority: ${job.options.priority})`);
        
        // Try to process immediately
        this.processNext();
        
        return job.id;
    }
    
    /**
     * Process the next job in the queue
     */
    async processNext() {
        if (this.processing.size >= this.maxConcurrentJobs || this.queue.length === 0) {
            return;
        }
        
        const job = this.queue.shift();
        this.stats.currentQueueSize = this.queue.length;
        
        job.status = 'processing';
        job.startedAt = Date.now();
        
        // Set up timeout
        const timeout = setTimeout(() => {
            this.handleJobTimeout(job.id);
        }, this.jobTimeoutMs);
        
        this.processing.set(job.id, {
            job,
            startTime: Date.now(),
            timeout
        });
        
        this.stats.currentProcessingCount = this.processing.size;
        
        console.log(`Started processing job ${job.id} (${this.processing.size}/${this.maxConcurrentJobs} slots used)`);
        this.emit('jobStarted', job);
        
        try {
            const result = await job.processor(job.data, job.id);
            this.handleJobSuccess(job.id, result);
        } catch (error) {
            this.handleJobError(job.id, error);
        }
        
        // Process next job if available
        setImmediate(() => this.processNext());
    }
    
    /**
     * Handle successful job completion
     */
    handleJobSuccess(jobId, result) {
        const processingInfo = this.processing.get(jobId);
        if (!processingInfo) return;
        
        clearTimeout(processingInfo.timeout);
        this.processing.delete(jobId);
        
        const completedJob = {
            ...processingInfo.job,
            result,
            completedAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            processingTime: Date.now() - processingInfo.startTime
        };
        
        this.completed.set(jobId, completedJob);
        this.stats.completedJobs++;
        this.stats.currentProcessingCount = this.processing.size;
        
        console.log(`Job ${jobId} completed successfully (${completedJob.processingTime}ms)`);
        this.emit('jobCompleted', completedJob);
    }
    
    /**
     * Handle job error
     */
    handleJobError(jobId, error) {
        const processingInfo = this.processing.get(jobId);
        if (!processingInfo) return;
        
        clearTimeout(processingInfo.timeout);
        const job = processingInfo.job;
        
        // Check if we should retry
        if (job.options.retryCount < job.options.maxRetries) {
            job.options.retryCount++;
            job.status = 'retrying';
            
            console.log(`Job ${jobId} failed, retrying (${job.options.retryCount}/${job.options.maxRetries}): ${error.message}`);
            
            // Add back to queue with delay
            setTimeout(() => {
                this.queue.unshift(job); // Add to front for immediate retry
                this.stats.currentQueueSize = this.queue.length;
                this.processNext();
            }, 1000 * job.options.retryCount); // Exponential backoff
            
        } else {
            // Job failed permanently
            this.processing.delete(jobId);
            
            const failedJob = {
                ...job,
                error: {
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                },
                failedAt: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                processingTime: Date.now() - processingInfo.startTime
            };
            
            this.failed.set(jobId, failedJob);
            this.stats.failedJobs++;
            this.stats.currentProcessingCount = this.processing.size;
            
            console.error(`Job ${jobId} failed permanently: ${error.message}`);
            this.emit('jobFailed', failedJob);
        }
    }
    
    /**
     * Handle job timeout
     */
    handleJobTimeout(jobId) {
        const processingInfo = this.processing.get(jobId);
        if (!processingInfo) return;
        
        console.warn(`Job ${jobId} timed out after ${this.jobTimeoutMs}ms`);
        this.handleJobError(jobId, new Error(`Job timed out after ${this.jobTimeoutMs}ms`));
    }
    
    /**
     * Get job status
     */
    getJobStatus(jobId) {
        // Check if processing
        if (this.processing.has(jobId)) {
            const info = this.processing.get(jobId);
            return {
                status: 'processing',
                startedAt: info.job.startedAt,
                progress: null // Could be enhanced to track progress
            };
        }
        
        // Check if completed
        if (this.completed.has(jobId)) {
            const job = this.completed.get(jobId);
            return {
                status: 'completed',
                result: job.result,
                completedAt: job.completedAt,
                processingTime: job.processingTime,
                options: job.options // Include job options with metadata
            };
        }
        
        // Check if failed
        if (this.failed.has(jobId)) {
            const job = this.failed.get(jobId);
            return {
                status: 'failed',
                error: job.error,
                failedAt: job.failedAt,
                processingTime: job.processingTime
            };
        }
        
        // Check if queued
        const queuedJob = this.queue.find(job => job.id === jobId);
        if (queuedJob) {
            const position = this.queue.indexOf(queuedJob) + 1;
            return {
                status: 'queued',
                position,
                estimatedWaitTime: this.estimateWaitTime(position)
            };
        }
        
        return { status: 'not_found' };
    }
    
    /**
     * Estimate wait time for queued job
     */
    estimateWaitTime(position) {
        const avgProcessingTime = this.getAverageProcessingTime();
        const slotsAvailable = Math.max(1, this.maxConcurrentJobs - this.processing.size);
        const jobsAhead = Math.max(0, position - slotsAvailable);
        
        return Math.round((jobsAhead * avgProcessingTime) / slotsAvailable);
    }
    
    /**
     * Get average processing time from recent completed jobs
     */
    getAverageProcessingTime() {
        const recentJobs = Array.from(this.completed.values())
            .filter(job => Date.now() - job.completedAt < 600000) // Last 10 minutes
            .slice(-20); // Last 20 jobs
            
        if (recentJobs.length === 0) return this.defaultProcessingTime;
        
        const avgTime = recentJobs.reduce((sum, job) => sum + job.processingTime, 0) / recentJobs.length;
        return Math.max(1000, avgTime); // Minimum 1 second
    }
    
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentQueueSize: this.queue.length,
            currentProcessingCount: this.processing.size,
            averageProcessingTime: this.getAverageProcessingTime(),
            completedInLast24h: Array.from(this.completed.values())
                .filter(job => Date.now() - job.completedAt < 86400000).length,
            failedInLast24h: Array.from(this.failed.values())
                .filter(job => Date.now() - job.failedAt < 86400000).length
        };
    }
    
    /**
     * Clean up expired jobs
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        // Clean completed jobs
        for (const [jobId, job] of this.completed.entries()) {
            if (now > job.expiresAt) {
                this.completed.delete(jobId);
                cleanedCount++;
            }
        }
        
        // Clean failed jobs
        for (const [jobId, job] of this.failed.entries()) {
            if (now > job.expiresAt) {
                this.failed.delete(jobId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired jobs`);
        }
    }
    
    /**
     * Shutdown the queue gracefully
     */
    async shutdown() {
        console.log('Shutting down job queue...');
        
        clearInterval(this.cleanupInterval);
        
        // Wait for current jobs to complete (with timeout)
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (this.processing.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Cancel remaining jobs
        for (const [jobId, processingInfo] of this.processing.entries()) {
            clearTimeout(processingInfo.timeout);
            console.log(`Cancelled job ${jobId} during shutdown`);
        }
        
        console.log(`Job queue shutdown complete. ${this.processing.size} jobs were cancelled.`);
    }
}

module.exports = JobQueue;