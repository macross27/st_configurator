import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SceneManager } from '@client/SceneManager.js'
import { LayerManager } from '@client/LayerManager.js'
import { UIManager } from '@client/UIManager.js'
import { SessionManager } from '@client/SessionManager.js'
import { ImageProcessor } from '@client/ImageProcessor.js'
import {
  setupMockDOM,
  createMockLayer,
  createMockFile,
  mockPerformanceAPI,
  wait,
  mockConsole
} from '@tests/utils/test-helpers.js'

/**
 * Performance regression tests for st_configurator
 * Tests to ensure performance doesn't degrade over time
 */

describe('Performance Regression Tests', () => {
  let container
  let restoreConsole
  let performanceData

  beforeEach(() => {
    restoreConsole = mockConsole()
    container = setupMockDOM()
    performanceData = mockPerformanceAPI()

    // Set performance baselines (in milliseconds)
    window.PERFORMANCE_BASELINES = {
      sceneInitialization: 500,
      modelLoading: 2000,
      layerCreation: 50,
      textureUpdate: 100,
      layerManipulation: 25,
      sessionSave: 1000,
      sessionLoad: 800,
      imageProcessing: 3000,
      bulkOperations: 5000
    }
  })

  afterEach(() => {
    restoreConsole()
    container?.remove()
  })

  describe('Scene Management Performance', () => {
    test('scene initialization should complete within baseline time', async () => {
      const startTime = performance.now()

      const sceneManager = new SceneManager(container)

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(window.PERFORMANCE_BASELINES.sceneInitialization)

      sceneManager.dispose()
    })

    test('model loading should complete within baseline time', async () => {
      const sceneManager = new SceneManager(container)

      performance.mark('model-load-start')

      await sceneManager.loadModel('/models/test.glb')

      performance.mark('model-load-end')
      performance.measure('model-loading', 'model-load-start', 'model-load-end')

      const measures = performance.getEntriesByType('measure')
      const modelLoadMeasure = measures.find(m => m.name === 'model-loading')

      expect(modelLoadMeasure.duration).toBeLessThan(window.PERFORMANCE_BASELINES.modelLoading)

      sceneManager.dispose()
    })

    test('render performance should maintain 30+ FPS', async () => {
      const sceneManager = new SceneManager(container)
      await sceneManager.loadModel('/models/test.glb')

      const frameTimes = []
      const targetFrames = 30

      // Measure render times
      for (let i = 0; i < targetFrames; i++) {
        const startTime = performance.now()

        sceneManager.needsRender = true
        sceneManager.render()

        const endTime = performance.now()
        frameTimes.push(endTime - startTime)

        await wait(16) // Target 60 FPS
      }

      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      const maxFrameTime = Math.max(...frameTimes)

      // Average frame time should be under 33ms (30 FPS)
      expect(averageFrameTime).toBeLessThan(33)

      // No frame should take longer than 100ms
      expect(maxFrameTime).toBeLessThan(100)

      sceneManager.dispose()
    })

    test('scene disposal should be fast', () => {
      const sceneManager = new SceneManager(container)

      const startTime = performance.now()

      sceneManager.dispose()

      const endTime = performance.now()
      const duration = endTime - startTime

      // Disposal should be very fast (under 50ms)
      expect(duration).toBeLessThan(50)
    })
  })

  describe('Layer Management Performance', () => {
    test('layer creation should be fast', () => {
      const layerManager = new LayerManager()
      layerManager.initializeTexture()

      const startTime = performance.now()

      const layer = layerManager.createTextLayer('Performance Test')

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(window.PERFORMANCE_BASELINES.layerCreation)

      layerManager.dispose()
    })

    test('texture updates should complete within baseline time', () => {
      const layerManager = new LayerManager()
      layerManager.initializeTexture()

      // Create a layer first
      layerManager.createTextLayer('Test Layer')

      performance.mark('texture-update-start')

      layerManager.updateTexture(true)

      performance.mark('texture-update-end')
      performance.measure('texture-update', 'texture-update-start', 'texture-update-end')

      const measures = performance.getEntriesByType('measure')
      const textureUpdateMeasure = measures.find(m => m.name === 'texture-update')

      expect(textureUpdateMeasure.duration).toBeLessThan(window.PERFORMANCE_BASELINES.textureUpdate)

      layerManager.dispose()
    })

    test('layer manipulation should be responsive', () => {
      const layerManager = new LayerManager()
      layerManager.initializeTexture()

      const layer = layerManager.createTextLayer('Test Layer')

      const operations = [
        () => layerManager.updateLayerPosition(layer.id, 150, 200),
        () => layerManager.updateLayerDimensions(layer.id, 300, 100),
        () => layerManager.updateLayerRotation(layer.id, Math.PI / 4),
        () => layerManager.updateLayerOpacity(layer.id, 0.8),
        () => layerManager.updateLayer(layer.id, { text: 'Updated Text' })
      ]

      const operationTimes = []

      for (const operation of operations) {
        const startTime = performance.now()
        operation()
        const endTime = performance.now()
        operationTimes.push(endTime - startTime)
      }

      const averageTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length
      const maxTime = Math.max(...operationTimes)

      expect(averageTime).toBeLessThan(window.PERFORMANCE_BASELINES.layerManipulation)
      expect(maxTime).toBeLessThan(window.PERFORMANCE_BASELINES.layerManipulation * 2)

      layerManager.dispose()
    })

    test('bulk layer operations should scale well', () => {
      const layerManager = new LayerManager()
      layerManager.initializeTexture()

      performance.mark('bulk-operations-start')

      // Create many layers
      const layers = []
      for (let i = 0; i < 50; i++) {
        const layer = layerManager.createTextLayer(`Layer ${i}`, i * 10, 50)
        layers.push(layer)
      }

      // Update all layers
      for (const layer of layers) {
        layerManager.updateLayer(layer.id, {
          text: `Updated ${layer.text}`,
          fontSize: 18,
          color: '#ff0000'
        })
      }

      // Update texture once
      layerManager.updateTexture(true)

      performance.mark('bulk-operations-end')
      performance.measure('bulk-operations', 'bulk-operations-start', 'bulk-operations-end')

      const measures = performance.getEntriesByType('measure')
      const bulkOpsMeasure = measures.find(m => m.name === 'bulk-operations')

      expect(bulkOpsMeasure.duration).toBeLessThan(window.PERFORMANCE_BASELINES.bulkOperations)

      layerManager.dispose()
    })
  })

  describe('UI Performance', () => {
    test('UI updates should be responsive', async () => {
      const uiManager = new UIManager()

      const updateTimes = []
      const testLayers = []

      // Create test layers
      for (let i = 0; i < 10; i++) {
        testLayers.push(createMockLayer({
          name: `Layer ${i}`,
          text: `Text content ${i}`
        }))
      }

      // Measure UI panel updates
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now()

        uiManager.updateLayersPanel(testLayers.slice(0, i + 2))

        const endTime = performance.now()
        updateTimes.push(endTime - startTime)

        await wait(10) // Brief pause
      }

      const averageUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      const maxUpdateTime = Math.max(...updateTimes)

      // UI updates should be very fast
      expect(averageUpdateTime).toBeLessThan(50)
      expect(maxUpdateTime).toBeLessThan(100)

      uiManager.dispose()
    })

    test('notification system should not block UI', async () => {
      const uiManager = new UIManager()

      const startTime = performance.now()

      // Show multiple notifications rapidly
      for (let i = 0; i < 10; i++) {
        uiManager.showNotification(`Notification ${i}`, 'info', 1000)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should handle multiple notifications quickly
      expect(duration).toBeLessThan(100)

      uiManager.dispose()
    })

    test('color picker interactions should be smooth', () => {
      const uiManager = new UIManager()

      const interactionTimes = []

      // Simulate rapid color changes
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']

      for (const color of colors) {
        const startTime = performance.now()

        uiManager.updateColorDisplay(color)
        uiManager.handleColorSelection(color)

        const endTime = performance.now()
        interactionTimes.push(endTime - startTime)
      }

      const averageTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length

      expect(averageTime).toBeLessThan(25)

      uiManager.dispose()
    })
  })

  describe('Session Management Performance', () => {
    test('session saving should complete within baseline time', async () => {
      const sessionManager = new SessionManager({
        serverUrl: 'http://localhost:3030'
      })

      const sessionData = {
        name: 'Performance Test Session',
        layers: Array.from({ length: 20 }, (_, i) => createMockLayer({
          name: `Layer ${i}`,
          text: `Performance test layer ${i}`
        })),
        modelPath: '/models/test.glb'
      }

      performance.mark('session-save-start')

      await sessionManager.createSession(sessionData)

      performance.mark('session-save-end')
      performance.measure('session-save', 'session-save-start', 'session-save-end')

      const measures = performance.getEntriesByType('measure')
      const sessionSaveMeasure = measures.find(m => m.name === 'session-save')

      expect(sessionSaveMeasure.duration).toBeLessThan(window.PERFORMANCE_BASELINES.sessionSave)

      sessionManager.dispose()
    })

    test('session loading should complete within baseline time', async () => {
      const sessionManager = new SessionManager({
        serverUrl: 'http://localhost:3030'
      })

      performance.mark('session-load-start')

      await sessionManager.loadSession('test-session-123')

      performance.mark('session-load-end')
      performance.measure('session-load', 'session-load-start', 'session-load-end')

      const measures = performance.getEntriesByType('measure')
      const sessionLoadMeasure = measures.find(m => m.name === 'session-load')

      expect(sessionLoadMeasure.duration).toBeLessThan(window.PERFORMANCE_BASELINES.sessionLoad)

      sessionManager.dispose()
    })

    test('auto-save should not impact user interactions', async () => {
      const sessionManager = new SessionManager({
        serverUrl: 'http://localhost:3030'
      })

      sessionManager.enableAutoSave(true, 100) // Very frequent auto-save

      const interactionTimes = []

      // Simulate user interactions during auto-save
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()

        // Simulate data change
        sessionManager.updateSessionData({
          layers: [createMockLayer({ name: `Auto-save layer ${i}` })]
        })

        const endTime = performance.now()
        interactionTimes.push(endTime - startTime)

        await wait(50) // Brief pause
      }

      const averageTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length

      // User interactions should remain fast even with auto-save
      expect(averageTime).toBeLessThan(25)

      sessionManager.dispose()
    })
  })

  describe('Image Processing Performance', () => {
    test('image processing should complete within baseline time', async () => {
      const imageProcessor = new ImageProcessor({
        outputWidth: 1024,
        outputHeight: 1024,
        quality: 0.9
      })

      const testFile = createMockFile('test-image.png', 'image/png', 1024 * 1024) // 1MB

      performance.mark('image-process-start')

      await imageProcessor.processImage(testFile)

      performance.mark('image-process-end')
      performance.measure('image-process', 'image-process-start', 'image-process-end')

      const measures = performance.getEntriesByType('measure')
      const imageProcessMeasure = measures.find(m => m.name === 'image-process')

      expect(imageProcessMeasure.duration).toBeLessThan(window.PERFORMANCE_BASELINES.imageProcessing)

      imageProcessor.dispose()
    })

    test('batch image processing should scale linearly', async () => {
      const imageProcessor = new ImageProcessor({
        outputWidth: 512,
        outputHeight: 512,
        quality: 0.8
      })

      const processingTimes = []
      const batchSizes = [1, 3, 5]

      for (const batchSize of batchSizes) {
        const files = Array.from({ length: batchSize }, (_, i) =>
          createMockFile(`batch-image-${i}.png`, 'image/png', 512 * 1024)
        )

        const startTime = performance.now()

        // Process all files in batch
        await Promise.all(files.map(file => imageProcessor.processImage(file)))

        const endTime = performance.now()
        processingTimes.push({
          batchSize,
          duration: endTime - startTime,
          avgPerImage: (endTime - startTime) / batchSize
        })
      }

      // Average per-image time should not increase significantly with batch size
      const timePerImage = processingTimes.map(p => p.avgPerImage)
      const maxTime = Math.max(...timePerImage)
      const minTime = Math.min(...timePerImage)

      // Time per image should not vary by more than 50%
      expect(maxTime / minTime).toBeLessThan(1.5)

      imageProcessor.dispose()
    })
  })

  describe('Memory Usage Performance', () => {
    test('memory usage should remain stable during extended operations', async () => {
      if (!global.performance.memory) {
        return // Skip if memory API not available
      }

      const memoryReadings = []

      const logMemory = (label) => {
        memoryReadings.push({
          label,
          memory: global.performance.memory.usedJSHeapSize,
          timestamp: Date.now()
        })
      }

      logMemory('start')

      // Extended operations simulation
      for (let cycle = 0; cycle < 5; cycle++) {
        const sceneManager = new SceneManager(container)
        const layerManager = new LayerManager()
        layerManager.initializeTexture()

        // Create and manipulate layers
        for (let i = 0; i < 20; i++) {
          const layer = layerManager.createTextLayer(`Cycle ${cycle} Layer ${i}`)
          layerManager.updateLayer(layer.id, {
            text: `Updated text ${i}`,
            fontSize: 16 + (i % 10),
            color: `hsl(${i * 36}, 70%, 50%)`
          })
        }

        layerManager.updateTexture(true)

        logMemory(`cycle-${cycle}-peak`)

        // Cleanup
        layerManager.dispose()
        sceneManager.dispose()

        logMemory(`cycle-${cycle}-cleanup`)

        // Force garbage collection
        if (global.gc) {
          global.gc()
        }

        await wait(100)
      }

      logMemory('end')

      // Analyze memory stability
      const startMemory = memoryReadings[0].memory
      const endMemory = memoryReadings[memoryReadings.length - 1].memory
      const memoryGrowth = endMemory - startMemory

      const peakMemories = memoryReadings
        .filter(r => r.label.includes('peak'))
        .map(r => r.memory)

      const maxPeak = Math.max(...peakMemories)
      const memoryPressure = maxPeak - startMemory

      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024) // Less than 10MB growth

      // Peak memory pressure should be reasonable
      expect(memoryPressure).toBeLessThan(50 * 1024 * 1024) // Less than 50MB peak

      console.log('Memory readings:', memoryReadings)
    })

    test('garbage collection frequency should be reasonable', async () => {
      if (!global.gc) {
        return // Skip if GC API not available
      }

      let gcCount = 0
      const originalGC = global.gc

      global.gc = function() {
        gcCount++
        return originalGC.call(this)
      }

      // Perform operations that might trigger GC
      for (let i = 0; i < 10; i++) {
        const layerManager = new LayerManager()
        layerManager.initializeTexture()

        for (let j = 0; j < 50; j++) {
          layerManager.createTextLayer(`GC Test ${i}-${j}`)
        }

        layerManager.dispose()
        await wait(10)
      }

      global.gc = originalGC

      // Should not require excessive garbage collections
      expect(gcCount).toBeLessThan(20)
    })
  })

  describe('Performance Monitoring and Reporting', () => {
    test('should generate performance report', () => {
      const report = generatePerformanceReport(performanceData)

      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('measurements')
      expect(report).toHaveProperty('recommendations')

      expect(report.summary.totalMeasurements).toBeGreaterThan(0)
      expect(Array.isArray(report.measurements)).toBe(true)
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    test('should identify performance bottlenecks', () => {
      // Add some slow measurements
      performanceData.measures.push(
        { name: 'slow-operation', duration: 2000 },
        { name: 'fast-operation', duration: 10 },
        { name: 'medium-operation', duration: 100 }
      )

      const bottlenecks = identifyBottlenecks(performanceData, {
        slowThreshold: 1000
      })

      expect(bottlenecks).toHaveLength(1)
      expect(bottlenecks[0].name).toBe('slow-operation')
    })
  })
})

