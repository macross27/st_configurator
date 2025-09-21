import { chromium } from '@playwright/test'
import { execSync } from 'child_process'
import { resolve } from 'path'

/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests
 */
async function globalSetup() {
  console.log('🚀 Starting global setup for E2E tests...')

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up test data...')
    await cleanupTestData()

    // Setup test database/session storage
    console.log('💾 Setting up test storage...')
    await setupTestStorage()

    // Verify servers are accessible
    console.log('🔍 Verifying server accessibility...')
    await verifyServers()

    // Create test fixtures
    console.log('📁 Creating test fixtures...')
    await createTestFixtures()

    console.log('✅ Global setup completed successfully')

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}

/**
 * Clean up any existing test data
 */
async function cleanupTestData() {
  try {
    // Clean up test sessions directory
    const fs = await import('fs/promises')
    const path = resolve('./sessions')

    try {
      const files = await fs.readdir(path)
      for (const file of files) {
        if (file.startsWith('test-') || file.startsWith('e2e-')) {
          await fs.unlink(resolve(path, file))
        }
      }
    } catch (err) {
      // Directory might not exist, that's okay
      if (err.code !== 'ENOENT') {
        throw err
      }
    }

    // Clean up test uploads
    const uploadsPath = resolve('./uploads')
    try {
      const files = await fs.readdir(uploadsPath)
      for (const file of files) {
        if (file.startsWith('test-') || file.startsWith('e2e-')) {
          await fs.unlink(resolve(uploadsPath, file))
        }
      }
    } catch (err) {
      // Directory might not exist, that's okay
      if (err.code !== 'ENOENT') {
        throw err
      }
    }

  } catch (error) {
    console.warn('Warning: Could not clean up test data:', error.message)
  }
}

/**
 * Setup test storage directories
 */
async function setupTestStorage() {
  try {
    const fs = await import('fs/promises')

    // Ensure required directories exist
    const directories = [
      './sessions',
      './uploads',
      './test-results',
      './test-results/screenshots',
      './test-results/videos'
    ]

    for (const dir of directories) {
      try {
        await fs.mkdir(resolve(dir), { recursive: true })
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err
        }
      }
    }

  } catch (error) {
    console.error('Failed to setup test storage:', error)
    throw error
  }
}

/**
 * Verify that both frontend and backend servers are accessible
 */
async function verifyServers() {
  const maxRetries = 30
  const retryDelay = 1000

  // Check backend server
  await verifyServer('http://localhost:3030/api/config', 'Backend', maxRetries, retryDelay)

  // Check frontend server
  await verifyServer('http://localhost:3020', 'Frontend', maxRetries, retryDelay)
}

/**
 * Verify a specific server is accessible
 */
async function verifyServer(url, name, maxRetries, retryDelay) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) {
        console.log(`✅ ${name} server is accessible at ${url}`)
        return
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`❌ ${name} server is not accessible at ${url} after ${maxRetries} attempts`)
      }
      console.log(`⏳ Waiting for ${name} server (attempt ${attempt}/${maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
}

/**
 * Create test fixtures and data
 */
async function createTestFixtures() {
  try {
    const fs = await import('fs/promises')

    // Create test session data
    const testSession = {
      id: 'e2e-test-session',
      name: 'E2E Test Session',
      timestamp: new Date().toISOString(),
      layers: [
        {
          id: 'test-text-layer',
          type: 'text',
          name: 'Test Text Layer',
          text: 'E2E Test Text',
          x: 100,
          y: 100,
          width: 200,
          height: 50,
          fontSize: 16,
          color: '#000000',
          fontFamily: 'Arial',
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          zIndex: 1
        }
      ],
      modelPath: '/models/test-uniform.glb',
      sceneSettings: {
        cameraPosition: { x: 0, y: 0, z: 5 },
        lightingIntensity: 1,
        backgroundColor: '#ffffff'
      },
      uiState: {
        selectedLayerId: null,
        panelStates: {
          layers: true,
          properties: true
        }
      }
    }

    // Save test session
    await fs.writeFile(
      resolve('./sessions/e2e-test-session.json'),
      JSON.stringify(testSession, null, 2)
    )

    // Create test image file (1x1 pixel PNG)
    const testImageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )

    await fs.writeFile(
      resolve('./uploads/e2e-test-image.png'),
      testImageData
    )

    console.log('📁 Test fixtures created successfully')

  } catch (error) {
    console.error('Failed to create test fixtures:', error)
    throw error
  }
}

export default globalSetup