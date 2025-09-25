import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ModelMemoryManager } from './ModelMemoryManager.js';

/**
 * Cache entry for a loaded GLB model
 */
export class ModelCacheEntry {
    constructor(modelPath, gltfScene, memoryEstimate) {
        this.modelPath = modelPath;
        this.sceneObject = gltfScene;           // Three.js Group/Object3D
        this.isVisible = false;
        this.lastAccessed = Date.now();
        this.memoryEstimate = memoryEstimate;   // Approximate memory usage in MB
        this.materialsApplied = false;          // Track if shared texture applied
    }
}

/**
 * Memory estimation utility for GLTF models
 */
export class GLTFMemoryEstimator {
    estimateModelMemory(gltfScene) {
        let totalVertices = 0;
        let totalTextures = 0;
        
        gltfScene.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    totalVertices += child.geometry.attributes.position?.count || 0;
                }
                // Note: We ignore embedded textures since we use shared texture
            }
        });
        
        // Rough estimate: 
        // - 36 bytes per vertex (position + normal + uv + indices)
        // - Shared texture doesn't count per model
        const vertexMemoryMB = (totalVertices * 36) / (1024 * 1024);
        
        return Math.max(vertexMemoryMB, 0.5); // Minimum 0.5MB per model
    }
}

/**
 * Main ModelCache system for managing multiple GLB models
 */
export class ModelCache {
    constructor(sharedTextureCanvas = null, options = {}) {
        this.loadedModels = new Map();          // modelPath -> ModelCacheEntry
        this.visibleModelId = null;             // Currently visible model ID
        this.sharedTextureCanvas = sharedTextureCanvas;  // Single texture source
        this.sharedTexture = null;              // Three.js texture from canvas
        this.masterMaterial = null;             // Master material template
        this.modelMaterials = new Map();        // modelPath -> individual material instance
        this.modelsContainer = new THREE.Group(); // Container for all cached models
        this.isPreloading = false;
        this.preloadQueue = [];

        // Legacy memory estimator (kept for backward compatibility)
        this.memoryEstimator = new GLTFMemoryEstimator();
        
        // Configuration (with environment variable support)
        this.maxCachedModels = options.maxCachedModels || 
            parseInt(import.meta.env.VITE_MAX_CACHED_MODELS) || 8;
        this.maxMemoryMB = options.maxMemoryMB || 
            parseInt(import.meta.env.VITE_MAX_CACHE_MEMORY_MB) || 256;
        
        // Initialize advanced memory manager
        this.memoryManager = new ModelMemoryManager(this, {
            maxCachedModels: this.maxCachedModels,
            maxMemoryMB: this.maxMemoryMB,
            ...options.memoryManager
        });
        
        // Initialize DRACO loader (reuse across all model loads)
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        
        console.log('🎯 ModelCache initialized with advanced memory management:', {
            maxModels: this.maxCachedModels,
            maxMemoryMB: this.maxMemoryMB
        });
    }
    
    /**
     * Check if a model is cached
     */
    hasModel(modelPath) {
        return this.loadedModels.has(modelPath);
    }
    
    /**
     * Get a cached model entry
     */
    getModel(modelPath) {
        return this.loadedModels.get(modelPath);
    }
    
    /**
     * Get or load a model (main entry point)
     */
    async getOrLoadModel(modelPath) {
        // Return cached model if available
        if (this.hasModel(modelPath)) {
            const entry = this.getModel(modelPath);
            entry.lastAccessed = Date.now();
            console.log(`✅ Model retrieved from cache: ${modelPath}`);
            return entry;
        }
        
        // Load model if not cached
        return await this.loadModelSilently(modelPath);
    }
    
