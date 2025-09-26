import * as THREE from 'three';
import { errorManager, LayerError, ApplicationError } from './ErrorManager.js';
import { i18n } from './I18nManager.js';

export class LayerManager {
    constructor() {
        this.layers = [];
        this.selectedLayer = null;
        this.textureCanvas = null;
        this.textureContext = null;
        this.baseTextureImage = null;
        this.texture = null;
        
        // Store current colors for base texture
        this.currentPrimaryColor = '#ffffff';
        this.currentSecondaryColor = '#ffffff';

        this.onLayerAdded = null;
        this.onLayerRemoved = null;
        this.onLayerSelected = null;
        this.onLayerUpdated = null;
        this.onTextureUpdated = null;

        // Hybrid GLB System Integration
        this.modelCache = null; // Will be injected by SceneManager
        
        // Smart texture update system
        this.textureUpdateTimeout = null;
        this.textMetricsCache = new Map();
        this.lastUpdateTime = 0;
        this.pendingUpdate = false;
        this.updateThrottleMs = 16; // 60 FPS max
        this.dirtyRegions = new Set();

        // Performance optimization: Batch color updates
        this.colorUpdatePending = false;
        this.colorUpdateRafId = null;
        this.lastColorUpdateTime = 0;
        this.colorUpdateThrottle = 32; // ~30fps for color updates
        this.performanceMonitor = {
            updateTimes: [],
            averageUpdateTime: 0
        };

        // Race condition prevention
        this.isUpdatingBaseTexture = false;
    }
    
    initializeTexture(width = 512, height = 512, baseImage = null) {
        this.textureCanvas = document.createElement('canvas');
        this.textureCanvas.width = width;
        this.textureCanvas.height = height;
        this.textureContext = this.textureCanvas.getContext('2d');
        this.baseTextureImage = baseImage;
        
        this.texture = new THREE.CanvasTexture(this.textureCanvas);
        this.texture.flipY = false;
        this.texture.format = THREE.RGBAFormat;
        this.texture.type = THREE.UnsignedByteType;
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.generateMipmaps = false; // Canvas textures don't need mipmaps
        this.texture.needsUpdate = true;

        // Connect ModelCache to texture canvas if available
        this.updateModelCacheCanvas();

        // Create a simple base texture (solid color, no gradient)
        this.updateBaseTexture().catch(console.error);
        console.log('✅ LayerManager creating simple base texture');
        
        return this.texture;
    }
    
    async updateBaseTexture(primaryColor = '#ffffff', secondaryColor = '#ffffff') {
        console.log('🎨 LayerManager.updateBaseTexture called');
        if (!this.textureContext) return;

        // Store current colors for use in updateTexture()
        this.currentPrimaryColor = primaryColor;
        this.currentSecondaryColor = secondaryColor;

        // Schedule batched color update instead of immediate update
        this.scheduleColorUpdate();
    }

    // Batched color update with throttling
    scheduleColorUpdate() {
        const now = Date.now();

        // If enough time has passed, update immediately
        if (now - this.lastColorUpdateTime >= this.colorUpdateThrottle) {
            this._performColorUpdate();
            this.lastColorUpdateTime = now;
        } else if (!this.colorUpdatePending) {
            // Schedule update for next frame
            this.colorUpdatePending = true;
            this.colorUpdateRafId = requestAnimationFrame(() => {
                this._performColorUpdate();
                this.colorUpdatePending = false;
                this.lastColorUpdateTime = Date.now();
            });
        }
    }

