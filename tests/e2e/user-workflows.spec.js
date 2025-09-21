import { test, expect } from '@playwright/test'

/**
 * E2E tests for critical user workflows in st_configurator
 */

test.describe('User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Wait for the application to load
    await page.waitForSelector('#3d-canvas', { timeout: 10000 })
    await page.waitForSelector('#texture-canvas', { timeout: 5000 })

    // Wait for initial 3D scene setup
    await page.waitForTimeout(2000)
  })

  test.describe('New User Workflow', () => {
    test('should load application and display 3D scene', async ({ page }) => {
      // Verify main UI elements are present
      await expect(page.locator('#3d-canvas')).toBeVisible()
      await expect(page.locator('#texture-canvas')).toBeVisible()
      await expect(page.locator('#add-text-btn')).toBeVisible()
      await expect(page.locator('#add-logo-btn')).toBeVisible()

      // Verify 3D scene is rendered
      const canvas = page.locator('#3d-canvas')
      await expect(canvas).toHaveAttribute('width')
      await expect(canvas).toHaveAttribute('height')
    })

    test('should add text layer and customize it', async ({ page }) => {
      // Add text layer
      await page.click('#add-text-btn')

      // Wait for layer to be created
      await page.waitForSelector('.layer-item', { timeout: 5000 })

      // Verify layer appears in panel
      const layerItem = page.locator('.layer-item').first()
      await expect(layerItem).toBeVisible()
      await expect(layerItem).toContainText('Text Layer')

      // Select the layer
      await layerItem.click()

      // Wait for properties panel to update
      await page.waitForSelector('#text-input', { timeout: 3000 })

      // Customize text content
      await page.fill('#text-input', 'PLAYER NAME')
      await page.waitForTimeout(500) // Allow for debounced updates

      // Verify text was updated
      await expect(page.locator('#text-input')).toHaveValue('PLAYER NAME')

      // Customize font size
      await page.fill('#font-size-slider', '24')
      await page.waitForTimeout(500)

      // Verify font size was updated
      await expect(page.locator('#font-size-value')).toContainText('24')
    })

    test('should upload and add image layer', async ({ page }) => {
      // Prepare test image file
      const fileContent = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      )

      // Create file input handler
      await page.setInputFiles('#file-input', {
        name: 'test-logo.png',
        mimeType: 'image/png',
        buffer: fileContent
      })

      // Wait for image to be processed and layer created
      await page.waitForSelector('.layer-item[data-type="image"]', { timeout: 10000 })

      // Verify image layer appears
      const imageLayer = page.locator('.layer-item[data-type="image"]').first()
      await expect(imageLayer).toBeVisible()
      await expect(imageLayer).toContainText('Image Layer')

      // Select image layer
      await imageLayer.click()

      // Wait for properties to load
      await page.waitForTimeout(1000)

      // Verify image layer properties are available
      await expect(page.locator('#opacity-slider')).toBeVisible()
      await expect(page.locator('#position-x-slider')).toBeVisible()
      await expect(page.locator('#position-y-slider')).toBeVisible()
    })

    test('should save session with custom name', async ({ page }) => {
      // Add a text layer first
      await page.click('#add-text-btn')
      await page.waitForSelector('.layer-item', { timeout: 5000 })

      // Click save session button
      await page.click('#save-session')

      // Handle session name dialog
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('prompt')
        expect(dialog.message()).toContain('session name')
        await dialog.accept('My First Design')
      })

      // Wait for save to complete
      await page.waitForSelector('.notification.success', { timeout: 10000 })

      // Verify success notification
      const notification = page.locator('.notification.success')
      await expect(notification).toBeVisible()
      await expect(notification).toContainText('Session saved')
    })
  })

  test.describe('Experienced User Workflow', () => {
    test.beforeEach(async ({ page }) => {
      // Load existing test session
      await page.goto('/e2e-test-session')
      await page.waitForSelector('.layer-item', { timeout: 10000 })
    })

    test('should load existing session with layers', async ({ page }) => {
      // Verify session loaded with existing layers
      const layers = page.locator('.layer-item')
      await expect(layers).toHaveCount(1)

      // Verify test layer exists
      const testLayer = page.locator('.layer-item').first()
      await expect(testLayer).toContainText('Test Text Layer')

      // Verify layer properties
      await testLayer.click()
      await page.waitForTimeout(1000)

      await expect(page.locator('#text-input')).toHaveValue('E2E Test Text')
    })

    test('should duplicate and modify layers', async ({ page }) => {
      // Select first layer
      const firstLayer = page.locator('.layer-item').first()
      await firstLayer.click()

      // Duplicate layer
      await page.click('#duplicate-layer-btn')

      // Wait for duplicate to appear
      await page.waitForSelector('.layer-item:nth-child(2)', { timeout: 5000 })

      // Verify we now have 2 layers
      const layers = page.locator('.layer-item')
      await expect(layers).toHaveCount(2)

      // Select the duplicate layer
      const duplicateLayer = page.locator('.layer-item').nth(1)
      await duplicateLayer.click()

      // Modify the duplicate
      await page.fill('#text-input', 'DUPLICATE TEXT')
      await page.waitForTimeout(500)

      // Verify modification
      await expect(page.locator('#text-input')).toHaveValue('DUPLICATE TEXT')
    })

    test('should reorder layers', async ({ page }) => {
      // Add another layer to have multiple layers
      await page.click('#add-text-btn')
      await page.waitForSelector('.layer-item:nth-child(2)', { timeout: 5000 })

      // Select first layer
      const firstLayer = page.locator('.layer-item').first()
      await firstLayer.click()

      // Move layer down
      await page.click('#move-layer-down-btn')
      await page.waitForTimeout(500)

      // Verify layer order changed
      const layers = page.locator('.layer-item')
      const firstLayerText = await layers.first().textContent()
      await expect(firstLayerText).not.toContain('Test Text Layer')
    })

    test('should export configuration', async ({ page }) => {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download')

      // Click export button (assuming it exists)
      await page.click('#export-config-btn')

      // Wait for download
      const download = await downloadPromise

      // Verify download
      expect(download.suggestedFilename()).toContain('.json')

      // Save download for verification
      const path = await download.path()
      expect(path).toBeTruthy()
    })
  })

  test.describe('Error Recovery Workflow', () => {
    test('should handle oversized file upload gracefully', async ({ page }) => {
      // Create oversized file content (simulate 10MB file)
      const largeFileContent = Buffer.alloc(10 * 1024 * 1024, 'a')

      // Attempt to upload oversized file
      await page.setInputFiles('#file-input', {
        name: 'oversized-image.png',
        mimeType: 'image/png',
        buffer: largeFileContent
      })

      // Wait for error notification
      await page.waitForSelector('.notification.error', { timeout: 10000 })

      // Verify error message
      const errorNotification = page.locator('.notification.error')
      await expect(errorNotification).toBeVisible()
      await expect(errorNotification).toContainText('too large')
      await expect(errorNotification).toContainText('5MB')
    })

    test('should handle network interruption gracefully', async ({ page }) => {
      // Add a layer first
      await page.click('#add-text-btn')
      await page.waitForSelector('.layer-item', { timeout: 5000 })

      // Simulate network failure by intercepting requests
      await page.route('**/api/sessions', route => {
        route.abort('failed')
      })

      // Attempt to save session
      await page.click('#save-session')

      // Handle dialog
      page.on('dialog', async dialog => {
        await dialog.accept('Network Test Session')
      })

      // Wait for error notification
      await page.waitForSelector('.notification.error', { timeout: 10000 })

      // Verify error handling
      const errorNotification = page.locator('.notification.error')
      await expect(errorNotification).toBeVisible()
      await expect(errorNotification).toContainText('error')
    })

    test('should recover from invalid session data', async ({ page }) => {
      // Navigate to non-existent session
      await page.goto('/non-existent-session-id')

      // Wait for error handling
      await page.waitForTimeout(3000)

      // Should redirect or show error, but app should still work
      await expect(page.locator('#3d-canvas')).toBeVisible()

      // App should still be functional
      await page.click('#add-text-btn')
      await page.waitForSelector('.layer-item', { timeout: 5000 })

      const layer = page.locator('.layer-item').first()
      await expect(layer).toBeVisible()
    })
  })

  test.describe('Performance and Memory', () => {
    test('should handle multiple layer operations efficiently', async ({ page }) => {
      const startTime = Date.now()

      // Create multiple layers quickly
      for (let i = 0; i < 5; i++) {
        await page.click('#add-text-btn')
        await page.waitForTimeout(200) // Brief wait between operations
      }

      // Wait for all layers to be created
      await page.waitForSelector('.layer-item:nth-child(5)', { timeout: 10000 })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (10 seconds)
      expect(duration).toBeLessThan(10000)

      // Verify all layers exist
      const layers = page.locator('.layer-item')
      await expect(layers).toHaveCount(5)
    })

    test('should maintain responsiveness during texture updates', async ({ page }) => {
      // Add text layer
      await page.click('#add-text-btn')
      await page.waitForSelector('.layer-item', { timeout: 5000 })

      // Select layer
      await page.click('.layer-item')
      await page.waitForTimeout(1000)

      // Rapidly change text to trigger multiple updates
      const textInput = page.locator('#text-input')
      await textInput.clear()

      const testTexts = ['A', 'AB', 'ABC', 'ABCD', 'ABCDE', 'FINAL TEXT']

      for (const text of testTexts) {
        await textInput.fill(text)
        await page.waitForTimeout(100) // Brief wait to allow processing
      }

      // Verify final text is set correctly
      await expect(textInput).toHaveValue('FINAL TEXT')

      // Verify UI remains responsive
      await page.click('#add-text-btn')
      await page.waitForSelector('.layer-item:nth-child(2)', { timeout: 5000 })
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page, isMobile }) => {
      if (!isMobile) {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })
      }

      // Verify main elements are still accessible
      await expect(page.locator('#3d-canvas')).toBeVisible()
      await expect(page.locator('#add-text-btn')).toBeVisible()

      // Test touch interactions
      await page.tap('#add-text-btn')
      await page.waitForSelector('.layer-item', { timeout: 5000 })

      // Verify layer was created
      const layer = page.locator('.layer-item').first()
      await expect(layer).toBeVisible()

      // Test layer selection on mobile
      await page.tap('.layer-item')
      await page.waitForTimeout(1000)

      // Verify properties panel is accessible
      await expect(page.locator('#text-input')).toBeVisible()
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      // Browser-specific adjustments if needed
      const isWebkit = browserName === 'webkit'
      const isFirefox = browserName === 'firefox'

      // Basic functionality test
      await page.click('#add-text-btn')
      await page.waitForSelector('.layer-item', { timeout: isWebkit ? 10000 : 5000 })

      // Verify layer creation works
      const layer = page.locator('.layer-item').first()
      await expect(layer).toBeVisible()

      // Test text input
      await layer.click()
      await page.waitForTimeout(1000)

      await page.fill('#text-input', 'Browser Test')
      await page.waitForTimeout(500)

      await expect(page.locator('#text-input')).toHaveValue('Browser Test')

      // Test slider interactions (may behave differently in different browsers)
      const fontSizeSlider = page.locator('#font-size-slider')
      await fontSizeSlider.fill('20')
      await page.waitForTimeout(500)

      // Verify slider update
      await expect(page.locator('#font-size-value')).toContainText('20')
    })
  })
})