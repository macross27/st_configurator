import * as THREE from 'three';

/**
 * Advanced memory management system for GLB model cache
 * Implements LRU eviction, memory estimation, and configurable limits
 */
export class ModelMemoryManager {
    constructor(modelCache, options = {}) {
        this.modelCache = modelCache;
        
        // Configuration options with environment variable support and defaults
        this.maxCachedModels = options.maxCachedModels || 
            parseInt(import.meta.env.VITE_MAX_CACHED_MODELS) || 8;
        this.maxMemoryMB = options.maxMemoryMB || 
            parseInt(import.meta.env.VITE_MAX_CACHE_MEMORY_MB) || 256;
        
        // Memory threshold configuration
        const thresholdPercent = parseInt(import.meta.env.VITE_MEMORY_THRESHOLD_PERCENT) || 80;
        this.memoryThresholdMB = options.memoryThresholdMB || 
            (thresholdPercent / 100) * this.maxMemoryMB;
        
        // Eviction configuration
        this.evictionBatchSize = options.evictionBatchSize || 
            parseInt(import.meta.env.VITE_EVICTION_BATCH_SIZE) || 2;
        
        // Cooldown configuration
        this.evictionCooldown = options.evictionCooldown || 
            parseInt(import.meta.env.VITE_EVICTION_COOLDOWN_MS) || 1000;
        
        // Optimization settings
        this.enableAutoOptimization = options.enableAutoOptimization !== undefined ? 
            options.enableAutoOptimization : 
            (import.meta.env.VITE_ENABLE_MEMORY_OPTIMIZATION === 'true');
        
        this.emergencyThresholdPercent = options.emergencyThresholdPercent || 
            parseInt(import.meta.env.VITE_EMERGENCY_CLEANUP_THRESHOLD) || 90;
        
        // Memory tracking
        this.memoryEstimator = new GLTFMemoryEstimator();
        this.lastEvictionTime = 0;
        this.evictionCooldown = 1000; // 1 second cooldown between evictions
        
        // Statistics
        this.stats = {
            totalEvictions: 0,
            memoryReclaimed: 0,
            averageModelSize: 0,
            peakMemoryUsage: 0
        };
        
        console.log('🧠 ModelMemoryManager initialized with limits:', {
            maxModels: this.maxCachedModels,
            maxMemoryMB: this.maxMemoryMB,
            thresholdMB: this.memoryThresholdMB.toFixed(1),
            batchSize: this.evictionBatchSize,
            cooldownMs: this.evictionCooldown,
            autoOptimization: this.enableAutoOptimization,
            emergencyThreshold: this.emergencyThresholdPercent + '%'
        });
    }
    
    /**
     * Check if models should be evicted before loading a new model
     */
    shouldEvictModels(newModelSize) {
        const currentCount = this.modelCache.size;
        const currentMemory = this.getTotalMemoryUsage();
        
        // Update peak memory tracking
        if (currentMemory > this.stats.peakMemoryUsage) {
            this.stats.peakMemoryUsage = currentMemory;
        }
        
        const countExceeded = currentCount >= this.maxCachedModels;
        const memoryExceeded = (currentMemory + newModelSize) > this.maxMemoryMB;
        const thresholdExceeded = (currentMemory + newModelSize) > this.memoryThresholdMB;
        
        if (countExceeded || memoryExceeded) {
            console.log('🚨 Eviction required:', {
                reason: countExceeded ? 'model count' : 'memory limit',
                currentCount,
                maxCount: this.maxCachedModels,
                currentMemoryMB: currentMemory.toFixed(1),
                newModelSizeMB: newModelSize.toFixed(1),
                maxMemoryMB: this.maxMemoryMB
            });
            return true;
        }
        
        if (thresholdExceeded) {
            console.log('⚠️ Memory threshold exceeded, considering eviction:', {
                currentMemoryMB: currentMemory.toFixed(1),
                thresholdMB: this.memoryThresholdMB.toFixed(1),
                maxMemoryMB: this.maxMemoryMB
            });
            return true;
        }
        
        // Check for emergency cleanup threshold
        const emergencyThresholdMB = (this.emergencyThresholdPercent / 100) * this.maxMemoryMB;
        const emergencyThresholdExceeded = (currentMemory + newModelSize) > emergencyThresholdMB;
        
        if (emergencyThresholdExceeded && this.enableAutoOptimization) {
            console.log('🚨 Emergency threshold exceeded, triggering aggressive cleanup:', {
                currentMemoryMB: currentMemory.toFixed(1),
                emergencyThresholdMB: emergencyThresholdMB.toFixed(1),
                utilizationPercent: ((currentMemory / this.maxMemoryMB) * 100).toFixed(1)
            });
            // Trigger emergency cleanup in background (don't block model loading)
            setTimeout(() => this.emergencyCleanup(), 0);
        }
        
        return false;
    }
    
