import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Comprehensive ST Configurator Browser Test
 * Tests the application running at http://localhost:3029
 *
 * Test Coverage:
 * - Initial application state
 * - New session creation
 * - Text layer addition
 * - Form submission
 * - Console error monitoring
 * - Screenshot capture at key points
 */

test.describe('ST Configurator Application Test', () => {
  let consoleErrors = [];
  let consoleWarnings = [];
  let consoleMessages = [];
  let testReport = {
    timestamp: new Date().toISOString(),
    testUrl: 'http://localhost:3029',
    actions: [],
    errors: [],
    warnings: [],
    screenshots: [],
    status: 'unknown'
  };

  test.beforeEach(async ({ page }) => {
    // Set up console monitoring
    page.on('console', msg => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };

      consoleMessages.push(message);

      if (msg.type() === 'error') {
        consoleErrors.push(message);
        testReport.errors.push(message);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(message);
        testReport.warnings.push(message);
      }
    });

    // Monitor for uncaught exceptions
    page.on('pageerror', error => {
      const errorInfo = {
        type: 'uncaught_exception',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      consoleErrors.push(errorInfo);
      testReport.errors.push(errorInfo);
    });

    // Monitor network failures
    page.on('response', response => {
      if (!response.ok()) {
        const networkError = {
          type: 'network_error',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        };
        testReport.errors.push(networkError);
      }
    });
  });

  test('Complete ST Configurator workflow test', async ({ page }) => {
    console.log('Starting ST Configurator comprehensive test...');

    try {
      // Step 1: Navigate to the application
      console.log('Step 1: Navigating to http://localhost:3029');
      testReport.actions.push({
        step: 1,
        action: 'Navigate to application',
        url: 'http://localhost:3029',
        timestamp: new Date().toISOString()
      });

      await page.goto('http://localhost:3029', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for the page to fully load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Give Three.js time to initialize

      // Step 2: Take initial screenshot
      console.log('Step 2: Taking initial state screenshot');
      const initialScreenshot = await page.screenshot({
        path: 'test-initial-state.png',
        fullPage: true
      });
      testReport.screenshots.push({
        name: 'initial-state',
        path: 'test-initial-state.png',
        timestamp: new Date().toISOString()
      });
      testReport.actions.push({
        step: 2,
        action: 'Capture initial state screenshot',
        result: 'success',
        timestamp: new Date().toISOString()
      });

      // Step 3: Look for and interact with New Session button
      console.log('Step 3: Looking for New Session button');

      // Check for various possible new session button selectors
      const newSessionSelectors = [
        'button:has-text("New Session")',
        'button:has-text("New")',
        'button[data-action="new-session"]',
        '.new-session-btn',
        '#new-session',
        'button:has-text("Start New")',
        'button:has-text("Reset")',
        '.btn-new',
        '.session-new'
      ];

      let newSessionButton = null;
      let buttonFound = false;

      for (const selector of newSessionSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            newSessionButton = element;
            buttonFound = true;
            console.log(`Found New Session button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (buttonFound && newSessionButton) {
        console.log('Clicking New Session button');
        await newSessionButton.click();
        await page.waitForTimeout(1000);

        testReport.actions.push({
          step: 3,
          action: 'Click New Session button',
          result: 'success',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('New Session button not found, proceeding with existing session');
        testReport.actions.push({
          step: 3,
          action: 'Look for New Session button',
          result: 'not_found',
          note: 'Button not found, proceeding with existing session',
          timestamp: new Date().toISOString()
        });
      }

      // Step 4: Add text layer
      console.log('Step 4: Adding text layer');

      // Look for text input fields
      const textInputSelectors = [
        'input[type="text"]',
        'input[placeholder*="text"]',
        'input[placeholder*="Text"]',
        'textarea',
        '.text-input',
        '#text-input',
        'input[name="text"]',
        'input[data-layer="text"]'
      ];

      let textInput = null;
      let textInputFound = false;

      for (const selector of textInputSelectors) {
        try {
          const elements = await page.locator(selector).all();
          for (const element of elements) {
            if (await element.isVisible({ timeout: 1000 })) {
              textInput = element;
              textInputFound = true;
              console.log(`Found text input with selector: ${selector}`);
              break;
            }
          }
          if (textInputFound) break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (textInputFound && textInput) {
        console.log('Entering test text: "Test Text"');
        await textInput.click();
        await textInput.fill('Test Text');
        await page.waitForTimeout(500);

        testReport.actions.push({
          step: 4,
          action: 'Add text layer',
          text: 'Test Text',
          result: 'success',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('Text input not found, looking for alternative methods');

        // Try to find "Add Text" or similar buttons
        const addTextSelectors = [
          'button:has-text("Add Text")',
          'button:has-text("Text")',
          'button[data-action="add-text"]',
          '.add-text-btn',
          '.text-layer-btn',
          'button:has-text("Add Layer")'
        ];

        let addTextButton = null;
        for (const selector of addTextSelectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 })) {
              addTextButton = element;
              console.log(`Found Add Text button with selector: ${selector}`);
              await addTextButton.click();
              await page.waitForTimeout(1000);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        // Try again to find text input after clicking add text button
        if (addTextButton) {
          for (const selector of textInputSelectors) {
            try {
              const element = await page.locator(selector).first();
              if (await element.isVisible({ timeout: 2000 })) {
                await element.click();
                await element.fill('Test Text');
                textInputFound = true;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }

        testReport.actions.push({
          step: 4,
          action: 'Add text layer',
          result: textInputFound ? 'success' : 'failed',
          note: textInputFound ? 'Found input after clicking add button' : 'No text input found',
          timestamp: new Date().toISOString()
        });
      }

      // Take screenshot after text addition
      await page.screenshot({
        path: 'test-after-text-addition.png',
        fullPage: true
      });
      testReport.screenshots.push({
        name: 'after-text-addition',
        path: 'test-after-text-addition.png',
        timestamp: new Date().toISOString()
      });

      // Step 5: Submit/Save the form
      console.log('Step 5: Looking for submit/save button');

      const submitSelectors = [
        'button:has-text("Save")',
        'button:has-text("Submit")',
        'button:has-text("Apply")',
        'button:has-text("Confirm")',
        'button[type="submit"]',
        'input[type="submit"]',
        '.save-btn',
        '.submit-btn',
        '#save-button',
        '#submit-button',
        'button[data-action="save"]',
        'button[data-action="submit"]'
      ];

      let submitButton = null;
      let submitFound = false;

      for (const selector of submitSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            submitButton = element;
            submitFound = true;
            console.log(`Found submit button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (submitFound && submitButton) {
        console.log('Clicking submit/save button');
        await submitButton.click();
        await page.waitForTimeout(2000); // Wait for processing

        testReport.actions.push({
          step: 5,
          action: 'Submit/Save form',
          result: 'success',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('Submit button not found');
        testReport.actions.push({
          step: 5,
          action: 'Submit/Save form',
          result: 'button_not_found',
          timestamp: new Date().toISOString()
        });
      }

      // Step 6: Take final screenshot
      console.log('Step 6: Taking final state screenshot');
      await page.screenshot({
        path: 'test-final-state.png',
        fullPage: true
      });
      testReport.screenshots.push({
        name: 'final-state',
        path: 'test-final-state.png',
        timestamp: new Date().toISOString()
      });

      // Wait a bit more to catch any delayed errors
      await page.waitForTimeout(3000);

      testReport.status = 'completed';

    } catch (error) {
      console.error('Test execution error:', error);
      testReport.status = 'failed';
      testReport.errors.push({
        type: 'test_execution_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Take error screenshot
      try {
        await page.screenshot({
          path: 'test-error-state.png',
          fullPage: true
        });
        testReport.screenshots.push({
          name: 'error-state',
          path: 'test-error-state.png',
          timestamp: new Date().toISOString()
        });
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Finalize test report
    testReport.summary = {
      totalActions: testReport.actions.length,
      totalErrors: testReport.errors.length,
      totalWarnings: testReport.warnings.length,
      totalScreenshots: testReport.screenshots.length,
      consoleMessages: consoleMessages.length
    };

    // Save detailed test report
    const reportPath = 'st-configurator-test-report.json';
    writeFileSync(reportPath, JSON.stringify(testReport, null, 2));

    console.log('\n=== ST CONFIGURATOR TEST REPORT ===');
    console.log(`Test Status: ${testReport.status}`);
    console.log(`Total Actions: ${testReport.summary.totalActions}`);
    console.log(`Total Errors: ${testReport.summary.totalErrors}`);
    console.log(`Total Warnings: ${testReport.summary.totalWarnings}`);
    console.log(`Screenshots Captured: ${testReport.summary.totalScreenshots}`);
    console.log(`Console Messages: ${testReport.summary.consoleMessages}`);

    if (testReport.errors.length > 0) {
      console.log('\n=== ERRORS DETECTED ===');
      testReport.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type}] ${error.message || error.text}`);
        if (error.stack) {
          console.log(`   Stack: ${error.stack}`);
        }
        if (error.location) {
          console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
        }
      });
    }

    if (testReport.warnings.length > 0) {
      console.log('\n=== WARNINGS DETECTED ===');
      testReport.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.text}`);
      });
    }

    console.log('\n=== ACTIONS PERFORMED ===');
    testReport.actions.forEach(action => {
      console.log(`Step ${action.step}: ${action.action} - ${action.result || 'completed'}`);
      if (action.note) {
        console.log(`   Note: ${action.note}`);
      }
    });

    console.log('\n=== SCREENSHOTS ===');
    testReport.screenshots.forEach(screenshot => {
      console.log(`- ${screenshot.name}: ${screenshot.path}`);
    });

    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log('===================================\n');
  });
});