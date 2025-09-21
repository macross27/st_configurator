/**
 * Optimized Main Application with Dynamic Imports and Progressive Loading
 * Implements bundle size optimization through lazy loading and code splitting
 */

import { dynamicLoader } from './lib/client/DynamicLoader.js';

class UniformConfigurator {
    constructor() {
        this.serverAvailable = false;
        this.serverApiClient = null;
        this.config = {};
        this.baseTextureImage = null;
        this.isInitialized = false;

        // Manager instances (loaded dynamically)
        this.sceneManager = null;
        this.layerManager = null;
        this.interactionManager = null;
        this.uiManager = null;
        this.configurationManager = null;
        this.imageProcessor = null;
        this.sessionManager = null;
        this.orderFormManager = null;

        // Core systems loaded first
        this.coreSystemsLoaded = false;
        this.optionalFeaturesLoaded = false;

        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Phase 1: Load core configuration and basic UI
            await this.loadCoreConfiguration();

            // Phase 2: Load essential managers for basic 3D functionality
            await this.loadCoreManagers();

            // Phase 3: Initialize basic 3D scene
            await this.initializeCore3D();

            // Phase 4: Load additional UI and interaction features (in background)
            this.loadAdditionalFeatures();

            // Phase 5: Preload optional features for faster access
            this.preloadOptionalFeatures();

            this.isInitialized = true;
            console.log('✅ Application initialization complete');

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showFallbackError(error);
        }
    }

    async loadCoreConfiguration() {
        try {
            // Load server configuration
            await this.loadServerConfiguration();

            // Initialize basic utilities first
            const { SecureDOM } = await dynamicLoader.loadModule(
                './lib/client/SecureDOM.js',
                'SecureDOM',
                { essential: true, loadingMessage: 'Loading security utilities...' }
            );

            console.log('✅ Core configuration loaded');
        } catch (error) {
            console.error('Failed to load core configuration:', error);
            throw error;
        }
    }

    async loadCoreManagers() {
        try {
            // Load essential managers in parallel for faster startup
            const coreModules = await dynamicLoader.loadModules([
                {
                    path: './lib/client/SceneManager.js',
                    name: 'SceneManager',
                    options: { essential: true, loadingMessage: 'Loading 3D engine...' }
                },
                {
                    path: './lib/client/LayerManager.js',
                    name: 'LayerManager',
                    options: { essential: true, loadingMessage: 'Loading texture system...' }
                },
                {
                    path: './lib/client/UIManager.js',
                    name: 'UIManager',
                    options: { essential: true, loadingMessage: 'Loading interface...' }
                }
            ]);

            // Extract managers from loaded modules
            const [sceneModule, layerModule, uiModule] = coreModules;

            this.sceneManager = new sceneModule.SceneManager();
            this.layerManager = new layerModule.LayerManager();
            this.uiManager = new uiModule.UIManager();

            this.coreSystemsLoaded = true;
            console.log('✅ Core managers loaded');

        } catch (error) {
            console.error('Failed to load core managers:', error);
            throw error;
        }
    }

    async initializeCore3D() {
        try {
            // Initialize Three.js scene
            await this.sceneManager.initialize();

            // Setup basic layer management
            this.layerManager.initialize(this.sceneManager.getRenderer());

            // Setup basic UI
            this.uiManager.initialize();

            // Setup basic event handlers
            this.setupCoreEventHandlers();

            // Load default texture
            await this.loadDefaultTexture();

            console.log('✅ Core 3D system initialized');
        } catch (error) {
            console.error('Failed to initialize core 3D:', error);
            throw error;
        }
    }

    async loadAdditionalFeatures() {
        try {
            // Load interaction and configuration managers
            const additionalModules = await dynamicLoader.loadModules([
                {
                    path: './lib/client/InteractionManager.js',
                    name: 'InteractionManager',
                    options: { showLoader: false }
                },
                {
                    path: './lib/client/ConfigurationManager.js',
                    name: 'ConfigurationManager',
                    options: { showLoader: false }
                },
                {
                    path: './lib/client/ImageProcessor.js',
                    name: 'ImageProcessor',
                    options: { showLoader: false }
                },
                {
                    path: './lib/client/SessionManager.js',
                    name: 'SessionManager',
                    options: { showLoader: false }
                }
            ]);

            const [interactionModule, configModule, imageModule, sessionModule] = additionalModules;

            // Initialize additional managers
            this.interactionManager = new interactionModule.InteractionManager(
                this.sceneManager, this.layerManager, this.uiManager
            );

            this.configurationManager = new configModule.ConfigurationManager(
                this.layerManager, this.sceneManager
            );

            if (this.serverAvailable && this.config) {
                this.imageProcessor = new imageModule.ImageProcessor({
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

            this.sessionManager = new sessionModule.SessionManager();

            // Setup complete event handlers
            this.setupCompleteEventHandlers();

            console.log('✅ Additional features loaded');
        } catch (error) {
            console.warn('Some additional features failed to load:', error);
        }
    }

    async preloadOptionalFeatures() {
        // Preload heavy optional features in background
        dynamicLoader.preloadModules([
            './lib/client/OrderFormManager.js',
            './lib/client/ColorWheelPicker.js',
            './lib/client/PerformanceMonitor.js',
            './lib/client/UIStyleManager.js',
            './lib/client/DesignSystem.js'
        ], 'background');
    }

    async loadOptionalFeature(featureName) {
        try {
            switch (featureName) {
                case 'orderForm':
                    if (!this.orderFormManager) {
                        const { OrderFormManager } = await dynamicLoader.loadModule(
                            './lib/client/OrderFormManager.js',
                            'OrderFormManager',
                            { loadingMessage: 'Loading order form...' }
                        );
                        this.orderFormManager = new OrderFormManager();
                    }
                    return this.orderFormManager;

                case 'colorPicker':
                    const { ColorWheelPicker } = await dynamicLoader.loadModule(
                        './lib/client/ColorWheelPicker.js',
                        'ColorWheelPicker',
                        { loadingMessage: 'Loading color picker...' }
                    );
                    return ColorWheelPicker;

                case 'performance':
                    const { PerformanceMonitor } = await dynamicLoader.loadModule(
                        './lib/client/PerformanceMonitor.js',
                        'PerformanceMonitor',
                        { loadingMessage: 'Loading performance monitor...' }
                    );
                    return PerformanceMonitor;

                case 'designSystem':
                    const { DesignSystem } = await dynamicLoader.loadModule(
                        './lib/client/DesignSystem.js',
                        'DesignSystem',
                        { loadingMessage: 'Loading design system...' }
                    );
                    return DesignSystem;

                default:
                    throw new Error(`Unknown feature: ${featureName}`);
            }
        } catch (error) {
            console.error(`Failed to load optional feature ${featureName}:`, error);
            return null;
        }
    }

    async loadServerConfiguration() {
        try {
            // Load server API client dynamically
            const serverModule = await import('./lib/serverApiClient.js');

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

                    this.serverApiClient = new ServerApiClient({
                        serverUrl: `${serverProtocol}://${serverHost}:${this.config.serverPort}`,
                        pollInterval: this.config.clientPollInterval,
                        maxPollTime: this.config.clientMaxPollTime
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
            serverPort: serverPort,
            clientPollInterval: 1000,
            clientMaxPollTime: 30000
        };
    }

    setupCoreEventHandlers() {
        // File upload handling
        const fileUpload = document.getElementById('file-upload');
        if (fileUpload) {
            fileUpload.addEventListener('change', async (event) => {
                const files = Array.from(event.target.files);
                for (const file of files) {
                    await this.handleFileUpload(file);
                }
                event.target.value = '';
            });
        }

        // Drag and drop handling
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', async (event) => {
            event.preventDefault();
            const files = Array.from(event.dataTransfer.files);
            for (const file of files) {
                if (file.name.endsWith('.json')) {
                    await this.handleConfigurationUpload(file);
                } else {
                    await this.handleFileUpload(file);
                }
            }
        });
    }

    setupCompleteEventHandlers() {
        // Enhanced event handlers with full manager support
        if (this.interactionManager) {
            this.interactionManager.setupEventHandlers();
        }

        // Session management
        const saveSessionBtn = document.getElementById('save-session-btn');
        if (saveSessionBtn && this.sessionManager) {
            saveSessionBtn.addEventListener('click', () => this.handleSaveSession());
        }

        const loadSessionBtn = document.getElementById('load-session-btn');
        if (loadSessionBtn && this.sessionManager) {
            loadSessionBtn.addEventListener('click', () => this.handleLoadSession());
        }
    }

    async handleFileUpload(file) {
        try {
            // Ensure image processor is loaded
            if (!this.imageProcessor) {
                await this.loadAdditionalFeatures();
            }

            if (!this.imageProcessor) {
                throw new Error('Image processor not available');
            }

            const processResult = await this.processImage(file);
            if (processResult && processResult.processedImage) {
                this.layerManager.addImageLayer(processResult.processedImage, file.name);
            }
        } catch (error) {
            console.error('File upload error:', error);
            if (this.uiManager) {
                this.uiManager.showNotification(`Error processing ${file.name}: ${error.message}`, 'error');
            }
        }
    }

    async handleConfigurationUpload(file) {
        try {
            if (!this.configurationManager) {
                await this.loadAdditionalFeatures();
            }

            if (this.configurationManager) {
                await this.configurationManager.loadConfiguration(file);
            }
        } catch (error) {
            console.error('Configuration upload error:', error);
            if (this.uiManager) {
                this.uiManager.showNotification(`Error loading configuration: ${error.message}`, 'error');
            }
        }
    }

    async handleSaveSession() {
        try {
            const sessionName = prompt('Enter session name:');
            if (sessionName && this.sessionManager) {
                await this.sessionManager.saveSession(sessionName);
                if (this.uiManager) {
                    this.uiManager.showNotification('Session saved successfully', 'success');
                }
            }
        } catch (error) {
            console.error('Session save error:', error);
            if (this.uiManager) {
                this.uiManager.showNotification(`Error saving session: ${error.message}`, 'error');
            }
        }
    }

    async handleLoadSession() {
        try {
            // Load order form feature for session management UI
            await this.loadOptionalFeature('orderForm');

            if (this.sessionManager) {
                const sessions = await this.sessionManager.listSessions();
                // Implementation would show session selection UI
                console.log('Available sessions:', sessions);
            }
        } catch (error) {
            console.error('Session load error:', error);
            if (this.uiManager) {
                this.uiManager.showNotification(`Error loading sessions: ${error.message}`, 'error');
            }
        }
    }

    async loadDefaultTexture() {
        try {
            const loader = new THREE.TextureLoader();
            const loadedTexture = await new Promise((resolve, reject) => {
                loader.load(
                    './assets/base-uniform-texture.jpg',
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
            if (!this.imageProcessor) {
                throw new Error('Image processor not loaded');
            }

            this.imageProcessor.validateFile(file);

            if (this.uiManager) {
                this.uiManager.showLoadingIndicator(`Processing ${file.name}...`);
            }

            let processResult;

            // Check file size against conversion threshold
            const fileSizeMB = file.size / (1024 * 1024);
            const conversionThresholdMB = this.config.imageConversionThreshold;

            if (this.serverAvailable && fileSizeMB >= conversionThresholdMB) {
                try {
                    console.log(`🌐 Processing ${file.name} (${fileSizeMB.toFixed(2)}MB) on server...`);
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
                    if (this.uiManager) {
                        this.uiManager.showNotification('Server processing failed - switching to client-side', 'warning', 3000);
                    }
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
            console.error('Image processing error:', error);
            throw error;
        } finally {
            if (this.uiManager) {
                this.uiManager.hideLoadingIndicator();
            }
        }
    }

    showFallbackError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'critical-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>Application Failed to Load</h2>
                <p>A critical error occurred during application initialization:</p>
                <pre>${error.message}</pre>
                <button onclick="location.reload()">Reload Application</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    // Public API for accessing loaded features
    async getFeature(featureName) {
        return await this.loadOptionalFeature(featureName);
    }

    getLoadingStats() {
        return {
            coreSystemsLoaded: this.coreSystemsLoaded,
            optionalFeaturesLoaded: this.optionalFeaturesLoaded,
            isInitialized: this.isInitialized,
            dynamicLoaderStats: dynamicLoader.getStats()
        };
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Load Three.js first (largest dependency)
    import('three').then(() => {
        window.configurator = new UniformConfigurator();

        // Expose dynamic loader for debugging
        window.dynamicLoader = dynamicLoader;

        // Performance monitoring
        if (window.performance && window.performance.mark) {
            window.performance.mark('app-initialized');
        }
    }).catch(error => {
        console.error('Failed to load Three.js:', error);
        document.body.innerHTML = `
            <div class="critical-error">
                <h2>Failed to Load 3D Engine</h2>
                <p>The application requires Three.js to function. Please check your internet connection and reload.</p>
                <button onclick="location.reload()">Reload</button>
            </div>
        `;
    });
});

// Add critical error styles
const criticalErrorStyles = `
.critical-error {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #1a1a1a;
    color: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
    font-family: Arial, sans-serif;
}

.error-content {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 12px;
    max-width: 500px;
    text-align: center;
}

.error-content h2 {
    color: #ff4444;
    margin: 0 0 1rem 0;
}

.error-content pre {
    background: #1a1a1a;
    padding: 1rem;
    border-radius: 6px;
    margin: 1rem 0;
    white-space: pre-wrap;
    word-break: break-word;
}

.error-content button {
    background: #0066cc;
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
}

.error-content button:hover {
    background: #0055aa;
}
`;

if (!document.getElementById('critical-error-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'critical-error-styles';
    styleSheet.textContent = criticalErrorStyles;
    document.head.appendChild(styleSheet);
}