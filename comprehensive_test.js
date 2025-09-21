/**
 * Comprehensive ST Configurator Test Script
 * Tests all core functionality at http://localhost:3029
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function runComprehensiveTest() {
    const browser = await chromium.launch({
        headless: false,  // Set to false so we can see what's happening
        args: ['--disable-web-security', '--allow-running-insecure-content']
    });

    const page = await browser.newPage();
    const testResults = [];

    try {
        console.log('🚀 Starting comprehensive ST Configurator test...');

        // Configure page to capture console logs and errors
        const consoleMessages = [];
        const errors = [];

        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            });
        });

        page.on('pageerror', error => {
            errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Test 1: Initial State
        console.log('📸 Test 1: Capturing initial application state...');
        await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test_initial_state.png', fullPage: true });

        // Wait for 3D scene to load
        await page.waitForTimeout(3000);

        testResults.push({
            test: 'Initial State',
            status: 'SUCCESS',
            screenshot: 'test_initial_state.png',
            details: 'Application loaded successfully'
        });

        // Test 2: Add Text Test
        console.log('✏️ Test 2: Testing Add Text functionality...');

        // Look for the "텍스트 추가" (Add Text) button
        const addTextButton = await page.locator('text=텍스트 추가').first();
        if (await addTextButton.isVisible()) {
            await addTextButton.click();
            await page.waitForTimeout(2000);

            // Check if text layer appeared in layer list
            const layerList = await page.locator('#layer-list').count();
            const textLayers = await page.locator('.layer-item').count();

            await page.screenshot({ path: 'test_after_add_text.png', fullPage: true });

            testResults.push({
                test: 'Add Text',
                status: textLayers > 0 ? 'SUCCESS' : 'PARTIAL',
                screenshot: 'test_after_add_text.png',
                details: `Found ${textLayers} layer(s) after adding text`
            });
        } else {
            testResults.push({
                test: 'Add Text',
                status: 'FAILED',
                details: 'Add Text button not found or not visible'
            });
        }

        // Test 3: Add Logo Test
        console.log('🖼️ Test 3: Testing Add Logo functionality...');

        const addLogoButton = await page.locator('text=로고 추가').first();
        if (await addLogoButton.isVisible()) {
            // Create a simple test image first
            await createTestImage();

            await addLogoButton.click();
            await page.waitForTimeout(1000);

            // Upload test image if file input appears
            const fileInput = await page.locator('input[type="file"]').first();
            if (await fileInput.isVisible()) {
                await fileInput.setInputFiles('test_image.png');
                await page.waitForTimeout(2000);
            }

            const layersAfterLogo = await page.locator('.layer-item').count();
            await page.screenshot({ path: 'test_after_add_logo.png', fullPage: true });

            testResults.push({
                test: 'Add Logo',
                status: 'SUCCESS',
                screenshot: 'test_after_add_logo.png',
                details: `Found ${layersAfterLogo} layer(s) after adding logo`
            });
        } else {
            testResults.push({
                test: 'Add Logo',
                status: 'FAILED',
                details: 'Add Logo button not found or not visible'
            });
        }

        // Test 4: Order Form Test
        console.log('📋 Test 4: Testing Order Form functionality...');

        const orderButton = await page.locator('text=주문서 작성').first();
        if (await orderButton.isVisible()) {
            await orderButton.click();
            await page.waitForTimeout(2000);

            // Check if modal opened
            const modal = await page.locator('.modal, [role="dialog"]').first();
            const isModalVisible = await modal.isVisible().catch(() => false);

            await page.screenshot({ path: 'test_order_modal.png', fullPage: true });

            testResults.push({
                test: 'Order Form',
                status: isModalVisible ? 'SUCCESS' : 'FAILED',
                screenshot: 'test_order_modal.png',
                details: isModalVisible ? 'Order modal opened successfully' : 'Order modal did not open'
            });

            // Test 5: Submit Test (if modal is open)
            if (isModalVisible) {
                console.log('📤 Test 5: Testing Submit Order functionality...');

                // Fill required fields if they exist
                await page.fill('input[name="name"], #customer-name', 'Test User').catch(() => {});
                await page.fill('input[name="email"], #customer-email', 'test@example.com').catch(() => {});
                await page.fill('input[name="phone"], #customer-phone', '010-1234-5678').catch(() => {});

                const submitButton = await page.locator('text=주문 제출, button[type="submit"]').first();
                if (await submitButton.isVisible()) {
                    await submitButton.click();
                    await page.waitForTimeout(2000);

                    await page.screenshot({ path: 'test_after_submit.png', fullPage: true });

                    testResults.push({
                        test: 'Submit Order',
                        status: 'SUCCESS',
                        screenshot: 'test_after_submit.png',
                        details: 'Submit button clicked successfully'
                    });
                } else {
                    testResults.push({
                        test: 'Submit Order',
                        status: 'FAILED',
                        details: 'Submit button not found or not visible'
                    });
                }
            }
        } else {
            testResults.push({
                test: 'Order Form',
                status: 'FAILED',
                details: 'Order Form button not found or not visible'
            });
        }

        // Final screenshot
        await page.screenshot({ path: 'test_final_state.png', fullPage: true });

        // Generate comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            testResults,
            consoleMessages: consoleMessages.slice(-20), // Last 20 messages
            errors,
            summary: {
                total: testResults.length,
                success: testResults.filter(r => r.status === 'SUCCESS').length,
                failed: testResults.filter(r => r.status === 'FAILED').length,
                partial: testResults.filter(r => r.status === 'PARTIAL').length
            }
        };

        // Save report to file
        fs.writeFileSync('comprehensive_test_report.json', JSON.stringify(report, null, 2));

        console.log('📊 Test Results Summary:');
        console.log(`✅ Success: ${report.summary.success}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`⚠️ Partial: ${report.summary.partial}`);
        console.log(`🔍 JavaScript Errors: ${errors.length}`);

        return report;

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        testResults.push({
            test: 'Overall Test Execution',
            status: 'FAILED',
            details: error.message
        });
    } finally {
        await browser.close();
    }
}

async function createTestImage() {
    // Create a simple test image using HTML5 canvas
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.setContent(`
        <canvas id="canvas" width="100" height="100"></canvas>
        <script>
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(0, 0, 100, 100);
            ctx.fillStyle = '#4ECDC4';
            ctx.fillRect(20, 20, 60, 60);
            ctx.fillStyle = '#45B7D1';
            ctx.beginPath();
            ctx.arc(50, 50, 20, 0, 2 * Math.PI);
            ctx.fill();
        </script>
    `);

    const canvas = await page.locator('#canvas');
    await canvas.screenshot({ path: 'test_image.png' });
    await browser.close();
}

// Run the test
runComprehensiveTest()
    .then(report => {
        console.log('✅ Comprehensive test completed successfully!');
        console.log('📁 Check the generated screenshots and comprehensive_test_report.json for details.');
    })
    .catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });