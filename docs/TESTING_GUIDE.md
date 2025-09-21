# ST Configurator Testing Guide

This comprehensive guide covers all aspects of testing for the ST Configurator application, including unit tests, integration tests, E2E tests, performance testing, and memory leak detection.

## Table of Contents

1. [Overview](#overview)
2. [Testing Framework Setup](#testing-framework-setup)
3. [Running Tests](#running-tests)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Performance Testing](#performance-testing)
8. [Memory Leak Detection](#memory-leak-detection)
9. [Test Writing Guidelines](#test-writing-guidelines)
10. [Debugging Tests](#debugging-tests)
11. [CI/CD Integration](#cicd-integration)
12. [Troubleshooting](#troubleshooting)

## Overview

The ST Configurator testing infrastructure provides comprehensive coverage for:

- **Unit Tests**: Individual component and class testing with Vitest
- **Integration Tests**: Manager class interaction testing
- **E2E Tests**: Complete user workflow testing with Playwright
- **Performance Tests**: Regression testing for performance metrics
- **Memory Leak Tests**: Resource cleanup and memory management validation
- **Cross-Browser Tests**: Compatibility testing across major browsers

### Testing Technology Stack

- **Unit/Integration Testing**: Vitest with jsdom environment
- **E2E Testing**: Playwright with Chromium, Firefox, and WebKit
- **Mocking**: Three.js and Fabric.js mocked for test environment
- **Coverage**: V8 coverage provider with comprehensive reporting
- **Performance**: Custom performance monitoring and baseline comparisons

## Testing Framework Setup

### Dependencies

```json
{
  "devDependencies": {
    "vitest": "^3.2.4",
    "@vitest/ui": "^3.2.4",
    "jsdom": "^27.0.0",
    "happy-dom": "^18.0.1",
    "@testing-library/jest-dom": "^6.8.0",
    "@playwright/test": "^1.55.0",
    "playwright": "^1.55.0"
  }
}
```

### Configuration Files

- `vitest.config.js` - Vitest configuration with Three.js mocking
- `playwright.config.js` - Playwright configuration with multi-browser support
- `tests/setup.js` - Global test setup with mocks and utilities

### Installation

```bash
# Install all testing dependencies
npm install

# Install Playwright browsers
npm run test:install
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Comprehensive Test Suite

```bash
# Run complete test suite (recommended for CI)
npm run test:all

# Run CI-optimized test suite
npm run test:ci
```

### Specialized Tests

```bash
# Memory leak detection
npm run test:memory

# Performance regression testing
npm run test:performance

# E2E tests with browser UI
npm run test:e2e:headed

# E2E tests with debugging
npm run test:e2e:debug
```

### Test Reporting

```bash
# View Playwright test report
npm run test:report

# Generate coverage report
npm run test:coverage
```

## Unit Testing

Unit tests focus on testing individual components and manager classes in isolation.

### File Structure

```
tests/unit/
├── SceneManager.test.js
├── LayerManager.test.js
├── UIManager.test.js
├── InteractionManager.test.js
├── ConfigurationManager.test.js
├── SessionManager.test.js
└── ImageProcessor.test.js
```

### Example Unit Test

```javascript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { LayerManager } from '@client/LayerManager.js'
import { createMockLayer } from '@tests/utils/test-helpers.js'

describe('LayerManager', () => {
  let layerManager

  beforeEach(() => {
    layerManager = new LayerManager()
    layerManager.initializeTexture()
  })

  afterEach(() => {
    layerManager.dispose()
  })

  test('should create text layer', () => {
    const layer = layerManager.createTextLayer('Test Text', 100, 100)

    expect(layer.type).toBe('text')
    expect(layer.text).toBe('Test Text')
    expect(layer.x).toBe(100)
    expect(layer.y).toBe(100)
    expect(layerManager.layers).toContain(layer)
  })
})
```

### Key Features

- **Three.js Mocking**: Complete Three.js API mocked for headless testing
- **Fabric.js Mocking**: Canvas texture operations mocked
- **DOM Utilities**: Helper functions for creating mock DOM environments
- **Memory Monitoring**: Built-in memory leak detection
- **Performance Tracking**: Automatic performance measurement

## Integration Testing

Integration tests verify interactions between multiple components and system-level behavior.

### File Structure

```
tests/integration/
├── memory-leaks.test.js
├── performance-regression.test.js
└── component-integration.test.js
```

### Memory Leak Detection

```javascript
test('should not leak memory when creating and disposing managers', async () => {
  const initialSnapshot = createMemorySnapshot()

  // Create and dispose multiple managers
  for (let i = 0; i < 10; i++) {
    const sceneManager = new SceneManager(container)
    const layerManager = new LayerManager()

    // Perform operations
    await sceneManager.loadModel('/models/test.glb')
    layerManager.createTextLayer('Test')

    // Cleanup
    sceneManager.dispose()
    layerManager.dispose()
  }

  const finalSnapshot = createMemorySnapshot()
  const memoryIncrease = finalSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize

  expect(memoryIncrease).toBeLessThan(5000000) // Less than 5MB
})
```

### Performance Regression Testing

```javascript
test('texture updates should complete within baseline time', () => {
  const layerManager = new LayerManager()
  layerManager.initializeTexture()
  layerManager.createTextLayer('Test Layer')

  performance.mark('texture-update-start')
  layerManager.updateTexture(true)
  performance.mark('texture-update-end')

  performance.measure('texture-update', 'texture-update-start', 'texture-update-end')

  const measures = performance.getEntriesByType('measure')
  const textureUpdateMeasure = measures.find(m => m.name === 'texture-update')

  expect(textureUpdateMeasure.duration).toBeLessThan(100) // 100ms baseline
})
```

## End-to-End Testing

E2E tests validate complete user workflows using real browsers.

### File Structure

```
tests/e2e/
├── user-workflows.spec.js
├── global-setup.js
├── global-teardown.js
└── fixtures/
    ├── test-images/
    └── test-sessions/
```

### Example E2E Test

```javascript
test('should add text layer and customize it', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('#3d-canvas')

  // Add text layer
  await page.click('#add-text-btn')
  await page.waitForSelector('.layer-item')

  // Customize text
  const layerItem = page.locator('.layer-item').first()
  await layerItem.click()

  await page.fill('#text-input', 'PLAYER NAME')
  await page.fill('#font-size-slider', '24')

  // Verify changes
  await expect(page.locator('#text-input')).toHaveValue('PLAYER NAME')
  await expect(page.locator('#font-size-value')).toContainText('24')
})
```

### Multi-Browser Testing

Tests run automatically on:
- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)
- **Tablet** (iPad Pro)

### Test Data Management

- **Global Setup**: Creates test fixtures and verifies server accessibility
- **Global Teardown**: Cleans up test data and generates reports
- **Test Isolation**: Each test runs in a clean environment

## Performance Testing

Performance tests ensure the application maintains acceptable performance characteristics.

### Performance Baselines

```javascript
window.PERFORMANCE_BASELINES = {
  sceneInitialization: 500,    // Scene setup time (ms)
  modelLoading: 2000,          // GLB model loading (ms)
  layerCreation: 50,           // Layer creation time (ms)
  textureUpdate: 100,          // Texture update time (ms)
  layerManipulation: 25,       // Layer property changes (ms)
  sessionSave: 1000,           // Session save operation (ms)
  sessionLoad: 800,            // Session load operation (ms)
  imageProcessing: 3000,       // Image upload processing (ms)
  bulkOperations: 5000         // Multiple layer operations (ms)
}
```

### Performance Monitoring

```javascript
test('render performance should maintain 30+ FPS', async () => {
  const frameTimes = []

  for (let i = 0; i < 30; i++) {
    const startTime = performance.now()
    sceneManager.render()
    const endTime = performance.now()
    frameTimes.push(endTime - startTime)
  }

  const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
  expect(averageFrameTime).toBeLessThan(33) // 30 FPS = 33ms per frame
})
```

## Memory Leak Detection

Comprehensive memory leak detection ensures proper resource cleanup.

### Memory Monitoring

```javascript
function createMemorySnapshot() {
  return {
    usedJSHeapSize: global.performance.memory?.usedJSHeapSize || 0,
    totalJSHeapSize: global.performance.memory?.totalJSHeapSize || 0,
    timestamp: Date.now()
  }
}
```

### Leak Detection Patterns

1. **Resource Disposal**: Verify dispose() methods clean up properly
2. **Event Listeners**: Check event listener removal
3. **Canvas Contexts**: Monitor canvas/WebGL context cleanup
4. **Timers**: Verify clearTimeout/clearInterval calls
5. **Three.js Objects**: Track geometry/material disposal

### Common Leak Sources

- Undisposed Three.js geometries and materials
- Canvas contexts not properly released
- Event listeners not removed
- Timers not cleared
- Circular references in objects

## Test Writing Guidelines

### General Principles

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Descriptive Names**: Test names should explain what is being tested
4. **Single Responsibility**: Each test should verify one thing
5. **Isolation**: Tests should not depend on each other

### Naming Conventions

```javascript
// Good test names
test('should create text layer with specified properties')
test('should update texture when layer properties change')
test('should handle file upload errors gracefully')

// Poor test names
test('layer test')
test('texture stuff')
test('error handling')
```

### Mock Usage

```javascript
// Create focused mocks
const mockCallback = vi.fn()
layerManager.onLayerAdded = mockCallback

// Verify interactions
expect(mockCallback).toHaveBeenCalledWith(layer)
expect(mockCallback).toHaveBeenCalledTimes(1)
```

### Error Testing

```javascript
test('should handle invalid configuration gracefully', () => {
  expect(() => {
    configManager.importConfiguration(null)
  }).toThrow('Configuration data is required')
})
```

### Async Testing

```javascript
test('should load session data successfully', async () => {
  const result = await sessionManager.loadSession('test-id')
  expect(result).toEqual(expectedData)
})
```

## Debugging Tests

### Vitest Debugging

```bash
# Run specific test file
npm run test:watch tests/unit/LayerManager.test.js

# Run with UI for visual debugging
npm run test:ui

# Debug specific test
npm run test:watch -- --grep "should create text layer"
```

### Playwright Debugging

```bash
# Run with browser UI visible
npm run test:e2e:headed

# Debug mode with step-through
npm run test:e2e:debug

# Debug specific test
npx playwright test --debug --grep "should add text layer"
```

### Common Debug Techniques

1. **Console Logging**: Use `console.log()` in tests (will be captured)
2. **Screenshots**: Playwright automatically captures on failure
3. **Video Recording**: Available for failed tests
4. **Trace Viewer**: Detailed execution traces in Playwright
5. **Test Isolation**: Run single tests to isolate issues

### Debug Configuration

```javascript
// Increase timeouts for debugging
test.setTimeout(60000)

// Add debug logging
test('debug test', async ({ page }) => {
  await page.goto('/')
  await page.screenshot({ path: 'debug-screenshot.png' })
  console.log('Current URL:', page.url())
})
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npm run test:coverage

      - name: Install Playwright browsers
        run: npm run test:install

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

### Test Environment Variables

```bash
# CI Environment
NODE_ENV=test
CI=true

# Application URLs
VITE_SERVER_HOST=localhost
VITE_SERVER_PORT=3030
FRONTEND_PORT=3020

# Test Configuration
PLAYWRIGHT_HEADLESS=true
VITEST_COVERAGE=true
```

### Quality Gates

- **Unit Test Coverage**: Minimum 70% line coverage
- **Integration Tests**: All critical manager interactions
- **E2E Tests**: Core user workflows must pass
- **Performance Tests**: No regression beyond baselines
- **Memory Tests**: No significant memory leaks

## Troubleshooting

### Common Issues

#### Test Timeout Errors

```bash
# Increase timeout in vitest.config.js
testTimeout: 30000  // 30 seconds

# Or in individual tests
test('slow test', async () => {
  // test code
}, 60000) // 60 seconds
```

#### Three.js/WebGL Issues

```javascript
// Check mock setup in tests/setup.js
expect(mockThree.Scene).toBeDefined()
expect(mockThree.WebGLRenderer).toBeDefined()

// Verify canvas context mocking
const canvas = document.createElement('canvas')
const context = canvas.getContext('webgl')
expect(context).toBeDefined()
```

#### Playwright Browser Issues

```bash
# Reinstall browsers
npm run test:install

# Clear browser cache
npx playwright install --force

# Check browser availability
npx playwright install --dry-run
```

#### Memory Test Failures

```javascript
// Force garbage collection
if (global.gc) {
  global.gc()
  global.gc() // Run twice for better cleanup
}

// Add cleanup delays
await wait(100) // Allow time for cleanup
```

### Test Data Issues

#### Missing Test Fixtures

```bash
# Verify global setup ran
ls -la tests/fixtures/
ls -la sessions/e2e-test-session.json
```

#### Server Connection Issues

```bash
# Check server startup
npm run server &
curl http://localhost:3030/api/config

# Verify port availability
netstat -an | grep 3030
netstat -an | grep 3020
```

### Performance Test Issues

#### Baseline Adjustments

```javascript
// Update baselines for slower environments
window.PERFORMANCE_BASELINES = {
  sceneInitialization: 1000,  // Doubled for CI
  modelLoading: 4000,         // Doubled for CI
  // ... other baselines
}
```

#### Memory Measurement Issues

```javascript
// Fallback for environments without performance.memory
if (!global.performance.memory) {
  global.performance.memory = {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 2000000000
  }
}
```

### Getting Help

1. **Check Test Logs**: Review detailed error messages and stack traces
2. **Run Individual Tests**: Isolate failing tests for easier debugging
3. **Use Debug Mode**: Leverage Playwright's debug capabilities
4. **Review Documentation**: Check component documentation for expected behavior
5. **Update Dependencies**: Ensure all testing dependencies are current

For additional support, refer to:
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)

---

This testing guide provides comprehensive coverage for maintaining high-quality, reliable tests for the ST Configurator application. Regular review and updates of this guide ensure testing practices remain current and effective.