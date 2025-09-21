import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { errorManager, ApplicationError } from './ErrorManager.js';
import { i18n } from './I18nManager.js';

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

    loadModel(modelPath = './assets/model.gltf') {
        // Prevent concurrent loading operations
        if (this.isLoading) {
            console.warn('Model loading already in progress, ignoring request');
            return Promise.resolve();
        }
        
        this.isLoading = true;
        console.log(`🎯 Loading model: ${modelPath}`);
        
        // Clear existing model first
        this.clearModel();
        
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        loader.load(
            modelPath,
            (gltf) => {
                this.model = gltf.scene;
                this.model.castShadow = true;
                this.model.receiveShadow = true;
                
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        // Clear any existing material and create a clean one
                        // This ignores embedded textures and vertex colors from the GLB
                        if (child.material) {
                            // Dispose of the original material to free memory
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                        
                        // Create a clean material without any embedded textures or vertex colors
                        const cleanMaterial = new THREE.MeshLambertMaterial({
                            map: null, // No texture initially - will be set by texture editor
                            vertexColors: false, // Explicitly disable vertex colors
                            side: THREE.DoubleSide,
                            transparent: true, // Enable transparency support
                            alphaTest: 0.01 // Discard pixels with alpha < 0.01
                        });
                        
                        child.material = cleanMaterial;
                        this.material = cleanMaterial; // Store reference for texture updates
                        console.log('🎨 Material reference stored:', { material: this.material, childName: child.name });
                    }
                });
                
                this.scene.add(this.model);
                
                // Calculate model center and update camera controls
                this.centerCameraOnModel();
                
                console.log('Model loaded successfully');
                this.isLoading = false;
                
                // Trigger initial render after model is loaded
                this.requestRender();
                
                if (this.onModelLoaded) {
                    this.onModelLoaded(this.material);
                }
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
                this.isLoading = false;
                this.createFallbackModel();
                
                if (this.onModelError) {
                    this.onModelError(error);
                }
            }
        );
    }
    
    createFallbackModel() {
        console.log('🚨 Creating fallback model due to loading error');
        const geometry = new THREE.PlaneGeometry(2, 2, 10, 10);
        this.material = new THREE.MeshLambertMaterial({
            color: 0xcccccc, // Light gray color so it's visible
            map: null,
            side: THREE.DoubleSide,
            transparent: true, // Enable transparency support
            alphaTest: 0.01 // Discard pixels with alpha < 0.01
        });
        this.model = new THREE.Mesh(geometry, this.material);
        this.model.castShadow = true;
        this.scene.add(this.model);
        
        // Center camera on fallback model too
        this.centerCameraOnModel();
        
        // Trigger initial render for fallback model
        this.requestRender();
        
        if (this.onModelLoaded) {
            this.onModelLoaded(this.material);
        }
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
    
    dispose() {
        // Cancel any pending render requests
        if (this.renderRequestId) {
            cancelAnimationFrame(this.renderRequestId);
            this.renderRequestId = null;
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