/**
 * Generate a performance report from collected data
 */
function generatePerformanceReport(performanceData) {
  const measurements = performanceData.measures
  const totalMeasurements = measurements.length
  const averageDuration = measurements.length > 0
    ? measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length
    : 0

  const slowOperations = measurements.filter(m => m.duration > 100)
  const fastOperations = measurements.filter(m => m.duration < 50)

  return {
    summary: {
      totalMeasurements,
      averageDuration,
      slowOperations: slowOperations.length,
      fastOperations: fastOperations.length
    },
    measurements: measurements.sort((a, b) => b.duration - a.duration),
    recommendations: generateRecommendations(measurements)
  }
}

/**
 * Identify performance bottlenecks
 */
function identifyBottlenecks(performanceData, thresholds = {}) {
  const slowThreshold = thresholds.slowThreshold || 500

  return performanceData.measures
    .filter(m => m.duration > slowThreshold)
    .sort((a, b) => b.duration - a.duration)
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(measurements) {
  const recommendations = []

  const slowMeasurements = measurements.filter(m => m.duration > 100)
  if (slowMeasurements.length > 0) {
    recommendations.push({
      type: 'performance',
      severity: 'warning',
      message: `${slowMeasurements.length} operations are taking longer than 100ms`,
      operations: slowMeasurements.map(m => m.name)
    })
  }

  const textureUpdates = measurements.filter(m => m.name.includes('texture'))
  if (textureUpdates.some(m => m.duration > 50)) {
    recommendations.push({
      type: 'optimization',
      severity: 'suggestion',
      message: 'Consider optimizing texture update operations',
      details: 'Batch texture updates or use texture atlasing'
    })
  }

  return recommendations
}