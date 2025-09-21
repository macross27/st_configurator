/**
 * Error Handling Utilities
 *
 * Provides utility functions for standardized error handling across all managers
 * with Korean i18n support and consistent error patterns.
 */

import { errorManager, ApplicationError, ValidationError, NetworkError, FileProcessingError, LayerError } from './ErrorManager.js';
import { i18n } from './I18nManager.js';

/**
 * Wrap async functions with standardized error handling
 */
export function withErrorHandling(asyncFn, errorType = 'generic', context = {}) {
    return async function(...args) {
        try {
            return await asyncFn.apply(this, args);
        } catch (error) {
            const wrappedError = createStandardizedError(error, errorType, context);
            errorManager.handleError(wrappedError);
            throw wrappedError;
        }
    };
}

/**
 * Wrap Promise-based operations with standardized error handling
 */
export function withPromiseErrorHandling(promiseFn, errorType = 'generic', context = {}) {
    return function(...args) {
        return promiseFn.apply(this, args).catch(error => {
            const wrappedError = createStandardizedError(error, errorType, context);
            errorManager.handleError(wrappedError);
            throw wrappedError;
        });
    };
}

/**
 * Create standardized error from existing error
 */
export function createStandardizedError(originalError, errorType, context = {}) {
    // If already a standardized error, return as-is
    if (originalError instanceof ApplicationError) {
        return originalError;
    }

    const errorMap = {
        // Layer operations
        'layer.create': LayerError,
        'layer.update': LayerError,
        'layer.delete': LayerError,
        'layer.load': LayerError,
        'layer.render': LayerError,

        // File operations
        'file.upload': FileProcessingError,
        'file.process': FileProcessingError,
        'file.read': FileProcessingError,
        'file.convert': FileProcessingError,

        // Network operations
        'network.request': NetworkError,
        'network.timeout': NetworkError,
        'network.connection': NetworkError,

        // Validation
        'validation.field': ValidationError,
        'validation.form': ValidationError,
        'validation.file': ValidationError,

        // Generic fallback
        'generic': ApplicationError
    };

    const ErrorClass = errorMap[errorType] || ApplicationError;

    // Extract meaningful error title and context
    const errorTitle = getErrorTitle(errorType, originalError);
    const enhancedContext = {
        ...context,
        originalErrorName: originalError.name,
        originalErrorMessage: originalError.message,
        timestamp: new Date().toISOString()
    };

    return new ErrorClass(errorTitle, originalError, {
        context: enhancedContext,
        userMessage: getUserMessage(errorType, context)
    });
}

/**
 * Get appropriate error title for i18n lookup
 */
function getErrorTitle(errorType, originalError) {
    const typeToTitleMap = {
        'layer.create': 'createFailed',
        'layer.update': 'updateFailed',
        'layer.delete': 'deleteFailed',
        'layer.load': 'loadFailed',
        'layer.render': 'renderFailed',
        'file.upload': 'uploadFailed',
        'file.process': 'processingFailed',
        'file.read': 'readError',
        'file.convert': 'conversionFailed',
        'network.request': 'requestFailed',
        'network.timeout': 'requestTimeout',
        'network.connection': 'connectionFailed',
        'validation.field': 'requiredField',
        'validation.form': 'validationFailed',
        'validation.file': 'fileTooLarge',
        'generic': 'genericError'
    };

    return typeToTitleMap[errorType] || 'genericError';
}

/**
 * Get user-friendly message in current language
 */
function getUserMessage(errorType, context) {
    const [category, action] = errorType.split('.');

    if (category === 'layer' && context.layerId) {
        return i18n.t(`errors.layer.${action}`, { layerId: context.layerId });
    }

    if (category === 'file' && context.fileName) {
        return i18n.t(`errors.file.${action}`, { fileName: context.fileName });
    }

    if (category === 'network') {
        return i18n.t(`errors.network.${action}`);
    }

    if (category === 'validation' && context.field) {
        return i18n.t(`validation.${context.field}`);
    }

    return i18n.t(`errors.${action}`) || i18n.t('errors.genericError');
}

/**
 * Safe async operation wrapper with retry capability
 */
export function safeAsyncOperation(operation, options = {}) {
    const {
        maxRetries = 0,
        retryDelay = 1000,
        errorType = 'generic',
        context = {},
        onRetry = null
    } = options;

    return async function(...args) {
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation.apply(this, args);
            } catch (error) {
                lastError = error;

                if (attempt < maxRetries) {
                    if (onRetry) {
                        onRetry(attempt + 1, error);
                    }

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                // Final attempt failed
                break;
            }
        }

        // All attempts failed
        const wrappedError = createStandardizedError(lastError, errorType, {
            ...context,
            attempts: maxRetries + 1,
            finalAttempt: true
        });

        errorManager.handleError(wrappedError);
        throw wrappedError;
    };
}

