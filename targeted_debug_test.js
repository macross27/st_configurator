const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Starting targeted debug test for form submission...');

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 }
  });

  const page = await context.newPage();

  // Listen to all console messages with special attention to our debug messages
  const debugMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    const timestamp = new Date().toISOString();

    debugMessages.push({
      type: msg.type(),
      text: text,
      timestamp: timestamp
    });

    // Print specific debug messages we're looking for
    if (text.includes('🎨') || text.includes('🖼️') || text.includes('📤') ||
        text.includes('Converting canvas to blob') || text.includes('Adding image file to FormData') ||
        text.includes('empty') || text.includes('Empty blob') || text.includes('size: 0') ||
        text.includes('Failed to create blob') || text.includes('toBlob returned null') ||
        text.includes('Session submission') || text.includes('Submitting session')) {
      console.log(`CONSOLE [${msg.type().toUpperCase()}]: ${text}`);
    }
  });

  // Listen for network activity
  page.on('request', request => {
    if (request.url().includes('/api/sessions') || request.url().includes('/order')) {
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/sessions') || response.url().includes('/order')) {
      console.log(`🌐 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('📱 Loading application at http://localhost:3029...');
    await page.goto('http://localhost:3029', { waitUntil: 'networkidle' });

    // Wait for app to initialize
    console.log('⏳ Waiting for app initialization...');
    await page.waitForTimeout(3000);

    // Step 1: Add a text layer
    console.log('🔍 Step 1: Adding text layer...');
    const addTextButton = page.locator('button:has-text("텍스트 추가"), button:has-text("Add Text")');

    if (await addTextButton.count() > 0) {
      console.log('✅ Clicking Add Text button...');
      await addTextButton.click();
      await page.waitForTimeout(1000);

      // Enter text
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.count() > 0) {
        await textInput.fill('Debug Test');
        await page.waitForTimeout(500);

        // Click confirm
        const confirmButton = page.locator('button:has-text("확인"), button:has-text("Apply"), button:has-text("Add")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Text layer added successfully');
        }
      }
    }

    // Step 2: Look for the "주문 제출" (Submit Order) button
    console.log('🔍 Step 2: Looking for Submit Order button...');
    const submitButtons = [
      'button:has-text("주문 제출")',
      'button:has-text("Submit")',
      'button:has-text("제출")',
      'button[type="submit"]',
      '.submit-order-btn',
      '#submit-order',
      '.order-submit'
    ];

    let submitButton = null;
    for (const selector of submitButtons) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        submitButton = button.first();
        console.log(`✅ Found submit button with selector: ${selector}`);
        break;
      }
    }

    if (!submitButton) {
      // Try to find any button that might trigger submission
      console.log('🔍 Looking for any submission-related buttons...');
      const allButtons = await page.locator('button').all();

      for (const button of allButtons) {
        const text = await button.textContent();
        console.log(`Button found: "${text}"`);

        if (text && (text.includes('주문') || text.includes('제출') || text.includes('Submit') || text.includes('Order'))) {
          submitButton = button;
          console.log(`✅ Found potential submit button: "${text}"`);
          break;
        }
      }
    }

    if (submitButton) {
      console.log('🎯 Step 3: Clicking submit button...');
      await submitButton.click();

      // Wait for submission process
      console.log('⏳ Waiting for submission process (10 seconds)...');
      await page.waitForTimeout(10000);

      // Check if a form appeared and try to submit it
      console.log('🔍 Looking for forms after button click...');
      const forms = await page.locator('form').all();

      if (forms.length > 0) {
        console.log(`✅ Found ${forms.length} form(s)`);

        // Look for submit buttons within forms
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i];
          const formSubmitButton = form.locator('button[type="submit"], button:has-text("제출"), button:has-text("Submit")');

          if (await formSubmitButton.count() > 0) {
            console.log(`✅ Found submit button in form ${i + 1}, clicking...`);
            await formSubmitButton.first().click();

            // Wait for submission to complete
            console.log('⏳ Waiting for form submission to complete...');
            await page.waitForTimeout(5000);
            break;
          }
        }
      } else {
        console.log('❌ No forms found after clicking button');
      }
    } else {
      console.log('❌ No submit button found');

      // List all available buttons for debugging
      console.log('🔍 Available buttons:');
      const allButtons = await page.locator('button').all();
      for (const button of allButtons) {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        console.log(`  - "${text}" (visible: ${isVisible})`);
      }
    }

    // Wait a bit more to capture any async operations
    console.log('⏳ Final wait for async operations...');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  // Print summary of all debug messages
  console.log('\n📋 DEBUG MESSAGE SUMMARY:');
  console.log('==========================');

  const relevantMessages = debugMessages.filter(msg =>
    msg.text.includes('🎨') || msg.text.includes('🖼️') || msg.text.includes('📤') ||
    msg.text.includes('Converting canvas to blob') || msg.text.includes('Adding image file to FormData') ||
    msg.text.includes('empty') || msg.text.includes('Empty blob') || msg.text.includes('size: 0') ||
    msg.text.includes('Failed to create blob') || msg.text.includes('toBlob returned null') ||
    msg.text.includes('Session submission') || msg.text.includes('Submitting session')
  );

  console.log(`Found ${relevantMessages.length} relevant debug messages:`);
  relevantMessages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
  });

  if (relevantMessages.length === 0) {
    console.log('❌ No relevant debug messages found. This suggests:');
    console.log('   1. The form submission process was not triggered');
    console.log('   2. The debug messages are in different files');
    console.log('   3. There might be an issue with the submission flow');
  }

  console.log('\n🏁 Test completed. Keeping browser open for manual inspection...');
  console.log('Press Ctrl+C to close the browser and exit.');

  // Keep browser open for manual inspection
  await page.waitForTimeout(30000);
  await browser.close();
})();