    /**
     * Evict least recently used models with advanced strategy
     */
    async evictLeastRecentlyUsed(preserveCurrentModel = true) {
        const now = Date.now();
        
        // Respect cooldown period
        if (now - this.lastEvictionTime < this.evictionCooldown) {
            console.log('🔄 Eviction on cooldown, skipping');
            return;
        }
        
        // Get sorted models by last access time
        const models = [...this.modelCache.entries()]
            .map(([path, entry]) => ({ path, ...entry }))
            .sort((a, b) => a.lastAccessed - b.lastAccessed);
        
        // Filter models that can be evicted
        let candidatesForEviction = models.filter(model => {
            // Never evict the currently visible model if preserveCurrentModel is true
            if (preserveCurrentModel && model.isVisible) {
                return false;
            }
            
            // Never evict recently accessed models (within last 30 seconds)
            const timeSinceAccess = now - model.lastAccessed;
            if (timeSinceAccess < 30000) {
                return false;
            }
            
            return true;
        });
        
        if (candidatesForEviction.length === 0) {
            console.log('⚠️ No models available for eviction');
            return;
        }
        
        let modelsEvicted = 0;
        let memoryReclaimed = 0;
        
        // Evict models in batches
        while (candidatesForEviction.length > 0 && 
               modelsEvicted < this.evictionBatchSize && 
               this.needsEviction()) {
            
            const modelToEvict = candidatesForEviction.shift();
            const memorySize = modelToEvict.memoryEstimate;
            
            try {
                await this.evictModel(modelToEvict.path);
                modelsEvicted++;
                memoryReclaimed += memorySize;
                
                console.log(`🗑️ Evicted model: ${modelToEvict.path} (${memorySize.toFixed(1)}MB)`);
            } catch (error) {
                console.error(`❌ Failed to evict model ${modelToEvict.path}:`, error);
                break;
            }
        }
        
        // Update statistics
        this.stats.totalEvictions += modelsEvicted;
        this.stats.memoryReclaimed += memoryReclaimed;
        this.lastEvictionTime = now;
        
        if (modelsEvicted > 0) {
            console.log(`✅ Eviction complete: ${modelsEvicted} models, ${memoryReclaimed.toFixed(1)}MB reclaimed`);
            this.updateAverageModelSize();
        }
    }
    
    /**
     * Check if eviction is still needed
     */
    needsEviction() {
        const currentCount = this.modelCache.size;
        const currentMemory = this.getTotalMemoryUsage();
        
        return currentCount > this.maxCachedModels || 
               currentMemory > this.maxMemoryMB ||
               currentMemory > this.memoryThresholdMB;
    }
    
    /**
     * Evict a specific model with proper cleanup
     */
    async evictModel(modelPath) {
        const entry = this.modelCache.getModel(modelPath);
        if (!entry) {
            console.warn(`⚠️ Attempted to evict non-existent model: ${modelPath}`);
            return;
        }
        
        const memorySize = entry.memoryEstimate;
        
        // Remove from scene graph
        if (entry.sceneObject.parent) {
            entry.sceneObject.parent.remove(entry.sceneObject);
        }
        
        // Comprehensive resource disposal
        await this.disposeModelResources(entry.sceneObject);
        
        // Remove from cache
        this.modelCache.loadedModels.delete(modelPath);
        
        // Update visible model reference if this was the visible one
        if (this.modelCache.visibleModelId === modelPath) {
            this.modelCache.visibleModelId = null;
        }
        
        console.log(`🗑️ Model resources disposed: ${modelPath} (${memorySize.toFixed(1)}MB freed)`);
    }
    
