export class InteractionManager {
    constructor(sceneManager, layerManager) {
        this.sceneManager = sceneManager;
        this.layerManager = layerManager;
        this.canvas = sceneManager.renderer.domElement;

        // Layer movement settings from environment
        this.moveLayerEnabled = parseInt(import.meta.env.MOVE_LAYER || '1') === 1;

        this.isDragging = false;
        this.dragLayer = null;
        this.dragOffset = { x: 0, y: 0 };

        // Touch support properties
        this.isTouch = false;
        this.touchId = null;
        this.lastTouchTime = 0;
        this.touchStartPosition = { x: 0, y: 0 };
        this.touchMoveThreshold = 10; // pixels

        // Throttling system for performance
        this.cursorUpdateTimeout = null;
        this.throttledMouseMove = this.throttle(this.handleMouseMove.bind(this), 16); // 60fps
        this.throttledTouchMove = this.throttle(this.handleTouchMove.bind(this), 16); // 60fps
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
        // Mouse events
        this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.canvas.addEventListener('mousemove', this.throttledMouseMove);
        this.canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
        this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (event) => this.onTouchStart(event), { passive: false });
        this.canvas.addEventListener('touchmove', this.throttledTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', (event) => this.onTouchEnd(event), { passive: false });
        this.canvas.addEventListener('touchcancel', (event) => this.onTouchEnd(event), { passive: false });

        // Prevent default touch behaviors
        this.canvas.style.touchAction = 'none';

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
        if (this.isTouch) return; // Ignore mouse events during touch

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

    handleTouchMove(event) {
        if (!this.isTouch) return;

        const now = performance.now();

        if (this.isDragging) {
            // High-frequency updates for dragging (but still throttled)
            if (now - this.lastMouseMoveTime >= this.mouseMoveThrottle) {
                this.onTouchMove(event);
                this.lastMouseMoveTime = now;
                // Request render for smooth dragging
                this.sceneManager.requestRender();
            }
        }
    }
    
    onMouseDown(event) {
        if (this.isTouch) return; // Ignore mouse events during touch
        if (event.button !== 0) return;

        const mouseCoords = this.getMouseCoordinates(event);
        this.handlePointerDown(mouseCoords, event);
    }

    onTouchStart(event) {
        event.preventDefault();

        // Handle only the first touch
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.isTouch = true;
            this.touchId = touch.identifier;
            this.lastTouchTime = performance.now();

            const touchCoords = this.getTouchCoordinates(touch);
            this.touchStartPosition = { x: touch.clientX, y: touch.clientY };

            this.handlePointerDown(touchCoords, event);
        }
    }

    handlePointerDown(coords, event) {
        // Skip layer interaction if movement is disabled
        if (!this.moveLayerEnabled) {
            return;
        }

        const intersection = this.sceneManager.getIntersection(coords.x, coords.y);

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
        if (!this.isDragging || this.isTouch) return;

        const mouseCoords = this.getMouseCoordinates(event);
        this.handlePointerMove(mouseCoords);
    }

    onTouchMove(event) {
        if (!this.isTouch || !this.isDragging) return;

        event.preventDefault();

        // Find the touch that started the interaction
        const touch = Array.from(event.touches).find(t => t.identifier === this.touchId);
        if (!touch) return;

        const touchCoords = this.getTouchCoordinates(touch);
        this.handlePointerMove(touchCoords);
    }

    handlePointerMove(coords) {
        // Skip if layer movement is disabled
        if (!this.moveLayerEnabled) {
            return;
        }

        const intersection = this.sceneManager.getIntersection(coords.x, coords.y);

        if (intersection && this.dragLayer) {
            const uv = intersection.uv;
            this.updateDrag(uv);
        }
    }
    
    onMouseUp(event) {
        if (this.isTouch) return; // Ignore mouse events during touch

        if (this.isDragging) {
            this.endDrag();
        }
    }

    onTouchEnd(event) {
        if (!this.isTouch) return;

        event.preventDefault();

        // Check if our specific touch ended
        const stillActive = Array.from(event.touches).some(t => t.identifier === this.touchId);

        if (!stillActive) {
            this.isTouch = false;
            this.touchId = null;

            if (this.isDragging) {
                this.endDrag();
            }
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

        // Log the final coordinates when drag ends
        if (layer) {
            console.log(`Logo drag ended - Final coordinates: x=${layer.position.x.toFixed(4)}, y=${layer.position.y.toFixed(4)}`);
        }

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

        // Skip cursor updates if layer movement is disabled
        if (!this.moveLayerEnabled) {
            this.canvas.style.cursor = 'default';
            return;
        }

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

    getTouchCoordinates(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        return { x, y };
    }
    
    dispose() {
        if (this.cursorUpdateTimeout) {
            clearTimeout(this.cursorUpdateTimeout);
        }

        // Remove mouse events
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('contextmenu', this.preventDefault);

        // Remove touch events
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.onTouchEnd);

        document.removeEventListener('keydown', this.onKeyDown);
    }
}