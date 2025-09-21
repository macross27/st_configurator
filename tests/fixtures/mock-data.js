/**
 * Mock data fixtures for testing
 */

export const mockGLBModel = {
  scene: {
    children: [
      {
        name: 'Uniform_Mesh',
        geometry: {
          attributes: {
            position: { count: 100 },
            uv: { count: 100 }
          }
        },
        material: {
          map: null,
          name: 'Uniform_Material'
        }
      }
    ],
    traverse: function(callback) {
      this.children.forEach(callback)
    }
  },
  animations: [],
  cameras: [],
  asset: {
    generator: 'Blender 3.0',
    version: '2.0'
  }
}

export const mockTextureLayersConfig = [
  {
    id: 'text-layer-1',
    type: 'text',
    name: 'Player Name',
    text: 'PLAYER',
    x: 100,
    y: 50,
    width: 200,
    height: 40,
    fontSize: 24,
    fontFamily: 'Arial',
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 2
  },
  {
    id: 'text-layer-2',
    type: 'text',
    name: 'Jersey Number',
    text: '10',
    x: 200,
    y: 150,
    width: 80,
    height: 80,
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#FF0000',
    fontWeight: 'bold',
    textAlign: 'center',
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 3
  },
  {
    id: 'image-layer-1',
    type: 'image',
    name: 'Team Logo',
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    x: 50,
    y: 200,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 0.8,
    visible: true,
    locked: false,
    zIndex: 1,
    originalWidth: 256,
    originalHeight: 256
  }
]

export const mockSessionData = {
  id: 'test-session-123',
  name: 'Test Uniform Configuration',
  timestamp: '2025-09-21T10:30:00.000Z',
  layers: mockTextureLayersConfig,
  modelPath: '/models/uniform.glb',
  sceneSettings: {
    cameraPosition: { x: 0, y: 0, z: 5 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    lightingIntensity: 1.2,
    ambientLightIntensity: 0.4,
    backgroundColor: '#f0f0f0',
    shadowsEnabled: true,
    fov: 75
  },
  uiState: {
    selectedLayerId: 'text-layer-1',
    panelStates: {
      layers: true,
      properties: true,
      materials: false
    },
    viewMode: '3d',
    showGrid: false,
    showAxes: false
  },
  metadata: {
    version: '1.0.0',
    author: 'Test User',
    description: 'Test configuration for unit testing'
  }
}

export const mockServerConfig = {
  maxImageFileSize: 5242880, // 5MB in bytes
  maxImageWidth: 1024,
  maxImageHeight: 1024,
  maxInputImageWidth: 8192,
  maxInputImageHeight: 8192,
  validationErrorDuration: 8000,
  defaultErrorDuration: 5000,
  compressionQuality: 0.9,
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  sessionTimeoutMs: 3600000, // 1 hour
  maxSessionsPerUser: 10
}

export const mockUploadResponse = {
  success: true,
  url: '/uploads/processed-image-1634567890.png',
  originalUrl: '/uploads/original-image-1634567890.png',
  width: 1024,
  height: 1024,
  originalWidth: 2048,
  originalHeight: 2048,
  fileSize: 234567,
  originalFileSize: 1234567,
  format: 'png',
  processing: {
    resized: true,
    compressed: true,
    optimized: true,
    processingTime: 156 // milliseconds
  }
}

export const mockImageProcessingSettings = {
  outputWidth: 1024,
  outputHeight: 1024,
  quality: 0.9,
  format: 'png',
  maintainAspectRatio: true,
  backgroundColor: 'transparent',
  compressionLevel: 6,
  interpolation: 'lanczos3'
}

export const mockPerformanceMetrics = {
  sceneRender: {
    average: 16.67, // ms for 60fps
    min: 12.5,
    max: 25.0,
    samples: 100
  },
  textureUpdate: {
    average: 8.3,
    min: 5.2,
    max: 15.8,
    samples: 50
  },
  layerOperation: {
    average: 2.1,
    min: 1.0,
    max: 8.5,
    samples: 200
  },
  memoryUsage: {
    heap: 45.6, // MB
    textures: 12.3, // MB
    geometries: 2.8, // MB
    total: 60.7 // MB
  }
}

export const mockErrorResponses = {
  networkError: {
    ok: false,
    status: 0,
    statusText: 'Network Error',
    json: () => Promise.reject(new Error('Network Error'))
  },
  serverError: {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: () => Promise.resolve({
      error: 'Internal server error',
      message: 'Something went wrong processing your request'
    })
  },
  validationError: {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    json: () => Promise.resolve({
      error: 'Validation failed',
      message: 'File size exceeds maximum allowed limit',
      details: {
        maxSize: 5242880,
        actualSize: 10485760
      }
    })
  },
  notFoundError: {
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: () => Promise.resolve({
      error: 'Resource not found',
      message: 'The requested session does not exist'
    })
  }
}

export const mockBrowserEnvironment = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  language: 'en-US',
  platform: 'Win32',
  vendor: 'Google Inc.',
  webgl: {
    version: 'WebGL 2.0',
    vendor: 'WebKit',
    renderer: 'WebKit WebGL',
    maxTextureSize: 16384,
    maxRenderBufferSize: 16384,
    extensions: [
      'ANGLE_instanced_arrays',
      'EXT_blend_minmax',
      'EXT_color_buffer_half_float',
      'EXT_frag_depth',
      'EXT_shader_texture_lod',
      'EXT_texture_filter_anisotropic',
      'OES_element_index_uint',
      'OES_standard_derivatives',
      'OES_texture_float',
      'OES_texture_float_linear',
      'OES_texture_half_float',
      'OES_texture_half_float_linear',
      'OES_vertex_array_object',
      'WEBGL_color_buffer_float',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders',
      'WEBGL_depth_texture',
      'WEBGL_draw_buffers',
      'WEBGL_lose_context'
    ]
  }
}

export const mockWorkflowTestData = {
  // Complete workflow test scenarios
  newUserWorkflow: {
    steps: [
      { action: 'load_application', expected: 'scene_initialized' },
      { action: 'upload_image', file: 'logo.png', expected: 'image_layer_created' },
      { action: 'add_text_layer', text: 'TEAM NAME', expected: 'text_layer_created' },
      { action: 'modify_layer_position', layerId: 'text-1', x: 150, y: 100, expected: 'layer_moved' },
      { action: 'save_session', name: 'My First Design', expected: 'session_saved' }
    ]
  },

  experiencedUserWorkflow: {
    steps: [
      { action: 'load_session', sessionId: 'existing-session', expected: 'session_loaded' },
      { action: 'duplicate_layer', layerId: 'logo-1', expected: 'layer_duplicated' },
      { action: 'change_layer_order', layerId: 'logo-1-copy', newIndex: 0, expected: 'layer_reordered' },
      { action: 'batch_edit_layers', layers: ['text-1', 'text-2'], properties: { color: '#FF0000' }, expected: 'layers_updated' },
      { action: 'export_configuration', format: 'json', expected: 'config_exported' }
    ]
  },

  errorRecoveryWorkflow: {
    steps: [
      { action: 'upload_oversized_file', file: '10mb-image.jpg', expected: 'validation_error' },
      { action: 'upload_valid_file', file: 'valid-image.png', expected: 'image_processed' },
      { action: 'network_interruption', expected: 'error_handled' },
      { action: 'retry_operation', expected: 'operation_successful' }
    ]
  }
}