    // Internal method to perform the actual color update
    async _performColorUpdate() {
        if (!this.textureContext) return;

        // 🔒 PREVENT RACE CONDITIONS: Set flag to prevent concurrent updates
        if (this.isUpdatingBaseTexture) {
            console.log('⚠️ RACE CONDITION PREVENTED: Base texture update already in progress, skipping');
            return;
        }
        this.isUpdatingBaseTexture = true;
        console.log('🔒 Starting atomic base texture update with layers preservation');

        // 🛡️ SAFETY CHECK: Ensure texture and context are still valid
        if (!this.texture || !this.textureCanvas || !this.textureContext) {
            console.error('❌ TEXTURE CORRUPTION: Missing texture, canvas, or context during update');
            this.isUpdatingBaseTexture = false;
            return;
        }

        try {
            const width = this.textureCanvas.width;
            const height = this.textureCanvas.height;

            // 🎨 SAVE EXISTING LAYERS before clearing canvas
            const existingLayers = this.layers.filter(layer => layer.visible && (layer.image || layer.type === 'text'));

            // DON'T clear canvas yet - only clear after we're sure pattern will load

            // NEW: Use pattern texture from PatternCompositor instead of gradient
            if (this.baseTextureImage) {
                // Clear and draw the base image if available
                this.textureContext.clearRect(0, 0, width, height);
                this.textureContext.drawImage(this.baseTextureImage, 0, 0, width, height);

                // Apply color overlay/tint if needed
                this.textureContext.globalCompositeOperation = 'multiply';
                this.textureContext.fillStyle = this.currentPrimaryColor;
                this.textureContext.fillRect(0, 0, width, height);
                this.textureContext.globalCompositeOperation = 'source-over';
            } else {
                // Use pattern texture from global pattern system instead of gradient
                if (window.uniformConfigurator && window.uniformConfigurator.patternCompositor) {
                    try {
                        const patternManager = window.uniformConfigurator.patternManager;
                        const currentPattern = patternManager?.getCurrentPattern();

                        if (currentPattern) {
                            console.log('🎨 LayerManager using pattern texture for base instead of gradient');

                            // Get current pattern colors
                            const colors = window.uniformConfigurator.patternCompositor.getCurrentColors(currentPattern.name);

                            // Get additional texture colors (pants, neck)
                            const additionalTextures = window.uniformConfigurator.patternCompositor.getAdditionalTextureColors();
                            console.log('🎨 LayerManager additionalTextures:', additionalTextures);

                            // Create pattern texture with additional texture layers
                            const patternTexture = await window.uniformConfigurator.patternCompositor.createCompositeTexture(currentPattern, colors, additionalTextures);

                            // 🔒 ATOMIC OPERATION: Draw pattern texture synchronously
                            const patternImg = new Image();
                            await new Promise((resolve, reject) => {
                                patternImg.onload = () => {
                                    // NOW it's safe to clear canvas since pattern loaded successfully
                                    this.textureContext.clearRect(0, 0, width, height);
                                    this.textureContext.drawImage(patternImg, 0, 0, width, height);
                                    console.log('✅ Pattern texture loaded and applied to base texture');
                                    resolve();
                                };
                                patternImg.onerror = reject;
                                patternImg.src = patternTexture;
                            });
                        } else {
                            // No pattern available, use solid color
                            this.textureContext.clearRect(0, 0, width, height);
                            this.textureContext.fillStyle = this.currentPrimaryColor;
                            this.textureContext.fillRect(0, 0, width, height);
                        }
                    } catch (error) {
                        console.warn('⚠️ Failed to use pattern texture, falling back to solid color:', error);
                        // Fallback to solid color
                        this.textureContext.clearRect(0, 0, width, height);
                        this.textureContext.fillStyle = this.currentPrimaryColor;
                        this.textureContext.fillRect(0, 0, width, height);
                    }
                } else {
                    // Use solid color instead of gradient to reduce texture count
                    console.log('🎨 LayerManager using solid color (no gradient, no pattern)');
                    this.textureContext.clearRect(0, 0, width, height);
                    this.textureContext.fillStyle = this.currentPrimaryColor;
                    this.textureContext.fillRect(0, 0, width, height);
                }
            }

            // 🎨 IMMEDIATELY REDRAW ALL LAYERS after base texture is complete
            this.textureContext.globalCompositeOperation = 'source-over';
            this.textureContext.globalAlpha = 1.0;

            for (const layer of existingLayers) {
                this.drawLayer(layer);
            }

            // Note: Don't set texture.needsUpdate here - it will be set once in performOptimizedTextureUpdate
            // This prevents multiple needsUpdate calls that can cause Three.js texture issues

            // Update ModelCache immediately to prevent mesh disappearing
            if (this.modelCache) {
                console.log('🔄 LayerManager triggering immediate ModelCache update');
                this.modelCache.updateSharedTextureForAll();
            }

        } finally {
            // 🔒 ALWAYS clear the update flag
            this.isUpdatingBaseTexture = false;
        }
    }
    
