/**
 * Unified Design System for st_configurator
 * Centralizes all design tokens, component styles, and utilities
 */

export class DesignSystem {
    static tokens = {
        // Color Palette
        colors: {
            // Primary Colors
            primary: '#4a90e2',
            primaryHover: '#357abd',
            primaryActive: '#2c5d8f',
            primaryLight: 'rgba(74, 144, 226, 0.1)',
            primaryBorder: 'rgba(74, 144, 226, 0.3)',
            
            // Secondary Colors
            secondary: '#27ae60',
            secondaryHover: '#219a52',
            secondaryActive: '#1e8449',
            
            // Accent Colors
            accent: '#e74c3c',
            accentHover: '#c0392b',
            accentActive: '#a93226',
            
            // Neutral Colors
            background: '#ffffff',
            backgroundDark: 'rgba(40, 44, 52, 0.95)',
            backgroundLight: 'rgba(255, 255, 255, 0.1)',
            surface: '#383838',
            surfaceHover: '#4a4a4a',
            border: 'rgba(74, 144, 226, 0.3)',
            borderHover: 'rgba(74, 144, 226, 0.5)',
            
            // Text Colors
            text: '#ffffff',
            textMuted: '#e1e8ed',
            textDark: '#333333',
            textError: '#e74c3c',
            textSuccess: '#27ae60',
            textWarning: '#ff9800'
        },
        
        // Typography
        typography: {
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontFamilyMono: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
            
            fontSize: {
                xs: '10px',
                sm: '12px',
                base: '14px',
                md: '16px',
                lg: '18px',
                xl: '20px',
                '2xl': '24px'
            },
            
            fontWeight: {
                normal: '400',
                medium: '500',
                semibold: '600',
                bold: '700'
            },
            
            lineHeight: {
                tight: '1.2',
                normal: '1.5',
                relaxed: '1.8'
            }
        },
        
        // Spacing Scale
        spacing: {
            xs: '4px',
            sm: '8px',
            md: '12px',
            lg: '16px',
            xl: '20px',
            '2xl': '24px',
            '3xl': '30px',
            '4xl': '40px'
        },
        
        // Border Radius
        borderRadius: {
            none: '0',
            sm: '6px',
            md: '10px',
            lg: '16px',
            xl: '20px',
            full: '50%'
        },
        
        // Shadows
        shadows: {
            none: 'none',
            sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
            md: '0 4px 8px rgba(0, 0, 0, 0.15)',
            lg: '0 8px 16px rgba(0, 0, 0, 0.2)',
            xl: '0 12px 24px rgba(0, 0, 0, 0.25)',
            glow: '0 4px 8px rgba(74, 144, 226, 0.4)',
            glowGreen: '0 4px 8px rgba(39, 174, 96, 0.4)',
            glowRed: '0 4px 8px rgba(231, 76, 60, 0.4)',
            inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
        },
        
        // Transitions
        transitions: {
            fast: '0.15s ease',
            normal: '0.2s ease',
            slow: '0.3s ease',
            spring: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        },
        
        // Z-Index Scale
        zIndex: {
            dropdown: 1000,
            sticky: 1010,
            modal: 1020,
            popover: 1030,
            tooltip: 1040,
            overlay: 1050
        }
    };
    
    // Component Variants
    static components = {
        button: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: this.tokens.borderRadius.md,
                fontSize: this.tokens.typography.fontSize.base,
                fontWeight: this.tokens.typography.fontWeight.semibold,
                fontFamily: this.tokens.typography.fontFamily,
                textTransform: 'none',
                letterSpacing: '0.025em',
                cursor: 'pointer',
                border: 'none',
                transition: `all ${this.tokens.transitions.normal}`,
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none',
                outline: 'none'
            },
            
            variants: {
                primary: {
                    background: `linear-gradient(135deg, ${this.tokens.colors.primary}, ${this.tokens.colors.primaryHover})`,
                    color: this.tokens.colors.text,
                    boxShadow: this.tokens.shadows.md,
                    
                    '&:hover': {
                        background: `linear-gradient(135deg, ${this.tokens.colors.primaryHover}, ${this.tokens.colors.primaryActive})`,
                        boxShadow: `${this.tokens.shadows.glow}, ${this.tokens.shadows.lg}`,
                        transform: 'translateY(-1px)'
                    },
                    
                    '&:active': {
                        transform: 'translateY(0) scale(0.98)',
                        boxShadow: this.tokens.shadows.sm
                    }
                },
                
                secondary: {
                    background: `linear-gradient(135deg, ${this.tokens.colors.secondary}, ${this.tokens.colors.secondaryHover})`,
                    color: this.tokens.colors.text,
                    boxShadow: this.tokens.shadows.md,
                    
                    '&:hover': {
                        background: `linear-gradient(135deg, ${this.tokens.colors.secondaryHover}, ${this.tokens.colors.secondaryActive})`,
                        boxShadow: `${this.tokens.shadows.glowGreen}, ${this.tokens.shadows.lg}`,
                        transform: 'translateY(-1px)'
                    }
                },
                
                accent: {
                    background: `linear-gradient(135deg, ${this.tokens.colors.accent}, ${this.tokens.colors.accentHover})`,
                    color: this.tokens.colors.text,
                    boxShadow: this.tokens.shadows.md,
                    
                    '&:hover': {
                        background: `linear-gradient(135deg, ${this.tokens.colors.accentHover}, ${this.tokens.colors.accentActive})`,
                        boxShadow: `${this.tokens.shadows.glowRed}, ${this.tokens.shadows.lg}`,
                        transform: 'translateY(-1px)'
                    }
                },
                
                ghost: {
                    background: 'transparent',
                    color: this.tokens.colors.text,
                    border: `1px solid ${this.tokens.colors.border}`,
                    
                    '&:hover': {
                        background: this.tokens.colors.backgroundLight,
                        borderColor: this.tokens.colors.borderHover
                    }
                }
            },
            
