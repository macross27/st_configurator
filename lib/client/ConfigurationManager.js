export class ConfigurationManager {
    constructor(sceneManager, layerManager) {
        this.sceneManager = sceneManager;
        this.layerManager = layerManager;
        this.providedAssets = new Set([]);
        this.userUploadedImages = new Map();
        
        this.setupDragAndDrop();
    }
    
    
    async loadConfiguration(file) {
        try {
            const text = await file.text();
            const config = JSON.parse(text);
            
            console.log('Loading configuration:', config);
            await this.applyConfiguration(config);
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw new Error('Error loading configuration file. Please check the file format.');
        }
    }
    
    async applyConfiguration(config) {
        this.layerManager.clearLayers();
        this.userUploadedImages.clear();
        
        // Apply base colors
        const colors = this.extractColors(config);
        document.getElementById('primary-color').value = colors.primary;
        document.getElementById('secondary-color').value = colors.secondary;
        
        // Apply camera position
        if (config.camera) {
            this.sceneManager.setCameraPosition(config.camera.position);
            this.sceneManager.setCameraTarget(config.camera.target);
        }
        
        // Load layers
        if (config.layers) {
            for (const layerConfig of config.layers) {
                await this.createLayerFromConfig(layerConfig);
            }
        }
        
        // Update everything
        const primaryColor = document.getElementById('primary-color').value;
        const secondaryColor = document.getElementById('secondary-color').value;
        this.layerManager.updateBaseTexture(primaryColor, secondaryColor);
        
        console.log('Configuration loaded successfully');
    }
    
    extractColors(config) {
        if (config.baseColors) {
            // Legacy format support
            return {
                primary: config.baseColors.primary || '#ffffff',
                secondary: config.baseColors.secondary || '#000000'
            };
        } else if (config.baseTexture?.colors) {
            // New format
            return {
                primary: config.baseTexture.colors.primary || '#ffffff',
                secondary: config.baseTexture.colors.secondary || '#000000'
            };
        }
        
        return { primary: '#ffffff', secondary: '#000000' };
    }
    
    async createLayerFromConfig(layerConfig) {
        if (layerConfig.type === 'text') {
            this.layerManager.addTextLayer({
                id: layerConfig.id,
                name: layerConfig.name || 'Text Layer',
                text: layerConfig.text || 'Text',
                position: layerConfig.position || { x: 0.5, y: 0.5 },
                rotation: layerConfig.rotation || 0,
                scale: layerConfig.scale || 1,
                color: layerConfig.color || '#ffffff',
                fontSize: layerConfig.fontSize || 24,
                opacity: layerConfig.opacity || 1,
                locked: layerConfig.locked || false
            });
            
        } else if (layerConfig.type === 'logo') {
            await this.loadLogoLayer(layerConfig);
        }
    }
    
    async loadLogoLayer(layerConfig) {
        return new Promise((resolve, reject) => {
            if (!layerConfig.asset) {
                reject(new Error('No asset information for logo layer'));
                return;
            }
            
            const asset = layerConfig.asset;
            const img = new Image();
            
            img.onload = () => {
                const layer = this.layerManager.addLogoLayer(img, {
                    id: layerConfig.id,
                    name: layerConfig.name || 'Logo Layer',
                    position: layerConfig.position || { x: 0.5, y: 0.5 },
                    rotation: layerConfig.rotation || 0,
                    scale: layerConfig.scale || 1,
                    opacity: layerConfig.opacity || 1,
                    locked: layerConfig.locked || false,
                    assetId: asset.assetId
                });
                
                resolve(layer);
            };
            
            img.onerror = () => {
                console.warn(`Could not load asset: ${asset.assetId}`);
                resolve(null);
            };
            
            if (asset.type === 'uploaded' && asset.data) {
                // Load from embedded base64 data
                this.userUploadedImages.set(asset.assetId, asset.data);
                img.src = asset.data;
            } else if (asset.type === 'provided') {
                // Load from assets folder
                this.providedAssets.add(asset.assetId);
                img.src = `./assets/${asset.assetId}`;
            }
        });
    }
    
    setupDragAndDrop() {
        const container = document.getElementById('three-container');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
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
        
        container.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            
            const configFile = files.find(file => 
                file.name.endsWith('.uniformconfig') || 
                file.name.endsWith('.json')
            );
            
            if (configFile && this.onLoadConfiguration) {
                this.onLoadConfiguration(configFile);
            } else if (files.length > 0 && this.onDropImages) {
                const imageFiles = files.filter(file => file.type.startsWith('image/'));
                if (imageFiles.length > 0) {
                    this.onDropImages(imageFiles);
                }
            }
        });
    }
    
    storeUserImage(assetId, imageData) {
        this.userUploadedImages.set(assetId, imageData);
    }
    
    getUserImage(assetId) {
        return this.userUploadedImages.get(assetId);
    }
    
    removeUserImage(assetId) {
        this.userUploadedImages.delete(assetId);
    }
    
    addProvidedAsset(assetId) {
        this.providedAssets.add(assetId);
    }
    
    isProvidedAsset(assetId) {
        return this.providedAssets.has(assetId);
    }
}