    /**
     * Comprehensive resource disposal for a model
     */
    async disposeModelResources(modelObject) {
        const disposalPromises = [];
        
        modelObject.traverse((child) => {
            if (child.isMesh) {
                // Dispose geometry
                if (child.geometry) {
                    disposalPromises.push(
                        new Promise(resolve => {
                            child.geometry.dispose();
                            resolve();
                        })
                    );
                }
                
                // Dispose materials and textures
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            disposalPromises.push(this.disposeMaterial(mat));
                        });
                    } else {
                        disposalPromises.push(this.disposeMaterial(child.material));
                    }
                }
            }
        });
        
        // Wait for all disposal operations to complete
        await Promise.all(disposalPromises);
        
        // Force garbage collection hint
        if (window.gc) {
            window.gc();
        }
    }
    
    /**
     * Dispose a material and its textures
     */
    async disposeMaterial(material) {
        return new Promise(resolve => {
            // Dispose textures (but preserve shared canvas textures)
            if (material.map && !material.map.isCanvasTexture) {
                material.map.dispose();
            }
            if (material.normalMap && !material.normalMap.isCanvasTexture) {
                material.normalMap.dispose();
            }
            if (material.roughnessMap && !material.roughnessMap.isCanvasTexture) {
                material.roughnessMap.dispose();
            }
            if (material.metalnessMap && !material.metalnessMap.isCanvasTexture) {
                material.metalnessMap.dispose();
            }
            if (material.aoMap && !material.aoMap.isCanvasTexture) {
                material.aoMap.dispose();
            }
            
            // Dispose material
            material.dispose();
            resolve();
        });
    }
    
    /**
     * Get total memory usage of cached models
     */
    getTotalMemoryUsage() {
        let total = 0;
        for (const [, entry] of this.modelCache.entries()) {
            total += entry.memoryEstimate;
        }
        return total;
    }
    
    /**
     * Update average model size statistic
     */
    updateAverageModelSize() {
        const totalMemory = this.getTotalMemoryUsage();
        const modelCount = this.modelCache.size;
        
        if (modelCount > 0) {
            this.stats.averageModelSize = totalMemory / modelCount;
        }
    }
    
    /**
     * Get detailed memory statistics
     */
    getMemoryStats() {
        const currentMemory = this.getTotalMemoryUsage();
        const utilizationPercent = (currentMemory / this.maxMemoryMB) * 100;
        
        return {
            // Current state
            currentMemoryMB: currentMemory,
            maxMemoryMB: this.maxMemoryMB,
            memoryUtilization: utilizationPercent,
            cachedModels: this.modelCache.size,
            maxCachedModels: this.maxCachedModels,
            
            // Configuration
            memoryThresholdMB: this.memoryThresholdMB,
            evictionBatchSize: this.evictionBatchSize,
            
            // Statistics
            totalEvictions: this.stats.totalEvictions,
            memoryReclaimed: this.stats.memoryReclaimed,
            averageModelSize: this.stats.averageModelSize,
            peakMemoryUsage: this.stats.peakMemoryUsage,
            
            // Status
            needsEviction: this.needsEviction(),
            onCooldown: (Date.now() - this.lastEvictionTime) < this.evictionCooldown
        };
    }
    
    /**
     * Optimize memory usage proactively
     */
    async optimizeMemory() {
        console.log('🔧 Starting proactive memory optimization');
        
        const stats = this.getMemoryStats();
        
        if (stats.memoryUtilization > 70) {
            console.log(`📊 High memory utilization (${stats.memoryUtilization.toFixed(1)}%), optimizing...`);
            await this.evictLeastRecentlyUsed(true);
        }
        
        // Update statistics
        this.updateAverageModelSize();
        
        console.log('✅ Memory optimization complete');
        return this.getMemoryStats();
    }
    
    /**
     * Emergency memory cleanup - more aggressive eviction
     */
    async emergencyCleanup() {
        console.log('🚨 Emergency memory cleanup initiated');
        
        const originalBatchSize = this.evictionBatchSize;
        const originalCooldown = this.evictionCooldown;
        
        // Temporarily increase aggressiveness
        this.evictionBatchSize = Math.max(2, Math.floor(this.modelCache.size * 0.5));
        this.evictionCooldown = 100; // Very short cooldown
        
        try {
            await this.evictLeastRecentlyUsed(false); // Don't preserve current model
            
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            console.log('✅ Emergency cleanup complete');
        } finally {
            // Restore original settings
            this.evictionBatchSize = originalBatchSize;
            this.evictionCooldown = originalCooldown;
        }
        
        return this.getMemoryStats();
    }
    
    /**
     * Set new memory limits
     */
    updateLimits(newLimits) {
        if (newLimits.maxCachedModels !== undefined) {
            this.maxCachedModels = newLimits.maxCachedModels;
        }
        if (newLimits.maxMemoryMB !== undefined) {
            this.maxMemoryMB = newLimits.maxMemoryMB;
            this.memoryThresholdMB = 0.8 * this.maxMemoryMB; // Update threshold
        }
        if (newLimits.evictionBatchSize !== undefined) {
            this.evictionBatchSize = newLimits.evictionBatchSize;
        }
        
        console.log('⚙️ Memory limits updated:', {
            maxModels: this.maxCachedModels,
            maxMemoryMB: this.maxMemoryMB,
            thresholdMB: this.memoryThresholdMB,
            batchSize: this.evictionBatchSize
        });
        
        // Check if immediate eviction is needed with new limits
        if (this.needsEviction()) {
            this.evictLeastRecentlyUsed();
        }
    }
    
    /**
     * Log comprehensive memory report
     */
    logMemoryReport() {
        const stats = this.getMemoryStats();
        
        console.group('🧠 Memory Management Report');
        console.log('Current Usage:', {
            models: `${stats.cachedModels}/${stats.maxCachedModels}`,
            memory: `${stats.currentMemoryMB.toFixed(1)}MB/${stats.maxMemoryMB}MB (${stats.memoryUtilization.toFixed(1)}%)`,
            averageSize: `${stats.averageModelSize.toFixed(1)}MB per model`
        });
        console.log('Statistics:', {
            totalEvictions: stats.totalEvictions,
            memoryReclaimed: `${stats.memoryReclaimed.toFixed(1)}MB`,
            peakUsage: `${stats.peakMemoryUsage.toFixed(1)}MB`
        });
        console.log('Status:', {
            needsEviction: stats.needsEviction,
            onCooldown: stats.onCooldown
        });
        console.groupEnd();
        
        return stats;
    }
    
    /**
     * Dispose of the memory manager
     */
    dispose() {
        this.modelCache = null;
        this.memoryEstimator = null;
        
        console.log('🗑️ ModelMemoryManager disposed');
    }
}

