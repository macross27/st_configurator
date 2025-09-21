/**
 * Internationalization Manager
 *
 * Provides comprehensive multilingual support for the st_configurator application
 * with Korean as primary language and English as fallback.
 *
 * Features:
 * - Dynamic language switching
 * - Korean font optimization
 * - Accessibility support for Korean screen readers
 * - Persistent language preference storage
 * - Real-time UI updates
 */

export class I18nManager {
    constructor() {
        this.currentLanguage = 'ko'; // Default to Korean
        this.fallbackLanguage = 'en';
        this.languages = {};
        this.listeners = new Set();
        this.isInitialized = false;

        // Language preference storage key
        this.STORAGE_KEY = 'st_configurator_language';

        // Load saved language preference
        this.loadLanguagePreference();
    }

    /**
     * Initialize the i18n system
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Load language packs
            await this.loadLanguagePacks();

            // Set up Korean fonts
            this.setupKoreanFonts();

            // Set initial language
            await this.setLanguage(this.currentLanguage);

            this.isInitialized = true;
            console.log('✅ I18nManager initialized with language:', this.currentLanguage);
        } catch (error) {
            console.error('❌ Failed to initialize I18nManager:', error);
            // Fallback to English if Korean loading fails
            this.currentLanguage = 'en';
        }
    }

    /**
     * Load language packs dynamically
     */
    async loadLanguagePacks() {
        try {
            // Import Korean language pack
            const { default: koStrings } = await import('../i18n/ko.js');
            this.languages.ko = koStrings;

            // Import English language pack
            const { default: enStrings } = await import('../i18n/en.js');
            this.languages.en = enStrings;

            console.log('✅ Language packs loaded:', Object.keys(this.languages));
        } catch (error) {
            console.error('❌ Failed to load language packs:', error);
            throw error;
        }
    }

    /**
     * Setup Korean font support
     */
    setupKoreanFonts() {
        // Add Korean font CSS if not already present
        if (!document.getElementById('korean-fonts')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'korean-fonts';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap';
            document.head.appendChild(fontLink);

            // Add Korean typography styles
            const koreanStyles = document.createElement('style');
            koreanStyles.id = 'korean-typography';
            koreanStyles.textContent = `
                .korean-text {
                    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    letter-spacing: -0.02em;
                }

                .korean-title {
                    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-weight: 500;
                    line-height: 1.4;
                    letter-spacing: -0.03em;
                }

                .korean-button {
                    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                }

                /* Korean input fields */
                .korean-input {
                    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.5;
                }

                /* Body class for Korean layout */
                body.lang-ko {
                    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                body.lang-en {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* Mobile-responsive Korean typography */
                @media screen and (max-width: 768px) {
                    .korean-text {
                        font-size: 14px;
                        line-height: 1.7;
                        word-break: keep-all;
                        overflow-wrap: break-word;
                    }

                    .korean-title {
                        font-size: 16px;
                        line-height: 1.5;
                        word-break: keep-all;
                    }

                    .korean-button {
                        font-size: 13px;
                        line-height: 1.4;
                        padding: 12px 16px;
                        word-break: keep-all;
                    }

                    .korean-input {
                        font-size: 16px; /* Prevents zoom on iOS */
                        line-height: 1.6;
                        padding: 12px;
                    }

                    /* Layer names and UI text in Korean */
                    body.lang-ko .layer-name,
                    body.lang-ko .form-label,
                    body.lang-ko .section-title,
                    body.lang-ko .panel-header h3,
                    body.lang-ko .panel-header h4 {
                        word-break: keep-all;
                        line-height: 1.5;
                        font-weight: 500;
                    }

                    /* Korean modal content */
                    body.lang-ko .modal-title,
                    body.lang-ko .modal-body {
                        word-break: keep-all;
                        line-height: 1.6;
                    }
                }

                /* Touch device optimizations for Korean text */
                @media (pointer: coarse) {
                    body.lang-ko .layer-item {
                        line-height: 1.6;
                        word-break: keep-all;
                    }

                    body.lang-ko .add-layer-btn,
                    body.lang-ko .layer-control-btn {
                        font-size: 12px;
                        line-height: 1.4;
                        word-break: keep-all;
                    }

                    /* Better touch targets for Korean buttons */
                    body.lang-ko button,
                    body.lang-ko .btn-primary,
                    body.lang-ko .btn-secondary {
                        min-height: 48px;
                        padding: 12px 20px;
                        line-height: 1.4;
                        word-break: keep-all;
                    }
                }
            `;
            document.head.appendChild(koreanStyles);
        }
    }

    /**
     * Get localized string with parameter substitution
     * @param {string} key - The translation key
     * @param {Object} params - Parameters to substitute
     * @returns {string} - Localized string
     */
    t(key, params = {}) {
        const currentLangStrings = this.languages[this.currentLanguage];
        const fallbackLangStrings = this.languages[this.fallbackLanguage];

        // Try current language first
        let text = this.getNestedValue(currentLangStrings, key);

        // Fall back to fallback language if not found
        if (text === undefined && fallbackLangStrings) {
            text = this.getNestedValue(fallbackLangStrings, key);
            if (text !== undefined) {
                console.warn(`⚠️ Translation missing for "${key}" in ${this.currentLanguage}, using ${this.fallbackLanguage}`);
            }
        }

        // Fall back to key if no translation found
        if (text === undefined) {
            console.warn(`⚠️ Translation missing for "${key}" in both languages`);
            text = key;
        }

        // Substitute parameters
        return this.substituteParameters(text, params);
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} key - Dot-notated key
     * @returns {*} - Value or undefined
     */
    getNestedValue(obj, key) {
        if (!obj) return undefined;

        return key.split('.').reduce((current, prop) => {
            return current && current[prop] !== undefined ? current[prop] : undefined;
        }, obj);
    }

