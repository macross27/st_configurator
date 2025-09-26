const { chromium } = require('playwright');

async function testPatternDebug() {
    let browser, page;

    try {
        console.log('🚀 Testing custom pattern save/restore...');

        browser = await chromium.launch({ headless: false });
        page = await browser.newPage();

        // Listen to console messages from the page
        page.on('console', msg => {
            if (msg.text().includes('🔧 DEBUG') || msg.text().includes('🔄 Applying') || msg.text().includes('✅ Restored')) {
                console.log('🌐 BROWSER:', msg.text());
            }
        });

        // Navigate to the application
        await page.goto('http://localhost:3025');
        await page.waitForSelector('#submit-btn', { timeout: 10000 });
        console.log('✅ Application loaded');

        // Make selections - focus on pattern
        await page.click('#setin-btn');
        console.log('✅ Selected Set-in');

        await page.click('#custom-1-1-btn');
        console.log('✅ Selected Custom-1-1');

        // Check what pattern is actually active before submit
        const activePatternBefore = await page.locator('.custom-pattern-btn.active').getAttribute('data-pattern');
        console.log('🔍 Active pattern BEFORE submit:', activePatternBefore);

        // Submit to save configuration
        await page.click('#submit-btn');
        console.log('✅ Submit clicked - check console for debug info');

        // Wait for submission to complete
        await page.waitForTimeout(3000);

        // Get the session URL
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);
        const sessionIdMatch = currentUrl.match(/\/([a-zA-Z0-9_-]+)$/);
        if (!sessionIdMatch) {
            throw new Error('No session ID found in URL');
        }
        const sessionId = sessionIdMatch[1];

        // Navigate to fresh page and load session
        await page.goto('http://localhost:3025');
        await page.waitForTimeout(2000);
        await page.goto(`http://localhost:3025/${sessionId}`);
        await page.waitForSelector('#submit-btn', { timeout: 10000 });
        await page.waitForTimeout(3000); // Give time for restoration

        // Check what pattern is active after restore
        const activePatternAfter = await page.locator('.custom-pattern-btn.active').getAttribute('data-pattern');
        console.log('🔍 Active pattern AFTER restore:', activePatternAfter);

        console.log('\n📊 COMPARISON:');
        console.log('   Expected: setin_custom-1-1');
        console.log('   Before submit:', activePatternBefore);
        console.log('   After restore:', activePatternAfter);
        console.log('   Match:', activePatternAfter === 'setin_custom-1-1' ? '✅' : '❌');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            console.log('🔍 Browser left open for inspection');
            // await browser.close();
        }
    }
}

testPatternDebug();