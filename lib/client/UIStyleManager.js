import { DesignSystem } from './DesignSystem.js';

class UIStyleManager {
    constructor() {
        this.initializeStyles();
    }

    initializeStyles() {
        // Use centralized design system tokens
        this.tokens = DesignSystem.tokens;

        this.buttonVariants = {
            primary: {
                background: `linear-gradient(135deg, ${this.tokens.colors.primary}, ${this.tokens.colors.primaryHover})`,
                backgroundHover: `linear-gradient(135deg, ${this.tokens.colors.primaryHover}, #2c5d8f)`,
                color: this.tokens.colors.text,
                shadow: this.tokens.shadows.glow,
                glowColor: this.tokens.colors.primary
            },
            secondary: {
                background: `linear-gradient(135deg, ${this.tokens.colors.secondary}, ${this.tokens.colors.secondaryHover})`,
                backgroundHover: `linear-gradient(135deg, ${this.tokens.colors.secondaryHover}, #1e8449)`,
                color: this.tokens.colors.text,
                shadow: '0 4px 8px rgba(46, 204, 113, 0.4)',
                glowColor: this.tokens.colors.secondary
            },
            accent: {
                background: `linear-gradient(135deg, ${this.tokens.colors.accent}, ${this.tokens.colors.accentHover})`,
                backgroundHover: `linear-gradient(135deg, ${this.tokens.colors.accentHover}, #a93226)`,
                color: this.tokens.colors.text,
                shadow: '0 4px 8px rgba(231, 76, 60, 0.4)',
                glowColor: this.tokens.colors.accent
            }
        };
    }

    // Create unified button styles using Design System
    createButton(element, variant = 'primary', size = 'md') {
        if (!element) return;

        // Use Design System component creation
        DesignSystem.createComponent(element, 'button', variant, size);
        
        // Add width for existing compatibility
        element.style.width = '100%';
        
        // Add interactions
        this.addButtonInteractions(element, variant);
        this.addRippleEffect(element);

        return element;
    }

    applyStyles(element, styles) {
        Object.keys(styles).forEach(property => {
            element.style[property] = styles[property];
        });
    }

    addButtonInteractions(element, variant) {
        const colors = this.tokens.colors;
        const shadows = this.tokens.shadows;
        
        const variants = {
            primary: {
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryHover})`,
                backgroundHover: `linear-gradient(135deg, ${colors.primaryHover}, ${colors.primaryActive})`,
                shadow: shadows.glow
            },
            secondary: {
                background: `linear-gradient(135deg, ${colors.secondary}, ${colors.secondaryHover})`,
                backgroundHover: `linear-gradient(135deg, ${colors.secondaryHover}, ${colors.secondaryActive})`,
                shadow: shadows.glowGreen
            },
            accent: {
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentHover})`,
                backgroundHover: `linear-gradient(135deg, ${colors.accentHover}, ${colors.accentActive})`,
                shadow: shadows.glowRed
            }
        };
        
        const variantStyle = variants[variant] || variants.primary;
        
        element.addEventListener('mouseenter', () => {
            element.style.background = variantStyle.backgroundHover;
            element.style.boxShadow = `${variantStyle.shadow}, ${shadows.lg}`;
            element.style.transform = 'translateY(-1px)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.background = variantStyle.background;
            element.style.boxShadow = shadows.md;
            element.style.transform = 'translateY(0)';
        });

        element.addEventListener('mousedown', () => {
            element.style.transform = 'translateY(0) scale(0.98)';
            element.style.boxShadow = shadows.sm;
        });

        element.addEventListener('mouseup', () => {
            element.style.transform = 'translateY(-1px) scale(1)';
        });
    }

    addRippleEffect(element) {
        element.addEventListener('click', (e) => {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;

            // Add ripple animation keyframes if not already added
            if (!document.querySelector('#ripple-keyframes')) {
                const style = document.createElement('style');
                style.id = 'ripple-keyframes';
                style.textContent = `
                    @keyframes ripple {
                        to {
                            transform: scale(2);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            element.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.remove();
                }
            }, 600);
        });
    }

    // Apply unified styling to existing buttons
    unifyButtons() {
        // Style main action buttons
        const orderBtn = document.getElementById('order-btn');
        const submitBtn = document.getElementById('submit-btn');
        
        if (orderBtn) {
            this.createButton(orderBtn, 'secondary', 'normal');
        }
        
        if (submitBtn) {
            this.createButton(submitBtn, 'primary', 'normal');
        }

        // Style add layer buttons
        const addTextBtn = document.getElementById('add-text-btn');
        const addLogoBtn = document.getElementById('add-logo-btn');
        
        if (addTextBtn) {
            this.createButton(addTextBtn, 'primary', 'sm');
        }
        
        if (addLogoBtn) {
            this.createButton(addLogoBtn, 'primary', 'sm');
        }

        // Style other buttons that might be added dynamically
        this.observeNewButtons();
    }

    // Observe for dynamically added buttons
    observeNewButtons() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node is a button or contains buttons
                        const buttons = node.tagName === 'BUTTON' ? [node] : node.querySelectorAll ? node.querySelectorAll('button') : [];
                        
                        buttons.forEach((button) => {
                            // Only style buttons that don't already have our styling
                            if (!button.hasAttribute('data-ui-styled')) {
                                // Determine variant based on class or context
                                let variant = 'primary';
                                let size = 'normal';
                                
                                if (button.classList.contains('layer-delete-btn') || button.classList.contains('delete-btn')) {
                                    variant = 'accent';
                                    size = 'sm';
                                } else if (button.classList.contains('add-layer-btn')) {
                                    variant = 'primary';
                                    size = 'sm';
                                } else if (button.classList.contains('order-btn')) {
                                    variant = 'secondary';
                                }
                                
                                this.createButton(button, variant, size);
                                button.setAttribute('data-ui-styled', 'true');
                            }
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.buttonObserver = observer;
    }

    // Create consistent modal styling
    styleModal(modalElement) {
        if (!modalElement) return;

        this.applyStyles(modalElement, {
            background: this.tokens.colors.background,
            border: `1px solid ${this.tokens.colors.border}`,
            borderRadius: this.tokens.borderRadius.lg,
            backdropFilter: 'blur(10px)',
            boxShadow: `${this.tokens.shadows.lg}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
        });
    }

    // Create consistent input styling
    styleInput(inputElement) {
        if (!inputElement) return;

        this.applyStyles(inputElement, {
            background: 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${this.tokens.colors.border}`,
            borderRadius: this.tokens.borderRadius.sm,
            color: this.tokens.colors.text,
            padding: this.tokens.spacing.md,
            fontSize: '14px',
            transition: `border-color ${this.tokens.transitions.normal}`
        });

        inputElement.addEventListener('focus', () => {
            inputElement.style.borderColor = this.tokens.colors.borderHover;
            inputElement.style.boxShadow = this.tokens.shadows.glow;
        });

        inputElement.addEventListener('blur', () => {
            inputElement.style.borderColor = this.tokens.colors.border;
            inputElement.style.boxShadow = 'none';
        });
    }

    // Cleanup method
    cleanup() {
        if (this.buttonObserver) {
            this.buttonObserver.disconnect();
        }
    }
}

export default UIStyleManager;