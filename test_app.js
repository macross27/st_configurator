const { chromium } = require('playwright');

async function testUniformConfigurator() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🚀 Starting Uniform Configurator Test...\n');

    try {
        // Navigate to the application
        console.log('📍 Navigating to http://localhost:3026...');
        await page.goto('http://localhost:3026', { waitUntil: 'networkidle' });

        // Take a screenshot
        await page.screenshot({ path: 'playwright_screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved as playwright_screenshot.png');

        // Check console errors
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text()
            });
        });

        // Wait a bit for JavaScript to initialize
        await page.waitForTimeout(3000);

        // Check if key elements exist
        console.log('\n🔍 Checking DOM elements...');

        const threeContainer = await page.$('#three-container');
        console.log(`   three-container: ${threeContainer ? '✅ Found' : '❌ Missing'}`);

        const orderBtn = await page.$('#order-btn');
        console.log(`   order-btn: ${orderBtn ? '✅ Found' : '❌ Missing'}`);

        const submitBtn = await page.$('#submit-btn');
        console.log(`   submit-btn: ${submitBtn ? '✅ Found' : '❌ Missing'}`);

        const addTextBtn = await page.$('#add-text-btn');
        console.log(`   add-text-btn: ${addTextBtn ? '✅ Found' : '❌ Missing'}`);

        const propertyPanel = await page.$('.property-panel');
        console.log(`   property-panel (texture editor): ${propertyPanel ? '✅ Found' : '❌ Missing'}`);

        // Check if Three.js canvas is rendered
        const canvas = await page.$('canvas');
        console.log(`   WebGL canvas: ${canvas ? '✅ Found' : '❌ Missing'}`);

        // Test button functionality
        console.log('\n🎯 Testing button functionality...');

        if (orderBtn) {
            try {
                await orderBtn.click();
                await page.waitForTimeout(1000);
                const modal = await page.$('#order-modal');
                console.log(`   Order button click: ${modal ? '✅ Modal opened' : '❌ Modal not opened'}`);

                // Close modal if opened
                if (modal) {
                    const closeBtn = await page.$('#order-modal-close');
                    if (closeBtn) await closeBtn.click();
                }
            } catch (error) {
                console.log(`   Order button click: ❌ Error - ${error.message}`);
            }
        }

        if (addTextBtn) {
            try {
                await addTextBtn.click();
                await page.waitForTimeout(1000);
                // Check if layer was added
                const layers = await page.$$('.layer-item');
                console.log(`   Add text button: ${layers.length > 0 ? '✅ Layer created' : '❌ No layer created'}`);
            } catch (error) {
                console.log(`   Add text button: ❌ Error - ${error.message}`);
            }
        }

        // Check console messages
        console.log('\n📋 Console Messages:');
        consoleMessages.forEach(msg => {
            const icon = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`   ${icon} [${msg.type.toUpperCase()}] ${msg.text}`);
        });

        // Check layout positioning
        console.log('\n📐 Checking layout positioning...');

        if (threeContainer) {
            const threeRect = await threeContainer.boundingBox();
            console.log(`   3D viewer position: x=${threeRect?.x}, y=${threeRect?.y}, width=${threeRect?.width}, height=${threeRect?.height}`);
        }

        if (propertyPanel) {
            const panelRect = await propertyPanel.boundingBox();
            console.log(`   Texture editor position: x=${panelRect?.x}, y=${panelRect?.y}, width=${panelRect?.width}, height=${panelRect?.height}`);
        }

        // Check for Three.js errors
        const hasThreeJS = await page.evaluate(() => {
            return typeof window.THREE !== 'undefined';
        });
        console.log(`   Three.js loaded: ${hasThreeJS ? '✅ Yes' : '❌ No'}`);

        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testUniformConfigurator().catch(console.error);