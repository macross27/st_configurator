import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SceneManager } from '@client/SceneManager.js'
import { LayerManager } from '@client/LayerManager.js'
import { UIManager } from '@client/UIManager.js'
import { SessionManager } from '@client/SessionManager.js'
import {
  setupMockDOM,
  createMockLayer,
  createMemorySnapshot,
  wait,
  mockConsole
} from '@tests/utils/test-helpers.js'

/**
 * Memory leak detection tests for st_configurator
 * Tests for proper cleanup and resource disposal
 */

describe('Memory Leak Detection', () => {
  let container
  let restoreConsole

  beforeEach(() => {
    restoreConsole = mockConsole()
    container = setupMockDOM()

    // Mock performance.memory for memory monitoring
    if (!global.performance.memory) {
      global.performance.memory = {
        usedJSHeapSize: 50000000, // 50MB baseline
        totalJSHeapSize: 100000000, // 100MB total
        jsHeapSizeLimit: 2000000000 // 2GB limit
      }
    }
  })

  afterEach(() => {
    restoreConsole()
    container?.remove()
  })

  describe('SceneManager Memory Management', () => {
    test('should not leak memory when creating and disposing scene managers', async () => {
      const initialSnapshot = createMemorySnapshot()

      const managers = []

      // Create multiple scene managers
      for (let i = 0; i < 10; i++) {
        const manager = new SceneManager(container)
        await manager.loadModel('/models/test.glb')
        managers.push(manager)
      }

      // Dispose all managers
      for (const manager of managers) {
        manager.dispose()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
        global.gc() // Run twice for better cleanup
      }

      await wait(100) // Allow time for cleanup

      const finalSnapshot = createMemorySnapshot()
      const memoryIncrease = finalSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5000000)
    })

    test('should dispose Three.js resources properly', async () => {
      const sceneManager = new SceneManager(container)
      await sceneManager.loadModel('/models/test.glb')

      // Track disposal calls
      const disposeSpy = vi.fn()
      if (sceneManager.renderer) {
        sceneManager.renderer.dispose = disposeSpy
      }
      if (sceneManager.controls) {
        sceneManager.controls.dispose = disposeSpy
      }

      sceneManager.dispose()

      expect(disposeSpy).toHaveBeenCalled()
    })

    test('should clear model resources when loading new models', async () => {
      const sceneManager = new SceneManager(container)

      // Load first model
      await sceneManager.loadModel('/models/first.glb')
      const firstModel = sceneManager.model

      // Load second model
      await sceneManager.loadModel('/models/second.glb')

      // First model should be cleared
      expect(sceneManager.model).not.toBe(firstModel)

      sceneManager.dispose()
    })
  })

  describe('LayerManager Memory Management', () => {
    test('should not leak memory when creating and removing many layers', async () => {
      const initialSnapshot = createMemorySnapshot()
      const layerManager = new LayerManager()
      layerManager.initializeTexture()

      // Create many layers
      for (let i = 0; i < 100; i++) {
        layerManager.createTextLayer(`Layer ${i}`, i * 10, 50)
      }

      // Remove all layers
      layerManager.clearLayers()

      // Dispose manager
      layerManager.dispose()

      // Force garbage collection
      if (global.gc) {
        global.gc()
        global.gc()
      }

      await wait(100)

      const finalSnapshot = createMemorySnapshot()
      const memoryIncrease = finalSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(2000000) // Less than 2MB
    })

    test('should dispose texture resources properly', () => {
      const layerManager = new LayerManager()
      layerManager.initializeTexture()

      const disposeSpy = vi.spyOn(layerManager.texture, 'dispose')

      layerManager.dispose()

      expect(disposeSpy).toHaveBeenCalled()
    })

    test('should clear texture cache on disposal', () => {
      const layerManager = new LayerManager()
      layerManager.initializeTexture()

      // Add items to cache
      layerManager.textMetricsCache.set('test1', { width: 100, height: 20 })
      layerManager.textMetricsCache.set('test2', { width: 150, height: 25 })

      expect(layerManager.textMetricsCache.size).toBe(2)

      layerManager.dispose()

      expect(layerManager.textMetricsCache.size).toBe(0)
    })
  })

  describe('UIManager Memory Management', () => {
    test('should remove event listeners on disposal', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const uiManager = new UIManager()

      uiManager.dispose()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    test('should clear notification timers', async () => {
      const uiManager = new UIManager()

      // Create multiple notifications with timers
      for (let i = 0; i < 5; i++) {
        uiManager.showNotification(`Notification ${i}`, 'info', 5000)
      }

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      uiManager.dispose()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    test('should dispose color picker resources', () => {
      const uiManager = new UIManager()

      if (uiManager.colorWheelPicker) {
        const disposeSpy = vi.spyOn(uiManager.colorWheelPicker, 'dispose')

        uiManager.dispose()

        expect(disposeSpy).toHaveBeenCalled()
      }
    })
  })

  describe('SessionManager Memory Management', () => {
    test('should clear session data on disposal', () => {
      const sessionManager = new SessionManager()

      sessionManager.sessionData = { test: 'data' }
      sessionManager.currentSessionId = 'test-session'

      sessionManager.dispose()

      expect(sessionManager.sessionData).toBeNull()
      expect(sessionManager.currentSessionId).toBeNull()
    })

    test('should clear auto-save timers', () => {
      const sessionManager = new SessionManager()
      sessionManager.enableAutoSave(true, 1000)

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      sessionManager.dispose()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Integrated Memory Leak Detection', () => {
    test('should not leak memory during typical user workflow', async () => {
      const initialSnapshot = createMemorySnapshot()

      // Simulate typical user workflow
      for (let iteration = 0; iteration < 5; iteration++) {
        const sceneManager = new SceneManager(container)
        const layerManager = new LayerManager()
        const uiManager = new UIManager()
        const sessionManager = new SessionManager()

        // Initialize
        layerManager.initializeTexture()
        await sceneManager.loadModel('/models/test.glb')

        // Create layers
        for (let i = 0; i < 10; i++) {
          layerManager.createTextLayer(`Text ${i}`, i * 20, 50)
        }

        // Simulate layer operations
        const layers = layerManager.getLayers()
        for (const layer of layers) {
          layerManager.updateLayer(layer.id, {
            text: `Updated ${layer.text}`,
            fontSize: 20,
            color: '#ff0000'
          })
        }

        // Update textures
        layerManager.updateTexture(true)

        // Simulate session operations
        sessionManager.updateSessionData({
          layers: layers,
          modelPath: '/models/test.glb'
        })

        // Cleanup
        layerManager.dispose()
        sceneManager.dispose()
        uiManager.dispose()
        sessionManager.dispose()

        // Force cleanup between iterations
        if (global.gc) {
          global.gc()
        }
        await wait(50)
      }

      // Final cleanup
      if (global.gc) {
        global.gc()
        global.gc()
      }
      await wait(200)

      const finalSnapshot = createMemorySnapshot()
      const memoryIncrease = finalSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize

      // Memory increase should be reasonable for 5 iterations
      expect(memoryIncrease).toBeLessThan(10000000) // Less than 10MB
    })

    test('should detect canvas context leaks', async () => {
      const initialCanvases = document.querySelectorAll('canvas').length

      const managers = []

      // Create multiple managers that create canvases
      for (let i = 0; i < 10; i++) {
        const sceneManager = new SceneManager(container)
        const layerManager = new LayerManager()
        layerManager.initializeTexture()

        managers.push({ sceneManager, layerManager })
      }

      const midCanvases = document.querySelectorAll('canvas').length

      // Dispose all managers
      for (const { sceneManager, layerManager } of managers) {
        sceneManager.dispose()
        layerManager.dispose()
      }

      await wait(100)

      const finalCanvases = document.querySelectorAll('canvas').length

      // Should not have significantly more canvases than we started with
      expect(finalCanvases - initialCanvases).toBeLessThan(5)
    })

    test('should detect event listener leaks', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const managers = []

      // Create multiple UI managers
      for (let i = 0; i < 10; i++) {
        const uiManager = new UIManager()
        managers.push(uiManager)
      }

      const addedListeners = addEventListenerSpy.mock.calls.length

      // Dispose all managers
      for (const manager of managers) {
        manager.dispose()
      }

      const removedListeners = removeEventListenerSpy.mock.calls.length

      // Should remove at least as many listeners as were added
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners * 0.8)
    })
  })

  describe('Memory Usage Monitoring', () => {
    test('should track memory usage patterns', async () => {
      const memoryLog = []

      const logMemory = (label) => {
        const snapshot = createMemorySnapshot()
        memoryLog.push({
          label,
          timestamp: snapshot.timestamp,
          usedMemory: snapshot.usedJSHeapSize,
          totalMemory: snapshot.totalJSHeapSize
        })
      }

      logMemory('Initial')

      // Create scene manager
      const sceneManager = new SceneManager(container)
      logMemory('After SceneManager creation')

      // Load model
      await sceneManager.loadModel('/models/test.glb')
      logMemory('After model load')

      // Create layer manager
      const layerManager = new LayerManager()
      layerManager.initializeTexture()
      logMemory('After LayerManager creation')

      // Create many layers
      for (let i = 0; i < 50; i++) {
        layerManager.createTextLayer(`Layer ${i}`)
      }
      logMemory('After creating 50 layers')

      // Update textures multiple times
      for (let i = 0; i < 10; i++) {
        layerManager.updateTexture(true)
      }
      logMemory('After texture updates')

      // Cleanup
      layerManager.dispose()
      sceneManager.dispose()
      logMemory('After cleanup')

      // Force garbage collection
      if (global.gc) {
        global.gc()
        global.gc()
      }
      await wait(100)
      logMemory('After garbage collection')

      // Analyze memory patterns
      const initialMemory = memoryLog[0].usedMemory
      const peakMemory = Math.max(...memoryLog.map(entry => entry.usedMemory))
      const finalMemory = memoryLog[memoryLog.length - 1].usedMemory

      const memoryGrowth = finalMemory - initialMemory
      const peakUsage = peakMemory - initialMemory

      // Log for debugging
      console.log('Memory usage pattern:', memoryLog)
      console.log(`Memory growth: ${memoryGrowth / 1024 / 1024:.2f}MB`)
      console.log(`Peak usage: ${peakUsage / 1024 / 1024:.2f}MB`)

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(5000000) // Less than 5MB permanent growth
      expect(peakUsage).toBeLessThan(50000000) // Less than 50MB peak usage
    })

    test('should monitor WebGL resource usage', async () => {
      const sceneManager = new SceneManager(container)

      // Mock WebGL context to track resource creation
      const mockGL = sceneManager.renderer?.domElement?.getContext?.('webgl')
      if (mockGL) {
        const createdBuffers = []
        const createdTextures = []

        const originalCreateBuffer = mockGL.createBuffer
        const originalCreateTexture = mockGL.createTexture
        const originalDeleteBuffer = mockGL.deleteBuffer
        const originalDeleteTexture = mockGL.deleteTexture

        if (originalCreateBuffer) {
          mockGL.createBuffer = function() {
            const buffer = originalCreateBuffer.call(this)
            createdBuffers.push(buffer)
            return buffer
          }
        }

        if (originalCreateTexture) {
          mockGL.createTexture = function() {
            const texture = originalCreateTexture.call(this)
            createdTextures.push(texture)
            return texture
          }
        }

        // Load model and perform operations
        await sceneManager.loadModel('/models/test.glb')

        // Dispose and check cleanup
        sceneManager.dispose()

        // Verify resources were created
        expect(createdBuffers.length + createdTextures.length).toBeGreaterThan(0)
      }
    })
  })
})