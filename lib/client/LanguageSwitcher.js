/**
 * Language Switcher Component
 *
 * Provides a UI component for dynamic language switching between Korean and English.
 * Integrates with the I18nManager to provide seamless language changes.
 */

export class LanguageSwitcher {
    constructor(i18nManager, container = null) {
        this.i18n = i18nManager;
        this.container = container;
        this.element = null;
        this.isInitialized = false;

        // Bind methods
        this.handleLanguageChange = this.handleLanguageChange.bind(this);
        this.updateUI = this.updateUI.bind(this);
    }

    /**
     * Initialize the language switcher
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.createSwitcherElement();
            this.attachEventListeners();
            this.registerWithI18n();

            this.isInitialized = true;
            console.log('✅ LanguageSwitcher initialized');
        } catch (error) {
            console.error('❌ Failed to initialize LanguageSwitcher:', error);
        }
    }

    /**
     * Create the language switcher UI element
     */
    async createSwitcherElement() {
        // Create container if not provided
        if (!this.container) {
            this.container = document.body;
        }

        // Create switcher element
        this.element = document.createElement('div');
        this.element.className = 'language-switcher';
        this.element.setAttribute('role', 'group');
        this.element.setAttribute('aria-label', 'Language selection');

        // Create language buttons
        const languages = [
            { code: 'ko', name: '한국어', flag: '🇰🇷' },
            { code: 'en', name: 'English', flag: '🇺🇸' }
        ];

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'language-switcher-buttons';

        languages.forEach(lang => {
            const button = document.createElement('button');
            button.className = 'language-switcher-button';
            button.setAttribute('data-language', lang.code);
            button.setAttribute('type', 'button');
            button.setAttribute('aria-label', `Switch to ${lang.name}`);
            button.setAttribute('title', `Switch to ${lang.name}`);

            // Create button content
            const flagSpan = document.createElement('span');
            flagSpan.className = 'language-flag';
            flagSpan.textContent = lang.flag;
            flagSpan.setAttribute('aria-hidden', 'true');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'language-name';
            nameSpan.textContent = lang.name;

            button.appendChild(flagSpan);
            button.appendChild(nameSpan);

            // Set initial active state
            if (lang.code === this.i18n.getCurrentLanguage()) {
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.setAttribute('aria-pressed', 'false');
            }

            buttonContainer.appendChild(button);
        });

        this.element.appendChild(buttonContainer);

        // Add to container
        if (this.container === document.body) {
            // Position absolutely for body container
            this.element.style.position = 'fixed';
            this.element.style.top = '20px';
            this.element.style.right = '20px';
            this.element.style.zIndex = '1000';
        }

        this.container.appendChild(this.element);

        // Add CSS styles
        this.addStyles();
    }

