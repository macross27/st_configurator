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
            scaleValue: document.getElementById('scale-value')
        };
        
        this.onColorChange = null;
        this.onAddText = null;
        this.onAddLogo = null;
        this.onExport = null;
        this.onImport = null;
        this.onLayerPropertyChange = null;
        this.onScaleChange = null;
        this.onLayerControl = null;
        
        this.setupEventListeners();
        this.hideScaleSlider();
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
                    <button class="layer-control-btn duplicate">Dup</button>
                    <button class="layer-control-btn delete">Del</button>
                </div>
            </div>
            <div class="layer-properties">
                <div class="layer-property">
                    <span>X:</span>
                    <input type="number" value="${layer.position.x.toFixed(2)}" step="0.01" data-prop="x">
                </div>
                <div class="layer-property">
                    <span>Y:</span>
                    <input type="number" value="${layer.position.y.toFixed(2)}" step="0.01" data-prop="y">
                </div>
                <div class="layer-property">
                    <span>Rotation:</span>
                    <input type="number" value="${layer.rotation}" step="1" data-prop="rotation">
                </div>
                <div class="layer-property">
                    <span>Scale:</span>
                    <input type="number" value="${layer.scale.toFixed(2)}" step="0.1" data-prop="scale">
                </div>
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
            </div>
        `;
        
        this.setupLayerElementEvents(div, layer);
        return div;
    }
    
    setupLayerElementEvents(element, layer) {
        element.addEventListener('click', () => {
            if (this.onLayerControl) {
                this.onLayerControl('select', layer);
            }
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
        
        element.querySelector('.duplicate').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onLayerControl) {
                this.onLayerControl('duplicate', layer);
            }
        });
        
        element.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onLayerControl) {
                this.onLayerControl('delete', layer);
            }
        });
    }
    
    updateScaleSlider(selectedLayer) {
        if (selectedLayer) {
            this.showScaleSlider();
            this.elements.scaleSlider.value = selectedLayer.scale;
            this.elements.scaleValue.textContent = selectedLayer.scale.toFixed(1);
            this.elements.scaleSlider.disabled = selectedLayer.locked;
        } else {
            this.hideScaleSlider();
        }
    }
    
    showScaleSlider() {
        this.elements.scaleSliderOverlay.style.display = 'block';
    }
    
    hideScaleSlider() {
        this.elements.scaleSliderOverlay.style.display = 'none';
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
}