const { chromium } = require('playwright');

async function debugLayout() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });

  const page = await browser.newPage();

  try {
    // Navigate to the application
    console.log('Navigating to http://localhost:3027...');
    await page.goto('http://localhost:3027', { waitUntil: 'networkidle' });

    // Wait for the page to load
    await page.waitForTimeout(3000);

    // Take initial screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'layout_debug_screenshot.png', fullPage: true });

    // Check if key elements exist
    console.log('Checking for key elements...');
    const appContainer = await page.$('.app-container');
    const propertyPanel = await page.$('.property-panel');
    const viewerPanel = await page.$('.viewer-panel');

    console.log('Elements found:');
    console.log('- .app-container:', !!appContainer);
    console.log('- .property-panel:', !!propertyPanel);
    console.log('- .viewer-panel:', !!viewerPanel);

    // Get computed styles for layout containers
    if (appContainer) {
      const appStyles = await page.evaluate(() => {
        const el = document.querySelector('.app-container');
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          flexDirection: styles.flexDirection,
          width: styles.width,
          height: styles.height,
          overflow: styles.overflow
        };
      });
      console.log('App container styles:', appStyles);
    }

    if (propertyPanel) {
      const propertyStyles = await page.evaluate(() => {
        const el = document.querySelector('.property-panel');
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          width: styles.width,
          height: styles.height,
          flex: styles.flex,
          visibility: styles.visibility,
          position: styles.position
        };
      });
      console.log('Property panel styles:', propertyStyles);
    }

    if (viewerPanel) {
      const viewerStyles = await page.evaluate(() => {
        const el = document.querySelector('.viewer-panel');
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          width: styles.width,
          height: styles.height,
          flex: styles.flex,
          visibility: styles.visibility,
          position: styles.position
        };
      });
      console.log('Viewer panel styles:', viewerStyles);
    }

    // Check canvas element
    const canvas = await page.$('canvas');
    console.log('Canvas element found:', !!canvas);

    if (canvas) {
      const canvasStyles = await page.evaluate(() => {
        const el = document.querySelector('canvas');
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          width: styles.width,
          height: styles.height,
          visibility: styles.visibility
        };
      });
      console.log('Canvas styles:', canvasStyles);
    }

    // Get DOM structure
    const domStructure = await page.evaluate(() => {
      const appContainer = document.querySelector('.app-container');
      if (!appContainer) return 'No .app-container found';

      function getElementInfo(el, depth = 0) {
        const indent = '  '.repeat(depth);
        const tag = el.tagName.toLowerCase();
        const classes = el.className ? ` class="${el.className}"` : '';
        const id = el.id ? ` id="${el.id}"` : '';
        const styles = window.getComputedStyle(el);
        const display = styles.display !== 'block' ? ` [${styles.display}]` : '';

        let result = `${indent}<${tag}${id}${classes}${display}>\\n`;

        for (let child of el.children) {
          result += getElementInfo(child, depth + 1);
        }

        return result;
      }

      return getElementInfo(appContainer);
    });

    console.log('\\nDOM Structure:');
    console.log(domStructure);

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugLayout().catch(console.error);