import '@testing-library/jest-dom'
import { beforeAll, beforeEach, afterEach, vi } from 'vitest'

// Mock Three.js for testing environment
const mockThree = {
  Scene: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
    children: []
  })),

  // Constants that are imported
  RGBAFormat: 'rgba',
  UnsignedByteType: 'unsigned-byte',
  LinearFilter: 'linear',
  ACESFilmicToneMapping: 'aces-filmic',
  sRGBColorSpace: 'srgb',
  PCFSoftShadowMap: 'pcf-soft',

  // Additional loaders and utilities
  DRACOLoader: vi.fn().mockImplementation(() => ({
    setDecoderPath: vi.fn(),
    setDecoderConfig: vi.fn(),
    preload: vi.fn()
  })),

  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0, set: vi.fn() },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
    aspect: 1,
    fov: 75,
    near: 0.1,
    far: 1000
  })),

  WebGLRenderer: vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
    setClearColor: vi.fn(),
    shadowMap: {
      enabled: false,
      type: null
    },
    outputColorSpace: 'srgb',
    toneMapping: 'ACESFilmicToneMapping',
    toneMappingExposure: 1
  })),

  DirectionalLight: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    castShadow: false,
    shadow: {
      mapSize: { width: 1024, height: 1024 },
      camera: {
        near: 0.5,
        far: 50
      }
    }
  })),

  AmbientLight: vi.fn().mockImplementation(() => ({})),

  PointLight: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    castShadow: false,
    shadow: {
      mapSize: { width: 1024, height: 1024 },
      camera: {
        near: 0.5,
        far: 50
      }
    }
  })),

  MeshBasicMaterial: vi.fn().mockImplementation(() => ({
    map: null,
    dispose: vi.fn()
  })),

  MeshStandardMaterial: vi.fn().mockImplementation(() => ({
    map: null,
    dispose: vi.fn()
  })),

  PlaneGeometry: vi.fn().mockImplementation(() => ({
    dispose: vi.fn()
  })),

  BoxGeometry: vi.fn().mockImplementation(() => ({
    dispose: vi.fn()
  })),

  Mesh: vi.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0, set: vi.fn() },
    rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
    scale: { x: 1, y: 1, z: 1, set: vi.fn() },
    material: null,
    geometry: null,
    traverse: vi.fn(),
    clone: vi.fn()
  })),

  Texture: vi.fn().mockImplementation(() => ({
    needsUpdate: true,
    dispose: vi.fn()
  })),

  CanvasTexture: vi.fn().mockImplementation(() => ({
    needsUpdate: true,
    dispose: vi.fn()
  })),

  TextureLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad) => {
      const mockTexture = new mockThree.Texture()
      if (onLoad) onLoad(mockTexture)
      return mockTexture
    })
  })),

  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: true,
    dampingFactor: 0.25,
    enableZoom: true,
    update: vi.fn(),
    dispose: vi.fn()
  })),

  GLTFLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad, onProgress, onError) => {
      const mockModel = {
        scene: new mockThree.Scene(),
        animations: [],
        cameras: [],
        asset: {}
      }
      if (onLoad) onLoad(mockModel)
      return mockModel
    })
  })),

  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn(),
    copy: vi.fn(),
    add: vi.fn(),
    sub: vi.fn(),
    normalize: vi.fn(),
    length: vi.fn(() => Math.sqrt(x*x + y*y + z*z))
  })),

  Vector2: vi.fn().mockImplementation((x = 0, y = 0) => ({
    x, y,
    set: vi.fn(),
    copy: vi.fn()
  })),

  Raycaster: vi.fn().mockImplementation(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => [])
  })),

  Clock: vi.fn().mockImplementation(() => ({
    getDelta: vi.fn(() => 0.016),
    getElapsedTime: vi.fn(() => 0)
  })),

  // Constants
  ACESFilmicToneMapping: 'ACESFilmicToneMapping',
  sRGBColorSpace: 'srgb',
  PCFSoftShadowMap: 'PCFSoftShadowMap',

  // Additional Three.js exports that might be imported
  Loader: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
    setRequestHeader: vi.fn(),
    setPath: vi.fn(),
    setResourcePath: vi.fn(),
    setCrossOrigin: vi.fn(),
    setWithCredentials: vi.fn()
  })),

  FileLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
    setMimeType: vi.fn(),
    setPath: vi.fn(),
    setRequestHeader: vi.fn(),
    setWithCredentials: vi.fn()
  })),

  LoadingManager: vi.fn().mockImplementation(() => ({
    itemStart: vi.fn(),
    itemEnd: vi.fn(),
    itemError: vi.fn(),
    resolveURL: vi.fn(),
    setURLModifier: vi.fn(),
    addHandler: vi.fn(),
    removeHandler: vi.fn(),
    getHandler: vi.fn()
  })),

  // Additional Three.js constants and enums
  BufferAttribute: vi.fn(),
  BufferGeometry: vi.fn(),
  ClampToEdgeWrapping: 'clamp-to-edge',
  Color: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    setHex: vi.fn(),
    copy: vi.fn()
  })),
  ColorManagement: {
    enabled: true,
    workingColorSpace: 'srgb',
    convert: vi.fn()
  },
  RepeatWrapping: 'repeat',
  MirroredRepeatWrapping: 'mirrored-repeat',
  NearestFilter: 'nearest',
  LinearMipmapLinearFilter: 'linear-mipmap-linear',
  RGBAFormat: 'rgba',
  UnsignedByteType: 'unsigned-byte'
}

