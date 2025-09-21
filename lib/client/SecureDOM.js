import DOMPurify from 'dompurify';

/**
 * SecureDOM - Utility class for safe DOM manipulation to prevent XSS attacks
 * Replaces all unsafe innerHTML usage with secure alternatives
 */
export class SecureDOM {
    /**
     * Safely set text content (auto-escaped, prevents XSS)
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text to set (will be escaped)
     */
    static setText(element, text) {
        if (!element) return;
        element.textContent = String(text || ''); // Auto-escaped by browser
    }

    /**
     * Safely set HTML content with DOMPurify sanitization
     * @param {HTMLElement} element - Target element
     * @param {string} html - HTML to set (will be sanitized)
     * @param {Object} options - DOMPurify configuration options
     */
    static setHTML(element, html, options = {}) {
        if (!element) return;

        const defaultOptions = {
            ALLOWED_TAGS: ['span', 'div', 'p', 'strong', 'em', 'br', 'i', 'b'],
            ALLOWED_ATTR: ['class', 'id', 'style'],
            FORBID_SCRIPT: true,
            FORBID_TAGS: ['script', 'object', 'embed', 'link', 'meta'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
        };

        const config = { ...defaultOptions, ...options };
        const sanitizedHTML = DOMPurify.sanitize(String(html || ''), config);
        element.innerHTML = sanitizedHTML;
    }

    /**
     * Create element with safe text content
     * @param {string} tagName - HTML tag name
     * @param {string} textContent - Text content (will be escaped)
     * @param {Object} attributes - Element attributes
     * @returns {HTMLElement} Created element
     */
    static createElement(tagName, textContent = '', attributes = {}) {
        const element = document.createElement(tagName);

        if (textContent) {
            this.setText(element, textContent);
        }

        // Set attributes safely
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (this.isSafeAttribute(key)) {
                element.setAttribute(key, String(value));
            }
        });

        return element;
    }

    /**
     * Safely append text to element
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text to append (will be escaped)
     */
    static appendText(element, text) {
        if (!element) return;
        const textNode = document.createTextNode(String(text || ''));
        element.appendChild(textNode);
    }

    /**
     * Safely replace element content with new elements
     * @param {HTMLElement} element - Target element
     * @param {...HTMLElement} children - Child elements to append
     */
    static replaceContent(element, ...children) {
        if (!element) return;
        element.innerHTML = ''; // Clear existing content
        children.forEach(child => {
            if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }

    /**
     * Check if attribute name is safe to set
     * @param {string} attributeName - Attribute name to check
     * @returns {boolean} True if safe
     */
    static isSafeAttribute(attributeName) {
        const unsafeAttributes = [
            'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
            'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown', 'onkeyup',
            'onkeypress', 'onmousedown', 'onmouseup', 'onmousemove', 'onmouseout',
            'onmousein', 'oncontextmenu', 'ondrag', 'ondrop', 'onscroll'
        ];

        return !unsafeAttributes.includes(attributeName.toLowerCase());
    }

    /**
     * Sanitize user input for safe display
     * @param {string} input - User input to sanitize
     * @param {boolean} allowHTML - Whether to allow sanitized HTML (default: false)
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input, allowHTML = false) {
        if (!input) return '';

        if (allowHTML) {
            return DOMPurify.sanitize(String(input), {
                ALLOWED_TAGS: ['span', 'strong', 'em', 'br'],
                ALLOWED_ATTR: [],
                FORBID_SCRIPT: true
            });
        }

        // For non-HTML input, escape HTML entities
        return String(input)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    /**
     * Validate and sanitize file names
     * @param {string} fileName - File name to sanitize
     * @returns {string} Safe file name
     */
    static sanitizeFileName(fileName) {
        if (!fileName) return 'unnamed';

        return String(fileName)
            .replace(/[<>:"/\\|?*]/g, '_') // Replace unsafe characters
            .replace(/\.\./g, '__')        // Replace path traversal attempts
            .substring(0, 255)             // Limit length
            .trim();
    }

    /**
     * Create safe option element for select dropdown
     * @param {string} value - Option value
     * @param {string} text - Option display text
     * @param {boolean} selected - Whether option is selected
     * @returns {HTMLOptionElement} Safe option element
     */
    static createOption(value, text, selected = false) {
        const option = document.createElement('option');
        option.value = this.sanitizeInput(value);
        this.setText(option, text);
        option.selected = selected;
        return option;
    }
}

// Validate DOMPurify is available
if (typeof DOMPurify === 'undefined') {
    console.error('DOMPurify is required but not available. Install with: npm install dompurify');
}