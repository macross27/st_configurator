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
    
    setBaseTexture(image) {
        this.baseTextureImage = image;
        if (this.textureCanvas && image) {
            this.textureCanvas.width = image.width;
            this.textureCanvas.height = image.height;
        }
        this.updateBaseTexture();
    }
    
    addTextLayer(options = {}) {
        const offsetX = (this.layers.length * 0.1) % 0.8 + 0.1;
        const offsetY = (this.layers.length * 0.15) % 0.6 + 0.2;
        
        const layer = {
            id: Date.now(),
            type: 'text',
            name: options.name || `Text Layer ${this.layers.length + 1}`,
            text: options.text || `Text ${this.layers.length + 1}`,
            position: options.position || { x: offsetX, y: offsetY },
            rotation: options.rotation || 0,
            scale: options.scale || 1,
            color: options.color || '#ffffff',
            fontSize: options.fontSize || 24,
            opacity: options.opacity || 1,
            locked: options.locked || false
        };
        
        this.layers.push(layer);
        this.selectLayer(layer);
        this.updateBaseTexture();
        
        if (this.onLayerAdded) {
            this.onLayerAdded(layer);
        }
        
        return layer;
    }
    
    addLogoLayer(image, options = {}) {
        const layer = {
            id: options.id || Date.now(),
            type: 'logo',
            name: options.name || 'Logo Layer',
            position: options.position || { x: 0.5, y: 0.5 },
            rotation: options.rotation || 0,
            scale: options.scale || 1,
            opacity: options.opacity || 1,
            image: image,
            locked: options.locked || false,
            assetId: options.assetId,
            serverImageUrl: options.serverImageUrl
        };
        
        this.layers.push(layer);
        this.selectLayer(layer);
        this.updateBaseTexture();
        
        if (this.onLayerAdded) {
            this.onLayerAdded(layer);
        }
        
        return layer;
    }
    
    selectLayer(layer) {
        this.selectedLayer = layer;
        this.updateBaseTexture();
        
        if (this.onLayerSelected) {
            this.onLayerSelected(layer);
        }
    }
    
    getSelectedLayer() {
        return this.selectedLayer;
    }
    
    updateLayer(layer, properties) {
        Object.assign(layer, properties);
        this.updateBaseTexture();
        
        if (this.onLayerUpdated) {
            this.onLayerUpdated(layer);
        }
    }
    
    duplicateLayer(layer) {
        const newLayer = { 
            ...layer, 
            id: Date.now(), 
            name: layer.name + ' Copy' 
        };
        this.layers.push(newLayer);
        this.updateBaseTexture();
        
        if (this.onLayerAdded) {
            this.onLayerAdded(newLayer);
        }
        
        return newLayer;
    }
    
    deleteLayer(layer) {
        const index = this.layers.indexOf(layer);
        if (index > -1) {
            this.layers.splice(index, 1);
            
            if (this.selectedLayer === layer) {
                this.selectedLayer = null;
            }
            
            this.updateBaseTexture();
            
            if (this.onLayerRemoved) {
                this.onLayerRemoved(layer);
            }
        }
    }
    
    toggleLayerLock(layer) {
        layer.locked = !layer.locked;
        
        if (layer.locked && this.selectedLayer === layer) {
            this.selectLayer(null);
        }
        
        this.updateBaseTexture();
        
        if (this.onLayerUpdated) {
            this.onLayerUpdated(layer);
        }
    }
    
    getLayerAtPosition(u, v) {
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            
            if (layer.locked) {
                continue;
            }
            
            const bounds = this.getLayerBounds(layer);
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
            const fontSizeInUV = layer.fontSize / this.textureCanvas.height;
            const estimatedWidth = layer.text.length * fontSizeInUV * 0.6;
            const estimatedHeight = fontSizeInUV;
            
            return {
                width: Math.max(0.02, estimatedWidth * layer.scale),
                height: Math.max(0.02, estimatedHeight * layer.scale)
            };
        } else if (layer.type === 'logo' && layer.image) {
            const imageWidthInUV = layer.image.width / this.textureCanvas.width;
            const imageHeightInUV = layer.image.height / this.textureCanvas.height;
            
            return {
                width: Math.max(0.02, imageWidthInUV * layer.scale),
                height: Math.max(0.02, imageHeightInUV * layer.scale)
            };
        }
        
        return {
            width: 0.05 * layer.scale,
            height: 0.05 * layer.scale
        };
    }
    
    updateBaseTexture(primaryColor = '#ffffff', secondaryColor = '#000000') {
        if (!this.textureCanvas || !this.textureContext) return;
        
        const ctx = this.textureContext;
        const canvas = this.textureCanvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.baseTextureImage) {
            ctx.drawImage(this.baseTextureImage, 0, 0);
            
            if (primaryColor !== '#ffffff') {
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = primaryColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            ctx.fillStyle = primaryColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = secondaryColor;
            for (let i = 0; i < canvas.width; i += 40) {
                ctx.fillRect(i, 0, 20, canvas.height);
            }
        }
        
        this.renderLayers();
        
        if (this.texture) {
            this.texture.needsUpdate = true;
        }
        
        if (this.onTextureUpdated) {
            this.onTextureUpdated(this.texture);
        }
    }
    
    renderLayers() {
        if (!this.textureContext) return;
        
        const ctx = this.textureContext;
        
        this.layers.forEach(layer => {
            ctx.save();
            
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
            
            if (this.selectedLayer === layer) {
                ctx.strokeStyle = '#4a90e2';
                ctx.lineWidth = 2 / layer.scale;
                ctx.setLineDash([5 / layer.scale, 5 / layer.scale]);
                
                let bounds = { width: 0, height: 0 };
                
                if (layer.type === 'text') {
                    const textWidth = ctx.measureText(layer.text).width;
                    const textHeight = layer.fontSize;
                    bounds = { width: textWidth + 10, height: textHeight + 10 };
                    ctx.strokeRect(-bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
                } else if (layer.type === 'logo' && layer.image) {
                    const img = layer.image;
                    bounds = { width: img.width + 10, height: img.height + 10 };
                    ctx.strokeRect(-bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
                }
                
                ctx.setLineDash([]);
            }
            
            ctx.restore();
        });
    }
    
    getLayers() {
        return [...this.layers];
    }
    
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
}