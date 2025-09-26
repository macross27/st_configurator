const { chromium } = require('playwright');

async function testConfigSave() {
    let browser, page;

    try {
        console.log('🚀 Testing configuration save...');

        browser = await chromium.launch({ headless: false });
        page = await browser.newPage();

        // Listen to console messages from the page
        page.on('console', msg => {
            if (msg.text().includes('🔧 DEBUG') || msg.text().includes('🔄 Applying')) {
                console.log('🌐 BROWSER:', msg.text());
            }
        });

        // Navigate to the application
        await page.goto('http://localhost:3020');
        await page.waitForSelector('#submit-btn', { timeout: 10000 });
        console.log('✅ Application loaded');

        // Make selections
        await page.click('#long-shirt-set-btn');
        console.log('✅ Selected Long Shirt Set');

        await page.click('#setin-btn');
        console.log('✅ Selected Set-in');

        await page.click('#cft-c-btn');
        console.log('✅ Selected Comfort C');

        await page.click('#custom-1-1-btn');
        console.log('✅ Selected Custom-1-1');

        // Change some colors
        await page.fill('#neck-color-1', '#ff0000');
        await page.fill('#neck-color-2', '#00ff00');
        await page.fill('#pants-color-1', '#0000ff');
        await page.fill('#pants-color-2', '#ffff00');
        console.log('✅ Changed colors');

        // Submit to trigger configuration save
        await page.click('#submit-btn');
        console.log('✅ Submitted - check console for save debug info');

        // Wait a bit for processing
        await page.waitForTimeout(5000);

        console.log('✅ Test complete - check browser console output above');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            console.log('🔍 Browser left open for inspection');
            // await browser.close();
        }
    }
}

testConfigSave();