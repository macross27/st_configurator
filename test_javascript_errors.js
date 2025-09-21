const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testJavaScriptErrors() {
    console.log('Starting JavaScript error testing...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Collect console errors
    const consoleErrors = [];
    const networkErrors = [];
    const jsErrors = [];

    // Listen for console messages
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push({
                type: 'console-error',
                text: msg.text(),
                timestamp: new Date().toISOString()
            });
            console.log('Console Error:', msg.text());
        }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
        jsErrors.push({
            type: 'page-error',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        console.log('Page Error:', error.message);
    });

    // Listen for failed network requests
    page.on('requestfailed', (request) => {
        networkErrors.push({
            type: 'network-error',
            url: request.url(),
            failure: request.failure(),
            timestamp: new Date().toISOString()
        });
        console.log('Network Error:', request.url(), request.failure());
    });

    try {
        console.log('Navigating to http://localhost:3029...');
        await page.goto('http://localhost:3029', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait a moment for initial load
        await page.waitForFunction(() => !!document.body, { timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take initial screenshot with dev tools open
        await page.evaluate(() => {
            // Open dev tools programmatically if possible
            if (window.chrome && window.chrome.devtools) {
                window.chrome.devtools.inspectedWindow.eval('console.log("Dev tools opened")');
            }
        });

        console.log('Taking initial screenshot...');
        await page.screenshot({
            path: 'test_initial_errors.png',
            fullPage: true
        });

        // Wait for the page to fully load and check for immediate errors
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Try to find and click "텍스트 추가" button
        console.log('Looking for "텍스트 추가" button...');

        let textAddButton = null;
        try {
            // Try multiple selectors to find the text add button
            const buttonSelectors = [
                'button:contains("텍스트 추가")',
                '[data-action="add-text"]',
                '#add-text-btn',
                '.add-text-button',
                'button[onclick*="text"]',
                'input[value="텍스트 추가"]'
            ];

            for (const selector of buttonSelectors) {
                try {
                    textAddButton = await page.$(selector);
                    if (textAddButton) {
                        console.log(`Found text add button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            // If not found by selector, try XPath
            if (!textAddButton) {
                const [button] = await page.$x("//button[contains(text(), '텍스트 추가')] | //input[@value='텍스트 추가']");
                textAddButton = button;
                if (textAddButton) {
                    console.log('Found text add button with XPath');
                }
            }

            if (textAddButton) {
                console.log('Clicking "텍스트 추가" button...');
                await textAddButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                console.log('Taking screenshot after clicking text add button...');
                await page.screenshot({
                    path: 'test_after_text_add_click.png',
                    fullPage: true
                });
            } else {
                console.log('Could not find "텍스트 추가" button');

                // Take a screenshot to see what buttons are available
                await page.screenshot({
                    path: 'test_no_text_button_found.png',
                    fullPage: true
                });

                // Get all buttons on the page for debugging
                const allButtons = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
                    return buttons.map(btn => ({
                        tag: btn.tagName,
                        type: btn.type,
                        text: btn.textContent || btn.value,
                        id: btn.id,
                        className: btn.className,
                        onclick: btn.onclick ? btn.onclick.toString() : null
                    }));
                });

                console.log('All buttons found on page:', JSON.stringify(allButtons, null, 2));
            }
        } catch (error) {
            console.log('Error finding/clicking text add button:', error.message);
            jsErrors.push({
                type: 'test-error',
                message: `Error with text add button: ${error.message}`,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }

        // Test 2: Try to find and click "주문서 작성" button
        console.log('Looking for "주문서 작성" button...');

        let orderButton = null;
        try {
            // Try multiple selectors to find the order button
            const orderSelectors = [
                'button:contains("주문서 작성")',
                '[data-action="create-order"]',
                '#order-btn',
                '.order-button',
                'button[onclick*="order"]',
                'input[value="주문서 작성"]'
            ];

            for (const selector of orderSelectors) {
                try {
                    orderButton = await page.$(selector);
                    if (orderButton) {
                        console.log(`Found order button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            // If not found by selector, try XPath
            if (!orderButton) {
                const [button] = await page.$x("//button[contains(text(), '주문서 작성')] | //input[@value='주문서 작성']");
                orderButton = button;
                if (orderButton) {
                    console.log('Found order button with XPath');
                }
            }

            if (orderButton) {
                console.log('Clicking "주문서 작성" button...');
                await orderButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                console.log('Taking screenshot after clicking order button...');
                await page.screenshot({
                    path: 'test_after_order_click.png',
                    fullPage: true
                });
            } else {
                console.log('Could not find "주문서 작성" button');

                await page.screenshot({
                    path: 'test_no_order_button_found.png',
                    fullPage: true
                });
            }
        } catch (error) {
            console.log('Error finding/clicking order button:', error.message);
            jsErrors.push({
                type: 'test-error',
                message: `Error with order button: ${error.message}`,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }

        // Take final screenshot
        console.log('Taking final screenshot...');
        await page.screenshot({
            path: 'test_final_errors.png',
            fullPage: true
        });

        // Get all console logs and errors from the page
        const consoleLogs = await page.evaluate(() => {
            // Try to get any stored console logs
            return window.console._logs || [];
        });

        // Create error report
        const errorReport = {
            testTimestamp: new Date().toISOString(),
            url: 'http://localhost:3029',
            consoleErrors: consoleErrors,
            jsErrors: jsErrors,
            networkErrors: networkErrors,
            consoleLogs: consoleLogs,
            summary: {
                totalConsoleErrors: consoleErrors.length,
                totalJsErrors: jsErrors.length,
                totalNetworkErrors: networkErrors.length,
                textButtonFound: textAddButton !== null,
                orderButtonFound: orderButton !== null
            }
        };

        // Write error report to file
        fs.writeFileSync('javascript_error_report.json', JSON.stringify(errorReport, null, 2));

        console.log('\n=== ERROR SUMMARY ===');
        console.log(`Console Errors: ${consoleErrors.length}`);
        console.log(`JavaScript Errors: ${jsErrors.length}`);
        console.log(`Network Errors: ${networkErrors.length}`);

        if (consoleErrors.length > 0) {
            console.log('\n=== CONSOLE ERRORS ===');
            consoleErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.text}`);
            });
        }

        if (jsErrors.length > 0) {
            console.log('\n=== JAVASCRIPT ERRORS ===');
            jsErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
                if (error.stack) {
                    console.log(`   Stack: ${error.stack}`);
                }
            });
        }

        if (networkErrors.length > 0) {
            console.log('\n=== NETWORK ERRORS ===');
            networkErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.url} - ${error.failure?.errorText || 'Unknown error'}`);
            });
        }

        return errorReport;

    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'test_failure.png', fullPage: true });
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testJavaScriptErrors()
    .then((report) => {
        console.log('\nTest completed successfully');
        console.log('Error report saved to: javascript_error_report.json');
        console.log('Screenshots saved with prefix: test_');
    })
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });