import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    server: {
      port: parseInt(env.FRONTEND_PORT) || parseInt(env.DEFAULT_FRONTEND_PORT) || 3020,
      open: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: 'es2020',
      minify: 'terser',
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info'] : [],
          passes: 2
        },
        mangle: {
          toplevel: true,
          safari10: true
        },
        format: {
          comments: false
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Three.js as separate chunk (largest dependency)
            'three': ['three'],

            // Core 3D managers
            'scene': [
              './lib/client/SceneManager.js'
            ],

            // Layer and texture processing
            'layers': [
              './lib/client/LayerManager.js',
              './lib/client/ImageProcessor.js'
            ],

            // UI and interaction
            'ui': [
              './lib/client/UIManager.js',
              './lib/client/UIStyleManager.js',
              './lib/client/InteractionManager.js',
              './lib/client/DesignSystem.js'
            ],

            // Configuration and session management
            'config': [
              './lib/client/ConfigurationManager.js',
              './lib/client/SessionManager.js'
            ],

            // Heavy optional features
            'features': [
              './lib/client/OrderFormManager.js',
              './lib/client/ColorWheelPicker.js'
            ],

            // Performance and monitoring
            'performance': [
              './lib/client/PerformanceMonitor.js'
            ],

            // Security utilities
            'security': [
              './lib/client/SecureDOM.js'
            ],

            // External fabric.js dependency
            'fabric': ['fabric']
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop().replace('.js', '')
              : 'unknown';
            return `js/[name]-[hash].js`;
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const extType = info[info.length - 1];
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
              return `media/[name]-[hash][extname]`;
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(assetInfo.name)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
              return `fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          }
        },
        external: (id) => {
          // Keep large external dependencies as CDN candidates
          return false; // We'll handle CDN separately
        }
      },
      cssCodeSplit: true,
      sourcemap: !isProduction,
      emptyOutDir: true
    },
    optimizeDeps: {
      include: [
        'three',
        'fabric'
      ],
      exclude: [
        // Exclude heavy optional dependencies from optimization
      ]
    },
    esbuild: {
      target: 'es2020',
      legalComments: 'none',
      treeShaking: true
    },
    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        css: {
          charset: false
        }
      }
    },
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
    }
  };
});