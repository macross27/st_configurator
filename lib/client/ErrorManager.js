/**
 * Standardized Error Management System
 *
 * Provides comprehensive error handling with Korean i18n support,
 * user-friendly notifications, error recovery actions, and centralized logging.
 *
 * Features:
 * - Custom error classes with severity levels
 * - Korean/English error messages with i18n integration
 * - Centralized error logging and history
 * - User notification system with accessibility support
 * - Error recovery actions
 * - Global error handlers for unhandled errors
 */

import { i18n } from './I18nManager.js';

/**
 * Base application error class with i18n support
 */
export class ApplicationError extends Error {
    constructor(title, originalError = null, options = {}) {
        // Use localized message if available, otherwise use title
        const userMessage = options.userMessage || i18n.t(`errors.${title}`, { error: originalError?.message || '' }) || title;
        super(userMessage);

        this.name = 'ApplicationError';
        this.title = title;
        this.originalError = originalError;
        this.severity = options.severity || 'medium';
        this.userMessage = userMessage;
        this.actions = options.actions || [];
        this.context = options.context || {};
        this.timestamp = new Date();
        this.errorId = this.generateErrorId();
    }

    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    toJSON() {
        return {
            errorId: this.errorId,
            name: this.name,
            title: this.title,
            message: this.message,
            userMessage: this.userMessage,
            severity: this.severity,
            timestamp: this.timestamp,
            context: this.context,
            actions: this.actions,
            stack: this.stack,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : null
        };
    }
}

/**
 * Validation error for form and input validation
 */
