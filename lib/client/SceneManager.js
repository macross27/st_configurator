import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { errorManager, ApplicationError } from './ErrorManager.js';
import { i18n } from './I18nManager.js';
// REMOVED: ModelCache - now using simple master.glb approach

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.material = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isLoading = false;

        // Layer movement settings from environment
        this.moveLayerEnabled = parseInt(import.meta.env.MOVE_LAYER || '1') === 1;

        // Render-on-demand system
        this.needsRender = true;
        this.isRendering = false;
        this.renderRequestId = null;
        this.lastAzimuth = null;
        this.lastPolar = null;
        this.lastDistance = null;

        this.onCameraStart = null;
        this.onModelLoaded = null;
        this.onModelError = null;

        // REMOVED: Hybrid GLB System properties - now using simple master.glb

        // Initialize performance monitoring
        this.performanceMonitor = new PerformanceMonitor();

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);

        this.camera = new THREE.PerspectiveCamera(
            35,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1, 3);

        // Default state will be set after model loads and camera is positioned
        this.defaultState = null;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.controls.addEventListener('start', () => {
            if (this.onCameraStart) {
                this.onCameraStart();
            }
        });

        // Add render-on-demand event listeners
        this.controls.addEventListener('change', () => {
            this.requestRender();
        });

        this.setupLighting();
        this.loadModel();

        window.addEventListener('resize', () => {
            this.onWindowResize();
            this.requestRender();
        });

        // Start render loop
        this.requestRender();
    }

    setupLighting() {
        // Ambient light for overall base illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Key light (main directional light)
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(5, 5, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        this.scene.add(keyLight);

        // Fill light (softer light from opposite side)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 3, -2);
        this.scene.add(fillLight);

        // Rim light (back light for edge definition)
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(-2, 2, -5);
        this.scene.add(rimLight);

        // Additional point lights for more even coverage
        const pointLight1 = new THREE.PointLight(0xffffff, 0.3, 10);
        pointLight1.position.set(3, 1, -3);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xffffff, 0.2, 10);
        pointLight2.position.set(-3, 1, 3);
        this.scene.add(pointLight2);
    }

    clearModel() {
        if (this.model) {
            // Remove model from scene
            this.scene.remove(this.model);

            // Dispose of geometries and materials
            this.model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => {
                                // Only dispose original textures, not shared canvas textures
                                if (material.map && !material.map.isCanvasTexture) {
                                    material.map.dispose();
                                }
                                material.dispose();
                            });
                        } else {
                            // Only dispose original textures, not shared canvas textures
                            if (child.material.map && !child.material.map.isCanvasTexture) {
                                child.material.map.dispose();
                            }
                            child.material.dispose();
                        }
                    }
                }
            });

            this.model = null;
            this.material = null;
        }
    }

    loadModel(modelPath = './assets/master.glb') {
        // Prevent concurrent loading operations
        if (this.isLoading) {
            console.warn('Model loading already in progress, ignoring request');
            return Promise.resolve();
        }

        this.isLoading = true;
        console.log(`🎯 Loading master GLB model: ${modelPath}`);

        // Clear existing model first
        this.clearModel();

        return this.loadMasterGLB(modelPath);
    }

    /**
     * Load the master GLB file with all 23 meshes
     */
    async loadMasterGLB(modelPath) {
        console.log('🎯 Loading master GLB with all meshes:', modelPath);

        const loader = new GLTFLoader();

        // Setup DRACO loader for compression support
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);

        return new Promise((resolve, reject) => {
            // Store reference to this context for the callback
            const self = this;

            loader.load(
                modelPath,
                (gltf) => {
                    console.log('✅ Master GLB loaded successfully');

                    // Set the model
                    this.model = gltf.scene;
                    this.model.castShadow = true;
                    this.model.receiveShadow = true;

                    // Log all meshes for debugging
                    const meshNames = [];
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            meshNames.push(child.name || 'unnamed');
                        }
                    });
                    console.log(`🔍 Found ${meshNames.length} meshes in master GLB:`, meshNames);

                    // Create single shared material for ALL meshes
                    const sharedMaterial = new THREE.MeshLambertMaterial({
                        map: null, // Will be set by LayerManager
                        side: THREE.DoubleSide,
                        transparent: true,
                        alphaTest: 0.01
                    });

                    // Apply shared material to ALL meshes
                    let appliedCount = 0;
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            // Dispose original material
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }

                            // Apply shared material
                            child.material = sharedMaterial;
                            appliedCount++;
                            console.log(`🎨 Applied shared material to mesh: ${child.name || 'unnamed'}`);
                        }
                    });

                    console.log(`✅ Applied shared material to ${appliedCount} meshes`);
                    this.material = sharedMaterial;

                    // Add to scene
                    this.scene.add(this.model);

                    // Set initial visibility - show only default 5 pieces
                    self.setInitialPieceVisibility();

                    this.isLoading = false;

                    // Set up camera position after model loads
                    this.centerCameraOnModel();

                    if (this.onModelLoaded) {
                        this.onModelLoaded(this.model);
                    }

                    resolve(this.model);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(1);
                    console.log(`📦 Loading master GLB: ${percent}%`);
                },
                (error) => {
                    console.error('❌ Failed to load master GLB:', error);
                    this.isLoading = false;

                    if (this.onModelError) {
                        this.onModelError(error);
                    }

                    reject(error);
                }
            );
        });
    }

    /**
     * DEPRECATED: Create a visible plane geometry for texture display when hybrid system is disabled
     */
    createMinimalFallbackModel() {
        console.log('🔧 DEPRECATED: Creating fallback plane model');

        // Create a visible plane geometry (2x2 units to see textures clearly)
        const geometry = new THREE.PlaneGeometry(2, 2);

        // Create visible material with proper texture support
        const material = new THREE.MeshLambertMaterial({
            map: null, // Will be set later via setTexture
            vertexColors: false,
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1.0, // Fully opaque
            visible: true
        });

        // Create mesh
        const fallbackMesh = new THREE.Mesh(geometry, material);
        fallbackMesh.name = 'texture_display_plane';
        fallbackMesh.visible = true;
        fallbackMesh.castShadow = true;
        fallbackMesh.receiveShadow = true;

        // Create container group
        this.model = new THREE.Group();
        this.model.name = 'texture_display_container';
        this.model.add(fallbackMesh);
        this.model.visible = true;

        // Store material reference for texture application
        this.material = material;

        // Position the plane slightly away from origin
        this.model.position.set(0, 0, 0);

        // Add to scene and make it visible
        this.scene.add(this.model);

        console.log('🔧 Visible plane model created for texture display');
        this.isLoading = false;

        // Trigger initial render
        this.requestRender();

        if (this.onModelLoaded) {
            this.onModelLoaded(this.material);
        }

        return Promise.resolve();
    }


    centerCameraOnModel() {
        if (!this.model || !this.controls) return;

        // Calculate bounding box of the model
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Set the controls target to the center of the model
        this.controls.target.copy(center);

        // Position camera at appropriate distance to view the entire model
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        // Add some padding
        cameraZ *= 1.5;

        // Position camera relative to the model center
        this.camera.position.set(
            center.x,
            center.y + maxDim * 0.3, // Slightly above center
            center.z + cameraZ
        );

        // Update controls
        this.controls.update();

        // Store this as the default state after model is loaded and positioned
        this.captureDefaultState();

        console.log('Camera centered on model:', {
            center: center,
            size: size,
            cameraPosition: this.camera.position
        });
    }

    setTexture(texture) {
        console.log('🎨 SceneManager.setTexture called:', {
            texture: texture,
            material: this.material,
            materialExists: !!this.material
        });

        // Apply texture to all materials in the model (in case there are multiple)
        let materialsUpdated = 0;
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.map = texture;
                            mat.needsUpdate = true;
                            materialsUpdated++;
                        });
                    } else {
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                        materialsUpdated++;
                    }
                }
            });
        }

        console.log('🎨 Texture applied to', materialsUpdated, 'materials');

        // Also update the stored reference for backward compatibility
        if (this.material) {
            this.material.map = texture;
            this.material.needsUpdate = true;
        } else {
            console.error('❌ SceneManager.setTexture: No material reference stored!');
        }

        // NEW: Update ModelCache with the texture if hybrid system is active
        if (this.useHybridSystem && this.modelCache) {
            console.log('🎨 SceneManager updating ModelCache materials with new texture');
            this.updateModelCacheTexture(texture);
        } else {
            console.log('🎨 SceneManager: No hybrid system active, skipping ModelCache update');
        }

        // Request render when texture changes
        this.requestRender();
    }

    /**
     * Update ModelCache materials with new texture
     * @param {THREE.Texture} texture - The new texture to apply
     */
    updateModelCacheTexture(texture) {
        if (!this.modelCache) return;

        // Update all individual model materials with the new texture
        for (const [modelPath, entry] of this.modelCache.entries()) {
            const modelMaterial = this.modelCache.modelMaterials.get(modelPath);
            if (modelMaterial) {
                modelMaterial.map = texture;
                modelMaterial.needsUpdate = true;
            }
        }

        console.log(`🎨 Updated ${this.modelCache.size} ModelCache materials with new texture`);
    }

    getIntersection(mouseX, mouseY) {
        // Skip expensive raycasting if layer movement is disabled
        if (!this.moveLayerEnabled) {
            return null;
        }

        this.mouse.x = mouseX;
        this.mouse.y = mouseY;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.model) {
            const intersects = this.raycaster.intersectObject(this.model);
            return intersects.length > 0 ? intersects[0] : null;
        }

        return null;
    }

    setCameraPosition(position) {
        if (position) {
            this.camera.position.set(position.x, position.y, position.z);
        }
    }

    setCameraTarget(target) {
        if (target && this.controls) {
            this.controls.target.set(target.x, target.y, target.z);
            this.controls.update();
        }
    }

    getCameraPosition() {
        return {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
    }

    getCameraTarget() {
        return {
            x: this.controls.target.x,
            y: this.controls.target.y,
            z: this.controls.target.z
        };
    }

    setControlsEnabled(enabled) {
        if (this.controls) {
            this.controls.enabled = enabled;
        }
    }

    setFov(fov) {
        if (this.camera) {
            this.camera.fov = fov;
            this.camera.updateProjectionMatrix();
            this.requestRender();
        }
    }

    captureDefaultState() {
        if (this.camera && this.controls) {
            this.defaultState = {
                cameraPosition: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                cameraTarget: {
                    x: this.controls.target.x,
                    y: this.controls.target.y,
                    z: this.controls.target.z
                },
                fov: this.camera.fov
            };

            console.log('Default state captured:', this.defaultState);
        }
    }

    resetToDefaultState() {
        if (this.camera && this.controls && this.defaultState) {
            // Reset camera position
            this.camera.position.set(
                this.defaultState.cameraPosition.x,
                this.defaultState.cameraPosition.y,
                this.defaultState.cameraPosition.z
            );

            // Reset camera target
            this.controls.target.set(
                this.defaultState.cameraTarget.x,
                this.defaultState.cameraTarget.y,
                this.defaultState.cameraTarget.z
            );

            // Reset FOV
            this.camera.fov = this.defaultState.fov;
            this.camera.updateProjectionMatrix();

            // Update controls
            this.controls.update();

            console.log('View reset to default state');

            return this.defaultState;
        }
        return null;
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    requestRender() {
        this.needsRender = true;
        if (!this.isRendering) {
            this.renderRequestId = requestAnimationFrame(() => this.render());
        }
    }

    render() {
        this.isRendering = true;
        this.needsRender = false;

        // Optional debug logging for development
        if (import.meta.env.DEV && this.performanceMonitor.metrics.totalFrames < 3) {
            console.log('🎯 Rendering frame', this.performanceMonitor.metrics.totalFrames + 1);
        }

        // Start performance timing
        const renderStart = this.performanceMonitor.startRenderTimer();

        // Update controls with damping
        this.controls.update();

        // Render the scene
        this.renderer.render(this.scene, this.camera);

        // End performance timing
        this.performanceMonitor.endRenderTimer(renderStart);

        // Check if controls are actively being manipulated
        const currentAzimuth = this.controls.getAzimuthalAngle();
        const currentPolar = this.controls.getPolarAngle();
        const currentDistance = this.controls.getDistance();

        // Check if we need to continue rendering
        const cameraMoved = (this.lastAzimuth !== currentAzimuth ||
                           this.lastPolar !== currentPolar ||
                           this.lastDistance !== currentDistance);

        const shouldContinueRendering = this.controls.enabled &&
                                      (cameraMoved || this.needsRender);

        if (shouldContinueRendering) {
            this.lastAzimuth = currentAzimuth;
            this.lastPolar = currentPolar;
            this.lastDistance = currentDistance;

            this.renderRequestId = requestAnimationFrame(() => this.render());
        } else {
            this.isRendering = false;
            console.log('🎯 Render loop stopped - scene is static');
        }
    }

    getPerformanceReport() {
        return this.performanceMonitor.getPerformanceReport();
    }

    logPerformanceReport() {
        return this.performanceMonitor.logPerformanceReport();
    }

    // ================================
    // HYBRID GLB SYSTEM METHODS
    // ================================

    /**
     * Enable hybrid multi-model system
     * @param {Array} availableModels - Array of model objects with {name, path} properties
     */
    enableHybridSystem(availableModels = []) {
        console.log('🎯 Enabling hybrid GLB system...');

        this.useHybridSystem = true;
        this.availableModels = availableModels;

        // Initialize ModelCache with shared texture canvas
        this.modelCache = new ModelCache(
            null, // Will be set by LayerManager
            {
                maxCachedModels: parseInt(import.meta.env.VITE_MAX_CACHED_MODELS) || 8,
                maxMemoryMB: parseInt(import.meta.env.VITE_MAX_CACHE_MEMORY_MB) || 256
            }
        );

        // Add models container to scene
        this.scene.add(this.modelCache.getModelsContainer());

        // Log available models first
        console.log('🎯 Available models for hybrid system:', availableModels);

        // Preload the first 5 models immediately
        this.preloadInitialModels(availableModels);

        console.log('🎯 Hybrid GLB system enabled with', availableModels.length, 'models');
        return this.modelCache;
    }

    async preloadInitialModels(availableModels) {
        const initialModelCount = 5;
        const modelsToPreload = availableModels.slice(0, initialModelCount);

        console.log(`📦 Starting to preload first ${modelsToPreload.length} models (DEFAULT COMBINATION VISIBLE):`, modelsToPreload.map(m => m.name));
        console.log(`📦 Total available models: ${availableModels.length}`);

        // Define the default combination (all 5 models you specified)
        const defaultCombination = [
            './assets/glbs/reg_u_body.glb',     // Upper body
            './assets/glbs/reg_back_body.glb',  // Back body
            './assets/glbs/reg_std_a.glb',      // Standard body
            './assets/glbs/reg_short_arms.glb', // Short arms
            './assets/glbs/pants.glb'           // Pants
        ];

        // Load first 5 models and make DEFAULT COMBINATION VISIBLE
        for (const model of modelsToPreload) {
            try {
                console.log(`📦 Preloading model: ${model.name} (${model.path})`);
                const entry = await this.modelCache.loadModelSilently(model.path);

                // Make visible if part of default combination
                if (defaultCombination.includes(model.path)) {
                    entry.sceneObject.visible = true;
                    entry.isVisible = true;
                    console.log(`✅ Model made visible (default combination): ${model.name}`);
                } else {
                    // All other models stay hidden
                    entry.sceneObject.visible = false;
                    entry.isVisible = false;
                    console.log(`✅ Model preloaded (hidden): ${model.name}`);
                }

                // Apply shared texture to all models
                if (!entry.materialsApplied) {
                    this.modelCache.applySharedTexture(entry.sceneObject);
                    entry.materialsApplied = true;
                }

            } catch (error) {
                console.error(`❌ Failed to preload ${model.name}:`, error);
            }
        }

        // Load remaining models in background (invisible)
        const remainingModels = availableModels.slice(initialModelCount);
        if (remainingModels.length > 0) {
            console.log(`📦 Loading remaining ${remainingModels.length} models in background (HIDDEN):`, remainingModels.map(m => m.name));

            // Load remaining models silently in background (they stay hidden)
            setTimeout(async () => {
                for (const model of remainingModels) {
                    try {
                        console.log(`📦 Background loading: ${model.name} (${model.path})`);
                        await this.modelCache.loadModelSilently(model.path);
                        console.log(`✅ Background loaded: ${model.name}`);
                    } catch (error) {
                        console.error(`❌ Failed to background load ${model.name}:`, error);
                    }
                }
                console.log(`✅ All ${remainingModels.length} background models loaded`);

                // Verify we have exactly ONE material shared across all models
                this.modelCache.countTotalMaterials();
            }, 100); // Small delay to not block initial rendering
        }
    }

    /**
     * Switch to a model using the hybrid system
     * @param {string} modelPath - Path to the model to load
     */
    async switchToModelHybrid(modelPath) {
        try {
            console.log(`🎯 Switching to model: ${modelPath}`);

            // Hide currently visible model
            if (this.modelCache.visibleModelId) {
                const currentModel = this.modelCache.getModel(this.modelCache.visibleModelId);
                if (currentModel) {
                    currentModel.sceneObject.visible = false;
                    currentModel.isVisible = false;
                }
            }

            // Get or load requested model
            const targetModel = await this.modelCache.getOrLoadModel(modelPath);

            // Show target model
            targetModel.sceneObject.visible = true;
            targetModel.isVisible = true;
            targetModel.lastAccessed = Date.now();
            this.modelCache.visibleModelId = modelPath;

            // Apply shared texture if not already applied
            if (!targetModel.materialsApplied) {
                this.modelCache.applySharedTexture(targetModel.sceneObject);
                targetModel.materialsApplied = true;
            }

            // Update camera to center on new model (reuse existing method)
            this.model = targetModel.sceneObject; // Set for existing camera centering
            this.centerCameraOnModel();

            // Store material reference for existing texture system compatibility
            this.material = this.modelCache.sharedMaterial || this.extractMaterialFromModel(targetModel.sceneObject);

            console.log(`✅ Model switched to ${modelPath}`);
            this.requestRender();

            if (this.onModelLoaded) {
                this.onModelLoaded(this.material);
            }

            return targetModel;

        } catch (error) {
            console.error('❌ Hybrid model switching failed:', error);
            // Disable hybrid system
            this.useHybridSystem = false;
            throw error;
        }
    }

    /**
     * Extract material from model for backward compatibility
     * @param {THREE.Object3D} modelObject - The model object to extract material from
     */
    extractMaterialFromModel(modelObject) {
        let material = null;
        modelObject.traverse((child) => {
            if (child.isMesh && child.material && !material) {
                material = Array.isArray(child.material) ? child.material[0] : child.material;
            }
        });
        return material;
    }


    /**
     * Get available models for hybrid system
     */
    getAvailableModels() {
        return this.availableModels;
    }

    /**
     * Get current model index
     */
    getCurrentModelIndex() {
        return this.currentModelIndex;
    }

    /**
     * Switch to next model in the list
     */
    async switchToNextModel() {
        if (!this.useHybridSystem || this.availableModels.length <= 1) return;

        const nextIndex = (this.currentModelIndex + 1) % this.availableModels.length;
        const nextModel = this.availableModels[nextIndex];

        await this.switchToModelHybrid(nextModel.path);
        this.currentModelIndex = nextIndex;

        return nextModel;
    }

    /**
     * Switch to previous model in the list
     */
    async switchToPreviousModel() {
        if (!this.useHybridSystem || this.availableModels.length <= 1) return;

        const prevIndex = this.currentModelIndex === 0
            ? this.availableModels.length - 1
            : this.currentModelIndex - 1;
        const prevModel = this.availableModels[prevIndex];

        await this.switchToModelHybrid(prevModel.path);
        this.currentModelIndex = prevIndex;

        return prevModel;
    }

    /**
     * Get hybrid system statistics
     */
    getHybridStats() {
        if (!this.modelCache) return null;

        return {
            isEnabled: this.useHybridSystem,
            cacheStats: this.modelCache.getCacheStats(),
            memoryStats: this.modelCache.getMemoryStats(),
            availableModels: this.availableModels.length,
            currentModel: this.currentModelIndex
        };
    }

    /**
     * Pure function to determine which models should be visible
     * @param {string} designType - 'reg' or 'setin'
     * @param {string} neckType - 'std_a', 'std_b', 'cft_b', 'cft_c', 'cft_d'
     * @param {string} setOption - 'short-shirt-set', 'long-shirt-set', 'short-shirt', 'long-shirt', 'pants'
     * @returns {Array} Array of GLB filenames that should be visible
     */
    getVisibleModels(designType, neckType, setOption) {
        const prefix = designType === 'setin' ? 'setin' : 'reg';

        // Map neck type to front body type
        const neckToFrontBodyMap = {
            'std_a': 'u_body',
            'cft_c': 'u_body',
            'cft_b': 'v_body',
            'std_b': 'v_body',
            'cft_d': 'u_v_body'
        };

        const frontBodyType = neckToFrontBodyMap[neckType];
        const armLength = setOption.includes('long') ? 'long_arms' : 'short_arms';

        let visibleModels = [];

        switch (setOption) {
            case 'short-shirt-set':
            case 'long-shirt-set':
                // Full set: shirt (4 parts) + pants
                visibleModels = [
                    `${prefix}_back_body.glb`,     // back body
                    `${prefix}_${neckType}.glb`,   // neck piece
                    `${prefix}_${frontBodyType}.glb`, // front body based on neck
                    `${prefix}_${armLength}.glb`,  // arms
                    'pants.glb'                    // pants
                ];
                break;

            case 'short-shirt':
            case 'long-shirt':
                // Shirt only: 4 parts, no pants
                visibleModels = [
                    `${prefix}_back_body.glb`,     // back body
                    `${prefix}_${neckType}.glb`,   // neck piece
                    `${prefix}_${frontBodyType}.glb`, // front body based on neck
                    `${prefix}_${armLength}.glb`   // arms
                ];
                break;

            case 'pants':
                // Pants only
                visibleModels = ['pants.glb'];
                break;

            default:
                console.warn(`Unknown set option: ${setOption}`);
                visibleModels = [];
        }

        return visibleModels;
    }

    /**
     * Set visibility for specific meshes in the master GLB model
     * NEW: Works with single master.glb containing all 23 meshes
     */
    setModelSetVisibility(setOption, designType = 'regulan', neckType = 'std_a') {
        console.log(`👁️ Setting mesh visibility for set: ${setOption}, design: ${designType}, neck: ${neckType}`);

        if (!this.model) {
            console.warn('⚠️ Master GLB model not loaded yet');
            return;
        }

        // Get mesh names that should be visible (without .glb extension)
        const visibleModels = this.getVisibleModels(designType, neckType, setOption);
        const visibleMeshNames = visibleModels.map(model => model.replace('.glb', ''));

        console.log(`🎯 Meshes that should be visible:`, visibleMeshNames);

        // Find all meshes in the master GLB and set their visibility
        const allMeshes = [];
        let visibleCount = 0;
        let hiddenCount = 0;

        this.model.traverse((child) => {
            if (child.isMesh) {
                allMeshes.push(child.name || 'unnamed');

                // Check if this mesh should be visible
                const meshBaseName = this.extractMeshBaseName(child.name);
                const shouldBeVisible = visibleMeshNames.some(visibleName =>
                    meshBaseName === visibleName ||
                    child.name === visibleName ||
                    child.name === `${visibleName}.glb` ||
                    child.name.includes(visibleName)
                );

                // Set mesh visibility
                child.visible = shouldBeVisible;

                if (shouldBeVisible) {
                    visibleCount++;
                    console.log(`👁️ VISIBLE: ${child.name}`);
                } else {
                    hiddenCount++;
                    console.log(`🙈 HIDDEN: ${child.name}`);
                }
            }
        });

        console.log(`📊 Visibility Summary: ${visibleCount} visible, ${hiddenCount} hidden out of ${allMeshes.length} total meshes`);
        console.log(`📝 All meshes found:`, allMeshes);

        // Request render to update the view
        this.requestRender();
    }

    /**
     * Extract base name from mesh name (handle different naming conventions)
     */
    extractMeshBaseName(meshName) {
        if (!meshName) return '';

        // Remove common suffixes and extensions
        let baseName = meshName
            .replace(/\.glb$/, '')           // Remove .glb extension
            .replace(/\.gltf$/, '')          // Remove .gltf extension
            .replace(/_\d+$/, '')            // Remove trailing numbers like _1, _2
            .replace(/\.mesh$/, '')          // Remove .mesh suffix
            .replace(/\.geo$/, '')           // Remove .geo suffix
            .toLowerCase()                   // Normalize to lowercase
            .trim();

        console.log(`🔍 Mesh name "${meshName}" -> base name "${baseName}"`);
        return baseName;
    }

    /**
     * Set initial visibility - show only the default 5 pieces and hide all others
     */
    setInitialPieceVisibility() {
        if (!this.model) {
            console.warn('⚠️ Master GLB model not loaded yet');
            return;
        }

        // Define the 5 pieces that should be visible initially
        const initialVisiblePieces = [
            'reg_u_body',       // Upper body
            'reg_back_body',    // Back body
            'reg_std_a',        // Standard neck
            'reg_short_arms',   // Short arms
            'pants'             // Pants
        ];

        console.log('👁️ Setting initial piece visibility - showing only 5 pieces:', initialVisiblePieces);

        let visibleCount = 0;
        let hiddenCount = 0;

        // Traverse all meshes and set visibility
        this.model.traverse((child) => {
            if (child.isMesh) {
                // Check if this mesh should be visible
                const meshBaseName = this.extractMeshBaseName(child.name);
                const shouldBeVisible = initialVisiblePieces.some(visibleName =>
                    meshBaseName === visibleName ||
                    child.name === visibleName ||
                    child.name.includes(visibleName)
                );

                // Set mesh visibility
                child.visible = shouldBeVisible;

                if (shouldBeVisible) {
                    visibleCount++;
                    console.log(`👁️ VISIBLE: ${child.name} (base: ${meshBaseName})`);
                } else {
                    hiddenCount++;
                    console.log(`🙈 HIDDEN: ${child.name} (base: ${meshBaseName})`);
                }
            }
        });

        console.log(`✅ Initial visibility set: ${visibleCount} visible, ${hiddenCount} hidden`);
    }

    dispose() {
        // Cancel any pending render requests
        if (this.renderRequestId) {
            cancelAnimationFrame(this.renderRequestId);
            this.renderRequestId = null;
        }

        // Dispose hybrid system
        if (this.modelCache) {
            this.modelCache.dispose();
            this.modelCache = null;
        }

        // Dispose performance monitor
        if (this.performanceMonitor) {
            this.performanceMonitor.dispose();
            this.performanceMonitor = null;
        }

        if (this.renderer && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }

        if (this.controls) {
            this.controls.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
