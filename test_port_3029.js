const { chromium } = require('playwright');

async function testTextLayerFix() {
    console.log('🚀 Starting Text Layer Fix Test at http://localhost:3029...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000  // Slow down for better visibility
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture all console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const message = `${msg.type().toUpperCase()}: ${msg.text()}`;
        console.log(`📝 Console: ${message}`);
        consoleMessages.push(message);
    });

    // Capture network errors
    page.on('requestfailed', request => {
        console.log(`❌ Network Error: ${request.failure().errorText} for ${request.url()}`);
    });

    try {
        console.log('📖 Navigating to http://localhost:3029...');
        await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });

        console.log('⏳ Waiting for page to fully load...');
        await page.waitForTimeout(3000);

        console.log('📸 Taking initial screenshot...');
        await page.screenshot({ path: 'test_initial_state_3029.png', fullPage: true });

        // Check page title
        const title = await page.title();
        console.log(`📄 Page Title: ${title}`);

        // Look for Add Text button
        console.log('🔍 Looking for Add Text button...');
        const addTextBtn = await page.locator('button:has-text("텍스트 추가"), button:has-text("Add Text"), #add-text-btn').first();
        const addTextVisible = await addTextBtn.isVisible();
        console.log(`📝 Add Text Button visible: ${addTextVisible}`);

        if (addTextVisible) {
            console.log('🖱️ Clicking Add Text button...');
            await addTextBtn.click();
            await page.waitForTimeout(2000);

            console.log('📸 Taking screenshot after clicking Add Text...');
            await page.screenshot({ path: 'test_after_add_text_3029.png', fullPage: true });

            // Look for text input
            console.log('🔍 Looking for text input field...');
            const textInput = await page.locator('input[type="text"], textarea, #layer-text-input').first();
            const textInputVisible = await textInput.isVisible();
            console.log(`✏️ Text input visible: ${textInputVisible}`);

            if (textInputVisible) {
                console.log('📝 Entering "Fixed Test" into text input...');
                await textInput.fill('Fixed Test');
                await page.waitForTimeout(1000);

                // Press Enter or look for confirm button
                console.log('⚡ Pressing Enter to confirm text...');
                await textInput.press('Enter');
                await page.waitForTimeout(2000);

                console.log('📸 Taking screenshot after entering text...');
                await page.screenshot({ path: 'test_after_text_entry_3029.png', fullPage: true });
            }
        }

        // Look for Submit button
        console.log('🔍 Looking for Submit button...');
        const submitBtn = await page.locator('button:has-text("주문 제출"), button:has-text("Submit"), #submit-btn').first();
        const submitVisible = await submitBtn.isVisible();
        console.log(`✉️ Submit Button visible: ${submitVisible}`);

        if (submitVisible) {
            console.log('🖱️ Clicking Submit button...');

            // First, let's see if there's a modal that might be blocking
            const modal = await page.locator('.modal-overlay, #order-modal').first();
            const modalVisible = await modal.isVisible().catch(() => false);
            console.log(`📱 Modal visible before submit: ${modalVisible}`);

            if (modalVisible) {
                console.log('❌ Modal is blocking submit button, trying to close it...');
                const closeBtn = await page.locator('.close-btn, .modal-close, [aria-label*="닫기"], [aria-label*="Close"]').first();
                if (await closeBtn.isVisible().catch(() => false)) {
                    await closeBtn.click();
                    await page.waitForTimeout(1000);
                }
            }

            // Try to click the submit button
            await submitBtn.click({ force: true });

            console.log('⏳ Waiting for submission response...');
            await page.waitForTimeout(5000);

            console.log('📸 Taking final screenshot after submission...');
            await page.screenshot({ path: 'test_after_submit_3029.png', fullPage: true });
        }

        console.log('\n=== CONSOLE MESSAGES SUMMARY ===');
        consoleMessages.forEach((msg, index) => {
            console.log(`${index + 1}. ${msg}`);
        });

        // Look specifically for debug messages
        const debugMessages = consoleMessages.filter(msg =>
            msg.includes('🎨') || msg.includes('🖼️') || msg.includes('DEBUG') || msg.includes('ERROR')
        );

        console.log('\n=== DEBUG MESSAGES ===');
        if (debugMessages.length > 0) {
            debugMessages.forEach((msg, index) => {
                console.log(`${index + 1}. ${msg}`);
            });
        } else {
            console.log('No specific debug messages found with 🎨 or 🖼️ prefixes');
        }

        // Check for specific error patterns
        const errorMessages = consoleMessages.filter(msg =>
            msg.includes('File is empty') || msg.includes('invalid') || msg.includes('failed')
        );

        console.log('\n=== ERROR ANALYSIS ===');
        if (errorMessages.length > 0) {
            console.log('❌ Found potential errors:');
            errorMessages.forEach((msg, index) => {
                console.log(`${index + 1}. ${msg}`);
            });
        } else {
            console.log('✅ No "File is empty or invalid" errors detected');
        }

        console.log('\n🏁 Test completed successfully');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ path: 'test_error_3029.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testTextLayerFix().catch(console.error);