    /**
     * Add CSS styles for the language switcher
     */
    addStyles() {
        if (document.getElementById('language-switcher-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'language-switcher-styles';
        styles.textContent = `
            .language-switcher {
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                padding: 8px;
                backdrop-filter: blur(4px);
                transition: all 0.2s ease;
            }

            .language-switcher:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .language-switcher-buttons {
                display: flex;
                gap: 4px;
            }

            .language-switcher-button {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                border: 1px solid transparent;
                border-radius: 6px;
                background: transparent;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
                font-weight: 500;
                color: #666;
                min-width: 80px;
                justify-content: center;
            }

            .language-switcher-button:hover {
                background: #f5f5f5;
                border-color: #ddd;
                color: #333;
            }

            .language-switcher-button:focus {
                outline: 2px solid #4A90E2;
                outline-offset: 2px;
                border-color: #4A90E2;
            }

            .language-switcher-button.active {
                background: #4A90E2;
                border-color: #4A90E2;
                color: white;
                font-weight: 600;
            }

            .language-switcher-button.active:hover {
                background: #357ABD;
            }

            .language-flag {
                font-size: 16px;
                line-height: 1;
            }

            .language-name {
                font-size: 12px;
                line-height: 1;
                white-space: nowrap;
            }

            /* Korean text styling */
            body.lang-ko .language-switcher-button[data-language="ko"] .language-name {
                font-family: 'Noto Sans KR', sans-serif;
                font-weight: 500;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .language-switcher {
                    position: fixed !important;
                    top: 10px !important;
                    right: 10px !important;
                    padding: 6px;
                }

                .language-switcher-button {
                    padding: 6px 8px;
                    min-width: 60px;
                }

                .language-name {
                    display: none;
                }

                .language-flag {
                    font-size: 18px;
                }
            }

            /* High contrast mode */
            @media (prefers-contrast: high) {
                .language-switcher {
                    background: white;
                    border: 2px solid black;
                }

                .language-switcher-button {
                    border: 1px solid #666;
                }

                .language-switcher-button.active {
                    background: black;
                    color: white;
                }
            }

            /* Animation for language switch */
            .language-switch-transition {
                transition: all 0.3s ease;
            }

            .language-switch-transition * {
                transition: all 0.3s ease;
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.element) return;

        // Add click handlers for language buttons
        this.element.addEventListener('click', (event) => {
            const button = event.target.closest('.language-switcher-button');
            if (!button) return;

            const languageCode = button.getAttribute('data-language');
            if (languageCode && languageCode !== this.i18n.getCurrentLanguage()) {
                this.switchLanguage(languageCode);
            }
        });

        // Add keyboard navigation
        this.element.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                this.handleArrowNavigation(event.key === 'ArrowRight');
            }
        });
    }

    /**
     * Handle arrow key navigation
     * @param {boolean} forward - True for right arrow, false for left arrow
     */
    handleArrowNavigation(forward) {
        const buttons = Array.from(this.element.querySelectorAll('.language-switcher-button'));
        const currentIndex = buttons.findIndex(btn => btn.classList.contains('active'));

        let nextIndex;
        if (forward) {
            nextIndex = (currentIndex + 1) % buttons.length;
        } else {
            nextIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
        }

        const nextButton = buttons[nextIndex];
        if (nextButton) {
            const languageCode = nextButton.getAttribute('data-language');
            this.switchLanguage(languageCode);
            nextButton.focus();
        }
    }

    /**
     * Switch to specified language
     * @param {string} languageCode - Language code to switch to
     */
    async switchLanguage(languageCode) {
        try {
            // Add transition class for smooth animation
            document.body.classList.add('language-switch-transition');

            // Switch language in i18n manager
            const success = await this.i18n.setLanguage(languageCode);

            if (success) {
                this.updateActiveButton(languageCode);

                // Announce language change to screen readers
                this.announceLanguageChange(languageCode);

                console.log(`✅ Language switched to: ${languageCode}`);
            } else {
                console.error(`❌ Failed to switch to language: ${languageCode}`);
            }

            // Remove transition class after animation
            setTimeout(() => {
                document.body.classList.remove('language-switch-transition');
            }, 300);

        } catch (error) {
            console.error('❌ Error switching language:', error);
        }
    }

    /**
     * Update active button state
     * @param {string} activeLanguageCode - Currently active language code
     */
    updateActiveButton(activeLanguageCode) {
        const buttons = this.element.querySelectorAll('.language-switcher-button');

        buttons.forEach(button => {
            const langCode = button.getAttribute('data-language');
            const isActive = langCode === activeLanguageCode;

            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive.toString());
        });
    }

    /**
     * Announce language change to screen readers
     * @param {string} languageCode - New language code
     */
    announceLanguageChange(languageCode) {
        const languageNames = {
            ko: '한국어',
            en: 'English'
        };

        const message = languageCode === 'ko'
            ? `언어가 ${languageNames[languageCode]}로 변경되었습니다.`
            : `Language changed to ${languageNames[languageCode]}.`;

        this.i18n.announceToScreenReader(message, 'polite');
    }

    /**
     * Register with i18n manager for language change notifications
     */
    registerWithI18n() {
        this.i18n.addLanguageChangeListener(this.handleLanguageChange);
    }

    /**
     * Handle language change from i18n manager
     * @param {string} newLanguage - New language code
     * @param {string} previousLanguage - Previous language code
     */
    handleLanguageChange(newLanguage, previousLanguage) {
        this.updateActiveButton(newLanguage);
        this.updateUI();
    }

    /**
     * Update UI elements based on current language
     */
    updateUI() {
        // Update aria labels based on current language
        const currentLang = this.i18n.getCurrentLanguage();

        if (currentLang === 'ko') {
            this.element.setAttribute('aria-label', '언어 선택');
        } else {
            this.element.setAttribute('aria-label', 'Language selection');
        }

        // Update button titles
        const buttons = this.element.querySelectorAll('.language-switcher-button');
        buttons.forEach(button => {
            const langCode = button.getAttribute('data-language');
            const langName = langCode === 'ko' ? '한국어' : 'English';

            if (currentLang === 'ko') {
                button.setAttribute('aria-label', `${langName}로 전환`);
                button.setAttribute('title', `${langName}로 전환`);
            } else {
                button.setAttribute('aria-label', `Switch to ${langName}`);
                button.setAttribute('title', `Switch to ${langName}`);
            }
        });
    }

    /**
     * Show the language switcher
     */
    show() {
        if (this.element) {
            this.element.style.display = 'block';
        }
    }

    /**
     * Hide the language switcher
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    /**
     * Get current language
     * @returns {string} - Current language code
     */
    getCurrentLanguage() {
        return this.i18n.getCurrentLanguage();
    }

    /**
     * Destroy the language switcher
     */
    destroy() {
        if (this.i18n) {
            this.i18n.removeLanguageChangeListener(this.handleLanguageChange);
        }

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        const styles = document.getElementById('language-switcher-styles');
        if (styles) {
            styles.remove();
        }

        this.element = null;
        this.container = null;
        this.isInitialized = false;
    }
}

export default LanguageSwitcher;