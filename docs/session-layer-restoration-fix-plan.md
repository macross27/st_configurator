# Session Layer Restoration Fix Plan

## Problem Summary
Layers are not restoring properly when loading sessions because their image files are not being saved to disk during session submission. Session JSON shows `"imagePath": null` for all layers.

## Root Cause Analysis

### Broken Pipeline Flow
```
Client Layer → Image Export → Server Upload → File Storage → Session Restoration
                    ↑              ↑             ↑
                 FAILING        FAILING      FAILING
```

### Specific Issues Identified

1. **Client-Side Image Export (SessionManager.js:154-187)**
   - Blob creation may be failing silently
   - FormData submission may not include image properly
   - Canvas export logic may have CORS or timing issues

2. **Server-Side Image Reception (sessionManager.js:113-156)**
   - addLayer method only saves if `imageBuffer` is provided
   - Image buffer may not be properly extracted from FormData
   - File writing may be failing without error handling

3. **Storage Chain Failure**
   - Images not written to `/sessions/{sessionId}/` directory
   - `imagePath` remains null in session.json
   - No fallback mechanism for image recovery

## Detailed Fix Plan

### Phase 1: Client-Side Image Submission Fix

**File: `lib/client/SessionManager.js`**

#### 1.1 Fix Image Blob Creation (Lines 154-187)
- **Issue**: Canvas export may be failing or timing out
- **Fix**: Add proper error handling and validation
- **Changes**:
  ```javascript
  // Current problematic code:
  const canvas = layer.canvas || layer.objects[0]?.canvas;
  
  // Enhanced fix:
  const canvas = this.getLayerCanvas(layer);
  if (!canvas) {
    console.error(`No canvas found for layer ${layer.id}`);
    continue;
  }
  
  // Add blob creation validation
  canvas.toBlob((blob) => {
    if (!blob) {
      console.error(`Failed to create blob for layer ${layer.id}`);
      return;
    }
    formData.append(`layer_${layer.id}_image`, blob, `layer_${layer.id}.png`);
  }, 'image/png', 1.0);
  ```

#### 1.2 Add Canvas Retrieval Helper Method
- **Purpose**: Centralized logic to get canvas from different layer types
- **Implementation**:
  ```javascript
  getLayerCanvas(layer) {
    // Try multiple canvas sources
    if (layer.canvas) return layer.canvas;
    if (layer.objects?.[0]?.canvas) return layer.objects[0].canvas;
    if (layer._canvas) return layer._canvas;
    
    // For Fabric.js layers, get the actual canvas element
    if (layer.getElement) {
      const element = layer.getElement();
      if (element.tagName === 'CANVAS') return element;
    }
    
    return null;
  }
  ```

#### 1.3 Add Submission Validation
- **Purpose**: Ensure all layer images are included before submission
- **Implementation**:
  ```javascript
  validateLayerSubmission(formData, layers) {
    const expectedImages = layers.length;
    const submittedImages = Array.from(formData.entries())
      .filter(([key]) => key.includes('_image')).length;
    
    if (submittedImages !== expectedImages) {
      throw new Error(`Image submission incomplete: ${submittedImages}/${expectedImages} images`);
    }
  }
  ```

### Phase 2: Server-Side Image Reception Fix

**File: `lib/server/sessionManager.js`**

#### 2.1 Enhanced Image Buffer Extraction (Lines 113-156)
- **Issue**: Image buffer may not be properly extracted from FormData
- **Fix**: Add multiple extraction methods and validation
- **Changes**:
  ```javascript
  // Current problematic code:
  const imageBuffer = files[`layer_${layerId}_image`]?.[0]?.buffer;
  
  // Enhanced fix:
  const imageBuffer = this.extractImageBuffer(files, layerId);
  if (!imageBuffer) {
    console.error(`No image buffer received for layer ${layerId}`);
    // Skip layer or use placeholder
    continue;
  }
  ```

#### 2.2 Add Buffer Extraction Helper Method
- **Purpose**: Multiple strategies for extracting image data
- **Implementation**:
  ```javascript
  extractImageBuffer(files, layerId) {
    const fieldName = `layer_${layerId}_image`;
    
    // Try different file field formats
    if (files[fieldName]?.[0]?.buffer) {
      return files[fieldName][0].buffer;
    }
    
    if (files[fieldName]?.buffer) {
      return files[fieldName].buffer;
    }
    
    // Check for alternative field naming
    const altFieldName = `layer_image_${layerId}`;
    if (files[altFieldName]?.[0]?.buffer) {
      return files[altFieldName][0].buffer;
    }
    
    return null;
  }
  ```

#### 2.3 Add File Writing Validation
- **Purpose**: Ensure images are actually written to disk
- **Implementation**:
  ```javascript
  async writeLayerImage(sessionId, layerId, imageBuffer) {
    const sessionDir = path.join(this.sessionsDir, sessionId);
    const imagePath = `${layerId}.png`;
    const fullPath = path.join(sessionDir, imagePath);
    
    try {
      await fs.writeFile(fullPath, imageBuffer);
      
      // Validate file was written
      const stats = await fs.stat(fullPath);
      if (stats.size === 0) {
        throw new Error('Written file is empty');
      }
      
      return imagePath;
    } catch (error) {
      console.error(`Failed to write image for layer ${layerId}:`, error);
      return null;
    }
  }
  ```

