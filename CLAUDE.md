# Claude Code Development Notes

This document tracks all the changes and improvements made to the st_configurator project during Claude Code development sessions.

## Major Architectural Refactoring - September 6, 2025

### Overview
Completed a comprehensive architectural refactoring of the client-side codebase, transforming a monolithic 1,883-line file into a modular, maintainable system following separation of concerns principles.

### Refactoring Results

#### Before Refactoring
- **Single File**: `main.js` - 1,883 lines
- **Single Class**: `UniformConfigurator` with mixed responsibilities
- **Issues**: Monolithic structure, mixed concerns, difficult to test and maintain

#### After Refactoring
- **Main Application**: `main.js` - 350 lines (**81% reduction**)
- **Modular Structure**: 6 focused manager classes
- **Total Code**: 1,720 lines across 7 files (9% overall reduction)

#### New Module Architecture
```
lib/client/
├── SceneManager.js         - 3D scene and rendering operations (180 lines)
├── LayerManager.js         - Layer management and textures (320 lines)  
├── InteractionManager.js   - Mouse/input handling (120 lines)
├── UIManager.js           - DOM manipulation and UI (420 lines)
├── ConfigurationManager.js - Save/load operations (180 lines)
└── ImageProcessor.js      - Client image processing (150 lines)
```

#### Key Architectural Improvements
- **Separation of Concerns**: Each module has single, well-defined responsibility
- **Event-Driven Architecture**: Clean communication between modules via callbacks
- **Better Error Handling**: Proper error propagation and user feedback
- **Memory Management**: Explicit cleanup and resource disposal patterns
- **Testability**: Each module can be unit tested independently
- **Maintainability**: Easy to modify individual components without side effects

#### Files Created
- All 6 new manager classes in `lib/client/` directory
- `main-original.js` - Complete backup of original monolithic file
- `main-refactored.js` - Development version for comparison
- `REFACTORING_SUMMARY.md` - Detailed technical documentation

#### Functionality Preservation
✅ **All original features work identically**:
- 3D scene rendering with Three.js
- Layer-based texture editing (text and logo layers)
- Image processing (both client & server-side)
- Configuration save/load with drag & drop
- UI interactions and notifications
- Memory management and error handling
- Server integration and environment variable configuration

#### Migration Benefits
- **No Breaking Changes**: All external APIs remain unchanged
- **Same Dependencies**: No new external libraries required
- **Easy Rollback**: Original file preserved as `main-original.js`
- **Performance**: Better memory management and event handling
- **Developer Experience**: Much easier to navigate and understand codebase

## Image Upload & Validation System Improvements

### Overview
Implemented comprehensive image file size and resolution validation with user-friendly error messages and configurable limits via environment variables.

### Key Changes Made

#### 1. Environment Variables Configuration (.env)
```env
# Image Processing Configuration
MAX_IMAGE_FILE_SIZE_MB=5               # Maximum upload file size (rejects larger files)
MAX_IMAGE_WIDTH=1024                   # Output image width (all images resized to this)
MAX_IMAGE_HEIGHT=1024                  # Output image height (all images resized to this)
MAX_INPUT_IMAGE_WIDTH=8192             # Input size limit for processing (currently not enforced - auto-resize)
MAX_INPUT_IMAGE_HEIGHT=8192            # Input size limit for processing (currently not enforced - auto-resize)

# Notification Settings
VALIDATION_ERROR_DURATION_MS=8000      # Duration for validation error notifications
DEFAULT_ERROR_DURATION_MS=5000         # Duration for general error notifications
```

#### 2. Server-Side Changes (server.js)

**Added Configuration API Endpoint:**
- `GET /api/config` - Returns client configuration values
- Provides: maxImageFileSize, validationErrorDuration, defaultErrorDuration

**Updated Multer Configuration:**
- Uses `MAX_IMAGE_FILE_SIZE_MB` environment variable
- Improved error message: "File too large. Maximum file size allowed: 5MB. Please resize your image and try again."

**Enhanced Error Handling:**
- File size validation with detailed error messages
- Proper HTTP status codes and JSON error responses

#### 3. Image Processor Changes (lib/imageProcessor.js)

**Removed Resolution Rejection Logic:**
- Previously: Rejected images > 8192x8192 pixels
- Now: Auto-resizes ALL images regardless of input size
- Reason: Inconsistent to say "will auto-resize" but then reject

**Updated Constructor:**
- Added `maxInputWidth` and `maxInputHeight` parameters
- Currently used only for logging, not rejection

**Processing Behavior:**
- All images automatically resized to ≤ 1024x1024 pixels
- Maintains aspect ratio during resizing
- Compression applied based on COMPRESSION_QUALITY setting

#### 4. Client-Side Changes (main.js)

**Configuration Loading:**
- Added `loadServerConfiguration()` method
- Fetches validation durations and file size limits from server
- Falls back to defaults if server unavailable

