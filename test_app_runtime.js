const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function testBrowserRuntime() {
    let browser;
    try {
        console.log('🚀 Starting browser test...');

        // Try common Chrome paths for Windows
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.CHROME_PATH
        ].filter(Boolean);

        let chromePath = null;
        for (const path of chromePaths) {
            if (fs.existsSync(path)) {
                chromePath = path;
                break;
            }
        }

        if (!chromePath) {
            console.log('❌ Chrome not found. Trying without executablePath...');
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else {
            console.log('✅ Using Chrome at:', chromePath);
            browser = await puppeteer.launch({
                executablePath: chromePath,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }

        const page = await browser.newPage();

        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            logs.push(`${msg.type()}: ${msg.text()}`);
        });

        // Capture errors
        const errors = [];
        page.on('error', err => {
            errors.push(`Error: ${err.message}`);
        });

        page.on('pageerror', err => {
            errors.push(`Page Error: ${err.message}`);
        });

        // Navigate to the application
        console.log('📱 Loading application...');
        await page.goto('http://localhost:3026', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait a bit for JavaScript to execute
        await page.waitForTimeout(3000);

        // Check if buttons exist and are clickable
        console.log('\n🔍 Testing UI Elements:');

        const orderBtn = await page.$('#order-btn');
        const submitBtn = await page.$('#submit-btn');
        const canvas = await page.$('#three-container canvas');

        console.log('Order button found:', !!orderBtn);
        console.log('Submit button found:', !!submitBtn);
        console.log('3D Canvas found:', !!canvas);

        // Test button clicks
        if (orderBtn) {
            console.log('\n🖱️ Testing order button click...');
            try {
                await page.click('#order-btn');
                await page.waitForTimeout(1000);
                console.log('✅ Order button clicked successfully');
            } catch (err) {
                console.log('❌ Order button click failed:', err.message);
            }
        }

        if (submitBtn) {
            console.log('\n🖱️ Testing submit button click...');
            try {
                await page.click('#submit-btn');
                await page.waitForTimeout(1000);
                console.log('✅ Submit button clicked successfully');
            } catch (err) {
                console.log('❌ Submit button click failed:', err.message);
            }
        }

        // Take a screenshot
        console.log('\n📸 Taking screenshot...');
        await page.screenshot({
            path: 'browser_screenshot.png',
            fullPage: true
        });
        console.log('✅ Screenshot saved as browser_screenshot.png');

        // Output logs and errors
        console.log('\n📋 Console Logs:');
        logs.forEach(log => console.log(log));

        console.log('\n❌ JavaScript Errors:');
        errors.forEach(error => console.log(error));

        if (errors.length === 0) {
            console.log('✅ No JavaScript errors detected!');
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Check if puppeteer is available
try {
    require.resolve('puppeteer-core');
    testBrowserRuntime();
} catch (e) {
    console.log('❌ Puppeteer not available. Install with: npm install puppeteer-core');
    console.log('🔍 Alternative: Manually open http://localhost:3026 and check browser console');
}