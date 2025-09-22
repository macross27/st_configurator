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

## Intelligent Agent Orchestration Strategy

**Claude Code should automatically select and orchestrate agents based on task requirements:**

### Primary Agents (Use Proactively)

**`architect-review`** - Use for:
- System design decisions and architectural changes
- Code structure evaluation and recommendations
- Scalability and maintainability assessments
- Design pattern implementation guidance

**`backend-architect`** - Use for:
- Server-side architecture (Express.js, Node.js)
- API design and RESTful endpoint creation
- Database schema and data flow design
- Server performance optimization

**`ui-ux-designer`** - Use for:
- Three.js UI/UX improvements
- User interaction design for 3D interfaces
- Accessibility enhancements
- Design system consistency

**`performance-engineer`** - Use for:
- Three.js rendering optimization
- Memory management improvements
- Bundle size optimization
- Real-time performance monitoring

**`test-automator`** - Use for:
- Test strategy development
- Automated testing implementation
- Quality assurance workflows
- CI/CD pipeline testing

**`debugger`** - Use for:
- Bug investigation and resolution
- Error analysis and troubleshooting
- Performance bottleneck identification
- Issue reproduction and fixing

**`code-reviewer`** - Use for:
- Code quality assessment
- Security vulnerability detection
- Best practices enforcement
- Pre-commit code analysis

### Specialized Agents (Use When Applicable)

**`typescript-pro`** - Use for:
- TypeScript implementation and migration
- Advanced type system design
- Type safety improvements
- Generic and utility type creation

**`javascript-pro`** - Use for:
- Modern JavaScript optimization
- ES6+ feature implementation
- Browser compatibility issues
- Async/await pattern optimization

**`cloud-architect`** - Use for:
- Deployment strategy design
- Infrastructure as Code
- Scalability planning
- Cloud service integration

**`docs-architect`** - Use for:
- Technical documentation creation
- API documentation generation
- Architecture documentation
- Developer guide creation

### Configuration Agents

**`statusline-setup`** - Use for:
- Claude Code status line configuration
- Development environment customization

**`output-style-setup`** - Use for:
- Claude Code output formatting
- Terminal display customization

### UI Validation Agent

**`ui-visual-validator`** - Use for:
- Visual regression testing
- UI component validation
- Accessibility compliance checking
- Design system adherence verification

### Orchestration Guidelines

**Multi-Agent Workflows** - Run agents in parallel when possible:
- `code-reviewer` + `test-automator` for comprehensive quality checks
- `architect-review` + `performance-engineer` for system optimization
- `ui-ux-designer` + `ui-visual-validator` for UI improvements
- `backend-architect` + `debugger` for server-side issues

**Task Complexity Assessment**:
- **Simple**: Direct implementation (no agent needed)
- **Moderate**: Single specialized agent
- **Complex**: Multiple agents orchestrated in sequence/parallel
- **Architecture**: Always involve `architect-review` first

**Decision Flow**:
1. Analyze task scope and complexity
2. Identify primary domain (backend, frontend, testing, etc.)
3. Select primary agent based on domain expertise
4. Determine if additional agents needed for quality/validation
5. Execute agents in optimal sequence (parallel when possible)

**Default Strategy**: When in doubt, use `general-purpose` agent for comprehensive analysis, then delegate to specialized agents as needed.