    /**
     * Substitute parameters in text
     * @param {string} text - Text with placeholders
     * @param {Object} params - Parameters to substitute
     * @returns {string} - Text with substituted parameters
     */
    substituteParameters(text, params) {
        if (typeof text !== 'string') return text;

        return Object.keys(params).reduce((result, param) => {
            const placeholder = new RegExp(`\\{${param}\\}`, 'g');
            return result.replace(placeholder, params[param]);
        }, text);
    }

    /**
     * Set current language
     * @param {string} languageCode - Language code ('ko' or 'en')
     */
    async setLanguage(languageCode) {
        if (!this.languages[languageCode]) {
            console.warn(`⚠️ Language pack not available for: ${languageCode}`);
            return false;
        }

        const previousLanguage = this.currentLanguage;
        this.currentLanguage = languageCode;

        // Update body class for CSS styling
        document.body.classList.remove(`lang-${previousLanguage}`);
        document.body.classList.add(`lang-${this.currentLanguage}`);

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;

        // Save preference
        this.saveLanguagePreference();

        // Notify listeners
        this.notifyLanguageChange(languageCode, previousLanguage);

        console.log(`✅ Language changed from ${previousLanguage} to ${languageCode}`);
        return true;
    }

    /**
     * Get current language
     * @returns {string} - Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get available languages
     * @returns {Array} - Array of available language codes
     */
    getAvailableLanguages() {
        return Object.keys(this.languages);
    }

    /**
     * Check if language is available
     * @param {string} languageCode - Language code to check
     * @returns {boolean} - True if available
     */
    isLanguageAvailable(languageCode) {
        return this.languages[languageCode] !== undefined;
    }

    /**
     * Add language change listener
     * @param {Function} callback - Callback function
     */
    addLanguageChangeListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove language change listener
     * @param {Function} callback - Callback function
     */
    removeLanguageChangeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of language change
     * @param {string} newLanguage - New language code
     * @param {string} previousLanguage - Previous language code
     */
    notifyLanguageChange(newLanguage, previousLanguage) {
        this.listeners.forEach(callback => {
            try {
                callback(newLanguage, previousLanguage);
            } catch (error) {
                console.error('❌ Error in language change listener:', error);
            }
        });
    }

    /**
     * Save language preference to localStorage
     */
    saveLanguagePreference() {
        try {
            localStorage.setItem(this.STORAGE_KEY, this.currentLanguage);
        } catch (error) {
            console.warn('⚠️ Failed to save language preference:', error);
        }
    }

    /**
     * Load language preference from localStorage
     */
    loadLanguagePreference() {
        // Always default to Korean - language switcher removed
        this.currentLanguage = 'ko';
    }

    /**
     * Format currency based on current language
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency
     */
    formatCurrency(amount) {
        if (this.currentLanguage === 'ko') {
            return `${amount.toLocaleString('ko-KR')}원`;
        } else {
            return `$${amount.toLocaleString('en-US')}`;
        }
    }

    /**
     * Format count with units based on current language
     * @param {number} count - Count to format
     * @param {string} unitType - Type of unit
     * @returns {string} - Formatted count
     */
    formatCount(count, unitType = 'items') {
        const unitKey = `units.${unitType}`;
        const unit = this.t(unitKey);

        if (this.currentLanguage === 'ko') {
            return `${count}${unit}`;
        } else {
            return `${count} ${unit}`;
        }
    }

    /**
     * Get direction for current language (for RTL support if needed)
     * @returns {string} - 'ltr' or 'rtl'
     */
    getDirection() {
        // Korean and English are both LTR
        return 'ltr';
    }

    /**
     * Update screen reader announcements with proper language
     * @param {string} message - Message to announce
     * @param {string} priority - 'polite' or 'assertive'
     */
    announceToScreenReader(message, priority = 'polite') {
        const announcement = this.t(message);
        const elementId = priority === 'assertive' ? 'screen-reader-alerts' : 'screen-reader-announcements';
        const element = document.getElementById(elementId);

        if (element) {
            // Set language attribute for screen readers
            element.lang = this.currentLanguage;
            element.textContent = announcement;

            // Clear after announcement
            setTimeout(() => {
                element.textContent = '';
            }, 1000);
        }
    }

    /**
     * Get language display name
     * @param {string} languageCode - Language code
     * @returns {string} - Display name
     */
    getLanguageDisplayName(languageCode) {
        const names = {
            ko: '한국어',
            en: 'English'
        };
        return names[languageCode] || languageCode;
    }

    /**
     * Destroy the i18n manager
     */
    destroy() {
        this.listeners.clear();
        this.languages = {};
        this.isInitialized = false;

        // Remove Korean fonts and styles
        const fontLink = document.getElementById('korean-fonts');
        const koreanStyles = document.getElementById('korean-typography');

        if (fontLink) fontLink.remove();
        if (koreanStyles) koreanStyles.remove();

        // Reset body classes
        document.body.classList.remove('lang-ko', 'lang-en');
    }
}

// Create singleton instance
export const i18n = new I18nManager();

// Export default
export default i18n;