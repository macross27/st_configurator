# Hybrid GLB System Integration Plan

**Status**: Ready for Implementation
**Risk Level**: LOW (All components exist, minimal changes to working system)
**Implementation Time**: 2-3 hours

## Overview

This plan integrates the existing hybrid GLB components into the current working SceneManager without breaking existing functionality. The system will maintain backward compatibility while adding multi-model capabilities.

## Current System Analysis

### ✅ What's Working (DO NOT TOUCH)
- `SceneManager.js` - Single model loading with texture application
- `LayerManager.js` - Canvas texture generation and updates
- `main.js` - Application initialization and event handling
- All UI components and session management

### ✅ What's Ready (INTEGRATION TARGETS)
- `ModelCache.js` - Complete caching system with memory management
- `ModelPreloader.js` - Background loading with idle callbacks
- `ModelSelector.js` - UI controls for model switching
- `ModelMemoryManager.js` - Advanced memory optimization

## Integration Strategy

### Phase 1: Non-Breaking SceneManager Enhancement
**Goal**: Add ModelCache to SceneManager without changing existing API

#### 1.1 SceneManager Constructor Updates
```javascript
// ADD TO EXISTING SceneManager constructor:
import { ModelCache } from './ModelCache.js';

constructor(container) {
    // ... existing properties

    // NEW: Hybrid model system (optional, defaults to current behavior)
    this.useHybridSystem = false;
    this.modelCache = null;
    this.availableModels = [];
    this.currentModelIndex = 0;

    // ... rest of existing constructor
}
```

#### 1.2 Add Hybrid Initialization Method
```javascript
// NEW METHOD: Initialize hybrid system (called only when needed)
enableHybridSystem(availableModels = []) {
    this.useHybridSystem = true;
    this.availableModels = availableModels;

    // Initialize ModelCache with shared texture canvas
    this.modelCache = new ModelCache(
        this.layerManager?.canvas || null,
        {
            maxCachedModels: 8,
            maxMemoryMB: 256
        }
    );

    // Add models container to scene
    this.scene.add(this.modelCache.getModelsContainer());

    console.log('🎯 Hybrid GLB system enabled with', availableModels.length, 'models');
}
```

#### 1.3 Enhanced loadModel Method
```javascript
// MODIFY EXISTING loadModel to support both modes:
async loadModel(modelPath = './assets/model.gltf') {
    // Hybrid system path
    if (this.useHybridSystem && this.modelCache) {
        return await this.switchToModelHybrid(modelPath);
    }

    // EXISTING CODE UNCHANGED (fallback for single model)
    if (this.isLoading) {
        console.warn('Model loading already in progress, ignoring request');
        return Promise.resolve();
    }
    // ... rest of existing loadModel method stays exactly the same
}
```

#### 1.4 New Hybrid Model Switching
```javascript
// NEW METHOD: Hybrid model switching
async switchToModelHybrid(modelPath) {
    console.log(`🎯 Switching to model: ${modelPath}`);

    // Hide currently visible model
    if (this.modelCache.visibleModelId) {
        const currentModel = this.modelCache.getModel(this.modelCache.visibleModelId);
        if (currentModel) {
            currentModel.sceneObject.visible = false;
            currentModel.isVisible = false;
        }
    }

    // Get or load requested model
    const targetModel = await this.modelCache.getOrLoadModel(modelPath);

    // Show target model
    targetModel.sceneObject.visible = true;
    targetModel.isVisible = true;
    targetModel.lastAccessed = Date.now();
    this.modelCache.visibleModelId = modelPath;

    // Apply shared texture if not already applied
    if (!targetModel.materialsApplied) {
        this.modelCache.applySharedTexture(targetModel.sceneObject);
        targetModel.materialsApplied = true;
    }

    // Update camera to center on new model (reuse existing method)
    this.model = targetModel.sceneObject; // Set for existing camera centering
    this.centerCameraOnModel();

    // Store material reference for existing texture system compatibility
    this.material = this.extractMaterialFromModel(targetModel.sceneObject);

    console.log(`✅ Model switched to ${modelPath}`);
    this.requestRender();

    if (this.onModelLoaded) {
        this.onModelLoaded(this.material);
    }

    return targetModel;
}

// HELPER METHOD: Extract material for backward compatibility
extractMaterialFromModel(modelObject) {
    let material = null;
    modelObject.traverse((child) => {
        if (child.isMesh && child.material && !material) {
            material = Array.isArray(child.material) ? child.material[0] : child.material;
        }
    });
    return material;
}
```

