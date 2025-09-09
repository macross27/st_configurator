import * as THREE from 'three';

export class LayerManager {
    constructor() {
        this.layers = [];
        this.selectedLayer = null;
        this.textureCanvas = null;
        this.textureContext = null;
        this.baseTextureImage = null;
        this.texture = null;
        
        this.onLayerAdded = null;
        this.onLayerRemoved = null;
        this.onLayerSelected = null;
        this.onLayerUpdated = null;
        this.onTextureUpdated = null;
    }
    
    initializeTexture(width = 512, height = 512, baseImage = null) {
        this.textureCanvas = document.createElement('canvas');
        this.textureCanvas.width = width;
        this.textureCanvas.height = height;
        this.textureContext = this.textureCanvas.getContext('2d');
        this.baseTextureImage = baseImage;
        
        this.texture = new THREE.CanvasTexture(this.textureCanvas);
        this.texture.flipY = false;
        this.texture.needsUpdate = true;
        
        this.updateBaseTexture();
        
        return this.texture;
    }
    
    updateBaseTexture(primaryColor = '#ff6600', secondaryColor = '#0066ff') {
        if (!this.textureContext) return;
        
        const width = this.textureCanvas.width;
        const height = this.textureCanvas.height;
        
        if (this.baseTextureImage) {
            // Draw the base image if available
            this.textureContext.drawImage(this.baseTextureImage, 0, 0, width, height);
            
            // Apply color overlay/tint if needed
            this.textureContext.globalCompositeOperation = 'multiply';
            this.textureContext.fillStyle = primaryColor;
            this.textureContext.fillRect(0, 0, width, height);
            this.textureContext.globalCompositeOperation = 'source-over';
        } else {
            // Create a gradient background
            const gradient = this.textureContext.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(1, secondaryColor);
            
            this.textureContext.fillStyle = gradient;
            this.textureContext.fillRect(0, 0, width, height);
        }
        
        // Re-draw all layers on top
        this.updateTexture();
    }
    
    updateTexture() {
        if (!this.textureContext) return;
        
        // Store current state
        this.textureContext.save();
        
        // Clear and redraw base texture
        this.updateBaseTexture();
        
        // Draw all visible layers
        for (const layer of this.layers) {
            if (layer.visible && layer.image) {
                this.drawLayer(layer);
            }
        }
        
        // Restore state
        this.textureContext.restore();
        
        if (this.texture) {
            this.texture.needsUpdate = true;
            
            if (this.onTextureUpdated) {
                this.onTextureUpdated(this.texture);
            }
        }
    }
    
    drawLayer(layer) {
        if (!layer.image || !this.textureContext) return;
        
        const canvas = this.textureCanvas;
        const ctx = this.textureContext;
        
        ctx.save();
        
        // Set opacity
        ctx.globalAlpha = layer.opacity || 1.0;
        
        // Calculate position and size
        const x = (layer.x || 0) * canvas.width;
        const y = (layer.y || 0) * canvas.height;
        const scale = layer.scale || 1.0;
        const rotation = layer.rotation || 0;
        
        // Calculate image size
        const imgWidth = layer.image.width * scale;
        const imgHeight = layer.image.height * scale;
        
        // Set transform
        ctx.translate(x + imgWidth / 2, y + imgHeight / 2);
        ctx.rotate(rotation);
        
        // Draw the image
        ctx.drawImage(layer.image, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        
        ctx.restore();
    }
    
    addLayer(type, image, name = null) {
        const id = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        const layer = {
            id: id,
            type: type,
            name: name || `${type} Layer ${this.layers.length + 1}`,
            visible: true,
            x: 0.0,
            y: 0.0,
            scale: 1.0,
            rotation: 0,
            opacity: 1.0,
            image: image
        };
        
        this.layers.push(layer);
        this.updateTexture();
        
        if (this.onLayerAdded) {
            this.onLayerAdded(layer);
        }
        
        return layer;
    }
    
    removeLayer(layerId) {
        const index = this.layers.findIndex(layer => layer.id === layerId);
        if (index === -1) return false;
        
        const layer = this.layers[index];
        this.layers.splice(index, 1);
        
        if (this.selectedLayer && this.selectedLayer.id === layerId) {
            this.selectedLayer = null;
        }
        
        this.updateTexture();
        
        if (this.onLayerRemoved) {
            this.onLayerRemoved(layer);
        }
        
        return true;
    }
    
    selectLayer(layerId) {
        if (layerId === null) {
            this.selectedLayer = null;
        } else {
            this.selectedLayer = this.layers.find(layer => layer.id === layerId) || null;
        }
        
        if (this.onLayerSelected) {
            this.onLayerSelected(this.selectedLayer);
        }
    }
    
    updateLayer(layerId, properties) {
        const layer = this.layers.find(layer => layer.id === layerId);
        if (!layer) return false;
        
        // Update layer properties
        Object.assign(layer, properties);
        
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
            console.error('Error exporting texture:', error);
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
        this.updateBaseTexture();
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
            scale: sessionLayerData.properties.scale || 1,
            rotation: sessionLayerData.properties.rotation || 0,
            opacity: sessionLayerData.properties.opacity || 1,
            image: null,
            sessionData: sessionLayerData
        };
        
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
                console.error(`❌ Failed to load image for layer ${layer.id}:`, error);
                reject(new Error(`Failed to load layer image: ${layer.id}`));
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
}