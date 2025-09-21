const { chromium } = require('playwright');

async function submitOrderTest() {
    console.log('🚀 Testing order submission to trigger server file logging...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const page = await browser.newPage();

    try {
        // Navigate to the application
        console.log('📱 Navigating to http://localhost:3029');
        await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });

        // Wait for the 3D scene to load
        console.log('⏳ Waiting for application to load...');
        await page.waitForTimeout(3000);

        // Add a text layer first
        console.log('📝 Adding text layer...');
        const addTextButton = page.locator('button:has-text("텍스트 추가")');
        await addTextButton.click();

        // Wait a moment for the layer to be created
        await page.waitForTimeout(2000);

        // Take a screenshot to confirm state
        await page.screenshot({ path: 'before_order_submission.png' });
        console.log('📸 Screenshot taken: before_order_submission.png');

        // Now click the Submit Order button
        console.log('📤 Clicking Submit Order (주문 제출) button...');
        const submitButton = page.locator('button:has-text("주문 제출")');
        await submitButton.click();

        // Wait for the order form modal to appear (looking for any form input)
        console.log('⏳ Waiting for order form to appear...');
        await page.waitForSelector('input, textarea, form', { timeout: 15000 });

        // Take screenshot of order form
        await page.screenshot({ path: 'order_form_appeared.png' });
        console.log('📸 Order form screenshot: order_form_appeared.png');

        // Try to find and fill common form fields
        const nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[placeholder*="이름"]').first();
        const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email"], input[placeholder*="이메일"]').first();

        if (await nameInput.count() > 0) {
            console.log('📋 Filling name field...');
            await nameInput.fill('Test User');
        }

        if (await emailInput.count() > 0) {
            console.log('📧 Filling email field...');
            await emailInput.fill('test@example.com');
        }

        // Look for any submit button in the form
        const formSubmitButton = page.locator('button[type="submit"], button:has-text("submit"), button:has-text("제출"), button:has-text("확인")').first();

        if (await formSubmitButton.count() > 0) {
            console.log('🚀 Submitting order form...');
            await formSubmitButton.click();

            // Wait for submission to complete
            await page.waitForTimeout(5000);

            console.log('✅ Order submitted - check server logs for file details');
        } else {
            console.log('❓ No submit button found, but form appeared');
        }

        // Take final screenshot
        await page.screenshot({ path: 'after_order_submission.png' });
        console.log('📸 Final screenshot: after_order_submission.png');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ path: 'submission_test_error.png' });
        console.log('📸 Error screenshot: submission_test_error.png');
    } finally {
        await browser.close();
    }
}

submitOrderTest();