**Updated File Size Validation:**
- Changed from hardcoded 2MB to configurable 5MB limit
- Loads actual limit from server configuration
- Only validates for client-side processing (server handles its own validation)

**Enhanced Error Handling:**
- Validation errors now use configurable display durations
- File size errors: 8 seconds (default), other errors: 5 seconds (default)
- Added ❌ emoji prefix for error notifications
- Re-throws server validation errors instead of falling back to client processing

**Fixed Layer Creation Logic:**
- Layers only created after successful image loading
- No empty layers created when image processing fails
- Proper error handling with Promise rejection

**Updated Error Messages:**
- File size: "❌ File 'filename' is too large (X.XMB). Maximum file size allowed: 5MB. Please resize your image and try again."
- Server errors: Detailed messages with specifications and guidance

#### 5. Error Notification System

**Enhanced Notification Display:**
- Validation errors: Red background, 8-second duration
- General errors: Red background, 5-second duration
- Multi-line support for detailed error messages
- Auto-dismiss with manual close option
- Slide-in animation with proper positioning

### Current Behavior

#### File Size Validation (5MB Limit)
- ✅ Files ≤ 5MB: Processed normally
- ❌ Files > 5MB: Rejected with detailed error message
- 🚫 No layer created for oversized files

#### Image Resolution Processing (Unlimited Input Size)
- ✅ Any resolution accepted for processing
- ✅ All images auto-resized to ≤ 1024x1024 pixels
- ✅ Aspect ratio maintained during resizing
- ✅ Layer created with properly sized image

#### Error Flow
1. **Server Validation**: File size checked by multer
2. **Image Processing**: All images resized regardless of input size
3. **Client Display**: Errors shown with appropriate duration and styling
4. **Layer Management**: Only successful images create layers

### Benefits of Changes

1. **Consistency**: No more conflicting messages about auto-resize vs rejection
2. **Configurability**: All limits stored in .env file, no hardcoded values
3. **User Experience**: Clear error messages with actionable guidance
4. **Performance**: Server-side processing with client-side fallback
5. **Reliability**: Proper error handling prevents empty layers

### Configuration Management

**Server Configuration (.env)**
- All processing limits and durations configurable
- Environment-based configuration for different deployments
- Clear documentation of what each setting controls

**Client Configuration Loading**
- Automatically syncs with server settings
- Graceful fallback to defaults if server unavailable
- Real-time configuration updates without code changes

### Testing Recommendations

1. **File Size Testing:**
   - Upload files under 5MB → Should process normally
   - Upload files over 5MB → Should show error, no layer created

2. **Resolution Testing:**
   - Upload small images (e.g., 100x100) → Should process, possibly upscaled
   - Upload large images (e.g., 5000x5000) → Should resize to ≤1024x1024
   - Upload very large images (e.g., 10000x10000) → Should resize to ≤1024x1024

3. **Error Display Testing:**
   - Validation errors should display for 8 seconds
   - General errors should display for 5 seconds
   - Error messages should be clear and actionable

### Future Improvements

1. **Progressive File Size Validation**: Could add client-side pre-validation
2. **Resolution Warnings**: Could warn about very large images before processing
3. **Batch Processing**: Enhanced error handling for multiple file uploads
4. **Configuration UI**: Admin interface to modify settings without .env access

---

## JavaScript Error Resolution - September 6, 2025

### Overview
Resolved critical JavaScript errors related to undefined environment variables that were preventing application initialization.

### Issues Fixed
- `ReferenceError: __SERVER_HOST__ is not defined`
- `ReferenceError: __SERVER_PORT__ is not defined`  
- `Unexpected identifier 'localhost'` syntax error in Vite's env.mjs

### Root Cause
Vite's `define` configuration was not properly injecting environment variables into the client code during development.

### Solution Implemented
1. **Environment Variable Approach**: Switched from Vite `define` to `import.meta.env` pattern
2. **Updated .env Configuration**: Added VITE_-prefixed environment variables
3. **Modified main.js**: Replaced undefined variables with proper `import.meta.env` calls
4. **Simplified Vite Config**: Removed problematic `define` configuration section

### Configuration Requirements

#### Port Number Standards
**IMPORTANT**: All server ports must be 3020 or higher. Port numbers below 3020 are not acceptable.

- ✅ **Frontend Ports**: 3020+ (Vite development server)
- ✅ **Backend Ports**: 3030+ (Express/Node.js server) 
- ❌ **Avoid**: Any port numbers below 3020

#### Current Port Configuration (.env)
```env
PORT=3030                    # Backend server port (3030+)
SERVER_HOST=localhost
VITE_SERVER_PORT=3030       # Must match PORT for client-server communication
VITE_SERVER_HOST=localhost
FRONTEND_PORT=3020          # Frontend development server (3020+)
```

### Files Modified
- `main.js` - Updated environment variable usage
- `.env` - Added VITE_-prefixed variables and corrected port configuration
- `vite.config.js` - Removed `define` section, simplified configuration

