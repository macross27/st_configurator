const { chromium } = require('playwright');
const fs = require('fs');

async function comprehensiveBrowserTest() {
    console.log('🔍 Starting comprehensive browser inspection...');

    const browser = await chromium.launch({
        headless: false,  // Show browser for debugging
        slowMo: 1000,     // Slow down actions
        devtools: true    // Open devtools
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: { dir: 'videos/' }
    });

    const page = await context.newPage();

    // Capture all console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        consoleMessages.push({ type, text, timestamp: new Date().toISOString() });
        console.log(`CONSOLE [${type.toUpperCase()}]: ${text}`);
    });

    // Capture all errors
    const errors = [];
    page.on('pageerror', error => {
        errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        console.log(`PAGE ERROR: ${error.message}`);
    });

    // Capture failed requests
    const failedRequests = [];
    page.on('response', response => {
        if (!response.ok()) {
            failedRequests.push({
                url: response.url(),
                status: response.status(),
                statusText: response.statusText(),
                timestamp: new Date().toISOString()
            });
            console.log(`FAILED REQUEST: ${response.status()} ${response.url()}`);
        }
    });

    try {
        console.log('📱 Loading application...');
        await page.goto('http://localhost:3026', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait a bit for JavaScript to initialize
        await page.waitForTimeout(3000);

        console.log('📸 Taking initial screenshot...');
        await page.screenshot({
            path: 'browser_test_initial.png',
            fullPage: true
        });

        // Check what's actually visible on the page
        console.log('🔍 Analyzing page structure...');

        const pageAnalysis = await page.evaluate(() => {
            const analysis = {
                title: document.title,
                bodyText: document.body.innerText.substring(0, 500),
                hasCanvas: !!document.querySelector('canvas'),
                hasThreeJS: !!window.THREE,
                hasMainApp: !!window.main || !!document.querySelector('#app'),
                errorElements: Array.from(document.querySelectorAll('.error, .alert-danger, [data-error]')).map(el => el.textContent),
                visibleElements: {
                    orderButton: !!document.querySelector('#orderFormButton, .order-button, [data-action="order"]'),
                    viewer3D: !!document.querySelector('#viewer3d, .viewer, .three-container'),
                    layerPanel: !!document.querySelector('#layerPanel, .layer-panel'),
                    fileUpload: !!document.querySelector('#fileInput, input[type="file"]')
                },
                layout: {
                    leftSide: document.querySelector('.left-panel, .sidebar-left, #leftPanel')?.innerText.substring(0, 100) || 'Not found',
                    rightSide: document.querySelector('.right-panel, .sidebar-right, #rightPanel')?.innerText.substring(0, 100) || 'Not found',
                    mainArea: document.querySelector('.main-area, .content, #mainContent')?.innerText.substring(0, 100) || 'Not found'
                }
            };

            // Check for initialization errors in any global variables
            if (window.initError) analysis.initError = window.initError;
            if (window.errorMessages) analysis.errorMessages = window.errorMessages;

            return analysis;
        });

        console.log('📊 Page Analysis:', JSON.stringify(pageAnalysis, null, 2));

        // Try to find and click the order button
        console.log('🔘 Looking for order button...');
        const orderButtonSelectors = [
            '#orderFormButton',
            '.order-button',
            '[data-action="order"]',
            'button:has-text("Order")',
            'button:has-text("주문")',
            '.btn:has-text("Order")'
        ];

        let orderButtonFound = false;
        for (const selector of orderButtonSelectors) {
            try {
                const button = await page.locator(selector).first();
                if (await button.isVisible()) {
                    console.log(`✅ Found order button with selector: ${selector}`);
                    orderButtonFound = true;

                    console.log('📸 Taking screenshot before clicking order button...');
                    await page.screenshot({
                        path: 'browser_test_before_order_click.png',
                        fullPage: true
                    });

                    console.log('🖱️ Clicking order button...');
                    await button.click();

                    // Wait for modal or response
                    await page.waitForTimeout(2000);

                    console.log('📸 Taking screenshot after clicking order button...');
                    await page.screenshot({
                        path: 'browser_test_after_order_click.png',
                        fullPage: true
                    });

                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!orderButtonFound) {
            console.log('❌ No order button found with any selector');
        }

        // Check 3D viewer specifically
        console.log('🎮 Analyzing 3D viewer...');
        const viewer3DAnalysis = await page.evaluate(() => {
            const canvases = Array.from(document.querySelectorAll('canvas'));
            const viewer = document.querySelector('#viewer3d, .viewer, .three-container');

            return {
                canvasCount: canvases.length,
                canvasDetails: canvases.map((canvas, i) => ({
                    index: i,
                    width: canvas.width,
                    height: canvas.height,
                    style: canvas.style.cssText,
                    parent: canvas.parentElement?.className || 'unknown',
                    visible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0
                })),
                viewerExists: !!viewer,
                viewerPosition: viewer ? {
                    left: viewer.offsetLeft,
                    top: viewer.offsetTop,
                    width: viewer.offsetWidth,
                    height: viewer.offsetHeight,
                    className: viewer.className
                } : null,
                threeJSLoaded: !!window.THREE,
                sceneInitialized: !!(window.scene || window.sceneManager)
            };
        });

        console.log('🎮 3D Viewer Analysis:', JSON.stringify(viewer3DAnalysis, null, 2));

        // Get all JavaScript error details
        console.log('🐛 Collecting detailed error information...');
        const detailedErrors = await page.evaluate(() => {
            const errorInfo = {
                globalErrors: window.errors || [],
                consoleErrors: window.consoleErrors || [],
                loadingErrors: [],
                initializationState: {
                    mainLoaded: !!window.main,
                    threeLoaded: !!window.THREE,
                    fabricLoaded: !!window.fabric,
                    managersLoaded: !!(window.sceneManager || window.layerManager),
                    domReady: document.readyState,
                    scripts: Array.from(document.querySelectorAll('script')).map(s => ({
                        src: s.src,
                        loaded: !s.hasAttribute('data-error')
                    }))
                }
            };

            // Check for loading failures
            const failedElements = document.querySelectorAll('[data-error], .error');
            errorInfo.failedElements = Array.from(failedElements).map(el => ({
                tag: el.tagName,
                error: el.getAttribute('data-error') || el.textContent,
                src: el.src || el.href
            }));

            return errorInfo;
        });

        console.log('🐛 Detailed Error Analysis:', JSON.stringify(detailedErrors, null, 2));

        // Wait a bit more and take final screenshot
        await page.waitForTimeout(2000);
        console.log('📸 Taking final comprehensive screenshot...');
        await page.screenshot({
            path: 'browser_test_final.png',
            fullPage: true
        });

        // Generate comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            url: page.url(),
            pageAnalysis,
            viewer3DAnalysis,
            detailedErrors,
            consoleMessages,
            errors,
            failedRequests,
            screenshots: [
                'browser_test_initial.png',
                'browser_test_before_order_click.png',
                'browser_test_after_order_click.png',
                'browser_test_final.png'
            ]
        };

        fs.writeFileSync('browser_test_report.json', JSON.stringify(report, null, 2));
        console.log('📋 Comprehensive report saved to browser_test_report.json');

    } catch (error) {
        console.error('💥 Test failed:', error);
        await page.screenshot({ path: 'browser_test_error.png', fullPage: true });
    } finally {
        console.log('🏁 Keeping browser open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

comprehensiveBrowserTest().catch(console.error);