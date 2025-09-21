import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',

    // Setup files to run before each test
    setupFiles: ['./tests/setup.js'],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        '*.config.js',
        'server.js',
        'main-original.js',
        'main-refactored.js',
        'lib/client/*-fixed.js' // Exclude backup files
      ],
      include: [
        'lib/client/**/*.js',
        'main.js'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },

    // Test file patterns
    include: [
      'tests/unit/**/*.test.js',
      'tests/integration/**/*.test.js'
    ],

    // Test timeout
    testTimeout: 10000,

    // Browser configuration for complex tests
    browser: {
      enabled: false, // Disabled by default, can be enabled for specific tests
      name: 'chromium'
    },

    // Mock configuration
    deps: {
      inline: ['three', 'fabric']
    }
  },

  // Resolve aliases for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@lib': resolve(__dirname, './lib'),
      '@client': resolve(__dirname, './lib/client'),
      '@tests': resolve(__dirname, './tests')
    }
  },

  // Define globals for testing
  define: {
    __TESTING__: true
  }
})