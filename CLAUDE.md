# ST Configurator - Project Overview

A 3D texture editing application with Three.js frontend and Node.js backend.

## Architecture

**Modular Structure**: Refactored from monolithic `main.js` into focused manager classes:

```
lib/client/
├── SceneManager.js         - 3D scene and rendering operations
├── LayerManager.js         - Layer management and textures
├── InteractionManager.js   - Mouse/input handling
├── UIManager.js           - DOM manipulation and UI
├── SessionManager.js      - Session save/load
└── ImageProcessor.js      - Client image processing
```

**Core Features**:
- 3D GLB model rendering with Three.js
- Layer-based texture editing (text and logo layers)
- Session management with server storage
- Image processing (client & server-side)
- Configuration management via environment variables

## Environment Configuration

**Important Port Requirements**:
- Frontend: 3020+ (Vite development server)
- Backend: 3030+ (Express/Node.js server)

**Key Environment Variables**:
```env
# Server Ports
PORT=3030
VITE_SERVER_PORT=3030
FRONTEND_PORT=3020

# Image Processing
MAX_IMAGE_FILE_SIZE_MB=5
MAX_IMAGE_WIDTH=1024
MAX_IMAGE_HEIGHT=1024

# Security (CSP implemented)
NODE_ENV=development
CSP_UNSAFE_INLINE_STYLES=true    # Required for Three.js
CSP_UNSAFE_EVAL_SCRIPTS=true     # Required for Three.js shaders
```

## Key Bug Fixes & Features

**✅ Rotation Hit Detection** - Fixed layer selection when rotated (LayerManager.js:449-503)
**✅ Memory Management** - GLB model cleanup with SceneManager.clearModel()
**✅ Session Management** - Complete state save/load with SessionManager.js
**✅ Image Validation** - 5MB limit with auto-resize to 1024x1024
**✅ Content Security Policy** - Comprehensive XSS protection implemented

## Development Safety

**⚠️ NEVER USE**: `taskkill //F //IM node.exe` (kills Claude Code sessions)
**✅ Use instead**: `Ctrl+C` in server terminal or target specific PIDs