#!/usr/bin/env node

/**
 * Bundle Optimization Testing Script
 * Validates bundle size improvements and performance metrics
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { performance } from 'perf_hooks';

const COLORS = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    RESET: '\x1b[0m'
};

class BundleOptimizationTester {
    constructor() {
        this.results = {
            buildTime: 0,
            bundleSize: 0,
            chunkCount: 0,
            compressionRatio: 0,
            performanceScore: 0,
            recommendations: []
        };
        this.originalSize = 2.5 * 1024 * 1024; // 2.5MB from stability assessment
    }

    log(message, color = COLORS.WHITE) {
        console.log(`${color}${message}${COLORS.RESET}`);
    }

    logSuccess(message) {
        this.log(`✅ ${message}`, COLORS.GREEN);
    }

    logWarning(message) {
        this.log(`⚠️ ${message}`, COLORS.YELLOW);
    }

    logError(message) {
        this.log(`❌ ${message}`, COLORS.RED);
    }

    logInfo(message) {
        this.log(`ℹ️ ${message}`, COLORS.CYAN);
    }

    async runTest() {
        this.log('\n🚀 Starting Bundle Optimization Test', COLORS.MAGENTA);
        this.log('=' .repeat(60), COLORS.BLUE);

        try {
            // Step 1: Clean and build
            await this.buildProject();

            // Step 2: Analyze bundle
            await this.analyzeBundles();

            // Step 3: Test loading performance
            await this.testLoadingPerformance();

            // Step 4: Validate optimization targets
            await this.validateTargets();

            // Step 5: Generate report
            await this.generateReport();

            this.logSuccess('Bundle optimization test completed successfully');

        } catch (error) {
            this.logError(`Test failed: ${error.message}`);
            process.exit(1);
        }
    }

    async buildProject() {
        this.log('\n📦 Building project for production...', COLORS.BLUE);
        const startTime = performance.now();

        try {
            // Clean dist directory
            if (existsSync('./dist')) {
                execSync('rm -rf ./dist', { stdio: 'pipe' });
            }

            // Build with production optimizations
            execSync('npm run build:production', { stdio: 'pipe' });

            this.results.buildTime = Math.round(performance.now() - startTime);
            this.logSuccess(`Build completed in ${this.results.buildTime}ms`);

        } catch (error) {
            throw new Error(`Build failed: ${error.message}`);
        }
    }

    async analyzeBundles() {
        this.log('\n📊 Analyzing bundle structure...', COLORS.BLUE);

        const distPath = resolve('./dist');
        if (!existsSync(distPath)) {
            throw new Error('Dist directory not found');
        }

        // Get all files
        const getAllFiles = (dir) => {
            const files = [];
            const fs = require('fs');
            const items = fs.readdirSync(dir);

            for (const item of items) {
                const fullPath = join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    files.push(...getAllFiles(fullPath));
                } else {
                    files.push(fullPath);
                }
            }
            return files;
        };

        const allFiles = getAllFiles(distPath);
        const jsFiles = allFiles.filter(f => f.endsWith('.js'));
        const cssFiles = allFiles.filter(f => f.endsWith('.css'));

        // Calculate sizes
        let totalSize = 0;
        let jsSize = 0;
        let cssSize = 0;

        const fs = require('fs');

        allFiles.forEach(file => {
            const size = fs.statSync(file).size;
            totalSize += size;

            if (file.endsWith('.js')) {
                jsSize += size;
            } else if (file.endsWith('.css')) {
                cssSize += size;
            }
        });

        this.results.bundleSize = totalSize;
        this.results.chunkCount = jsFiles.length + cssFiles.length;

        // Log analysis
        this.logInfo(`Total files: ${allFiles.length}`);
        this.logInfo(`JavaScript chunks: ${jsFiles.length}`);
        this.logInfo(`CSS files: ${cssFiles.length}`);
        this.logInfo(`Total size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB`);
        this.logInfo(`JavaScript: ${Math.round(jsSize / 1024)}KB`);
        this.logInfo(`CSS: ${Math.round(cssSize / 1024)}KB`);

        // Check for required chunks
        const requiredChunks = ['three', 'scene', 'layers', 'ui', 'config'];
        const foundChunks = [];

        jsFiles.forEach(file => {
            const filename = file.split('/').pop();
            requiredChunks.forEach(chunk => {
                if (filename.includes(chunk)) {
                    foundChunks.push(chunk);
                }
            });
        });

        this.logInfo(`Required chunks found: ${foundChunks.join(', ')}`);

        if (foundChunks.length < requiredChunks.length) {
            this.logWarning(`Missing chunks: ${requiredChunks.filter(c => !foundChunks.includes(c)).join(', ')}`);
        }
    }

    async testLoadingPerformance() {
        this.log('\n⚡ Testing loading performance...', COLORS.BLUE);

        // Simulate network conditions
        const networkConditions = [
            { name: 'Fast 3G', bandwidth: 1600, latency: 150 },
            { name: 'Slow 3G', bandwidth: 400, latency: 400 },
            { name: 'Regular 4G', bandwidth: 4000, latency: 50 }
        ];

        const loadTimes = [];

        for (const condition of networkConditions) {
            const estimatedTime = this.estimateLoadTime(this.results.bundleSize, condition);
            loadTimes.push({
                network: condition.name,
                time: estimatedTime
            });

            this.logInfo(`${condition.name}: ~${estimatedTime}ms`);
        }

        // Calculate performance score (lower is better)
        const avgLoadTime = loadTimes.reduce((sum, lt) => sum + lt.time, 0) / loadTimes.length;
        this.results.performanceScore = Math.round(avgLoadTime);
    }

    estimateLoadTime(sizeBytes, networkCondition) {
        // Estimate based on bandwidth and latency
        const { bandwidth, latency } = networkCondition;
        const downloadTime = (sizeBytes * 8) / (bandwidth * 1024); // Convert to seconds
        const totalTime = (downloadTime * 1000) + latency; // Convert to ms and add latency

        return Math.round(totalTime);
    }

    async validateTargets() {
        this.log('\n🎯 Validating optimization targets...', COLORS.BLUE);

        const sizeMB = this.results.bundleSize / 1024 / 1024;
        const sizeReduction = (1 - sizeMB / (this.originalSize / 1024 / 1024)) * 100;

        // Target validations
        const targets = [
            {
                name: 'Bundle size < 1MB',
                target: 1024 * 1024,
                actual: this.results.bundleSize,
                passed: this.results.bundleSize < 1024 * 1024
            },
            {
                name: 'Size reduction >= 60%',
                target: 60,
                actual: sizeReduction,
                passed: sizeReduction >= 60
            },
            {
                name: 'Chunk count >= 5',
                target: 5,
                actual: this.results.chunkCount,
                passed: this.results.chunkCount >= 5
            },
            {
                name: 'Load time < 2000ms (Fast 3G)',
                target: 2000,
                actual: this.results.performanceScore,
                passed: this.results.performanceScore < 2000
            }
        ];

        let passedTargets = 0;

        targets.forEach(target => {
            if (target.passed) {
                this.logSuccess(`${target.name}: PASSED`);
                passedTargets++;
            } else {
                this.logError(`${target.name}: FAILED (target: ${target.target}, actual: ${Math.round(target.actual)})`);
                this.results.recommendations.push(`Improve ${target.name.toLowerCase()}`);
            }
        });

        this.logInfo(`Targets passed: ${passedTargets}/${targets.length}`);

        // Generate specific recommendations
        if (sizeMB > 1) {
            this.results.recommendations.push('Implement more aggressive code splitting');
        }

        if (sizeReduction < 60) {
            this.results.recommendations.push('Apply additional compression techniques');
        }

        if (this.results.performanceScore > 2000) {
            this.results.recommendations.push('Optimize for slower network connections');
        }
    }

    async generateReport() {
        this.log('\n📋 Generating optimization report...', COLORS.BLUE);

        const sizeMB = Math.round(this.results.bundleSize / 1024 / 1024 * 100) / 100;
        const originalSizeMB = Math.round(this.originalSize / 1024 / 1024 * 100) / 100;
        const reduction = Math.round((1 - sizeMB / originalSizeMB) * 100);

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                originalSize: `${originalSizeMB}MB`,
                optimizedSize: `${sizeMB}MB`,
                reduction: `${reduction}%`,
                chunkCount: this.results.chunkCount,
                buildTime: `${this.results.buildTime}ms`,
                avgLoadTime: `${this.results.performanceScore}ms`
            },
            targets: {
                sizeTarget: '< 1MB',
                sizeAchieved: sizeMB < 1,
                reductionTarget: '>= 60%',
                reductionAchieved: reduction >= 60,
                loadTimeTarget: '< 2s',
                loadTimeAchieved: this.results.performanceScore < 2000
            },
            recommendations: this.results.recommendations,
            nextSteps: this.generateNextSteps()
        };

        // Save report
        writeFileSync('./bundle-optimization-report.json', JSON.stringify(report, null, 2));

        // Display summary
        this.log('\n🎉 Bundle Optimization Summary', COLORS.MAGENTA);
        this.log('=' .repeat(50), COLORS.BLUE);
        this.logInfo(`Original size: ${originalSizeMB}MB`);
        this.logInfo(`Optimized size: ${sizeMB}MB`);
        this.logInfo(`Size reduction: ${reduction}%`);
        this.logInfo(`Total chunks: ${this.results.chunkCount}`);
        this.logInfo(`Build time: ${this.results.buildTime}ms`);
        this.logInfo(`Avg load time: ${this.results.performanceScore}ms`);

        if (reduction >= 60 && sizeMB < 1) {
            this.logSuccess('🎯 Optimization targets achieved!');
        } else if (reduction >= 40) {
            this.logWarning('👍 Good optimization, consider further improvements');
        } else {
            this.logError('⚠️ Optimization targets not met, review strategy');
        }

        if (this.results.recommendations.length > 0) {
            this.log('\n💡 Recommendations:', COLORS.YELLOW);
            this.results.recommendations.forEach(rec => {
                this.log(`  • ${rec}`, COLORS.YELLOW);
            });
        }

        this.log(`\n📄 Detailed report saved to: bundle-optimization-report.json`, COLORS.CYAN);
    }

    generateNextSteps() {
        const steps = [];
        const sizeMB = this.results.bundleSize / 1024 / 1024;

        if (sizeMB > 1) {
            steps.push('Implement tree shaking for unused code');
            steps.push('Consider CDN for large dependencies like Three.js');
            steps.push('Add compression middleware (gzip/brotli)');
        }

        if (this.results.chunkCount < 5) {
            steps.push('Increase code splitting granularity');
            steps.push('Split large components into smaller chunks');
        }

        if (this.results.performanceScore > 2000) {
            steps.push('Implement service worker caching');
            steps.push('Add resource preloading for critical chunks');
            steps.push('Consider HTTP/2 server push');
        }

        steps.push('Monitor bundle size in CI/CD pipeline');
        steps.push('Implement bundle analysis in development workflow');

        return steps;
    }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new BundleOptimizationTester();
    tester.runTest().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export { BundleOptimizationTester };