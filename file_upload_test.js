const { chromium } = require('playwright');
const fs = require('fs');

async function createTestImage() {
    // Create a simple test image file (1x1 pixel PNG)
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    fs.writeFileSync('test_image.png', pngBuffer);
    console.log('✅ Created test image: test_image.png');
}

async function testFileUpload() {
    console.log('🚀 Testing file upload to trigger server file reception logging...');

    // Create test image
    createTestImage();

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const page = await browser.newPage();

    try {
        // Navigate to the application
        console.log('📱 Navigating to http://localhost:3030'); // Direct to backend
        await page.goto('http://localhost:3030', { waitUntil: 'networkidle' });

        // Wait for page to load
        await page.waitForTimeout(2000);

        console.log('⚠️  Note: We\'re testing the backend directly - this may not have a UI');
        console.log('📊 The main goal is to trigger server-side file processing logs');

    } catch (error) {
        console.error('❌ Direct backend test failed (expected):', error.message);
    }

    try {
        // Try the frontend
        console.log('📱 Trying frontend at http://localhost:3029');
        await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });

        // Wait for application to load
        await page.waitForTimeout(3000);

        // Try to add a logo layer (which involves file upload)
        console.log('🖼️  Clicking Add Logo (로고 추가) button...');
        const addLogoButton = page.locator('button:has-text("로고 추가")');
        await addLogoButton.click();

        // Wait for file input to appear
        await page.waitForTimeout(1000);

        // Look for file input
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.count() > 0) {
            console.log('📁 File input found, uploading test image...');
            await fileInput.setInputFiles('test_image.png');

            // Wait for upload processing
            await page.waitForTimeout(3000);

            console.log('✅ File uploaded successfully');
        } else {
            console.log('❓ No file input found after clicking logo button');
        }

        // Take screenshot of current state
        await page.screenshot({ path: 'file_upload_test_result.png' });
        console.log('📸 Screenshot: file_upload_test_result.png');

    } catch (error) {
        console.error('❌ Frontend file upload test failed:', error.message);
        await page.screenshot({ path: 'file_upload_error.png' });
    } finally {
        await browser.close();

        // Clean up test file
        try {
            fs.unlinkSync('test_image.png');
            console.log('🧹 Cleaned up test image file');
        } catch (err) {
            console.log('⚠️  Could not clean up test image file');
        }
    }
}

testFileUpload();