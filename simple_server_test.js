const { chromium } = require('playwright');

async function testApplication() {
    console.log('🚀 Starting application test to trigger server logs...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000  // Slow down for better visibility
    });

    const page = await browser.newPage();

    try {
        // Navigate to the application
        console.log('📱 Navigating to http://localhost:3029');
        await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });

        // Wait for the 3D scene to load
        console.log('⏳ Waiting for 3D scene to load...');
        await page.waitForTimeout(3000);

        // Take a screenshot for verification
        await page.screenshot({ path: 'test_app_loaded.png' });
        console.log('📸 Screenshot taken: test_app_loaded.png');

        // Click "Add Text Layer" button (in Korean: "텍스트 추가")
        console.log('📝 Clicking Add Text Layer button...');
        const addTextButton = page.locator('button:has-text("텍스트 추가")');
        await addTextButton.click();

        // Wait for the text input modal
        await page.waitForSelector('#textInput', { timeout: 10000 });
        console.log('✅ Text input modal appeared');

        // Enter text
        console.log('✏️ Entering text "Server Debug"');
        await page.fill('#textInput', 'Server Debug');

        // Click confirm
        await page.click('button:has-text("Confirm")');
        console.log('✅ Text layer added');

        // Wait for the layer to be processed
        await page.waitForTimeout(2000);

        // Take another screenshot
        await page.screenshot({ path: 'test_text_added.png' });
        console.log('📸 Screenshot taken: test_text_added.png');

        // Now submit an order (in Korean: "주문 제출")
        console.log('📤 Clicking Submit Order button...');
        const submitButton = page.locator('button:has-text("주문 제출")');
        await submitButton.click();

        // Wait for the order form
        await page.waitForSelector('input[name="name"]', { timeout: 10000 });
        console.log('✅ Order form appeared');

        // Fill out the form
        console.log('📋 Filling out order form...');
        await page.fill('input[name="name"]', 'Test User');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="phone"]', '555-1234');
        await page.fill('textarea[name="notes"]', 'Server debug test order');

        // Submit the form
        console.log('🚀 Submitting order form...');
        await page.click('button[type="submit"]');

        // Wait for submission to complete
        await page.waitForTimeout(3000);

        // Take final screenshot
        await page.screenshot({ path: 'test_order_submitted.png' });
        console.log('📸 Screenshot taken: test_order_submitted.png');

        console.log('✅ Test completed successfully');
        console.log('📊 Check the server console for detailed file reception logs');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ path: 'test_error.png' });
        console.log('📸 Error screenshot taken: test_error.png');
    } finally {
        await browser.close();
    }
}

testApplication();