import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

/**
 * Playwright configuration for st_configurator E2E testing
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Global test timeout
  timeout: 30000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests for consistency
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],

  // Shared settings for all tests
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:3020',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Screenshot and video settings
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Accept downloads
    acceptDownloads: true,

    // Action timeout
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },
    // Tablet testing
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] }
    }
  ],

  // Global setup and teardown
  globalSetup: resolve('./tests/e2e/global-setup.js'),
  globalTeardown: resolve('./tests/e2e/global-teardown.js'),

  // Test output directory
  outputDir: 'test-results/playwright-output',

  // Web server configuration for testing against dev server
  webServer: [
    {
      command: 'npm run server',
      port: 3030,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        PORT: '3030'
      }
    },
    {
      command: 'npm run dev',
      port: 3020,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        FRONTEND_PORT: '3020'
      }
    }
  ],

  // Test configuration
  testIgnore: [
    '**/node_modules/**',
    '**/build/**',
    '**/dist/**'
  ],

  // Metadata
  metadata: {
    project: 'st_configurator',
    version: '1.0.0',
    description: 'E2E tests for the st_configurator application'
  }
})