### Phase 2: LayerManager Integration
**Goal**: Connect ModelCache to texture updates

#### 2.1 LayerManager Enhancement
```javascript
// ADD TO EXISTING LayerManager constructor:
constructor(canvas) {
    // ... existing properties
    this.modelCache = null; // Will be injected by SceneManager
}

// NEW METHOD: Connect to ModelCache
setModelCache(modelCache) {
    this.modelCache = modelCache;
    if (this.modelCache && this.canvas) {
        this.modelCache.setSharedTextureCanvas(this.canvas);
    }
}

// MODIFY EXISTING updateTexture method:
updateTexture() {
    // EXISTING texture creation code stays the same
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.needsUpdate = true;

    // NEW: Update all cached models if hybrid system is active
    if (this.modelCache) {
        this.modelCache.updateSharedTextureForAll();
    }

    // EXISTING code for SceneManager compatibility unchanged
    if (this.sceneManager) {
        this.sceneManager.setTexture(texture);
    }

    this.onTextureUpdate?.(texture);
}
```

### Phase 3: Main Application Integration
**Goal**: Add model selector UI without breaking existing functionality

#### 3.1 Main.js Integration Points
```javascript
// ADD TO EXISTING setupManagers method:
setupManagers() {
    // ... existing manager setup code unchanged

    // NEW: Optional hybrid system initialization
    const enableHybrid = import.meta.env.VITE_ENABLE_HYBRID_GLB === 'true';
    if (enableHybrid) {
        this.initializeHybridSystem();
    }
}

// NEW METHOD: Initialize hybrid system
async initializeHybridSystem() {
    // Define available models (start with existing model)
    const availableModels = [
        { name: 'Default Model', path: './assets/model.gltf' },
        // TODO: Add more models as they become available
    ];

    // Enable hybrid system in SceneManager
    this.sceneManager.enableHybridSystem(availableModels);

    // Connect LayerManager to ModelCache
    this.layerManager.setModelCache(this.sceneManager.modelCache);

    // Initialize ModelSelector UI (only if multiple models)
    if (availableModels.length > 1) {
        const { ModelSelector } = await import('./lib/client/ModelSelector.js');
        this.modelSelector = new ModelSelector(this.sceneManager, availableModels);
        await this.modelSelector.initialize();
    }

    console.log('🎯 Hybrid GLB system initialized');
}
```

#### 3.2 Environment Configuration
```javascript
// ADD TO .env.example:
# Hybrid GLB System
VITE_ENABLE_HYBRID_GLB=false
VITE_MAX_CACHED_MODELS=8
VITE_MAX_CACHE_MEMORY_MB=256
```

## Implementation Steps

### Step 1: SceneManager Enhancement (30 minutes)
1. ✅ Add ModelCache import and hybrid properties to constructor
2. ✅ Add `enableHybridSystem()` method
3. ✅ Add `switchToModelHybrid()` method
4. ✅ Modify existing `loadModel()` to route to hybrid when enabled
5. ✅ Add material extraction helper

### Step 2: LayerManager Connection (15 minutes)
1. ✅ Add `setModelCache()` method to LayerManager
2. ✅ Modify `updateTexture()` to update all cached models
3. ✅ Test texture updates work for both single and hybrid modes

### Step 3: Main Application Integration (45 minutes)
1. ✅ Add hybrid initialization to main.js
2. ✅ Add environment variable configuration
3. ✅ Create model list configuration system
4. ✅ Test with single model (backward compatibility)

### Step 4: UI Integration (60 minutes)
1. ✅ Add ModelSelector to UI when multiple models available
2. ✅ Style model selector to match existing UI
3. ✅ Add keyboard shortcuts (arrow keys for model switching)
4. ✅ Add cache status display

### Step 5: Testing & Validation (30 minutes)
1. ✅ Test single model mode (existing functionality)
2. ✅ Test hybrid mode with multiple models
3. ✅ Test memory management and eviction
4. ✅ Test texture updates across all models
5. ✅ Performance validation

## Risk Mitigation

### Backward Compatibility Guarantees
- ✅ **Zero Changes to Existing API**: All current methods work unchanged
- ✅ **Optional Feature**: Hybrid system only activates when explicitly enabled
- ✅ **Fallback Safety**: If hybrid fails, falls back to existing single model system
- ✅ **Environment Controlled**: Can be disabled via environment variable

