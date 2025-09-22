/**
 * ModelPreloader - Advanced preloading system for GLB models
 * 
 * Features:
 * - Priority-based queue system
 * - RequestIdleCallback integration for non-blocking preloading
 * - Adaptive preloading based on user patterns
 * - Memory-aware loading with configurable limits
 */
export class ModelPreloader {
    constructor(modelCache, sceneManager) {
        this.modelCache = modelCache;
        this.sceneManager = sceneManager;
        
        // Preloading state
        this.preloadQueue = [];
        this.isPreloading = false;
        this.maxConcurrentLoads = 2;
        this.activeLoads = new Set();
        
        // Performance configuration
        this.preloadDelay = 100;        // Delay between preload operations (ms)
        this.idleTimeout = 5000;        // Timeout for requestIdleCallback
        this.memoryThreshold = 0.8;     // Stop preloading at 80% memory usage
        
        // User pattern tracking
        this.accessPatterns = new Map(); // modelPath -> { count, lastAccess, avgGap }
        this.sequencePatterns = [];      // Track model switching sequences
        
        console.log('🚀 ModelPreloader initialized');
    }
    
    /**
     * Start lazy preloading for available models
     */
    async startLazyPreloading(availableModels, currentModelIndex) {
        console.log(`🚀 Starting lazy preloading for ${availableModels.length} models (current: ${currentModelIndex})`);
        
        // Build priority queue based on adjacent models and usage patterns
        this.buildPreloadQueue(availableModels, currentModelIndex);
        
        // Start background preloading
        this.preloadInBackground();
        
        // Track initial access pattern
        const currentModel = availableModels[currentModelIndex];
        if (currentModel) {
            this.recordAccess(currentModel.path, currentModelIndex);
        }
    }
    
