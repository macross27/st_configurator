import { resolve } from 'path'

/**
 * Global teardown for Playwright E2E tests
 * Runs once after all tests complete
 */
async function globalTeardown() {
  console.log('🧹 Starting global teardown for E2E tests...')

  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...')
    await cleanupTestData()

    // Archive test results if needed
    console.log('📦 Archiving test results...')
    await archiveTestResults()

    // Generate test summary
    console.log('📊 Generating test summary...')
    await generateTestSummary()

    console.log('✅ Global teardown completed successfully')

  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw - we don't want teardown failures to fail the test run
  }
}

/**
 * Clean up test data created during tests
 */
async function cleanupTestData() {
  try {
    const fs = await import('fs/promises')

    // Clean up test sessions
    const sessionsPath = resolve('./sessions')
    try {
      const files = await fs.readdir(sessionsPath)
      for (const file of files) {
        if (file.startsWith('test-') || file.startsWith('e2e-')) {
          await fs.unlink(resolve(sessionsPath, file))
          console.log(`🗑️ Removed test session: ${file}`)
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('Could not clean sessions directory:', err.message)
      }
    }

    // Clean up test uploads
    const uploadsPath = resolve('./uploads')
    try {
      const files = await fs.readdir(uploadsPath)
      for (const file of files) {
        if (file.startsWith('test-') || file.startsWith('e2e-')) {
          await fs.unlink(resolve(uploadsPath, file))
          console.log(`🗑️ Removed test upload: ${file}`)
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('Could not clean uploads directory:', err.message)
      }
    }

    // Clean up temporary test files
    const tempFiles = [
      './test-config.json',
      './test-export.json',
      './e2e-test-download.json'
    ]

    for (const file of tempFiles) {
      try {
        await fs.unlink(resolve(file))
        console.log(`🗑️ Removed temp file: ${file}`)
      } catch (err) {
        // File might not exist, that's okay
      }
    }

  } catch (error) {
    console.warn('Warning: Could not fully clean up test data:', error.message)
  }
}

/**
 * Archive test results for CI/CD or debugging
 */
async function archiveTestResults() {
  if (!process.env.CI) {
    return // Only archive in CI environment
  }

  try {
    const fs = await import('fs/promises')
    const archiver = await import('archiver')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveName = `test-results-${timestamp}.zip`
    const archivePath = resolve(`./test-results/${archiveName}`)

    const output = await fs.open(archivePath, 'w')
    const archive = archiver.create('zip', { zlib: { level: 9 } })

    archive.pipe(output)

    // Add test results
    archive.directory('test-results/playwright-report', 'playwright-report')
    archive.directory('test-results/screenshots', 'screenshots')
    archive.directory('test-results/videos', 'videos')

    // Add test artifacts
    if (await fileExists('./test-results/playwright-results.json')) {
      archive.file('./test-results/playwright-results.json', { name: 'playwright-results.json' })
    }

    if (await fileExists('./test-results/playwright-junit.xml')) {
      archive.file('./test-results/playwright-junit.xml', { name: 'playwright-junit.xml' })
    }

    await archive.finalize()
    await output.close()

    console.log(`📦 Test results archived to: ${archiveName}`)

  } catch (error) {
    console.warn('Could not archive test results:', error.message)
  }
}

/**
 * Generate a summary of test execution
 */
async function generateTestSummary() {
  try {
    const fs = await import('fs/promises')

    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        ci: !!process.env.CI,
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      testResults: await getTestResults(),
      coverage: await getCoverageInfo(),
      performance: await getPerformanceMetrics()
    }

    await fs.writeFile(
      resolve('./test-results/test-summary.json'),
      JSON.stringify(summary, null, 2)
    )

    console.log('📊 Test summary generated')

    // Log summary to console
    if (summary.testResults) {
      console.log(`📈 Test Results: ${summary.testResults.passed} passed, ${summary.testResults.failed} failed`)
    }

  } catch (error) {
    console.warn('Could not generate test summary:', error.message)
  }
}

/**
 * Extract test results from Playwright output
 */
async function getTestResults() {
  try {
    const fs = await import('fs/promises')
    const resultsPath = resolve('./test-results/playwright-results.json')

    if (await fileExists(resultsPath)) {
      const data = await fs.readFile(resultsPath, 'utf8')
      const results = JSON.parse(data)

      return {
        total: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        suites: results.suites?.length || 0
      }
    }
  } catch (error) {
    console.warn('Could not extract test results:', error.message)
  }

  return null
}

/**
 * Get coverage information if available
 */
async function getCoverageInfo() {
  try {
    const fs = await import('fs/promises')
    const coveragePath = resolve('./coverage/coverage-summary.json')

    if (await fileExists(coveragePath)) {
      const data = await fs.readFile(coveragePath, 'utf8')
      const coverage = JSON.parse(data)

      return {
        lines: coverage.total?.lines?.pct || 0,
        functions: coverage.total?.functions?.pct || 0,
        branches: coverage.total?.branches?.pct || 0,
        statements: coverage.total?.statements?.pct || 0
      }
    }
  } catch (error) {
    console.warn('Could not extract coverage info:', error.message)
  }

  return null
}

/**
 * Get performance metrics from test execution
 */
async function getPerformanceMetrics() {
  try {
    const fs = await import('fs/promises')
    const metricsPath = resolve('./test-results/performance-metrics.json')

    if (await fileExists(metricsPath)) {
      const data = await fs.readFile(metricsPath, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('Could not extract performance metrics:', error.message)
  }

  return null
}

/**
 * Check if a file exists
 */
async function fileExists(path) {
  try {
    const fs = await import('fs/promises')
    await fs.access(resolve(path))
    return true
  } catch {
    return false
  }
}

export default globalTeardown