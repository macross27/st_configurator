/**
 * WCAG AA Accessibility Compliance Validator
 * Comprehensive testing suite for accessibility features
 */

class AccessibilityValidator {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.passed = [];
        this.colorContrastRatio = 4.5; // WCAG AA minimum
    }

    async validateAll() {
        console.log('🔍 Starting WCAG AA Compliance Validation...\n');

        // Structure and Semantics
        this.validateSemantic();
        this.validateHeadings();
        this.validateLandmarks();
        this.validateLists();

        // Keyboard Accessibility
        this.validateKeyboardNavigation();
        this.validateFocusManagement();
        this.validateTabOrder();

        // Visual and Color
        this.validateColorContrast();
        this.validateFocusIndicators();
        this.validateTouchTargets();

        // Screen Reader Support
        this.validateARIA();
        this.validateLabels();
        this.validateLiveRegions();

        // Form Accessibility
        this.validateForms();
        this.validateErrorHandling();

        // Media and Content
        this.validateImages();
        this.validateModals();

        // Generate report
        this.generateReport();
    }

    validateSemantic() {
        console.log('📋 Validating Semantic Structure...');

        // Check for proper document structure
        const main = document.querySelector('main');
        if (!main) {
            this.addIssue('Missing main landmark element');
        } else {
            this.addPassed('Main landmark present');
        }

        // Check for proper heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length === 0) {
            this.addIssue('No heading elements found');
        } else {
            this.addPassed(`${headings.length} heading elements found`);
        }

        // Check for skip link
        const skipLink = document.querySelector('.skip-link');
        if (!skipLink) {
            this.addIssue('Missing skip to main content link');
        } else {
            this.addPassed('Skip link present');
        }

        // Check for lang attribute
        const html = document.documentElement;
        if (!html.hasAttribute('lang')) {
            this.addIssue('Missing lang attribute on html element');
        } else {
            this.addPassed(`Language declared: ${html.getAttribute('lang')}`);
        }
    }

    validateHeadings() {
        console.log('📝 Validating Heading Structure...');

        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));

        if (headings.length === 0) {
            this.addIssue('No headings found');
            return;
        }

        // Check for h1
        const h1s = headings.filter(h => h.tagName === 'H1');
        if (h1s.length === 0) {
            this.addIssue('Missing h1 element');
        } else if (h1s.length > 1) {
            this.addWarning(`Multiple h1 elements found (${h1s.length})`);
        } else {
            this.addPassed('Single h1 element present');
        }

        // Check heading hierarchy
        let previousLevel = 0;
        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName[1]);

            if (index === 0 && level !== 1) {
                this.addWarning('First heading is not h1');
            }

            if (level - previousLevel > 1) {
                this.addWarning(`Heading level skipped: ${heading.tagName} after h${previousLevel}`);
            }

            previousLevel = level;
        });

        this.addPassed('Heading hierarchy validated');
    }

    validateLandmarks() {
        console.log('🗺️ Validating Landmark Elements...');

        const landmarks = [
            { selector: 'main', name: 'main' },
            { selector: '[role="main"]', name: 'main role' },
            { selector: 'aside', name: 'aside' },
            { selector: '[role="complementary"]', name: 'complementary role' },
            { selector: 'section', name: 'section' },
        ];

        landmarks.forEach(landmark => {
            const elements = document.querySelectorAll(landmark.selector);
            if (elements.length > 0) {
                this.addPassed(`${landmark.name} landmark present (${elements.length})`);
            }
        });

        // Check for landmark labels
        const labeledLandmarks = document.querySelectorAll('[aria-label], [aria-labelledby]');
        this.addPassed(`${labeledLandmarks.length} labeled landmarks found`);
    }

    validateLists() {
        console.log('📃 Validating List Structures...');

        const lists = document.querySelectorAll('ul, ol, dl');
        lists.forEach((list, index) => {
            const listItems = list.querySelectorAll('li, dt, dd');
            if (listItems.length === 0) {
                this.addWarning(`Empty list found: ${list.tagName}`);
            }
        });

        const roleList = document.querySelectorAll('[role="list"]');
        roleList.forEach(list => {
            const listItems = list.querySelectorAll('[role="listitem"]');
            if (listItems.length === 0) {
                this.addWarning('List role without listitem children');
            } else {
                this.addPassed(`List role with ${listItems.length} items`);
            }
        });
    }

    validateKeyboardNavigation() {
        console.log('⌨️ Validating Keyboard Navigation...');

        // Check for focusable elements
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) {
            this.addIssue('No focusable elements found');
            return;
        }

        this.addPassed(`${focusableElements.length} focusable elements found`);

        // Check for proper tabindex usage
        const positiveTabindex = document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
        if (positiveTabindex.length > 0) {
            this.addWarning(`${positiveTabindex.length} elements with positive tabindex (not recommended)`);
        }

        // Check for keyboard event handlers
        const keyboardElements = Array.from(focusableElements).filter(el => {
            return el.onkeydown || el.onkeyup || el.onkeypress ||
                   el.getAttribute('onkeydown') || el.getAttribute('onkeyup') || el.getAttribute('onkeypress');
        });

        if (keyboardElements.length > 0) {
            this.addPassed(`${keyboardElements.length} elements with keyboard handlers`);
        }
    }

    validateFocusManagement() {
        console.log('🎯 Validating Focus Management...');

        // Check for focus indicators in CSS
        const focusStyles = this.checkCSSRule(':focus');
        if (focusStyles) {
            this.addPassed('CSS focus styles found');
        } else {
            this.addIssue('No CSS focus styles found');
        }

        // Check for visible focus indicators
        const focusVisibleStyles = this.checkCSSRule('.focus-visible');
        if (focusVisibleStyles) {
            this.addPassed('Focus-visible styles found');
        }

        // Check for focus trap in modals
        const modals = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
        modals.forEach(modal => {
            const focusableInModal = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableInModal.length > 0) {
                this.addPassed(`Modal has ${focusableInModal.length} focusable elements`);
            } else {
                this.addWarning('Modal without focusable elements');
            }
        });
    }

    validateTabOrder() {
        console.log('🔄 Validating Tab Order...');

        const focusableElements = Array.from(document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));

        // Check for logical tab order
        const elementsWithTabindex = focusableElements.filter(el => el.hasAttribute('tabindex'));

        if (elementsWithTabindex.length > 0) {
            this.addPassed(`${elementsWithTabindex.length} elements with explicit tab order`);
        }

        // Check for elements that might break tab order
        const hiddenFocusable = focusableElements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display === 'none' || style.visibility === 'hidden';
        });

        if (hiddenFocusable.length > 0) {
            this.addWarning(`${hiddenFocusable.length} hidden focusable elements (may confuse users)`);
        }
    }

    validateColorContrast() {
        console.log('🎨 Validating Color Contrast...');

        const textElements = document.querySelectorAll('p, span, div, label, button, a, h1, h2, h3, h4, h5, h6');
        let contrastIssues = 0;
        let contrastPassed = 0;

        textElements.forEach(element => {
            const styles = window.getComputedStyle(element);
            const textColor = this.parseColor(styles.color);
            const bgColor = this.getBackgroundColor(element);

            if (textColor && bgColor) {
                const contrast = this.calculateContrast(textColor, bgColor);
                const fontSize = parseFloat(styles.fontSize);
                const fontWeight = styles.fontWeight;

                // Large text (18pt+ or 14pt+ bold) needs 3:1, normal text needs 4.5:1
                const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
                const requiredRatio = isLargeText ? 3.0 : 4.5;

                if (contrast < requiredRatio) {
                    contrastIssues++;
                    this.addIssue(`Low contrast (${contrast.toFixed(2)}:1, needs ${requiredRatio}:1): ${element.tagName.toLowerCase()}`);
                } else {
                    contrastPassed++;
                }
            }
        });

        if (contrastPassed > 0) {
            this.addPassed(`${contrastPassed} elements pass contrast requirements`);
        }

        if (contrastIssues === 0) {
            this.addPassed('All text elements meet WCAG AA contrast requirements');
        }
    }

    validateFocusIndicators() {
        console.log('👁️ Validating Focus Indicators...');

        // Test actual focus visibility
        const focusableElements = document.querySelectorAll('button, [href], input, select, textarea');

        if (focusableElements.length > 0) {
            const testElement = focusableElements[0];
            testElement.focus();

            const styles = window.getComputedStyle(testElement);
            const hasOutline = styles.outline !== 'none' && styles.outline !== '0px';
            const hasBoxShadow = styles.boxShadow !== 'none';
            const hasBorder = styles.borderWidth !== '0px';

            if (hasOutline || hasBoxShadow || hasBorder) {
                this.addPassed('Focus indicators are visible');
            } else {
                this.addIssue('Focus indicators may not be visible');
            }

            testElement.blur();
        }
    }

    validateTouchTargets() {
        console.log('👆 Validating Touch Targets...');

        const interactiveElements = document.querySelectorAll('button, [href], input, select, textarea, [role="button"]');
        let smallTargets = 0;
        let adequateTargets = 0;

        interactiveElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const minSize = 44; // WCAG AA minimum

            if (rect.width < minSize || rect.height < minSize) {
                smallTargets++;
                this.addWarning(`Small touch target (${Math.round(rect.width)}x${Math.round(rect.height)}px): ${element.tagName.toLowerCase()}`);
            } else {
                adequateTargets++;
            }
        });

        if (adequateTargets > 0) {
            this.addPassed(`${adequateTargets} elements meet minimum touch target size (44px)`);
        }

        if (smallTargets === 0) {
            this.addPassed('All interactive elements meet minimum touch target requirements');
        }
    }

    validateARIA() {
        console.log('🏷️ Validating ARIA Implementation...');

        // Check for ARIA labels
        const ariaLabeled = document.querySelectorAll('[aria-label], [aria-labelledby]');
        this.addPassed(`${ariaLabeled.length} elements with ARIA labels`);

        // Check for ARIA roles
        const ariaRoles = document.querySelectorAll('[role]');
        this.addPassed(`${ariaRoles.length} elements with ARIA roles`);

        // Check for ARIA live regions
        const liveRegions = document.querySelectorAll('[aria-live]');
        if (liveRegions.length > 0) {
            this.addPassed(`${liveRegions.length} ARIA live regions found`);
        } else {
            this.addWarning('No ARIA live regions found (may impact dynamic content announcements)');
        }

        // Check for proper ARIA usage
        const ariaDescribedBy = document.querySelectorAll('[aria-describedby]');
        ariaDescribedBy.forEach(element => {
            const describedById = element.getAttribute('aria-describedby');
            const describingElement = document.getElementById(describedById);
            if (!describingElement) {
                this.addIssue(`aria-describedby references non-existent element: ${describedById}`);
            }
        });

        // Check for ARIA expanded on interactive elements
        const expandableElements = document.querySelectorAll('[aria-expanded]');
        this.addPassed(`${expandableElements.length} elements with aria-expanded`);

        // Check for proper button roles
        const roleButtons = document.querySelectorAll('[role="button"]');
        roleButtons.forEach(button => {
            if (!button.hasAttribute('tabindex')) {
                this.addWarning('Element with button role missing tabindex');
            }
        });
    }

    validateLabels() {
        console.log('🏷️ Validating Form Labels...');

        const inputs = document.querySelectorAll('input, select, textarea');
        let labeledInputs = 0;
        let unlabeledInputs = 0;

        inputs.forEach(input => {
            const hasLabel = this.hasLabel(input);
            const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');

            if (hasLabel || hasAriaLabel) {
                labeledInputs++;
            } else {
                unlabeledInputs++;
                this.addIssue(`Unlabeled form control: ${input.tagName.toLowerCase()}${input.type ? `[${input.type}]` : ''}`);
            }
        });

        if (labeledInputs > 0) {
            this.addPassed(`${labeledInputs} form controls properly labeled`);
        }

        if (unlabeledInputs === 0 && inputs.length > 0) {
            this.addPassed('All form controls have labels');
        }
    }

    validateLiveRegions() {
        console.log('📢 Validating Live Regions...');

        const liveRegions = document.querySelectorAll('[aria-live]');

        if (liveRegions.length === 0) {
            this.addWarning('No ARIA live regions found');
            return;
        }

        liveRegions.forEach(region => {
            const liveValue = region.getAttribute('aria-live');
            if (!['polite', 'assertive', 'off'].includes(liveValue)) {
                this.addIssue(`Invalid aria-live value: ${liveValue}`);
            } else {
                this.addPassed(`Live region with ${liveValue} politeness`);
            }

            // Check for atomic attribute
            if (region.hasAttribute('aria-atomic')) {
                this.addPassed('Live region has aria-atomic attribute');
            }
        });

        // Check for screen reader announcement elements
        const announcements = document.getElementById('screen-reader-announcements');
        const alerts = document.getElementById('screen-reader-alerts');

        if (announcements) {
            this.addPassed('Screen reader announcements container found');
        } else {
            this.addWarning('Missing screen reader announcements container');
        }

        if (alerts) {
            this.addPassed('Screen reader alerts container found');
        } else {
            this.addWarning('Missing screen reader alerts container');
        }
    }

    validateForms() {
        console.log('📝 Validating Form Accessibility...');

        const forms = document.querySelectorAll('form');

        forms.forEach(form => {
            // Check for form labels
            const formLabels = form.querySelectorAll('label');
            const formInputs = form.querySelectorAll('input, select, textarea');

            if (formInputs.length > formLabels.length) {
                this.addWarning(`Form has more inputs (${formInputs.length}) than labels (${formLabels.length})`);
            }

            // Check for fieldsets and legends
            const fieldsets = form.querySelectorAll('fieldset');
            fieldsets.forEach(fieldset => {
                const legend = fieldset.querySelector('legend');
                if (!legend) {
                    this.addWarning('Fieldset without legend');
                } else {
                    this.addPassed('Fieldset with legend found');
                }
            });
        });

        // Check for error message containers
        const errorContainers = document.querySelectorAll('.error-message, [role="alert"]');
        if (errorContainers.length > 0) {
            this.addPassed(`${errorContainers.length} error message containers found`);
        }
    }

    validateErrorHandling() {
        console.log('❌ Validating Error Handling...');

        // Check for ARIA invalid attributes
        const invalidElements = document.querySelectorAll('[aria-invalid="true"]');
        if (invalidElements.length > 0) {
            this.addPassed(`${invalidElements.length} elements marked as invalid`);
        }

        // Check for error role
        const errorElements = document.querySelectorAll('[role="alert"]');
        if (errorElements.length > 0) {
            this.addPassed(`${errorElements.length} alert role elements found`);
        }

        // Check for describedby on form elements
        const describedElements = document.querySelectorAll('input[aria-describedby], select[aria-describedby], textarea[aria-describedby]');
        if (describedElements.length > 0) {
            this.addPassed(`${describedElements.length} form elements with descriptions`);
        }
    }

    validateImages() {
        console.log('🖼️ Validating Image Accessibility...');

        const images = document.querySelectorAll('img');
        let altTextFound = 0;
        let missingAlt = 0;

        images.forEach(img => {
            if (img.hasAttribute('alt')) {
                altTextFound++;
                if (img.getAttribute('alt').trim() === '') {
                    this.addPassed('Decorative image with empty alt attribute');
                } else {
                    this.addPassed('Image with descriptive alt text');
                }
            } else {
                missingAlt++;
                this.addIssue('Image missing alt attribute');
            }
        });

        // Check for canvas elements with labels
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const hasLabel = canvas.hasAttribute('aria-label') || canvas.hasAttribute('aria-labelledby');
            const hasRole = canvas.hasAttribute('role');

            if (hasLabel && hasRole) {
                this.addPassed('Canvas element properly labeled');
            } else {
                this.addWarning('Canvas element may need accessibility labels');
            }
        });

        if (missingAlt === 0 && images.length > 0) {
            this.addPassed('All images have alt attributes');
        }
    }

    validateModals() {
        console.log('📱 Validating Modal Accessibility...');

        const modals = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');

        modals.forEach(modal => {
            // Check for aria-modal
            if (!modal.hasAttribute('aria-modal')) {
                this.addWarning('Modal missing aria-modal attribute');
            } else {
                this.addPassed('Modal has aria-modal attribute');
            }

            // Check for aria-labelledby or aria-label
            const hasLabel = modal.hasAttribute('aria-label') || modal.hasAttribute('aria-labelledby');
            if (!hasLabel) {
                this.addWarning('Modal missing accessible name');
            } else {
                this.addPassed('Modal has accessible name');
            }

            // Check for close button
            const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="Close"], .close, .modal-close');
            if (!closeButton) {
                this.addWarning('Modal may be missing close button');
            } else {
                this.addPassed('Modal has close button');
            }
        });

        if (modals.length === 0) {
            this.addPassed('No modals found to validate');
        }
    }

    // Helper methods
    hasLabel(element) {
        const id = element.id;
        if (!id) return false;

        const label = document.querySelector(`label[for="${id}"]`);
        return !!label;
    }

    checkCSSRule(selector) {
        const styleSheets = Array.from(document.styleSheets);

        for (const sheet of styleSheets) {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                for (const rule of rules) {
                    if (rule.selectorText && rule.selectorText.includes(selector)) {
                        return true;
                    }
                }
            } catch (e) {
                // Skip stylesheets that can't be accessed
            }
        }
        return false;
    }

    parseColor(colorStr) {
        const div = document.createElement('div');
        div.style.color = colorStr;
        document.body.appendChild(div);
        const computedColor = window.getComputedStyle(div).color;
        document.body.removeChild(div);

        const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
    }

    getBackgroundColor(element) {
        let current = element;
        while (current && current !== document.body) {
            const bg = window.getComputedStyle(current).backgroundColor;
            if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                return this.parseColor(bg);
            }
            current = current.parentElement;
        }
        return [255, 255, 255]; // Default to white
    }

    calculateContrast(color1, color2) {
        const l1 = this.getLuminance(color1);
        const l2 = this.getLuminance(color2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    getLuminance([r, g, b]) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    addIssue(message) {
        this.issues.push(message);
        console.log(`❌ ISSUE: ${message}`);
    }

    addWarning(message) {
        this.warnings.push(message);
        console.log(`⚠️ WARNING: ${message}`);
    }

    addPassed(message) {
        this.passed.push(message);
        console.log(`✅ PASS: ${message}`);
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 WCAG AA ACCESSIBILITY COMPLIANCE REPORT');
        console.log('='.repeat(60));

        console.log(`\n✅ PASSED: ${this.passed.length} checks`);
        console.log(`⚠️ WARNINGS: ${this.warnings.length} items`);
        console.log(`❌ ISSUES: ${this.issues.length} problems`);

        const totalChecks = this.passed.length + this.warnings.length + this.issues.length;
        const complianceScore = totalChecks > 0 ? Math.round((this.passed.length / totalChecks) * 100) : 0;

        console.log(`\n📈 COMPLIANCE SCORE: ${complianceScore}%`);

        if (this.issues.length > 0) {
            console.log('\n❌ CRITICAL ISSUES (Must Fix):');
            this.issues.forEach(issue => console.log(`   • ${issue}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS (Should Fix):');
            this.warnings.forEach(warning => console.log(`   • ${warning}`));
        }

        console.log('\n✅ PASSED CHECKS:');
        this.passed.slice(0, 10).forEach(pass => console.log(`   • ${pass}`));
        if (this.passed.length > 10) {
            console.log(`   ... and ${this.passed.length - 10} more`);
        }

        // Overall assessment
        console.log('\n' + '='.repeat(60));
        if (this.issues.length === 0) {
            console.log('🎉 WCAG AA COMPLIANCE: ACHIEVED');
            console.log('All critical accessibility requirements met!');
        } else if (this.issues.length <= 2) {
            console.log('🔧 WCAG AA COMPLIANCE: NEARLY ACHIEVED');
            console.log('Minor issues remain to be fixed.');
        } else {
            console.log('⚠️ WCAG AA COMPLIANCE: NEEDS WORK');
            console.log('Multiple accessibility issues need attention.');
        }
        console.log('='.repeat(60));

        return {
            score: complianceScore,
            passed: this.passed.length,
            warnings: this.warnings.length,
            issues: this.issues.length,
            compliant: this.issues.length === 0
        };
    }
}

// Auto-run validation when script is loaded
if (typeof window !== 'undefined') {
    window.AccessibilityValidator = AccessibilityValidator;

    // Run validation after page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const validator = new AccessibilityValidator();
                validator.validateAll();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            const validator = new AccessibilityValidator();
            validator.validateAll();
        }, 1000);
    }
}

export default AccessibilityValidator;