            sizes: {
                xs: {
                    padding: `${this.tokens.spacing.xs} ${this.tokens.spacing.sm}`,
                    fontSize: this.tokens.typography.fontSize.xs,
                    minHeight: '24px'
                },
                sm: {
                    padding: `${this.tokens.spacing.sm} ${this.tokens.spacing.md}`,
                    fontSize: this.tokens.typography.fontSize.sm,
                    minHeight: '32px'
                },
                md: {
                    padding: `${this.tokens.spacing.md} ${this.tokens.spacing.lg}`,
                    fontSize: this.tokens.typography.fontSize.base,
                    minHeight: '40px'
                },
                lg: {
                    padding: `${this.tokens.spacing.lg} ${this.tokens.spacing.xl}`,
                    fontSize: this.tokens.typography.fontSize.md,
                    minHeight: '48px'
                }
            }
        },
        
        input: {
            base: {
                background: this.tokens.colors.backgroundLight,
                border: `1px solid ${this.tokens.colors.border}`,
                borderRadius: this.tokens.borderRadius.sm,
                color: this.tokens.colors.text,
                fontSize: this.tokens.typography.fontSize.base,
                fontFamily: this.tokens.typography.fontFamily,
                padding: `${this.tokens.spacing.md} ${this.tokens.spacing.lg}`,
                transition: `all ${this.tokens.transitions.normal}`,
                outline: 'none',
                width: '100%',
                
                '&:focus': {
                    borderColor: this.tokens.colors.borderHover,
                    boxShadow: this.tokens.shadows.glow,
                    background: 'rgba(255, 255, 255, 0.15)'
                },
                
                '&:disabled': {
                    opacity: '0.6',
                    cursor: 'not-allowed',
                    background: 'rgba(255, 255, 255, 0.05)'
                }
            }
        },
        
        modal: {
            overlay: {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: this.tokens.zIndex.modal,
                backdropFilter: 'blur(5px)'
            },
            
            content: {
                background: this.tokens.colors.backgroundDark,
                border: `1px solid ${this.tokens.colors.border}`,
                borderRadius: this.tokens.borderRadius.lg,
                boxShadow: `${this.tokens.shadows.xl}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                backdropFilter: 'blur(10px)',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto'
            }
        },
        
        notification: {
            base: {
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '400px',
                minWidth: '300px',
                padding: `${this.tokens.spacing.xl} ${this.tokens.spacing['2xl']}`,
                borderRadius: this.tokens.borderRadius.md,
                boxShadow: this.tokens.shadows.xl,
                zIndex: this.tokens.zIndex.popover,
                fontFamily: this.tokens.typography.fontFamily,
                fontSize: this.tokens.typography.fontSize.base,
                lineHeight: this.tokens.typography.lineHeight.normal,
                whiteSpace: 'pre-line',
                textAlign: 'center',
                animation: 'notification-in 0.3s ease'
            },
            
            variants: {
                info: {
                    background: this.tokens.colors.primary,
                    color: this.tokens.colors.text
                },
                success: {
                    background: this.tokens.colors.secondary,
                    color: this.tokens.colors.text
                },
                warning: {
                    background: this.tokens.colors.textWarning,
                    color: this.tokens.colors.text
                },
                error: {
                    background: this.tokens.colors.accent,
                    color: this.tokens.colors.text
                }
            }
        }
    };
    
    // Utility Functions
    static applyStyles(element, styles) {
        if (!element) return;
        
        Object.entries(styles).forEach(([property, value]) => {
            // Convert camelCase to kebab-case for CSS properties
            const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            element.style.setProperty(cssProperty, value);
        });
    }
    
    static createComponent(element, component, variant = 'primary', size = 'md') {
        if (!element || !this.components[component]) return element;
        
        const componentDef = this.components[component];
        
        // Apply base styles
        if (componentDef.base) {
            this.applyStyles(element, componentDef.base);
        }
        
        // Apply variant styles
        if (componentDef.variants && componentDef.variants[variant]) {
            this.applyStyles(element, componentDef.variants[variant]);
        }
        
        // Apply size styles
        if (componentDef.sizes && componentDef.sizes[size]) {
            this.applyStyles(element, componentDef.sizes[size]);
        }
        
        return element;
    }
    
    static addAnimations() {
        if (document.querySelector('#design-system-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'design-system-animations';
        style.textContent = `
            @keyframes notification-in {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            @keyframes notification-out {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
            
            @keyframes ripple {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    static init() {
        this.addAnimations();
        console.log('🎨 Design System initialized');
    }
}

// Auto-initialize when loaded
DesignSystem.init();