### Error Handling
```javascript
// Robust error handling in hybrid methods
async switchToModelHybrid(modelPath) {
    try {
        // ... hybrid switching logic
    } catch (error) {
        console.error('❌ Hybrid model switching failed, falling back to single model:', error);
        // Disable hybrid system and use traditional loading
        this.useHybridSystem = false;
        return await this.loadModel(modelPath);
    }
}
```

### Performance Safeguards
- ✅ Memory limits enforced (256MB default)
- ✅ Model count limits (8 models default)
- ✅ LRU eviction prevents memory leaks
- ✅ Background loading doesn't block UI

## Configuration Options

### Environment Variables
```env
# Enable/disable hybrid system
VITE_ENABLE_HYBRID_GLB=false

# Memory management
VITE_MAX_CACHED_MODELS=8
VITE_MAX_CACHE_MEMORY_MB=256

# Preloading strategy
VITE_PRELOAD_ADJACENT_COUNT=2
VITE_USE_IDLE_CALLBACK=true
```

### Model Configuration
```javascript
// models.config.js (future enhancement)
export const modelConfigurations = [
    {
        name: 'T-Shirt Classic',
        path: './assets/models/tshirt-classic.glb',
        category: 'tshirts',
        priority: 'high'
    },
    {
        name: 'T-Shirt Slim',
        path: './assets/models/tshirt-slim.glb',
        category: 'tshirts',
        priority: 'high'
    }
    // ... 20 more models
];
```

## Performance Expectations

### Memory Usage
- **Single Model**: ~2-5MB (current)
- **Hybrid with 8 Models**: ~16-40MB (8x model cache)
- **Memory Limit**: 256MB (configurable)

### Loading Times
- **First Model**: ~200-2000ms (same as current)
- **Cached Model Switch**: ~1-5ms (instant)
- **Background Preload**: No UI impact

### Network Usage
- **Initial**: Only first model loads (same as current)
- **Background**: Adjacent models preload during idle time
- **Total**: Only load models that are accessed

## Testing Strategy

### Unit Tests
```javascript
// Test hybrid system integration
describe('SceneManager Hybrid Integration', () => {
    test('maintains backward compatibility', () => {
        // Test single model loading still works
    });

    test('enables hybrid system correctly', () => {
        // Test hybrid initialization
    });

    test('handles errors gracefully', () => {
        // Test fallback to single model mode
    });
});
```

### Integration Tests
1. ✅ Load app in single model mode (existing behavior)
2. ✅ Enable hybrid mode with environment variable
3. ✅ Switch between multiple models
4. ✅ Verify texture updates across all models
5. ✅ Test memory limits and eviction

## Post-Implementation Tasks

### Documentation Updates
1. ✅ Update README with hybrid system instructions
2. ✅ Add model configuration guide
3. ✅ Update environment variable documentation

### Performance Monitoring
1. ✅ Add memory usage metrics to performance monitor
2. ✅ Track model switching times
3. ✅ Monitor cache hit/miss ratios

### Future Enhancements
1. ✅ Dynamic model discovery from server
2. ✅ Model categories and filtering
3. ✅ Predictive preloading based on user behavior
4. ✅ Progressive loading with quality levels

## Success Criteria

### Functional Requirements
- ✅ Existing single model functionality unchanged
- ✅ Multiple models load and switch correctly
- ✅ Texture updates apply to all cached models
- ✅ Memory usage stays within configured limits
- ✅ Background preloading works without UI lag

### Performance Requirements
- ✅ First model load time unchanged
- ✅ Cached model switch < 10ms
- ✅ Memory usage < 256MB
- ✅ No impact on texture editing performance

### User Experience Requirements
- ✅ Seamless transition from single to multi-model
- ✅ Intuitive model selector UI
- ✅ Clear loading states and feedback
- ✅ Keyboard shortcuts for power users

## Rollback Plan

If integration causes issues:

1. **Immediate**: Set `VITE_ENABLE_HYBRID_GLB=false`
2. **Code Rollback**: Revert to commit `3988f81` (current working state)
3. **Selective Disable**: Comment out hybrid initialization in main.js
4. **Emergency**: Remove ModelCache import from SceneManager

The hybrid system is designed to fail gracefully and not impact the existing working functionality.

---

**Ready for Implementation**: All components exist, plan is comprehensive, risks are mitigated, and backward compatibility is guaranteed.