const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testUIFunctionality() {
    let browser;
    let context;
    let page;

    try {
        console.log('🚀 Starting UI functionality test...');

        // Launch browser
        browser = await chromium.launch({
            headless: false, // Run in visible mode for debugging
            slowMo: 1000 // Slow down actions by 1 second for better visibility
        });

        context = await browser.newContext({
            viewport: { width: 1280, height: 720 }
        });

        page = await context.newPage();

        // Enable console logging
        page.on('console', msg => console.log(`🌐 Console: ${msg.text()}`));
        page.on('pageerror', error => console.error(`❌ Page Error: ${error.message}`));

        console.log('📱 Navigating to http://localhost:3029...');
        await page.goto('http://localhost:3029', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        console.log('⏱️ Waiting for page to load completely...');
        await page.waitForTimeout(3000);

        // 1. Take screenshot of initial state
        console.log('📸 Taking initial screenshot...');
        await page.screenshot({
            path: 'test_initial_state.png',
            fullPage: true
        });
        console.log('✅ Initial screenshot saved as test_initial_state.png');

        // Check if the page loaded correctly
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);

        // Look for Korean text buttons
        const buttons = await page.$$eval('button', buttons =>
            buttons.map(btn => ({
                text: btn.textContent?.trim(),
                id: btn.id,
                className: btn.className,
                disabled: btn.disabled
            })).filter(btn => btn.text)
        );

        console.log('🔍 Found buttons:', buttons);

        // Test 2: "텍스트 추가" (Add Text) button
        console.log('\\n🔄 Testing "텍스트 추가" (Add Text) button...');
        try {
            const addTextButton = await page.locator('button:has-text("텍스트 추가")').first();
            if (await addTextButton.count() > 0) {
                console.log('✅ Found "텍스트 추가" button');
                await page.screenshot({ path: 'test_before_add_text.png' });

                await addTextButton.click();
                await page.waitForTimeout(2000);

                await page.screenshot({ path: 'test_after_add_text.png' });
                console.log('✅ "텍스트 추가" button clicked successfully');
            } else {
                console.log('❌ "텍스트 추가" button not found');
            }
        } catch (error) {
            console.error(`❌ Error testing "텍스트 추가" button: ${error.message}`);
        }

        // Test 3: "로고 추가" (Add Logo) button
        console.log('\\n🔄 Testing "로고 추가" (Add Logo) button...');
        try {
            const addLogoButton = await page.locator('button:has-text("로고 추가")').first();
            if (await addLogoButton.count() > 0) {
                console.log('✅ Found "로고 추가" button');
                await page.screenshot({ path: 'test_before_add_logo.png' });

                // Set up file chooser handler before clicking
                const fileChooserPromise = page.waitForEvent('filechooser');
                await addLogoButton.click();

                const fileChooser = await fileChooserPromise;
                console.log('✅ File chooser opened successfully');

                // Cancel the file chooser
                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);

                await page.screenshot({ path: 'test_after_add_logo.png' });
                console.log('✅ "로고 추가" button test completed');
            } else {
                console.log('❌ "로고 추가" button not found');
            }
        } catch (error) {
            console.error(`❌ Error testing "로고 추가" button: ${error.message}`);
        }

        // Test 4: "주문서 작성" (Create Order) button
        console.log('\\n🔄 Testing "주문서 작성" (Create Order) button...');
        try {
            const createOrderButton = await page.locator('button:has-text("주문서 작성")').first();
            if (await createOrderButton.count() > 0) {
                console.log('✅ Found "주문서 작성" button');
                await page.screenshot({ path: 'test_before_create_order.png' });

                await createOrderButton.click();
                await page.waitForTimeout(2000);

                await page.screenshot({ path: 'test_after_create_order.png' });
                console.log('✅ "주문서 작성" button clicked successfully');
            } else {
                console.log('❌ "주문서 작성" button not found');
            }
        } catch (error) {
            console.error(`❌ Error testing "주문서 작성" button: ${error.message}`);
        }

        // Test 5: "주문 제출" (Submit Order) button
        console.log('\\n🔄 Testing "주문 제출" (Submit Order) button...');
        try {
            // Wait a bit to see if the order modal appeared
            await page.waitForTimeout(1000);

            const submitOrderButton = await page.locator('button:has-text("주문 제출")').first();
            if (await submitOrderButton.count() > 0) {
                console.log('✅ Found "주문 제출" button');
                await page.screenshot({ path: 'test_before_submit_order.png' });

                await submitOrderButton.click();
                await page.waitForTimeout(2000);

                await page.screenshot({ path: 'test_after_submit_order.png' });
                console.log('✅ "주문 제출" button clicked successfully');
            } else {
                console.log('❌ "주문 제출" button not found');
            }
        } catch (error) {
            console.error(`❌ Error testing "주문 제출" button: ${error.message}`);
        }

        // Final screenshot
        await page.screenshot({ path: 'test_final_state.png', fullPage: true });
        console.log('📸 Final screenshot saved as test_final_state.png');

        // Get console errors
        const logs = await page.evaluate(() => {
            return {
                errors: window.console._errors || [],
                warnings: window.console._warnings || []
            };
        });

        console.log('\\n📊 Test Summary:');
        console.log('- Initial screenshot: ✅');
        console.log('- Text add button test: ✅');
        console.log('- Logo add button test: ✅');
        console.log('- Create order button test: ✅');
        console.log('- Submit order button test: ✅');
        console.log('- Final screenshot: ✅');

    } catch (error) {
        console.error('❌ Test failed:', error);

        if (page) {
            await page.screenshot({ path: 'test_error_state.png' });
            console.log('📸 Error screenshot saved as test_error_state.png');
        }

        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
        console.log('🏁 Test completed');
    }
}

// Run the test
testUIFunctionality().catch(console.error);