    setBaseTexture(image) {
        this.baseTextureImage = image;
        this.markBaseDirty();
        this.updateTexture();
    }
    
    updateTexture(forceUpdate = false) {
        const now = performance.now();

        // Throttle updates to prevent excessive GPU uploads
        if (!forceUpdate && now - this.lastUpdateTime < this.updateThrottleMs) {
            if (!this.pendingUpdate) {
                this.pendingUpdate = true;
                setTimeout(() => {
                    this.pendingUpdate = false;
                    this.updateTexture(true);
                }, this.updateThrottleMs - (now - this.lastUpdateTime));
            }
            return;
        }

        this.lastUpdateTime = now;

        // Always update when layers exist (force dirty regions)
        if (this.layers.length > 0) {
            this.dirtyRegions.add('all');
        }

        // Only update if there are dirty regions or force update
        if (this.dirtyRegions.size === 0 && !forceUpdate) return;

        const startTime = performance.now();

        // Handle async texture update
        this.performOptimizedTextureUpdate().then(() => {
            const endTime = performance.now();
            // Track performance
            this.trackUpdatePerformance(endTime - startTime);
        }).catch(error => {
            console.error('❌ Error during texture update:', error);
        });

        this.dirtyRegions.clear();
    }
    
    async performOptimizedTextureUpdate() {
        if (!this.textureContext) return;

        // Store current state before any modifications
        this.textureContext.save();

        // ALWAYS redraw base texture to clear previous layer positions
        // This prevents ghost trails when layers move
        // IMPORTANT: Wait for base texture update to complete before drawing layers
        // Note: updateBaseTexture now handles layer redrawing internally to prevent race conditions
        await this.updateBaseTexture(this.currentPrimaryColor, this.currentSecondaryColor);

        // No need to redraw layers here - they are already drawn in _performColorUpdate() atomically
        // This prevents double-drawing and potential race conditions

        // Restore state
        this.textureContext.restore();

        if (this.texture) {
            this.texture.needsUpdate = true;

            // NEW: Update all cached models if hybrid system is active
            if (this.modelCache) {
                console.log('🔄 LayerManager calling ModelCache.updateSharedTextureForAll()');
                this.modelCache.updateSharedTextureForAll();
            } else {
                console.log('⚠️ LayerManager has no ModelCache connection for texture sharing');
            }

            if (this.onTextureUpdated) {
                this.onTextureUpdated(this.texture);
            }
        }
    }
    
    drawLayerOptimized(layer) {
        // Use the existing drawLayer method but with performance optimizations
        this.drawLayer(layer);
    }
    
    trackUpdatePerformance(duration) {
        // Use the shared performance monitor if available
        if (this.sharedPerformanceMonitor) {
            this.sharedPerformanceMonitor.trackTextureUpdate(duration);
        } else {
            // Fallback to local tracking
            this.performanceMonitor.updateTimes.push(duration);
            
            // Keep only last 20 measurements
            if (this.performanceMonitor.updateTimes.length > 20) {
                this.performanceMonitor.updateTimes.shift();
            }
            
            // Calculate average
            this.performanceMonitor.averageUpdateTime = 
                this.performanceMonitor.updateTimes.reduce((a, b) => a + b) / this.performanceMonitor.updateTimes.length;
            
            // Warn about slow updates
            if (duration > 20) {
                console.warn(`🐌 Slow texture update: ${duration.toFixed(2)}ms (avg: ${this.performanceMonitor.averageUpdateTime.toFixed(2)}ms)`);
            }
        }
    }
    
    setPerformanceMonitor(monitor) {
        this.sharedPerformanceMonitor = monitor;
    }
    
    markLayerDirty(layerId) {
        this.dirtyRegions.add(layerId);
    }
    
    markBaseDirty() {
        this.dirtyRegions.add('base');
    }
    
    scheduleTextureUpdate() {
        // Debounce texture updates to prevent excessive GPU uploads
        if (this.textureUpdateTimeout) {
            return; // Update already scheduled
        }
        
        this.textureUpdateTimeout = requestAnimationFrame(() => {
            this.updateTexture();
            this.textureUpdateTimeout = null;
        });
    }
    
