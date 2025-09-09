import * as THREE from 'three';

export class LayerManager {
    constructor() {
        this.layers = [];
        this.selectedLayer = null;
        this.textureCanvas = null;
        this.textureContext = null;
        this.baseTextureImage = null;
        this.texture = null;
        
        // Store current colors for base texture
        this.currentPrimaryColor = '#ff6600';
        this.currentSecondaryColor = '#0066ff';
        
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
        
        // Store current colors for use in updateTexture()
        this.currentPrimaryColor = primaryColor;
        this.currentSecondaryColor = secondaryColor;
        
        const width = this.textureCanvas.width;
        const height = this.textureCanvas.height;
        
        // Clear the canvas first
        this.textureContext.clearRect(0, 0, width, height);
        
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
    }
    
    setBaseTexture(image) {
        this.baseTextureImage = image;
        this.updateBaseTexture(); // Just update the base texture, don't trigger full update
        if (this.texture) {
            this.texture.needsUpdate = true;
            if (this.onTextureUpdated) {
                this.onTextureUpdated(this.texture);
            }
        }
    }
    
    updateTexture() {
        if (!this.textureContext) return;
        
        // Store current state before any modifications
        this.textureContext.save();
        
        // First, redraw the base texture to clear any previous layer drawings
        this.updateBaseTexture(this.currentPrimaryColor, this.currentSecondaryColor);
        
        // Reset any state changes from base texture drawing
        this.textureContext.globalCompositeOperation = 'source-over';
        this.textureContext.globalAlpha = 1.0;
        
        // Draw all visible layers on top of fresh base texture
        for (const layer of this.layers) {
            if (layer.visible && (layer.image || layer.type === 'text')) {
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
        if (!this.textureContext) return;
        
        const canvas = this.textureCanvas;
        const ctx = this.textureContext;
        
        ctx.save();
        
        // Set opacity
        ctx.globalAlpha = layer.opacity || 1.0;
        
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
            
            ctx.fillStyle = color;
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 0, 0);
        } else if (layer.type === 'logo' && layer.image) {
            // Draw image layer
            const img = layer.image;
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
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
}