    /**
     * Load a model without affecting UI (for preloading)
     */
    async loadModelSilently(modelPath) {
        return new Promise(async (resolve, reject) => {
            console.log(`📦 Loading model silently: ${modelPath}`);
            
            this.gltfLoader.load(
                modelPath,
                async (gltf) => {
                    try {
                        const memoryEstimate = this.memoryManager.memoryEstimator.estimateModelMemory(gltf.scene);
                        
                        // Check memory limits before caching using advanced memory manager
                        if (this.memoryManager.shouldEvictModels(memoryEstimate)) {
                            await this.memoryManager.evictLeastRecentlyUsed();
                        }
                        
                        // Log all mesh names in the loaded GLB (hybrid cache)
                        const meshNames = [];
                        gltf.scene.traverse((child) => {
                            if (child.isMesh) {
                                meshNames.push(child.name || 'unnamed');
                                console.log('🔍 Found mesh (hybrid cache):', child.name || 'unnamed', 'Type:', child.type);
                            }
                        });
                        console.log(`📋 GLB Model cached with ${meshNames.length} meshes:`, meshNames);

                        // Prepare model for caching
                        const modelObject = gltf.scene;
                        modelObject.castShadow = true;
                        modelObject.receiveShadow = true;
                        modelObject.visible = false; // Hidden by default

                        // Dispose original materials and apply individual material instance
                        const modelMaterial = this.getModelMaterial(modelPath);
                        let meshCount = 0;

                        modelObject.traverse((child) => {
                            if (child.isMesh) {
                                meshCount++;
                                // Dispose existing materials completely
                                if (child.material) {
                                    if (Array.isArray(child.material)) {
                                        child.material.forEach(mat => mat.dispose());
                                    } else {
                                        child.material.dispose();
                                    }
                                }

                                // Assign individual material instance to this model
                                child.material = modelMaterial;
                            }
                        });

                        console.log(`🎨 Applied individual material (ID: ${modelMaterial.id}) to ${meshCount} meshes in ${modelPath}`);

                        // Add to models container
                        this.modelsContainer.add(modelObject);
                        
                        // Create cache entry
                        const entry = new ModelCacheEntry(modelPath, modelObject, memoryEstimate);
                        this.loadedModels.set(modelPath, entry);
                        
                        console.log(`✅ Model loaded and cached: ${modelPath} (${memoryEstimate.toFixed(1)}MB)`);
                        resolve(entry);
                    } catch (error) {
                        console.error(`❌ Error during model caching for ${modelPath}:`, error);
                        reject(error);
                    }
                },
                (progress) => {
                    // Silent progress - no logging for preloading
                },
                (error) => {
                    console.error(`❌ Failed to load model ${modelPath}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Create individual material instance for a model
     */
    createModelMaterial(modelPath) {
        // Create master material template if it doesn't exist
        if (!this.masterMaterial) {
            this.masterMaterial = new THREE.MeshLambertMaterial({
                map: this.sharedTexture,
                side: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.01
            });
            console.log('🎨 Created master material template. ID:', this.masterMaterial.id);
        }

        // Create individual material instance for this model
        const modelMaterial = this.masterMaterial.clone();
        this.modelMaterials.set(modelPath, modelMaterial);

        console.log(`🎨 Created individual material for ${modelPath}. ID:`, modelMaterial.id);
        return modelMaterial;
    }

    /**
     * Get or create material for a model
     */
    getModelMaterial(modelPath) {
        if (!this.modelMaterials.has(modelPath)) {
            return this.createModelMaterial(modelPath);
        }
        return this.modelMaterials.get(modelPath);
    }

    /**
     * Apply shared texture to a specific model with its individual material
     */
    applySharedTexture(modelObject, modelPath) {
        // Create or update shared texture from canvas
        if (this.sharedTextureCanvas) {
            if (this.sharedTexture) {
                this.sharedTexture.needsUpdate = true;
            } else {
                this.sharedTexture = new THREE.CanvasTexture(this.sharedTextureCanvas);
                console.log('🎨 Created shared texture from canvas');
            }
        }

        // Get the individual material for this model
        const modelMaterial = this.getModelMaterial(modelPath);

        // Update the model's individual material with new texture
        if (modelMaterial) {
            modelMaterial.map = this.sharedTexture;
            modelMaterial.needsUpdate = true;

            // Ensure all meshes in this model use its individual material
            let meshCount = 0;
            modelObject.traverse((child) => {
                if (child.isMesh) {
                    meshCount++;
                    child.material = modelMaterial;
                }
            });

            console.log(`🎨 Applied individual material (ID: ${modelMaterial.id}) to ${meshCount} meshes in ${modelPath}`);
        }
    }
    
    /**
     * Update shared texture for all cached models with individual materials
     */
    updateSharedTextureForAll() {
        if (!this.sharedTextureCanvas) return;

        // Update existing texture
        if (this.sharedTexture) {
            this.sharedTexture.needsUpdate = true;
        } else {
            this.sharedTexture = new THREE.CanvasTexture(this.sharedTextureCanvas);
        }

        // Update master material template
        if (this.masterMaterial) {
            this.masterMaterial.map = this.sharedTexture;
            this.masterMaterial.needsUpdate = true;
        }

        // Apply to all individual model materials
        for (const [modelPath, entry] of this.loadedModels.entries()) {
            const modelMaterial = this.modelMaterials.get(modelPath);
            if (modelMaterial) {
                modelMaterial.map = this.sharedTexture;
                modelMaterial.needsUpdate = true;
            }
        }

        console.log(`🎨 Updated shared texture for ${this.loadedModels.size} cached models with individual materials`);
    }
    
    /**
     * Apply texture to a specific model (uses individual material)
     */
    applyTextureToModel(modelObject, texture, modelPath) {
        // Get the individual material for this model
        const modelMaterial = this.getModelMaterial(modelPath);

        if (modelMaterial) {
            // Update individual material with new texture
            modelMaterial.map = texture;
            modelMaterial.needsUpdate = true;

            // Ensure all meshes use the individual material
            modelObject.traverse((child) => {
                if (child.isMesh) {
                    child.material = modelMaterial;
                }
            });
        }
    }
    
    /**
     * Set shared texture canvas
     */
    setSharedTextureCanvas(canvas) {
        this.sharedTextureCanvas = canvas;
        this.sharedTexture = null; // Will be recreated on next use
    }
    
    /**
     * Check if models should be evicted due to memory limits
     * @deprecated Use memoryManager.shouldEvictModels() instead
     */
    shouldEvictModels(newModelSize) {
        return this.memoryManager.shouldEvictModels(newModelSize);
    }
    
    /**
     * Evict least recently used models
     * @deprecated Use memoryManager.evictLeastRecentlyUsed() instead
     */
    async evictLeastRecentlyUsed(preserveCurrentModel = true) {
        return await this.memoryManager.evictLeastRecentlyUsed(preserveCurrentModel);
    }
    
    /**
     * Check if eviction is needed
     * @deprecated Use memoryManager.needsEviction() instead
     */
    needsEviction() {
        return this.memoryManager.needsEviction();
    }
    
    /**
     * Evict a specific model
     * @deprecated Use memoryManager.evictModel() instead
     */
    async evictModel(modelPath) {
        return await this.memoryManager.evictModel(modelPath);
    }
    
    /**
     * Get memory management statistics
     */
    getMemoryStats() {
        return this.memoryManager.getMemoryStats();
    }
    
    /**
     * Optimize memory usage proactively
     */
    async optimizeMemory() {
        return await this.memoryManager.optimizeMemory();
    }
    
    /**
     * Emergency memory cleanup
     */
    async emergencyCleanup() {
        return await this.memoryManager.emergencyCleanup();
    }
    
    /**
     * Update memory management limits
     */
    updateMemoryLimits(newLimits) {
        if (newLimits.maxCachedModels !== undefined) {
            this.maxCachedModels = newLimits.maxCachedModels;
        }
        if (newLimits.maxMemoryMB !== undefined) {
            this.maxMemoryMB = newLimits.maxMemoryMB;
        }
        
        this.memoryManager.updateLimits(newLimits);
    }
    
    /**
     * Log comprehensive memory report
     */
    logMemoryReport() {
        return this.memoryManager.logMemoryReport();
    }
    
    /**
     * Get total memory usage of cached models
     */
    getTotalMemoryUsage() {
        let total = 0;
        for (const [, entry] of this.loadedModels.entries()) {
            total += entry.memoryEstimate;
        }
        return total;
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cachedModels: this.loadedModels.size,
            maxModels: this.maxCachedModels,
            memoryUsage: this.getTotalMemoryUsage(),
            maxMemory: this.maxMemoryMB,
            visibleModel: this.visibleModelId
        };
    }
    
    /**
     * Get all cached model paths
     */
    getCachedModelPaths() {
        return [...this.loadedModels.keys()];
    }

    /**
     * Count total materials in all cached models (should equal number of models!)
     */
    countTotalMaterials() {
        const uniqueMaterials = new Set();
        for (const [modelPath, entry] of this.loadedModels.entries()) {
            entry.sceneObject.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => uniqueMaterials.add(mat.id));
                    } else {
                        uniqueMaterials.add(child.material.id);
                    }
                }
            });
        }
        console.log(`🔍 Total unique materials in scene: ${uniqueMaterials.size} (should equal ${this.loadedModels.size} models)`);
        console.log(`🔍 Material IDs:`, [...uniqueMaterials]);
        console.log(`🔍 Master material ID: ${this.masterMaterial?.id || 'none'}`);
        console.log(`🔍 Individual materials:`, [...this.modelMaterials.entries()].map(([path, mat]) => `${path}:${mat.id}`));
        return uniqueMaterials.size;
    }
    
    /**
     * Clear all cached models
     */
    clearAll() {
        // Evict all models
        for (const modelPath of this.getCachedModelPaths()) {
            this.evictModel(modelPath);
        }
        
        this.visibleModelId = null;
        console.log('🧹 All models cleared from cache');
    }
    
    /**
     * Get the models container for adding to scene
     */
    getModelsContainer() {
        return this.modelsContainer;
    }
    
    /**
     * Get map size (for external access)
     */
    get size() {
        return this.loadedModels.size;
    }
    
    /**
     * Get entries iterator (for external access)
     */
    entries() {
        return this.loadedModels.entries();
    }
    
    /**
     * Delete a model from cache (for external access)
     */
    deleteModel(modelPath) {
        this.evictModel(modelPath);
    }
    
    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearAll();
        
        // Dispose memory manager
        if (this.memoryManager) {
            this.memoryManager.dispose();
            this.memoryManager = null;
        }
        
        if (this.sharedTexture) {
            this.sharedTexture.dispose();
            this.sharedTexture = null;
        }

        // Dispose master material template
        if (this.masterMaterial) {
            this.masterMaterial.dispose();
            this.masterMaterial = null;
        }

        // Dispose all individual model materials
        for (const [modelPath, material] of this.modelMaterials.entries()) {
            material.dispose();
        }
        this.modelMaterials.clear();
        
        if (this.dracoLoader) {
            this.dracoLoader.dispose();
            this.dracoLoader = null;
        }
        
        this.gltfLoader = null;
        this.modelsContainer = null;
        this.memoryEstimator = null;
        
        console.log('🗑️ ModelCache disposed');
    }
}