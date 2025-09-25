import { ColorWheelPicker } from './ColorWheelPicker.js';
import { DesignSystem } from './DesignSystem.js';
import { errorManager, ApplicationError } from './ErrorManager.js';
import { i18n } from './I18nManager.js';
import { SecureDOM } from './SecureDOM.js';
import { designTokens, theme } from '../../assets/design-tokens.js';

export class UIManager {
    constructor() {
        this.elements = {
            // Removed primary/secondary color inputs - now using pattern color system
            addTextBtn: document.getElementById('add-text-btn'),
            addLogoBtn: document.getElementById('add-logo-btn'),
            submitBtn: document.getElementById('submit-btn'),
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
        this.onSubmit = null;
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
        // Primary/secondary color listeners removed - pattern system handles colors now

        if (this.elements.addTextBtn) {
            this.elements.addTextBtn.addEventListener('click', () => {
                if (this.onAddText) {
                    this.onAddText();
                }
            });
        }
        
        if (this.elements.addLogoBtn) {
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
        
        
        
        }

        if (this.elements.submitBtn) {
            this.elements.submitBtn.addEventListener('click', () => {
            if (this.onSubmit) {
                this.onSubmit();
            }
        });
        
        }

        if (this.elements.scaleSlider) {
            this.elements.scaleSlider.addEventListener('input', (e) => {
            const newScale = parseFloat(e.target.value);
            this.elements.scaleValue.textContent = newScale.toFixed(1);
            if (this.onScaleChange) {
                this.onScaleChange(newScale);
            }
        });
        
        }

        if (this.elements.rotateSlider) {
            this.elements.rotateSlider.addEventListener('input', (e) => {
            const newRotation = parseFloat(e.target.value);
            this.elements.rotateValue.textContent = newRotation + '°';
            if (this.onRotateChange) {
                this.onRotateChange(newRotation);
            }
        });
        
        }

        if (this.elements.flipHorizontalCheckbox) {
            this.elements.flipHorizontalCheckbox.addEventListener('change', (e) => {
            const isFlipped = e.target.checked;
            if (this.onFlipChange) {
                this.onFlipChange(isFlipped);
            }
        });
        
        }

        if (this.elements.fovSlider) {
            this.elements.fovSlider.addEventListener('input', (e) => {
            const newFov = parseFloat(e.target.value);
            this.elements.fovValue.textContent = newFov + '°';
            if (this.onFovChange) {
                this.onFovChange(newFov);
            }
        });
        
        }

        if (this.elements.resetViewBtn) {
            this.elements.resetViewBtn.addEventListener('click', () => {
                    if (this.onResetView) {
                    this.onResetView();
                }
            });
        }
        
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

                    // Update layer panel color input if there's a selected layer
                    const selectedLayerElement = this.elements.layersList.querySelector('.layer-item.selected');
                    if (selectedLayerElement) {
                        const colorInput = selectedLayerElement.querySelector('input[data-prop="color"]');
                        if (colorInput) {
                            colorInput.value = hexColor;
                            colorInput.style.backgroundColor = hexColor;
                        }
                    }

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
                        // Also sync with the 3D widget color picker
                        if (this.colorWheelPicker) {
                            this.colorWheelPicker.setColor(hexColor);
                        }
                        // Update the 3D widget color swatch
                        if (this.elements.currentColorSwatch) {
                            this.elements.currentColorSwatch.style.backgroundColor = hexColor;
                        }
                        // Also call the layer color change callback directly for immediate updates
                        if (this.onLayerColorChange) {
                            this.onLayerColorChange(hexColor);
                        }
                    }
                });
            } catch (error) {
                const uiError = new ApplicationError('colorPickerInitFailed', error, {
                    userMessage: i18n.t('errors.ui.colorPickerFailed'),
                    context: { component: 'LayerColorPicker' }
                });
                errorManager.handleError(uiError);
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
        // Get existing layer elements
        const existingElements = this.elements.layersList.querySelectorAll('.layer-item');
        const existingMap = new Map();
        
        // Map existing elements by layer ID
        existingElements.forEach(element => {
            const layerId = element.dataset.layerId;
            if (layerId) {
                existingMap.set(layerId, element);
            }
        });
        
        // Clear the list
        SecureDOM.replaceContent(this.elements.layersList);
        
        // Recreate layer elements, preserving input values where possible
        layers.forEach((layer, index) => {
            const existingElement = existingMap.get(layer.id);
            let layerElement;
            
            if (existingElement) {
                // Update existing element
                layerElement = this.updateExistingLayerElement(existingElement, layer, selectedLayer);
            } else {
                // Create new element
                layerElement = this.createLayerElement(layer, selectedLayer);
            }
            
            this.elements.layersList.appendChild(layerElement);
        });
    }
    
    updateExistingLayerElement(element, layer, selectedLayer) {
        // Preserve current input values before updating
        const inputValues = {};
        const inputs = element.querySelectorAll('input');
        inputs.forEach(input => {
            const prop = input.dataset.prop;
            if (prop) {
                inputValues[prop] = input.value;
            }
        });
        
        // Update element classes and content
        element.className = 'layer-item';
        element.dataset.layerId = layer.id;
        
        if (selectedLayer === layer) {
            element.classList.add('selected');
        }
        
        if (layer.locked) {
            element.classList.add('locked');
        }
        
        // Update the layer name and controls (these always need updating)
        const layerHeader = element.querySelector('.layer-header');
        if (layerHeader) {
            // Create secure layer header content
            const layerNameSpan = SecureDOM.createElement('span', layer.name, { class: 'layer-name' });
            const layerControls = SecureDOM.createElement('div', '', { class: 'layer-controls' });

            const lockBtn = SecureDOM.createElement('button', layer.locked ? '🔒' : '🔓', {
                class: 'layer-control-btn lock',
                title: layer.locked ? 'Unlock layer' : 'Lock layer'
            });
            const deleteBtn = SecureDOM.createElement('button', '×', {
                class: 'layer-control-btn delete-x',
                title: 'Delete layer'
            });

            layerControls.appendChild(lockBtn);
            layerControls.appendChild(deleteBtn);

            SecureDOM.replaceContent(layerHeader, layerNameSpan, layerControls);
        }
        
        // Update input states (disabled/enabled) and restore values
        const newInputs = element.querySelectorAll('input');
        newInputs.forEach(input => {
            const prop = input.dataset.prop;
            if (prop) {
                // Restore preserved value if available, otherwise use layer property
                if (inputValues[prop] !== undefined) {
                    input.value = inputValues[prop];
                } else {
                    input.value = layer[prop] || '';
                }
                
                // Update disabled state based on lock status
                input.disabled = layer.locked;
            }
        });
        
        // Re-setup event listeners
        this.setupLayerElementEvents(element, layer);
        
        return element;
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
        
        // Phase 4: Add visual indicator for layers with missing images
        if (layer.hasImageError) {
            div.classList.add('image-error');
        }
        
        // Create image error indicator safely
        const imageErrorIndicator = layer.hasImageError ?
            SecureDOM.createElement('span', '⚠️', {
                class: 'image-error-indicator',
                title: SecureDOM.sanitizeInput(layer.imageErrorReason || 'Image missing')
            }) : null;

        // Create layer header
        const layerHeader = SecureDOM.createElement('div', '', { class: 'layer-header' });
        const layerNameContainer = SecureDOM.createElement('span', '', { class: 'layer-name' });

        // Add layer name safely
        SecureDOM.setText(layerNameContainer, layer.name);
        if (imageErrorIndicator) {
            layerNameContainer.appendChild(imageErrorIndicator);
        }

        // Create layer controls
        const layerControls = SecureDOM.createElement('div', '', { class: 'layer-controls' });
        const lockBtn = SecureDOM.createElement('button', layer.locked ? '🔒' : '🔓', {
            class: 'layer-control-btn lock',
            title: layer.locked ? 'Unlock layer' : 'Lock layer'
        });
        const deleteBtn = SecureDOM.createElement('button', '×', {
            class: 'layer-control-btn delete-x',
            title: 'Delete layer'
        });

        layerControls.appendChild(lockBtn);
        layerControls.appendChild(deleteBtn);
        layerHeader.appendChild(layerNameContainer);
        layerHeader.appendChild(layerControls);

        // Create layer properties
        const layerProperties = SecureDOM.createElement('div', '', { class: 'layer-properties' });

        if (layer.type === 'text') {
            // Text layer properties
            const textProp = SecureDOM.createElement('div', '', { class: 'layer-property' });
            textProp.appendChild(SecureDOM.createElement('span', 'Text:'));
            const textInput = SecureDOM.createElement('input', '', {
                type: 'text',
                value: SecureDOM.sanitizeInput(layer.text),
                'data-prop': 'text'
            });
            textProp.appendChild(textInput);

            const sizeProp = SecureDOM.createElement('div', '', { class: 'layer-property' });
            sizeProp.appendChild(SecureDOM.createElement('span', 'Size:'));
            const sizeInput = SecureDOM.createElement('input', '', {
                type: 'number',
                value: SecureDOM.sanitizeInput(layer.fontSize),
                'data-prop': 'fontSize'
            });
            sizeProp.appendChild(sizeInput);

            const colorProp = SecureDOM.createElement('div', '', { class: 'layer-property' });
            colorProp.appendChild(SecureDOM.createElement('span', 'Color:'));
            const colorInput = SecureDOM.createElement('input', '', {
                type: 'color',
                value: SecureDOM.sanitizeInput(layer.color),
                'data-prop': 'color'
            });
            colorProp.appendChild(colorInput);

            layerProperties.appendChild(textProp);
            layerProperties.appendChild(sizeProp);
            layerProperties.appendChild(colorProp);
        } else if (layer.type === 'logo') {
            // Logo layer properties
            const colorProp = SecureDOM.createElement('div', '', { class: 'layer-property' });
            colorProp.appendChild(SecureDOM.createElement('span', 'Color:'));
            const colorInput = SecureDOM.createElement('input', '', {
                type: 'color',
                value: SecureDOM.sanitizeInput(layer.color || '#ffffff'),
                'data-prop': 'color'
            });
            colorProp.appendChild(colorInput);
            layerProperties.appendChild(colorProp);
        }

        div.appendChild(layerHeader);
        div.appendChild(layerProperties);
        
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
                const value = e.target.value;

                // If this is a color change, also update the 3D widget color picker
                if (prop === 'color' && this.colorWheelPicker) {
                    this.colorWheelPicker.setColor(value);
                    // Update the 3D widget color swatch
                    if (this.elements.currentColorSwatch) {
                        this.elements.currentColorSwatch.style.backgroundColor = value;
                    }
                }

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
        SecureDOM.replaceContent(layerNameSpan);
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.style.cssText = `
            background: ${theme.color('secondary.600')};
            color: ${theme.color('text.inverse')};
            border: 1px solid ${theme.color('secondary.500')};
            border-radius: ${theme.borderRadius('sm')};
            padding: ${theme.spacing('1')} ${theme.spacing('2')};
            font-size: ${theme.fontSize('xs')};
            font-weight: ${designTokens.typography.fontWeight.medium};
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
                SecureDOM.setText(layerNameSpan, newName);
                layerNameSpan.style.cssText = originalStyles;
                
                if (this.onLayerPropertyChange) {
                    this.onLayerPropertyChange(layer, 'name', newName);
                }
            } else {
                // Restore original content
                SecureDOM.setHTML(layerNameSpan, originalContent);
                layerNameSpan.style.cssText = originalStyles;
            }
        };
        
        // Cancel function
        const cancelEdit = () => {
            SecureDOM.setHTML(layerNameSpan, originalContent);
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
        
        // Apply Design System notification styles
        const notificationStyles = {
            ...DesignSystem.components.notification.base,
            ...DesignSystem.components.notification.variants[type]
        };
        
        DesignSystem.applyStyles(notification, notificationStyles);
        
        // Parse message for URLs and make them clickable
        this.setNotificationContent(notification, message);
        
        document.body.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => this.hideNotification(notification), duration);
        }
        
        return notification;
    }
    
    setNotificationContent(notification, message) {
        // Look for URLs in the message
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = message.split(urlRegex);
        
        // Clear existing content
        SecureDOM.replaceContent(notification);
        
        parts.forEach(part => {
            if (urlRegex.test(part)) {
                // This is a URL - make it clickable
                const urlSpan = SecureDOM.createElement('span', part);
                urlSpan.style.cssText = `
                    color: ${theme.color('warning.light')};
                    cursor: pointer;
                    text-decoration: underline;
                    font-weight: ${designTokens.typography.fontWeight.bold};
                `;
                
                urlSpan.onclick = async (e) => {
                    e.preventDefault();
                    try {
                        await navigator.clipboard.writeText(part);
                        // Show brief feedback
                        const originalText = urlSpan.textContent;
                        SecureDOM.setText(urlSpan, '✅ Copied!');
                        setTimeout(() => {
                            SecureDOM.setText(urlSpan, originalText);
                        }, 1500);
                    } catch (err) {
                        console.error('Failed to copy URL:', err);
                        // Fallback - select the text
                        const range = document.createRange();
                        range.selectNodeContents(urlSpan);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                };
                
                notification.appendChild(urlSpan);
            } else {
                // Regular text
                const textNode = document.createTextNode(part);
                notification.appendChild(textNode);
            }
        });
        
        // Re-add close button if it doesn't exist
        if (!notification.querySelector('button')) {
            const closeBtn = SecureDOM.createElement('button', '×', {
                title: '창 닫기'
            });
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
        }
    }
    
    showErrorModal(title, message) {
        const overlay = document.createElement('div');
        const modal = document.createElement('div');
        
        // Apply Design System modal styles
        DesignSystem.applyStyles(overlay, DesignSystem.components.modal.overlay);
        DesignSystem.applyStyles(modal, {
            ...DesignSystem.components.modal.content,
            background: '#ffffff',
            color: DesignSystem.tokens.colors.textDark,
            padding: DesignSystem.tokens.spacing['3xl'],
            textAlign: 'center',
            animation: 'slideIn 0.3s ease',
            maxWidth: '500px',
            minWidth: '400px'
        });

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        DesignSystem.applyStyles(titleElement, {
            margin: '0 0 20px 0',
            color: DesignSystem.tokens.colors.accent,
            fontSize: DesignSystem.tokens.typography.fontSize.xl,
            fontWeight: DesignSystem.tokens.typography.fontWeight.bold
        });

        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        DesignSystem.applyStyles(messageElement, {
            margin: '0 0 30px 0',
            color: DesignSystem.tokens.colors.textDark,
            fontSize: DesignSystem.tokens.typography.fontSize.md,
            lineHeight: DesignSystem.tokens.typography.lineHeight.normal,
            whiteSpace: 'pre-line'
        });

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        DesignSystem.createComponent(okButton, 'button', 'accent', 'md');
        okButton.style.width = 'auto';
        okButton.style.minWidth = '100px';

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
    
    // Submission Dialog Methods
    showSubmissionDialog() {
        // Remove any existing submission dialog
        this.hideSubmissionDialog();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'submission-dialog-overlay';
        overlay.className = 'submission-dialog-overlay';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'submission-dialog';
        
        // Create submission dialog content securely
        const dialogContent = SecureDOM.createElement('div', '', { class: 'submission-dialog-content' });
        const spinner = SecureDOM.createElement('div', '', { class: 'submission-spinner' });
        const title = SecureDOM.createElement('h3', '작업물 제출 중...', { class: 'submission-title' });
        const message = SecureDOM.createElement('p', '잠시만 기다려주세요. 작업물을 처리하고 있습니다.', { class: 'submission-message' });

        const progressContainer = SecureDOM.createElement('div', '', { class: 'submission-progress' });
        const progressBar = SecureDOM.createElement('div', '', { class: 'submission-progress-bar' });
        const progressFill = SecureDOM.createElement('div', '', { class: 'submission-progress-fill' });
        const progressText = SecureDOM.createElement('span', '처리중...', { class: 'submission-progress-text' });

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);

        dialogContent.appendChild(spinner);
        dialogContent.appendChild(title);
        dialogContent.appendChild(message);
        dialogContent.appendChild(progressContainer);

        SecureDOM.replaceContent(dialog, dialogContent);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Add animation
        requestAnimationFrame(() => {
            overlay.classList.add('show');
            dialog.classList.add('show');
        });
    }
    
    updateSubmissionDialog(message, progressPercent = null) {
        const dialog = document.querySelector('.submission-dialog');
        if (!dialog) return;
        
        const messageEl = dialog.querySelector('.submission-message');
        const progressText = dialog.querySelector('.submission-progress-text');
        const progressFill = dialog.querySelector('.submission-progress-fill');
        
        if (messageEl) SecureDOM.setText(messageEl, message);
        if (progressText) SecureDOM.setText(progressText, message);
        
        if (progressPercent !== null && progressFill) {
            progressFill.style.width = progressPercent + '%';
        }
    }
    
    hideSubmissionDialog() {
        const overlay = document.getElementById('submission-dialog-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }
    }
    
    showSubmissionSuccess(message, shareableUrl) {
        const dialog = document.querySelector('.submission-dialog');
        if (!dialog) return;
        
        const content = dialog.querySelector('.submission-dialog-content');
        if (!content) return;
        
        // Create success content securely
        const successIcon = SecureDOM.createElement('div', '✅', { class: 'submission-success-icon' });
        const successTitle = SecureDOM.createElement('h3', '제출 완료!', { class: 'submission-title success' });

        const successMessage = SecureDOM.createElement('div', '', { class: 'submission-message' });
        const successText = SecureDOM.createElement('p', '작업물이 성공적으로 제출되었습니다!');

        const urlContainer = SecureDOM.createElement('div', '', { class: 'url-container' });
        const urlLabel = SecureDOM.createElement('label', '공유 URL:');
        const clickableUrl = SecureDOM.createElement('div', SecureDOM.sanitizeInput(shareableUrl), {
            class: 'clickable-url',
            'data-url': SecureDOM.sanitizeInput(shareableUrl),
            title: '클릭하여 클립보드에 복사'
        });
        const urlInstruction = SecureDOM.createElement('small', '📋 URL을 클릭하면 클립보드에 복사됩니다.', {
            class: 'url-instruction'
        });

        urlContainer.appendChild(urlLabel);
        urlContainer.appendChild(clickableUrl);
        urlContainer.appendChild(urlInstruction);

        successMessage.appendChild(successText);
        successMessage.appendChild(urlContainer);

        const closeBtn = SecureDOM.createElement('button', '창닫기', {
            class: 'submission-close-btn',
            title: '창 닫기'
        });

        SecureDOM.replaceContent(content, successIcon, successTitle, successMessage, closeBtn);
        
        dialog.classList.add('success');
        
        // Add close button handler
        closeBtn.addEventListener('click', () => {
            this.hideSubmissionDialog();
        });
        
        // Add click handler for URL copying
        const urlElement = content.querySelector('.clickable-url');
        if (urlElement) {
            urlElement.addEventListener('click', async () => {
                const url = urlElement.getAttribute('data-url');
                try {
                    await navigator.clipboard.writeText(url);
                    
                    // Visual feedback
                    const originalContent = urlElement.textContent;
                    SecureDOM.setText(urlElement, '✅ 클립보드에 복사됨!');
                    urlElement.classList.add('copied');
                    
                    // Show notification
                    this.showNotification('URL이 클립보드에 복사되었습니다', 'success', 3000);
                    
                    // Auto-close after 1 second
                    setTimeout(() => {
                        this.hideSubmissionDialog();
                    }, 1000);
                    
                } catch (error) {
                    const clipboardError = new ApplicationError('clipboardCopyFailed', error, {
                        userMessage: i18n.t('errors.ui.clipboardCopyFailed'),
                        context: { operation: 'copyURL' }
                    });
                    errorManager.handleError(clipboardError);
                }
            });
        }
    }
    
    showSubmissionError(message) {
        const dialog = document.querySelector('.submission-dialog');
        if (!dialog) return;
        
        const content = dialog.querySelector('.submission-dialog-content');
        if (!content) return;
        
        // Create error content securely
        const errorIcon = SecureDOM.createElement('div', '❌', { class: 'submission-error-icon' });
        const errorTitle = SecureDOM.createElement('h3', '제출 실패', { class: 'submission-title error' });
        const errorMessage = SecureDOM.createElement('p', SecureDOM.sanitizeInput(message), { class: 'submission-message' });
        const retryBtn = SecureDOM.createElement('button', '확인', { class: 'submission-retry-btn' });

        // Add event listener instead of inline onclick
        retryBtn.addEventListener('click', () => {
            const overlay = document.querySelector('.submission-dialog-overlay');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });

        SecureDOM.replaceContent(content, errorIcon, errorTitle, errorMessage, retryBtn);
        
        dialog.classList.add('error');
    }
}