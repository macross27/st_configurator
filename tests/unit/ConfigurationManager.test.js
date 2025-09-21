import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConfigurationManager } from '@client/ConfigurationManager.js'
import {
  mockAPIResponses,
  createMockFile,
  nextTick,
  wait,
  mockConsole,
  expectToThrow
} from '@tests/utils/test-helpers.js'
import { mockSessionData, mockServerConfig } from '@tests/fixtures/mock-data.js'

describe('ConfigurationManager', () => {
  let configManager
  let restoreConsole

  beforeEach(() => {
    restoreConsole = mockConsole()
    mockAPIResponses()

    configManager = new ConfigurationManager({
      serverUrl: 'http://localhost:3030'
    })
  })

  afterEach(() => {
    if (configManager) {
      configManager.dispose()
    }
    restoreConsole()
  })

  describe('Constructor and Initialization', () => {
    test('should initialize with default properties', () => {
      expect(configManager.serverUrl).toBe('http://localhost:3030')
      expect(configManager.currentConfig).toBeNull()
      expect(configManager.configHistory).toEqual([])
      expect(configManager.maxHistorySize).toBe(10)
    })

    test('should initialize with custom options', () => {
      const manager = new ConfigurationManager({
        serverUrl: 'http://localhost:3030',
        maxHistorySize: 20,
        autoSave: true
      })

      expect(manager.maxHistorySize).toBe(20)
      expect(manager.autoSave).toBe(true)

      manager.dispose()
    })

    test('should load server configuration on initialization', () => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3030/api/config')
    })
  })

  describe('Configuration Loading', () => {
    test('should load configuration from server', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServerConfig)
      })

      const config = await configManager.loadServerConfig()

      expect(config).toEqual(mockServerConfig)
      expect(configManager.serverConfig).toEqual(mockServerConfig)
    })

    test('should handle server config loading failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expectToThrow(
        () => configManager.loadServerConfig(),
        'Failed to load server configuration'
      )
    })

    test('should use cached config when available', async () => {
      configManager.serverConfig = mockServerConfig
      const fetchCallsBeforeLoad = fetch.mock.calls.length

      const config = await configManager.loadServerConfig()

      expect(config).toEqual(mockServerConfig)
      expect(fetch.mock.calls.length).toBe(fetchCallsBeforeLoad) // No new calls
    })

    test('should force reload when specified', async () => {
      configManager.serverConfig = mockServerConfig

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServerConfig)
      })

      await configManager.loadServerConfig(true) // Force reload

      expect(fetch).toHaveBeenCalledWith('http://localhost:3030/api/config')
    })
  })

  describe('Configuration Import/Export', () => {
    test('should export current configuration', () => {
      const testConfig = {
        name: 'Test Configuration',
        layers: [
          { id: 'layer-1', type: 'text', text: 'Hello' }
        ],
        metadata: {
          version: '1.0.0',
          created: new Date().toISOString()
        }
      }

      configManager.currentConfig = testConfig

      const exported = configManager.exportConfiguration()

      expect(exported).toEqual(testConfig)
      expect(exported.metadata.exported).toBeDefined()
    })

    test('should export configuration as JSON string', () => {
      const testConfig = { name: 'Test', layers: [] }
      configManager.currentConfig = testConfig

      const jsonString = configManager.exportAsJSON()

      expect(typeof jsonString).toBe('string')
      expect(JSON.parse(jsonString)).toEqual(expect.objectContaining(testConfig))
    })

    test('should import configuration from object', () => {
      const importConfig = {
        name: 'Imported Config',
        layers: [
          { id: 'imported-layer', type: 'text' }
        ]
      }

      configManager.importConfiguration(importConfig)

      expect(configManager.currentConfig).toEqual(importConfig)
    })

    test('should import configuration from JSON string', () => {
      const configObj = { name: 'JSON Config', layers: [] }
      const jsonString = JSON.stringify(configObj)

      configManager.importFromJSON(jsonString)

      expect(configManager.currentConfig).toEqual(configObj)
    })

    test('should validate imported configuration', () => {
      const invalidConfigs = [
        null,
        'invalid json',
        '{"invalid": "structure"}',
        { layers: 'not an array' }
      ]

      invalidConfigs.forEach(config => {
        expect(() => {
          if (typeof config === 'string') {
            configManager.importFromJSON(config)
          } else {
            configManager.importConfiguration(config)
          }
        }).toThrow()
      })
    })
  })

  describe('File Operations', () => {
    test('should save configuration to file', async () => {
      const testConfig = { name: 'Test Config', layers: [] }
      configManager.currentConfig = testConfig

      // Mock URL.createObjectURL and link click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      document.createElement = vi.fn(() => mockLink)
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')

      await configManager.saveToFile('test-config.json')

      expect(mockLink.download).toBe('test-config.json')
      expect(mockLink.click).toHaveBeenCalled()
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    test('should load configuration from file', async () => {
      const configData = { name: 'File Config', layers: [] }
      const file = createMockFile('config.json', 'application/json')

      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null,
        onerror: null,
        result: JSON.stringify(configData)
      }
      global.FileReader = vi.fn(() => mockFileReader)

      const loadPromise = configManager.loadFromFile(file)

      // Simulate successful file read
      mockFileReader.onload({ target: mockFileReader })

      const result = await loadPromise

      expect(result).toEqual(configData)
      expect(configManager.currentConfig).toEqual(configData)
    })

    test('should handle file loading errors', async () => {
      const file = createMockFile('invalid.json', 'application/json')

      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null,
        onerror: null,
        result: 'invalid json'
      }
      global.FileReader = vi.fn(() => mockFileReader)

      const loadPromise = configManager.loadFromFile(file)

      // Simulate file read error
      mockFileReader.onerror(new Error('File read error'))

      await expectToThrow(() => loadPromise, 'File read error')
    })

    test('should validate file type', async () => {
      const invalidFile = createMockFile('image.png', 'image/png')

      await expectToThrow(
        () => configManager.loadFromFile(invalidFile),
        'Invalid file type'
      )
    })
  })

  describe('Configuration History', () => {
    test('should track configuration changes in history', () => {
      const config1 = { name: 'Config 1', layers: [] }
      const config2 = { name: 'Config 2', layers: [] }

      configManager.setConfiguration(config1)
      configManager.setConfiguration(config2)

      expect(configManager.configHistory).toHaveLength(2)
      expect(configManager.configHistory[0]).toEqual(config1)
      expect(configManager.configHistory[1]).toEqual(config2)
    })

    test('should limit history size', () => {
      configManager.maxHistorySize = 3

      // Add more configs than max size
      for (let i = 0; i < 5; i++) {
        configManager.setConfiguration({ name: `Config ${i}`, layers: [] })
      }

      expect(configManager.configHistory).toHaveLength(3)
      expect(configManager.configHistory[0].name).toBe('Config 2') // Oldest kept
      expect(configManager.configHistory[2].name).toBe('Config 4') // Most recent
    })

    test('should support undo functionality', () => {
      const config1 = { name: 'Config 1', layers: [] }
      const config2 = { name: 'Config 2', layers: [] }

      configManager.setConfiguration(config1)
      configManager.setConfiguration(config2)

      const undone = configManager.undo()

      expect(undone).toEqual(config1)
      expect(configManager.currentConfig).toEqual(config1)
    })

    test('should support redo functionality', () => {
      const config1 = { name: 'Config 1', layers: [] }
      const config2 = { name: 'Config 2', layers: [] }

      configManager.setConfiguration(config1)
      configManager.setConfiguration(config2)
      configManager.undo()

      const redone = configManager.redo()

      expect(redone).toEqual(config2)
      expect(configManager.currentConfig).toEqual(config2)
    })

    test('should handle undo when no history exists', () => {
      const undone = configManager.undo()

      expect(undone).toBeNull()
      expect(configManager.currentConfig).toBeNull()
    })

    test('should clear history', () => {
      configManager.setConfiguration({ name: 'Test', layers: [] })
      configManager.clearHistory()

      expect(configManager.configHistory).toEqual([])
    })
  })

  describe('Configuration Validation', () => {
    test('should validate valid configuration', () => {
      const validConfig = {
        name: 'Valid Config',
        layers: [
          {
            id: 'layer-1',
            type: 'text',
            x: 100,
            y: 100,
            width: 200,
            height: 50,
            text: 'Hello'
          }
        ],
        metadata: {
          version: '1.0.0'
        }
      }

      expect(configManager.validateConfiguration(validConfig)).toBe(true)
    })

    test('should reject invalid configurations', () => {
      const invalidConfigs = [
        null,
        undefined,
        {},
        { name: '' },
        { name: 'Test', layers: 'not an array' },
        { name: 'Test', layers: [{ invalid: 'layer' }] },
        { name: 'Test', layers: [], metadata: 'not an object' }
      ]

      invalidConfigs.forEach(config => {
        expect(configManager.validateConfiguration(config)).toBe(false)
      })
    })

    test('should validate layer structure', () => {
      const validLayer = {
        id: 'layer-1',
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50
      }

      expect(configManager.validateLayer(validLayer)).toBe(true)

      const invalidLayers = [
        null,
        {},
        { id: 'test' }, // Missing required fields
        { id: 'test', type: 'invalid' },
        { id: 'test', type: 'text', x: 'not a number' }
      ]

      invalidLayers.forEach(layer => {
        expect(configManager.validateLayer(layer)).toBe(false)
      })
    })
  })

  describe('Configuration Merging', () => {
    test('should merge configurations', () => {
      const baseConfig = {
        name: 'Base Config',
        layers: [
          { id: 'layer-1', type: 'text', text: 'Hello' }
        ],
        metadata: { version: '1.0.0' }
      }

      const updateConfig = {
        layers: [
          { id: 'layer-1', type: 'text', text: 'Updated Hello' },
          { id: 'layer-2', type: 'image', src: 'image.png' }
        ],
        metadata: { version: '1.1.0' }
      }

      const merged = configManager.mergeConfigurations(baseConfig, updateConfig)

      expect(merged.name).toBe('Base Config')
      expect(merged.layers).toHaveLength(2)
      expect(merged.layers[0].text).toBe('Updated Hello')
      expect(merged.layers[1].src).toBe('image.png')
      expect(merged.metadata.version).toBe('1.1.0')
    })

    test('should handle merge conflicts', () => {
      const config1 = {
        name: 'Config 1',
        layers: [{ id: 'layer-1', text: 'Text 1' }]
      }

      const config2 = {
        name: 'Config 2',
        layers: [{ id: 'layer-1', text: 'Text 2' }]
      }

      // Test different merge strategies
      const keepFirst = configManager.mergeConfigurations(config1, config2, 'first')
      expect(keepFirst.layers[0].text).toBe('Text 1')

      const keepSecond = configManager.mergeConfigurations(config1, config2, 'second')
      expect(keepSecond.layers[0].text).toBe('Text 2')
    })
  })

  describe('Auto-Save Functionality', () => {
    test('should enable auto-save', () => {
      configManager.enableAutoSave(true, 1000)

      expect(configManager.autoSave).toBe(true)
      expect(configManager.autoSaveInterval).toBe(1000)
    })

    test('should trigger auto-save on configuration changes', async () => {
      const saveSpy = vi.spyOn(configManager, 'saveToServer')
      configManager.enableAutoSave(true, 50)

      configManager.setConfiguration({ name: 'Auto Save Test', layers: [] })

      await wait(100)

      expect(saveSpy).toHaveBeenCalled()
    })

    test('should disable auto-save', () => {
      configManager.enableAutoSave(true, 1000)
      configManager.enableAutoSave(false)

      expect(configManager.autoSave).toBe(false)
    })
  })

  describe('Server Integration', () => {
    test('should save configuration to server', async () => {
      const config = { name: 'Server Config', layers: [] }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, id: 'config-123' })
      })

      const result = await configManager.saveToServer(config)

      expect(result.id).toBe('config-123')
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3030/api/configurations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(config)
        })
      )
    })

    test('should load configuration from server', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })

      const config = await configManager.loadFromServer('config-123')

      expect(config).toEqual(mockSessionData)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3030/api/configurations/config-123'
      )
    })

    test('should handle server errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      })

      await expectToThrow(
        () => configManager.saveToServer({}),
        'Failed to save configuration'
      )
    })
  })

  describe('Memory Management', () => {
    test('should dispose resources and clear timers', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      configManager.enableAutoSave(true, 1000)
      configManager.dispose()

      expect(clearIntervalSpy).toHaveBeenCalled()
      expect(configManager.currentConfig).toBeNull()
      expect(configManager.configHistory).toEqual([])
    })

    test('should remove event listeners on dispose', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      configManager.dispose()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    test('should recover from corrupted configuration', () => {
      const corruptedConfig = '{"name": "Test", "layers": [invalid json}'

      expect(() => {
        configManager.importFromJSON(corruptedConfig)
      }).toThrow()

      // Configuration should remain unchanged
      expect(configManager.currentConfig).toBeNull()
    })

    test('should handle network failures gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      await expectToThrow(
        () => configManager.loadFromServer('test-id'),
        'Network error'
      )

      // State should remain consistent
      expect(configManager.currentConfig).toBeNull()
    })

    test('should provide fallback for missing server config', async () => {
      fetch.mockRejectedValueOnce(new Error('Server unavailable'))

      const config = await configManager.loadServerConfig()

      // Should return default configuration
      expect(config).toBeDefined()
      expect(config.maxImageFileSize).toBeDefined()
    })
  })
})