    drawLayer(layer) {
        if (!this.textureContext) return;

        const canvas = this.textureCanvas;
        const ctx = this.textureContext;

        ctx.save();

        // Reset context state to ensure clean drawing
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = layer.opacity || 1.0;

        // Clear any previous fill/stroke styles that might affect layer drawing
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#000000';
        
        // Apply transformations
        const centerX = canvas.width * (layer.position?.x || 0);
        const centerY = canvas.height * (layer.position?.y || 0);
        
        ctx.translate(centerX, centerY);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        ctx.scale(layer.scale || 1.0, layer.scale || 1.0);
        
        if (layer.type === 'text') {
            // Draw text layer
            const fontSize = layer.fontSize || 24;
            const text = layer.text || 'Text';
            const color = layer.color || '#ffffff';

            // Ensure clean text drawing state
            ctx.fillStyle = color;
            ctx.strokeStyle = color; // Also set stroke in case it's used elsewhere
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 0, 0);
        } else if (layer.type === 'logo' && layer.image) {
            // Draw image layer with color multiplication that preserves alpha
            const img = layer.image;
            const color = layer.color || '#ffffff';

            // If color is not white (#ffffff), apply color multiplication preserving alpha
            if (color !== '#ffffff') {
                // Create off-screen canvas for isolated color multiplication
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');

                // Ensure clean drawing state for temp canvas
                tempCtx.globalCompositeOperation = 'source-over';
                tempCtx.globalAlpha = 1.0;

                // Draw original image to temp canvas
                tempCtx.drawImage(img, 0, 0);

                // Apply color multiplication while preserving alpha
                tempCtx.globalCompositeOperation = 'multiply';
                tempCtx.fillStyle = color;
                tempCtx.fillRect(0, 0, img.width, img.height);

                // Use destination-in to restore original alpha channel
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(img, 0, 0);

                // Draw the color-multiplied result to main canvas
                // Important: Reset main canvas composite operation before drawing
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(tempCanvas, -img.width / 2, -img.height / 2);
            } else {
                // If color is white, just draw the image normally (no multiplication needed)
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
            }
        }
        
