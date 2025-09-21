#!/usr/bin/env node

/**
 * Test Runner Script for ST Configurator
 *
 * This script provides a convenient way to run tests with different configurations
 * and generate comprehensive reports.
 */

import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import { resolve } from 'path'

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function runCommand(command, description) {
  log(`\n🔄 ${description}...`, 'blue')
  try {
    const output = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    log(`✅ ${description} completed successfully`, 'green')
    return true
  } catch (error) {
    log(`❌ ${description} failed`, 'red')
    log(`Error: ${error.message}`, 'red')
    return false
  }
}

async function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  }

  try {
    await fs.mkdir(resolve('./test-results'), { recursive: true })
    await fs.writeFile(
      resolve('./test-results/test-runner-report.json'),
      JSON.stringify(report, null, 2)
    )
    log('📊 Test report generated: test-results/test-runner-report.json', 'cyan')
  } catch (error) {
    log(`⚠️ Could not generate test report: ${error.message}`, 'yellow')
  }

  return report
}

function printSummary(report) {
  log('\n📋 Test Summary', 'magenta')
  log('═'.repeat(50), 'magenta')
  log(`Total Test Suites: ${report.summary.total}`)
  log(`Passed: ${report.summary.passed}`, 'green')
  log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'reset')
  log(`Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`)

  if (report.summary.failed > 0) {
    log('\n❌ Failed Test Suites:', 'red')
    report.results
      .filter(r => !r.success)
      .forEach(r => log(`  • ${r.name}`, 'red'))
  }
}

async function main() {
  const args = process.argv.slice(2)
  const testType = args[0] || 'all'

  log('🧪 ST Configurator Test Runner', 'cyan')
  log('═'.repeat(50), 'cyan')

  const testSuites = []

  switch (testType) {
    case 'unit':
      testSuites.push({
        name: 'Unit Tests',
        command: 'npm run test:unit'
      })
      break

    case 'integration':
      testSuites.push({
        name: 'Integration Tests',
        command: 'npm run test:integration'
      })
      break

    case 'e2e':
      testSuites.push({
        name: 'E2E Tests',
        command: 'npm run test:e2e'
      })
      break

    case 'performance':
      testSuites.push({
        name: 'Performance Tests',
        command: 'npm run test:performance'
      })
      break

    case 'memory':
      testSuites.push({
        name: 'Memory Leak Tests',
        command: 'npm run test:memory'
      })
      break

    case 'quick':
      testSuites.push(
        {
          name: 'Unit Tests',
          command: 'npm run test:unit'
        },
        {
          name: 'Integration Tests',
          command: 'npm run test:integration'
        }
      )
      break

    case 'full':
    case 'all':
    default:
      testSuites.push(
        {
          name: 'Unit Tests',
          command: 'npm run test:unit'
        },
        {
          name: 'Integration Tests',
          command: 'npm run test:integration'
        },
        {
          name: 'E2E Tests',
          command: 'npm run test:e2e'
        },
        {
          name: 'Performance Tests',
          command: 'npm run test:performance'
        },
        {
          name: 'Memory Leak Tests',
          command: 'npm run test:memory'
        }
      )
      break
  }

  // Verify test environment
  log('🔍 Verifying test environment...', 'blue')

  try {
    // Check if required directories exist
    const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e']
    for (const dir of testDirs) {
      try {
        await fs.access(resolve(dir))
        log(`  ✓ ${dir} directory found`, 'green')
      } catch {
        log(`  ⚠️ ${dir} directory not found`, 'yellow')
      }
    }

    // Check if configuration files exist
    const configFiles = ['vitest.config.js', 'playwright.config.js']
    for (const file of configFiles) {
      try {
        await fs.access(resolve(file))
        log(`  ✓ ${file} configuration found`, 'green')
      } catch {
        log(`  ⚠️ ${file} configuration not found`, 'yellow')
      }
    }

  } catch (error) {
    log(`⚠️ Environment check failed: ${error.message}`, 'yellow')
  }

  // Run test suites
  const results = []
  let overallSuccess = true

  for (const suite of testSuites) {
    const success = runCommand(suite.command, suite.name)
    results.push({
      name: suite.name,
      command: suite.command,
      success
    })

    if (!success) {
      overallSuccess = false
    }
  }

  // Generate coverage if requested
  if (args.includes('--coverage')) {
    log('\n📊 Generating coverage report...', 'blue')
    runCommand('npm run test:coverage', 'Coverage Report')
  }

  // Generate and display report
  const report = await generateTestReport(results)
  printSummary(report)

  // Exit with appropriate code
  if (overallSuccess) {
    log('\n🎉 All tests completed successfully!', 'green')
    process.exit(0)
  } else {
    log('\n💥 Some tests failed. Check the output above for details.', 'red')
    process.exit(1)
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('🧪 ST Configurator Test Runner', 'cyan')
  log('\nUsage: node test-runner.js [test-type] [options]')
  log('\nTest Types:')
  log('  unit         Run unit tests only')
  log('  integration  Run integration tests only')
  log('  e2e          Run E2E tests only')
  log('  performance  Run performance tests only')
  log('  memory       Run memory leak tests only')
  log('  quick        Run unit + integration tests')
  log('  all          Run all test suites (default)')
  log('\nOptions:')
  log('  --coverage   Generate coverage report')
  log('  --help, -h   Show this help message')
  log('\nExamples:')
  log('  node test-runner.js unit')
  log('  node test-runner.js all --coverage')
  log('  node test-runner.js quick')
  process.exit(0)
}

// Run the test runner
main().catch(error => {
  log(`💥 Test runner failed: ${error.message}`, 'red')
  process.exit(1)
})