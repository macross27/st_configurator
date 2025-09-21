const { chromium } = require('playwright');

async function testServerDebug() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('🚀 Starting server debug test...');

        // Navigate to the application
        console.log('📱 Navigating to http://localhost:3029');
        await page.goto('http://localhost:3029');

        // Wait for the application to load
        await page.waitForSelector('canvas', { timeout: 10000 });
        console.log('✅ Application loaded successfully');

        // Wait a moment for the scene to fully initialize
        await page.waitForTimeout(2000);

        // Click "Add Text Layer" button
        console.log('📝 Adding text layer...');
        await page.click('button:has-text("Add Text Layer")');

        // Wait for the text input modal to appear
        await page.waitForSelector('#textInput', { timeout: 5000 });

        // Enter the test text
        console.log('✏️ Entering text "Server Debug"');
        await page.fill('#textInput', 'Server Debug');

        // Click confirm to add the text layer
        await page.click('button:has-text("Confirm")');
        console.log('✅ Text layer added');

        // Wait a moment for the layer to be added
        await page.waitForTimeout(1000);

        // Click the "Submit Order" button
        console.log('📤 Submitting order...');
        await page.click('button:has-text("Submit Order")');

        // Wait for the order form modal to appear
        await page.waitForSelector('input[name="name"]', { timeout: 5000 });

        // Fill out the order form
        console.log('📋 Filling order form...');
        await page.fill('input[name="name"]', 'Test User');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="phone"]', '555-1234');
        await page.fill('textarea[name="notes"]', 'Server debug test order');

        // Submit the form
        console.log('🚀 Submitting form...');
        await page.click('button[type="submit"]');

        // Wait for the submission to complete
        await page.waitForTimeout(3000);

        console.log('✅ Test completed successfully');
        console.log('📊 Check the server logs for file reception details');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testServerDebug();