import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SceneManager } from '@client/SceneManager.js'
import {
  setupMockDOM,
  createMockContainer,
  mockAPIResponses,
  nextTick,
  mockConsole,
  createMemorySnapshot
} from '@tests/utils/test-helpers.js'
import { mockGLBModel, mockPerformanceMetrics } from '@tests/fixtures/mock-data.js'

describe('SceneManager', () => {
  let sceneManager
  let container
  let restoreConsole

  beforeEach(() => {
    // Set up DOM environment
    container = createMockContainer()
    restoreConsole = mockConsole()
    mockAPIResponses()

    // Create SceneManager instance
    sceneManager = new SceneManager(container)
  })

  afterEach(() => {
    if (sceneManager) {
      sceneManager.dispose()
    }
    restoreConsole()
    container?.remove()
  })

  describe('Constructor and Initialization', () => {
    test('should initialize with required properties', () => {
      expect(sceneManager.container).toBe(container)
      expect(sceneManager.scene).toBeDefined()
      expect(sceneManager.camera).toBeDefined()
      expect(sceneManager.renderer).toBeDefined()
      expect(sceneManager.controls).toBeDefined()
      expect(sceneManager.raycaster).toBeDefined()
      expect(sceneManager.mouse).toBeDefined()
      expect(sceneManager.performanceMonitor).toBeDefined()
    })

    test('should initialize Three.js scene with correct settings', () => {
      expect(sceneManager.scene.background.getHex()).toBe(0xffffff)
      expect(sceneManager.camera.fov).toBe(35)
      expect(sceneManager.camera.aspect).toBeCloseTo(container.clientWidth / container.clientHeight)
      expect(sceneManager.camera.near).toBe(0.1)
      expect(sceneManager.camera.far).toBe(1000)
    })

    test('should set initial camera position', () => {
      expect(sceneManager.camera.position.x).toBe(0)
      expect(sceneManager.camera.position.y).toBe(1)
      expect(sceneManager.camera.position.z).toBe(3)
    })

    test('should initialize render-on-demand system', () => {
      expect(sceneManager.needsRender).toBe(true)
      expect(sceneManager.isRendering).toBe(false)
      expect(sceneManager.renderRequestId).toBeNull()
    })

    test('should append renderer to container', () => {
      expect(container.children).toContain(sceneManager.renderer.domElement)
    })
  })

  describe('Scene Setup and Lighting', () => {
    test('should set up scene lighting correctly', () => {
      const lights = sceneManager.scene.children.filter(child =>
        child.constructor.name.includes('Light')
      )
      expect(lights.length).toBeGreaterThan(0)
    })

    test('should configure renderer settings', () => {
      expect(sceneManager.renderer.setSize).toHaveBeenCalledWith(
        container.clientWidth,
        container.clientHeight
      )
      expect(sceneManager.renderer.setPixelRatio).toHaveBeenCalledWith(
        window.devicePixelRatio
      )
    })

    test('should set up orbit controls', () => {
      expect(sceneManager.controls).toBeDefined()
      expect(sceneManager.controls.enableDamping).toBe(true)
      expect(sceneManager.controls.dampingFactor).toBe(0.25)
      expect(sceneManager.controls.enableZoom).toBe(true)
    })
  })

  describe('Model Loading', () => {
    test('should load GLB model successfully', async () => {
      const mockOnLoaded = vi.fn()
      sceneManager.onModelLoaded = mockOnLoaded

      await sceneManager.loadModel('/models/test.glb')

      expect(sceneManager.isLoading).toBe(false)
      expect(sceneManager.model).toBeDefined()
      expect(mockOnLoaded).toHaveBeenCalled()
    })

    test('should handle model loading errors', async () => {
      const mockOnError = vi.fn()
      sceneManager.onModelError = mockOnError

      // Mock loader to simulate error
      const mockLoader = sceneManager.loader || { load: vi.fn() }
      mockLoader.load.mockImplementation((url, onLoad, onProgress, onError) => {
        onError(new Error('Failed to load model'))
      })

      await expect(sceneManager.loadModel('/invalid/model.glb')).rejects.toThrow()
      expect(mockOnError).toHaveBeenCalled()
    })

    test('should set loading state during model load', () => {
      sceneManager.loadModel('/models/test.glb')
      expect(sceneManager.isLoading).toBe(true)
    })

    test('should clear existing model before loading new one', async () => {
      // Load first model
      await sceneManager.loadModel('/models/first.glb')
      const firstModel = sceneManager.model

      // Load second model
      await sceneManager.loadModel('/models/second.glb')

      expect(sceneManager.model).not.toBe(firstModel)
    })
  })

  describe('Model Clearing and Memory Management', () => {
    beforeEach(async () => {
      await sceneManager.loadModel('/models/test.glb')
    })

    test('should clear model from scene', () => {
      expect(sceneManager.model).toBeDefined()

      sceneManager.clearModel()

      expect(sceneManager.model).toBeNull()
      expect(sceneManager.material).toBeNull()
    })

    test('should dispose geometries and materials', () => {
      const mockDispose = vi.fn()
      sceneManager.model.traverse = vi.fn((callback) => {
        const mockChild = {
          geometry: { dispose: mockDispose },
          material: { dispose: mockDispose }
        }
        callback(mockChild)
      })

      sceneManager.clearModel()

      expect(mockDispose).toHaveBeenCalled()
    })

    test('should remove model from scene', () => {
      const initialChildCount = sceneManager.scene.children.length

      sceneManager.clearModel()

      expect(sceneManager.scene.remove).toHaveBeenCalled()
    })
  })

  describe('Render System', () => {
    test('should request render when needed', () => {
      sceneManager.needsRender = true
      sceneManager.render()

      expect(sceneManager.renderer.render).toHaveBeenCalledWith(
        sceneManager.scene,
        sceneManager.camera
      )
    })

    test('should not render when not needed', () => {
      sceneManager.needsRender = false
      const renderCalls = sceneManager.renderer.render.mock.calls.length

      sceneManager.render()

      expect(sceneManager.renderer.render.mock.calls.length).toBe(renderCalls)
    })

    test('should update controls during render', () => {
      sceneManager.needsRender = true
      sceneManager.render()

      expect(sceneManager.controls.update).toHaveBeenCalled()
    })

    test('should track render performance', () => {
      const performanceSpy = vi.spyOn(sceneManager.performanceMonitor, 'measure')

      sceneManager.needsRender = true
      sceneManager.render()

      expect(performanceSpy).toHaveBeenCalledWith('scene-render', expect.any(Function))
    })
  })

  describe('Camera Controls', () => {
    test('should set camera position', () => {
      const position = { x: 1, y: 2, z: 3 }

      sceneManager.setCameraPosition(position)

      expect(sceneManager.camera.position.set).toHaveBeenCalledWith(1, 2, 3)
      expect(sceneManager.needsRender).toBe(true)
    })

    test('should get current camera position', () => {
      sceneManager.camera.position = { x: 1, y: 2, z: 3 }

      const position = sceneManager.getCameraPosition()

      expect(position).toEqual({ x: 1, y: 2, z: 3 })
    })

    test('should handle camera movement callback', () => {
      const mockCallback = vi.fn()
      sceneManager.onCameraStart = mockCallback

      // Simulate camera start event
      sceneManager.controls.dispatchEvent = vi.fn()
      if (sceneManager.handleCameraStart) {
        sceneManager.handleCameraStart()
      }

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should update camera aspect ratio on resize', () => {
      const newWidth = 800
      const newHeight = 600

      sceneManager.handleResize(newWidth, newHeight)

      expect(sceneManager.camera.aspect).toBe(newWidth / newHeight)
      expect(sceneManager.camera.updateProjectionMatrix).toHaveBeenCalled()
      expect(sceneManager.renderer.setSize).toHaveBeenCalledWith(newWidth, newHeight)
    })
  })

  describe('Texture Updates', () => {
    beforeEach(async () => {
      await sceneManager.loadModel('/models/test.glb')
    })

    test('should update material texture', () => {
      const mockTexture = { needsUpdate: true }

      sceneManager.updateTexture(mockTexture)

      if (sceneManager.material) {
        expect(sceneManager.material.map).toBe(mockTexture)
        expect(sceneManager.needsRender).toBe(true)
      }
    })

    test('should handle null texture', () => {
      expect(() => {
        sceneManager.updateTexture(null)
      }).not.toThrow()
    })

    test('should update texture when material exists', () => {
      const mockMaterial = { map: null }
      sceneManager.material = mockMaterial
      const mockTexture = { needsUpdate: true }

      sceneManager.updateTexture(mockTexture)

      expect(mockMaterial.map).toBe(mockTexture)
    })
  })

  describe('Mouse Interaction', () => {
    test('should handle mouse movement', () => {
      const event = {
        clientX: 100,
        clientY: 150,
        currentTarget: {
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 })
        }
      }

      sceneManager.handleMouseMove(event)

      expect(sceneManager.mouse.x).toBeCloseTo((100 / 300) * 2 - 1)
      expect(sceneManager.mouse.y).toBeCloseTo(-((150 / 200) * 2 - 1))
    })

    test('should update raycaster on mouse move', () => {
      const event = {
        clientX: 150,
        clientY: 100,
        currentTarget: {
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 })
        }
      }

      sceneManager.handleMouseMove(event)

      expect(sceneManager.raycaster.setFromCamera).toHaveBeenCalledWith(
        sceneManager.mouse,
        sceneManager.camera
      )
    })
  })

  describe('Performance Monitoring', () => {
    test('should measure render performance', () => {
      const measureSpy = vi.spyOn(sceneManager.performanceMonitor, 'measure')

      sceneManager.needsRender = true
      sceneManager.render()

      expect(measureSpy).toHaveBeenCalledWith('scene-render', expect.any(Function))
    })

    test('should track frame rate', () => {
      const trackSpy = vi.spyOn(sceneManager.performanceMonitor, 'trackMetric')

      sceneManager.needsRender = true
      sceneManager.render()

      expect(trackSpy).toHaveBeenCalledWith('fps', expect.any(Number))
    })

    test('should get performance metrics', () => {
      const metrics = sceneManager.getPerformanceMetrics()

      expect(metrics).toBeDefined()
      expect(typeof metrics).toBe('object')
    })
  })

  describe('Memory Management', () => {
    test('should dispose resources on cleanup', () => {
      const disposeSpy = vi.spyOn(sceneManager.renderer, 'dispose')
      const controlsDisposeSpy = vi.spyOn(sceneManager.controls, 'dispose')

      sceneManager.dispose()

      expect(disposeSpy).toHaveBeenCalled()
      expect(controlsDisposeSpy).toHaveBeenCalled()
    })

    test('should remove event listeners on dispose', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      sceneManager.dispose()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    test('should cancel render requests on dispose', () => {
      sceneManager.renderRequestId = 123
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')

      sceneManager.dispose()

      expect(cancelSpy).toHaveBeenCalledWith(123)
    })

    test('should detect memory leaks', async () => {
      const beforeSnapshot = createMemorySnapshot()

      // Perform operations that might leak memory
      await sceneManager.loadModel('/models/test.glb')
      sceneManager.clearModel()

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      await nextTick()

      const afterSnapshot = createMemorySnapshot()

      // Memory should not increase significantly after cleanup
      const memoryIncrease = afterSnapshot.usedJSHeapSize - beforeSnapshot.usedJSHeapSize
      expect(memoryIncrease).toBeLessThan(1000000) // Less than 1MB increase
    })
  })

  describe('Error Handling', () => {
    test('should handle WebGL context loss', () => {
      const contextLossEvent = new Event('webglcontextlost')

      expect(() => {
        sceneManager.renderer.domElement.dispatchEvent(contextLossEvent)
      }).not.toThrow()
    })

    test('should handle WebGL context restoration', () => {
      const contextRestoreEvent = new Event('webglcontextrestored')

      expect(() => {
        sceneManager.renderer.domElement.dispatchEvent(contextRestoreEvent)
      }).not.toThrow()
    })

    test('should handle invalid container', () => {
      expect(() => {
        new SceneManager(null)
      }).toThrow()
    })

    test('should handle resize with zero dimensions', () => {
      expect(() => {
        sceneManager.handleResize(0, 0)
      }).not.toThrow()

      expect(sceneManager.camera.aspect).toBe(1) // Should default to 1:1 aspect ratio
    })
  })

  describe('State Management', () => {
    test('should save and restore camera state', () => {
      const originalPosition = { x: 1, y: 2, z: 3 }
      sceneManager.setCameraPosition(originalPosition)

      const state = sceneManager.getState()
      expect(state.cameraPosition).toEqual(originalPosition)

      // Change position
      sceneManager.setCameraPosition({ x: 4, y: 5, z: 6 })

      // Restore state
      sceneManager.setState(state)
      expect(sceneManager.getCameraPosition()).toEqual(originalPosition)
    })

    test('should include model path in state', async () => {
      const modelPath = '/models/test.glb'
      await sceneManager.loadModel(modelPath)

      const state = sceneManager.getState()
      expect(state.modelPath).toBe(modelPath)
    })

    test('should handle state restoration without model', () => {
      const state = {
        cameraPosition: { x: 1, y: 2, z: 3 },
        modelPath: null
      }

      expect(() => {
        sceneManager.setState(state)
      }).not.toThrow()
    })
  })
})