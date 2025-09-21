/**
 * I18n UI Updater
 *
 * Automatically updates UI elements with data-i18n attributes when language changes.
 * Handles text content, aria-labels, placeholders, and other attributes.
 */

export class I18nUIUpdater {
    constructor(i18nManager) {
        this.i18n = i18nManager;
        this.isInitialized = false;

        // Bind methods
        this.updateUI = this.updateUI.bind(this);
        this.handleLanguageChange = this.handleLanguageChange.bind(this);
    }

    /**
     * Initialize the UI updater
     */
    initialize() {
        if (this.isInitialized) return;

        // Register for language change events
        this.i18n.addLanguageChangeListener(this.handleLanguageChange);

        // Initial UI update
        this.updateUI();

        this.isInitialized = true;
        console.log('✅ I18nUIUpdater initialized');
    }

    /**
     * Handle language change event
     * @param {string} newLanguage - New language code
     * @param {string} previousLanguage - Previous language code
     */
    handleLanguageChange(newLanguage, previousLanguage) {
        console.log(`🌐 Updating UI from ${previousLanguage} to ${newLanguage}`);
        this.updateUI();
    }

    /**
     * Update all UI elements with i18n attributes
     */
    updateUI() {
        // Update elements with data-i18n attribute (text content)
        this.updateTextContent();

        // Update elements with data-i18n-aria attributes
        this.updateAriaLabels();

        // Update elements with data-i18n-placeholder attributes
        this.updatePlaceholders();

        // Update elements with data-i18n-title attributes
        this.updateTitles();

        // Update document title
        this.updateDocumentTitle();

        // Update special elements
        this.updateSpecialElements();

        console.log('✅ UI updated for language:', this.i18n.getCurrentLanguage());
    }

