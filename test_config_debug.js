const { chromium } = require('playwright');

async function testConfigurationDebug() {
    let browser, page;

    try {
        console.log('🚀 Starting configuration debug test...');

        browser = await chromium.launch({ headless: false });
        page = await browser.newPage();

        // Listen to console messages from the page
        page.on('console', msg => {
            if (msg.text().includes('🔧')) {
                console.log('🌐 BROWSER:', msg.text());
            }
        });

        // Navigate to the application
        await page.goto('http://localhost:3020');
        await page.waitForSelector('#submit-btn', { timeout: 10000 });
        console.log('✅ Application loaded');

        // Make some selections
        await page.click('#long-shirt-set-btn');
        await page.click('#setin-btn');
        // Note: body color picker was removed, but neck colors remain
        await page.fill('#neck-color-1', '#ff0000');
        console.log('✅ Made selections');

        // Submit and check debug output
        await page.click('#submit-btn');

        // Wait a bit for processing
        await page.waitForTimeout(5000);

        console.log('✅ Submit completed - check browser console above for debug info');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            // Keep browser open to see console
            console.log('🔍 Browser left open for inspection - close manually');
            // await browser.close();
        }
    }
}

testConfigurationDebug();