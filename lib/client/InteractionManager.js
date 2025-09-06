export class InteractionManager {
    constructor(sceneManager, layerManager) {
        this.sceneManager = sceneManager;
        this.layerManager = layerManager;
        this.canvas = sceneManager.renderer.domElement;
        
        this.isDragging = false;
        this.dragLayer = null;
        this.dragOffset = { x: 0, y: 0 };
        this.cursorUpdateTimeout = null;
        
        this.onLayerClicked = null;
        this.onLayerDragStart = null;
        this.onLayerDrag = null;
        this.onLayerDragEnd = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
        this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.isDragging) {
                clearTimeout(this.cursorUpdateTimeout);
                this.cursorUpdateTimeout = setTimeout(() => {
                    this.updateCursor(event);
                }, 50);
            }
        });
    }
    
    onMouseDown(event) {
        if (event.button !== 0) return;
        
        const mouseCoords = this.getMouseCoordinates(event);
        const intersection = this.sceneManager.getIntersection(mouseCoords.x, mouseCoords.y);
        
        if (intersection) {
            const uv = intersection.uv;
            const clickedLayer = this.layerManager.getLayerAtPosition(uv.x, uv.y);
            
            if (clickedLayer) {
                this.layerManager.selectLayer(clickedLayer);
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
        
        this.layerManager.updateLayer(this.dragLayer, {
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
    }
}