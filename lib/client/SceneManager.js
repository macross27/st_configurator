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
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1, 3);
        
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
    
    loadModel() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        loader.load(
            './assets/model.gltf',
            (gltf) => {
                this.model = gltf.scene;
                this.model.castShadow = true;
                this.model.receiveShadow = true;
                
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        this.material = child.material;
                    }
                });
                
                this.scene.add(this.model);
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
        
        if (this.onModelLoaded) {
            this.onModelLoaded(this.material);
        }
    }
    
    setTexture(texture) {
        if (this.material) {
            this.material.map = texture;
            this.material.needsUpdate = true;
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