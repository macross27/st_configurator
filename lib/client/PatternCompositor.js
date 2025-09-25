import * as THREE from 'three';

export class PatternCompositor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.textureCache = new Map();
        this.compositeCache = new Map();
    }

    async loadTexture(imagePath) {
        if (this.textureCache.has(imagePath)) {
            console.log('🔄 Using cached texture:', imagePath);
            return this.textureCache.get(imagePath);
        }

        console.log('📥 Loading new texture:', imagePath);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                console.log('✅ Texture loaded successfully:', imagePath);
                this.textureCache.set(imagePath, img);
                resolve(img);
            };

            img.onerror = (error) => {
                console.error('❌ Failed to load texture:', imagePath, error);
                reject(new Error(`Failed to load texture: ${imagePath}`));
            };

            img.src = imagePath;
        });
    }

    async createCompositeTexture(patternData, colors) {
        console.log('🎨 createCompositeTexture called with:', {
            patternName: patternData?.name,
            colors: colors,
            colorsLength: colors?.length
        });

        if (!patternData || !colors || colors.length === 0) {
            console.error('❌ Invalid pattern data or colors:', { patternData, colors });
            throw new Error('Invalid pattern data or colors');
        }

        // Create cache key
        const cacheKey = `${patternData.name}_${colors.join('_')}`;

        console.log('🔍 Checking cache for:', cacheKey);

        if (this.compositeCache.has(cacheKey)) {
            console.log('✅ Using cached composite texture');
            return this.compositeCache.get(cacheKey);
        }

        console.log('🎨 Creating new composite texture');

        // Load the pattern mask texture first to get its dimensions
        const imagePath = `${patternData.texturePath}${patternData.files[0].filename}`;
        console.log('🖼️ Loading pattern texture from:', imagePath);

        const maskTexture = await this.loadTexture(imagePath);

        // Use actual source texture dimensions instead of hardcoded size
        let textureSize = Math.max(maskTexture.width, maskTexture.height);

        // Check WebGL texture size limits (most devices support at least 4096)
        const maxTextureSize = 4096; // Conservative limit for wide compatibility
        if (textureSize > maxTextureSize) {
            console.warn(`⚠️ Texture size ${textureSize}px exceeds safe limit, clamping to ${maxTextureSize}px`);
            textureSize = maxTextureSize;
        }

        console.log(`🎨 Using source texture dimensions: ${maskTexture.width}x${maskTexture.height}, canvas size: ${textureSize}x${textureSize}`);

        this.canvas.width = textureSize;
        this.canvas.height = textureSize;

        // Clear canvas
        this.ctx.clearRect(0, 0, textureSize, textureSize);

        // Disable image smoothing to preserve pixel-perfect quality for pattern masks
        this.ctx.imageSmoothingEnabled = false;
        if (this.ctx.webkitImageSmoothingEnabled !== undefined) {
            this.ctx.webkitImageSmoothingEnabled = false;
        }
        if (this.ctx.mozImageSmoothingEnabled !== undefined) {
            this.ctx.mozImageSmoothingEnabled = false;
        }

        // Create a temporary canvas for mask extraction
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        maskCanvas.width = textureSize;
        maskCanvas.height = textureSize;

        // Disable image smoothing on mask canvas too
        maskCtx.imageSmoothingEnabled = false;
        if (maskCtx.webkitImageSmoothingEnabled !== undefined) {
            maskCtx.webkitImageSmoothingEnabled = false;
        }
        if (maskCtx.mozImageSmoothingEnabled !== undefined) {
            maskCtx.mozImageSmoothingEnabled = false;
        }

        // Draw mask texture to extract RGB channels (preserve source resolution)
        maskCtx.drawImage(maskTexture, 0, 0, textureSize, textureSize);
        const maskImageData = maskCtx.getImageData(0, 0, textureSize, textureSize);

        // Create layers bottom to top (layer 1 = bottom, layer N = top)
        for (let layerIndex = 1; layerIndex <= patternData.layerCount; layerIndex++) {
            const colorHex = colors[layerIndex - 1];
            if (!colorHex) continue;

            const layerTexture = this.createLayerTexture(
                maskImageData,
                layerIndex,
                colorHex,
                textureSize
            );

            // Composite layer using "over" blend mode (default)
            this.ctx.drawImage(layerTexture, 0, 0);
        }

        // Create texture from canvas with maximum quality
        const compositeTexture = this.canvas.toDataURL('image/png', 1.0);
        console.log(`🎨 Created composite texture: ${this.canvas.width}x${this.canvas.height}px`);
        this.compositeCache.set(cacheKey, compositeTexture);

        return compositeTexture;
    }

    createLayerTexture(maskImageData, layerIndex, colorHex, textureSize) {
        const layerCanvas = document.createElement('canvas');
        const layerCtx = layerCanvas.getContext('2d');
        layerCanvas.width = textureSize;
        layerCanvas.height = textureSize;

        // Parse color
        const color = this.hexToRgb(colorHex);
        if (!color) {
            console.error('Invalid color:', colorHex);
            return layerCanvas;
        }

        // Create layer image data
        const layerImageData = layerCtx.createImageData(textureSize, textureSize);
        const layerData = layerImageData.data;
        const maskData = maskImageData.data;

        // Determine which channel to use for this layer
        const channelIndex = this.getChannelIndex(layerIndex);

        for (let i = 0; i < maskData.length; i += 4) {
            const maskValue = maskData[i + channelIndex] / 255; // Get channel value (0-1)

            // Set pixel color with mask as alpha
            layerData[i] = color.r;     // R
            layerData[i + 1] = color.g; // G
            layerData[i + 2] = color.b; // B
            layerData[i + 3] = Math.round(maskValue * 255); // A (alpha from mask)
        }

        layerCtx.putImageData(layerImageData, 0, 0);
        return layerCanvas;
    }

    getChannelIndex(layerIndex) {
        // Map layer numbers to RGB channels
        // Layer 1 -> R (index 0)
        // Layer 2 -> G (index 1)
        // Layer 3 -> B (index 2)
        return (layerIndex - 1) % 3;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    clearCache() {
        this.compositeCache.clear();
    }

    clearTextureCache() {
        this.textureCache.clear();
    }

    // Get current colors from UI
    getCurrentColors(patternName = null) {
        const colors = [];
        let colorPickers;

        if (patternName === 'pants') {
            // For pants pattern, use the pants color pickers
            colorPickers = document.querySelectorAll('#pants-color-1, #pants-color-2');
        } else {
            // For other patterns, use the body color pickers
            colorPickers = document.querySelectorAll('#body-color-1, #body-color-2, #body-color-3, #body-color-4, #body-color-5');
        }

        console.log(`🎨 Found ${colorPickers.length} color pickers for pattern: ${patternName || 'default'}`);

        colorPickers.forEach((picker, index) => {
            if (picker && picker.offsetParent !== null) { // Check if visible
                console.log(`🎨 Color picker ${index + 1}: ${picker.value}`);
                colors.push(picker.value);
            } else {
                console.log(`🎨 Color picker ${index + 1}: not visible or not found`);
            }
        });

        console.log('🎨 Final colors array:', colors);
        return colors;
    }

    // Convert canvas to Three.js texture
    createThreeTexture(compositeDataUrl) {
        console.log('🎨 Creating Three.js texture from composite');

        const img = new Image();
        img.src = compositeDataUrl;

        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;

        // Re-enable mipmapping now that canvas size issue is fixed
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Ensure texture is marked for update after image loads
        img.onload = () => {
            texture.needsUpdate = true;
            console.log('✅ Three.js texture created and updated');
        };

        return texture;
    }
}