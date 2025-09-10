export class InteractionManager {
    constructor(sceneManager, layerManager) {
        this.sceneManager = sceneManager;
        this.layerManager = layerManager;
        this.canvas = sceneManager.renderer.domElement;
        
        this.isDragging = false;
        this.dragLayer = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Throttling system for performance
        this.cursorUpdateTimeout = null;
        this.throttledMouseMove = this.throttle(this.handleMouseMove.bind(this), 16); // 60fps
        this.throttledCursorUpdate = this.throttle(this.updateCursor.bind(this), 100); // 10fps for cursor updates
        this.lastMouseMoveTime = 0;
        this.mouseMoveThrottle = 8; // ~120fps for drag operations
        
        this.onLayerClicked = null;
        this.onLayerDragStart = null;
        this.onLayerDrag = null;
        this.onLayerDragEnd = null;
        this.onLayerDeleteRequested = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.canvas.addEventListener('mousemove', this.throttledMouseMove);
        this.canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
        this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        
        // Add keyboard event listener for delete key
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    handleMouseMove(event) {
        const now = performance.now();
        
        if (this.isDragging) {
            // High-frequency updates for dragging (but still throttled)
            if (now - this.lastMouseMoveTime >= this.mouseMoveThrottle) {
                this.onMouseMove(event);
                this.lastMouseMoveTime = now;
                // Request render for smooth dragging
                this.sceneManager.requestRender();
            }
        } else {
            // Low-frequency cursor updates when not dragging
            this.throttledCursorUpdate(event);
        }
    }
    
    onMouseDown(event) {
        if (event.button !== 0) return;
        
        const mouseCoords = this.getMouseCoordinates(event);
        const intersection = this.sceneManager.getIntersection(mouseCoords.x, mouseCoords.y);
        
        if (intersection) {
            const uv = intersection.uv;
            const clickedLayer = this.layerManager.getLayerAtPosition(uv.x, uv.y);
            
            if (clickedLayer) {
                this.layerManager.selectLayer(clickedLayer.id);
                this.startDrag(clickedLayer, uv);
                
                if (this.onLayerClicked) {
                    this.onLayerClicked(clickedLayer);
                }
            } else {
                this.layerManager.selectLayer(null);
            }
        }
    }
    
    onMouseMove(event) {
        if (!this.isDragging) return;
        
        const mouseCoords = this.getMouseCoordinates(event);
        const intersection = this.sceneManager.getIntersection(mouseCoords.x, mouseCoords.y);
        
        if (intersection && this.dragLayer) {
            const uv = intersection.uv;
            this.updateDrag(uv);
        }
    }
    
    onMouseUp(event) {
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    startDrag(layer, uv) {
        this.isDragging = true;
        this.dragLayer = layer;
        this.dragOffset = {
            x: uv.x - layer.position.x,
            y: uv.y - layer.position.y
        };
        
        this.sceneManager.setControlsEnabled(false);
        this.canvas.style.cursor = 'grabbing';
        
        if (this.onLayerDragStart) {
            this.onLayerDragStart(layer);
        }
    }
    
    updateDrag(uv) {
        if (!this.dragLayer) return;
        
        const newX = Math.max(0, Math.min(1, uv.x - this.dragOffset.x));
        const newY = Math.max(0, Math.min(1, uv.y - this.dragOffset.y));
        
        this.layerManager.updateLayer(this.dragLayer.id, {
            position: { x: newX, y: newY }
        });
        
        if (this.onLayerDrag) {
            this.onLayerDrag(this.dragLayer);
        }
    }
    
    endDrag() {
        this.isDragging = false;
        const layer = this.dragLayer;
        this.dragLayer = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.sceneManager.setControlsEnabled(true);
        this.canvas.style.cursor = 'default';
        
        if (this.onLayerDragEnd) {
            this.onLayerDragEnd(layer);
        }
    }
    
    onKeyDown(event) {
        // Check if delete key is pressed and there's a selected layer
        if ((event.key === 'Delete' || event.key === 'Backspace') && this.layerManager.getSelectedLayer()) {
            // Only trigger if not typing in an input field
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                event.preventDefault();
                if (this.onLayerDeleteRequested) {
                    this.onLayerDeleteRequested(this.layerManager.getSelectedLayer());
                }
            }
        }
    }
    
    updateCursor(event) {
        if (this.isDragging) return;
        
        const mouseCoords = this.getMouseCoordinates(event);
        const intersection = this.sceneManager.getIntersection(mouseCoords.x, mouseCoords.y);
        
        if (intersection) {
            const uv = intersection.uv;
            const layer = this.layerManager.getLayerAtPosition(uv.x, uv.y);
            
            if (layer) {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = 'default';
            }
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    getMouseCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        return { x, y };
    }
    
    dispose() {
        if (this.cursorUpdateTimeout) {
            clearTimeout(this.cursorUpdateTimeout);
        }
        
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('contextmenu', this.preventDefault);
        document.removeEventListener('keydown', this.onKeyDown);
    }
}