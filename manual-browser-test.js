/**
 * Manual ST Configurator Browser Test
 * Standalone Playwright test for http://localhost:3029
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runSTConfiguratorTest() {
  console.log('🚀 Starting ST Configurator Browser Test...');
  console.log('Target URL: http://localhost:3029\n');

  const testReport = {
    timestamp: new Date().toISOString(),
    testUrl: 'http://localhost:3029',
    actions: [],
    errors: [],
    warnings: [],
    screenshots: [],
    consoleMessages: [],
    status: 'unknown'
  };

  let browser;
  let page;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: false, // Show browser for debugging
      devtools: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });

    page = await context.newPage();

    // Set up console monitoring
    page.on('console', msg => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };

      testReport.consoleMessages.push(message);

      if (msg.type() === 'error') {
        testReport.errors.push(message);
        console.log(`❌ Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        testReport.warnings.push(message);
        console.log(`⚠️ Console Warning: ${msg.text()}`);
      } else {
        console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
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
      testReport.errors.push(errorInfo);
      console.log(`💥 Uncaught Exception: ${error.message}`);
    });

    // Monitor network responses
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
        console.log(`🌐 Network Error: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to http://localhost:3029');
    testReport.actions.push({
      step: 1,
      action: 'Navigate to application',
      url: 'http://localhost:3029',
      timestamp: new Date().toISOString()
    });

    try {
      await page.goto('http://localhost:3029', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      console.log('✅ Successfully navigated to application');
    } catch (navError) {
      console.log(`❌ Navigation failed: ${navError.message}`);
      testReport.errors.push({
        type: 'navigation_error',
        message: navError.message,
        timestamp: new Date().toISOString()
      });
      throw navError;
    }

    // Wait for the page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Give Three.js time to initialize

    // Step 2: Take initial screenshot
    console.log('📸 Step 2: Taking initial state screenshot');
    const initialScreenshotPath = path.join(__dirname, 'test-initial-state.png');
    await page.screenshot({
      path: initialScreenshotPath,
      fullPage: true
    });
    testReport.screenshots.push({
      name: 'initial-state',
      path: initialScreenshotPath,
      timestamp: new Date().toISOString()
    });
    testReport.actions.push({
      step: 2,
      action: 'Capture initial state screenshot',
      result: 'success',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Initial screenshot captured');

    // Step 3: Look for and interact with New Session button
    console.log('🔍 Step 3: Looking for New Session functionality');

    const newSessionSelectors = [
      'button:has-text("New Session")',
      'button:has-text("New")',
      'button[data-action="new-session"]',
      '.new-session-btn',
      '#new-session',
      'button:has-text("Start New")',
      'button:has-text("Reset")',
      '.btn-new',
      '.session-new',
      'button:has-text("Clear")'
    ];

    let newSessionButton = null;
    let buttonFound = false;

    for (const selector of newSessionSelectors) {
      try {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 1000 });
        if (isVisible) {
          newSessionButton = element;
          buttonFound = true;
          console.log(`✅ Found New Session button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (buttonFound && newSessionButton) {
      console.log('🖱️ Clicking New Session button');
      await newSessionButton.click();
      await page.waitForTimeout(1000);

      testReport.actions.push({
        step: 3,
        action: 'Click New Session button',
        result: 'success',
        timestamp: new Date().toISOString()
      });
      console.log('✅ New Session button clicked');
    } else {
      console.log('⚠️ New Session button not found, proceeding with existing session');
      testReport.actions.push({
        step: 3,
        action: 'Look for New Session button',
        result: 'not_found',
        note: 'Button not found, proceeding with existing session',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Add text layer
    console.log('📝 Step 4: Adding text layer');

    // Look for text input fields or add text buttons first
    const addTextSelectors = [
      'button:has-text("Add Text")',
      'button:has-text("Text")',
      'button[data-action="add-text"]',
      '.add-text-btn',
      '.text-layer-btn',
      'button:has-text("Add Layer")',
      '#add-text',
      '.layer-controls button'
    ];

    let addTextButton = null;
    for (const selector of addTextSelectors) {
      try {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 1000 });
        if (isVisible) {
          addTextButton = element;
          console.log(`✅ Found Add Text button with selector: ${selector}`);
          await addTextButton.click();
          await page.waitForTimeout(1000);
          console.log('✅ Add Text button clicked');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Now look for text input fields
    const textInputSelectors = [
      'input[type="text"]',
      'input[placeholder*="text"]',
      'input[placeholder*="Text"]',
      'textarea',
      '.text-input',
      '#text-input',
      'input[name="text"]',
      'input[data-layer="text"]',
      '#layer-text',
      '.layer-text-input'
    ];

    let textInput = null;
    let textInputFound = false;

    for (const selector of textInputSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          const isVisible = await element.isVisible({ timeout: 1000 });
          if (isVisible) {
            textInput = element;
            textInputFound = true;
            console.log(`✅ Found text input with selector: ${selector}`);
            break;
          }
        }
        if (textInputFound) break;
      } catch (e) {
        // Continue to next selector
      }
    }

    if (textInputFound && textInput) {
      console.log('⌨️ Entering test text: "Test Text"');
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
      console.log('✅ Text entered successfully');
    } else {
      console.log('❌ Text input not found');
      testReport.actions.push({
        step: 4,
        action: 'Add text layer',
        result: 'failed',
        note: 'No text input found',
        timestamp: new Date().toISOString()
      });
    }

    // Take screenshot after text addition attempt
    const afterTextScreenshotPath = path.join(__dirname, 'test-after-text-addition.png');
    await page.screenshot({
      path: afterTextScreenshotPath,
      fullPage: true
    });
    testReport.screenshots.push({
      name: 'after-text-addition',
      path: afterTextScreenshotPath,
      timestamp: new Date().toISOString()
    });
    console.log('📸 Screenshot taken after text addition attempt');

    // Step 5: Submit/Save the form
    console.log('💾 Step 5: Looking for submit/save functionality');

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
      'button[data-action="submit"]',
      'button:has-text("Order")',
      '.order-btn'
    ];

    let submitButton = null;
    let submitFound = false;

    for (const selector of submitSelectors) {
      try {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 1000 });
        if (isVisible) {
          submitButton = element;
          submitFound = true;
          console.log(`✅ Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (submitFound && submitButton) {
      console.log('🖱️ Clicking submit/save button');
      await submitButton.click();
      await page.waitForTimeout(2000); // Wait for processing

      testReport.actions.push({
        step: 5,
        action: 'Submit/Save form',
        result: 'success',
        timestamp: new Date().toISOString()
      });
      console.log('✅ Submit button clicked');
    } else {
      console.log('⚠️ Submit button not found');
      testReport.actions.push({
        step: 5,
        action: 'Submit/Save form',
        result: 'button_not_found',
        timestamp: new Date().toISOString()
      });
    }

    // Step 6: Take final screenshot
    console.log('📸 Step 6: Taking final state screenshot');
    const finalScreenshotPath = path.join(__dirname, 'test-final-state.png');
    await page.screenshot({
      path: finalScreenshotPath,
      fullPage: true
    });
    testReport.screenshots.push({
      name: 'final-state',
      path: finalScreenshotPath,
      timestamp: new Date().toISOString()
    });
    console.log('✅ Final screenshot captured');

    // Wait a bit more to catch any delayed errors or console messages
    await page.waitForTimeout(3000);

    testReport.status = 'completed';
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    testReport.status = 'failed';
    testReport.errors.push({
      type: 'test_execution_error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Take error screenshot if page exists
    if (page) {
      try {
        const errorScreenshotPath = path.join(__dirname, 'test-error-state.png');
        await page.screenshot({
          path: errorScreenshotPath,
          fullPage: true
        });
        testReport.screenshots.push({
          name: 'error-state',
          path: errorScreenshotPath,
          timestamp: new Date().toISOString()
        });
        console.log('📸 Error screenshot captured');
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError.message);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate final report
  testReport.summary = {
    totalActions: testReport.actions.length,
    totalErrors: testReport.errors.length,
    totalWarnings: testReport.warnings.length,
    totalScreenshots: testReport.screenshots.length,
    consoleMessages: testReport.consoleMessages.length
  };

  // Save detailed test report
  const reportPath = path.join(__dirname, 'st-configurator-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));

  // Print comprehensive report
  console.log('\n='.repeat(60));
  console.log('🧪 ST CONFIGURATOR TEST REPORT');
  console.log('='.repeat(60));
  console.log(`📊 Test Status: ${testReport.status}`);
  console.log(`🎯 Target URL: ${testReport.testUrl}`);
  console.log(`⏰ Test Duration: ${testReport.timestamp}`);
  console.log(`📋 Total Actions: ${testReport.summary.totalActions}`);
  console.log(`❌ Total Errors: ${testReport.summary.totalErrors}`);
  console.log(`⚠️ Total Warnings: ${testReport.summary.totalWarnings}`);
  console.log(`📸 Screenshots Captured: ${testReport.summary.totalScreenshots}`);
  console.log(`📝 Console Messages: ${testReport.summary.consoleMessages}`);

  if (testReport.errors.length > 0) {
    console.log('\n' + '='.repeat(30) + ' ERRORS ' + '='.repeat(30));
    testReport.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. [${error.type.toUpperCase()}] ${error.message || error.text}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n')[0]}`);
      }
      if (error.location) {
        console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
      }
      if (error.url) {
        console.log(`   URL: ${error.url} (${error.status})`);
      }
    });
  }

  if (testReport.warnings.length > 0) {
    console.log('\n' + '='.repeat(30) + ' WARNINGS ' + '='.repeat(28));
    testReport.warnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${warning.text}`);
      if (warning.location) {
        console.log(`   Location: ${warning.location.url}:${warning.location.lineNumber}`);
      }
    });
  }

  console.log('\n' + '='.repeat(30) + ' ACTIONS ' + '='.repeat(29));
  testReport.actions.forEach(action => {
    const status = action.result ? `[${action.result.toUpperCase()}]` : '[COMPLETED]';
    console.log(`\n${action.step}. ${action.action} ${status}`);
    if (action.note) {
      console.log(`   Note: ${action.note}`);
    }
    if (action.text) {
      console.log(`   Text: "${action.text}"`);
    }
  });

  console.log('\n' + '='.repeat(30) + ' SCREENSHOTS ' + '='.repeat(26));
  testReport.screenshots.forEach(screenshot => {
    console.log(`📸 ${screenshot.name}: ${screenshot.path}`);
  });

  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
  console.log('='.repeat(60));

  return testReport;
}

// Run the test
runSTConfiguratorTest().catch(console.error);