/**
 * Enhanced memory estimation for GLTF models
 * Provides more accurate memory usage calculations
 */
export class GLTFMemoryEstimator {
    constructor() {
        this.textureMemoryCache = new Map();
    }
    
    /**
     * Estimate total memory usage of a GLTF model
     */
    estimateModelMemory(gltfScene) {
        let totalVertices = 0;
        let totalIndices = 0;
        let textureMemory = 0;
        let materialCount = 0;
        
        gltfScene.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    // Count vertices
                    totalVertices += child.geometry.attributes.position?.count || 0;
                    
                    // Count indices
                    if (child.geometry.index) {
                        totalIndices += child.geometry.index.count;
                    }
                }
                
                // Estimate material memory (ignored since we use shared textures)
                if (child.material) {
                    materialCount += Array.isArray(child.material) ? child.material.length : 1;
                }
            }
        });
        
        // Memory calculations:
        // - Position: 3 * 4 bytes (float32) = 12 bytes per vertex
        // - Normal: 3 * 4 bytes = 12 bytes per vertex  
        // - UV: 2 * 4 bytes = 8 bytes per vertex
        // - Indices: 4 bytes per index (uint32)
        // - Material: ~100 bytes per material (rough estimate)
        
        const vertexMemoryMB = (totalVertices * 32) / (1024 * 1024); // 32 bytes per vertex
        const indexMemoryMB = (totalIndices * 4) / (1024 * 1024);    // 4 bytes per index
        const materialMemoryMB = (materialCount * 100) / (1024 * 1024); // ~100 bytes per material
        
        const totalMemoryMB = vertexMemoryMB + indexMemoryMB + materialMemoryMB;
        
        // Apply minimum threshold and add overhead
        const finalMemoryMB = Math.max(totalMemoryMB * 1.2, 0.5); // 20% overhead, minimum 0.5MB
        
        console.log(`📊 Memory estimate for model:`, {
            vertices: totalVertices,
            indices: totalIndices,
            materials: materialCount,
            vertexMB: vertexMemoryMB.toFixed(2),
            indexMB: indexMemoryMB.toFixed(2),
            materialMB: materialMemoryMB.toFixed(2),
            totalMB: finalMemoryMB.toFixed(2)
        });
        
        return finalMemoryMB;
    }
    
    /**
     * Estimate texture memory usage (not used with shared textures)
     */
    estimateTextureMemory(texture) {
        if (!texture || !texture.image) return 0;
        
        const width = texture.image.width || 512;
        const height = texture.image.height || 512;
        const channels = 4; // RGBA
        
        return (width * height * channels) / (1024 * 1024); // MB
    }
}