/**
 * Validate and handle form data with standardized errors
 */
export function validateFormData(data, validationRules) {
    const errors = [];

    for (const [field, rules] of Object.entries(validationRules)) {
        const value = data[field];

        for (const rule of rules) {
            if (rule.required && (!value || value.trim() === '')) {
                errors.push(new ValidationError('requiredField', field, null, {
                    userMessage: i18n.t(`validation.missing${field.charAt(0).toUpperCase() + field.slice(1)}`)
                }));
                break;
            }

            if (value && rule.pattern && !rule.pattern.test(value)) {
                errors.push(new ValidationError('invalidFormat', field, null, {
                    userMessage: rule.message || i18n.t(`validation.invalid${field.charAt(0).toUpperCase() + field.slice(1)}`)
                }));
            }

            if (value && rule.maxLength && value.length > rule.maxLength) {
                errors.push(new ValidationError('tooLong', field, null, {
                    userMessage: i18n.t('validation.tooLong', { field, maxLength: rule.maxLength })
                }));
            }
        }
    }

    if (errors.length > 0) {
        // Handle multiple validation errors
        errors.forEach(error => errorManager.handleError(error));
        throw new ValidationError('formValidationFailed', null, null, {
            userMessage: i18n.t('validation.formValidationFailed'),
            context: { fieldErrors: errors }
        });
    }

    return true;
}

/**
 * Handle file validation with standardized errors
 */
export function validateFile(file, options = {}) {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxWidth = null,
        maxHeight = null
    } = options;

    if (file.size > maxSize) {
        throw new FileProcessingError('fileTooLarge', file.name, null, {
            userMessage: i18n.t('errors.file.fileTooLarge', { fileName: file.name }),
            context: {
                fileSize: file.size,
                maxSize: maxSize,
                fileName: file.name
            }
        });
    }

    if (!allowedTypes.includes(file.type)) {
        throw new FileProcessingError('unsupportedFormat', file.name, null, {
            userMessage: i18n.t('errors.file.unsupportedFormat', { fileName: file.name }),
            context: {
                fileType: file.type,
                allowedTypes: allowedTypes,
                fileName: file.name
            }
        });
    }

    return true;
}

/**
 * Handle network request with standardized error handling
 */
export async function safeNetworkRequest(url, options = {}) {
    const {
        timeout = 30000,
        retries = 2,
        retryDelay = 1000
    } = options;

    return safeAsyncOperation(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new NetworkError('requestFailed', null, {
                    context: {
                        url: url,
                        status: response.status,
                        statusText: response.statusText
                    }
                });
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new NetworkError('requestTimeout', error, {
                    context: { url: url, timeout: timeout }
                });
            }

            throw error;
        }
    }, {
        maxRetries: retries,
        retryDelay: retryDelay,
        errorType: 'network.request',
        context: { url: url }
    })();
}

/**
 * Create error recovery action
 */
export function createRecoveryAction(label, handler, context = {}) {
    return {
        label: i18n.t(`errors.actions.${label}`) || label,
        handler: (error) => {
            try {
                return handler(error, context);
            } catch (recoveryError) {
                const wrappedError = new ApplicationError('recoveryFailed', recoveryError, {
                    userMessage: i18n.t('errors.recoveryFailed'),
                    context: { originalError: error, recoveryAction: label }
                });
                errorManager.handleError(wrappedError);
            }
        }
    };
}

/**
 * Batch error handling for multiple operations
 */
export async function batchWithErrorHandling(operations, options = {}) {
    const {
        continueOnError = true,
        collectErrors = true,
        errorType = 'generic'
    } = options;

    const results = [];
    const errors = [];

    for (let i = 0; i < operations.length; i++) {
        try {
            const result = await operations[i]();
            results.push({ index: i, success: true, result });
        } catch (error) {
            const wrappedError = createStandardizedError(error, errorType, {
                batchIndex: i,
                totalOperations: operations.length
            });

            if (collectErrors) {
                errors.push({ index: i, error: wrappedError });
            }

            errorManager.handleError(wrappedError);

            if (!continueOnError) {
                throw wrappedError;
            }

            results.push({ index: i, success: false, error: wrappedError });
        }
    }

    return {
        results,
        errors,
        success: errors.length === 0
    };
}

// Export utility functions
export default {
    withErrorHandling,
    withPromiseErrorHandling,
    createStandardizedError,
    safeAsyncOperation,
    validateFormData,
    validateFile,
    safeNetworkRequest,
    createRecoveryAction,
    batchWithErrorHandling
};