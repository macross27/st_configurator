import { vi } from 'vitest'
import { createMockCanvas, createMockContainer } from '../setup.js'

/**
 * Test utilities for st_configurator testing
 */

/**
 * Create a mock manager instance with common methods
 */
export function createMockManager(className = 'MockManager') {
  return {
    className,
    initialize: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn(),
    dispose: vi.fn(),
    isInitialized: false
  }
}

/**
 * Create mock layer data for testing
 */
export function createMockLayer(overrides = {}) {
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'text',
    name: 'Test Layer',
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 1,
    text: 'Sample Text',
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    ...overrides
  }
}

/**
 * Create mock image layer data
 */
export function createMockImageLayer(overrides = {}) {
  return createMockLayer({
    type: 'image',
    name: 'Test Image',
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    originalWidth: 100,
    originalHeight: 100,
    ...overrides
  })
}

/**
 * Create mock session data
 */
export function createMockSession(overrides = {}) {
  return {
    id: `session-${Date.now()}`,
    name: 'Test Session',
    timestamp: new Date().toISOString(),
    layers: [
      createMockLayer(),
      createMockImageLayer()
    ],
    modelPath: '/models/test-model.glb',
    sceneSettings: {
      cameraPosition: { x: 0, y: 0, z: 5 },
      lightingIntensity: 1,
      backgroundColor: '#ffffff'
    },
    uiState: {
      selectedLayerId: null,
      panelStates: {
        layers: true,
        properties: true
      }
    },
    ...overrides
  }
}

/**
 * Create mock file for upload testing
 */
export function createMockFile(name = 'test.png', type = 'image/png', size = 1024) {
  const file = new File(['mock file content'], name, { type })
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })
  return file
}

/**
 * Create mock image for testing
 */
export function createMockImage(width = 100, height = 100) {
  const canvas = createMockCanvas()
  canvas.width = width
  canvas.height = height

  const img = new Image()
  Object.defineProperty(img, 'width', { value: width })
  Object.defineProperty(img, 'height', { value: height })
  Object.defineProperty(img, 'naturalWidth', { value: width })
  Object.defineProperty(img, 'naturalHeight', { value: height })
  Object.defineProperty(img, 'complete', { value: true })

  return img
}

/**
 * Create mock DOM environment for manager testing
 */
export function setupMockDOM() {
  const container = createMockContainer()

  // Add required DOM elements for the application
  container.innerHTML = `
    <canvas id="3d-canvas"></canvas>
    <canvas id="texture-canvas"></canvas>
    <div id="layer-panel"></div>
    <div id="properties-panel"></div>
    <div id="notification-container"></div>
    <input type="file" id="file-input" accept="image/*" multiple>
    <button id="save-session">Save Session</button>
    <button id="load-session">Load Session</button>
    <div id="session-list"></div>
  `

  return container
}

/**
 * Mock API responses for testing
 */
export function mockAPIResponses() {
  const responses = {
    '/api/config': {
      maxImageFileSize: 5242880, // 5MB
      validationErrorDuration: 8000,
      defaultErrorDuration: 5000
    },
    '/api/sessions': {
      sessions: [createMockSession()]
    },
    '/api/upload': {
      url: '/uploads/processed-image.png',
      width: 1024,
      height: 1024,
      originalWidth: 2048,
      originalHeight: 2048
    }
  }

  fetch.mockImplementation((url) => {
    const pathname = new URL(url, 'http://localhost').pathname
    const response = responses[pathname]

    if (response) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      })
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' })
    })
  })

  return responses
}

/**
 * Wait for next tick (useful for async operations)
 */
export function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Wait for specified time
 */
export function wait(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mock console methods to avoid noise in test output
 */
export function mockConsole() {
  const originalConsole = { ...console }

  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
  console.info = vi.fn()

  return () => {
    Object.assign(console, originalConsole)
  }
}

/**
 * Create mock event for testing event handlers
 */
export function createMockEvent(type = 'click', properties = {}) {
  return {
    type,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: document.createElement('div'),
    currentTarget: document.createElement('div'),
    ...properties
  }
}

/**
 * Create mock mouse event for testing interactions
 */
export function createMockMouseEvent(type = 'click', x = 0, y = 0, properties = {}) {
  return createMockEvent(type, {
    clientX: x,
    clientY: y,
    offsetX: x,
    offsetY: y,
    button: 0,
    buttons: 1,
    ...properties
  })
}

/**
 * Create mock performance entry for testing
 */
export function createMockPerformanceEntry(name = 'test', duration = 100) {
  return {
    name,
    entryType: 'measure',
    startTime: performance.now(),
    duration,
    detail: null
  }
}

/**
 * Mock performance API
 */
export function mockPerformanceAPI() {
  const marks = new Map()
  const measures = []

  global.performance.mark = vi.fn((name) => {
    marks.set(name, performance.now())
  })

  global.performance.measure = vi.fn((name, startMark, endMark) => {
    const startTime = marks.get(startMark) || 0
    const endTime = endMark ? marks.get(endMark) : performance.now()
    const duration = endTime - startTime

    const entry = createMockPerformanceEntry(name, duration)
    measures.push(entry)
    return entry
  })

  global.performance.getEntriesByType = vi.fn((type) => {
    if (type === 'measure') return measures
    return []
  })

  global.performance.clearMarks = vi.fn(() => marks.clear())
  global.performance.clearMeasures = vi.fn(() => measures.length = 0)

  return { marks, measures }
}

/**
 * Assert that a function throws with specific error message
 */
export async function expectToThrow(fn, errorMessage) {
  try {
    await fn()
    throw new Error('Expected function to throw')
  } catch (error) {
    if (errorMessage && !error.message.includes(errorMessage)) {
      throw new Error(`Expected error message to contain "${errorMessage}", got "${error.message}"`)
    }
  }
}

/**
 * Create memory usage snapshot for leak detection
 */
export function createMemorySnapshot() {
  if (global.performance && global.performance.memory) {
    return {
      usedJSHeapSize: global.performance.memory.usedJSHeapSize,
      totalJSHeapSize: global.performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: global.performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }
  }

  // Fallback for environments without performance.memory
  return {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    timestamp: Date.now()
  }
}