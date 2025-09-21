import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-node';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        EventTarget: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        DragEvent: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        Image: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',

        // Node.js globals (for server.js and build scripts)
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',

        // Testing globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',

        // Vite/Build globals
        'import.meta': 'readonly'
      }
    },

    plugins: {
      'import': importPlugin,
      'node': nodePlugin
    },

    rules: {
      // Error Prevention
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-extra-boolean-cast': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'error',
      'no-unexpected-multiline': 'error',
      'valid-typeof': 'error',

      // Best Practices
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-global-assign': 'error',
      'no-implicit-globals': 'error',
      'no-loop-func': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'radix': 'warn',

      // ES6+ Features
      'prefer-const': 'warn',
      'no-var': 'warn',
      'prefer-arrow-callback': 'off',
      'prefer-template': 'off',
      'prefer-destructuring': 'off',
      'prefer-rest-params': 'warn',
      'prefer-spread': 'warn',
      'no-useless-constructor': 'warn',
      'no-duplicate-imports': 'error',

      // Import/Export Rules
      'import/no-unresolved': 'off', // Disabled due to path resolution complexity
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'warn',
      'import/no-webpack-loader-syntax': 'error',
      'import/export': 'error',
      'import/no-named-as-default': 'warn',
      'import/no-named-as-default-member': 'warn',
      'import/no-deprecated': 'warn',
      'import/no-mutable-exports': 'error',
      'import/no-commonjs': 'off', // Allow CommonJS in config files

      // Code Style (handled by Prettier, but some logical rules)
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'comma-dangle': ['error', 'never'],
      'quotes': ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
      'semi': ['error', 'always'],

      // Complexity Management
      'complexity': ['warn', 20],
      'max-depth': ['warn', 6],
      'max-nested-callbacks': ['warn', 5],
      'max-params': ['warn', 8],
      'max-statements': ['warn', 40],
      'max-len': ['warn', {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreComments: true
      }]
    }
  },

  // Configuration for server-side files
  {
    files: ['server.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      'import/no-commonjs': 'off',
      'node/no-unpublished-require': 'off'
    }
  },

  // Configuration for test files
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        vitest: 'readonly'
      }
    },
    rules: {
      'no-unused-expressions': 'off',
      'max-len': 'off',
      'max-statements': 'off',
      'prefer-arrow-callback': 'off'
    }
  },

  // Configuration for config files
  {
    files: ['*.config.js', '*.config.mjs', 'eslint.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly'
      }
    },
    rules: {
      'import/no-commonjs': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off'
    }
  },

  // Configuration for legacy CommonJS files
  {
    files: ['lib/OrderParser.js', 'accessibility-validator.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'import/no-commonjs': 'off',
      'no-unused-vars': 'warn',
      'complexity': 'off',
      'max-statements': 'off',
      'max-len': 'off'
    }
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.vite/**',
      '*.min.js',
      'main-original.js',
      'main-refactored.js',
      'lib/client/*-fixed.js',
      'sessions/**',
      'uploads/**'
    ]
  },

  // Apply Prettier config last to override conflicting rules
  prettier
];