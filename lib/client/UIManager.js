import { ColorWheelPicker } from './ColorWheelPicker.js';

export class UIManager {
    constructor() {
        this.elements = {
            primaryColor: document.getElementById('primary-color'),
            secondaryColor: document.getElementById('secondary-color'),
            addTextBtn: document.getElementById('add-text-btn'),
            addLogoBtn: document.getElementById('add-logo-btn'),
            exportBtn: document.getElementById('export-btn'),
            importBtn: document.getElementById('import-btn'),
            layersList: document.getElementById('layers-list'),
            scaleSliderOverlay: document.getElementById('scale-slider-overlay'),
            scaleSlider: document.getElementById('scale-slider'),
            scaleValue: document.getElementById('scale-value'),
            rotateSlider: document.getElementById('rotate-slider'),
            rotateValue: document.getElementById('rotate-value'),
            flipHorizontalCheckbox: document.getElementById('flip-horizontal-checkbox'),
            fovSliderOverlay: document.getElementById('fov-slider-overlay'),
            fovSlider: document.getElementById('fov-slider'),
            fovValue: document.getElementById('fov-value'),
            resetViewBtn: document.getElementById('reset-view-btn'),
            colorPaletteContainer: document.getElementById('color-palette-container'),
            currentColorDisplay: document.getElementById('current-color-display'),
            currentColorSwatch: document.getElementById('current-color-swatch'),
            colorPickerDropdown: document.getElementById('color-picker-dropdown'),
            colorPickerCloseBtn: document.getElementById('color-picker-close-btn'),
            colorWheelCanvas: document.getElementById('color-wheel-canvas'),
            colorWheelHandle: document.getElementById('color-wheel-handle'),
            brightnessSliderTrack: document.getElementById('brightness-slider-track'),
            brightnessSliderHandle: document.getElementById('brightness-slider-handle'),
            layerColorPickerDropdown: document.getElementById('layer-color-picker-dropdown'),
            layerColorPickerCloseBtn: document.getElementById('layer-color-picker-close-btn'),
            layerColorWheelCanvas: document.getElementById('layer-color-wheel-canvas'),
            layerColorWheelHandle: document.getElementById('layer-color-wheel-handle'),
            layerBrightnessSliderTrack: document.getElementById('layer-brightness-slider-track'),
            layerBrightnessSliderHandle: document.getElementById('layer-brightness-slider-handle')
        };
        
        this.onColorChange = null;
        this.onAddText = null;
        this.onAddLogo = null;
        this.onExport = null;
        this.onImport = null;
        this.onLayerPropertyChange = null;
        this.onScaleChange = null;
        this.onRotateChange = null;
        this.onFlipChange = null;
        this.onFovChange = null;
        this.onLayerControl = null;
        this.onLayerColorChange = null;
        this.onResetView = null;
        
        this.colorWheelPicker = null;
        this.layerColorWheelPicker = null;
        this.currentLayerColorInput = null;
        
        this.setupEventListeners();
        this.hideScaleSlider();
        this.hideFovSlider();
        this.initializeColorWheel();
        this.initializeLayerColorWheel();
    }
    