### Phase 3: Enhanced Error Handling & Logging

#### 3.1 Client-Side Error Handling
- **File**: `SessionManager.js`
- **Purpose**: Better visibility into submission failures
- **Implementation**:
  ```javascript
  async submitSession(sessionData, layers) {
    try {
      console.log(`Submitting session with ${layers.length} layers`);
      
      const formData = new FormData();
      let imageCount = 0;
      
      for (const layer of layers) {
        const success = await this.addLayerToFormData(formData, layer);
        if (success) imageCount++;
      }
      
      console.log(`Successfully added ${imageCount}/${layers.length} layer images to submission`);
      
      // ... rest of submission logic
    } catch (error) {
      console.error('Session submission failed:', error);
      throw error;
    }
  }
  ```

#### 3.2 Server-Side Error Handling
- **File**: `sessionManager.js`
- **Purpose**: Detailed logging of image processing failures
- **Implementation**:
  ```javascript
  async addLayer(sessionId, layerData, imageBuffer) {
    console.log(`Processing layer ${layerData.id} for session ${sessionId}`);
    console.log(`Image buffer size: ${imageBuffer ? imageBuffer.length : 'null'} bytes`);
    
    if (imageBuffer) {
      const imagePath = await this.writeLayerImage(sessionId, layerData.id, imageBuffer);
      if (imagePath) {
        layerData.imagePath = imagePath;
        console.log(`Successfully saved image: ${imagePath}`);
      } else {
        console.error(`Failed to save image for layer ${layerData.id}`);
      }
    }
    
    return layerData;
  }
  ```

### Phase 4: Session Restoration Enhancement

#### 4.1 Add Image Validation During Load
- **File**: `main.js` (lines 642-672)
- **Purpose**: Verify image files exist before attempting to load
- **Implementation**:
  ```javascript
  async restoreLayersFromSession(sessionData) {
    for (const layerData of sessionData.layers) {
      if (!layerData.imagePath) {
        console.warn(`Layer ${layerData.id} has no image path, skipping image restoration`);
        // Create layer without image or use placeholder
        continue;
      }
      
      const imageUrl = this.sessionManager.getLayerImageUrl(layerData.id);
      
      // Validate image exists before loading
      try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.error(`Image not found for layer ${layerData.id}: ${imageUrl}`);
          continue;
        }
      } catch (error) {
        console.error(`Failed to validate image for layer ${layerData.id}:`, error);
        continue;
      }
      
      // Proceed with image loading
      const layer = this.layerManager.createLayer(layerData);
      await this.layerManager.loadLayerImage(layer, imageUrl);
    }
  }
  ```

## Implementation Priority

### High Priority (Critical Fixes)
1. **Client image blob creation validation** - Fix the root cause
2. **Server image buffer extraction** - Ensure images are received
3. **File writing validation** - Confirm images are saved to disk

### Medium Priority (Enhancement)
4. **Error handling and logging** - Better visibility into failures
5. **Image validation during load** - Graceful handling of missing images

### Low Priority (Future Improvement)
6. **Fallback mechanisms** - Alternative image sources if primary fails
7. **Image compression** - Optimize storage size
8. **Batch processing** - Handle large sessions more efficiently

## Testing Strategy

### Test Case 1: Basic Layer Save/Load
1. Create session with 1 text layer
2. Save session
3. Verify image file exists in `/sessions/{sessionId}/`
4. Verify `imagePath` is not null in session.json
5. Load session and confirm layer restores with image

### Test Case 2: Multiple Layer Types
1. Create session with text, logo, and image layers
2. Save session
3. Verify all image files are saved
4. Load session and confirm all layers restore properly

### Test Case 3: Error Scenarios
1. Test with corrupted canvas data
2. Test with missing image buffers
3. Test with file system errors
4. Confirm graceful error handling and user feedback

## Success Criteria

- ✅ Session JSON contains valid `imagePath` for all layers
- ✅ Image files are written to `/sessions/{sessionId}/` directory
- ✅ Loaded sessions restore all layers with correct images
- ✅ Error handling provides clear feedback for any failures
- ✅ No regression in existing session management functionality

## Files to Modify

1. `lib/client/SessionManager.js` - Client-side image submission fixes
2. `lib/server/sessionManager.js` - Server-side image reception fixes
3. `main.js` - Enhanced session restoration logic
4. `server.js` - Additional error handling for session endpoints (if needed)

## Estimated Effort

- **Development**: 4-6 hours
- **Testing**: 2-3 hours
- **Documentation**: 1 hour
- **Total**: 7-10 hours

This comprehensive fix addresses the complete pipeline from client image export to server storage and session restoration.