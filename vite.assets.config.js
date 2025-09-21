/**
 * Asset Optimization Configuration for Vite
 * Handles image compression, font optimization, and static asset processing
 */

export const assetOptimizationConfig = {
    // Image optimization settings
    images: {
        // WebP conversion for modern browsers
        webp: {
            quality: 80,
            lossless: false,
            method: 6, // Compression method (0-6, 6 is best)
            alphaQuality: 80
        },

        // AVIF conversion for even better compression
        avif: {
            quality: 70,
            lossless: false,
            speed: 4 // Encoding speed (0-10, higher is faster but larger files)
        },

        // JPEG optimization
        jpeg: {
            quality: 85,
            progressive: true,
            mozjpeg: true
        },

        // PNG optimization
        png: {
            quality: [0.8, 0.9],
            palette: true,
            compressionLevel: 9
        },

        // SVG optimization
        svg: {
            plugins: [
                'preset-default',
                'removeDimensions',
                'removeViewBox'
            ]
        }
    },

    // Font optimization
    fonts: {
        // Preload critical fonts
        preload: [
            '/fonts/Inter-Regular.woff2',
            '/fonts/Inter-Medium.woff2'
        ],

        // Font display strategy
        display: 'swap',

        // Subset fonts to reduce size
        subset: true,

        // Convert to modern formats
        formats: ['woff2', 'woff']
    },

    // CSS optimization
    css: {
        // Purge unused CSS
        purge: {
            content: [
                './index.html',
                './main.js',
                './main-optimized.js',
                './lib/**/*.js'
            ],
            safelist: [
                // Keep dynamic classes
                /^dynamic-/,
                /^loading-/,
                /^error-/,
                /^notification-/
            ]
        },

        // Critical CSS extraction
        critical: {
            base: './',
            src: 'index.html',
            target: {
                css: 'critical.css',
                html: 'index.html'
            },
            width: 1300,
            height: 900,
            inline: true
        }
    },

    // Static asset handling
    staticAssets: {
        // Copy optimization
        copyOptions: {
            // Compress during copy
            compress: true,

            // Ignore source maps in production
            ignore: process.env.NODE_ENV === 'production' ? ['**/*.map'] : []
        },

        // Asset versioning for cache busting
        versioning: {
            algorithm: 'sha256',
            length: 8
        }
    },

    // Bundle optimization
    bundle: {
        // Compression settings
        compression: {
            algorithm: 'gzip',
            level: 9,
            threshold: 1024, // Only compress files larger than 1KB
            deleteOriginal: false
        },

        // Brotli compression
        brotli: {
            quality: 11,
            lgwin: 22,
            threshold: 1024
        }
    }
};

/**
 * Generate responsive image configurations
 */
export function generateResponsiveImages(basePath, sizes = [400, 800, 1200, 1600]) {
    const formats = ['webp', 'avif', 'jpg'];
    const configurations = [];

    sizes.forEach(size => {
        formats.forEach(format => {
            configurations.push({
                input: basePath,
                output: `${basePath.replace(/\.[^.]+$/, '')}-${size}w.${format}`,
                width: size,
                format: format,
                quality: assetOptimizationConfig.images[format]?.quality || 80
            });
        });
    });

    return configurations;
}

/**
 * Critical resource preloading configuration
 */
export const preloadConfig = {
    // Critical resources to preload
    critical: [
        {
            rel: 'preload',
            href: '/fonts/Inter-Regular.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous'
        },
        {
            rel: 'preload',
            href: '/js/three.js',
            as: 'script'
        },
        {
            rel: 'preload',
            href: '/assets/base-uniform-texture.jpg',
            as: 'image'
        }
    ],

    // Resources to prefetch for next navigation
    prefetch: [
        '/js/layers.js',
        '/js/ui.js',
        '/js/config.js'
    ],

    // Resources to preconnect to external origins
    preconnect: [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com'
    ],

    // DNS prefetch for external resources
    dnsPrefetch: [
        'https://api.example.com'
    ]
};

/**
 * Service Worker caching strategy
 */
export const cachingStrategy = {
    // Runtime caching rules
    runtimeCaching: [
        {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
            }
        },
        {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
            }
        },
        {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
                cacheName: 'images',
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
            }
        },
        {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-resources',
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                }
            }
        }
    ],

    // Offline fallbacks
    offlineFallback: {
        pageFallback: '/offline.html',
        imageFallback: '/images/offline-fallback.svg',
        fontFallback: '/fonts/fallback.woff2'
    }
};

export default assetOptimizationConfig;