    setupEventListeners() {
        this.elements.primaryColor.addEventListener('input', () => {
            if (this.onColorChange) {
                this.onColorChange({
                    primary: this.elements.primaryColor.value,
                    secondary: this.elements.secondaryColor.value
                });
            }
        });
        
        this.elements.secondaryColor.addEventListener('input', () => {
            if (this.onColorChange) {
                this.onColorChange({
                    primary: this.elements.primaryColor.value,
                    secondary: this.elements.secondaryColor.value
                });
            }
        });
        
        this.elements.addTextBtn.addEventListener('click', () => {
            if (this.onAddText) {
                this.onAddText();
            }
        });
        
        this.elements.addLogoBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                if (this.onAddLogo) {
                    this.onAddLogo(files);
                }
            };
            input.click();
        });
        
        
        this.elements.exportBtn.addEventListener('click', () => {
            if (this.onExport) {
                this.onExport();
            }
        });
        
        this.elements.importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.uniformconfig,.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file && this.onImport) {
                    this.onImport(file);
                }
            };
            input.click();
        });
        
        this.elements.scaleSlider.addEventListener('input', (e) => {
            const newScale = parseFloat(e.target.value);
            this.elements.scaleValue.textContent = newScale.toFixed(1);
            if (this.onScaleChange) {
                this.onScaleChange(newScale);
            }
        });
        
        this.elements.rotateSlider.addEventListener('input', (e) => {
            const newRotation = parseFloat(e.target.value);
            this.elements.rotateValue.textContent = newRotation + '°';
            if (this.onRotateChange) {
                this.onRotateChange(newRotation);
            }
        });
        
        this.elements.flipHorizontalCheckbox.addEventListener('change', (e) => {
            const isFlipped = e.target.checked;
            if (this.onFlipChange) {
                this.onFlipChange(isFlipped);
            }
        });
        
        this.elements.fovSlider.addEventListener('input', (e) => {
            const newFov = parseFloat(e.target.value);
            this.elements.fovValue.textContent = newFov + '°';
            if (this.onFovChange) {
                this.onFovChange(newFov);
            }
        });
        
        this.elements.resetViewBtn.addEventListener('click', () => {
            if (this.onResetView) {
                this.onResetView();
            }
        });
        
        // Global keyboard event listeners
        this.setupGlobalKeyListeners();
        
        // Color palette event listeners
        this.setupColorPaletteListeners();
        
        // Layer color picker event listeners
        this.setupLayerColorPickerListeners();
    }
    
    initializeColorWheel() {
        if (this.elements.colorWheelCanvas) {
            this.colorWheelPicker = new ColorWheelPicker(this.elements.colorWheelCanvas, {
                handleElement: this.elements.colorWheelHandle,
                brightnessSlider: this.elements.brightnessSliderTrack,
                brightnessHandle: this.elements.brightnessSliderHandle,
                onColorChange: (color) => {
                    const hexColor = this.colorWheelPicker.getCurrentHexColor();
                    // Update both the preview and the actual layer in real-time
                    this.elements.currentColorSwatch.style.backgroundColor = hexColor;
                    if (this.onLayerColorChange) {
                        this.onLayerColorChange(hexColor);
                    }
                }
            });
        }
    }
    
    initializeLayerColorWheel() {
        if (this.elements.layerColorWheelCanvas) {
            try {
                this.layerColorWheelPicker = new ColorWheelPicker(this.elements.layerColorWheelCanvas, {
                    handleElement: this.elements.layerColorWheelHandle,
                    brightnessSlider: this.elements.layerBrightnessSliderTrack,
                    brightnessHandle: this.elements.layerBrightnessSliderHandle,
                    onColorChange: (color) => {
                        const hexColor = this.layerColorWheelPicker.getCurrentHexColor();
                        // Update the current layer being edited
                        if (this.currentLayerColorInput) {
                            this.currentLayerColorInput.value = hexColor;
                            // Also trigger the visual update of the input
                            this.currentLayerColorInput.style.backgroundColor = hexColor;
                            // Trigger the input event to update the layer
                            this.currentLayerColorInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        // Also call the layer color change callback directly for immediate updates
                        if (this.onLayerColorChange) {
                            this.onLayerColorChange(hexColor);
                        }
                    }
                });
            } catch (error) {
                console.error('Error creating layer ColorWheelPicker:', error);
            }
        }
    }
    
    setupGlobalKeyListeners() {
        document.addEventListener('keydown', (e) => {
            // F key toggles FOV slider
            if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                // Only if we're not typing in an input field
                if (document.activeElement.tagName !== 'INPUT' && 
                    document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.toggleFovSlider();
                }
            }
            
            // Escape key closes FOV slider and color picker
            if (e.key === 'Escape') {
                this.hideFovSlider();
                this.hideColorPickerDropdown();
            }
        });
    }
    
    setupColorPaletteListeners() {
        // Current color display click handler
        if (this.elements.currentColorDisplay) {
            this.elements.currentColorDisplay.addEventListener('click', () => {
                this.toggleColorPickerDropdown();
            });
        }
        
        // Close button handler
        if (this.elements.colorPickerCloseBtn) {
            this.elements.colorPickerCloseBtn.addEventListener('click', () => {
                this.hideColorPickerDropdown();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.elements.colorPaletteContainer && this.elements.colorPickerDropdown) {
                if (!this.elements.colorPaletteContainer.contains(e.target) && 
                    !this.elements.colorPickerDropdown.contains(e.target)) {
                    this.hideColorPickerDropdown();
                }
            }
        });
        
        
        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.colorPickerDropdown && this.elements.colorPickerDropdown.classList.contains('show')) {
                this.hideColorPickerDropdown();
            }
        });
    }
    
    updateColorDisplay(color) {
        // Update current color display
        this.elements.currentColorSwatch.style.backgroundColor = color;
        
        // Update color wheel picker if it exists
        if (this.colorWheelPicker) {
            this.colorWheelPicker.setColor(color);
        }
    }
    
    setColor(color) {
        this.updateColorDisplay(color);
        if (this.onLayerColorChange) {
            this.onLayerColorChange(color);
        }
    }
    
    toggleColorPickerDropdown() {
        if (this.elements.colorPickerDropdown.classList.contains('show')) {
            this.hideColorPickerDropdown();
        } else {
            this.showColorPickerDropdown();
        }
    }
    
    showColorPickerDropdown() {
        if (this.elements.colorPickerDropdown) {
            this.elements.colorPickerDropdown.classList.add('show');
        }
    }
    
    hideColorPickerDropdown() {
        if (this.elements.colorPickerDropdown) {
            this.elements.colorPickerDropdown.classList.remove('show');
        }
    }
    
    updateLayersList(layers, selectedLayer) {
        this.elements.layersList.innerHTML = '';
        
        layers.forEach((layer, index) => {
            const layerElement = this.createLayerElement(layer, selectedLayer);
            this.elements.layersList.appendChild(layerElement);
        });
    }
    
    createLayerElement(layer, selectedLayer) {
        const div = document.createElement('div');
        div.className = 'layer-item';
        div.dataset.layerId = layer.id;
        
        if (selectedLayer === layer) {
            div.classList.add('selected');
        }
        
        if (layer.locked) {
            div.classList.add('locked');
        }
        
        div.innerHTML = `
            <div class="layer-header">
                <span class="layer-name">${layer.name}</span>
                <div class="layer-controls">
                    <button class="layer-control-btn lock" title="${layer.locked ? 'Unlock layer' : 'Lock layer'}">${layer.locked ? '🔒' : '🔓'}</button>
                    <button class="layer-control-btn delete-x" title="Delete layer">×</button>
                </div>
            </div>
            <div class="layer-properties">
                ${layer.type === 'text' ? `
                    <div class="layer-property">
                        <span>Text:</span>
                        <input type="text" value="${layer.text}" data-prop="text">
                    </div>
                    <div class="layer-property">
                        <span>Size:</span>
                        <input type="number" value="${layer.fontSize}" data-prop="fontSize">
                    </div>
                    <div class="layer-property">
                        <span>Color:</span>
                        <input type="color" value="${layer.color}" data-prop="color">
                    </div>
                ` : ''}
                ${layer.type === 'logo' ? `
                    <div class="layer-property">
                        <span>Color:</span>
                        <input type="color" value="${layer.color || '#ffffff'}" data-prop="color">
                    </div>
                ` : ''}
            </div>
        `;
        
        this.setupLayerElementEvents(div, layer);
        return div;
    }
    
    setupLayerElementEvents(element, layer) {
        let clickTimeout = null;
        
        element.addEventListener('click', (e) => {
            // If clicking on the layer name span, handle differently
            if (e.target.classList.contains('layer-name')) {
                // Delay the selection to allow for double-click detection
                clearTimeout(clickTimeout);
                clickTimeout = setTimeout(() => {
                    if (this.onLayerControl) {
                        this.onLayerControl('select', layer);
                    }
                }, 300);
                return;
            }
            
            // Immediate selection for other areas
            if (this.onLayerControl) {
                this.onLayerControl('select', layer);
            }
        });
        
        // Add double-click rename functionality for layer name
        const layerNameSpan = element.querySelector('.layer-name');
        layerNameSpan.addEventListener('dblclick', (e) => {
            console.log('🏷️ Double-click event fired on:', layer.name);
            e.stopPropagation();
            e.preventDefault();
            
            // Cancel the delayed click selection
            clearTimeout(clickTimeout);
            
            if (layer.locked) {
                console.log('🏷️ Layer is locked, cannot rename');
                return;
            }
            
            console.log('🏷️ Starting rename edit');
            this.startLayerNameEdit(layerNameSpan, layer);
        });
        
        element.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                if (layer.locked) {
                    e.preventDefault();
                    return;
                }
                
                const prop = e.target.dataset.prop;
                let value = e.target.value;
                
                if (this.onLayerPropertyChange) {
                    this.onLayerPropertyChange(layer, prop, value);
                }
            });
            
            // Special handling for color inputs
            if (input.type === 'color' && input.dataset.prop === 'color') {
                input.addEventListener('click', (e) => {
                    if (layer.locked) {
                        e.preventDefault();
                        return;
                    }
                    
                    // Prevent the default color picker and show our custom one
                    e.preventDefault();
                    this.showLayerColorPicker(input);
                });
            }
            
            if (layer.locked) {
                input.disabled = true;
            }
        });
        
        element.querySelector('.lock').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onLayerControl) {
                this.onLayerControl('lock', layer);
            }
        });
        
        element.querySelector('.delete-x').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onLayerControl) {
                this.onLayerControl('delete', layer);
            }
        });
    }
    
    startLayerNameEdit(layerNameSpan, layer) {
        const currentName = layerNameSpan.textContent;
        
        // Store original span content and styling
        const originalContent = layerNameSpan.innerHTML;
        const originalStyles = layerNameSpan.style.cssText;
        
        // Create input element and replace span content
        layerNameSpan.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.style.cssText = `
            background: #666;
            color: white;
            border: 1px solid #888;
            border-radius: 2px;
            padding: 1px 4px;
            font-size: 12px;
            font-weight: 500;
            width: 100%;
            outline: none;
            box-sizing: border-box;
        `;
        
        // Add input to span
        layerNameSpan.appendChild(input);
        
        // Focus and select text
        setTimeout(() => {
            input.focus();
            input.select();
        }, 0);
        
        // Save function
        const saveEdit = () => {
            const newName = input.value.trim();
            
            if (newName && newName !== currentName) {
                // Update the layer name and restore span
                layerNameSpan.innerHTML = newName;
                layerNameSpan.style.cssText = originalStyles;
                
                if (this.onLayerPropertyChange) {
                    this.onLayerPropertyChange(layer, 'name', newName);
                }
            } else {
                // Restore original content
                layerNameSpan.innerHTML = originalContent;
                layerNameSpan.style.cssText = originalStyles;
            }
        };
        
        // Cancel function
        const cancelEdit = () => {
            layerNameSpan.innerHTML = originalContent;
            layerNameSpan.style.cssText = originalStyles;
        };
        
        // Event handlers
        input.addEventListener('blur', () => {
            // Use setTimeout to avoid DOM manipulation conflicts
            setTimeout(saveEdit, 0);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Remove blur listener to prevent double execution
                input.removeEventListener('blur', saveEdit);
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // Remove blur listener to prevent double execution
                input.removeEventListener('blur', saveEdit);
                cancelEdit();
            }
        });
    }
    
    updateScaleSlider(selectedLayer) {
        if (selectedLayer) {
            this.showScaleSlider();
            this.elements.scaleSlider.value = selectedLayer.scale;
            this.elements.scaleValue.textContent = selectedLayer.scale.toFixed(1);
            this.elements.scaleSlider.disabled = selectedLayer.locked;
            
            // Update rotation slider
            this.elements.rotateSlider.value = selectedLayer.rotation || 0;
            this.elements.rotateValue.textContent = (selectedLayer.rotation || 0) + '°';
            this.elements.rotateSlider.disabled = selectedLayer.locked;
            
            // Update flip checkbox
            this.elements.flipHorizontalCheckbox.checked = selectedLayer.flippedHorizontally || false;
            this.elements.flipHorizontalCheckbox.disabled = selectedLayer.locked;
            
            // Show/hide color palette based on layer color property
            if (selectedLayer.color !== undefined) {
                this.showColorPalette();
                this.updateColorDisplay(selectedLayer.color);
                // Disable color palette if layer is locked
                this.setColorPaletteDisabled(selectedLayer.locked);
            } else {
                this.hideColorPalette();
            }
        } else {
            this.hideScaleSlider();
            this.hideColorPalette();
        }
    }
    
    showScaleSlider() {
        this.elements.scaleSliderOverlay.style.display = 'block';
    }
    
    hideScaleSlider() {
        this.elements.scaleSliderOverlay.style.display = 'none';
    }
    
    showFovSlider() {
        this.elements.fovSliderOverlay.style.display = 'block';
    }
    
    hideFovSlider() {
        this.elements.fovSliderOverlay.style.display = 'none';
    }
    
    toggleFovSlider() {
        if (this.elements.fovSliderOverlay.style.display === 'none') {
            this.showFovSlider();
        } else {
            this.hideFovSlider();
        }
    }
    
    updateFovSlider(fov) {
        this.elements.fovSlider.value = fov;
        this.elements.fovValue.textContent = fov + '°';
    }
    
    showColorPalette() {
        this.elements.colorPaletteContainer.style.display = 'block';
    }
    
    hideColorPalette() {
        this.elements.colorPaletteContainer.style.display = 'none';
    }
    
    setColorPaletteDisabled(disabled) {
        const container = this.elements.colorPaletteContainer;
        
        if (disabled) {
            container.classList.add('disabled');
        } else {
            container.classList.remove('disabled');
        }
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Get 3D viewer container for positioning
        const threeContainer = document.getElementById('three-container');
        const containerRect = threeContainer ? threeContainer.getBoundingClientRect() : null;
        
        // Calculate centered position on 3D viewer
        let positionStyles = '';
        if (containerRect) {
            const centerX = containerRect.left + containerRect.width / 2;
            const centerY = containerRect.top + containerRect.height / 2;
            positionStyles = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                transform: translate(-50%, -50%);
            `;
        } else {
            // Fallback to screen center if container not found
            positionStyles = `
                position: fixed;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            `;
        }
        
        notification.style.cssText = `
            ${positionStyles}
            max-width: 400px;
            min-width: 300px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4CAF50'};
            color: white;
            padding: 20px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            z-index: 1001;
            font-family: Arial, sans-serif;
            font-size: 15px;
            line-height: 1.5;
            white-space: pre-line;
            text-align: center;
            animation: scaleIn 0.3s ease;
        `;
        
        this.addNotificationStyles();
        
        notification.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 12px;
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'none';
        closeBtn.onclick = () => this.hideNotification(notification);
        notification.appendChild(closeBtn);
        
        document.body.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => this.hideNotification(notification), duration);
        }
        
        return notification;
    }
    
    showErrorModal(title, message) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            min-width: 400px;
            text-align: center;
            animation: slideIn 0.3s ease;
        `;

        this.addModalStyles();

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.cssText = `
            margin: 0 0 20px 0;
            color: #d32f2f;
            font-size: 20px;
            font-weight: bold;
        `;

        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.cssText = `
            margin: 0 0 30px 0;
            color: #333;
            font-size: 16px;
            line-height: 1.5;
            white-space: pre-line;
        `;

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: #d32f2f;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s;
        `;

        okButton.onmouseover = () => okButton.style.background = '#b71c1c';
        okButton.onmouseout = () => okButton.style.background = '#d32f2f';
        okButton.onclick = () => {
            document.body.removeChild(overlay);
        };

        modal.appendChild(titleElement);
        modal.appendChild(messageElement);
        modal.appendChild(okButton);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);
        okButton.focus();

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        return overlay;
    }
    
    showConfirmationDialog(title, message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            min-width: 400px;
            text-align: center;
            animation: slideIn 0.3s ease;
        `;

        this.addModalStyles();

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.cssText = `
            margin: 0 0 20px 0;
            color: #ff6b35;
            font-size: 20px;
            font-weight: bold;
        `;

        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.cssText = `
            margin: 0 0 30px 0;
            color: #333;
            font-size: 16px;
            line-height: 1.5;
            white-space: pre-line;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
        `;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #6c757d;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s;
        `;

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Delete';
        confirmButton.style.cssText = `
            background: #dc3545;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s;
        `;

        const closeDialog = () => {
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        };

        cancelButton.onmouseover = () => cancelButton.style.background = '#5a6268';
        cancelButton.onmouseout = () => cancelButton.style.background = '#6c757d';
        cancelButton.onclick = () => {
            closeDialog();
            if (onCancel) onCancel();
        };

        confirmButton.onmouseover = () => confirmButton.style.background = '#c82333';
        confirmButton.onmouseout = () => confirmButton.style.background = '#dc3545';
        confirmButton.onclick = () => {
            closeDialog();
            if (onConfirm) onConfirm();
        };

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        modal.appendChild(titleElement);
        modal.appendChild(messageElement);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);
        confirmButton.focus();

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        return overlay;
    }
    
    showLoadingIndicator(message) {
        let indicator = document.getElementById('loading-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'loading-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 8px;
                z-index: 1000;
                font-family: Arial, sans-serif;
            `;
            document.body.appendChild(indicator);
        }
        indicator.textContent = message;
        indicator.style.display = 'block';
    }
    
    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'scaleOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    addNotificationStyles() {
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                @keyframes scaleIn {
                    from { 
                        transform: translate(-50%, -50%) scale(0.8); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translate(-50%, -50%) scale(1); 
                        opacity: 1; 
                    }
                }
                @keyframes scaleOut {
                    from { 
                        transform: translate(-50%, -50%) scale(1); 
                        opacity: 1; 
                    }
                    to { 
                        transform: translate(-50%, -50%) scale(0.8); 
                        opacity: 0; 
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    addModalStyles() {
        if (!document.querySelector('#modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setColors(primary, secondary) {
        this.elements.primaryColor.value = primary;
        this.elements.secondaryColor.value = secondary;
    }
    
    getColors() {
        return {
            primary: this.elements.primaryColor.value,
            secondary: this.elements.secondaryColor.value
        };
    }
    
    setupLayerColorPickerListeners() {
        // Close button handler
        if (this.elements.layerColorPickerCloseBtn) {
            this.elements.layerColorPickerCloseBtn.addEventListener('click', () => {
                this.hideLayerColorPicker();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.elements.layerColorPickerDropdown && this.elements.layerColorPickerDropdown.classList.contains('show')) {
                // Don't close if clicking on the current layer color input that opened this dropdown
                if (this.currentLayerColorInput && e.target === this.currentLayerColorInput) {
                    return;
                }
                // Don't close if clicking inside the dropdown
                if (!this.elements.layerColorPickerDropdown.contains(e.target)) {
                    this.hideLayerColorPicker();
                }
            }
        });
        
        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.layerColorPickerDropdown && this.elements.layerColorPickerDropdown.classList.contains('show')) {
                this.hideLayerColorPicker();
            }
        });
    }
    
    showLayerColorPicker(colorInput) {
        this.currentLayerColorInput = colorInput;
        
        // Ensure the layer color wheel picker is initialized
        if (!this.layerColorWheelPicker) {
            this.initializeLayerColorWheel();
        }
        
        // Set the color wheel to the current color
        if (this.layerColorWheelPicker) {
            this.layerColorWheelPicker.setColor(colorInput.value);
            // Ensure the color wheel is drawn and handles are positioned correctly
            this.layerColorWheelPicker.drawColorWheel();
            this.layerColorWheelPicker.updateHandlePosition();
            this.layerColorWheelPicker.updateBrightnessSlider();
        }
        
        // Position the dropdown near the color input
        const inputRect = colorInput.getBoundingClientRect();
        const dropdown = this.elements.layerColorPickerDropdown;
        
        if (dropdown) {
            dropdown.style.position = 'fixed';
            dropdown.style.zIndex = '1002';
            
            // Calculate dropdown dimensions (estimate)
            const dropdownWidth = 280; // Approximate width
            const dropdownHeight = 300; // Approximate height
            
            // Override the CSS width: 100% with a fixed width
            dropdown.style.width = dropdownWidth + 'px';
            dropdown.style.height = 'auto';
            
            // Try to position to the right first, but check if it fits
            let left = inputRect.right + 10;
            let top = inputRect.top;
            
            // If dropdown would go off-screen to the right, position it to the left
            if (left + dropdownWidth > window.innerWidth) {
                left = inputRect.left - dropdownWidth - 10;
            }
            
            // If dropdown would go off-screen to the left, center it horizontally
            if (left < 0) {
                left = (window.innerWidth - dropdownWidth) / 2;
            }
            
            // If dropdown would go off-screen vertically, adjust
            if (top + dropdownHeight > window.innerHeight) {
                top = window.innerHeight - dropdownHeight - 10;
            }
            
            // Ensure minimum top position
            if (top < 10) {
                top = 10;
            }
            
            dropdown.style.left = left + 'px';
            dropdown.style.top = top + 'px';
            
            dropdown.classList.add('show');
        }
    }
    
    hideLayerColorPicker() {
        if (this.elements.layerColorPickerDropdown) {
            this.elements.layerColorPickerDropdown.classList.remove('show');
        }
        this.currentLayerColorInput = null;
    }
}