// Mock Fabric.js for testing
const mockFabric = {
  Canvas: vi.fn().mockImplementation(() => ({
    setDimensions: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    renderAll: vi.fn(),
    getObjects: vi.fn(() => []),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data'),
    dispose: vi.fn(),
    setBackgroundColor: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  })),

  Image: {
    fromURL: vi.fn((url, callback) => {
      const mockImage = {
        set: vi.fn(),
        scale: vi.fn(),
        getBoundingRect: vi.fn(() => ({ left: 0, top: 0, width: 100, height: 100 }))
      }
      if (callback) callback(mockImage)
      return mockImage
    })
  },

  Text: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    scale: vi.fn(),
    getBoundingRect: vi.fn(() => ({ left: 0, top: 0, width: 100, height: 50 }))
  })),

  Rect: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    scale: vi.fn(),
    getBoundingRect: vi.fn(() => ({ left: 0, top: 0, width: 100, height: 100 }))
  }))
}

// Mock DOM APIs that might not be available in jsdom
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
})

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
})

// Mock Canvas context (both 2D and WebGL)
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === '2d') {
    return {
      canvas: { width: 300, height: 150 },
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      imageSmoothingEnabled: true,
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(300 * 150 * 4),
        width: 300,
        height: 150
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(300 * 150 * 4),
        width: 300,
        height: 150
      })),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createPattern: vi.fn(() => ({}))
    }
  }
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: { width: 300, height: 150 },
      drawingBufferWidth: 300,
      drawingBufferHeight: 150,
      getParameter: vi.fn(),
      getExtension: vi.fn(),
      viewport: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      createProgram: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      vertexAttribPointer: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn()
    }
  }
  return null
})

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  onload: null,
  onerror: null,
  result: null
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Set up global mocks
beforeAll(() => {
  // Mock Three.js module
  vi.mock('three', () => mockThree)

  // Mock Three.js addons and loaders
  vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
    GLTFLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn((url, onLoad, onProgress, onError) => {
        const mockModel = {
          scene: {
            add: vi.fn(),
            remove: vi.fn(),
            traverse: vi.fn(),
            children: []
          },
          animations: [],
          cameras: [],
          asset: {}
        }
        if (onLoad) onLoad(mockModel)
        return mockModel
      }),
      setDRACOLoader: vi.fn(),
      setKTX2Loader: vi.fn(),
      setMeshoptDecoder: vi.fn()
    }))
  }))

  vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
    DRACOLoader: vi.fn().mockImplementation(() => ({
      setDecoderPath: vi.fn(),
      setDecoderConfig: vi.fn(),
      preload: vi.fn(),
      dispose: vi.fn()
    }))
  }))

  vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
    OrbitControls: vi.fn().mockImplementation(() => ({
      enableDamping: true,
      dampingFactor: 0.25,
      enableZoom: true,
      update: vi.fn(),
      dispose: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  }))

  // Mock Fabric.js module
  vi.mock('fabric', () => ({ fabric: mockFabric }))

  // Mock import.meta.env
  vi.stubGlobal('import.meta', {
    env: {
      VITE_SERVER_HOST: 'localhost',
      VITE_SERVER_PORT: '3030',
      VITE_DEFAULT_SERVER_PORT: '3030',
      MODE: 'test'
    }
  })
})

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()

  // Reset DOM
  document.body.innerHTML = ''

  // Reset fetch mock
  fetch.mockClear()
  fetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob())
    })
  )
})

afterEach(() => {
  // Clean up after each test
  vi.clearAllTimers()
})

// Utility function to create mock DOM elements for testing
export function createMockCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 150

  // Ensure the canvas has a mock context
  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    globalAlpha: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif'
  }

  canvas.getContext = vi.fn(() => mockContext)
  return canvas
}

export function createMockContainer() {
  const container = document.createElement('div')
  container.style.width = '300px'
  container.style.height = '150px'
  document.body.appendChild(container)
  return container
}

// Export mocks for use in tests
export { mockThree, mockFabric }