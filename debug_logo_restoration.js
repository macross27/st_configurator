const { chromium } = require('playwright');

async function debugLogoRestoration() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('🔧 Starting logo restoration debug test...');

        // Navigate to the specific session
        const sessionUrl = 'http://localhost:3021/aiBxqY8P8Dhe';
        console.log(`🌐 Loading session: ${sessionUrl}`);
        await page.goto(sessionUrl);

        // Check if page loads at all
        await page.waitForLoadState('networkidle');
        console.log('✅ Page loaded');

        // Take a screenshot to see what's on the page
        await page.screenshot({ path: 'debug_page_load.png' });
        console.log('📸 Page load screenshot saved');

        // Check page title and basic elements
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);

        // Try to wait for any of these selectors
        const selectors = ['#viewer-container', '#app', 'body', '.container'];
        let foundElement = null;

        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                foundElement = selector;
                console.log(`✅ Found element: ${selector}`);
                break;
            } catch (e) {
                console.log(`❌ Element not found: ${selector}`);
            }
        }

        if (!foundElement) {
            console.log('❌ No expected elements found on page');
            return;
        }

        await page.waitForTimeout(2000);

        // Check console for session loading logs
        console.log('\n📋 Console logs during session load:');
        page.on('console', msg => {
            if (msg.text().includes('layer') || msg.text().includes('session') || msg.text().includes('image')) {
                console.log(`[${msg.type()}] ${msg.text()}`);
            }
        });

        // Wait a bit more for session to fully load
        await page.waitForTimeout(3000);

        // Check if layers panel is visible
        const layersPanel = await page.$('#layers-panel');
        if (layersPanel) {
            console.log('\n🎛️ Layers panel found');

            // Get all layer items
            const layerItems = await page.$$('.layer-item');
            console.log(`📊 Found ${layerItems.length} layer items`);

            for (let i = 0; i < layerItems.length; i++) {
                const layerItem = layerItems[i];
                const layerText = await layerItem.textContent();
                const layerType = await layerItem.getAttribute('data-layer-type');
                const layerId = await layerItem.getAttribute('data-layer-id');

                console.log(`\n🏷️ Layer ${i + 1}:`);
                console.log(`   ID: ${layerId}`);
                console.log(`   Type: ${layerType}`);
                console.log(`   Text: ${layerText}`);

                // Check if this is a logo layer
                if (layerType === 'logo') {
                    console.log(`   🎯 LOGO LAYER FOUND!`);

                    // Check for error indicators
                    const hasError = await layerItem.$('.layer-error') !== null;
                    const hasWarning = await layerItem.$('.layer-warning') !== null;

                    if (hasError || hasWarning) {
                        console.log(`   ❌ Layer has error/warning indicator`);
                    } else {
                        console.log(`   ✅ Layer appears healthy`);
                    }
                }
            }
        } else {
            console.log('❌ Layers panel not found');
        }

        // Check session manager state
        const sessionState = await page.evaluate(() => {
            if (window.app && window.app.sessionManager) {
                const session = window.app.sessionManager.getCurrentSession();
                return {
                    sessionId: session.sessionId,
                    layerCount: session.data?.layers?.length || 0,
                    layers: session.data?.layers?.map(l => ({
                        id: l.id,
                        type: l.type,
                        name: l.name,
                        imagePath: l.imagePath,
                        hasImagePath: !!l.imagePath
                    })) || []
                };
            }
            return null;
        });

        if (sessionState) {
            console.log('\n📊 Session State:');
            console.log(`   Session ID: ${sessionState.sessionId}`);
            console.log(`   Layer Count: ${sessionState.layerCount}`);

            sessionState.layers.forEach((layer, index) => {
                console.log(`\n   Layer ${index + 1}:`);
                console.log(`     ID: ${layer.id}`);
                console.log(`     Type: ${layer.type}`);
                console.log(`     Name: ${layer.name}`);
                console.log(`     Has imagePath: ${layer.hasImagePath}`);
                console.log(`     ImagePath: ${layer.imagePath || 'MISSING'}`);

                if (layer.type === 'logo' && !layer.hasImagePath) {
                    console.log(`     🚨 LOGO LAYER MISSING IMAGE PATH!`);
                }
            });
        }

        // Check layer manager state
        const layerManagerState = await page.evaluate(() => {
            if (window.app && window.app.layerManager) {
                const layers = window.app.layerManager.getLayers();
                return layers.map(layer => ({
                    id: layer.id,
                    type: layer.type,
                    name: layer.name,
                    hasImage: !!layer.image,
                    imageUrl: layer.image ? layer.image.src : null,
                    hasImageError: layer.hasImageError,
                    imageErrorReason: layer.imageErrorReason
                }));
            }
            return [];
        });

        console.log('\n🎨 Layer Manager State:');
        layerManagerState.forEach((layer, index) => {
            console.log(`\n   Layer ${index + 1}:`);
            console.log(`     ID: ${layer.id}`);
            console.log(`     Type: ${layer.type}`);
            console.log(`     Name: ${layer.name}`);
            console.log(`     Has Image: ${layer.hasImage}`);
            console.log(`     Image URL: ${layer.imageUrl || 'NONE'}`);

            if (layer.hasImageError) {
                console.log(`     ❌ Image Error: ${layer.imageErrorReason}`);
            }

            if (layer.type === 'logo' && !layer.hasImage) {
                console.log(`     🚨 LOGO LAYER HAS NO IMAGE!`);
            }
        });

        // Take a screenshot
        await page.screenshot({
            path: 'logo_restoration_debug.png',
            fullPage: true
        });
        console.log('\n📸 Screenshot saved as logo_restoration_debug.png');

        // Test clicking on a logo layer if found
        const logoLayerItem = await page.$('.layer-item[data-layer-type="logo"]');
        if (logoLayerItem) {
            console.log('\n🖱️ Clicking on logo layer to test selection...');
            await logoLayerItem.click();
            await page.waitForTimeout(1000);

            // Check if layer got selected
            const isSelected = await logoLayerItem.evaluate(el => el.classList.contains('selected'));
            console.log(`   Logo layer selected: ${isSelected}`);
        }

        // Wait a bit to see the result
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
debugLogoRestoration().catch(console.error);