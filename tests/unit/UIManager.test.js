import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { UIManager } from '@client/UIManager.js'
import {
  setupMockDOM,
  createMockLayer,
  createMockEvent,
  createMockMouseEvent,
  mockConsole,
  nextTick,
  wait
} from '@tests/utils/test-helpers.js'

describe('UIManager', () => {
  let uiManager
  let container
  let restoreConsole

  beforeEach(() => {
    restoreConsole = mockConsole()
    container = setupMockDOM()

    // Add additional UI elements that UIManager expects
    container.innerHTML += `
      <div id="primary-color"></div>
      <div id="secondary-color"></div>
      <button id="add-text-btn">Add Text</button>
      <button id="add-logo-btn">Add Logo</button>
      <button id="submit-btn">Submit</button>
      <div id="layers-list"></div>
      <div id="scale-slider-overlay"></div>
      <input type="range" id="scale-slider" min="0.1" max="3" step="0.1" value="1">
      <span id="scale-value">1.0</span>
      <input type="range" id="rotate-slider" min="0" max="360" step="1" value="0">
      <span id="rotate-value">0°</span>
      <input type="checkbox" id="flip-horizontal-checkbox">
      <div id="fov-slider-overlay"></div>
      <input type="range" id="fov-slider" min="20" max="100" step="1" value="75">
      <span id="fov-value">75°</span>
      <button id="reset-view-btn">Reset View</button>
      <div id="color-palette-container"></div>
      <div id="current-color-display"></div>
      <div id="current-color-swatch"></div>
      <div id="color-picker-dropdown"></div>
      <button id="color-picker-close-btn">Close</button>
      <canvas id="color-wheel-canvas"></canvas>
      <div id="color-wheel-handle"></div>
      <div id="brightness-slider-track"></div>
      <div id="brightness-slider-handle"></div>
      <div id="saturation-slider-track"></div>
      <div id="saturation-slider-handle"></div>
      <input type="text" id="hex-color-input">
      <div id="predefined-colors"></div>
      <div id="color-history"></div>
      <div id="notification-container"></div>
      <input type="text" id="text-input" placeholder="Enter text">
      <select id="font-family-select">
        <option value="Arial">Arial</option>
        <option value="Helvetica">Helvetica</option>
      </select>
      <input type="range" id="font-size-slider" min="8" max="72" value="16">
      <span id="font-size-value">16px</span>
      <select id="font-weight-select">
        <option value="normal">Normal</option>
        <option value="bold">Bold</option>
      </select>
      <select id="text-align-select">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <input type="range" id="position-x-slider" min="0" max="512" value="100">
      <span id="position-x-value">100px</span>
      <input type="range" id="position-y-slider" min="0" max="512" value="100">
      <span id="position-y-value">100px</span>
      <input type="range" id="width-slider" min="50" max="400" value="200">
      <span id="width-value">200px</span>
      <input type="range" id="height-slider" min="20" max="200" value="50">
      <span id="height-value">50px</span>
      <input type="range" id="opacity-slider" min="0" max="1" step="0.1" value="1">
      <span id="opacity-value">100%</span>
      <input type="checkbox" id="layer-visible-checkbox" checked>
      <input type="checkbox" id="layer-locked-checkbox">
      <button id="move-layer-up-btn">Move Up</button>
      <button id="move-layer-down-btn">Move Down</button>
      <button id="delete-layer-btn">Delete</button>
      <button id="duplicate-layer-btn">Duplicate</button>
      <button id="delete-all-layers-btn">Delete All</button>
    `

    uiManager = new UIManager()
  })

  afterEach(() => {
    if (uiManager) {
      uiManager.dispose()
    }
    restoreConsole()
    container?.remove()
  })

  describe('Constructor and Initialization', () => {
    test('should initialize with DOM elements', () => {
      expect(uiManager.elements).toBeDefined()
      expect(uiManager.elements.addTextBtn).toBeDefined()
      expect(uiManager.elements.addLogoBtn).toBeDefined()
      expect(uiManager.elements.layersList).toBeDefined()
    })

    test('should initialize callback handlers', () => {
      expect(uiManager.onAddText).toBeNull()
      expect(uiManager.onAddImage).toBeNull()
      expect(uiManager.onLayerSelected).toBeNull()
      expect(uiManager.onLayerUpdated).toBeNull()
      expect(uiManager.onColorChanged).toBeNull()
    })

    test('should initialize color picker', () => {
      expect(uiManager.colorWheelPicker).toBeDefined()
    })

    test('should initialize design system', () => {
      expect(uiManager.designSystem).toBeDefined()
    })

    test('should bind event listeners', () => {
      const addTextBtn = document.getElementById('add-text-btn')
      const addLogoBtn = document.getElementById('add-logo-btn')

      expect(addTextBtn.onclick).toBeDefined()
      expect(addLogoBtn.onclick).toBeDefined()
    })
  })

  describe('Layer Panel Management', () => {
    test('should update layers panel with empty list', () => {
      uiManager.updateLayersPanel([])

      const layersList = document.getElementById('layers-list')
      expect(layersList.innerHTML).toContain('No layers')
    })

    test('should update layers panel with layer list', () => {
      const layers = [
        createMockLayer({ name: 'Text Layer 1', type: 'text' }),
        createMockLayer({ name: 'Image Layer 1', type: 'image' })
      ]

      uiManager.updateLayersPanel(layers)

      const layersList = document.getElementById('layers-list')
      expect(layersList.children.length).toBeGreaterThan(0)
    })

    test('should create layer item with proper structure', () => {
      const layer = createMockLayer({ name: 'Test Layer', type: 'text' })

      uiManager.updateLayersPanel([layer])

      const layerItems = document.querySelectorAll('.layer-item')
      expect(layerItems.length).toBe(1)
      expect(layerItems[0].textContent).toContain('Test Layer')
    })

    test('should highlight selected layer', () => {
      const layer1 = createMockLayer({ name: 'Layer 1' })
      const layer2 = createMockLayer({ name: 'Layer 2' })

      uiManager.updateLayersPanel([layer1, layer2], layer1.id)

      const selectedItems = document.querySelectorAll('.layer-item.selected')
      expect(selectedItems.length).toBe(1)
    })

    test('should handle layer selection click', () => {
      const mockCallback = vi.fn()
      uiManager.onLayerSelected = mockCallback
      const layer = createMockLayer()

      uiManager.updateLayersPanel([layer])

      const layerItem = document.querySelector('.layer-item')
      layerItem.click()

      expect(mockCallback).toHaveBeenCalledWith(layer.id)
    })
  })

  describe('Properties Panel Management', () => {
    test('should update properties panel for text layer', () => {
      const textLayer = createMockLayer({
        type: 'text',
        text: 'Sample Text',
        fontSize: 16,
        color: '#000000'
      })

      uiManager.updatePropertiesPanel(textLayer)

      const textInput = document.getElementById('text-input')
      const fontSizeSlider = document.getElementById('font-size-slider')

      expect(textInput.value).toBe('Sample Text')
      expect(fontSizeSlider.value).toBe('16')
    })

    test('should update properties panel for image layer', () => {
      const imageLayer = createMockLayer({
        type: 'image',
        src: 'test.jpg',
        opacity: 0.8
      })

      uiManager.updatePropertiesPanel(imageLayer)

      const opacitySlider = document.getElementById('opacity-slider')
      expect(opacitySlider.value).toBe('0.8')
    })

    test('should clear properties panel when no layer selected', () => {
      uiManager.updatePropertiesPanel(null)

      const textInput = document.getElementById('text-input')
      expect(textInput.value).toBe('')
    })

    test('should handle property changes', () => {
      const mockCallback = vi.fn()
      uiManager.onLayerUpdated = mockCallback
      const layer = createMockLayer()

      uiManager.updatePropertiesPanel(layer)

      const textInput = document.getElementById('text-input')
      textInput.value = 'New Text'
      textInput.dispatchEvent(new Event('input'))

      expect(mockCallback).toHaveBeenCalledWith(layer.id, { text: 'New Text' })
    })
  })

  describe('Color Management', () => {
    test('should update color display', () => {
      uiManager.updateColorDisplay('#ff0000')

      const colorSwatch = document.getElementById('current-color-swatch')
      expect(colorSwatch.style.backgroundColor).toBe('rgb(255, 0, 0)')
    })

    test('should show color picker', () => {
      uiManager.showColorPicker()

      const dropdown = document.getElementById('color-picker-dropdown')
      expect(dropdown.style.display).toBe('block')
    })

    test('should hide color picker', () => {
      uiManager.hideColorPicker()

      const dropdown = document.getElementById('color-picker-dropdown')
      expect(dropdown.style.display).toBe('none')
    })

    test('should handle color selection', () => {
      const mockCallback = vi.fn()
      uiManager.onColorChanged = mockCallback

      uiManager.handleColorSelection('#00ff00')

      expect(mockCallback).toHaveBeenCalledWith('#00ff00')
    })

    test('should update color history', () => {
      uiManager.addToColorHistory('#ff0000')
      uiManager.addToColorHistory('#00ff00')

      expect(uiManager.colorHistory).toContain('#ff0000')
      expect(uiManager.colorHistory).toContain('#00ff00')
    })
  })

  describe('Notification System', () => {
    test('should show success notification', () => {
      uiManager.showNotification('Success message', 'success')

      const notifications = document.querySelectorAll('.notification')
      expect(notifications.length).toBe(1)
      expect(notifications[0].textContent).toContain('Success message')
      expect(notifications[0].classList).toContain('success')
    })

    test('should show error notification', () => {
      uiManager.showNotification('Error message', 'error')

      const notifications = document.querySelectorAll('.notification')
      expect(notifications.length).toBe(1)
      expect(notifications[0].classList).toContain('error')
    })

    test('should auto-hide notifications', async () => {
      uiManager.showNotification('Auto-hide message', 'info', 100)

      expect(document.querySelectorAll('.notification').length).toBe(1)

      await wait(150)

      expect(document.querySelectorAll('.notification').length).toBe(0)
    })

    test('should handle manual notification close', () => {
      uiManager.showNotification('Closeable message', 'info')

      const closeBtn = document.querySelector('.notification-close')
      closeBtn.click()

      expect(document.querySelectorAll('.notification').length).toBe(0)
    })

    test('should limit number of notifications', () => {
      // Show many notifications
      for (let i = 0; i < 10; i++) {
        uiManager.showNotification(`Message ${i}`, 'info')
      }

      const notifications = document.querySelectorAll('.notification')
      expect(notifications.length).toBeLessThanOrEqual(5) // Should limit to 5
    })
  })

  describe('Button Handlers', () => {
    test('should handle add text button click', () => {
      const mockCallback = vi.fn()
      uiManager.onAddText = mockCallback

      const addTextBtn = document.getElementById('add-text-btn')
      addTextBtn.click()

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle add logo button click', () => {
      const mockCallback = vi.fn()
      uiManager.onAddImage = mockCallback

      const addLogoBtn = document.getElementById('add-logo-btn')
      addLogoBtn.click()

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle submit button click', () => {
      const mockCallback = vi.fn()
      uiManager.onSubmit = mockCallback

      const submitBtn = document.getElementById('submit-btn')
      submitBtn.click()

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle reset view button click', () => {
      const mockCallback = vi.fn()
      uiManager.onResetView = mockCallback

      const resetBtn = document.getElementById('reset-view-btn')
      resetBtn.click()

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle delete layer button click', () => {
      const mockCallback = vi.fn()
      uiManager.onDeleteLayer = mockCallback

      const deleteBtn = document.getElementById('delete-layer-btn')
      deleteBtn.click()

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle delete all layers button click', () => {
      const mockCallback = vi.fn()
      uiManager.onDeleteAllLayers = mockCallback

      // Mock window.confirm to return true
      global.confirm = vi.fn(() => true)

      const deleteAllBtn = document.getElementById('delete-all-layers-btn')
      deleteAllBtn.click()

      expect(mockCallback).toHaveBeenCalled()
    })
  })

  describe('Slider Controls', () => {
    test('should handle scale slider change', () => {
      const mockCallback = vi.fn()
      uiManager.onLayerUpdated = mockCallback
      const layer = createMockLayer()

      uiManager.updatePropertiesPanel(layer)

      const scaleSlider = document.getElementById('scale-slider')
      scaleSlider.value = '1.5'
      scaleSlider.dispatchEvent(new Event('input'))

      expect(mockCallback).toHaveBeenCalledWith(layer.id, expect.objectContaining({
        scaleX: 1.5,
        scaleY: 1.5
      }))
    })

    test('should handle rotation slider change', () => {
      const mockCallback = vi.fn()
      uiManager.onLayerUpdated = mockCallback
      const layer = createMockLayer()

      uiManager.updatePropertiesPanel(layer)

      const rotateSlider = document.getElementById('rotate-slider')
      rotateSlider.value = '45'
      rotateSlider.dispatchEvent(new Event('input'))

      expect(mockCallback).toHaveBeenCalledWith(layer.id, expect.objectContaining({
        rotation: expect.any(Number)
      }))
    })

    test('should handle FOV slider change', () => {
      const mockCallback = vi.fn()
      uiManager.onFOVChanged = mockCallback

      const fovSlider = document.getElementById('fov-slider')
      fovSlider.value = '60'
      fovSlider.dispatchEvent(new Event('input'))

      expect(mockCallback).toHaveBeenCalledWith(60)
    })

    test('should update slider value displays', () => {
      const scaleSlider = document.getElementById('scale-slider')
      const scaleValue = document.getElementById('scale-value')

      uiManager.updateSliderDisplay(scaleSlider, scaleValue, 1.8, 'x')

      expect(scaleValue.textContent).toBe('1.8x')
    })
  })

  describe('Keyboard Shortcuts', () => {
    test('should handle delete key for layer deletion', () => {
      const mockCallback = vi.fn()
      uiManager.onDeleteLayer = mockCallback
      const layer = createMockLayer()

      uiManager.selectedLayerId = layer.id

      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' })
      document.dispatchEvent(deleteEvent)

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle Ctrl+Z for undo', () => {
      const mockCallback = vi.fn()
      uiManager.onUndo = mockCallback

      const undoEvent = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      })
      document.dispatchEvent(undoEvent)

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle Ctrl+Y for redo', () => {
      const mockCallback = vi.fn()
      uiManager.onRedo = mockCallback

      const redoEvent = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true
      })
      document.dispatchEvent(redoEvent)

      expect(mockCallback).toHaveBeenCalled()
    })

    test('should handle Escape key to deselect', () => {
      const mockCallback = vi.fn()
      uiManager.onLayerSelected = mockCallback

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)

      expect(mockCallback).toHaveBeenCalledWith(null)
    })
  })

  describe('Drag and Drop', () => {
    test('should handle file drop for image upload', () => {
      const mockCallback = vi.fn()
      uiManager.onAddImage = mockCallback

      const mockFile = new File(['content'], 'test.png', { type: 'image/png' })
      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile]
        }
      }

      uiManager.handleFileDrop(dropEvent)

      expect(dropEvent.preventDefault).toHaveBeenCalled()
      expect(mockCallback).toHaveBeenCalledWith(mockFile)
    })

    test('should handle dragover event', () => {
      const dragoverEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          dropEffect: ''
        }
      }

      uiManager.handleDragOver(dragoverEvent)

      expect(dragoverEvent.preventDefault).toHaveBeenCalled()
      expect(dragoverEvent.dataTransfer.dropEffect).toBe('copy')
    })

    test('should highlight drop zone on drag enter', () => {
      const dropZone = document.body

      uiManager.handleDragEnter()

      expect(dropZone.classList).toContain('drag-over')
    })

    test('should remove highlight on drag leave', () => {
      const dropZone = document.body
      dropZone.classList.add('drag-over')

      uiManager.handleDragLeave()

      expect(dropZone.classList).not.toContain('drag-over')
    })
  })

  describe('Accessibility', () => {
    test('should set proper ARIA labels', () => {
      const addTextBtn = document.getElementById('add-text-btn')
      expect(addTextBtn.getAttribute('aria-label')).toBeDefined()
    })

    test('should handle keyboard navigation', () => {
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })

      expect(() => {
        document.dispatchEvent(tabEvent)
      }).not.toThrow()
    })

    test('should provide screen reader feedback', () => {
      uiManager.announceToScreenReader('Layer added successfully')

      const announcement = document.querySelector('[aria-live="polite"]')
      expect(announcement.textContent).toBe('Layer added successfully')
    })
  })

  describe('Memory Management', () => {
    test('should dispose event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      uiManager.dispose()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    test('should clear notification timers', () => {
      uiManager.showNotification('Test', 'info', 1000)
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      uiManager.dispose()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    test('should dispose color picker', () => {
      const disposeSpy = vi.spyOn(uiManager.colorWheelPicker, 'dispose')

      uiManager.dispose()

      expect(disposeSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      // Remove a required element
      document.getElementById('add-text-btn').remove()

      expect(() => {
        const newUIManager = new UIManager()
        newUIManager.dispose()
      }).not.toThrow()
    })

    test('should handle invalid color values', () => {
      expect(() => {
        uiManager.updateColorDisplay('invalid-color')
      }).not.toThrow()
    })

    test('should handle null layer in properties panel', () => {
      expect(() => {
        uiManager.updatePropertiesPanel(null)
      }).not.toThrow()
    })
  })
})