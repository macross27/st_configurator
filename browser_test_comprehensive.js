const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testApplicationFunctionality() {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-web-security', '--allow-running-insecure-content']
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // Collect console messages and errors
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        });
        console.log(`Console ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
        errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        console.error('Page error:', error.message);
    });

    try {
        console.log('Navigating to application...');
        await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });

        // Wait for application to load
        await page.waitForTimeout(3000);

        // 1. Take initial screenshot
        console.log('Taking initial screenshot...');
        await page.screenshot({
            path: 'test_initial_comprehensive.png',
            fullPage: true
        });

        // Check if main elements are present
        const hasAddTextBtn = await page.locator('button:has-text("텍스트 추가")').isVisible();
        const hasAddLogoBtn = await page.locator('button:has-text("로고 추가")').isVisible();
        const hasOrderBtn = await page.locator('button:has-text("주문서 작성")').isVisible();

        console.log('Button visibility check:');
        console.log('- Add Text button:', hasAddTextBtn);
        console.log('- Add Logo button:', hasAddLogoBtn);
        console.log('- Order button:', hasOrderBtn);

        // 2. Test Add Text Button
        if (hasAddTextBtn) {
            console.log('Testing Add Text button...');

            // Take screenshot before clicking
            await page.screenshot({
                path: 'test_before_add_text.png',
                fullPage: true
            });

            await page.click('button:has-text("텍스트 추가")');
            await page.waitForTimeout(2000);

            // Take screenshot after clicking
            await page.screenshot({
                path: 'test_after_add_text.png',
                fullPage: true
            });

            // Check if text layer was added to layer list
            const layerCount = await page.locator('.layer-item').count();
            console.log('Layers after adding text:', layerCount);
        }

        // 3. Test Add Logo Button (without actual file upload for now)
        if (hasAddLogoBtn) {
            console.log('Testing Add Logo button click...');

            await page.screenshot({
                path: 'test_before_add_logo.png',
                fullPage: true
            });

            await page.click('button:has-text("로고 추가")');
            await page.waitForTimeout(1000);

            // Check if file input appears or any modal opens
            const fileInput = await page.locator('input[type="file"]').isVisible();
            console.log('File input visible after logo button click:', fileInput);

            await page.screenshot({
                path: 'test_after_add_logo_click.png',
                fullPage: true
            });
        }

        // 4. Test Order Modal Button
        if (hasOrderBtn) {
            console.log('Testing Order button...');

            await page.screenshot({
                path: 'test_before_order.png',
                fullPage: true
            });

            await page.click('button:has-text("주문서 작성")');
            await page.waitForTimeout(2000);

            // Check if modal opened
            const modalVisible = await page.locator('.modal, .order-modal, [class*="modal"]').isVisible();
            console.log('Order modal visible:', modalVisible);

            await page.screenshot({
                path: 'test_after_order_click.png',
                fullPage: true
            });

            // If modal is open, test submit button
            if (modalVisible) {
                const submitBtn = await page.locator('button:has-text("주문 제출")').isVisible();
                console.log('Submit button in modal:', submitBtn);

                if (submitBtn) {
                    // Fill some basic form data if fields exist
                    const nameField = page.locator('input[name="name"], input[placeholder*="이름"]');
                    if (await nameField.isVisible()) {
                        await nameField.fill('테스트 사용자');
                    }

                    const emailField = page.locator('input[name="email"], input[placeholder*="이메일"]');
                    if (await emailField.isVisible()) {
                        await emailField.fill('test@example.com');
                    }

                    await page.click('button:has-text("주문 제출")');
                    await page.waitForTimeout(2000);

                    await page.screenshot({
                        path: 'test_after_submit.png',
                        fullPage: true
                    });
                }
            }
        }

        // Final screenshot
        await page.screenshot({
            path: 'test_final_comprehensive.png',
            fullPage: true
        });

        // Generate test report
        const report = {
            timestamp: new Date().toISOString(),
            buttonVisibility: {
                addText: hasAddTextBtn,
                addLogo: hasAddLogoBtn,
                createOrder: hasOrderBtn
            },
            consoleMessages: consoleMessages,
            errors: errors,
            testResults: {
                initialLoad: true,
                addTextTested: hasAddTextBtn,
                addLogoTested: hasAddLogoBtn,
                orderModalTested: hasOrderBtn
            }
        };

        fs.writeFileSync('comprehensive_test_report.json', JSON.stringify(report, null, 2));
        console.log('Test report saved to comprehensive_test_report.json');

    } catch (error) {
        console.error('Test failed:', error);
        errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Emergency screenshot
        try {
            await page.screenshot({ path: 'test_error_state.png', fullPage: true });
        } catch (screenshotError) {
            console.error('Could not take error screenshot:', screenshotError);
        }
    } finally {
        await browser.close();
    }

    return {
        consoleMessages,
        errors,
        success: errors.length === 0
    };
}

// Run the test
testApplicationFunctionality()
    .then(result => {
        console.log('\n=== TEST COMPLETE ===');
        console.log('Console messages:', result.consoleMessages.length);
        console.log('Errors:', result.errors.length);
        console.log('Success:', result.success);

        if (result.errors.length > 0) {
            console.log('\nErrors found:');
            result.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
            });
        }
    })
    .catch(error => {
        console.error('Test runner failed:', error);
    });