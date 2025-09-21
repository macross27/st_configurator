const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testApplication() {
    console.log('🚀 Starting comprehensive browser test for ST Configurator...');

    const browser = await chromium.launch({
        headless: false, // Show browser for visual verification
        slowMo: 1000 // Slow down actions for visibility
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });

        const page = await context.newPage();

        // Monitor console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
                console.log('❌ Console Error:', msg.text());
            } else if (msg.type() === 'warning') {
                console.log('⚠️ Console Warning:', msg.text());
            }
        });

        // Monitor network failures
        page.on('response', response => {
            if (!response.ok()) {
                console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
            }
        });

        console.log('📖 Navigating to http://localhost:3026...');
        await page.goto('http://localhost:3026', { waitUntil: 'networkidle' });

        // Wait a bit for initial loading
        await page.waitForTimeout(3000);

        console.log('📸 Taking initial screenshot...');
        await page.screenshot({
            path: 'C:\\Users\\macross27\\Documents\\st_configurator\\test_initial_state.png',
            fullPage: true
        });

        // Test 1: Check page title and basic elements
        console.log('\n=== TEST 1: Basic Page Structure ===');
        const title = await page.title();
        console.log('📄 Page Title:', title);

        // Test 2: Check layout structure
        console.log('\n=== TEST 2: Layout Structure ===');

        // Check for texture editor (left side)
        const textureEditor = await page.locator('#texture-editor').isVisible();
        console.log('🎨 Texture Editor visible:', textureEditor);

        // Check for 3D viewer (right side)
        const viewer3D = await page.locator('#viewer-3d, .viewer-container, canvas').first().isVisible();
        console.log('🎯 3D Viewer visible:', viewer3D);

        // Check canvas element specifically
        const canvasElements = await page.locator('canvas').count();
        console.log('🖼️ Canvas elements found:', canvasElements);

        // Test 3: Check for GLTF model in 3D viewer
        console.log('\n=== TEST 3: 3D Model Loading ===');

        // Wait for potential model loading
        await page.waitForTimeout(5000);

        // Check WebGL context
        const webglTest = await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return { hasCanvas: false };

            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return {
                hasCanvas: true,
                hasWebGL: !!gl,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                canvasStyle: canvas.style.cssText
            };
        });

        console.log('🔍 WebGL Analysis:', webglTest);

        // Test 4: Test "텍스트 추가" (Add Text) button
        console.log('\n=== TEST 4: Add Text Button ===');

        const addTextButton = page.locator('button:has-text("텍스트 추가"), button:has-text("Add Text"), #add-text-btn');
        const addTextVisible = await addTextButton.first().isVisible().catch(() => false);
        console.log('📝 Add Text Button visible:', addTextVisible);

        if (addTextVisible) {
            console.log('🖱️ Clicking Add Text button...');
            await addTextButton.first().click();
            await page.waitForTimeout(2000);

            // Check if text input or layer was created
            const textLayer = await page.locator('.layer-item, .text-layer, input[type="text"]').first().isVisible().catch(() => false);
            console.log('📄 Text layer/input created:', textLayer);

            await page.screenshot({
                path: 'C:\\Users\\macross27\\Documents\\st_configurator\\test_after_add_text.png',
                fullPage: true
            });
        }

        // Test 5: Test "주문서 작성" (Order Form) button
        console.log('\n=== TEST 5: Order Form Button ===');

        const orderFormButton = page.locator('button:has-text("주문서 작성"), button:has-text("Order Form"), #order-form-btn');
        const orderFormVisible = await orderFormButton.first().isVisible().catch(() => false);
        console.log('📋 Order Form Button visible:', orderFormVisible);

        if (orderFormVisible) {
            console.log('🖱️ Clicking Order Form button...');
            await orderFormButton.first().click();
            await page.waitForTimeout(2000);

            // Check if modal opened
            const modal = await page.locator('.modal, .order-modal, [role="dialog"]').first().isVisible().catch(() => false);
            console.log('📱 Order Modal opened:', modal);

            await page.screenshot({
                path: 'C:\\Users\\macross27\\Documents\\st_configurator\\test_order_modal.png',
                fullPage: true
            });
        }

        // Test 6: Test "주문 제출" (Submit) button
        console.log('\n=== TEST 6: Submit Button ===');

        const submitButton = page.locator('button:has-text("주문 제출"), button:has-text("Submit"), #submit-btn');
        const submitVisible = await submitButton.first().isVisible().catch(() => false);
        console.log('✉️ Submit Button visible:', submitVisible);

        if (submitVisible) {
            console.log('🖱️ Clicking Submit button...');
            await submitButton.first().click();
            await page.waitForTimeout(2000);

            // Check for submission feedback
            const feedback = await page.locator('.notification, .success-message, .error-message').first().isVisible().catch(() => false);
            console.log('📬 Submission feedback shown:', feedback);

            await page.screenshot({
                path: 'C:\\Users\\macross27\\Documents\\st_configurator\\test_after_submit.png',
                fullPage: true
            });
        }

        // Test 7: Overall layout verification
        console.log('\n=== TEST 7: Layout Verification ===');

        const layoutTest = await page.evaluate(() => {
            const textureEditor = document.querySelector('#texture-editor, .texture-editor, .left-panel');
            const viewer3D = document.querySelector('#viewer-3d, .viewer-container, .right-panel');

            return {
                textureEditor: textureEditor ? {
                    exists: true,
                    position: textureEditor.getBoundingClientRect(),
                    classes: textureEditor.className
                } : { exists: false },
                viewer3D: viewer3D ? {
                    exists: true,
                    position: viewer3D.getBoundingClientRect(),
                    classes: viewer3D.className
                } : { exists: false }
            };
        });

        console.log('📐 Layout Analysis:', JSON.stringify(layoutTest, null, 2));

        // Final screenshot
        console.log('\n📸 Taking final screenshot...');
        await page.screenshot({
            path: 'C:\\Users\\macross27\\Documents\\st_configurator\\test_final_state.png',
            fullPage: true
        });

        // Test Summary
        console.log('\n=== TEST SUMMARY ===');
        console.log('📊 Console Errors Found:', consoleErrors.length);
        if (consoleErrors.length > 0) {
            console.log('❌ Errors:', consoleErrors);
        }

        console.log('✅ Page loaded successfully');
        console.log('✅ Screenshots captured');
        console.log(`✅ WebGL Canvas: ${webglTest.hasCanvas ? 'Found' : 'Not Found'}`);
        console.log(`✅ WebGL Context: ${webglTest.hasWebGL ? 'Working' : 'Failed'}`);

        // Keep browser open for 10 seconds for manual inspection
        console.log('\n⏰ Keeping browser open for 10 seconds for manual inspection...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
        console.log('🏁 Browser test completed');
    }
}

// Run the test
testApplication().catch(console.error);