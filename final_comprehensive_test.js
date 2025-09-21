const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function comprehensiveFinalTest() {
    console.log('🚀 Starting Final Comprehensive Test of ST Configurator');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const testReport = {
        timestamp: new Date().toISOString(),
        testPhases: [],
        consoleErrors: [],
        networkErrors: [],
        serverResponses: [],
        screenshots: [],
        finalStatus: 'unknown'
    };

    // Capture console messages
    page.on('console', msg => {
        const logEntry = {
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        };

        if (msg.type() === 'error') {
            testReport.consoleErrors.push(logEntry);
        }

        console.log(`Console ${msg.type()}: ${msg.text()}`);
    });

    // Capture network requests and responses
    page.on('response', response => {
        const responseData = {
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            timestamp: new Date().toISOString()
        };

        testReport.serverResponses.push(responseData);

        if (response.status() >= 400) {
            testReport.networkErrors.push(responseData);
            console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
        } else {
            console.log(`✅ Network Success: ${response.status()} ${response.url()}`);
        }
    });

    try {
        // Phase 1: Navigate to application
        console.log('\n📍 Phase 1: Navigating to http://localhost:3029');
        testReport.testPhases.push({
            phase: 1,
            description: 'Navigate to application',
            startTime: new Date().toISOString()
        });

        await page.goto('http://localhost:3029', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Take initial screenshot
        const initialScreenshot = 'test_final_initial.png';
        await page.screenshot({ path: initialScreenshot, fullPage: true });
        testReport.screenshots.push(initialScreenshot);
        console.log('📸 Initial screenshot taken');

        // Wait for Three.js to load
        await page.waitForFunction(() => {
            return window.THREE !== undefined;
        }, { timeout: 10000 });

        console.log('✅ Three.js loaded successfully');

        // Wait for scene manager
        await page.waitForFunction(() => {
            return window.sceneManager !== undefined;
        }, { timeout: 10000 });

        console.log('✅ Scene Manager loaded successfully');

        testReport.testPhases[0].endTime = new Date().toISOString();
        testReport.testPhases[0].status = 'success';

        // Phase 2: Add text layer
        console.log('\n📝 Phase 2: Adding text layer with "Final Test"');
        testReport.testPhases.push({
            phase: 2,
            description: 'Add text layer',
            startTime: new Date().toISOString()
        });

        // Wait for UI to be ready
        await page.waitForSelector('#text-input', { timeout: 10000 });
        await page.waitForSelector('#add-text-btn', { timeout: 10000 });

        // Clear and enter text
        await page.click('#text-input', { clickCount: 3 });
        await page.type('#text-input', 'Final Test');

        console.log('✅ Text entered: "Final Test"');

        // Click add text button
        await page.click('#add-text-btn');

        // Wait for text layer to be added
        await page.waitForTimeout(2000);

        // Take screenshot after adding text
        const afterTextScreenshot = 'test_final_after_text.png';
        await page.screenshot({ path: afterTextScreenshot, fullPage: true });
        testReport.screenshots.push(afterTextScreenshot);
        console.log('📸 Screenshot after adding text taken');

        // Verify text layer was added
        const textLayers = await page.evaluate(() => {
            return window.layerManager ? window.layerManager.layers.filter(l => l.type === 'text').length : 0;
        });

        console.log(`✅ Text layers count: ${textLayers}`);

        testReport.testPhases[1].endTime = new Date().toISOString();
        testReport.testPhases[1].status = textLayers > 0 ? 'success' : 'failed';
        testReport.testPhases[1].textLayersCount = textLayers;

        // Phase 3: Submit form
        console.log('\n📤 Phase 3: Submitting form and monitoring responses');
        testReport.testPhases.push({
            phase: 3,
            description: 'Submit form',
            startTime: new Date().toISOString()
        });

        // Fill out form fields
        await page.waitForSelector('#contact-form', { timeout: 10000 });

        // Fill name field
        await page.type('#name', 'Final Test User');

        // Fill email field
        await page.type('#email', 'finaltest@example.com');

        // Fill phone field
        await page.type('#phone', '555-0123');

        // Fill address field
        await page.type('#address', '123 Test Street, Test City, TC 12345');

        console.log('✅ Form fields filled');

        // Take screenshot before submission
        const beforeSubmitScreenshot = 'test_final_before_submit.png';
        await page.screenshot({ path: beforeSubmitScreenshot, fullPage: true });
        testReport.screenshots.push(beforeSubmitScreenshot);
        console.log('📸 Screenshot before submission taken');

        // Monitor network activity before submission
        const preSubmissionResponses = testReport.serverResponses.length;

        // Click submit button
        await page.click('#submit-btn');

        console.log('🔄 Form submitted, monitoring responses...');

        // Wait for submission to complete (up to 10 seconds)
        await page.waitForTimeout(5000);

        // Check for success/error messages
        const successMessage = await page.$('.success-message');
        const errorMessage = await page.$('.error-message');

        let submissionResult = 'unknown';
        if (successMessage) {
            submissionResult = 'success';
            console.log('✅ Success message found');
        } else if (errorMessage) {
            submissionResult = 'error';
            console.log('❌ Error message found');
        } else {
            console.log('⚠️ No clear success/error message found');
        }

        // Take final screenshot
        const finalScreenshot = 'test_final_complete.png';
        await page.screenshot({ path: finalScreenshot, fullPage: true });
        testReport.screenshots.push(finalScreenshot);
        console.log('📸 Final screenshot taken');

        // Check post-submission network responses
        const postSubmissionResponses = testReport.serverResponses.length - preSubmissionResponses;
        console.log(`📊 Network requests during submission: ${postSubmissionResponses}`);

        testReport.testPhases[2].endTime = new Date().toISOString();
        testReport.testPhases[2].status = submissionResult;
        testReport.testPhases[2].networkRequestsCount = postSubmissionResponses;

        // Phase 4: Final analysis
        console.log('\n🔍 Phase 4: Analyzing results');
        testReport.testPhases.push({
            phase: 4,
            description: 'Final analysis',
            startTime: new Date().toISOString()
        });

        // Get final application state
        const finalState = await page.evaluate(() => {
            return {
                layersCount: window.layerManager ? window.layerManager.layers.length : 0,
                textLayersCount: window.layerManager ? window.layerManager.layers.filter(l => l.type === 'text').length : 0,
                sceneLoaded: !!window.sceneManager,
                threeJsLoaded: !!window.THREE,
                currentUrl: window.location.href,
                documentReadyState: document.readyState
            };
        });

        testReport.finalState = finalState;
        testReport.testPhases[3].endTime = new Date().toISOString();
        testReport.testPhases[3].status = 'completed';

        // Determine overall test status
        const hasErrors = testReport.consoleErrors.length > 0 || testReport.networkErrors.length > 0;
        const submissionWorked = submissionResult === 'success';
        const textLayerAdded = textLayers > 0;

        if (!hasErrors && submissionWorked && textLayerAdded) {
            testReport.finalStatus = 'all_systems_working';
        } else if (textLayerAdded && !hasErrors) {
            testReport.finalStatus = 'partial_success';
        } else {
            testReport.finalStatus = 'issues_detected';
        }

        console.log(`\n🏁 Final Test Status: ${testReport.finalStatus}`);

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        testReport.testError = error.message;
        testReport.finalStatus = 'test_failed';
    }

    // Save detailed report
    fs.writeFileSync('final_test_report.json', JSON.stringify(testReport, null, 2));
    console.log('📄 Detailed report saved to final_test_report.json');

    await browser.close();

    return testReport;
}

// Run the test
comprehensiveFinalTest().then(report => {
    console.log('\n📋 FINAL TEST SUMMARY');
    console.log('======================');
    console.log(`Overall Status: ${report.finalStatus}`);
    console.log(`Console Errors: ${report.consoleErrors.length}`);
    console.log(`Network Errors: ${report.networkErrors.length}`);
    console.log(`Screenshots Taken: ${report.screenshots.length}`);
    console.log(`Test Phases Completed: ${report.testPhases.length}`);

    if (report.finalState) {
        console.log('\n📊 Final Application State:');
        console.log(`- Total Layers: ${report.finalState.layersCount}`);
        console.log(`- Text Layers: ${report.finalState.textLayersCount}`);
        console.log(`- Scene Loaded: ${report.finalState.sceneLoaded}`);
        console.log(`- Three.js Loaded: ${report.finalState.threeJsLoaded}`);
    }

    if (report.consoleErrors.length > 0) {
        console.log('\n❌ Console Errors Found:');
        report.consoleErrors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.text}`);
        });
    }

    if (report.networkErrors.length > 0) {
        console.log('\n🌐 Network Errors Found:');
        report.networkErrors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.status} ${error.url}`);
        });
    }

    console.log('\n✅ Test completed. Check screenshots and final_test_report.json for details.');
}).catch(error => {
    console.error('💥 Test runner failed:', error);
});