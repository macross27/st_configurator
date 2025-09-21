/**
 * KeyboardManager - Comprehensive keyboard navigation for accessibility
 * Implements WCAG AA keyboard accessibility requirements
 */
export class KeyboardManager {
    constructor(layerManager, sceneManager, uiManager) {
        this.layerManager = layerManager;
        this.sceneManager = sceneManager;
        this.uiManager = uiManager;

        this.focusedElement = null;
        this.focusedLayerId = null;
        this.trapFocus = false;
        this.modalElement = null;

        this.setupKeyboardHandlers();
        this.setupFocusManagement();
        this.announceKeyboardControls();
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        document.addEventListener('focusin', (e) => this.handleFocusIn(e));
        document.addEventListener('focusout', (e) => this.handleFocusOut(e));
    }

    handleGlobalKeydown(e) {
        // Don't intercept if user is typing in input fields
        if (e.target.matches('input, textarea, select, [contenteditable]')) {
            return;
        }

        // Handle modal focus trapping
        if (this.trapFocus && this.modalElement) {
            this.handleModalKeydown(e);
            return;
        }

        // Global keyboard shortcuts
        switch(e.key) {
            case 'Delete':
            case 'Backspace':
                if (this.layerManager.getSelectedLayer()) {
                    e.preventDefault();
                    this.deleteSelectedLayer();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    this.moveLayerUp();
                } else {
                    this.navigateVertical(-1);
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    this.moveLayerDown();
                } else {
                    this.navigateVertical(1);
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                this.navigateHorizontal(-1);
                break;

            case 'ArrowRight':
                e.preventDefault();
                this.navigateHorizontal(1);
                break;

            case 'Escape':
                e.preventDefault();
                this.handleEscape();
                break;

            case 'Enter':
            case ' ':
                if (e.target.matches('button, [role="button"]')) {
                    e.preventDefault();
                    e.target.click();
                }
                break;

            case 'Tab':
                // Let browser handle tab navigation, but announce context
                setTimeout(() => this.announceCurrentContext(), 100);
                break;

            // 3D viewport controls
            case '=':
            case '+':
                if (document.activeElement === document.getElementById('three-container')) {
                    e.preventDefault();
                    this.zoom(1.1);
                }
                break;

            case '-':
            case '_':
                if (document.activeElement === document.getElementById('three-container')) {
                    e.preventDefault();
                    this.zoom(0.9);
                }
                break;

            // Layer selection shortcuts
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const layerIndex = parseInt(e.key) - 1;
                    this.selectLayerByIndex(layerIndex);
                }
                break;
        }
    }

