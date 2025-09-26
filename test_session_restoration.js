const { chromium } = require('playwright');

async function testSessionRestoration() {
    let browser, page;

    try {
        console.log('🚀 Starting session restoration test...');

        browser = await chromium.launch({ headless: false });
        page = await browser.newPage();

        // Navigate to the application
        await page.goto('http://localhost:3020');
        console.log('📄 Page loaded');

        // Wait for application to initialize
        await page.waitForSelector('#submit-btn', { timeout: 10000 });
        console.log('✅ Application initialized');

        // Step 1: Make various user selections
        console.log('\n🔧 Step 1: Making user selections...');

        // Change set option to Long Shirt Set
        await page.click('#long-shirt-set-btn');
        console.log('✅ Set option changed to Long Shirt Set');

        // Change design type to Set-in
        await page.click('#setin-btn');
        console.log('✅ Design type changed to Set-in');

        // Change neck type to Comfort C (to make neck-color-2 visible)
        await page.click('#cft-c-btn');
        console.log('✅ Neck type changed to Comfort C');

        // Select custom pattern Custom-1-1
        await page.click('#custom-1-1-btn');
        console.log('✅ Custom pattern selected');

        // Change some color values (body colors were removed, keeping neck/pants)
        await page.fill('#neck-color-1', '#ff0000');  // Red
        await page.fill('#neck-color-2', '#00ff00');  // Green
        await page.fill('#pants-color-1', '#0000ff'); // Blue
        await page.fill('#pants-color-2', '#ffff00'); // Yellow
        console.log('✅ Custom colors set');

        // Add a text layer for testing
        await page.click('#add-text-btn');
        await page.waitForSelector('.layer-item', { timeout: 5000 });
        console.log('✅ Text layer added');

        // Step 2: Submit the session
        console.log('\n💾 Step 2: Submitting session...');
        await page.click('#submit-btn');

        // Wait for submission to complete (look for success message or URL change)
        try {
            await page.waitForSelector('.notification', { timeout: 15000 });
            console.log('✅ Session submitted successfully');
        } catch (error) {
            console.log('⚠️ No notification visible, checking URL for session ID...');
        }

        // Get the current URL (should contain session ID)
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);

        const sessionIdMatch = currentUrl.match(/\/([a-zA-Z0-9_-]+)$/);
        if (!sessionIdMatch) {
            throw new Error('No session ID found in URL');
        }

        const sessionId = sessionIdMatch[1];
        console.log('🆔 Session ID:', sessionId);

        // Step 3: Navigate to a fresh page and then load the session
        console.log('\n🔄 Step 3: Testing session restoration...');
        await page.goto('http://localhost:3020');
        console.log('📄 Navigated to fresh page');

        // Wait a bit for the page to be ready
        await page.waitForTimeout(2000);

        // Navigate to the session URL
        const sessionUrl = `http://localhost:3020/${sessionId}`;
        console.log('🔗 Loading session URL:', sessionUrl);
        await page.goto(sessionUrl);

        // Wait for session to load
        await page.waitForSelector('#submit-btn', { timeout: 10000 });
        await page.waitForTimeout(3000); // Give time for restoration to complete

        // Step 4: Verify all selections were restored
        console.log('\n✅ Step 4: Verifying restored selections...');

        // Check set option
        const activeSetBtn = await page.locator('.texture-preset-btn.active').textContent();
        console.log('📋 Active set option:', activeSetBtn);
        if (activeSetBtn.includes('Long Shirt Set')) {
            console.log('✅ Set option correctly restored');
        } else {
            console.log('❌ Set option not restored correctly');
        }

        // Check design type
        const activeDesignBtn = await page.locator('.set-type-btn.active').textContent();
        console.log('🎨 Active design type:', activeDesignBtn);
        if (activeDesignBtn.includes('Set-in')) {
            console.log('✅ Design type correctly restored');
        } else {
            console.log('❌ Design type not restored correctly');
        }

        // Check neck type
        const activeNeckBtn = await page.locator('.neck-btn.active').textContent();
        console.log('👔 Active neck type:', activeNeckBtn);
        if (activeNeckBtn.includes('Comfort C')) {
            console.log('✅ Neck type correctly restored');
        } else {
            console.log('❌ Neck type not restored correctly');
        }

        // Check custom pattern
        const activePatternBtn = await page.locator('.custom-pattern-btn.active').textContent();
        console.log('🎭 Active custom pattern:', activePatternBtn);
        if (activePatternBtn.includes('Custom-1-1')) {
            console.log('✅ Custom pattern correctly restored');
        } else {
            console.log('❌ Custom pattern not restored correctly');
        }

        // Check custom colors (body colors were removed, checking neck/pants)
        const neckColor1 = await page.inputValue('#neck-color-1');
        const neckColor2 = await page.inputValue('#neck-color-2');
        const pantsColor1 = await page.inputValue('#pants-color-1');
        const pantsColor2 = await page.inputValue('#pants-color-2');

        console.log('🎨 Restored colors:');
        console.log('  Neck Color 1:', neckColor1);
        console.log('  Neck Color 2:', neckColor2);
        console.log('  Pants Color 1:', pantsColor1);
        console.log('  Pants Color 2:', pantsColor2);

        const colorsCorrect =
            neckColor1 === '#ff0000' &&
            neckColor2 === '#00ff00' &&
            pantsColor1 === '#0000ff' &&
            pantsColor2 === '#ffff00';

        if (colorsCorrect) {
            console.log('✅ Custom colors correctly restored');
        } else {
            console.log('❌ Custom colors not restored correctly');
        }

        // Check if text layer was restored
        const layerItems = await page.locator('.layer-item').count();
        console.log('📝 Restored layers:', layerItems);
        if (layerItems > 0) {
            console.log('✅ Text layer correctly restored');
        } else {
            console.log('❌ Text layer not restored');
        }

        console.log('\n🎉 Session restoration test completed!');

        // Take a screenshot of the restored session
        await page.screenshot({ path: 'session_restoration_test.png' });
        console.log('📸 Screenshot saved as session_restoration_test.png');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testSessionRestoration();