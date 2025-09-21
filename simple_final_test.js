const puppeteer = require('puppeteer');
const fs = require('fs');

async function simpleFinalTest() {
    console.log('🚀 Starting Simple Final Test - Text Layer and Form Submission');

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

    // Capture network responses
    page.on('response', response => {
        const responseData = {
            url: response.url(),
            status: response.status(),
            timestamp: new Date().toISOString()
        };

        testResults.serverResponses.push(responseData);

        if (response.status() >= 400) {
            testResults.networkErrors.push(responseData);
            console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
        }
    });

    try {
        // Phase 1: Navigate and wait for basic UI
        console.log('\n📍 Phase 1: Navigating to application');
        testResults.phases.push({
            phase: 1,
            description: 'Navigate to application',
            startTime: new Date().toISOString()
        });

        await page.goto('http://localhost:3029', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // Wait for the text input to be available
        await page.waitForSelector('#text-input', { timeout: 10000 });
        await page.waitForSelector('#add-text-btn', { timeout: 5000 });

        console.log('✅ Basic UI elements loaded');

        // Take initial screenshot
        await page.screenshot({ path: 'simple_test_initial.png', fullPage: true });

        testResults.phases[0].endTime = new Date().toISOString();
        testResults.phases[0].status = 'success';

        // Phase 2: Add text layer (without waiting for 3D)
        console.log('\n📝 Phase 2: Adding text layer');
        testResults.phases.push({
            phase: 2,
            description: 'Add text layer',
            startTime: new Date().toISOString()
        });

        // Clear and enter text
        await page.click('#text-input', { clickCount: 3 });
        await page.type('#text-input', 'Final Test');

        console.log('✅ Text entered: "Final Test"');

        // Click add text button
        await page.click('#add-text-btn');

        // Wait a bit for the text to be processed
        await page.waitForTimeout(3000);

        // Take screenshot after adding text
        await page.screenshot({ path: 'simple_test_after_text.png', fullPage: true });

        // Check if layerManager exists and has text layers
        const textLayerCheck = await page.evaluate(() => {
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

        console.log(`✅ Layer check: ${JSON.stringify(textLayerCheck)}`);

        testResults.phases[1].endTime = new Date().toISOString();
        testResults.phases[1].status = textLayerCheck.textLayers > 0 ? 'success' : 'failed';
        testResults.phases[1].layerInfo = textLayerCheck;

        // Phase 3: Fill and submit form
        console.log('\n📤 Phase 3: Filling and submitting form');
        testResults.phases.push({
            phase: 3,
            description: 'Submit form',
            startTime: new Date().toISOString()
        });

        // Wait for form elements
        await page.waitForSelector('#contact-form', { timeout: 5000 });

        // Fill form fields
        await page.type('#name', 'Final Test User');
        await page.type('#email', 'finaltest@example.com');
        await page.type('#phone', '555-0123');
        await page.type('#address', '123 Test Street, Test City, TC 12345');

        console.log('✅ Form fields filled');

        // Take screenshot before submission
        await page.screenshot({ path: 'simple_test_before_submit.png', fullPage: true });

        // Count requests before submission
        const preSubmissionRequests = testResults.serverResponses.length;

        // Click submit button
        await page.click('#submit-btn');
        console.log('🔄 Form submitted');

        // Wait for submission response
        await page.waitForTimeout(5000);

        // Check for response messages
        const submissionResult = await page.evaluate(() => {
            const successMessage = document.querySelector('.success-message');
            const errorMessage = document.querySelector('.error-message');

            return {
                hasSuccess: !!successMessage,
                hasError: !!errorMessage,
                successText: successMessage ? successMessage.textContent : null,
                errorText: errorMessage ? errorMessage.textContent : null
            };
        });

        // Count new requests after submission
        const postSubmissionRequests = testResults.serverResponses.length - preSubmissionRequests;
        console.log(`📊 New network requests during submission: ${postSubmissionRequests}`);

        // Take final screenshot
        await page.screenshot({ path: 'simple_test_final.png', fullPage: true });

        let submissionStatus = 'unknown';
        if (submissionResult.hasSuccess) {
            submissionStatus = 'success';
            console.log('✅ Success message found');
        } else if (submissionResult.hasError) {
            submissionStatus = 'error';
            console.log('❌ Error message found');
        } else {
            console.log('⚠️ No clear success/error message');
        }

        testResults.phases[2].endTime = new Date().toISOString();
        testResults.phases[2].status = submissionStatus;
        testResults.phases[2].submissionResult = submissionResult;
        testResults.phases[2].networkRequestsCount = postSubmissionRequests;

        // Final assessment
        const hasErrors = testResults.consoleErrors.length > 0 || testResults.networkErrors.length > 0;
        const textLayerWorked = textLayerCheck.textLayers > 0;
        const submissionWorked = submissionStatus === 'success';

        if (!hasErrors && textLayerWorked && submissionWorked) {
            testResults.finalStatus = 'all_working';
        } else if (textLayerWorked && submissionWorked) {
            testResults.finalStatus = 'minor_issues';
        } else if (textLayerWorked || submissionWorked) {
            testResults.finalStatus = 'partial_working';
        } else {
            testResults.finalStatus = 'major_issues';
        }

        console.log(`\n🏁 Final Status: ${testResults.finalStatus}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        testResults.testError = error.message;
        testResults.finalStatus = 'test_failed';
    }

    // Save report
    fs.writeFileSync('simple_test_report.json', JSON.stringify(testResults, null, 2));

    await browser.close();
    return testResults;
}

// Run the test
simpleFinalTest().then(results => {
    console.log('\n📋 SIMPLE TEST SUMMARY');
    console.log('=======================');
    console.log(`Overall Status: ${results.finalStatus}`);
    console.log(`Console Errors: ${results.consoleErrors.length}`);
    console.log(`Network Errors: ${results.networkErrors.length}`);
    console.log(`Test Phases: ${results.phases.length}`);

    console.log('\n📊 Phase Results:');
    results.phases.forEach(phase => {
        console.log(`${phase.phase}. ${phase.description}: ${phase.status}`);
        if (phase.layerInfo) {
            console.log(`   - Text Layers: ${phase.layerInfo.textLayers}`);
            console.log(`   - Layer Content: ${phase.layerInfo.textLayerContent}`);
        }
        if (phase.submissionResult) {
            console.log(`   - Has Success: ${phase.submissionResult.hasSuccess}`);
            console.log(`   - Has Error: ${phase.submissionResult.hasError}`);
        }
    });

    if (results.consoleErrors.length > 0) {
        console.log('\n❌ Console Errors:');
        results.consoleErrors.forEach((error, i) => {
            console.log(`${i + 1}. ${error.text}`);
        });
    }

    if (results.networkErrors.length > 0) {
        console.log('\n🌐 Network Errors:');
        results.networkErrors.forEach((error, i) => {
            console.log(`${i + 1}. ${error.status} ${error.url}`);
        });
    }

    console.log('\n✅ Simple test completed. Check screenshots and simple_test_report.json for details.');
}).catch(error => {
    console.error('💥 Test runner failed:', error);
});