    handleModalKeydown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.closeModal();
            return;
        }

        if (e.key === 'Tab') {
            this.trapFocusInModal(e);
        }
    }

    trapFocusInModal(e) {
        if (!this.modalElement) return;

        const focusableElements = this.modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    setupFocusManagement() {
        // Make 3D container focusable for keyboard interaction
        const threeContainer = document.getElementById('three-container');
        if (threeContainer) {
            threeContainer.addEventListener('keydown', (e) => this.handle3DKeydown(e));
            threeContainer.addEventListener('focus', () => {
                this.announce('3D viewport focused. Use arrow keys to rotate, plus/minus to zoom');
            });
        }

        // Setup color picker keyboard navigation
        this.setupColorPickerKeyboard();

        // Setup layer list keyboard navigation
        this.setupLayerListKeyboard();
    }

    handle3DKeydown(e) {
        const rotationSpeed = 0.1;

        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.sceneManager.rotateModel(rotationSpeed, 0);
                this.announce('Rotating up');
                break;

            case 'ArrowDown':
                e.preventDefault();
                this.sceneManager.rotateModel(-rotationSpeed, 0);
                this.announce('Rotating down');
                break;

            case 'ArrowLeft':
                e.preventDefault();
                this.sceneManager.rotateModel(0, -rotationSpeed);
                this.announce('Rotating left');
                break;

            case 'ArrowRight':
                e.preventDefault();
                this.sceneManager.rotateModel(0, rotationSpeed);
                this.announce('Rotating right');
                break;

            case '=':
            case '+':
                e.preventDefault();
                this.zoom(1.1);
                break;

            case '-':
            case '_':
                e.preventDefault();
                this.zoom(0.9);
                break;

            case 'r':
            case 'R':
                e.preventDefault();
                document.getElementById('reset-view-btn')?.click();
                this.announce('View reset to default');
                break;
        }
    }

    setupColorPickerKeyboard() {
        const colorWheels = document.querySelectorAll('[id*="color-wheel-canvas"]');
        colorWheels.forEach(canvas => {
            canvas.addEventListener('keydown', (e) => this.handleColorWheelKeydown(e, canvas));
        });

        const brightnessSliders = document.querySelectorAll('[id*="brightness-slider-track"]');
        brightnessSliders.forEach(slider => {
            slider.addEventListener('keydown', (e) => this.handleBrightnessKeydown(e, slider));
        });
    }

    handleColorWheelKeydown(e, canvas) {
        const step = e.shiftKey ? 10 : 1;
        let handled = false;

        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.adjustColorWheel(canvas, 0, -step);
                handled = true;
                break;

            case 'ArrowDown':
                e.preventDefault();
                this.adjustColorWheel(canvas, 0, step);
                handled = true;
                break;

            case 'ArrowLeft':
                e.preventDefault();
                this.adjustColorWheel(canvas, -step, 0);
                handled = true;
                break;

            case 'ArrowRight':
                e.preventDefault();
                this.adjustColorWheel(canvas, step, 0);
                handled = true;
                break;
        }

        if (handled) {
            this.announce('Color selection changed');
        }
    }

    handleBrightnessKeydown(e, slider) {
        const step = e.shiftKey ? 10 : 1;
        let handled = false;

        switch(e.key) {
            case 'ArrowUp':
            case 'ArrowRight':
                e.preventDefault();
                this.adjustBrightness(slider, step);
                handled = true;
                break;

            case 'ArrowDown':
            case 'ArrowLeft':
                e.preventDefault();
                this.adjustBrightness(slider, -step);
                handled = true;
                break;

            case 'Home':
                e.preventDefault();
                this.setBrightness(slider, 0);
                handled = true;
                break;

            case 'End':
                e.preventDefault();
                this.setBrightness(slider, 100);
                handled = true;
                break;
        }

        if (handled) {
            const value = slider.getAttribute('aria-valuenow');
            this.announce(`Brightness ${value}%`);
        }
    }

    setupLayerListKeyboard() {
        const layersList = document.getElementById('layers-list');
        if (layersList) {
            layersList.addEventListener('keydown', (e) => this.handleLayerListKeydown(e));
        }
    }

    handleLayerListKeydown(e) {
        const layers = Array.from(document.querySelectorAll('.layer-item'));
        const currentIndex = layers.findIndex(layer => layer.contains(document.activeElement));

        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    const prevLayer = layers[currentIndex - 1];
                    const focusable = prevLayer.querySelector('button, input, [tabindex="0"]');
                    focusable?.focus();
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < layers.length - 1) {
                    const nextLayer = layers[currentIndex + 1];
                    const focusable = nextLayer.querySelector('button, input, [tabindex="0"]');
                    focusable?.focus();
                }
                break;

            case 'Home':
                e.preventDefault();
                if (layers.length > 0) {
                    const firstLayer = layers[0];
                    const focusable = firstLayer.querySelector('button, input, [tabindex="0"]');
                    focusable?.focus();
                }
                break;

            case 'End':
                e.preventDefault();
                if (layers.length > 0) {
                    const lastLayer = layers[layers.length - 1];
                    const focusable = lastLayer.querySelector('button, input, [tabindex="0"]');
                    focusable?.focus();
                }
                break;
        }
    }

    // Layer management methods
    deleteSelectedLayer() {
        const selectedLayer = this.layerManager.getSelectedLayer();
        if (selectedLayer) {
            this.announce(`Deleting layer ${selectedLayer.name || 'unnamed'}`);
            this.layerManager.deleteLayer(selectedLayer.id);
        }
    }

    moveLayerUp() {
        const selectedLayer = this.layerManager.getSelectedLayer();
        if (selectedLayer) {
            this.layerManager.moveLayerUp(selectedLayer.id);
            this.announce('Layer moved up');
        }
    }

    moveLayerDown() {
        const selectedLayer = this.layerManager.getSelectedLayer();
        if (selectedLayer) {
            this.layerManager.moveLayerDown(selectedLayer.id);
            this.announce('Layer moved down');
        }
    }

    selectLayerByIndex(index) {
        const layers = this.layerManager.getAllLayers();
        if (layers[index]) {
            this.layerManager.selectLayer(layers[index].id);
            this.announce(`Selected layer ${index + 1}: ${layers[index].name || 'unnamed'}`);
        }
    }

    // Navigation methods
    navigateVertical(direction) {
        // Navigate through vertical elements
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);
        const newIndex = currentIndex + direction;

        if (newIndex >= 0 && newIndex < focusableElements.length) {
            focusableElements[newIndex].focus();
        }
    }

    navigateHorizontal(direction) {
        // Navigate through horizontal elements in current container
        const currentElement = document.activeElement;
        const container = currentElement.closest('.layers-header, .color-controls, .action-controls');

        if (container) {
            const siblings = container.querySelectorAll('button, input, select');
            const currentIndex = Array.from(siblings).indexOf(currentElement);
            const newIndex = currentIndex + direction;

            if (newIndex >= 0 && newIndex < siblings.length) {
                siblings[newIndex].focus();
            }
        }
    }

    handleEscape() {
        // Close any open dropdowns or modals
        const openDropdown = document.querySelector('.color-picker-dropdown[style*="block"]');
        if (openDropdown) {
            this.closeColorPicker();
            return;
        }

        const openModal = document.querySelector('.modal-overlay[style*="block"]');
        if (openModal) {
            this.closeModal();
            return;
        }

        // Clear layer selection
        this.layerManager.selectLayer(null);
        this.announce('Selection cleared');
    }

    // Focus management
    handleFocusIn(e) {
        this.focusedElement = e.target;

        // Update focus indicators
        document.querySelectorAll('.focus-visible').forEach(el => {
            el.classList.remove('focus-visible');
        });

        e.target.classList.add('focus-visible');
    }

    handleFocusOut(e) {
        if (e.target) {
            e.target.classList.remove('focus-visible');
        }
    }

    // Modal management
    openModal(modalElement) {
        this.modalElement = modalElement;
        this.trapFocus = true;

        // Focus first focusable element in modal
        const firstFocusable = modalElement.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (firstFocusable) {
            firstFocusable.focus();
        }

        this.announce('Modal dialog opened');
    }

    closeModal() {
        this.trapFocus = false;
        this.modalElement = null;

        // Return focus to element that opened modal
        if (this.focusedElement) {
            this.focusedElement.focus();
        }

        this.announce('Modal dialog closed');
    }

    closeColorPicker() {
        const dropdowns = document.querySelectorAll('.color-picker-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });

        this.announce('Color picker closed');
    }

    // 3D Controls
    zoom(factor) {
        if (this.sceneManager && this.sceneManager.camera) {
            this.sceneManager.camera.position.multiplyScalar(1 / factor);
            this.sceneManager.render();
            this.announce(factor > 1 ? 'Zoomed in' : 'Zoomed out');
        }
    }

    // Color picker controls
    adjustColorWheel(canvas, deltaX, deltaY) {
        // Implement color wheel adjustment logic
        // This would integrate with existing color picker functionality
        console.log('Adjusting color wheel:', deltaX, deltaY);
    }

    adjustBrightness(slider, delta) {
        const currentValue = parseInt(slider.getAttribute('aria-valuenow')) || 50;
        const newValue = Math.max(0, Math.min(100, currentValue + delta));

        slider.setAttribute('aria-valuenow', newValue);

        // Trigger brightness change event
        const changeEvent = new CustomEvent('brightnessChange', {
            detail: { value: newValue }
        });
        slider.dispatchEvent(changeEvent);
    }

    setBrightness(slider, value) {
        slider.setAttribute('aria-valuenow', value);

        const changeEvent = new CustomEvent('brightnessChange', {
            detail: { value: value }
        });
        slider.dispatchEvent(changeEvent);
    }

    // Screen reader announcements
    announce(message, priority = 'polite') {
        const announceElement = priority === 'assertive'
            ? document.getElementById('screen-reader-alerts')
            : document.getElementById('screen-reader-announcements');

        if (announceElement) {
            announceElement.textContent = message;

            // Clear after announcement
            setTimeout(() => {
                announceElement.textContent = '';
            }, 1000);
        }
    }

    announceCurrentContext() {
        const activeElement = document.activeElement;
        const context = this.getElementContext(activeElement);

        if (context) {
            this.announce(context);
        }
    }

    getElementContext(element) {
        if (!element) return null;

        // 3D viewport
        if (element.id === 'three-container') {
            return '3D uniform preview. Use arrow keys to rotate, plus/minus to zoom';
        }

        // Layer controls
        if (element.closest('.layers-section')) {
            return 'Layer controls section. Use arrow keys to navigate, Enter to activate';
        }

        // Color controls
        if (element.closest('.color-controls')) {
            return 'Color selection controls';
        }

        // Base texture
        if (element.closest('.base-texture-section')) {
            return 'Base texture configuration';
        }

        // Export section
        if (element.closest('.export-section')) {
            return 'Export and order actions';
        }

        return element.getAttribute('aria-label') || element.title || null;
    }

    announceKeyboardControls() {
        setTimeout(() => {
            this.announce(
                'Keyboard controls available: Arrow keys to navigate, Enter to activate, ' +
                'Delete to remove layers, Ctrl+Arrow to reorder layers, Tab to move between sections'
            );
        }, 2000);
    }

    // Public methods for integration
    setLayerManager(layerManager) {
        this.layerManager = layerManager;
    }

    setSceneManager(sceneManager) {
        this.sceneManager = sceneManager;
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    // Cleanup
    destroy() {
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        document.removeEventListener('focusin', this.handleFocusIn);
        document.removeEventListener('focusout', this.handleFocusOut);
    }
}