    /**
     * Update text content for elements with data-i18n attribute
     */
    updateTextContent() {
        const elements = document.querySelectorAll('[data-i18n]');

        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                const translatedText = this.i18n.t(key);
                element.textContent = translatedText;

                // Add Korean class for styling if current language is Korean
                if (this.i18n.getCurrentLanguage() === 'ko') {
                    element.classList.add('korean-text');
                } else {
                    element.classList.remove('korean-text');
                }
            }
        });
    }

    /**
     * Update aria-label attributes
     */
    updateAriaLabels() {
        const elements = document.querySelectorAll('[data-i18n-aria]');

        elements.forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            if (key) {
                const translatedText = this.i18n.t(key);
                element.setAttribute('aria-label', translatedText);
            }
        });
    }

    /**
     * Update placeholder attributes
     */
    updatePlaceholders() {
        const elements = document.querySelectorAll('[data-i18n-placeholder]');

        elements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                const translatedText = this.i18n.t(key);
                element.setAttribute('placeholder', translatedText);
            }
        });
    }

    /**
     * Update title attributes (tooltips)
     */
    updateTitles() {
        const elements = document.querySelectorAll('[data-i18n-title]');

        elements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (key) {
                const translatedText = this.i18n.t(key);
                element.setAttribute('title', translatedText);
            }
        });
    }

    /**
     * Update document title
     */
    updateDocumentTitle() {
        const titleElement = document.querySelector('title');
        if (titleElement) {
            const currentLang = this.i18n.getCurrentLanguage();
            const title = currentLang === 'ko' ? '유니폼 구성기' : 'Uniform Configurator';
            titleElement.textContent = title;
        }
    }

    /**
     * Update special elements that require custom handling
     */
    updateSpecialElements() {
        // Update scale slider label
        const scaleSlider = document.querySelector('#scale-slider');
        if (scaleSlider) {
            const label = scaleSlider.parentNode.querySelector('label[for="scale-slider"]');
            if (label) {
                label.textContent = this.i18n.t('controls.scale') + ':';
            }
        }

        // Update rotation slider label
        const rotateSlider = document.querySelector('#rotate-slider');
        if (rotateSlider) {
            const label = rotateSlider.parentNode.querySelector('label[for="rotate-slider"]');
            if (label) {
                label.textContent = this.i18n.t('controls.rotation') + ':';
            }
        }

        // Update flip horizontal checkbox
        const flipCheckbox = document.querySelector('#flip-horizontal-checkbox');
        if (flipCheckbox) {
            const span = flipCheckbox.parentNode.querySelector('.checkbox-text');
            if (span) {
                span.textContent = this.i18n.t('controls.flipHorizontal');
            }
        }

        // Update keyboard help
        this.updateKeyboardHelp();

        // Update order modal
        this.updateOrderModal();
    }

    /**
     * Update keyboard help section
     */
    updateKeyboardHelp() {
        const keyboardHelp = document.querySelector('#keyboard-help');
        if (!keyboardHelp) return;

        const title = keyboardHelp.querySelector('h4');
        if (title) {
            title.textContent = this.i18n.t('keyboard.title');
        }

        // Update keyboard shortcut descriptions
        const shortcuts = {
            'Tab': 'keyboard.tabNavigate',
            'Arrow keys': 'keyboard.arrowKeys',
            'Enter/Space': 'keyboard.enterSpace',
            'Delete': 'keyboard.deleteKey',
            'Ctrl+↑/↓': 'keyboard.reorderLayers',
            'Ctrl+1-9': 'keyboard.selectLayer',
            '+/-': 'keyboard.zoom',
            'Esc': 'keyboard.escape'
        };

        const listItems = keyboardHelp.querySelectorAll('li');
        listItems.forEach((item, index) => {
            const kbd = item.querySelector('kbd');
            if (kbd) {
                const shortcutKey = kbd.textContent;
                const translationKey = shortcuts[shortcutKey];
                if (translationKey) {
                    const description = this.i18n.t(translationKey);
                    item.innerHTML = `<kbd>${shortcutKey}</kbd> ${description}`;
                }
            }
        });
    }

    /**
     * Update order modal
     */
    updateOrderModal() {
        const modal = document.querySelector('#order-modal');
        if (!modal) return;

        const title = modal.querySelector('#order-modal-title');
        if (title) {
            title.textContent = this.i18n.t('order.title');
        }

        const closeBtn = modal.querySelector('#order-modal-close');
        if (closeBtn) {
            closeBtn.textContent = this.i18n.t('form.close');
        }
    }

    /**
     * Force update specific element
     * @param {HTMLElement} element - Element to update
     */
    updateElement(element) {
        if (!element) return;

        // Update text content
        const i18nKey = element.getAttribute('data-i18n');
        if (i18nKey) {
            element.textContent = this.i18n.t(i18nKey);
        }

        // Update aria-label
        const ariaKey = element.getAttribute('data-i18n-aria');
        if (ariaKey) {
            element.setAttribute('aria-label', this.i18n.t(ariaKey));
        }

        // Update placeholder
        const placeholderKey = element.getAttribute('data-i18n-placeholder');
        if (placeholderKey) {
            element.setAttribute('placeholder', this.i18n.t(placeholderKey));
        }

        // Update title
        const titleKey = element.getAttribute('data-i18n-title');
        if (titleKey) {
            element.setAttribute('title', this.i18n.t(titleKey));
        }

        // Add Korean styling if needed
        if (this.i18n.getCurrentLanguage() === 'ko' && i18nKey) {
            element.classList.add('korean-text');
        } else {
            element.classList.remove('korean-text');
        }
    }

    /**
     * Add i18n attributes to element
     * @param {HTMLElement} element - Element to add attributes to
     * @param {Object} attributes - Attributes to add
     */
    addI18nAttributes(element, attributes = {}) {
        if (!element) return;

        if (attributes.text) {
            element.setAttribute('data-i18n', attributes.text);
        }
        if (attributes.aria) {
            element.setAttribute('data-i18n-aria', attributes.aria);
        }
        if (attributes.placeholder) {
            element.setAttribute('data-i18n-placeholder', attributes.placeholder);
        }
        if (attributes.title) {
            element.setAttribute('data-i18n-title', attributes.title);
        }

        // Update immediately
        this.updateElement(element);
    }

    /**
     * Remove i18n attributes from element
     * @param {HTMLElement} element - Element to remove attributes from
     */
    removeI18nAttributes(element) {
        if (!element) return;

        element.removeAttribute('data-i18n');
        element.removeAttribute('data-i18n-aria');
        element.removeAttribute('data-i18n-placeholder');
        element.removeAttribute('data-i18n-title');
        element.classList.remove('korean-text');
    }

    /**
     * Get translation for key (convenience method)
     * @param {string} key - Translation key
     * @param {Object} params - Parameters for substitution
     * @returns {string} - Translated text
     */
    t(key, params = {}) {
        return this.i18n.t(key, params);
    }

    /**
     * Destroy the UI updater
     */
    destroy() {
        if (this.i18n) {
            this.i18n.removeLanguageChangeListener(this.handleLanguageChange);
        }

        this.isInitialized = false;
    }
}

export default I18nUIUpdater;