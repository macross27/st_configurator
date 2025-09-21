/**
 * Error Handling System Test
 *
 * Simple test to verify that the standardized error handling system
 * is working correctly with Korean i18n support.
 */

import { errorManager, ApplicationError, ValidationError, FileProcessingError } from './ErrorManager.js';
import { i18n } from './I18nManager.js';
import { validateFile, safeAsyncOperation, createStandardizedError } from './ErrorHandlingUtils.js';

export class ErrorHandlingTest {
    constructor() {
        this.testResults = [];
    }

    async runTests() {
        console.log('🧪 Starting Error Handling System Tests...');

        // Wait for i18n to initialize
        if (!i18n.isInitialized) {
            await i18n.initialize();
        }

        await this.testBasicErrorCreation();
        await this.testErrorManagerIntegration();
        await this.testKoreanErrorMessages();
        await this.testFileValidation();
        await this.testErrorRecovery();
        await this.testErrorNotifications();

        this.printResults();
        return this.testResults;
    }

    async testBasicErrorCreation() {
        const testName = 'Basic Error Creation';
        try {
            // Test creating different error types
            const appError = new ApplicationError('testError', new Error('Original error'), {
                context: { test: true }
            });

            const validationError = new ValidationError('requiredField', 'email');
            const fileError = new FileProcessingError('uploadFailed', 'test.jpg');

            this.assert(appError.name === 'ApplicationError', 'ApplicationError created');
            this.assert(validationError.name === 'ValidationError', 'ValidationError created');
            this.assert(fileError.name === 'FileProcessingError', 'FileProcessingError created');
            this.assert(appError.errorId.startsWith('error_'), 'Error ID generated');

            this.passTest(testName);
        } catch (error) {
            this.failTest(testName, error);
        }
    }

    async testErrorManagerIntegration() {
        const testName = 'Error Manager Integration';
        try {
            let handledError = null;

            // Capture handled error
            const originalHandleError = errorManager.handleError.bind(errorManager);
            errorManager.handleError = (error) => {
                handledError = error;
                return originalHandleError(error);
            };

            // Test error handling
            const testError = new ApplicationError('testIntegration', null, {
                severity: 'low'
            });

            errorManager.handleError(testError);

            this.assert(handledError !== null, 'Error was handled');
            this.assert(handledError.errorId === testError.errorId, 'Correct error handled');

            // Restore original function
            errorManager.handleError = originalHandleError;

            this.passTest(testName);
        } catch (error) {
            this.failTest(testName, error);
        }
    }

    async testKoreanErrorMessages() {
        const testName = 'Korean Error Messages';
        try {
            // Test Korean error message retrieval
            const networkErrorKo = i18n.t('errors.network.connectionFailed');
            const fileErrorKo = i18n.t('errors.file.fileTooLarge', { fileName: '테스트.jpg' });
            const validationErrorKo = i18n.t('validation.requiredField');

            this.assert(networkErrorKo && networkErrorKo !== 'errors.network.connectionFailed', 'Korean network error message found');
            this.assert(fileErrorKo && fileErrorKo.includes('테스트.jpg'), 'Korean file error with parameter substitution');
            this.assert(validationErrorKo && validationErrorKo !== 'validation.requiredField', 'Korean validation message found');

            console.log('📝 Korean error messages:');
            console.log('  Network:', networkErrorKo);
            console.log('  File:', fileErrorKo);
            console.log('  Validation:', validationErrorKo);

            this.passTest(testName);
        } catch (error) {
            this.failTest(testName, error);
        }
    }

    async testFileValidation() {
        const testName = 'File Validation';
        try {
            // Create mock file that's too large
            const largeMockFile = {
                name: 'large-file.jpg',
                size: 10 * 1024 * 1024, // 10MB
                type: 'image/jpeg'
            };

            // Create mock file with wrong type
            const wrongTypeMockFile = {
                name: 'document.pdf',
                size: 1024 * 1024, // 1MB
                type: 'application/pdf'
            };

            let largeFileError = null;
            let wrongTypeError = null;

            try {
                validateFile(largeMockFile, { maxSize: 5 * 1024 * 1024 });
            } catch (error) {
                largeFileError = error;
            }

            try {
                validateFile(wrongTypeMockFile);
            } catch (error) {
                wrongTypeError = error;
            }

            this.assert(largeFileError instanceof FileProcessingError, 'Large file validation error created');
            this.assert(wrongTypeError instanceof FileProcessingError, 'Wrong type validation error created');
            this.assert(largeFileError.fileName === 'large-file.jpg', 'Correct filename in error');

            this.passTest(testName);
        } catch (error) {
            this.failTest(testName, error);
        }
    }

    async testErrorRecovery() {
        const testName = 'Error Recovery';
        try {
            let retryCount = 0;
            let recoveryExecuted = false;

            // Test safe async operation with retry
            const failingOperation = safeAsyncOperation(async () => {
                retryCount++;
                if (retryCount < 3) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            }, {
                maxRetries: 2,
                retryDelay: 10,
                errorType: 'network.request',
                onRetry: () => {
                    recoveryExecuted = true;
                }
            });

            const result = await failingOperation();

            this.assert(result === 'success', 'Operation succeeded after retries');
            this.assert(retryCount === 3, 'Correct number of attempts');
            this.assert(recoveryExecuted, 'Recovery callback executed');

            this.passTest(testName);
        } catch (error) {
            this.failTest(testName, error);
        }
    }

    async testErrorNotifications() {
        const testName = 'Error Notifications';
        try {
            // Check if notification system is set up
            const notificationContainer = document.getElementById('error-notifications');
            this.assert(notificationContainer !== null, 'Error notification container exists');

            // Test notification creation (don't actually show it in test)
            const testError = new ApplicationError('testNotification', null, {
                severity: 'medium',
                userMessage: '테스트 알림 메시지'
            });

            // Verify error has proper Korean message
            this.assert(testError.userMessage === '테스트 알림 메시지', 'Korean user message set correctly');

            this.passTest(testName);
        } catch (error) {
            this.failTest(testName, error);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    passTest(testName) {
        this.testResults.push({ name: testName, status: 'PASS' });
        console.log(`✅ ${testName}: PASS`);
    }

    failTest(testName, error) {
        this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
        console.error(`❌ ${testName}: FAIL - ${error.message}`);
    }

    printResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
        const failedTests = totalTests - passedTests;

        console.log('\n🧪 Error Handling System Test Results:');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);

        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
        }

        console.log(`\n${failedTests === 0 ? '🎉' : '⚠️'} Test Suite ${failedTests === 0 ? 'COMPLETED SUCCESSFULLY' : 'COMPLETED WITH FAILURES'}`);
    }
}

// Export for use in development console
window.ErrorHandlingTest = ErrorHandlingTest;

export default ErrorHandlingTest;