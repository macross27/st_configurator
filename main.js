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
import { DesignSystem } from './lib/client/DesignSystem.js';
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
        
        // Initialize Design System and UI Style Manager
        DesignSystem.init();
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
                    this.layerManager.removeLayer(layer.id);
                    this.cleanupLayerAssets(layer);
                    // Also remove from server session
                    if (this.sessionManager && this.sessionManager.currentSessionId) {
                        this.sessionManager.removeLayer(layer.id).catch(error => {
                            console.warn('Failed to remove layer from server session:', error);
                        });
                    }
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
        
        // Connect performance monitoring
        this.layerManager.setPerformanceMonitor(this.sceneManager.performanceMonitor);
        
        // Add performance logging in development
        if (import.meta.env.DEV) {
            // Log performance report every 30 seconds
            setInterval(() => {
                this.sceneManager.logPerformanceReport();
            }, 30000);
        }
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
            
            // Check file size against conversion threshold
            const fileSizeMB = file.size / (1024 * 1024);
            const conversionThresholdMB = this.config.imageConversionThreshold;
            
            if (this.serverAvailable && fileSizeMB >= conversionThresholdMB) {
                try {
                    console.log(`🌐 Processing ${file.name} (${fileSizeMB.toFixed(2)}MB) on server (above ${conversionThresholdMB}MB threshold)...`);
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
            } else if (this.serverAvailable && fileSizeMB < conversionThresholdMB) {
                console.log(`💻 Processing ${file.name} (${fileSizeMB.toFixed(2)}MB) on client (below ${conversionThresholdMB}MB threshold)...`);
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
                    '❌ 파일 용량 초과',
                    `${file.name}의 용량이 최대 허용치 ${fileSizeMB}MB를 초과하여 사용하실수 없습니다.`
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
        
        let message = `${filename} 의 해상도를\n${originalSize.width}×${originalSize.height} 에서 ${newSize.width}×${newSize.height}으로\n${finalFileSizeKB}KB 용량으로 변환하였습니다.`;
        
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
                this.layerManager.removeLayer(layer.id);
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
            // Show submission dialog instead of notification
            this.uiManager.showSubmissionDialog();
            
            // Update session configuration with current settings
            this.updateSessionConfiguration();
            
            // Update progress
            this.uiManager.updateSubmissionDialog('세션 정보를 업데이트하는 중...', 25);
            
            // Submit session and get the shareable URL
            const shareableUrl = await this.sessionManager.submitSession(this.layerManager);
            
            // Update progress before success
            this.uiManager.updateSubmissionDialog('제출 완료 처리 중...', 100);
            
            // Show success in dialog
            this.uiManager.showSubmissionSuccess(
                `작업물이 성공적으로 제출되었습니다!\n\n공유 URL: ${shareableUrl}\n\nURL을 클릭하면 클립보드에 복사됩니다.`,
                shareableUrl
            );
            
            console.log(`🔗 Session submitted successfully: ${shareableUrl}`);
            
        } catch (error) {
            console.error('Error submitting session:', error);
            
            // Show error in dialog
            this.uiManager.showSubmissionError(
                `제출에 실패했습니다: ${error.message}`
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
        this.uiManager.showNotification('세션이 복원되었습니다!', 'success', 5000);
        
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
    
    // Phase 4: Image validation during session load
    async validateLayerImage(layerId, imageUrl) {
        if (!imageUrl) {
            return false;
        }
        
        try {
            const response = await fetch(imageUrl, { method: 'HEAD' });
            if (response.ok) {
                return true;
            } else {
                console.error(`Image validation failed for layer ${layerId}: HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error(`Failed to validate image for layer ${layerId}:`, error);
            return false;
        }
    }
    
    // Phase 4: Handle missing layer images gracefully
    handleMissingLayerImage(layerData, layer, reason) {
        const reasonText = reason === 'missing_file' ? 'Image file not found' : 
                          reason === 'missing_path' ? 'Image processing failed' : 'Failed to load image';
        console.warn(`⚠️ ${reasonText} for layer ${layerData.id || layerData.name}, creating layer with placeholder`);
        
        // Add visual indicator that image is missing
        if (layer && this.layerManager) {
            // For text layers, this is fine - they don't need images
            if (layer.type === 'text') {
                return;
            }
            
            // For image/logo layers, mark as having an error
            layer.hasImageError = true;
            layer.imageErrorReason = reasonText;
            layer.originalFileName = layerData.name;
            
            // Create a placeholder image showing the error
            this.createPlaceholderImage(layer, reasonText);
            
            // Update layer panel to show warning
            if (this.uiManager && this.uiManager.updateLayerPanel) {
                setTimeout(() => {
                    this.uiManager.updateLayerPanel();
                }, 100);
            }
        }
        
        // Show user notification for missing images
        const layerName = layerData.name || layerData.id || 'Unknown';
        this.uiManager.showNotification(
            `⚠️ ${reasonText} for layer "${layerName}". Layer created with placeholder - you can re-upload the image.`, 
            'warning', 
            8000
        );
    }
    
    createPlaceholderImage(layer, errorReason) {
        // Create a placeholder image that shows the error
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // Red background
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(0, 0, 200, 200);
        
        // White text
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('❌ MISSING', 100, 80);
        ctx.fillText('IMAGE', 100, 100);
        ctx.font = '12px Arial';
        ctx.fillText(errorReason, 100, 130);
        ctx.fillText('Re-upload needed', 100, 150);
        
        // Convert to image and set on layer
        const img = new Image();
        img.onload = () => {
            layer.image = img;
            // Update the texture to show the placeholder
            if (this.layerManager) {
                this.layerManager.updateTexture();
            }
        };
        img.src = canvas.toDataURL();
    }
    
    async restoreSessionState(sessionData) {
        try {
            // Clear all existing layers before restoring session layers
            console.log(`🧹 Clearing ${this.layerManager.getLayers().length} existing layers before session restore`);
            this.layerManager.clearLayers();
            this.updateUI(); // Update UI after clearing layers
            
            // Restore layers
            for (const layerData of sessionData.layers) {
                // Create layer from session data for all layer types
                const layer = this.layerManager.createLayerFromSessionData(layerData);
                if (layer) {
                    // Handle image layers with imagePath
                    if (layerData.imagePath && layer.type !== 'text') {
                        const imageUrl = this.sessionManager.getLayerImageUrl(layerData.id);
                        
                        // Validate image exists before loading
                        const imageExists = await this.validateLayerImage(layerData.id, imageUrl);
                        if (imageExists) {
                            try {
                                await this.layerManager.loadLayerImage(layer, imageUrl);
                                console.log(`✅ Successfully loaded image for layer ${layerData.id}`);
                            } catch (error) {
                                console.warn(`⚠️ Failed to load image for layer ${layerData.id}:`, error);
                                this.handleMissingLayerImage(layerData, layer, 'load_error');
                            }
                        } else {
                            console.warn(`⚠️ Layer ${layerData.id} has missing image file: ${imageUrl}`);
                            this.handleMissingLayerImage(layerData, layer, 'missing_file');
                        }
                    } 
                    // Handle image layers WITHOUT imagePath (processing failed/timed out)
                    else if (layer.type !== 'text' && !layerData.imagePath) {
                        console.warn(`⚠️ Image layer ${layerData.id} has no imagePath - processing may have failed`);
                        this.handleMissingLayerImage(layerData, layer, 'missing_path');
                    }
                    // Text layers don't need image loading - they render directly
                    else if (layer.type === 'text') {
                        console.log(`✅ Successfully restored text layer ${layerData.id}`);
                    }
                }
            }
            
            // Restore model settings if any
            if (sessionData.modelSettings && sessionData.modelSettings.modelPath) {
                await this.sceneManager.loadModel(sessionData.modelSettings.modelPath);
            }
            
            // Force texture update after all layers are restored AND model is loaded
            setTimeout(() => {
                // Force update and mark entire texture as dirty to ensure complete re-render
                this.layerManager.markBaseDirty();
                this.layerManager.updateTexture(true); // Force update = true
                console.log('🔄 Forced texture update after session restoration');
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