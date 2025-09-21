const puppeteer = require('puppeteer');

async function quickScreenshotTest() {
    console.log('📸 Taking quick screenshot to see current state');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        console.log('🌐 Navigating to http://localhost:3029');
        await page.goto('http://localhost:3029', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // Wait a few seconds for things to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Take screenshot
        await page.screenshot({ path: 'quick_screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved as quick_screenshot.png');

        // Check for the presence of key elements
        const elementCheck = await page.evaluate(() => {
            return {
                textInput: !!document.querySelector('#text-input'),
                addTextBtn: !!document.querySelector('#add-text-btn'),
                contactForm: !!document.querySelector('#contact-form'),
                submitBtn: !!document.querySelector('#submit-btn'),
                bodyContent: document.body.innerText.length > 0,
                title: document.title,
                url: window.location.href
            };
        });

        console.log('🔍 Element Check Results:');
        console.log(JSON.stringify(elementCheck, null, 2));

        // Get all elements with text-related IDs or classes
        const textElements = await page.evaluate(() => {
            const selectors = [
                'input[type="text"]',
                'textarea',
                '*[id*="text"]',
                '*[class*="text"]',
                'button[id*="add"]',
                'button[class*="add"]'
            ];

            const elements = [];
            selectors.forEach(selector => {
                try {
                    const found = document.querySelectorAll(selector);
                    found.forEach(el => {
                        elements.push({
                            selector: selector,
                            tagName: el.tagName,
                            id: el.id || 'no-id',
                            className: el.className || 'no-class',
                            textContent: el.textContent ? el.textContent.substring(0, 50) : 'no-text'
                        });
                    });
                } catch (e) {
                    // Ignore invalid selectors
                }
            });

            return elements;
        });

        console.log('🎯 Found text-related elements:');
        textElements.forEach((el, i) => {
            console.log(`${i + 1}. ${el.tagName} #${el.id} .${el.className} - "${el.textContent}"`);
        });

    } catch (error) {
        console.error('❌ Screenshot test failed:', error.message);
    }

    await browser.close();
}

quickScreenshotTest();