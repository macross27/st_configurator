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

    async createCompositeTexture(patternData, colors, additionalTextures = null) {
        console.log('🎨 createCompositeTexture called with:', {
            patternName: patternData?.name,
            colors: colors,
            colorsLength: colors?.length,
            additionalTextures: additionalTextures
        });

        if (!patternData || !colors || colors.length === 0) {
            console.error('❌ Invalid pattern data or colors:', { patternData, colors });
            throw new Error('Invalid pattern data or colors');
        }

        // Create cache key including additional textures
        const additionalKey = additionalTextures ? JSON.stringify(additionalTextures) : 'none';
        const cacheKey = `${patternData.name}_${colors.join('_')}_${additionalKey}`;

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
        // PATTERN LAYERS - using 1_2_3.png RGB channels
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

        // ADDITIONAL TEXTURE LAYERS - using pants/neck textures
        if (additionalTextures) {
            console.log('🎨 Processing additional textures:', additionalTextures);
            await this.addAdditionalTextureLayers(additionalTextures, textureSize);
        } else {
            console.log('⚠️ No additional textures provided');
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

    async addAdditionalTextureLayers(additionalTextures, textureSize) {
        console.log('🎨 Adding additional texture layers:', additionalTextures);

        // Process each additional texture type (pants, neck, etc.)
        for (const textureType of Object.keys(additionalTextures)) {
            const textureData = additionalTextures[textureType];
            console.log(`🎨 Processing ${textureType} texture:`, textureData);

            console.log(`🎨 DEBUG: Checking ${textureType} texture data:`, {
                hasImagePath: !!textureData.imagePath,
                hasColors: !!textureData.colors,
                colorsLength: textureData.colors?.length,
                colors: textureData.colors
            });

            if (textureData.imagePath && textureData.colors && textureData.colors.length > 0) {
                console.log(`🎨 Processing ${textureType} texture - path: ${textureData.imagePath}`);

                // Load the texture mask
                const maskTexture = await this.loadTexture(textureData.imagePath);

                // Create temporary canvas for this texture's mask
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = textureSize;
                tempCanvas.height = textureSize;

                // Disable image smoothing
                tempCtx.imageSmoothingEnabled = false;

                // Draw mask and extract image data
                tempCtx.drawImage(maskTexture, 0, 0, textureSize, textureSize);
                const maskImageData = tempCtx.getImageData(0, 0, textureSize, textureSize);

                // Create layers for each color (using red/green channels)
                textureData.colors.forEach((color, colorIndex) => {
                    if (color) {
                        console.log(`🎨 Creating ${textureType} layer ${colorIndex + 1} with color ${color}`);
                        // For pants/neck textures, use red channel for color 1, green for color 2
                        const channelIndex = colorIndex; // 0 = red, 1 = green
                        const layerTexture = this.createAdditionalLayerTexture(
                            maskImageData,
                            channelIndex,
                            color,
                            textureSize
                        );

                        // Composite this layer on top of existing layers
                        this.ctx.drawImage(layerTexture, 0, 0);
                        console.log(`✅ ${textureType} layer ${colorIndex + 1} composited`);
                    } else {
                        console.log(`⚠️ ${textureType} color ${colorIndex + 1} is empty, skipping`);
                    }
                });
            } else {
                console.log(`⚠️ Skipping ${textureType} texture:`, {
                    reason: !textureData.imagePath ? 'no imagePath' :
                           !textureData.colors ? 'no colors array' :
                           textureData.colors.length === 0 ? 'empty colors array' : 'unknown',
                    textureData
                });
            }
        }
    }

    createAdditionalLayerTexture(maskImageData, channelIndex, colorHex, textureSize) {
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

        let nonZeroPixels = 0;
        let maxMaskValue = 0;
        for (let i = 0; i < maskData.length; i += 4) {
            const maskValue = maskData[i + channelIndex] / 255; // Get channel value (0-1)

            if (maskValue > 0) {
                nonZeroPixels++;
                maxMaskValue = Math.max(maxMaskValue, maskValue);
            }

            // Set pixel color with mask as alpha
            layerData[i] = color.r;     // R
            layerData[i + 1] = color.g; // G
            layerData[i + 2] = color.b; // B
            layerData[i + 3] = Math.round(maskValue * 255); // A (alpha from mask)
        }

        console.log(`🔍 Additional layer channel ${channelIndex} stats: ${nonZeroPixels} non-zero pixels, max value: ${maxMaskValue.toFixed(3)}`);
        if (nonZeroPixels === 0) {
            console.warn(`⚠️ Additional layer channel ${channelIndex} has NO visible pixels!`);
        }

        layerCtx.putImageData(layerImageData, 0, 0);
        return layerCanvas;
    }

    // Get current colors from UI
    getCurrentColors(patternName = null) {
        const colors = [];
        // Use pattern-color pickers for all patterns
        const colorPickers = document.querySelectorAll('#pattern-color-1, #pattern-color-2, #pattern-color-3, #pattern-color-4, #pattern-color-5');

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

    // Get additional texture colors from UI
    getAdditionalTextureColors() {
        const additionalTextures = {
            pants: {
                imagePath: 'assets/textures/pants/1_2.png',
                colors: []
            },
            neck: {
                imagePath: 'assets/textures/neck/1_2.png',
                colors: []
            }
        };

        // Get pants colors
        const pantsColor1 = document.querySelector('#pants-color-1');
        const pantsColor2 = document.querySelector('#pants-color-2');

        console.log('🎨 DEBUG: Pants color picker elements found:', {
            pantsColor1: !!pantsColor1,
            pantsColor2: !!pantsColor2,
            pantsValue1: pantsColor1?.value,
            pantsValue2: pantsColor2?.value
        });

        if (pantsColor1) additionalTextures.pants.colors.push(pantsColor1.value);
        if (pantsColor2) additionalTextures.pants.colors.push(pantsColor2.value);

        // Get neck colors
        const neckColor1 = document.querySelector('#neck-color-1');
        const neckColor2 = document.querySelector('#neck-color-2');

        console.log('🎨 DEBUG: Neck color picker elements found:', {
            neckColor1: !!neckColor1,
            neckColor2: !!neckColor2,
            neckValue1: neckColor1?.value,
            neckValue2: neckColor2?.value
        });

        if (neckColor1) additionalTextures.neck.colors.push(neckColor1.value);
        if (neckColor2) additionalTextures.neck.colors.push(neckColor2.value);

        console.log('🎨 Additional texture colors final result:', additionalTextures);
        return additionalTextures;
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