    /**
     * Build priority-based preload queue
     */
    buildPreloadQueue(models, currentIndex) {
        const queue = [];
        
        // HIGH PRIORITY: Adjacent models (next/previous in sequence)
        const adjacentIndexes = [
            currentIndex - 1,  // Previous model
            currentIndex + 1   // Next model
        ].filter(i => i >= 0 && i < models.length);
        
        adjacentIndexes.forEach(index => {
            const model = models[index];
            if (model && !this.modelCache.hasModel(model.path)) {
                queue.push({
                    path: model.path,
                    name: model.name,
                    priority: 'HIGH',
                    index: index,
                    reason: index > currentIndex ? 'next-in-sequence' : 'previous-in-sequence'
                });
            }
        });
        
        // MEDIUM PRIORITY: Frequently accessed models based on patterns
        const frequentModels = this.getFrequentlyAccessedModels(models);
        frequentModels.forEach(({ model, index, score }) => {
            if (!this.modelCache.hasModel(model.path) && 
                !adjacentIndexes.includes(index)) {
                queue.push({
                    path: model.path,
                    name: model.name,
                    priority: 'MEDIUM',
                    index: index,
                    reason: `frequent-access (score: ${score.toFixed(2)})`
                });
            }
        });
        
        // LOW PRIORITY: Remaining models in order
        models.forEach((model, index) => {
            if (index !== currentIndex && 
                !adjacentIndexes.includes(index) && 
                !this.modelCache.hasModel(model.path) &&
                !queue.some(q => q.path === model.path)) {
                queue.push({
                    path: model.path,
                    name: model.name,
                    priority: 'LOW',
                    index: index,
                    reason: 'bulk-preload'
                });
            }
        });
        
        // Sort by priority (HIGH > MEDIUM > LOW)
        this.preloadQueue = queue.sort((a, b) => {
            const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        console.log(`📋 Preload queue built: ${this.preloadQueue.length} models`, {
            high: queue.filter(q => q.priority === 'HIGH').length,
            medium: queue.filter(q => q.priority === 'MEDIUM').length,
            low: queue.filter(q => q.priority === 'LOW').length
        });
        
        // Log queue details in development
        if (import.meta.env.DEV) {
            this.preloadQueue.slice(0, 5).forEach((item, idx) => {
                console.log(`  ${idx + 1}. [${item.priority}] ${item.name} (${item.reason})`);
            });
        }
    }
    
    /**
     * Get frequently accessed models based on usage patterns
     */
    getFrequentlyAccessedModels(models) {
        const scored = [];
        
        for (const [path, pattern] of this.accessPatterns.entries()) {
            const modelIndex = models.findIndex(m => m.path === path);
            if (modelIndex === -1) continue;
            
            // Calculate access score based on frequency and recency
            const frequency = pattern.count;
            const recency = Date.now() - pattern.lastAccess;
            const recencyHours = recency / (1000 * 60 * 60);
            
            // Score: higher frequency = higher score, recent access = higher score
            const score = frequency * Math.exp(-recencyHours / 24); // Decay over 24 hours
            
            if (score > 0.5) { // Only include models with meaningful usage
                scored.push({
                    model: models[modelIndex],
                    index: modelIndex,
                    score: score
                });
            }
        }
        
        // Sort by score (highest first)
        return scored.sort((a, b) => b.score - a.score).slice(0, 3); // Top 3 frequent models
    }
    
    /**
     * Background preloading with idle time integration
     */
    async preloadInBackground() {
        if (this.isPreloading) {
            console.log('⏳ Preloading already in progress');
            return;
        }
        
        this.isPreloading = true;
        console.log(`🚀 Starting background preloading of ${this.preloadQueue.length} models`);
        
        let processed = 0;
        let successful = 0;
        let failed = 0;
        
        while (this.preloadQueue.length > 0) {
            // Check memory usage before continuing
            if (this.isMemoryLimitReached()) {
                console.log('🧠 Memory limit reached, pausing preloading');
                break;
            }
            
            // Respect concurrent loading limit
            if (this.activeLoads.size >= this.maxConcurrentLoads) {
                await this.sleep(50); // Wait briefly for active loads to complete
                continue;
            }
            
            const modelToLoad = this.preloadQueue.shift();
            processed++;
            
            try {
                // Use requestIdleCallback for non-blocking preload
                await this.preloadWhenIdle(modelToLoad);
                successful++;
                console.log(`✅ Preloaded [${modelToLoad.priority}] ${modelToLoad.name} (${successful}/${processed})`);
            } catch (error) {
                failed++;
                console.error(`❌ Failed to preload ${modelToLoad.name}:`, error.message);
                
                // Don't retry high-priority models immediately to avoid blocking queue
                if (modelToLoad.priority === 'LOW' && failed < 3) {
                    this.preloadQueue.push({...modelToLoad, priority: 'RETRY'});
                }
            }
            
            // Yield control to prevent UI blocking
            await this.sleep(this.preloadDelay);
        }
        
        this.isPreloading = false;
        
        // Log final statistics
        console.log(`🎯 Background preloading completed:`, {
            processed,
            successful,
            failed,
            cached: this.modelCache.size,
            memory: `${this.modelCache.getTotalMemoryUsage().toFixed(1)}MB`
        });
        
        // Trigger performance report if monitoring is enabled
        if (this.sceneManager.performanceMonitor?.isEnabled) {
            console.log('📊 Preloading performance impact:');
            this.sceneManager.performanceMonitor.logPerformanceReport();
        }
    }
    
    /**
     * Preload model using requestIdleCallback when possible
     */
    preloadWhenIdle(modelToLoad) {
        return new Promise((resolve, reject) => {
            // Track active load
            this.activeLoads.add(modelToLoad.path);
            
            const loadModel = async () => {
                try {
                    const entry = await this.modelCache.loadModelSilently(modelToLoad.path);
                    resolve(entry);
                } catch (error) {
                    reject(error);
                } finally {
                    // Remove from active loads
                    this.activeLoads.delete(modelToLoad.path);
                }
            };

            // Use requestIdleCallback if available for better performance
            if ('requestIdleCallback' in window) {
                requestIdleCallback(loadModel, { 
                    timeout: this.idleTimeout 
                });
            } else {
                // Fallback for browsers without requestIdleCallback
                setTimeout(loadModel, 50);
            }
        });
    }
    
    /**
     * Check if memory usage is approaching limits
     */
    isMemoryLimitReached() {
        if (!performance.memory) return false;
        
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        return memoryUsage > this.memoryThreshold;
    }
    
    /**
     * Record model access for pattern learning
     */
    recordAccess(modelPath, modelIndex = -1) {
        const now = Date.now();
        
        if (this.accessPatterns.has(modelPath)) {
            const pattern = this.accessPatterns.get(modelPath);
            pattern.count++;
            pattern.lastAccess = now;
            
            // Calculate average gap between accesses
            if (pattern.previousAccess) {
                const gap = now - pattern.previousAccess;
                pattern.avgGap = pattern.avgGap ? (pattern.avgGap + gap) / 2 : gap;
            }
            pattern.previousAccess = now;
        } else {
            this.accessPatterns.set(modelPath, {
                count: 1,
                lastAccess: now,
                previousAccess: null,
                avgGap: null
            });
        }
        
        // Track sequence patterns for predictive loading
        this.sequencePatterns.push({ path: modelPath, index: modelIndex, timestamp: now });
        
        // Keep only recent patterns (last 50 accesses)
        if (this.sequencePatterns.length > 50) {
            this.sequencePatterns.shift();
        }
        
        // Debug logging in development
        if (import.meta.env.DEV) {
            const pattern = this.accessPatterns.get(modelPath);
            console.log(`📈 Access pattern updated: ${modelPath}`, {
                count: pattern.count,
                avgGap: pattern.avgGap ? `${(pattern.avgGap / 1000).toFixed(1)}s` : 'N/A'
            });
        }
    }
    
    /**
     * Predict next likely models based on current access
     */
    predictNextModels(currentModelPath, currentIndex, availableModels) {
        const predictions = [];
        
        // Simple sequence prediction: if user goes A -> B -> C, predict D
        const recentSequence = this.sequencePatterns.slice(-3);
        if (recentSequence.length >= 2) {
            const lastIndex = recentSequence[recentSequence.length - 1].index;
            const direction = recentSequence[recentSequence.length - 1].index - 
                           recentSequence[recentSequence.length - 2].index;
            
            const predictedIndex = lastIndex + direction;
            if (predictedIndex >= 0 && predictedIndex < availableModels.length) {
                predictions.push({
                    path: availableModels[predictedIndex].path,
                    confidence: 0.7,
                    reason: 'sequence-prediction'
                });
            }
        }
        
        // Frequency-based prediction
        const frequentModels = this.getFrequentlyAccessedModels(availableModels);
        frequentModels.slice(0, 2).forEach(({ model }) => {
            if (model.path !== currentModelPath) {
                predictions.push({
                    path: model.path,
                    confidence: 0.5,
                    reason: 'frequency-prediction'
                });
            }
        });
        
        return predictions;
    }
    
    /**
     * Utility: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get preloading statistics
     */
    getPreloadStats() {
        return {
            isPreloading: this.isPreloading,
            queueLength: this.preloadQueue.length,
            activeLoads: this.activeLoads.size,
            accessPatterns: this.accessPatterns.size,
            sequencePatterns: this.sequencePatterns.length,
            memoryUsage: this.modelCache.getTotalMemoryUsage()
        };
    }
    
    /**
     * Clear all preloading state
     */
    clear() {
        this.preloadQueue.length = 0;
        this.activeLoads.clear();
        this.accessPatterns.clear();
        this.sequencePatterns.length = 0;
        this.isPreloading = false;
        
        console.log('🧹 ModelPreloader state cleared');
    }
    
    /**
     * Stop all preloading operations
     */
    stop() {
        this.isPreloading = false;
        this.preloadQueue.length = 0;
        this.activeLoads.clear();
        
        console.log('⏹️ ModelPreloader stopped');
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
        if (config.maxConcurrentLoads !== undefined) {
            this.maxConcurrentLoads = config.maxConcurrentLoads;
        }
        if (config.preloadDelay !== undefined) {
            this.preloadDelay = config.preloadDelay;
        }
        if (config.memoryThreshold !== undefined) {
            this.memoryThreshold = config.memoryThreshold;
        }
        
        console.log('⚙️ ModelPreloader config updated:', config);
    }
    
    /**
     * Dispose of preloader resources
     */
    dispose() {
        this.stop();
        this.clear();
        
        console.log('🗑️ ModelPreloader disposed');
    }
}