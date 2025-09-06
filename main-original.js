import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Import the server API client
import './lib/serverApiClient.js';

class UniformConfigurator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.layers = [];
        this.selectedLayer = null;
        this.textureCanvas = null;
        this.textureContext = null;
        this.material = null;
        
        // Drag state
        this.isDragging = false;
        this.dragLayer = null;
        this.dragOffset = new THREE.Vector2();
        
        // Scale handles state
        // Scale slider elements
        this.scaleSliderOverlay = document.getElementById('scale-slider-overlay');
        this.scaleSlider = document.getElementById('scale-slider');
        this.scaleValue = document.getElementById('scale-value');
        
        // Asset tracking
        this.providedAssets = new Set(['texture.png']); // Track which assets are provided vs uploaded
        this.userUploadedImages = new Map(); // Store user uploaded images as base64
        
        // Memory and performance limits - loaded from server config
        this.maxFileSize = null; // Will be set from server config
        this.imageConversionThreshold = null; // Will be set from server config
        this.maxImageDimensions = { width: null, height: null }; // Will be set from server config
        this.compressionQuality = null; // Will be set from server config
        this.memoryWarningThreshold = null; // Will be set from server config
        
        // Notification durations - loaded from server config
        this.validationErrorDuration = null; // Will be set from server config
        this.defaultErrorDuration = null; // Will be set from server config
        
        // Debug
        this.showDebugDots = false;
        this.debugClicks = [];
        
        // Server API client will be initialized after loading server configuration
        this.serverApiClient = null;
        
        // Check server availability and load configuration
        this.serverAvailable = false;
        this.initializeServerConfiguration();
        
        this.init();
        this.setupEventListeners();
        this.setupScaleSlider();
        this.createDefaultTexture();
    }
    
    async loadServerConfiguration() {
        try {
            const response = await fetch(`${this.serverApiClient.serverUrl}/api/config`);
            if (response.ok) {
                const config = await response.json();
                
                // Update configuration values from server (all values from .env)
                this.maxFileSize = config.maxImageFileSize * 1024 * 1024;
                this.imageConversionThreshold = config.imageConversionThreshold * 1024 * 1024;
                this.maxImageDimensions = {
                    width: config.maxImageWidth,
                    height: config.maxImageHeight
                };
                this.compressionQuality = config.compressionQuality;
                this.memoryWarningThreshold = config.memoryWarningThreshold * 1024 * 1024;
                this.validationErrorDuration = config.validationErrorDuration;
                this.defaultErrorDuration = config.defaultErrorDuration;
                
                // Initialize ServerApiClient with configuration from server
                // Note: This is a backup file - hardcoded http://localhost for simplicity
                this.serverApiClient = new ServerApiClient({
                    serverUrl: `http://localhost:${config.serverPort}`,
                    pollInterval: config.clientPollInterval,
                    maxPollTime: config.clientMaxPollTime
                });
                
                console.log('✅ Server configuration loaded:', config);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load server configuration, using defaults:', error);
        }
    }

    async initializeServerConfiguration() {
        try {
            // Check server health directly with fetch (using default port from .env)
            // This is a backup file - using hardcoded fallback for simplicity but in production should use env vars
            const response = await fetch('http://localhost:3030/api/health');
            if (response.ok) {
                console.log('✅ Server is available');
                this.serverAvailable = true;
                
                // Load server configuration if server is available
                await this.loadServerConfiguration();
            } else {
                console.warn('⚠️ Server unavailable, falling back to client-side processing');
                this.showNotification('❌ Server unavailable - Cannot load configuration. Please check server status.', 'error', 10000);
                console.error('Cannot initialize without server configuration. All values must come from .env file via server.');
            }
        } catch (error) {
            console.error('Error checking server availability:', error);
            this.serverAvailable = false;
            this.showNotification('❌ Server check failed - Cannot load configuration. Please check server status.', 'error', 10000);
            console.error('Cannot initialize without server configuration. All values must come from .env file via server.');
        }
    }
    
    init() {
        const container = document.getElementById('three-container');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1, 3);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Add event listeners for camera movement
        this.controls.addEventListener('start', () => {
            // Hide selection when camera movement starts
            if (this.selectedLayer) {
                this.selectLayer(null);
            }
        });
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Load default model (create a simple box for now)
        this.createDefaultModel();
        
        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Render loop
        this.animate();
    }
    
    createDefaultModel() {
        // Set up DRACOLoader for compressed models
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        
        // Load GLTF model from assets
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        loader.load(
            './assets/model.gltf',
            (gltf) => {
                this.model = gltf.scene;
                this.model.castShadow = true;
                this.model.receiveShadow = true;
                
                // Find the mesh and update its material
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        this.material = child.material;
                        // Set up our dynamic texture on the loaded material
                        this.setupDynamicTexture();
                    }
                });
                
                this.scene.add(this.model);
                console.log('Model loaded successfully');
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
                // Fallback to plane if model loading fails
                this.createFallbackModel();
            }
        );
    }
    
    createFallbackModel() {
        // Fallback plane for debugging if model loading fails
        const geometry = new THREE.PlaneGeometry(2, 2, 10, 10);
        this.material = new THREE.MeshLambertMaterial({
            map: null,
            side: THREE.DoubleSide
        });
        this.model = new THREE.Mesh(geometry, this.material);
        this.model.castShadow = true;
        this.scene.add(this.model);
        this.setupDynamicTexture();
    }
    
    createDefaultTexture() {
        // Load base texture from assets
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            './assets/texture.png',
            (loadedTexture) => {
                // Create a canvas for dynamic texture generation
                this.textureCanvas = document.createElement('canvas');
                this.textureCanvas.width = loadedTexture.image.width;
                this.textureCanvas.height = loadedTexture.image.height;
                this.textureContext = this.textureCanvas.getContext('2d');
                
                // Store the base texture image for compositing
                this.baseTextureImage = loadedTexture.image;
                
                // Set up dynamic texture
                this.setupDynamicTexture();
                
                console.log('Base texture loaded successfully');
            },
            undefined,
            (error) => {
                console.error('Error loading texture:', error);
                // Fallback to procedural texture
                this.createFallbackTexture();
            }
        );
    }
    
    createFallbackTexture() {
        // Fallback procedural texture if asset loading fails
        this.textureCanvas = document.createElement('canvas');
        this.textureCanvas.width = 512;
        this.textureCanvas.height = 512;
        this.textureContext = this.textureCanvas.getContext('2d');
        this.baseTextureImage = null;
        this.setupDynamicTexture();
    }
    
    setupDynamicTexture() {
        // Create base texture
        this.updateBaseTexture();
        
        // Create Three.js texture from canvas
        const texture = new THREE.CanvasTexture(this.textureCanvas);
        texture.flipY = false; // Keep texture orientation correct
        texture.needsUpdate = true;
        
        if (this.material) {
            this.material.map = texture;
            this.material.needsUpdate = true;
        }
    }
    
    updateBaseTexture() {
        const ctx = this.textureContext;
        const canvas = this.textureCanvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.baseTextureImage) {
            // Draw the loaded base texture
            ctx.drawImage(this.baseTextureImage, 0, 0);
            
            // Apply color tinting if specified
            const primaryColor = document.getElementById('primary-color').value;
            if (primaryColor !== '#ffffff') {
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = primaryColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            // Fallback procedural pattern
            const primaryColor = document.getElementById('primary-color').value;
            const secondaryColor = document.getElementById('secondary-color').value;
            
            ctx.fillStyle = primaryColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add stripe pattern
            ctx.fillStyle = secondaryColor;
            for (let i = 0; i < canvas.width; i += 40) {
                ctx.fillRect(i, 0, 20, canvas.height);
            }
        }
        
        // Render all layers on top
        this.renderLayers();
        
        // Update texture
        if (this.material && this.material.map) {
            this.material.map.needsUpdate = true;
        }
    }
    
    renderLayers() {
        const ctx = this.textureContext;
        
        this.layers.forEach(layer => {
            ctx.save();
            
            // Apply transformations
            const centerX = this.textureCanvas.width * layer.position.x;
            const centerY = this.textureCanvas.height * layer.position.y;
            
            ctx.translate(centerX, centerY);
            ctx.rotate(layer.rotation * Math.PI / 180);
            ctx.scale(layer.scale, layer.scale);
            
            if (layer.type === 'text') {
                ctx.fillStyle = layer.color;
                ctx.font = `${layer.fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.fillText(layer.text, 0, 0);
            } else if (layer.type === 'logo' && layer.image) {
                const img = layer.image;
                ctx.globalAlpha = layer.opacity;
                ctx.drawImage(img, -img.width/2, -img.height/2);
            }
            
            // Draw selection outline and scale handles for selected layer
            if (this.selectedLayer === layer) {
                ctx.strokeStyle = '#4a90e2';
                ctx.lineWidth = 2 / layer.scale; // Scale line width inversely
                ctx.setLineDash([5 / layer.scale, 5 / layer.scale]);
                
                let bounds = { width: 0, height: 0 };
                
                if (layer.type === 'text') {
                    // Approximate text bounds (accounting for flipped text)
                    const textWidth = ctx.measureText(layer.text).width;
                    const textHeight = layer.fontSize;
                    bounds = { width: textWidth + 10, height: textHeight + 10 };
                    ctx.strokeRect(-bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
                } else if (layer.type === 'logo' && layer.image) {
                    // Image bounds
                    const img = layer.image;
                    bounds = { width: img.width + 10, height: img.height + 10 };
                    ctx.strokeRect(-bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
                }
                
                ctx.setLineDash([]); // Reset dash
            }
            
            ctx.restore();
        });
        
        // Debug dots removed
    }
    
    addTextLayer() {
        // Offset new layers to avoid overlap
        const offsetX = (this.layers.length * 0.1) % 0.8 + 0.1;
        const offsetY = (this.layers.length * 0.15) % 0.6 + 0.2;
        
        const layer = {
            id: Date.now(),
            type: 'text',
            name: `Text Layer ${this.layers.length + 1}`,
            text: `Text ${this.layers.length + 1}`,
            position: { x: offsetX, y: offsetY },
            rotation: 0,
            scale: 1,
            color: '#ffffff',
            fontSize: 24,
            opacity: 1,
            locked: false
        };
        
        this.layers.push(layer);
        console.log('Text layer created:', layer);
        console.log('Total layers:', this.layers.length);
        
        // Auto-select the newly created layer
        this.selectLayer(layer);
        
        return layer;
    }
    
    async addLogoLayer(file) {
        try {
            // Client-side file size validation - reject files >5MB immediately
            const fileSizeMB = file.size / (1024 * 1024);
            const maxFileSizeMB = this.maxFileSize / (1024 * 1024);
            const conversionThresholdMB = this.imageConversionThreshold / (1024 * 1024);
            
            if (fileSizeMB > maxFileSizeMB) {
                console.log(`❌ File ${file.name} (${fileSizeMB.toFixed(1)}MB) exceeds maximum size limit of ${maxFileSizeMB}MB`);
                this.showErrorModal(
                    'File Too Large',
                    `File "${file.name}" (${fileSizeMB.toFixed(1)}MB) exceeds the maximum size limit of ${maxFileSizeMB}MB.\n\nPlease resize your image and try again.`
                );
                return null;
            }
            
            // Log file size info for files above conversion threshold
            if (fileSizeMB >= conversionThresholdMB) {
                console.log(`📏 Processing large file: ${file.name} (${fileSizeMB.toFixed(1)}MB) - will be converted and optimized`);
            }
            
            // Show loading indicator
            this.showLoadingIndicator(`Processing ${file.name}...`);
            
            const layer = {
                id: Date.now(),
                type: 'logo',
                name: file.name,
                position: { x: 0.5, y: 0.5 },
                rotation: 0,
                scale: 1,
                opacity: 1,
                image: null,
                locked: false,
                assetId: `user_${Date.now()}_${file.name}` // Track asset ID for save/load
            };
            
            let processResult;
            
            // Try server-side processing first
            if (this.serverAvailable) {
                try {
                    console.log(`🌐 Processing ${file.name} on server...`);
                    processResult = await this.serverApiClient.processImage(file, { priority: 1 });
                    
                    console.log('✅ Server processing completed:', processResult);
                } catch (serverError) {
                    // Check if it's a file size validation error - don't fall back for these
                    const isValidationError = serverError.message.includes('File too large') ||
                                            serverError.message.includes('LIMIT_FILE_SIZE');
                    
                    if (isValidationError) {
                        // Re-throw validation errors - don't fall back to client processing
                        throw serverError;
                    }
                    
                    console.warn('❌ Server processing failed, falling back to client-side:', serverError);
                    this.serverAvailable = false; // Disable server for this session
                    this.showNotification('Server processing failed - switching to client-side', 'warning', 3000);
                }
            }
            
            // Fallback to client-side processing
            if (!processResult) {
                console.log(`💻 Processing ${file.name} on client...`);
                this.checkMemoryUsage(); // Only check memory for client-side processing
                processResult = await this.processImage(file);
                
                if (!processResult) {
                    this.hideLoadingIndicator();
                    return null;
                }
            }
            
            const { processedImageData, wasResized, originalSize, newSize, fileSizeReduced, serverProcessed } = processResult;
            
            // Store data (for server processing, this will be a URL)
            if (serverProcessed) {
                // For server processing, store the image URL
                layer.serverImageUrl = processedImageData;
            } else {
                // For client processing, store base64 data
                this.userUploadedImages.set(layer.assetId, processedImageData);
            }
            
            // Create image element and return promise that resolves when loaded
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    layer.image = img;
                    this.updateBaseTexture();
                    this.hideLoadingIndicator();
                    
                    // Show notification if image was automatically processed
                    if (wasResized || fileSizeReduced || serverProcessed) {
                        this.showImageProcessingNotification(file.name, {
                            wasResized,
                            originalSize,
                            newSize,
                            fileSizeReduced,
                            serverProcessed,
                            finalFileSizeKB: processResult.compressedFileSize ? 
                                Math.round(processResult.compressedFileSize / 1024) : 
                                Math.round((processedImageData.length || 0) / 1024),
                            processingTime: processResult.processingTime
                        });
                    }
                    
                    const sizeInfo = serverProcessed ? 
                        `server-processed: ${Math.round(processResult.compressedFileSize / 1024)}KB` :
                        `client-processed: ${Math.round(processedImageData.length / 1024)}KB`;
                        
                    console.log(`Image loaded: ${img.width}x${img.height}, ${sizeInfo}`);
                    
                    // Add layer to layers list and select it only after successful load
                    this.layers.push(layer);
                    this.selectLayer(layer);
                    
                    resolve(layer);
                };
                
                img.onerror = () => {
                    console.error('Failed to load processed image');
                    this.hideLoadingIndicator();
                    // Don't create layer if image fails to load
                    reject(new Error('Failed to load processed image'));
                };
                
                // Set appropriate image source
                if (serverProcessed) {
                    img.crossOrigin = 'anonymous'; // Enable CORS for server images
                    img.src = processedImageData; // This is a URL for server processing
                } else {
                    img.src = processedImageData; // This is base64 for client processing
                }
            });
            
        } catch (error) {
            console.error('Error processing image:', error);
            this.hideLoadingIndicator();
            
            // Show modal for validation errors, notification for others
            const isValidationError = error.message.includes('File too large') || 
                                     error.message.includes('LIMIT_FILE_SIZE');
            
            if (isValidationError) {
                const fileSizeMB = (this.maxFileSize / 1024 / 1024);
                this.showErrorModal(
                    '❌ File Too Large',
                    `The file you selected exceeds the maximum allowed size.\n\nMaximum file size: ${fileSizeMB}MB\n\nPlease:\n• Compress your image file\n• Use a smaller resolution image\n• Try a different image format`
                );
            } else {
                const duration = this.defaultErrorDuration;
                this.showNotification(`❌ ${error.message}`, 'error', duration);
            }
            
            return null;
        }
    }
    
    async processImage(file) {
        return new Promise((resolve, reject) => {
            // Check file size first - for client-side processing only
            if (file.size > this.maxFileSize && !this.serverAvailable) {
                const fileSizeMB = Math.round(file.size / 1024 / 1024 * 10) / 10;
                const maxSizeMB = this.maxFileSize / 1024 / 1024;
                reject(new Error(`File too large: ${fileSizeMB}MB. Maximum size: ${maxSizeMB}MB.`));
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                try {
                    // Create canvas for processing
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const originalSize = { width: img.width, height: img.height };
                    const originalFileSize = file.size;
                    
                    // Calculate new dimensions while maintaining aspect ratio
                    let { width, height } = this.calculateOptimalDimensions(img.width, img.height);
                    
                    const wasResized = (width !== img.width || height !== img.height);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and resize image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to compressed base64
                    const compressedData = canvas.toDataURL('image/jpeg', this.compressionQuality);
                    
                    // Check if file size was significantly reduced or file was above conversion threshold
                    const fileSizeReduced = originalFileSize > this.imageConversionThreshold || 
                                          compressedData.length < originalFileSize * 0.8;
                    
                    // Clean up
                    canvas.remove();
                    
                    resolve({
                        processedImageData: compressedData,
                        wasResized,
                        originalSize,
                        newSize: { width, height },
                        fileSizeReduced,
                        originalFileSize,
                        compressedFileSize: compressedData.length
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            
            // Load image from file
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    calculateOptimalDimensions(originalWidth, originalHeight) {
        const maxWidth = this.maxImageDimensions.width;
        const maxHeight = this.maxImageDimensions.height;
        
        // If image is already within limits, return original dimensions
        if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
            return { width: originalWidth, height: originalHeight };
        }
        
        // Calculate aspect ratio
        const aspectRatio = originalWidth / originalHeight;
        
        // Determine new dimensions based on aspect ratio
        let newWidth, newHeight;
        
        if (aspectRatio > maxWidth / maxHeight) {
            // Width is the constraining dimension
            newWidth = maxWidth;
            newHeight = maxWidth / aspectRatio;
        } else {
            // Height is the constraining dimension
            newHeight = maxHeight;
            newWidth = maxHeight * aspectRatio;
        }
        
        return { 
            width: Math.round(newWidth), 
            height: Math.round(newHeight) 
        };
    }
    
    checkMemoryUsage() {
        // Estimate current memory usage
        const estimatedUsage = this.estimateMemoryUsage();
        
        if (estimatedUsage > this.memoryWarningThreshold) {
            const usageMB = Math.round(estimatedUsage / 1024 / 1024);
            const warningMsg = `High memory usage detected (${usageMB}MB). Consider deleting unused layers to improve performance.`;
            
            console.warn(warningMsg);
            
            // Show user warning for very high usage
            if (estimatedUsage > this.memoryWarningThreshold * 1.5) {
                if (confirm(`${warningMsg}\n\nWould you like to continue anyway?`)) {
                    return true;
                } else {
                    return false;
                }
            }
        }
        return true;
    }
    
    estimateMemoryUsage() {
        let totalSize = 0;
        
        // Calculate size of stored base64 images
        for (const [assetId, base64Data] of this.userUploadedImages) {
            totalSize += base64Data.length;
        }
        
        // Add overhead for Image objects and canvas operations
        totalSize += this.layers.length * 1024 * 1024; // Rough estimate per layer
        
        // Add base texture size
        if (this.textureCanvas) {
            totalSize += this.textureCanvas.width * this.textureCanvas.height * 4; // RGBA
        }
        
        return totalSize;
    }
    
    showLoadingIndicator(message) {
        // Create or update loading indicator
        let indicator = document.getElementById('loading-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'loading-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 8px;
                z-index: 1000;
                font-family: Arial, sans-serif;
            `;
            document.body.appendChild(indicator);
        }
        indicator.textContent = message;
        indicator.style.display = 'block';
    }
    
    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    showImageProcessingNotification(filename, details) {
        const { wasResized, originalSize, newSize, fileSizeReduced, finalFileSizeKB, serverProcessed, processingTime } = details;
        
        let message = `Image "${filename}" was processed successfully${serverProcessed ? ' on server' : ' locally'}.\n`;
        
        if (processingTime) {
            message += `• Processing time: ${processingTime}ms\n`;
        }
        
        if (wasResized) {
            message += `• Resolution automatically reduced: ${originalSize.width}×${originalSize.height} → ${newSize.width}×${newSize.height}\n`;
        }
        
        if (fileSizeReduced) {
            message += `• File size optimized to ${finalFileSizeKB}KB\n`;
        }
        
        if (serverProcessed) {
            message += '• Server-side processing provides consistent performance across devices\n';
        }
        
        message += '\nThe optimized image will be used from this point forward.';
        
        // Show a non-intrusive notification
        const notificationType = serverProcessed ? 'info' : 'warning';
        this.showNotification(message, notificationType, 6000);
        
        console.log(`Image processing complete for ${filename}:`, details);
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4CAF50'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1001;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            white-space: pre-line;
            animation: slideInRight 0.3s ease;
        `;
        
        // Add animation keyframes to document if not already present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        notification.textContent = message;
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 10px;
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        closeBtn.onclick = () => this.hideNotification(notification);
        notification.appendChild(closeBtn);
        
        document.body.appendChild(notification);
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => this.hideNotification(notification), duration);
        }
        
        return notification;
    }
    
    hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    showErrorModal(title, message) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            min-width: 400px;
            text-align: center;
            animation: slideIn 0.3s ease;
        `;

        // Add animation keyframes
        if (!document.querySelector('#modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        // Title
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.cssText = `
            margin: 0 0 20px 0;
            color: #d32f2f;
            font-size: 20px;
            font-weight: bold;
        `;

        // Message
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.cssText = `
            margin: 0 0 30px 0;
            color: #333;
            font-size: 16px;
            line-height: 1.5;
            white-space: pre-line;
        `;

        // OK button
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: #d32f2f;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s;
        `;

        okButton.onmouseover = () => okButton.style.background = '#b71c1c';
        okButton.onmouseout = () => okButton.style.background = '#d32f2f';
        okButton.onclick = () => {
            document.body.removeChild(overlay);
        };

        // Assemble modal
        modal.appendChild(titleElement);
        modal.appendChild(messageElement);
        modal.appendChild(okButton);
        overlay.appendChild(modal);

        // Add to page
        document.body.appendChild(overlay);

        // Focus the OK button
        okButton.focus();

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        return overlay;
    }
    
    updateLayersList() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
        
        this.layers.forEach((layer, index) => {
            const layerElement = this.createLayerElement(layer, index);
            layersList.appendChild(layerElement);
        });
    }
    
    createLayerElement(layer, index) {
        const div = document.createElement('div');
        div.className = 'layer-item';
        div.dataset.layerId = layer.id;
        
        if (this.selectedLayer === layer) {
            div.classList.add('selected');
        }
        
        if (layer.locked) {
            div.classList.add('locked');
        }
        
        div.innerHTML = `
            <div class="layer-header">
                <span class="layer-name">${layer.name}</span>
                <div class="layer-controls">
                    <button class="layer-control-btn lock" title="${layer.locked ? 'Unlock layer' : 'Lock layer'}">${layer.locked ? '🔒' : '🔓'}</button>
                    <button class="layer-control-btn duplicate">Dup</button>
                    <button class="layer-control-btn delete">Del</button>
                </div>
            </div>
            <div class="layer-properties">
                <div class="layer-property">
                    <span>X:</span>
                    <input type="number" value="${layer.position.x.toFixed(2)}" step="0.01" data-prop="x">
                </div>
                <div class="layer-property">
                    <span>Y:</span>
                    <input type="number" value="${layer.position.y.toFixed(2)}" step="0.01" data-prop="y">
                </div>
                <div class="layer-property">
                    <span>Rotation:</span>
                    <input type="number" value="${layer.rotation}" step="1" data-prop="rotation">
                </div>
                <div class="layer-property">
                    <span>Scale:</span>
                    <input type="number" value="${layer.scale.toFixed(2)}" step="0.1" data-prop="scale">
                </div>
                ${layer.type === 'text' ? `
                    <div class="layer-property">
                        <span>Text:</span>
                        <input type="text" value="${layer.text}" data-prop="text">
                    </div>
                    <div class="layer-property">
                        <span>Size:</span>
                        <input type="number" value="${layer.fontSize}" data-prop="fontSize">
                    </div>
                    <div class="layer-property">
                        <span>Color:</span>
                        <input type="color" value="${layer.color}" data-prop="color">
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add event listeners
        div.addEventListener('click', () => {
            this.selectLayer(layer);
        });
        
        // Property change listeners
        div.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                // Prevent editing if layer is locked
                if (layer.locked) {
                    e.preventDefault();
                    return;
                }
                
                const prop = e.target.dataset.prop;
                let value = e.target.value;
                
                if (prop === 'x' || prop === 'y') {
                    layer.position[prop] = parseFloat(value);
                } else if (prop === 'rotation' || prop === 'scale' || prop === 'fontSize') {
                    layer[prop] = parseFloat(value);
                } else {
                    layer[prop] = value;
                }
                
                this.updateBaseTexture();
            });
            
            // Disable input if layer is locked
            if (layer.locked) {
                input.disabled = true;
            }
        });
        
        // Control buttons
        div.querySelector('.lock').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerLock(layer);
        });
        
        div.querySelector('.duplicate').addEventListener('click', (e) => {
            e.stopPropagation();
            this.duplicateLayer(layer);
        });
        
        div.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteLayer(layer);
        });
        
        return div;
    }
    
    selectLayer(layer) {
        this.selectedLayer = layer;
        this.updateLayersList();
        this.updateBaseTexture(); // Always update texture when selection changes
        this.updateScaleSlider(); // Update scale slider visibility and value
    }
    
    duplicateLayer(layer) {
        const newLayer = { ...layer, id: Date.now(), name: layer.name + ' Copy' };
        this.layers.push(newLayer);
        this.updateLayersList();
        this.updateBaseTexture();
    }
    
    toggleLayerLock(layer) {
        layer.locked = !layer.locked;
        
        if (layer.locked && this.selectedLayer === layer) {
            // Deselect when locking a layer
            this.selectLayer(null);
        } else {
            // Just update UI when unlocking
            this.updateLayersList();
            this.updateBaseTexture();
            this.updateScaleSlider();
        }
    }
    
    deleteLayer(layer) {
        const index = this.layers.indexOf(layer);
        if (index > -1) {
            // Clean up memory for logo layers
            if (layer.type === 'logo' && layer.assetId) {
                // Remove from uploaded images map
                if (this.userUploadedImages.has(layer.assetId)) {
                    console.log(`Cleaning up memory for asset: ${layer.assetId}`);
                    this.userUploadedImages.delete(layer.assetId);
                }
                
                // Clear image reference to help garbage collection
                if (layer.image) {
                    layer.image.src = '';
                    layer.image = null;
                }
            }
            
            this.layers.splice(index, 1);
            
            // Force garbage collection hint (if available)
            if (window.gc && typeof window.gc === 'function') {
                setTimeout(() => window.gc(), 100);
            }
            
            if (this.selectedLayer === layer) {
                this.selectLayer(null);
            } else {
                this.updateLayersList();
                this.updateBaseTexture();
            }
        }
    }
    
    setupEventListeners() {
        // Color controls
        document.getElementById('primary-color').addEventListener('input', () => {
            this.updateBaseTexture();
        });
        
        document.getElementById('secondary-color').addEventListener('input', () => {
            this.updateBaseTexture();
        });
        
        // Add layer buttons
        document.getElementById('add-text-btn').addEventListener('click', () => {
            console.log('Add Text button clicked!');
            this.addTextLayer();
        });
        
        document.getElementById('add-logo-btn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true; // Allow multiple file selection
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 1) {
                    // Single file, process normally
                    this.addLogoLayer(files[0]);
                } else if (files.length > 1) {
                    // Multiple files, use progressive loading
                    this.processMultipleImages(files);
                }
            };
            input.click();
        });
        
        // Debug button
        document.getElementById('debug-btn').addEventListener('click', () => {
            this.showDebugDots = !this.showDebugDots;
            this.updateBaseTexture();
        });
        
        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportConfiguration();
        });
        
        // Import/Load button
        document.getElementById('import-btn').addEventListener('click', () => {
            this.showLoadDialog();
        });
        
        // Drag and drop for loading configurations
        this.setupDragAndDrop();
        
        // 3D interaction
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            this.onMouseDown(event);
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.onMouseMove(event);
        });
        
        // Add hover detection for cursor changes (throttled)
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (!this.isDragging) {
                // Throttle cursor updates to reduce raycast spam
                clearTimeout(this.cursorUpdateTimeout);
                this.cursorUpdateTimeout = setTimeout(() => {
                    this.updateCursor(event);
                }, 50); // Update cursor every 50ms max
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', (event) => {
            this.onMouseUp(event);
        });
        
        // Prevent context menu on right click
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    setupScaleSlider() {
        // Scale slider event listener
        this.scaleSlider.addEventListener('input', (e) => {
            if (this.selectedLayer) {
                const newScale = parseFloat(e.target.value);
                this.selectedLayer.scale = newScale;
                this.scaleValue.textContent = newScale.toFixed(1);
                this.updateBaseTexture();
                this.updateLayersList();
            }
        });
        
        // Initially hide the slider
        this.scaleSliderOverlay.style.display = 'none';
    }
    
    updateScaleSlider() {
        if (this.selectedLayer) {
            // Show slider and set current value
            this.scaleSliderOverlay.style.display = 'block';
            this.scaleSlider.value = this.selectedLayer.scale;
            this.scaleValue.textContent = this.selectedLayer.scale.toFixed(1);
            
            // Disable slider if layer is locked
            this.scaleSlider.disabled = this.selectedLayer.locked;
        } else {
            // Hide slider
            this.scaleSliderOverlay.style.display = 'none';
        }
    }
    
    onMouseDown(event) {
        if (event.button !== 0) return; // Only handle left mouse button
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.model) {
            const intersects = this.raycaster.intersectObject(this.model);
            
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const uv = intersection.uv;
                
                // Remove debug functionality - no more dots
                
                // Check if we clicked on a layer
                const clickedLayer = this.getLayerAtUV(uv.x, uv.y);
                
                if (clickedLayer) {
                    this.selectLayer(clickedLayer);
                    
                    // Start dragging
                    this.isDragging = true;
                    this.dragLayer = clickedLayer;
                    
                    // Store offset from layer center to click point
                    this.dragOffset.set(
                        uv.x - clickedLayer.position.x,
                        uv.y - clickedLayer.position.y
                    );
                    
                    // Disable orbit controls during drag
                    this.controls.enabled = false;
                    
                    // Change cursor to grabbing
                    this.renderer.domElement.style.cursor = 'grabbing';
                    
                    console.log('Started dragging layer:', clickedLayer.name);
                } else {
                    // Clicked on empty space, deselect
                    this.selectLayer(null);
                    this.updateBaseTexture(); // Update to hide selection outline and handles
                }
            }
        }
    }
    
    onMouseMove(event) {
        if (!this.isDragging) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.model) {
            const intersects = this.raycaster.intersectObject(this.model);
            
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const uv = intersection.uv;
                
                if (this.isDragging && this.dragLayer) {
                    // Handle dragging
                    this.dragLayer.position.x = Math.max(0, Math.min(1, uv.x - this.dragOffset.x));
                    this.dragLayer.position.y = Math.max(0, Math.min(1, uv.y - this.dragOffset.y));
                    
                    // Update texture and UI
                    this.updateBaseTexture();
                    this.updateLayersList();
                }
            }
        }
    }
    
    onMouseUp(event) {
        if (this.isDragging) {
            console.log('Stopped dragging layer:', this.dragLayer?.name);
            this.isDragging = false;
            this.dragLayer = null;
            this.dragOffset.set(0, 0);
            
            // Re-enable orbit controls
            this.controls.enabled = true;
            
            // Reset cursor
            this.renderer.domElement.style.cursor = 'default';
        }
    }
    
    getLayerAtUV(u, v) {
        // Find the topmost unlocked layer at this UV coordinate
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            
            // Skip locked layers
            if (layer.locked) {
                continue;
            }
            
            // Calculate actual layer bounds based on content and scale
            let bounds = this.getLayerBounds(layer);
            
            // Check if click is within the layer's actual bounds
            const halfWidth = bounds.width * 0.5;
            const halfHeight = bounds.height * 0.5;
            
            const deltaX = Math.abs(layer.position.x - u);
            const deltaY = Math.abs(layer.position.y - v);
            
            if (deltaX <= halfWidth && deltaY <= halfHeight) {
                return layer;
            }
        }
        
        return null;
    }
    
    getLayerBounds(layer) {
        if (layer.type === 'text') {
            // Estimate text dimensions in UV space
            // Font size to UV space ratio (approximate)
            const fontSizeInUV = layer.fontSize / this.textureCanvas.height;
            const estimatedWidth = layer.text.length * fontSizeInUV * 0.6; // Rough character width estimate
            const estimatedHeight = fontSizeInUV;
            
            return {
                width: Math.max(0.02, estimatedWidth * layer.scale), // Minimum clickable size
                height: Math.max(0.02, estimatedHeight * layer.scale)
            };
            
        } else if (layer.type === 'logo' && layer.image) {
            // Calculate image dimensions in UV space
            const imageWidthInUV = layer.image.width / this.textureCanvas.width;
            const imageHeightInUV = layer.image.height / this.textureCanvas.height;
            
            return {
                width: Math.max(0.02, imageWidthInUV * layer.scale), // Minimum clickable size
                height: Math.max(0.02, imageHeightInUV * layer.scale)
            };
        }
        
        // Fallback for unknown types or incomplete layers
        return {
            width: 0.05 * layer.scale,
            height: 0.05 * layer.scale
        };
    }
    
    
    updateCursor(event) {
        if (this.isDragging) return; // Don't change cursor during interactions
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera({ x: mouseX, y: mouseY }, this.camera);
        
        if (this.model) {
            const intersects = this.raycaster.intersectObject(this.model);
            
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const uv = intersection.uv;
                const layer = this.getLayerAtUV(uv.x, uv.y);
                
                if (layer) {
                    this.renderer.domElement.style.cursor = 'grab';
                } else {
                    this.renderer.domElement.style.cursor = 'default';
                }
            } else {
                this.renderer.domElement.style.cursor = 'default';
            }
        }
    }
    
    async exportConfiguration() {
        const config = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            baseTexture: {
                type: 'provided', // For now, always provided until we add base texture upload
                assetId: 'texture.png',
                colors: {
                    primary: document.getElementById('primary-color').value,
                    secondary: document.getElementById('secondary-color').value
                }
            },
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                target: {
                    x: this.controls.target.x,
                    y: this.controls.target.y,
                    z: this.controls.target.z
                }
            },
            layers: this.layers.map(layer => ({
                id: layer.id,
                type: layer.type,
                name: layer.name,
                position: layer.position,
                rotation: layer.rotation,
                scale: layer.scale,
                locked: layer.locked,
                ...(layer.type === 'text' ? {
                    text: layer.text,
                    fontSize: layer.fontSize,
                    color: layer.color
                } : {}),
                ...(layer.type === 'logo' ? {
                    opacity: layer.opacity,
                    asset: {
                        type: this.providedAssets.has(layer.assetId) ? 'provided' : 'uploaded',
                        assetId: layer.assetId,
                        ...(this.userUploadedImages.has(layer.assetId) ? {
                            data: this.userUploadedImages.get(layer.assetId)
                        } : {})
                    }
                } : {})
            }))
        };
        
        console.log('Export Configuration:', config);
        
        // Download as .uniformconfig file
        const dataStr = JSON.stringify(config, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `uniform-config-${Date.now()}.uniformconfig`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    showLoadDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.uniformconfig,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadConfiguration(file);
            }
        };
        input.click();
    }

    async loadConfiguration(file) {
        try {
            const text = await file.text();
            const config = JSON.parse(text);
            
            console.log('Loading configuration:', config);
            await this.applyConfiguration(config);
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            alert('Error loading configuration file. Please check the file format.');
        }
    }

    async applyConfiguration(config) {
        // Clear existing layers
        this.layers = [];
        this.selectedLayer = null;
        this.userUploadedImages.clear();
        
        // Apply base colors
        if (config.baseColors) {
            // Legacy format support
            document.getElementById('primary-color').value = config.baseColors.primary || '#ffffff';
            document.getElementById('secondary-color').value = config.baseColors.secondary || '#000000';
        } else if (config.baseTexture?.colors) {
            // New format
            document.getElementById('primary-color').value = config.baseTexture.colors.primary || '#ffffff';
            document.getElementById('secondary-color').value = config.baseTexture.colors.secondary || '#000000';
        }
        
        // Apply camera position if available
        if (config.camera) {
            this.camera.position.set(
                config.camera.position.x,
                config.camera.position.y,
                config.camera.position.z
            );
            
            if (config.camera.target) {
                this.controls.target.set(
                    config.camera.target.x,
                    config.camera.target.y,
                    config.camera.target.z
                );
            }
            
            this.controls.update();
        }
        
        // Load layers
        if (config.layers) {
            for (const layerConfig of config.layers) {
                await this.createLayerFromConfig(layerConfig);
            }
        }
        
        // Update everything
        this.updateLayersList();
        this.updateBaseTexture();
        this.updateScaleSlider();
        
        console.log('Configuration loaded successfully');
    }

    async createLayerFromConfig(layerConfig) {
        if (layerConfig.type === 'text') {
            const layer = {
                id: layerConfig.id || Date.now(),
                type: 'text',
                name: layerConfig.name || 'Text Layer',
                text: layerConfig.text || 'Text',
                position: layerConfig.position || { x: 0.5, y: 0.5 },
                rotation: layerConfig.rotation || 0,
                scale: layerConfig.scale || 1,
                color: layerConfig.color || '#ffffff',
                fontSize: layerConfig.fontSize || 24,
                opacity: layerConfig.opacity || 1,
                locked: layerConfig.locked || false
            };
            
            this.layers.push(layer);
            
        } else if (layerConfig.type === 'logo') {
            const layer = {
                id: layerConfig.id || Date.now(),
                type: 'logo',
                name: layerConfig.name || 'Logo Layer',
                position: layerConfig.position || { x: 0.5, y: 0.5 },
                rotation: layerConfig.rotation || 0,
                scale: layerConfig.scale || 1,
                opacity: layerConfig.opacity || 1,
                image: null,
                locked: layerConfig.locked || false,
                assetId: layerConfig.asset?.assetId || `loaded_${Date.now()}`
            };
            
            // Handle asset loading
            if (layerConfig.asset) {
                const asset = layerConfig.asset;
                
                if (asset.type === 'uploaded' && asset.data) {
                    // Load from embedded base64 data
                    this.userUploadedImages.set(layer.assetId, asset.data);
                    
                    const img = new Image();
                    img.onload = () => {
                        layer.image = img;
                        this.updateBaseTexture();
                    };
                    img.src = asset.data;
                    
                } else if (asset.type === 'provided') {
                    // Load from assets folder
                    this.providedAssets.add(asset.assetId);
                    
                    const img = new Image();
                    img.onload = () => {
                        layer.image = img;
                        this.updateBaseTexture();
                    };
                    img.onerror = () => {
                        console.warn(`Could not load provided asset: ${asset.assetId}`);
                    };
                    img.src = `./assets/${asset.assetId}`;
                }
            }
            
            this.layers.push(layer);
        }
    }

    setupDragAndDrop() {
        const container = document.getElementById('three-container');
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Highlight drop zone
        ['dragenter', 'dragover'].forEach(eventName => {
            container.addEventListener(eventName, () => {
                container.classList.add('drag-highlight');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, () => {
                container.classList.remove('drag-highlight');
            });
        });
        
        // Handle dropped files
        container.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            
            // Look for .uniformconfig files
            const configFile = files.find(file => 
                file.name.endsWith('.uniformconfig') || 
                file.name.endsWith('.json')
            );
            
            if (configFile) {
                this.loadConfiguration(configFile);
            } else if (files.length > 0) {
                // If no config file, treat as image uploads
                const imageFiles = files.filter(file => file.type.startsWith('image/'));
                if (imageFiles.length > 0) {
                    this.processMultipleImages(imageFiles);
                }
            }
        });
    }
    
    async processMultipleImages(files) {
        if (files.length === 0) return;
        
        const totalFiles = files.length;
        let processedCount = 0;
        let failedCount = 0;
        
        console.log(`Starting batch processing of ${totalFiles} images...`);
        this.showLoadingIndicator(`Processing batch: 0/${totalFiles}`);
        
        try {
            // Try server-side batch processing first
            if (this.serverAvailable) {
                console.log('🌐 Using server-side batch processing...');
                
                try {
                    const batchResult = await this.serverApiClient.processImageBatch(files, (progress) => {
                        this.showLoadingIndicator(`Processing batch: ${progress.completed}/${progress.total} (${progress.currentFile})`);
                        
                        if (progress.result) {
                            // Create layer for completed image
                            this.createLayerFromServerResult(progress.result, progress.currentFile);
                            processedCount++;
                        } else if (progress.error) {
                            console.error(`Batch item failed: ${progress.currentFile}`, progress.error);
                            failedCount++;
                        }
                    });
                    
                    console.log('✅ Server batch processing completed:', batchResult);
                    
                } catch (serverError) {
                    console.warn('❌ Server batch processing failed, falling back to individual processing:', serverError);
                    this.serverAvailable = false;
                    this.showNotification('Server batch failed - processing individually', 'warning', 3000);
                    
                    // Fall back to individual processing
                    await this.processMultipleImagesIndividually(files);
                    return;
                }
                
            } else {
                // Client-side batch processing (one by one)
                await this.processMultipleImagesIndividually(files);
                return;
            }
            
        } catch (error) {
            console.error('Batch processing error:', error);
            
            // Show modal for validation errors, notification for others
            const isValidationError = error.message.includes('File too large') || 
                                     error.message.includes('LIMIT_FILE_SIZE');
            
            if (isValidationError) {
                const fileSizeMB = (this.maxFileSize / 1024 / 1024);
                this.showErrorModal(
                    '❌ Batch Processing Error',
                    `One or more files exceed the maximum allowed size.\n\nMaximum file size: ${fileSizeMB}MB\n\nPlease:\n• Compress your image files\n• Remove oversized images from selection\n• Process files individually`
                );
            } else {
                const duration = this.defaultErrorDuration;
                this.showNotification(`❌ Batch processing error: ${error.message}`, 'error', duration);
            }
        }
        
        this.hideLoadingIndicator();
        
        // Show completion message
        let message = `Batch completed: ${processedCount} processed, ${failedCount} failed`;
        const notificationType = failedCount > 0 ? 'warning' : 'info';
        this.showNotification(message, notificationType, this.defaultErrorDuration);
        
        console.log(`Batch processing complete: ${processedCount}/${totalFiles} successful`);
    }
    
    async processMultipleImagesIndividually(files) {
        const totalFiles = files.length;
        let processedCount = 0;
        let failedCount = 0;
        
        // Check memory usage for client-side processing
        if (!this.serverAvailable) {
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            if (totalSize > this.maxFileSize * files.length) {
                const oversized = files.filter(file => file.size > this.maxFileSize);
                this.showNotification(`${oversized.length} file(s) exceed size limit and will be skipped`, 'warning', this.defaultErrorDuration);
            }
        }
        
        // Process files individually
        for (const file of files) {
            try {
                // Skip oversized files for client-side processing
                if (!this.serverAvailable && file.size > this.maxFileSize) {
                    console.warn(`Skipping oversized file: ${file.name}`);
                    failedCount++;
                    continue;
                }
                
                // Check memory before each file (client-side only)
                if (!this.serverAvailable && !this.checkMemoryUsage()) {
                    console.warn('Memory usage too high, stopping batch processing');
                    break;
                }
                
                // Update progress
                this.showLoadingIndicator(`Processing: ${processedCount + 1}/${totalFiles} (${file.name})`);
                
                // Add small delay to prevent UI blocking
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Process the image
                const layer = await this.addLogoLayer(file);
                if (layer) {
                    processedCount++;
                } else {
                    failedCount++;
                }
                
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                failedCount++;
            }
        }
        
        // Final memory check and cleanup suggestion (client-side only)
        if (!this.serverAvailable) {
            const finalUsage = this.estimateMemoryUsage();
            if (finalUsage > this.memoryWarningThreshold) {
                const usageMB = Math.round(finalUsage / 1024 / 1024);
                console.warn(`High memory usage after batch processing: ${usageMB}MB`);
                this.showNotification(`High memory usage: ${usageMB}MB. Consider deleting unused layers.`, 'warning', this.validationErrorDuration);
            }
        }
        
        return { processedCount, failedCount };
    }
    
    createLayerFromServerResult(serverResult, filename) {
        const layer = {
            id: Date.now() + Math.random(),
            type: 'logo',
            name: filename,
            position: { x: 0.5, y: 0.5 },
            rotation: 0,
            scale: 1,
            opacity: 1,
            image: null,
            locked: false,
            assetId: `server_${Date.now()}_${filename}`,
            serverImageUrl: serverResult.processedImageData
        };
        
        // Load the server image
        const img = new Image();
        img.onload = () => {
            layer.image = img;
            this.updateBaseTexture();
        };
        img.onerror = () => {
            console.error('Failed to load server-processed image');
        };
        img.crossOrigin = 'anonymous';
        img.src = serverResult.processedImageData;
        
        this.layers.push(layer);
        return layer;
    }

    onWindowResize() {
        const container = document.getElementById('three-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application
new UniformConfigurator();