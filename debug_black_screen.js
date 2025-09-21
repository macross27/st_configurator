const { chromium } = require('playwright');
const fs = require('fs');

async function debugBlackScreen() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        });
        console.log(`CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    // Capture network failures
    const failedRequests = [];
    page.on('requestfailed', request => {
        failedRequests.push({
            url: request.url(),
            method: request.method(),
            failure: request.failure()
        });
        console.log(`NETWORK FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Capture successful requests for debugging
    const allRequests = [];
    page.on('response', response => {
        allRequests.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            contentType: response.headers()['content-type']
        });
        if (response.status() >= 400) {
            console.log(`NETWORK ERROR: ${response.status()} ${response.url()}`);
        }
    });

    console.log('🌐 Navigating to http://localhost:3027...');

    try {
        // Navigate to the application
        await page.goto('http://localhost:3027', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        console.log('✅ Page loaded successfully');

        // Wait a bit for any dynamic content
        await page.waitForTimeout(3000);

        // Take screenshot
        await page.screenshot({
            path: 'C:\\Users\\macross27\\Documents\\st_configurator\\debug_black_screen.png',
            fullPage: true
        });
        console.log('📸 Screenshot taken: debug_black_screen.png');

        // Get HTML content
        const htmlContent = await page.content();
        fs.writeFileSync('C:\\Users\\macross27\\Documents\\st_configurator\\debug_page_content.html', htmlContent);
        console.log('📄 HTML content saved: debug_page_content.html');

        // Check for specific elements
        const bodyStyles = await page.evaluate(() => {
            const body = document.body;
            const computed = window.getComputedStyle(body);
            return {
                backgroundColor: computed.backgroundColor,
                color: computed.color,
                display: computed.display,
                visibility: computed.visibility,
                opacity: computed.opacity
            };
        });

        const mainElements = await page.evaluate(() => {
            const elements = {};

            // Check for main containers
            elements.propertyPanel = document.querySelector('#property-panel') ? 'found' : 'missing';
            elements.viewerContainer = document.querySelector('#viewer-container') ? 'found' : 'missing';
            elements.canvas = document.querySelector('canvas') ? 'found' : 'missing';
            elements.loadingIndicator = document.querySelector('.loading') ? 'found' : 'missing';
            elements.errorMessage = document.querySelector('.error') ? 'found' : 'missing';

            // Check for scripts
            const scripts = Array.from(document.querySelectorAll('script')).map(s => ({
                src: s.src || 'inline',
                text: s.src ? null : s.textContent.substring(0, 100) + '...'
            }));

            return { elements, scripts, bodyInnerHTML: document.body.innerHTML.substring(0, 500) + '...' };
        });

        // Check Three.js availability
        const threeJsStatus = await page.evaluate(() => {
            return {
                hasThree: typeof window.THREE !== 'undefined',
                hasWebGL: !!window.WebGLRenderingContext,
                webGLSupported: (() => {
                    try {
                        const canvas = document.createElement('canvas');
                        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                    } catch (e) {
                        return false;
                    }
                })()
            };
        });

        // Generate comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            url: page.url(),
            consoleMessages,
            failedRequests,
            successfulRequests: allRequests.filter(r => r.status < 400),
            bodyStyles,
            mainElements,
            threeJsStatus,
            pageTitle: await page.title()
        };

        fs.writeFileSync('C:\\Users\\macross27\\Documents\\st_configurator\\debug_report.json', JSON.stringify(report, null, 2));
        console.log('📊 Debug report saved: debug_report.json');

        console.log('\\n🔍 Quick Summary:');
        console.log(`- Page Title: ${report.pageTitle}`);
        console.log(`- Console Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
        console.log(`- Failed Requests: ${failedRequests.length}`);
        console.log(`- Property Panel: ${mainElements.elements.propertyPanel}`);
        console.log(`- Viewer Container: ${mainElements.elements.viewerContainer}`);
        console.log(`- Canvas: ${mainElements.elements.canvas}`);
        console.log(`- Three.js Available: ${threeJsStatus.hasThree}`);
        console.log(`- WebGL Supported: ${threeJsStatus.webGLSupported}`);

    } catch (error) {
        console.error('❌ Error during debugging:', error);

        // Still try to take a screenshot
        try {
            await page.screenshot({
                path: 'C:\\Users\\macross27\\Documents\\st_configurator\\debug_error_screenshot.png',
                fullPage: true
            });
        } catch (screenshotError) {
            console.error('Failed to take error screenshot:', screenshotError);
        }
    }

    // Keep browser open for manual inspection
    console.log('\\n🔍 Browser will stay open for manual inspection. Press any key to close...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async () => {
        await browser.close();
        process.exit(0);
    });
}

debugBlackScreen().catch(console.error);