export class ValidationError extends ApplicationError {
    constructor(title, field = null, originalError = null, options = {}) {
        super(title, originalError, {
            ...options,
            severity: 'low',
            userMessage: options.userMessage || i18n.t(`validation.${title}`) || title
        });
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Security-related errors
 */
export class SecurityError extends ApplicationError {
    constructor(title, originalError = null, options = {}) {
        super(title, originalError, {
            ...options,
            severity: 'high',
            userMessage: options.userMessage || i18n.t(`errors.security.${title}`) || title
        });
        this.name = 'SecurityError';
    }
}

/**
 * Network and API errors
 */
export class NetworkError extends ApplicationError {
    constructor(title, originalError = null, options = {}) {
        super(title, originalError, {
            ...options,
            severity: 'medium',
            userMessage: options.userMessage || i18n.t(`errors.network.${title}`) || title
        });
        this.name = 'NetworkError';
        this.statusCode = options.statusCode;
        this.endpoint = options.endpoint;
    }
}

/**
 * File processing errors
 */
export class FileProcessingError extends ApplicationError {
    constructor(title, fileName = null, originalError = null, options = {}) {
        super(title, originalError, {
            ...options,
            severity: 'medium',
            userMessage: options.userMessage || i18n.t(`errors.file.${title}`, { fileName }) || title
        });
        this.name = 'FileProcessingError';
        this.fileName = fileName;
        this.fileSize = options.fileSize;
        this.fileType = options.fileType;
    }
}

/**
 * Layer management errors
 */
export class LayerError extends ApplicationError {
    constructor(title, layerId = null, originalError = null, options = {}) {
        super(title, originalError, {
            ...options,
            severity: 'medium',
            userMessage: options.userMessage || i18n.t(`errors.layer.${title}`, { layerId }) || title
        });
        this.name = 'LayerError';
        this.layerId = layerId;
    }
}

/**
 * Main Error Manager class
 */
export class ErrorManager {
    constructor(eventBus = null) {
        this.eventBus = eventBus;
        this.errorHistory = [];
        this.maxHistorySize = 100;
        this.errorReporting = null;
        this.notificationElement = null;
        this.isInitialized = false;

        // Error recovery strategies
        this.recoveryStrategies = new Map();

        this.initialize();
    }

    /**
     * Initialize the error manager
     */
    initialize() {
        if (this.isInitialized) return;

        this.setupGlobalHandlers();
        this.setupNotificationSystem();
        this.setupRecoveryStrategies();
        this.isInitialized = true;

        console.log('✅ ErrorManager initialized');
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // JavaScript runtime errors
        window.addEventListener('error', (e) => {
            const error = new ApplicationError('runtimeError', e.error, {
                context: {
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno,
                    message: e.message
                }
            });
            this.handleError(error);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            const error = new ApplicationError('unhandledRejection', e.reason, {
                context: {
                    promise: e.promise,
                    reason: e.reason
                }
            });
            this.handleError(error);
        });

        // CSP violations (if CSP is configured)
        document.addEventListener('securitypolicyviolation', (e) => {
            const error = new SecurityError('cspViolation', null, {
                context: {
                    violatedDirective: e.violatedDirective,
                    blockedURI: e.blockedURI,
                    originalPolicy: e.originalPolicy
                }
            });
            this.handleError(error);
        });
    }

    /**
     * Setup notification system
     */
    setupNotificationSystem() {
        // Ensure notification elements exist
        let notificationContainer = document.getElementById('error-notifications');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'error-notifications';
            notificationContainer.className = 'error-notifications-container';
            notificationContainer.setAttribute('aria-live', 'polite');
            notificationContainer.setAttribute('aria-atomic', 'true');
            document.body.appendChild(notificationContainer);

            // Add styles
            const styles = document.createElement('style');
            styles.textContent = `
                .error-notifications-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    pointer-events: none;
                }

                .error-notification {
                    background: var(--error-bg, #f56565);
                    color: var(--error-text, #fff);
                    padding: 16px;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    pointer-events: auto;
                    animation: slideIn 0.3s ease-out;
                    position: relative;
                    word-break: keep-all;
                    line-height: 1.5;
                }

                .error-notification.warning {
                    background: var(--warning-bg, #ed8936);
                }

                .error-notification.info {
                    background: var(--info-bg, #4299e1);
                }

                .error-notification.success {
                    background: var(--success-bg, #48bb78);
                }

                .error-notification-title {
                    font-weight: 600;
                    margin-bottom: 8px;
                    font-size: 14px;
                }

                .error-notification-message {
                    font-size: 13px;
                    line-height: 1.4;
                    white-space: pre-line;
                }

                .error-notification-actions {
                    margin-top: 12px;
                    display: flex;
                    gap: 8px;
                }

                .error-notification-action {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: inherit;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s;
                }

                .error-notification-action:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .error-notification-close {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 16px;
                    line-height: 1;
                    opacity: 0.7;
                    padding: 4px;
                }

                .error-notification-close:hover {
                    opacity: 1;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                /* Korean typography support */
                body.lang-ko .error-notification {
                    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    word-break: keep-all;
                    line-height: 1.6;
                }
            `;
            document.head.appendChild(styles);
        }

        this.notificationElement = notificationContainer;
    }

    /**
     * Setup error recovery strategies
     */
    setupRecoveryStrategies() {
        // File upload retry
        this.recoveryStrategies.set('fileUploadFailed', {
            label: i18n.t('errors.actions.retryUpload') || '다시 시도',
            action: (context) => {
                if (context.retryCallback) {
                    context.retryCallback();
                }
            }
        });

        // Network retry
        this.recoveryStrategies.set('networkError', {
            label: i18n.t('errors.actions.retryConnection') || '재연결',
            action: (context) => {
                if (context.retryCallback) {
                    context.retryCallback();
                }
            }
        });

        // Session recovery
        this.recoveryStrategies.set('sessionError', {
            label: i18n.t('errors.actions.recoverSession') || '세션 복구',
            action: (context) => {
                if (context.sessionManager) {
                    context.sessionManager.recoverSession();
                }
            }
        });

        // Layer recovery
        this.recoveryStrategies.set('layerError', {
            label: i18n.t('errors.actions.recreateLayer') || '레이어 재생성',
            action: (context) => {
                if (context.layerManager && context.layerData) {
                    context.layerManager.recreateLayer(context.layerData);
                }
            }
        });
    }

    /**
     * Main error handling method
     */
    handleError(error, context = {}) {
        try {
            // Enhance error with additional context
            const enhancedError = this.enhanceError(error, context);

            // Log error
            this.logError(enhancedError);

            // Store in history
            this.addToHistory(enhancedError);

            // Emit error event
            if (this.eventBus) {
                this.eventBus.emit('error:occurred', enhancedError);
            }

            // Show user notification
            this.showErrorNotification(enhancedError);

            // Send to monitoring (if configured)
            if (this.errorReporting) {
                this.errorReporting.report(enhancedError);
            }

            // Screen reader announcement
            this.announceError(enhancedError);

            return enhancedError;

        } catch (handlingError) {
            // Fallback error handling
            console.error('Error in error handler:', handlingError);
            console.error('Original error:', error);
            this.showFallbackNotification(error);
        }
    }

    /**
     * Enhance error with additional context
     */
    enhanceError(error, context) {
        if (!(error instanceof ApplicationError)) {
            // Convert regular errors to ApplicationError
            error = new ApplicationError('genericError', error, {
                context: context
            });
        } else {
            // Add additional context to existing ApplicationError
            error.context = { ...error.context, ...context };
        }

        // Add current state context
        error.context.timestamp = new Date().toISOString();
        error.context.userAgent = navigator.userAgent;
        error.context.url = window.location.href;
        error.context.language = i18n.getCurrentLanguage();

        return error;
    }

    /**
     * Log error to console with structured format
     */
    logError(error) {
        const logData = {
            id: error.errorId,
            type: error.name,
            title: error.title,
            message: error.message,
            severity: error.severity,
            timestamp: error.timestamp,
            context: error.context
        };

        if (error.severity === 'high') {
            console.error('🚨 HIGH SEVERITY ERROR:', logData);
        } else if (error.severity === 'medium') {
            console.warn('⚠️ MEDIUM SEVERITY ERROR:', logData);
        } else {
            console.log('ℹ️ LOW SEVERITY ERROR:', logData);
        }
    }

    /**
     * Add error to history
     */
    addToHistory(error) {
        this.errorHistory.unshift(error.toJSON());

        // Limit history size
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Show error notification to user
     */
    showErrorNotification(error) {
        if (!this.notificationElement) return;

        const notification = document.createElement('div');
        notification.className = `error-notification ${this.getSeverityClass(error.severity)}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', error.severity === 'high' ? 'assertive' : 'polite');

        // Title
        const title = document.createElement('div');
        title.className = 'error-notification-title';
        title.textContent = error.title;
        notification.appendChild(title);

        // Message
        const message = document.createElement('div');
        message.className = 'error-notification-message';
        message.textContent = error.userMessage;
        notification.appendChild(message);

        // Actions
        if (error.actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'error-notification-actions';

            error.actions.forEach(action => {
                const actionBtn = document.createElement('button');
                actionBtn.className = 'error-notification-action';
                actionBtn.textContent = action.label;
                actionBtn.onclick = () => {
                    action.handler(error);
                    notification.remove();
                };
                actionsContainer.appendChild(actionBtn);
            });

            notification.appendChild(actionsContainer);
        }

        // Add recovery actions if available
        const recoveryStrategy = this.recoveryStrategies.get(error.title);
        if (recoveryStrategy) {
            const actionsContainer = notification.querySelector('.error-notification-actions') ||
                                   (() => {
                                       const container = document.createElement('div');
                                       container.className = 'error-notification-actions';
                                       notification.appendChild(container);
                                       return container;
                                   })();

            const recoveryBtn = document.createElement('button');
            recoveryBtn.className = 'error-notification-action';
            recoveryBtn.textContent = recoveryStrategy.label;
            recoveryBtn.onclick = () => {
                recoveryStrategy.action(error.context);
                notification.remove();
            };
            actionsContainer.appendChild(recoveryBtn);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'error-notification-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', i18n.t('form.close') || '닫기');
        closeBtn.onclick = () => notification.remove();
        notification.appendChild(closeBtn);

        // Add to container
        this.notificationElement.appendChild(notification);

        // Auto-remove based on severity
        const duration = this.getNotificationDuration(error.severity);
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }

    /**
     * Get CSS class for severity level
     */
    getSeverityClass(severity) {
        switch (severity) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'info';
        }
    }

    /**
     * Get notification duration based on severity
     */
    getNotificationDuration(severity) {
        switch (severity) {
            case 'high': return 0; // Manual close only
            case 'medium': return 8000;
            case 'low': return 5000;
            default: return 5000;
        }
    }

    /**
     * Announce error to screen readers
     */
    announceError(error) {
        const priority = error.severity === 'high' ? 'assertive' : 'polite';
        i18n.announceToScreenReader(error.userMessage, priority);
    }

    /**
     * Fallback notification for critical error handler failures
     */
    showFallbackNotification(error) {
        const message = error?.message || 'An unknown error occurred';
        const fallbackNotification = document.createElement('div');
        fallbackNotification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f56565;
            color: white;
            padding: 16px;
            border-radius: 8px;
            z-index: 10001;
            max-width: 400px;
        `;
        fallbackNotification.textContent = message;
        document.body.appendChild(fallbackNotification);

        setTimeout(() => {
            if (fallbackNotification.parentNode) {
                fallbackNotification.remove();
            }
        }, 5000);
    }

    /**
     * Get current context for error reporting
     */
    getCurrentContext() {
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            language: i18n.getCurrentLanguage(),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
            } : null
        };
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
    }

    /**
     * Get error history
     */
    getHistory() {
        return [...this.errorHistory];
    }

    /**
     * Get error statistics
     */
    getStatistics() {
        const stats = {
            total: this.errorHistory.length,
            byType: {},
            bySeverity: { high: 0, medium: 0, low: 0 },
            recent: this.errorHistory.slice(0, 10)
        };

        this.errorHistory.forEach(error => {
            // Count by type
            stats.byType[error.name] = (stats.byType[error.name] || 0) + 1;

            // Count by severity
            if (stats.bySeverity[error.severity] !== undefined) {
                stats.bySeverity[error.severity]++;
            }
        });

        return stats;
    }

    /**
     * Set error reporting service
     */
    setErrorReporting(reportingService) {
        this.errorReporting = reportingService;
    }

    /**
     * Destroy error manager
     */
    destroy() {
        this.errorHistory = [];
        this.recoveryStrategies.clear();

        if (this.notificationElement) {
            this.notificationElement.remove();
        }

        this.isInitialized = false;
    }
}

// Create singleton instance
export const errorManager = new ErrorManager();

// Error classes are already exported individually above

// Export default
export default errorManager;