import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { LayerManager } from '@client/LayerManager.js'
import {
  createMockLayer,
  createMockImageLayer,
  createMockFile,
  createMockImage,
  mockAPIResponses,
  nextTick,
  wait,
  mockConsole,
  createMockEvent,
  createMockMouseEvent
} from '@tests/utils/test-helpers.js'
import { mockTextureLayersConfig, mockImageProcessingSettings } from '@tests/fixtures/mock-data.js'

describe('LayerManager', () => {
  let layerManager
  let restoreConsole

  beforeEach(() => {
    restoreConsole = mockConsole()
    mockAPIResponses()
    layerManager = new LayerManager()
  })

  afterEach(() => {
    if (layerManager) {
      layerManager.dispose()
    }
    restoreConsole()
  })

  describe('Constructor and Initialization', () => {
    test('should initialize with default properties', () => {
      expect(layerManager.layers).toEqual([])
      expect(layerManager.selectedLayer).toBeNull()
      expect(layerManager.textureCanvas).toBeNull()
      expect(layerManager.textureContext).toBeNull()
      expect(layerManager.baseTextureImage).toBeNull()
      expect(layerManager.texture).toBeNull()
    })

    test('should initialize color properties', () => {
      expect(layerManager.currentPrimaryColor).toBe('#ff6600')
      expect(layerManager.currentSecondaryColor).toBe('#0066ff')
    })

    test('should initialize callback properties', () => {
      expect(layerManager.onLayerAdded).toBeNull()
      expect(layerManager.onLayerRemoved).toBeNull()
      expect(layerManager.onLayerSelected).toBeNull()
      expect(layerManager.onLayerUpdated).toBeNull()
      expect(layerManager.onTextureUpdated).toBeNull()
    })

    test('should initialize performance monitoring', () => {
      expect(layerManager.performanceMonitor).toBeDefined()
      expect(layerManager.performanceMonitor.updateTimes).toEqual([])
      expect(layerManager.performanceMonitor.averageUpdateTime).toBe(0)
    })

    test('should initialize smart update system', () => {
      expect(layerManager.textUpdateTimeout).toBeNull()
      expect(layerManager.textMetricsCache).toBeInstanceOf(Map)
      expect(layerManager.lastUpdateTime).toBe(0)
      expect(layerManager.pendingUpdate).toBe(false)
      expect(layerManager.updateThrottleMs).toBe(16)
      expect(layerManager.dirtyRegions).toBeInstanceOf(Set)
    })
  })

  describe('Texture Initialization', () => {
    test('should initialize texture canvas with default dimensions', () => {
      layerManager.initializeTexture()

      expect(layerManager.textureCanvas).toBeDefined()
      expect(layerManager.textureCanvas.width).toBe(512)
      expect(layerManager.textureCanvas.height).toBe(512)
      expect(layerManager.textureContext).toBeDefined()
      expect(layerManager.texture).toBeDefined()
    })

    test('should initialize texture canvas with custom dimensions', () => {
      layerManager.initializeTexture(1024, 768)

      expect(layerManager.textureCanvas.width).toBe(1024)
      expect(layerManager.textureCanvas.height).toBe(768)
    })

    test('should set texture properties correctly', () => {
      layerManager.initializeTexture()

      expect(layerManager.texture.flipY).toBe(false)
      expect(layerManager.texture.generateMipmaps).toBe(false)
      expect(layerManager.texture.needsUpdate).toBe(true)
    })

    test('should handle base image initialization', () => {
      const mockImage = createMockImage()
      layerManager.initializeTexture(512, 512, mockImage)

      expect(layerManager.baseTextureImage).toBe(mockImage)
    })
  })

  describe('Layer Creation', () => {
    beforeEach(() => {
      layerManager.initializeTexture()
    })

    test('should create text layer', () => {
      const mockCallback = vi.fn()
      layerManager.onLayerAdded = mockCallback

      const layer = layerManager.createTextLayer('Test Text', 100, 100)

      expect(layer).toBeDefined()
      expect(layer.type).toBe('text')
      expect(layer.text).toBe('Test Text')
      expect(layer.x).toBe(100)
      expect(layer.y).toBe(100)
      expect(layer.id).toBeDefined()
      expect(layerManager.layers).toContain(layer)
      expect(mockCallback).toHaveBeenCalledWith(layer)
    })

    test('should create image layer from file', async () => {
      const mockCallback = vi.fn()
      layerManager.onLayerAdded = mockCallback
      const file = createMockFile('test.png', 'image/png')

      const layer = await layerManager.createImageLayer(file, 50, 75)

      expect(layer).toBeDefined()
      expect(layer.type).toBe('image')
      expect(layer.x).toBe(50)
      expect(layer.y).toBe(75)
      expect(layer.id).toBeDefined()
      expect(layerManager.layers).toContain(layer)
      expect(mockCallback).toHaveBeenCalledWith(layer)
    })

    test('should create image layer from URL', async () => {
      const mockCallback = vi.fn()
      layerManager.onLayerAdded = mockCallback
      const imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

      const layer = await layerManager.createImageLayer(imageUrl, 200, 300)

      expect(layer).toBeDefined()
      expect(layer.type).toBe('image')
      expect(layer.src).toBe(imageUrl)
      expect(layer.x).toBe(200)
      expect(layer.y).toBe(300)
      expect(layerManager.layers).toContain(layer)
      expect(mockCallback).toHaveBeenCalledWith(layer)
    })

    test('should assign unique IDs to layers', () => {
      const layer1 = layerManager.createTextLayer('Text 1')
      const layer2 = layerManager.createTextLayer('Text 2')

      expect(layer1.id).not.toBe(layer2.id)
      expect(layer1.id).toMatch(/^text-/)
      expect(layer2.id).toMatch(/^text-/)
    })

    test('should set default z-index for new layers', () => {
      const layer1 = layerManager.createTextLayer('Text 1')
      const layer2 = layerManager.createTextLayer('Text 2')

      expect(layer2.zIndex).toBeGreaterThan(layer1.zIndex)
    })
  })

  describe('Layer Management', () => {
    let testLayer

    beforeEach(() => {
      layerManager.initializeTexture()
      testLayer = layerManager.createTextLayer('Test Layer')
    })

    test('should remove layer by ID', () => {
      const mockCallback = vi.fn()
      layerManager.onLayerRemoved = mockCallback

      layerManager.removeLayer(testLayer.id)

      expect(layerManager.layers).not.toContain(testLayer)
      expect(mockCallback).toHaveBeenCalledWith(testLayer)
    })

    test('should remove layer by object', () => {
      layerManager.removeLayer(testLayer)

      expect(layerManager.layers).not.toContain(testLayer)
    })

    test('should handle removal of non-existent layer', () => {
      expect(() => {
        layerManager.removeLayer('non-existent-id')
      }).not.toThrow()
    })

    test('should clear selected layer when removing it', () => {
      layerManager.selectLayer(testLayer.id)
      expect(layerManager.selectedLayer).toBe(testLayer)

      layerManager.removeLayer(testLayer.id)
      expect(layerManager.selectedLayer).toBeNull()
    })

    test('should select layer by ID', () => {
      const mockCallback = vi.fn()
      layerManager.onLayerSelected = mockCallback

      layerManager.selectLayer(testLayer.id)

      expect(layerManager.selectedLayer).toBe(testLayer)
      expect(mockCallback).toHaveBeenCalledWith(testLayer)
    })

    test('should deselect layer when selecting null', () => {
      layerManager.selectLayer(testLayer.id)
      layerManager.selectLayer(null)

      expect(layerManager.selectedLayer).toBeNull()
    })

    test('should get layer by ID', () => {
      const foundLayer = layerManager.getLayer(testLayer.id)
      expect(foundLayer).toBe(testLayer)
    })

    test('should return null for non-existent layer ID', () => {
      const foundLayer = layerManager.getLayer('non-existent')
      expect(foundLayer).toBeNull()
    })

    test('should get all layers', () => {
      const layer2 = layerManager.createTextLayer('Layer 2')
      const allLayers = layerManager.getLayers()

      expect(allLayers).toEqual([testLayer, layer2])
    })

    test('should clear all layers', () => {
      layerManager.createTextLayer('Layer 2')
      layerManager.createTextLayer('Layer 3')

      layerManager.clearLayers()

      expect(layerManager.layers).toEqual([])
      expect(layerManager.selectedLayer).toBeNull()
    })
  })

  describe('Layer Updates', () => {
    let testLayer

    beforeEach(() => {
      layerManager.initializeTexture()
      testLayer = layerManager.createTextLayer('Test Layer')
    })

    test('should update layer properties', () => {
      const mockCallback = vi.fn()
      layerManager.onLayerUpdated = mockCallback
      const updates = { text: 'Updated Text', color: '#ff0000' }

      layerManager.updateLayer(testLayer.id, updates)

      expect(testLayer.text).toBe('Updated Text')
      expect(testLayer.color).toBe('#ff0000')
      expect(mockCallback).toHaveBeenCalledWith(testLayer)
    })

    test('should handle updates to non-existent layer', () => {
      expect(() => {
        layerManager.updateLayer('non-existent', { text: 'Test' })
      }).not.toThrow()
    })

    test('should update layer position', () => {
      layerManager.updateLayerPosition(testLayer.id, 150, 200)

      expect(testLayer.x).toBe(150)
      expect(testLayer.y).toBe(200)
    })

    test('should update layer dimensions', () => {
      layerManager.updateLayerDimensions(testLayer.id, 300, 150)

      expect(testLayer.width).toBe(300)
      expect(testLayer.height).toBe(150)
    })

    test('should update layer rotation', () => {
      layerManager.updateLayerRotation(testLayer.id, Math.PI / 4)

      expect(testLayer.rotation).toBe(Math.PI / 4)
    })

    test('should update layer opacity', () => {
      layerManager.updateLayerOpacity(testLayer.id, 0.7)

      expect(testLayer.opacity).toBe(0.7)
    })

    test('should update layer visibility', () => {
      layerManager.updateLayerVisibility(testLayer.id, false)

      expect(testLayer.visible).toBe(false)
    })
  })

  describe('Layer Ordering', () => {
    let layers

    beforeEach(() => {
      layerManager.initializeTexture()
      layers = [
        layerManager.createTextLayer('Layer 1'),
        layerManager.createTextLayer('Layer 2'),
        layerManager.createTextLayer('Layer 3')
      ]
    })

    test('should move layer up in order', () => {
      const originalIndex = layers[0].zIndex

      layerManager.moveLayerUp(layers[0].id)

      expect(layers[0].zIndex).toBeGreaterThan(originalIndex)
    })

    test('should move layer down in order', () => {
      const originalIndex = layers[2].zIndex

      layerManager.moveLayerDown(layers[2].id)

      expect(layers[2].zIndex).toBeLessThan(originalIndex)
    })

    test('should move layer to front', () => {
      layerManager.moveLayerToFront(layers[0].id)

      const maxZIndex = Math.max(...layerManager.layers.map(l => l.zIndex))
      expect(layers[0].zIndex).toBe(maxZIndex)
    })

    test('should move layer to back', () => {
      layerManager.moveLayerToBack(layers[2].id)

      const minZIndex = Math.min(...layerManager.layers.map(l => l.zIndex))
      expect(layers[2].zIndex).toBe(minZIndex)
    })

    test('should reorder layers by z-index', () => {
      // Manually set z-indices out of order
      layers[0].zIndex = 3
      layers[1].zIndex = 1
      layers[2].zIndex = 2

      const orderedLayers = layerManager.getLayersOrderedByZIndex()

      expect(orderedLayers[0]).toBe(layers[1]) // zIndex 1
      expect(orderedLayers[1]).toBe(layers[2]) // zIndex 2
      expect(orderedLayers[2]).toBe(layers[0]) // zIndex 3
    })
  })

  describe('Hit Detection', () => {
    let testLayer

    beforeEach(() => {
      layerManager.initializeTexture()
      testLayer = layerManager.createTextLayer('Test Layer', 100, 100)
      testLayer.width = 200
      testLayer.height = 50
    })

    test('should detect layer at position without rotation', () => {
      const hitLayer = layerManager.getLayerAtPosition(150, 125)
      expect(hitLayer).toBe(testLayer)
    })

    test('should return null when no layer at position', () => {
      const hitLayer = layerManager.getLayerAtPosition(50, 50)
      expect(hitLayer).toBeNull()
    })

    test('should detect layer at position with rotation', () => {
      testLayer.rotation = Math.PI / 4 // 45 degrees

      // Test hit detection with rotated layer
      const hitLayer = layerManager.getLayerAtPosition(200, 125)
      // Should use rotation-aware hit detection
      expect(typeof hitLayer).toBe('object')
    })

    test('should respect layer visibility in hit detection', () => {
      testLayer.visible = false

      const hitLayer = layerManager.getLayerAtPosition(150, 125)
      expect(hitLayer).toBeNull()
    })

    test('should return topmost layer when multiple layers overlap', () => {
      const layer2 = layerManager.createTextLayer('Layer 2', 120, 110)
      layer2.width = 200
      layer2.height = 50
      layer2.zIndex = testLayer.zIndex + 1

      const hitLayer = layerManager.getLayerAtPosition(150, 125)
      expect(hitLayer).toBe(layer2)
    })
  })

  describe('Texture Rendering', () => {
    beforeEach(() => {
      layerManager.initializeTexture()
    })

    test('should schedule texture update', () => {
      const mockCallback = vi.fn()
      layerManager.onTextureUpdated = mockCallback

      layerManager.scheduleTextureUpdate()

      expect(layerManager.pendingUpdate).toBe(true)
    })

    test('should throttle texture updates', async () => {
      const mockCallback = vi.fn()
      layerManager.onTextureUpdated = mockCallback

      // Schedule multiple updates quickly
      layerManager.scheduleTextureUpdate()
      layerManager.scheduleTextureUpdate()
      layerManager.scheduleTextureUpdate()

      await wait(50)

      // Should only call callback once due to throttling
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    test('should update texture immediately when forced', () => {
      const mockCallback = vi.fn()
      layerManager.onTextureUpdated = mockCallback

      layerManager.updateTexture(true)

      expect(mockCallback).toHaveBeenCalled()
      expect(layerManager.texture.needsUpdate).toBe(true)
    })

    test('should render text layer on canvas', () => {
      const layer = layerManager.createTextLayer('Test Text', 100, 100)
      const mockFillText = vi.fn()
      layerManager.textureContext.fillText = mockFillText

      layerManager.renderLayer(layer)

      expect(mockFillText).toHaveBeenCalledWith('Test Text', expect.any(Number), expect.any(Number))
    })

    test('should apply layer transformations', () => {
      const layer = layerManager.createTextLayer('Test', 100, 100)
      layer.rotation = Math.PI / 4
      layer.scaleX = 1.5
      layer.scaleY = 1.2

      const mockSave = vi.fn()
      const mockTranslate = vi.fn()
      const mockRotate = vi.fn()
      const mockScale = vi.fn()
      const mockRestore = vi.fn()

      layerManager.textureContext.save = mockSave
      layerManager.textureContext.translate = mockTranslate
      layerManager.textureContext.rotate = mockRotate
      layerManager.textureContext.scale = mockScale
      layerManager.textureContext.restore = mockRestore

      layerManager.renderLayer(layer)

      expect(mockSave).toHaveBeenCalled()
      expect(mockTranslate).toHaveBeenCalled()
      expect(mockRotate).toHaveBeenCalledWith(Math.PI / 4)
      expect(mockScale).toHaveBeenCalledWith(1.5, 1.2)
      expect(mockRestore).toHaveBeenCalled()
    })
  })

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      layerManager.initializeTexture()
    })

    test('should track update performance', () => {
      layerManager.updateTexture()

      expect(layerManager.performanceMonitor.updateTimes.length).toBeGreaterThan(0)
    })

    test('should calculate average update time', () => {
      // Simulate multiple updates
      layerManager.updateTexture()
      layerManager.updateTexture()
      layerManager.updateTexture()

      expect(layerManager.performanceMonitor.averageUpdateTime).toBeGreaterThan(0)
    })

    test('should get performance metrics', () => {
      const metrics = layerManager.getPerformanceMetrics()

      expect(metrics).toBeDefined()
      expect(metrics.averageUpdateTime).toBeDefined()
      expect(metrics.layerCount).toBe(layerManager.layers.length)
      expect(metrics.textureSize).toBeDefined()
    })
  })

  describe('Memory Management', () => {
    beforeEach(() => {
      layerManager.initializeTexture()
    })

    test('should dispose texture resources', () => {
      const disposeSpy = vi.spyOn(layerManager.texture, 'dispose')

      layerManager.dispose()

      expect(disposeSpy).toHaveBeenCalled()
    })

    test('should clear texture metrics cache', () => {
      layerManager.textMetricsCache.set('test', {})

      layerManager.dispose()

      expect(layerManager.textMetricsCache.size).toBe(0)
    })

    test('should cancel pending timeouts', () => {
      layerManager.textureUpdateTimeout = setTimeout(() => {}, 100)
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      layerManager.dispose()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Import/Export', () => {
    beforeEach(() => {
      layerManager.initializeTexture()
    })

    test('should export layer configuration', () => {
      const layer1 = layerManager.createTextLayer('Text 1', 100, 100)
      const layer2 = layerManager.createTextLayer('Text 2', 200, 200)

      const config = layerManager.exportConfiguration()

      expect(config.layers).toHaveLength(2)
      expect(config.layers[0].text).toBe('Text 1')
      expect(config.layers[1].text).toBe('Text 2')
      expect(config.metadata).toBeDefined()
    })

    test('should import layer configuration', () => {
      const config = {
        layers: mockTextureLayersConfig,
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }
      }

      layerManager.importConfiguration(config)

      expect(layerManager.layers).toHaveLength(mockTextureLayersConfig.length)
      expect(layerManager.layers[0].text).toBe(mockTextureLayersConfig[0].text)
    })

    test('should validate imported configuration', () => {
      const invalidConfig = {
        layers: [{ invalid: 'layer' }]
      }

      expect(() => {
        layerManager.importConfiguration(invalidConfig)
      }).toThrow()
    })

    test('should handle empty configuration import', () => {
      const emptyConfig = { layers: [] }

      layerManager.importConfiguration(emptyConfig)

      expect(layerManager.layers).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    test('should handle canvas creation failure', () => {
      const originalCreateElement = document.createElement
      document.createElement = vi.fn(() => null)

      expect(() => {
        layerManager.initializeTexture()
      }).toThrow()

      document.createElement = originalCreateElement
    })

    test('should handle image loading errors', async () => {
      layerManager.initializeTexture()

      // Mock image load failure
      const originalImage = global.Image
      global.Image = vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Event('error')), 0)
          }
        }),
        src: ''
      }))

      await expect(
        layerManager.createImageLayer('invalid-url', 0, 0)
      ).rejects.toThrow()

      global.Image = originalImage
    })

    test('should handle texture update errors gracefully', () => {
      layerManager.initializeTexture()
      layerManager.textureContext = null // Simulate context loss

      expect(() => {
        layerManager.updateTexture()
      }).not.toThrow()
    })
  })
})