### Current Status
- ✅ Application loads without JavaScript errors
- ✅ Client-server communication established
- ✅ Server configuration loaded successfully
- ✅ All modular architecture features working properly

---

## Complete Hardcoded Port Removal - September 6, 2025

### Overview
Resolved all hardcoded port references in the codebase to use environment variables exclusively, eliminating port switching issues and providing complete configuration flexibility.

### Issues Fixed
- **Hardcoded URLs**: Removed `http://localhost:3030` hardcoded URLs in backup files
- **Hardcoded Fallbacks**: Replaced all hardcoded port fallbacks with environment variable references
- **Configuration Inconsistencies**: Added default port environment variables for comprehensive fallback support

### Changes Made

#### Environment Variables Added (.env)
```env
# Default Port Fallbacks (when environment variables are not available)
DEFAULT_SERVER_PORT=3030
DEFAULT_FRONTEND_PORT=3020
VITE_DEFAULT_SERVER_PORT=3030
VITE_DEFAULT_FRONTEND_PORT=3020
```

#### Files Updated
1. **main.js** - Updated fallback ports from hardcoded '3030' to `import.meta.env.VITE_DEFAULT_SERVER_PORT || '3030'`
2. **main-refactored.js** - Completely removed hardcoded URLs, now uses environment variables dynamically:
   ```javascript
   const serverHost = import.meta.env.VITE_SERVER_HOST || 'localhost';
   const serverPort = import.meta.env.VITE_SERVER_PORT || import.meta.env.VITE_DEFAULT_SERVER_PORT || '3030';
   ```
3. **server.js** - Updated fallbacks from hardcoded 3001/3030 to use `DEFAULT_SERVER_PORT`
4. **launch.bat** - Updated default backend port from 3001 to 3030
5. **vite.config.js** - Enhanced to use cascading environment variable fallbacks
6. **main-original.js** - Added comment noting this is backup file with simplified hardcoded fallback

#### Key Improvements
- **Zero Hardcoded Addresses**: All active files now use environment variables exclusively
- **Cascading Fallbacks**: `VITE_SERVER_PORT` → `VITE_DEFAULT_SERVER_PORT` → hardcoded fallback
- **Dynamic URL Construction**: Server URLs built dynamically from host + port environment variables
- **Configuration Flexibility**: All ports configurable via .env without code changes
- **Port Mismatch Prevention**: Environment-driven configuration prevents port switching issues

#### Current Configuration Flow
1. **Primary**: `.env` file values (e.g., `PORT=3030`, `VITE_SERVER_PORT=3030`)
2. **Secondary**: Default environment variables (e.g., `DEFAULT_SERVER_PORT=3030`)
3. **Tertiary**: Hardcoded fallbacks only as final safety net

### Benefits
- ✅ **No More Port Switching**: Consistent port usage across all components
- ✅ **Environment Driven**: All configuration through .env file
- ✅ **Development Friendly**: Easy to change ports for different environments
- ✅ **Production Ready**: No hardcoded values to cause deployment issues

---

## GLB Model Memory Management - September 7, 2025

### Overview
Implemented proper memory cleanup system for switching GLB model files while preserving generated textures.

### Key Changes Made

#### SceneManager.js Enhancements

**Added clearModel() Method:**
- Removes existing model from scene graph
- Disposes geometries to free GPU vertex data memory
- Disposes materials to free GPU material memory
- Disposes original model textures (preserves generated texture layers)
- Nullifies model and material references for garbage collection

**Updated loadModel() Method:**
- Added optional `modelPath` parameter for dynamic model loading
- Automatically calls `clearModel()` before loading new model
- Prevents memory leaks when switching between GLB files

#### Memory Management Strategy
```javascript
// Usage for switching GLB files:
sceneManager.loadModel('path/to/new-model.glb');

// Memory cleanup process:
1. Remove model from scene
2. Dispose geometries (vertex data)
3. Dispose materials (shader data)
4. Dispose original textures (NOT generated textures)
5. Clear object references
6. Load new GLB file
7. Apply existing texture layers to new model
```

#### Benefits
- **Memory Efficient**: Prevents GPU memory accumulation when switching models
- **Texture Preservation**: Generated texture layers remain intact across model switches  
- **Clean Resource Management**: Proper disposal of Three.js objects
- **Performance**: Avoids memory leaks that could slow down application
- **Flexibility**: Easy model switching with `loadModel(path)` method

#### File Format Decision
- **Chosen Format**: GLB (binary GLTF)
- **Reasoning**: Single file, smaller size, faster loading, no external dependencies
- **Use Case**: Model geometry only (textures generated by texture editor)

---

*Last updated: September 7, 2025*  
*Latest session: GLB Model Memory Management*  
*Previous sessions: Complete hardcoded port removal, JavaScript error resolution, Major architectural refactoring, Image validation improvements*