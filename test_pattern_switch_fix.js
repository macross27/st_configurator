const { chromium } = require('playwright');

async function testPatternSwitchFix() {
    console.log('🧪 Testing pattern loading fix when switching between set-in and regulan...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'log' && msg.text().includes('🎨')) {
            console.log(`PAGE: ${msg.text()}`);
        }
    });

    try {
        // Navigate to the app
        await page.goto('http://localhost:3022');
        await page.waitForTimeout(3000); // Wait for initialization

        console.log('✅ Page loaded');

        // Check initial state (should be regulan)
        const initialPattern = await page.evaluate(() => {
            return window.uniformConfigurator?.patternManager?.getCurrentPattern()?.name;
        });
        console.log('🔍 Initial pattern:', initialPattern);

        // Switch to set-in
        console.log('🔄 Switching to set-in...');
        await page.click('#setin-btn');
        await page.waitForTimeout(1000);

        // Check pattern after switch to set-in
        const setinPattern = await page.evaluate(() => {
            return window.uniformConfigurator?.patternManager?.getCurrentPattern()?.name;
        });
        console.log('🔍 Set-in pattern:', setinPattern);

        // Verify pattern changed to setin pattern
        if (setinPattern && setinPattern.includes('setin')) {
            console.log('✅ Set-in pattern loaded correctly:', setinPattern);
        } else {
            console.log('❌ Set-in pattern not loaded correctly:', setinPattern);
        }

        // Switch back to regulan
        console.log('🔄 Switching to regulan...');
        await page.click('#regulan-btn');
        await page.waitForTimeout(1000);

        // Check pattern after switch back to regulan
        const regulanPattern = await page.evaluate(() => {
            return window.uniformConfigurator?.patternManager?.getCurrentPattern()?.name;
        });
        console.log('🔍 Regulan pattern:', regulanPattern);

        // Verify pattern changed back to regulan pattern
        if (regulanPattern && regulanPattern.includes('reg')) {
            console.log('✅ Regulan pattern loaded correctly:', regulanPattern);
        } else {
            console.log('❌ Regulan pattern not loaded correctly:', regulanPattern);
        }

        // Test multiple rapid switches
        console.log('🔄 Testing rapid switches...');
        for (let i = 0; i < 3; i++) {
            await page.click('#setin-btn');
            await page.waitForTimeout(200);
            await page.click('#regulan-btn');
            await page.waitForTimeout(200);
        }

        // Final check
        const finalPattern = await page.evaluate(() => {
            return window.uniformConfigurator?.patternManager?.getCurrentPattern()?.name;
        });
        console.log('🔍 Final pattern after rapid switches:', finalPattern);

        console.log('🧪 Test completed successfully');

        // Keep browser open for manual verification
        console.log('🔍 Browser kept open for manual verification...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

testPatternSwitchFix().catch(console.error);