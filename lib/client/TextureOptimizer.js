/**
 * TextureOptimizer - Performance optimization for texture management
 * Implements dynamic resolution, caching, and GPU-friendly formats
 */

import * as THREE from 'three';

export class TextureOptimizer {
    constructor(options = {}) {
        // Configuration with sensible defaults
        this.config = {
            maxTextureSize: options.maxTextureSize || 1024, // Reduced from 2048
            enableMipmaps: options.enableMipmaps !== false,
            enableCompression: options.enableCompression !== false,
            cacheEnabled: options.cacheEnabled !== false,
            dynamicResolution: options.dynamicResolution !== false,
            ...options
        };

        // Texture cache to avoid recreation
        this.textureCache = new Map();

        // Performance metrics
        this.metrics = {
            texturesOptimized: 0,
            memorySaved: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        // WebGL capabilities detection
        this.detectCapabilities();
    }

    /**
     * Detect WebGL capabilities for optimization decisions
     */
    detectCapabilities() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (gl) {
            this.capabilities = {
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxAnisotropy: gl.getExtension('EXT_texture_filter_anisotropic')
                    ? gl.getParameter(gl.getExtension('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT)
                    : 1,
                supportsFloat: !!gl.getExtension('OES_texture_float'),
                supportsCompression: {
                    dxt: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
                    pvrtc: !!gl.getExtension('WEBGL_compressed_texture_pvrtc'),
                    etc1: !!gl.getExtension('WEBGL_compressed_texture_etc1'),
                    astc: !!gl.getExtension('WEBGL_compressed_texture_astc')
                }
            };

            // Adjust max texture size based on device capabilities
            this.config.maxTextureSize = Math.min(
                this.config.maxTextureSize,
                this.capabilities.maxTextureSize
            );
        }

        console.log('🎨 Texture optimizer capabilities:', this.capabilities);
    }

    /**
     * Optimize a canvas for GPU upload
     */
    optimizeCanvas(canvas, options = {}) {
        const targetSize = options.targetSize || this.config.maxTextureSize;

        // Check if resizing is needed
        if (canvas.width > targetSize || canvas.height > targetSize) {
            return this.resizeCanvas(canvas, targetSize);
        }

        // Ensure power-of-two dimensions for better GPU performance
        if (this.config.enableMipmaps) {
            return this.ensurePowerOfTwo(canvas);
        }

        return canvas;
    }

    /**
     * Resize canvas to target size while maintaining aspect ratio
     */
    resizeCanvas(canvas, maxSize) {
        const aspect = canvas.width / canvas.height;
        let newWidth, newHeight;

        if (canvas.width > canvas.height) {
            newWidth = maxSize;
            newHeight = Math.floor(maxSize / aspect);
        } else {
            newHeight = maxSize;
            newWidth = Math.floor(maxSize * aspect);
        }

        // Create optimized canvas
        const optimizedCanvas = document.createElement('canvas');
        optimizedCanvas.width = newWidth;
        optimizedCanvas.height = newHeight;
        const ctx = optimizedCanvas.getContext('2d');

        // Use high-quality downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

        const savedMemory = ((canvas.width * canvas.height) - (newWidth * newHeight)) * 4 / (1024 * 1024);
        this.metrics.memorySaved += savedMemory;

        console.log(`📉 Resized texture from ${canvas.width}x${canvas.height} to ${newWidth}x${newHeight} (saved ${savedMemory.toFixed(2)}MB)`);

        return optimizedCanvas;
    }

    /**
     * Ensure canvas dimensions are power of two for optimal GPU performance
     */
    ensurePowerOfTwo(canvas) {
        const isPowerOfTwo = (n) => (n & (n - 1)) === 0;

        if (isPowerOfTwo(canvas.width) && isPowerOfTwo(canvas.height)) {
            return canvas;
        }

        const nextPowerOfTwo = (n) => {
            let power = 1;
            while (power < n) power *= 2;
            return power;
        };

        const newWidth = nextPowerOfTwo(canvas.width);
        const newHeight = nextPowerOfTwo(canvas.height);

        const optimizedCanvas = document.createElement('canvas');
        optimizedCanvas.width = newWidth;
        optimizedCanvas.height = newHeight;
        const ctx = optimizedCanvas.getContext('2d');

        // Center the original image
        const offsetX = (newWidth - canvas.width) / 2;
        const offsetY = (newHeight - canvas.height) / 2;
        ctx.drawImage(canvas, offsetX, offsetY);

        return optimizedCanvas;
    }

    /**
     * Create optimized Three.js texture from canvas
     */
    createOptimizedTexture(canvas, options = {}) {
        const cacheKey = options.cacheKey || `texture_${canvas.width}x${canvas.height}`;

        // Check cache first
        if (this.config.cacheEnabled && this.textureCache.has(cacheKey)) {
            this.metrics.cacheHits++;
            const cachedTexture = this.textureCache.get(cacheKey);
            cachedTexture.needsUpdate = true;
            return cachedTexture;
        }

        this.metrics.cacheMisses++;

        // Optimize canvas before creating texture
        const optimizedCanvas = this.optimizeCanvas(canvas, options);

        // Create texture with optimal settings
        const texture = new THREE.CanvasTexture(optimizedCanvas);

        // Apply optimal texture settings
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;

        // Mipmapping settings
        if (this.config.enableMipmaps && this.isPowerOfTwo(optimizedCanvas)) {
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
        } else {
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
        }

        // Anisotropic filtering for better quality at angles
        if (this.capabilities && this.capabilities.maxAnisotropy > 1) {
            texture.anisotropy = Math.min(4, this.capabilities.maxAnisotropy);
        }

        // Wrapping mode
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        // Cache the texture
        if (this.config.cacheEnabled) {
            this.textureCache.set(cacheKey, texture);
        }

        this.metrics.texturesOptimized++;

        return texture;
    }

    /**
     * Check if dimensions are power of two
     */
    isPowerOfTwo(canvas) {
        const isPOT = (n) => (n & (n - 1)) === 0 && n !== 0;
        return isPOT(canvas.width) && isPOT(canvas.height);
    }

    /**
     * Get dynamic texture resolution based on distance
     */
    getDynamicResolution(distance, baseResolution = 2048) {
        if (!this.config.dynamicResolution) {
            return Math.min(baseResolution, this.config.maxTextureSize);
        }

        // Adjust resolution based on camera distance
        if (distance > 10) return 512;
        if (distance > 5) return 1024;
        if (distance > 2) return 1536;
        return Math.min(baseResolution, this.config.maxTextureSize);
    }

    /**
     * Clear texture cache
     */
    clearCache() {
        for (const texture of this.textureCache.values()) {
            texture.dispose();
        }
        this.textureCache.clear();
        this.metrics.cacheHits = 0;
        this.metrics.cacheMisses = 0;
        console.log('🗑️ Texture cache cleared');
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.textureCache.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
        };
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearCache();
        this.textureCache = null;
        console.log('🗑️ TextureOptimizer disposed');
    }
}

/**
 * Canvas pool for reducing allocation overhead
 */
export class CanvasPool {
    constructor(maxPoolSize = 5) {
        this.pool = [];
        this.maxPoolSize = maxPoolSize;
        this.inUse = new Set();
    }

    /**
     * Get a canvas from the pool or create new one
     */
    acquire(width, height) {
        // Look for matching canvas in pool
        for (let i = 0; i < this.pool.length; i++) {
            const canvas = this.pool[i];
            if (!this.inUse.has(canvas) &&
                canvas.width === width &&
                canvas.height === height) {
                this.inUse.add(canvas);
                return canvas;
            }
        }

        // Create new canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Add to pool if space available
        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(canvas);
        }

        this.inUse.add(canvas);
        return canvas;
    }

    /**
     * Return canvas to pool
     */
    release(canvas) {
        this.inUse.delete(canvas);

        // Clear canvas for reuse
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Clear the pool
     */
    clear() {
        this.pool = [];
        this.inUse.clear();
    }
}

// Export singleton instance for easy use
export const textureOptimizer = new TextureOptimizer();
export const canvasPool = new CanvasPool();