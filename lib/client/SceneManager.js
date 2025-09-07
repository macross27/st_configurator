import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
        
        this.onCameraStart = null;
        this.onModelLoaded = null;
        this.onModelError = null;
        
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
        
        this.setupLighting();
        this.loadModel();
        
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
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
                                if (material.map) material.map.dispose();
                                material.dispose();
                            });
                        } else {
                            if (child.material.map) child.material.map.dispose();
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
                            side: THREE.DoubleSide
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
                
                if (this.onModelLoaded) {
                    this.onModelLoaded(this.material);
                }
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
                this.createFallbackModel();
                
                if (this.onModelError) {
                    this.onModelError(error);
                }
            }
        );
    }
    
    createFallbackModel() {
        const geometry = new THREE.PlaneGeometry(2, 2, 10, 10);
        this.material = new THREE.MeshLambertMaterial({
            map: null,
            side: THREE.DoubleSide
        });
        this.model = new THREE.Mesh(geometry, this.material);
        this.model.castShadow = true;
        this.scene.add(this.model);
        
        // Center camera on fallback model too
        this.centerCameraOnModel();
        
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
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
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