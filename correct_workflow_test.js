const puppeteer = require('puppeteer');
const fs = require('fs');

async function correctWorkflowTest() {
    console.log('🚀 Starting Correct Workflow Test - Following UI Flow');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const testResults = {
        timestamp: new Date().toISOString(),
        phases: [],
        consoleErrors: [],
        networkErrors: [],
        serverResponses: [],
        finalStatus: 'unknown'
    };

    // Capture console messages (errors only)
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const error = {
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            };
            testResults.consoleErrors.push(error);
            console.log(`❌ Console Error: ${msg.text()}`);
        }
    });

    // Capture network responses for order submission
    page.on('response', response => {
        const responseData = {
            url: response.url(),
            status: response.status(),
            timestamp: new Date().toISOString()
        };

        testResults.serverResponses.push(responseData);

        // Only log submission-related requests
        if (response.url().includes('/api/orders') || response.url().includes('/api/submit')) {
            if (response.status() >= 400) {
                testResults.networkErrors.push(responseData);
                console.log(`❌ Submission Error: ${response.status()} ${response.url()}`);
            } else {
                console.log(`✅ Submission Success: ${response.status()} ${response.url()}`);
            }
        }
    });

    try {
        // Phase 1: Navigate and wait for basic UI
        console.log('\n📍 Phase 1: Navigate to application and wait for 3D model');
        testResults.phases.push({
            phase: 1,
            description: 'Navigate and load application',
            startTime: new Date().toISOString()
        });

        await page.goto('http://localhost:3029', {
            waitUntil: 'networkidle2',
            timeout: 20000
        });

        // Wait for the Add Text button to be available
        await page.waitForSelector('#add-text-btn', { timeout: 15000 });
        console.log('✅ Add Text button found');

        // Take initial screenshot
        await page.screenshot({ path: 'workflow_test_01_initial.png', fullPage: true });

        testResults.phases[0].endTime = new Date().toISOString();
        testResults.phases[0].status = 'success';

        // Phase 2: Click Add Text to open modal
        console.log('\n📝 Phase 2: Click Add Text button to open modal');
        testResults.phases.push({
            phase: 2,
            description: 'Open text input modal',
            startTime: new Date().toISOString()
        });

        // Click the Add Text button
        await page.click('#add-text-btn');
        console.log('✅ Add Text button clicked');

        // Wait for modal or text input to appear
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Look for text input field that might appear
        const textInputFound = await page.evaluate(() => {
            // Check for common text input selectors
            const selectors = [
                '#text-input',
                'input[type="text"]',
                'input[placeholder*="텍스트"]',
                'input[placeholder*="text"]',
                '.text-input',
                '[data-testid="text-input"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) { // visible element
                    return {
                        found: true,
                        selector: selector,
                        id: element.id,
                        placeholder: element.placeholder
                    };
                }
            }

            return { found: false };
        });

        console.log(`🔍 Text input search result: ${JSON.stringify(textInputFound)}`);

        // Take screenshot after clicking Add Text
        await page.screenshot({ path: 'workflow_test_02_after_add_text_click.png', fullPage: true });

        testResults.phases[1].endTime = new Date().toISOString();
        testResults.phases[1].status = textInputFound.found ? 'success' : 'partial';
        testResults.phases[1].textInputInfo = textInputFound;

        // Phase 3: Add text (if input found) or continue with available interface
        console.log('\n📝 Phase 3: Add text layer');
        testResults.phases.push({
            phase: 3,
            description: 'Add text layer',
            startTime: new Date().toISOString()
        });

        if (textInputFound.found) {
            // Found a text input, use it
            console.log(`✅ Using text input: ${textInputFound.selector}`);
            await page.click(textInputFound.selector, { clickCount: 3 });
            await page.type(textInputFound.selector, 'Final Test');
            console.log('✅ Text entered: "Final Test"');

            // Look for submit/confirm button
            const confirmButton = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
                for (const btn of buttons) {
                    const text = btn.textContent || btn.value;
                    if (text && (text.includes('확인') || text.includes('추가') || text.includes('OK') || text.includes('Add') || text.includes('Submit'))) {
                        return {
                            found: true,
                            id: btn.id,
                            text: text,
                            tagName: btn.tagName
                        };
                    }
                }
                return { found: false };
            });

            if (confirmButton.found) {
                console.log(`✅ Found confirm button: ${confirmButton.text}`);
                if (confirmButton.id) {
                    await page.click(`#${confirmButton.id}`);
                } else {
                    // Click by text content
                    await page.evaluate((buttonText) => {
                        const buttons = document.querySelectorAll('button');
                        for (const btn of buttons) {
                            if (btn.textContent.includes(buttonText)) {
                                btn.click();
                                return;
                            }
                        }
                    }, confirmButton.text);
                }
                console.log('✅ Confirm button clicked');
            }
        } else {
            console.log('⚠️ No text input found, checking if layer was added automatically');
        }

        // Wait for layer processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if text layer was added
        const layerCheck = await page.evaluate(() => {
            if (window.layerManager && window.layerManager.layers) {
                const textLayers = window.layerManager.layers.filter(l => l.type === 'text');
                return {
                    layerManagerExists: true,
                    totalLayers: window.layerManager.layers.length,
                    textLayers: textLayers.length,
                    textLayerContent: textLayers.length > 0 ? textLayers[0].text : null
                };
            }
            return {
                layerManagerExists: false,
                totalLayers: 0,
                textLayers: 0,
                textLayerContent: null
            };
        });

        console.log(`📊 Layer status: ${JSON.stringify(layerCheck)}`);

        // Take screenshot after text addition attempt
        await page.screenshot({ path: 'workflow_test_03_after_text_addition.png', fullPage: true });

        testResults.phases[2].endTime = new Date().toISOString();
        testResults.phases[2].status = layerCheck.textLayers > 0 ? 'success' : 'failed';
        testResults.phases[2].layerInfo = layerCheck;

        // Phase 4: Open Order Form
        console.log('\n📤 Phase 4: Click Order Form button');
        testResults.phases.push({
            phase: 4,
            description: 'Open order form',
            startTime: new Date().toISOString()
        });

        // Click the Order Form button (주문서 작성)
        await page.click('#order-btn');
        console.log('✅ Order Form button clicked');

        // Wait for form to appear
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if contact form appeared
        const formCheck = await page.evaluate(() => {
            const form = document.querySelector('#contact-form') ||
                         document.querySelector('.contact-form') ||
                         document.querySelector('form');

            if (form) {
                const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
                return {
                    formFound: true,
                    inputCount: inputs.length,
                    hasName: !!form.querySelector('#name, input[name="name"]'),
                    hasEmail: !!form.querySelector('#email, input[name="email"]'),
                    hasPhone: !!form.querySelector('#phone, input[name="phone"]'),
                    hasAddress: !!form.querySelector('#address, input[name="address"], textarea[name="address"]')
                };
            }
            return { formFound: false };
        });

        console.log(`📋 Form check: ${JSON.stringify(formCheck)}`);

        // Take screenshot after opening form
        await page.screenshot({ path: 'workflow_test_04_order_form_opened.png', fullPage: true });

        testResults.phases[3].endTime = new Date().toISOString();
        testResults.phases[3].status = formCheck.formFound ? 'success' : 'failed';
        testResults.phases[3].formInfo = formCheck;

        // Phase 5: Fill and submit form (if found)
        console.log('\n📝 Phase 5: Fill and submit order form');
        testResults.phases.push({
            phase: 5,
            description: 'Fill and submit form',
            startTime: new Date().toISOString()
        });

        if (formCheck.formFound) {
            // Fill form fields
            const fieldSelectors = [
                { selector: '#name, input[name="name"]', value: 'Final Test User' },
                { selector: '#email, input[name="email"]', value: 'finaltest@example.com' },
                { selector: '#phone, input[name="phone"]', value: '555-0123' },
                { selector: '#address, input[name="address"], textarea[name="address"]', value: '123 Test Street, Test City, TC 12345' }
            ];

            for (const field of fieldSelectors) {
                try {
                    const element = await page.$(field.selector);
                    if (element) {
                        await element.click({ clickCount: 3 });
                        await element.type(field.value);
                        console.log(`✅ Filled field: ${field.selector}`);
                    }
                } catch (e) {
                    console.log(`⚠️ Could not fill field: ${field.selector}`);
                }
            }

            // Take screenshot before submission
            await page.screenshot({ path: 'workflow_test_05_form_filled.png', fullPage: true });

            // Count requests before submission
            const preSubmissionRequests = testResults.serverResponses.length;

            // Click submit button
            try {
                await page.click('#submit-btn');
                console.log('✅ Submit button clicked');
            } catch (e) {
                console.log('⚠️ Could not click #submit-btn, trying alternative');
                // Try to find any submit button
                await page.evaluate(() => {
                    const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], .submit-btn');
                    if (submitButtons.length > 0) {
                        submitButtons[0].click();
                    }
                });
            }

            // Wait for submission to process
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Count new requests
            const postSubmissionRequests = testResults.serverResponses.length - preSubmissionRequests;
            console.log(`📊 Network requests during submission: ${postSubmissionRequests}`);

            // Check for result messages
            const submissionResult = await page.evaluate(() => {
                const successMessage = document.querySelector('.success-message, .alert-success');
                const errorMessage = document.querySelector('.error-message, .alert-error');

                return {
                    hasSuccess: !!successMessage,
                    hasError: !!errorMessage,
                    successText: successMessage ? successMessage.textContent : null,
                    errorText: errorMessage ? errorMessage.textContent : null
                };
            });

            console.log(`📋 Submission result: ${JSON.stringify(submissionResult)}`);

            testResults.phases[4].submissionResult = submissionResult;
            testResults.phases[4].networkRequestsCount = postSubmissionRequests;
            testResults.phases[4].status = submissionResult.hasSuccess ? 'success' :
                                          submissionResult.hasError ? 'error' : 'unknown';
        } else {
            testResults.phases[4].status = 'skipped';
            console.log('⚠️ No form found, skipping submission');
        }

        testResults.phases[4].endTime = new Date().toISOString();

        // Take final screenshot
        await page.screenshot({ path: 'workflow_test_06_final.png', fullPage: true });

        // Final assessment
        const hasErrors = testResults.consoleErrors.filter(e => !e.text.includes('favicon')).length > 0;
        const textLayerWorked = testResults.phases[2]?.layerInfo?.textLayers > 0;
        const formWorked = testResults.phases[3]?.formInfo?.formFound;
        const submissionWorked = testResults.phases[4]?.submissionResult?.hasSuccess;

        if (!hasErrors && textLayerWorked && formWorked && submissionWorked) {
            testResults.finalStatus = 'fully_working';
        } else if (textLayerWorked && formWorked) {
            testResults.finalStatus = 'mostly_working';
        } else if (textLayerWorked || formWorked) {
            testResults.finalStatus = 'partially_working';
        } else {
            testResults.finalStatus = 'not_working';
        }

        console.log(`\n🏁 Final Status: ${testResults.finalStatus}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        testResults.testError = error.message;
        testResults.finalStatus = 'test_failed';
    }

    // Save detailed report
    fs.writeFileSync('workflow_test_report.json', JSON.stringify(testResults, null, 2));

    await browser.close();
    return testResults;
}

// Run the test
correctWorkflowTest().then(results => {
    console.log('\n📋 WORKFLOW TEST SUMMARY');
    console.log('=========================');
    console.log(`Overall Status: ${results.finalStatus}`);
    console.log(`Console Errors: ${results.consoleErrors.length}`);
    console.log(`Network Errors: ${results.networkErrors.length}`);
    console.log(`Test Phases: ${results.phases.length}`);

    console.log('\n📊 Phase Results:');
    results.phases.forEach(phase => {
        console.log(`${phase.phase}. ${phase.description}: ${phase.status || 'incomplete'}`);
        if (phase.layerInfo) {
            console.log(`   ├─ Text Layers: ${phase.layerInfo.textLayers}`);
            if (phase.layerInfo.textLayerContent) {
                console.log(`   └─ Content: "${phase.layerInfo.textLayerContent}"`);
            }
        }
        if (phase.formInfo) {
            console.log(`   ├─ Form Found: ${phase.formInfo.formFound}`);
            console.log(`   └─ Input Fields: ${phase.formInfo.inputCount}`);
        }
        if (phase.submissionResult) {
            console.log(`   ├─ Success: ${phase.submissionResult.hasSuccess}`);
            console.log(`   └─ Error: ${phase.submissionResult.hasError}`);
        }
    });

    if (results.consoleErrors.length > 0) {
        console.log('\n❌ Console Errors (excluding favicon):');
        results.consoleErrors
            .filter(error => !error.text.includes('favicon'))
            .forEach((error, i) => {
                console.log(`${i + 1}. ${error.text}`);
            });
    }

    console.log('\n📸 Screenshots saved:');
    console.log('   - workflow_test_01_initial.png');
    console.log('   - workflow_test_02_after_add_text_click.png');
    console.log('   - workflow_test_03_after_text_addition.png');
    console.log('   - workflow_test_04_order_form_opened.png');
    console.log('   - workflow_test_05_form_filled.png');
    console.log('   - workflow_test_06_final.png');

    console.log('\n✅ Workflow test completed. Check screenshots and workflow_test_report.json for details.');
}).catch(error => {
    console.error('💥 Test runner failed:', error);
});