import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { errorManager, ApplicationError } from './ErrorManager.js';
import { i18n } from './I18nManager.js';
import { ModelCache } from './ModelCache.js';

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

        // Hybrid GLB System (optional, defaults to current behavior)
        this.useHybridSystem = false;
        this.modelCache = null;
        this.availableModels = [];
        this.currentModelIndex = 0;

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

    loadModel(modelPath = './assets/glbs/reg_std_a.glb') {
        // Route to hybrid system if enabled
        if (this.useHybridSystem && this.modelCache) {
            return this.createMinimalFallbackModel();
        }

        // Prevent concurrent loading operations (existing single model system)
        if (this.isLoading) {
            console.warn('Model loading already in progress, ignoring request');
            return Promise.resolve();
        }

        this.isLoading = true;
        console.log(`🎯 Creating minimal fallback model for hybrid system`);

        // Clear existing model first
        this.clearModel();

        return this.createMinimalFallbackModel();
    }

    /**
     * Create a minimal geometric fallback model instead of loading GLB
     * This prevents std_a geometry from interfering with the hybrid system
     */
    createMinimalFallbackModel() {
        console.log('🔧 Creating minimal grid fallback model');

        // Create a minimal plane geometry (1x1 unit, invisible)
        const geometry = new THREE.PlaneGeometry(0.001, 0.001); // Very small so it's effectively invisible

        // Create completely invisible material
        const cleanMaterial = new THREE.MeshLambertMaterial({
            map: null,
            vertexColors: false,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0, // Completely transparent
            alphaTest: 1.0, // Discard all pixels (since opacity is 0)
            visible: false, // Material level invisibility
            depthWrite: false, // Don't write to depth buffer
            depthTest: false // Don't test depth
        });

        // Create mesh
        const fallbackMesh = new THREE.Mesh(geometry, cleanMaterial);
        fallbackMesh.name = 'minimal_fallback';
        fallbackMesh.visible = false; // Ensure it's hidden
        fallbackMesh.castShadow = false;
        fallbackMesh.receiveShadow = false;

        // Create container group
        this.model = new THREE.Group();
        this.model.name = 'fallback_container';
        this.model.add(fallbackMesh);
        this.model.visible = false; // Hide the entire container

        // Store material reference for backward compatibility
        this.material = cleanMaterial;

        // Add to scene but keep hidden
        this.scene.add(this.model);

        console.log('🔧 Minimal fallback model created and hidden');
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
        
        // Request render when texture changes
        this.requestRender();
    }
    
    getIntersection(mouseX, mouseY) {
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
     * Set visibility for a specific set of models
     */
    setModelSetVisibility(setOption, designType = 'regulan', neckType = 'std_a') {
        console.log(`👁️ Setting visibility for set: ${setOption}, design: ${designType}, neck: ${neckType}`);

        // Get all possible model paths - complete list from assets/glbs/
        const allModels = [
            'pants.glb',
            'reg_back_body.glb', 'reg_cft_b.glb', 'reg_cft_c.glb', 'reg_cft_d.glb',
            'reg_long_arms.glb', 'reg_short_arms.glb', 'reg_std_a.glb', 'reg_std_b.glb',
            'reg_u_body.glb', 'reg_u_v_body.glb', 'reg_v_body.glb',
            'setin_back_body.glb', 'setin_cft_b.glb', 'setin_cft_c.glb', 'setin_cft_d.glb',
            'setin_long_arms.glb', 'setin_short_arms.glb', 'setin_std_a.glb', 'setin_std_b.glb',
            'setin_u_body.glb', 'setin_u_v_body.glb', 'setin_v_body.glb'
        ];

        // Use pure function to determine visibility
        const visibleModels = this.getVisibleModels(designType, neckType, setOption);

        console.log(`🎯 Models that should be visible:`, visibleModels);

        // Enhanced visibility control with individual materials
        allModels.forEach(modelPath => {
            const fullPath = `./assets/glbs/${modelPath}`;
            const model = this.modelCache.getModel(fullPath);
            if (model && model.sceneObject) {
                const shouldBeVisible = visibleModels.includes(modelPath);

                // Set object visibility
                model.sceneObject.visible = shouldBeVisible;
                model.isVisible = shouldBeVisible;

                // Ensure individual material is properly applied to all meshes
                if (this.modelCache.modelMaterials && this.modelCache.modelMaterials.has(fullPath)) {
                    const modelMaterial = this.modelCache.modelMaterials.get(fullPath);
                    if (modelMaterial) {
                        // Ensure material is applied to all meshes
                        model.sceneObject.traverse((child) => {
                            if (child.isMesh) {
                                child.material = modelMaterial;
                                child.visible = shouldBeVisible;
                            }
                        });
                    }
                }

                console.log(`${shouldBeVisible ? '👁️' : '🙈'} ${modelPath}: ${shouldBeVisible ? 'visible' : 'hidden'}`);
            } else {
                console.log(`⚠️ Model not found: ${fullPath}`);
            }
        });

        // CRITICAL FIX: Ensure minimal fallback model stays hidden
        // The fallback model is now just a minimal grid geometry, not a GLB with neck meshes
        if (this.model) {
            console.log('🔧 Ensuring minimal fallback model stays hidden');
            this.model.visible = false;

            // Hide all meshes in minimal fallback model (should only be one tiny plane)
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.visible = false;
                    console.log(`🔧 Hiding minimal fallback mesh: ${child.name || 'unnamed'}`);
                }
            });
        }

        console.log(`🎯 Pants button: visibleModels = [${visibleModels.join(', ')}]`);

        this.render();
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