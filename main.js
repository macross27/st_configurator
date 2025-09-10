import * as THREE from 'three';
import { SceneManager } from './lib/client/SceneManager.js';
import { LayerManager } from './lib/client/LayerManager.js';
import { InteractionManager } from './lib/client/InteractionManager.js';
import { UIManager } from './lib/client/UIManager.js';
import { ConfigurationManager } from './lib/client/ConfigurationManager.js';
import { ImageProcessor } from './lib/client/ImageProcessor.js';
import { SessionManager } from './lib/client/SessionManager.js';
import { OrderFormManager } from './lib/client/OrderFormManager.js';
import UIStyleManager from './lib/client/UIStyleManager.js';
import './lib/serverApiClient.js';

class UniformConfigurator {
    constructor() {
        this.serverAvailable = false;
        this.serverApiClient = null;
        this.imageProcessor = null;
        this.sessionManager = null;
        this.config = {};
        
        this.initializeApp();
    }
    
    async initializeApp() {
        try {
            await this.loadServerConfiguration();
            this.setupManagers();
            this.setupEventHandlers();
            await this.loadDefaultTexture();
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }
    
    async loadServerConfiguration() {
        try {
            // Use environment variables from Vite
            const serverHost = import.meta.env.VITE_SERVER_HOST || import.meta.env.VITE_DEFAULT_SERVER_HOST;
            const serverPort = import.meta.env.VITE_SERVER_PORT || import.meta.env.VITE_DEFAULT_SERVER_PORT;
            const serverProtocol = import.meta.env.VITE_SERVER_PROTOCOL || import.meta.env.VITE_DEFAULT_SERVER_PROTOCOL;
            
            if (!serverHost || !serverPort || !serverProtocol) {
                throw new Error('❌ Server configuration missing from .env file. Required: VITE_SERVER_HOST, VITE_SERVER_PORT, VITE_SERVER_PROTOCOL');
            }
            
            const serverUrl = `${serverProtocol}://${serverHost}:${serverPort}`;
            const response = await fetch(`${serverUrl}/api/health`);
            if (response.ok) {
                console.log('✅ Server is available');
                this.serverAvailable = true;
                
                const configResponse = await fetch(`${serverUrl}/api/config`);
                if (configResponse.ok) {
                    this.config = await configResponse.json();
                    
                    const serverProtocol = import.meta.env.VITE_SERVER_PROTOCOL || import.meta.env.VITE_DEFAULT_SERVER_PROTOCOL || 'http';
                    const serverHost = import.meta.env.VITE_SERVER_HOST || import.meta.env.VITE_DEFAULT_SERVER_HOST || 'localhost';
                    this.serverApiClient = new ServerApiClient({
                        serverUrl: `${serverProtocol}://${serverHost}:${this.config.serverPort}`,
                        pollInterval: this.config.clientPollInterval,
                        maxPollTime: this.config.clientMaxPollTime
                    });
                    
                    this.imageProcessor = new ImageProcessor({
                        maxFileSize: this.config.maxImageFileSize * 1024 * 1024,
                        imageConversionThreshold: this.config.imageConversionThreshold * 1024 * 1024,
                        maxImageDimensions: {
                            width: this.config.maxImageWidth,
                            height: this.config.maxImageHeight
                        },
                        compressionQuality: this.config.compressionQuality,
                        memoryWarningThreshold: this.config.memoryWarningThreshold * 1024 * 1024,
                        validationErrorDuration: this.config.validationErrorDuration,
                        defaultErrorDuration: this.config.defaultErrorDuration
                    });
                    
                    console.log('✅ Server configuration loaded:', this.config);
                }
            }
        } catch (error) {
            console.warn('⚠️ Server unavailable, using defaults:', error);
            this.setupFallbackConfiguration();
        }
    }
    
    setupFallbackConfiguration() {
        const serverPort = import.meta.env.VITE_SERVER_PORT || import.meta.env.VITE_DEFAULT_SERVER_PORT;
        
        if (!serverPort) {
            throw new Error('❌ Server port configuration missing from .env file. Required: VITE_SERVER_PORT or VITE_DEFAULT_SERVER_PORT');
        }
        this.config = {
            maxImageFileSize: 5,
            imageConversionThreshold: 2,
            maxImageWidth: 1024,
            maxImageHeight: 1024,
            compressionQuality: 0.8,
            memoryWarningThreshold: 50,
            validationErrorDuration: 8000,
            defaultErrorDuration: 5000,
            clientPollInterval: 1000,
            clientMaxPollTime: 120000,
            serverPort: parseInt(serverPort)
        };
        
        this.imageProcessor = new ImageProcessor({
            maxFileSize: this.config.maxImageFileSize * 1024 * 1024,
            imageConversionThreshold: this.config.imageConversionThreshold * 1024 * 1024,
            maxImageDimensions: {
                width: this.config.maxImageWidth,
                height: this.config.maxImageHeight
            },
            compressionQuality: this.config.compressionQuality,
            memoryWarningThreshold: this.config.memoryWarningThreshold * 1024 * 1024,
            validationErrorDuration: this.config.validationErrorDuration,
            defaultErrorDuration: this.config.defaultErrorDuration
        });
    }
    
    setupManagers() {
        const container = document.getElementById('three-container');
        
        this.sceneManager = new SceneManager(container);
        this.layerManager = new LayerManager();
        this.uiManager = new UIManager();
        this.configurationManager = new ConfigurationManager(this.sceneManager, this.layerManager);
        this.interactionManager = new InteractionManager(this.sceneManager, this.layerManager);
        
        // Initialize UI Style Manager and apply unified styling
        this.uiStyleManager = new UIStyleManager();
        this.uiStyleManager.unifyButtons();
        
        // Initialize Session Manager (but don't auto-create sessions)
        if (this.serverAvailable) {
            const serverHost = import.meta.env.VITE_SERVER_HOST || import.meta.env.VITE_DEFAULT_SERVER_HOST || 'localhost';
            const serverPort = import.meta.env.VITE_SERVER_PORT || import.meta.env.VITE_DEFAULT_SERVER_PORT || '3030';
            const serverProtocol = import.meta.env.VITE_SERVER_PROTOCOL || import.meta.env.VITE_DEFAULT_SERVER_PROTOCOL || 'http';
            
            const serverUrl = `${serverProtocol}://${serverHost}:${serverPort}`;
            
            this.sessionManager = new SessionManager({
                serverUrl: serverUrl,
                onSessionCreated: (sessionData) => this.handleSessionCreated(sessionData),
                onSessionLoaded: (sessionData) => this.handleSessionLoaded(sessionData),
                onSessionSaved: (sessionData) => this.handleSessionSaved(sessionData),
                onSessionError: (error) => this.handleSessionError(error)
            });
            
            // Initialize Order Form Manager with all dependencies
            this.orderFormManager = new OrderFormManager({
                sessionManager: this.sessionManager,
                serverApiClient: this.serverApiClient,
                showNotification: (message, duration) => this.uiManager.showNotification(message, 'info', duration)
            });
        } else {
            // Initialize Order Form Manager without server dependencies
            this.orderFormManager = new OrderFormManager();
        }
    }
    
    setupEventHandlers() {
        // Scene Manager Events
        this.sceneManager.onModelLoaded = (material) => {
            // Use base texture image dimensions if available, otherwise fallback to 512x512
            const width = this.baseTextureImage ? this.baseTextureImage.width : 512;
            const height = this.baseTextureImage ? this.baseTextureImage.height : 512;
            
            const texture = this.layerManager.initializeTexture(width, height, this.baseTextureImage);
            this.sceneManager.setTexture(texture);
            
            // Apply current UI color values to the texture
            const primaryColor = document.getElementById('primary-color').value;
            const secondaryColor = document.getElementById('secondary-color').value;
            this.layerManager.updateBaseTexture(primaryColor, secondaryColor);
        };
        
        this.sceneManager.onCameraStart = () => {
            this.layerManager.selectLayer(null);
            this.updateUI();
        };
        
        // Layer Manager Events
        this.layerManager.onLayerAdded = (layer) => {
            console.log('🎨 Layer added:', layer);
            this.layerManager.selectLayer(layer.id);
            this.updateUI();
        };
        
        this.layerManager.onLayerSelected = (layer) => {
            console.log('🎯 Layer selected:', layer);
            this.updateUI();
        };
        
        this.layerManager.onTextureUpdated = (texture) => {
            console.log('🎨 onTextureUpdated called, applying to 3D model');
            this.sceneManager.setTexture(texture);
            console.log('🎨 Texture applied to scene');
        };
        
        // UI Manager Events
        this.uiManager.onColorChange = (colors) => {
            this.layerManager.updateBaseTexture(colors.primary, colors.secondary);
        };
        
        this.uiManager.onAddText = () => {
            this.layerManager.addTextLayer();
            this.updateUI();
        };
        
        this.uiManager.onAddLogo = (files) => {
            if (files.length === 1) {
                this.processSingleImage(files[0]);
            } else if (files.length > 1) {
                this.processMultipleImages(files);
            }
        };
        
        
        this.uiManager.onSubmit = async () => {
            await this.handleSubmit();
        };
        
        this.uiManager.onScaleChange = (scale) => {
            const selectedLayer = this.layerManager.getSelectedLayer();
            if (selectedLayer) {
                this.layerManager.updateLayer(selectedLayer.id, { scale });
            }
        };
        
        this.uiManager.onRotateChange = (rotation) => {
            const selectedLayer = this.layerManager.getSelectedLayer();
            if (selectedLayer) {
                this.layerManager.updateLayer(selectedLayer.id, { rotation });
            }
        };
        
        this.uiManager.onFlipChange = (flippedHorizontally) => {
            const selectedLayer = this.layerManager.getSelectedLayer();
            if (selectedLayer) {
                this.layerManager.updateLayer(selectedLayer.id, { flippedHorizontally });
            }
        };
        
        this.uiManager.onFovChange = (fov) => {
            this.sceneManager.setFov(fov);
        };
        
        this.uiManager.onResetView = () => {
            const defaultState = this.sceneManager.resetToDefaultState();
            if (defaultState) {
                // Update FOV slider to match reset state
                this.uiManager.updateFovSlider(defaultState.fov);
            }
        };
        
        this.uiManager.onLayerColorChange = (color) => {
            const selectedLayer = this.layerManager.getSelectedLayer();
            if (selectedLayer) {
                this.layerManager.updateLayer(selectedLayer.id, { color });
                this.updateUI();
            }
        };
        
        this.uiManager.onLayerPropertyChange = (layer, prop, value) => {
            console.log('🔧 onLayerPropertyChange called:', { layer: layer.name, prop, value });
            const updateData = {};
            
            if (prop === 'x' || prop === 'y') {
                updateData.position = {...layer.position, [prop]: parseFloat(value)};
            } else if (prop === 'rotation' || prop === 'scale' || prop === 'fontSize') {
                updateData[prop] = parseFloat(value);
            } else {
                updateData[prop] = value;
            }
            
            console.log('🔧 Updated layer property, calling layerManager.updateLayer');
            this.layerManager.updateLayer(layer.id, updateData);
            console.log('🔧 Layer update completed');
        };
        
        this.uiManager.onLayerControl = (action, layer) => {
            switch (action) {
                case 'select':
                    this.layerManager.selectLayer(layer.id);
                    break;
                case 'lock':
                    this.layerManager.toggleLayerLock(layer.id);
                    break;
                case 'duplicate':
                    this.layerManager.duplicateLayer(layer);
                    break;
                case 'delete':
                    this.layerManager.deleteLayer(layer);
                    this.cleanupLayerAssets(layer);
                    break;
            }
            this.updateUI();
        };
        
        // Configuration Manager Events
        this.configurationManager.onDropImages = (files) => {
            this.processMultipleImages(files);
        };
        
        // Interaction Manager Events
        this.interactionManager.onLayerClicked = (layer) => {
            this.updateUI();
        };
        
        this.interactionManager.onLayerDrag = (layer) => {
            this.updateUI();
        };
        
        this.interactionManager.onLayerDeleteRequested = (layer) => {
            this.requestLayerDeletion(layer);
        };
    }
    
    async loadDefaultTexture() {
        const textureLoader = new THREE.TextureLoader();
        try {
            const loadedTexture = await new Promise((resolve, reject) => {
                textureLoader.load(
                    './assets/texture.png',
                    resolve,
                    undefined,
                    reject
                );
            });
            
            this.baseTextureImage = loadedTexture.image;
            this.layerManager.setBaseTexture(loadedTexture.image);
            console.log('Base texture loaded successfully');
        } catch (error) {
            console.error('Error loading texture:', error);
            // Fallback handled by LayerManager
        }
    }
    
    async processImage(file) {
        try {
            this.imageProcessor.validateFile(file);
            
            this.uiManager.showLoadingIndicator(`Processing ${file.name}...`);
            
            let processResult;
            
            if (this.serverAvailable) {
                try {
                    console.log(`🌐 Processing ${file.name} on server...`);
                    processResult = await this.serverApiClient.processImage(file, { priority: 1 });
                    processResult.serverProcessed = true;
                    console.log('✅ Server processing completed:', processResult);
                } catch (serverError) {
                    if (serverError.message.includes('File too large') || 
                        serverError.message.includes('LIMIT_FILE_SIZE')) {
                        throw serverError;
                    }
                    
                    console.warn('❌ Server processing failed, falling back to client-side:', serverError);
                    this.serverAvailable = false;
                    this.uiManager.showNotification('Server processing failed - switching to client-side', 'warning', 3000);
                }
            }
            
            if (!processResult) {
                console.log(`💻 Processing ${file.name} on client...`);
                this.imageProcessor.checkMemoryUsage();
                processResult = await this.imageProcessor.processImage(file);
                processResult.serverProcessed = false;
            }
            
            return processResult;
            
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }
    
    async processMultipleImages(files) {
        if (files.length === 0) return;
        
        const totalFiles = files.length;
        let processedCount = 0;
        let failedCount = 0;
        
        console.log(`Starting batch processing of ${totalFiles} images...`);
        this.uiManager.showLoadingIndicator(`Processing batch: 0/${totalFiles}`);
        
        for (const file of files) {
            try {
                this.uiManager.showLoadingIndicator(`Processing: ${processedCount + 1}/${totalFiles} (${file.name})`);
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const processResult = await this.processImage(file);
                await this.createLayerFromProcessedImage(file, processResult);
                
                processedCount++;
                
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                failedCount++;
            }
        }
        
        this.uiManager.hideLoadingIndicator();
        
        const message = `Batch completed: ${processedCount} processed, ${failedCount} failed`;
        const notificationType = failedCount > 0 ? 'warning' : 'info';
        this.uiManager.showNotification(message, notificationType, this.config.defaultErrorDuration);
        
        this.updateUI();
    }
    
    async processSingleImage(file) {
        try {
            const processResult = await this.processImage(file);
            await this.createLayerFromProcessedImage(file, processResult);
            this.uiManager.hideLoadingIndicator();
            this.updateUI();
        } catch (error) {
            this.uiManager.hideLoadingIndicator();
            
            const isValidationError = error.message.includes('File too large') || 
                                     error.message.includes('LIMIT_FILE_SIZE');
            
            if (isValidationError) {
                const fileSizeMB = (this.config.maxImageFileSize);
                this.uiManager.showErrorModal(
                    '❌ File Too Large',
                    `The file you selected exceeds the maximum allowed size.\n\nMaximum file size: ${fileSizeMB}MB\n\nPlease:\n• Compress your image file\n• Use a smaller resolution image\n• Try a different image format`
                );
            } else {
                this.uiManager.showNotification(`❌ ${error.message}`, 'error', 0);
            }
        }
    }
    
    async createLayerFromProcessedImage(file, processResult) {
        return new Promise((resolve, reject) => {
            const { processedImageData, wasResized, originalSize, newSize, fileSizeReduced, serverProcessed } = processResult;
            
            const img = new Image();
            img.onload = () => {
                const assetId = `user_${Date.now()}_${file.name}`;
                
                if (serverProcessed) {
                    // Server processing returns URL
                } else {
                    // Client processing returns base64
                    this.imageProcessor.storeProcessedImage(assetId, processedImageData);
                    this.configurationManager.storeUserImage(assetId, processedImageData);
                }
                
                const layer = this.layerManager.addLogoLayer(img, file.name);
                
                // Set additional properties after layer creation
                layer.assetId = assetId;
                layer.serverImageUrl = serverProcessed ? processedImageData : null;
                
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
                
                resolve(layer);
            };
            
            img.onerror = () => {
                console.error('Failed to load processed image from URL:', processedImageData);
                console.error('Server processed:', serverProcessed);
                reject(new Error('Failed to load processed image'));
            };
            
            if (serverProcessed) {
                console.log('Loading server-processed image from URL:', processedImageData);
                img.crossOrigin = 'anonymous';
                img.src = processedImageData;
            } else {
                console.log('Loading client-processed image (base64)');
                img.src = processedImageData;
            }
        });
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
        
        const notificationType = serverProcessed ? 'info' : 'warning';
        this.uiManager.showNotification(message, notificationType, 0);
        
        console.log(`Image processing complete for ${filename}:`, details);
    }
    
    async loadConfiguration(file) {
        try {
            await this.configurationManager.loadConfiguration(file);
            this.updateUI();
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.uiManager.showNotification('Error loading configuration file. Please check the file format.', 'error', this.config.defaultErrorDuration);
        }
    }
    
    requestLayerDeletion(layer) {
        const title = 'Delete Layer';
        const message = `Are you sure you want to delete "${layer.name}"?\n\nThis action cannot be undone.`;
        
        this.uiManager.showConfirmationDialog(
            title,
            message,
            () => {
                // User confirmed deletion
                this.layerManager.deleteLayer(layer);
                this.cleanupLayerAssets(layer);
                this.updateUI();
                this.uiManager.showNotification(`Layer "${layer.name}" deleted`, 'info', 3000);
            },
            () => {
                // User cancelled, do nothing
                console.log('Layer deletion cancelled');
            }
        );
    }
    
    cleanupLayerAssets(layer) {
        if (layer.type === 'logo' && layer.assetId) {
            this.imageProcessor.removeProcessedImage(layer.assetId);
            this.configurationManager.removeUserImage(layer.assetId);
            
            if (layer.image) {
                layer.image.src = '';
                layer.image = null;
            }
            
            if (window.gc && typeof window.gc === 'function') {
                setTimeout(() => window.gc(), 100);
            }
        }
    }
    
    updateUI() {
        const layers = this.layerManager.getLayers();
        const selectedLayer = this.layerManager.getSelectedLayer();
        
        console.log('🔄 updateUI - selectedLayer:', selectedLayer);
        console.log('🔄 updateUI - all layers:', layers);
        
        this.uiManager.updateLayersList(layers, selectedLayer);
        this.uiManager.updateScaleSlider(selectedLayer);
    }
    
    async handleSubmit() {
        if (!this.sessionManager) {
            this.uiManager.showNotification('❌ Session system not available. Server may be offline.', 'error', 5000);
            return;
        }
        
        try {
            // Show loading notification
            this.uiManager.showNotification('💾 Submitting session...', 'info', 2000);
            
            
            // Update session configuration with current settings
            this.updateSessionConfiguration();
            
            // Submit session and get the shareable URL
            const shareableUrl = await this.sessionManager.submitSession(this.layerManager);
            
            // Show success notification with the shareable URL
            this.uiManager.showNotification(
                `✅ Session saved! Your unique URL: ${shareableUrl}
                
                Click the URL to copy it to clipboard, then share it to continue editing later.`, 
                'success', 
                15000
            );
            
            console.log(`🔗 Session submitted successfully: ${shareableUrl}`);
            
        } catch (error) {
            console.error('Error submitting session:', error);
            this.uiManager.showNotification(
                `❌ Failed to submit session: ${error.message}`, 
                'error', 
                8000
            );
        }
    }
    
    // Session Management Event Handlers
    handleSessionCreated(sessionData) {
        console.log(`✅ New session created: ${sessionData.sessionId}`);
        // Don't show URL immediately - wait for user to submit
    }
    
    handleSessionLoaded(sessionData) {
        console.log(`✅ Session loaded: ${sessionData.sessionId}`);
        this.uiManager.showNotification(`Session restored! ${sessionData.layers.length} layers loaded.`, 'success', 5000);
        
        // Restore session state
        this.restoreSessionState(sessionData);
    }
    
    handleSessionSaved(sessionData) {
        console.log(`💾 Session saved: ${sessionData.sessionId}`);
        // Optional: Show a subtle save indicator
    }
    
    handleSessionError(error) {
        console.error('Session error:', error);
        this.uiManager.showNotification(`Session error: ${error.message}`, 'error', 8000);
    }
    
    async restoreSessionState(sessionData) {
        try {
            // Restore layers
            for (const layerData of sessionData.layers) {
                // Create layer from session data for all layer types
                const layer = this.layerManager.createLayerFromSessionData(layerData);
                if (layer) {
                    // Try to load image if there's an imagePath OR if it's an image layer (attempt fallback loading)
                    if (layerData.imagePath || (layer.type !== 'text' && !layerData.imagePath)) {
                        const imageUrl = this.sessionManager.getLayerImageUrl(layerData.id);
                        try {
                            await this.layerManager.loadLayerImage(layer, imageUrl);
                        } catch (error) {
                            console.warn(`⚠️ Failed to load image for layer ${layerData.id}:`, error);
                            // Continue with other layers even if one fails to load
                        }
                    }
                }
            }
            
            // Restore model settings if any
            if (sessionData.modelSettings && sessionData.modelSettings.modelPath) {
                await this.sceneManager.loadModel(sessionData.modelSettings.modelPath);
            }
            
            // Force texture update after all layers are restored AND model is loaded
            setTimeout(() => {
                this.layerManager.updateTexture();
            }, 500); // Small delay to ensure everything is ready
            
            // Restore configuration
            if (sessionData.configuration) {
                this.applyConfiguration(sessionData.configuration);
            }
            
            // Update UI to reflect restored state
            this.updateUI();
            
        } catch (error) {
            console.error('Error restoring session state:', error);
            this.uiManager.showNotification('Error restoring session data', 'error', 5000);
        }
    }
    
    applyConfiguration(config) {
        // Apply any saved configuration (colors, settings, etc.)
        if (config.primaryColor) {
            const primaryColorInput = document.getElementById('primary-color');
            if (primaryColorInput) {
                primaryColorInput.value = config.primaryColor;
            }
        }
        
        if (config.secondaryColor) {
            const secondaryColorInput = document.getElementById('secondary-color');
            if (secondaryColorInput) {
                secondaryColorInput.value = config.secondaryColor;
            }
        }
        
        // Update colors if they were set
        if (config.primaryColor || config.secondaryColor) {
            this.layerManager.updateBaseTexture(
                config.primaryColor || '#ff6600',
                config.secondaryColor || '#0066ff'
            );
        }
    }
    
    displayShareableUrl() {
        if (!this.sessionManager || !this.sessionManager.isSessionActive()) {
            return;
        }
        
        const shareUrl = this.sessionManager.getShareableUrl();
        
        // Add share URL to UI (you might want to add this to a specific UI element)
        const shareElement = document.getElementById('share-url');
        if (shareElement) {
            shareElement.textContent = shareUrl;
            shareElement.href = shareUrl;
        } else {
            // If no dedicated share element, show in notification
            console.log(`🔗 Shareable URL: ${shareUrl}`);
        }
    }
    
    // Note: Images are now processed locally until user clicks SUBMIT
    // The session system will handle image storage only when submitting
    
    updateSessionConfiguration() {
        if (!this.sessionManager) return;
        
        const primaryColor = document.getElementById('primary-color')?.value;
        const secondaryColor = document.getElementById('secondary-color')?.value;
        
        this.sessionManager.updateConfiguration({
            primaryColor: primaryColor,
            secondaryColor: secondaryColor,
            lastModified: new Date().toISOString()
        });
    }
}

// Initialize the application
window.uniformConfigurator = new UniformConfigurator();