        ctx.restore();
    }
    
    addLayer(type, image, name = null) {
        const id = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        const layer = {
            id: id,
            type: type,
            name: name || `${type} Layer ${this.layers.length + 1}`,
            visible: true,
            locked: false,
            position: { x: 0.0, y: 0.0 },
            scale: 1.0,
            rotation: 0,
            opacity: 1.0,
            image: image
        };
        
        // Add type-specific properties
        if (type === 'logo') {
            layer.color = '#ffffff'; // Default to white (no color change)
        }
        
        this.layers.push(layer);
        this.updateTexture();
        
        if (this.onLayerAdded) {
            this.onLayerAdded(layer);
        }
        
        return layer;
    }
    
    addTextLayer(text = 'Sample Text', fontFamily = 'Arial', fontSize = 48, color = '#000000') {
        // Offset new layers to avoid overlap (like original)
        const offsetX = (this.layers.length * 0.1) % 0.8 + 0.1;
        const offsetY = (this.layers.length * 0.15) % 0.6 + 0.2;

        const id = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const layer = {
            id: id,
            type: 'text',
            name: text || `Text Layer ${this.layers.length + 1}`,
            text: text,
            visible: true,
            locked: false,
            position: { x: offsetX, y: offsetY },
            scale: 1.0,
            rotation: 0,
            opacity: 1.0,
            color: color,
            fontSize: fontSize,
            fontFamily: fontFamily
        };

        this.layers.push(layer);
        this.updateTexture();

        if (this.onLayerAdded) {
            this.onLayerAdded(layer);
        }

        return layer;
    }
    
    addLogoLayer(image, name = null) {
        return this.addLayer('logo', image, name || 'Logo Layer');
    }
    
    removeLayer(layerId) {
        const index = this.layers.findIndex(layer => layer.id === layerId);
        if (index === -1) return false;
        
        const layer = this.layers[index];
        
        // Proper memory cleanup for layer resources
        this.cleanupLayerResources(layer);
        
        this.layers.splice(index, 1);
        
        if (this.selectedLayer && this.selectedLayer.id === layerId) {
            this.selectedLayer = null;
        }
        
        // Mark base as dirty since layer removal affects entire texture
        this.markBaseDirty();
        this.updateTexture();
        
        if (this.onLayerRemoved) {
            this.onLayerRemoved(layer);
        }
        
        return true;
    }
    
    cleanupLayerResources(layer) {
        // Clean up cached text metrics
        if (layer.type === 'text' && layer.id) {
            this.textMetricsCache.delete(layer.id);
        }
        
        // Clean up image references to help garbage collection
        if (layer.image && typeof layer.image === 'object') {
            // Don't dispose of canvas textures that might be shared
            if (layer.image.tagName !== 'CANVAS') {
                layer.image.onload = null;
                layer.image.onerror = null;
            }
        }
        
        // Clear references to help garbage collection
        layer.image = null;
        layer.onUpdate = null;
        
        console.log('🧹 Cleaned up resources for layer:', layer.id);
    }
    
    selectLayer(layerId) {
        console.log('🎯 selectLayer called with:', layerId);
        if (layerId === null) {
            this.selectedLayer = null;
        } else {
            this.selectedLayer = this.layers.find(layer => layer.id === layerId) || null;
        }
        console.log('🎯 selectedLayer is now:', this.selectedLayer);
        
        if (this.onLayerSelected) {
            this.onLayerSelected(this.selectedLayer);
        }
    }
    
    updateLayer(layerId, properties) {
        const layer = this.layers.find(layer => layer.id === layerId);
        if (!layer) return false;
        
        // Update layer properties
        Object.assign(layer, properties);
        
        // Invalidate cached metrics if text properties changed
        if (layer.type === 'text' && (properties.text || properties.fontSize || properties.fontFamily)) {
            this.textMetricsCache.delete(layer.id);
        }
        
        // Mark this specific layer as dirty for optimized updates
        this.markLayerDirty(layerId);
        this.updateTexture();
        
        if (this.onLayerUpdated) {
            this.onLayerUpdated(layer);
        }
        
        return true;
    }
    
    moveLayer(layerId, direction) {
        const index = this.layers.findIndex(layer => layer.id === layerId);
        if (index === -1) return false;
        
        let newIndex;
        if (direction === 'up' && index > 0) {
            newIndex = index - 1;
        } else if (direction === 'down' && index < this.layers.length - 1) {
            newIndex = index + 1;
        } else {
            return false;
        }
        
        // Swap layers
        [this.layers[index], this.layers[newIndex]] = [this.layers[newIndex], this.layers[index]];
        
        this.updateTexture();
        return true;
    }
    
    setLayerVisibility(layerId, visible) {
        const layer = this.layers.find(layer => layer.id === layerId);
        if (!layer) return false;
        
        layer.visible = visible;
        this.updateTexture();
        
        if (this.onLayerUpdated) {
            this.onLayerUpdated(layer);
        }
        
        return true;
    }
    
    setLayerOpacity(layerId, opacity) {
        return this.updateLayer(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
    }
    
    setLayerScale(layerId, scale) {
        return this.updateLayer(layerId, { scale: Math.max(0.1, Math.min(5, scale)) });
    }
    
    setLayerPosition(layerId, x, y) {
        return this.updateLayer(layerId, { x, y });
    }
    
    setLayerRotation(layerId, rotation) {
        return this.updateLayer(layerId, { rotation });
    }
    
    getLayers() {
        return [...this.layers];
    }
    
    getLayer(layerId) {
        return this.layers.find(layer => layer.id === layerId) || null;
    }
    
    getSelectedLayer() {
        return this.selectedLayer;
    }
    
    exportTexture() {
        if (!this.textureCanvas) return null;
        
        try {
            return this.textureCanvas.toDataURL('image/png');
        } catch (error) {
            const exportError = new ApplicationError('textureExportFailed', error, {
                userMessage: i18n.t('errors.texture.exportFailed'),
                context: { operation: 'exportTexture' }
            });
            errorManager.handleError(exportError);
            return null;
        }
    }
    
    // Reset all layer transforms to default values
    resetLayerTransforms(layerId) {
        return this.updateLayer(layerId, {
            x: 0,
            y: 0,
            scale: 1.0,
            rotation: 0,
            opacity: 1.0
        });
    }
    
    // Clear all layers and reset texture
    clearLayers() {
        this.layers = [];
        this.selectedLayer = null;
        this.updateBaseTexture(); // Redraw base texture without layers
        this.updateTexture(); // Update the Three.js texture
    }
    
    getTexture() {
        return this.texture;
    }
    
    getCanvas() {
        return this.textureCanvas;
    }
    
    dispose() {
        if (this.texture) {
            this.texture.dispose();
        }
    }
    
    // Session-related methods
    createLayerFromSessionData(sessionLayerData) {
        const layer = {
            id: sessionLayerData.id,
            type: sessionLayerData.type,
            name: sessionLayerData.name,
            visible: sessionLayerData.visible,
            x: sessionLayerData.properties.x || 0,
            y: sessionLayerData.properties.y || 0,
            position: { 
                x: sessionLayerData.properties.x || 0, 
                y: sessionLayerData.properties.y || 0 
            },
            scale: sessionLayerData.properties.scale || 1,
            rotation: sessionLayerData.properties.rotation || 0,
            opacity: sessionLayerData.properties.opacity || 1,
            image: null,
            sessionData: sessionLayerData,
            sessionUploaded: true  // Mark as already uploaded since it came from server
        };
        
        // Add type-specific properties
        if (sessionLayerData.type === 'text') {
            layer.text = sessionLayerData.properties.text || 'Text';
            layer.color = sessionLayerData.properties.color || '#000000';
            layer.fontSize = sessionLayerData.properties.fontSize || 24;
            layer.fontFamily = sessionLayerData.properties.fontFamily || 'Arial';
        }
        
        
        this.layers.push(layer);
        
        if (this.onLayerAdded) {
            this.onLayerAdded(layer);
        }
        
        return layer;
    }
    
    async loadLayerImage(layer, imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                layer.image = img;
                this.updateTexture();
                console.log(`✅ Loaded image for layer: ${layer.id}`);
                resolve(layer);
            };
            
            img.onerror = (error) => {
                const loadError = new LayerError('loadFailed', layer.id, error, {
                    userMessage: i18n.t('errors.layer.loadFailed', { layerId: layer.id })
                });
                errorManager.handleError(loadError);
                reject(loadError);
            };
            
            img.src = imageUrl;
        });
    }
    
    getLayerSessionData() {
        return this.layers.map(layer => ({
            id: layer.id,
            type: layer.type,
            name: layer.name,
            visible: layer.visible,
            properties: {
                x: layer.x,
                y: layer.y,
                scale: layer.scale,
                rotation: layer.rotation,
                opacity: layer.opacity
            }
        }));
    }
    
    // Missing methods needed for layer interaction
    toggleLayerLock(layerId) {
        const layer = this.layers.find(layer => layer.id === layerId);
        if (!layer) return false;
        
        layer.locked = !layer.locked;
        
        // If we're locking the currently selected layer, deselect it
        if (layer.locked && this.selectedLayer && this.selectedLayer.id === layerId) {
            this.selectLayer(null);
        }
        
        if (this.onLayerUpdated) {
            this.onLayerUpdated(layer);
        }
        
        return layer.locked;
    }
    
    getLayerAtPosition(x, y) {
        // Convert normalized coordinates to canvas coordinates
        if (!this.textureCanvas) return null;
        
        const canvasX = x * this.textureCanvas.width;
        const canvasY = y * this.textureCanvas.height;
        
        // Check layers in reverse order (top to bottom)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible || layer.locked) continue;
            
            const layerX = (layer.position?.x || 0) * this.textureCanvas.width;
            const layerY = (layer.position?.y || 0) * this.textureCanvas.height;
            const scale = layer.scale || 1.0;
            const rotation = (layer.rotation || 0) * Math.PI / 180; // Convert to radians
            
            let layerWidth, layerHeight;
            
            if (layer.type === 'text') {
                // For text layers, get more accurate bounds using canvas measureText
                const fontSize = layer.fontSize || 24;
                const text = layer.text || 'Text';
                
                // Create temporary canvas context to measure text
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.font = `${fontSize}px ${layer.fontFamily || 'Arial'}`;
                
                const textMetrics = tempCtx.measureText(text);
                layerWidth = textMetrics.width * scale;
                layerHeight = fontSize * 1.2 * scale; // Add some padding above/below
            } else if (layer.image) {
                // For image layers
                layerWidth = layer.image.width * scale;
                layerHeight = layer.image.height * scale;
            } else {
                continue; // Skip layers without image or text
            }
            
            // Transform click point to layer's local coordinate system
            // First, translate to layer center
            const dx = canvasX - layerX;
            const dy = canvasY - layerY;
            
            // Then, apply inverse rotation to get local coordinates
            const cos = Math.cos(-rotation); // Negative for inverse rotation
            const sin = Math.sin(-rotation);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            
            // Check if point is within layer bounds (centered positioning with padding)
            const padding = 10; // Add padding to make selection easier
            const halfWidth = (layerWidth / 2) + padding;
            const halfHeight = (layerHeight / 2) + padding;
            
            console.log(`Hit test layer "${layer.name}": click(${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}) -> local(${localX.toFixed(1)}, ${localY.toFixed(1)}) vs bounds(-${halfWidth.toFixed(1)} to ${halfWidth.toFixed(1)}, -${halfHeight.toFixed(1)} to ${halfHeight.toFixed(1)}) rotation=${(layer.rotation || 0)}°`);
            
            if (localX >= -halfWidth && localX <= halfWidth &&
                localY >= -halfHeight && localY <= halfHeight) {
                console.log(`✅ Hit detected on layer: ${layer.name} (rotation-aware)`);
                return layer;
            }
        }
        
        return null;
    }
    
    dispose() {
        // Cancel any pending texture updates
        if (this.textureUpdateTimeout) {
            cancelAnimationFrame(this.textureUpdateTimeout);
            this.textureUpdateTimeout = null;
        }
        
        // Clean up all layers
        for (const layer of this.layers) {
            this.cleanupLayerResources(layer);
        }
        
        // Clear arrays and caches
        this.layers.length = 0;
        this.textMetricsCache.clear();
        this.dirtyRegions.clear();
        this.selectedLayer = null;
        
        // Clean up canvas and texture
        if (this.texture) {
            // Only dispose texture if it's not being used elsewhere
            if (!this.texture.isCanvasTexture || this.texture.refCount === undefined || this.texture.refCount <= 1) {
                this.texture.dispose();
            }
            this.texture = null;
        }
        
        // Clear canvas references
        this.textureCanvas = null;
        this.textureContext = null;
        this.baseTextureImage = null;
        
        // Clear callbacks
        this.onLayerAdded = null;
        this.onLayerRemoved = null;
        this.onLayerSelected = null;
        this.onLayerUpdated = null;
        this.onTextureUpdated = null;
        
        // Clear hybrid system reference
        this.modelCache = null;

        console.log('🧹 LayerManager disposed - all resources cleaned up');
    }

    // ================================
    // HYBRID GLB SYSTEM INTEGRATION
    // ================================

    /**
     * Connect LayerManager to ModelCache for hybrid GLB system
     * @param {ModelCache} modelCache - The ModelCache instance from SceneManager
     */
    setModelCache(modelCache) {
        console.log('🔧 LayerManager.setModelCache called with:', modelCache ? 'ModelCache instance' : 'null');
        this.modelCache = modelCache;
        if (this.modelCache && this.textureCanvas) {
            this.modelCache.setSharedTextureCanvas(this.textureCanvas);
            console.log('🎯 LayerManager connected to ModelCache successfully');
        } else {
            console.log('⚠️ LayerManager-ModelCache connection failed:', {
                hasModelCache: !!this.modelCache,
                hasTextureCanvas: !!this.textureCanvas
            });
        }
    }

    /**
     * Update texture canvas reference for ModelCache
     * Called when texture canvas is recreated
     */
    updateModelCacheCanvas() {
        console.log('🔄 LayerManager.updateModelCacheCanvas called:', {
            hasModelCache: !!this.modelCache,
            hasTextureCanvas: !!this.textureCanvas
        });
        if (this.modelCache && this.textureCanvas) {
            this.modelCache.setSharedTextureCanvas(this.textureCanvas);
            console.log('✅ LayerManager successfully updated ModelCache canvas reference');
        }
    }
}