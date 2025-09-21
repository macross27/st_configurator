const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Starting enhanced debug test...');

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
    slowMo: 1000
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 }
  });

  const page = await context.newPage();

  // Listen to all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });

    // Print debug messages we're specifically looking for
    if (text.includes('🎨') || text.includes('🖼️') || text.includes('📤') ||
        text.includes('empty') || text.includes('blob') || text.includes('FormData') ||
        text.includes('size:') || text.includes('file')) {
      console.log(`CONSOLE [${msg.type().toUpperCase()}]: ${text}`);
    }
  });

  // Listen to network requests
  page.on('request', request => {
    if (request.url().includes('/order') || request.url().includes('upload')) {
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/order') || response.url().includes('upload')) {
      console.log(`🌐 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('📱 Loading application at http://localhost:3029...');
    await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });

    // Wait for app to initialize
    console.log('⏳ Waiting for app initialization...');
    await page.waitForTimeout(3000);

    // Check if we have a canvas
    const canvasExists = await page.locator('canvas').count() > 0;
    console.log(`🎨 Canvas elements found: ${await page.locator('canvas').count()}`);

    // Find and click the "텍스트 추가" (Add Text) button
    console.log('🔍 Looking for Add Text button...');
    const addTextButton = page.locator('button:has-text("텍스트 추가"), button:has-text("Add Text")');

    if (await addTextButton.count() > 0) {
      console.log('✅ Found Add Text button, clicking...');
      await addTextButton.click();
      await page.waitForTimeout(1000);

      // Look for text input field
      const textInput = page.locator('input[type="text"], textarea, input[placeholder*="텍스트"], input[placeholder*="text"]').first();

      if (await textInput.count() > 0) {
        console.log('✅ Found text input, entering "Debug Test"...');
        await textInput.fill('Debug Test');
        await page.waitForTimeout(500);

        // Look for confirm/apply button
        const confirmButton = page.locator('button:has-text("확인"), button:has-text("Apply"), button:has-text("Add"), button:has-text("추가")').first();

        if (await confirmButton.count() > 0) {
          console.log('✅ Found confirm button, clicking...');
          await confirmButton.click();
          await page.waitForTimeout(2000);

          // Now look for order/submit button
          console.log('🔍 Looking for order button...');
          const orderButton = page.locator('button:has-text("주문"), button:has-text("Order"), button:has-text("Submit")').first();

          if (await orderButton.count() > 0) {
            console.log('✅ Found order button, clicking...');
            await orderButton.click();
            await page.waitForTimeout(3000);

            // Look for form submission
            const form = page.locator('form').first();
            if (await form.count() > 0) {
              console.log('📋 Found form, attempting to submit...');

              // Check if there's a submit button in the form
              const submitButton = page.locator('form button[type="submit"], form button:has-text("제출"), form button:has-text("Submit")').first();

              if (await submitButton.count() > 0) {
                console.log('✅ Found submit button in form, clicking...');
                await submitButton.click();

                // Wait for potential network requests
                console.log('⏳ Waiting for form submission and network requests...');
                await page.waitForTimeout(5000);
              } else {
                console.log('❌ No submit button found in form');
              }
            } else {
              console.log('❌ No form found');
            }
          } else {
            console.log('❌ No order button found');
          }
        } else {
          console.log('❌ No confirm button found');
        }
      } else {
        console.log('❌ No text input found');
      }
    } else {
      console.log('❌ No Add Text button found');
    }

    // Take a final screenshot
    await page.screenshot({ path: 'debug_test_final.png', fullPage: true });

    // Print all collected console messages with debug info
    console.log('\n📋 ALL CONSOLE MESSAGES:');
    console.log('========================');
    consoleMessages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
    });

    // Filter for the specific debug messages we're looking for
    console.log('\n🔍 SPECIFIC DEBUG MESSAGES:');
    console.log('=============================');
    const debugMessages = consoleMessages.filter(msg =>
      msg.text.includes('🎨') || msg.text.includes('🖼️') || msg.text.includes('📤') ||
      msg.text.includes('empty') || msg.text.includes('blob') || msg.text.includes('FormData') ||
      msg.text.includes('size:') || msg.text.includes('file')
    );

    if (debugMessages.length > 0) {
      debugMessages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
      });
    } else {
      console.log('❌ No specific debug messages found');
    }

    console.log('\n🏁 Test completed. Keeping browser open for manual inspection...');
    console.log('Press Ctrl+C to close the browser and exit.');

    // Keep browser open for manual inspection
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();