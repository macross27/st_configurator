/**
 * Bundle Size Integration Tests
 * Validates bundle optimization targets and performance metrics
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { glob } from 'glob';

describe('Bundle Size Optimization', () => {
    const distPath = resolve('./dist');
    let bundleFiles = [];
    let totalBundleSize = 0;

    beforeAll(async () => {
        // Check if dist directory exists (built)
        if (!existsSync(distPath)) {
            throw new Error('Dist directory not found. Run "npm run build" first.');
        }

        // Get all JS and CSS files
        bundleFiles = await glob('**/*.{js,css}', { cwd: distPath });

        // Calculate total bundle size
        bundleFiles.forEach(file => {
            const filePath = join(distPath, file);
            const stats = statSync(filePath);
            totalBundleSize += stats.size;
        });
    });

    test('Total bundle size should be under 1MB (target: 60% reduction from 2.5MB)', () => {
        const targetSize = 1024 * 1024; // 1MB
        const actualSizeMB = Math.round(totalBundleSize / 1024 / 1024 * 100) / 100;

        console.log(`📦 Total bundle size: ${actualSizeMB}MB`);
        console.log(`🎯 Target: <1MB`);

        expect(totalBundleSize).toBeLessThan(targetSize);
    });

    test('Should have proper chunk splitting (minimum 5 chunks)', () => {
        const jsFiles = bundleFiles.filter(file => file.endsWith('.js'));

        console.log(`📂 JavaScript chunks: ${jsFiles.length}`);
        console.log(`📋 Chunks: ${jsFiles.map(f => f.replace('.js', '')).join(', ')}`);

        // Should have at least main, three, layers, ui, config chunks
        expect(jsFiles.length).toBeGreaterThanOrEqual(5);
    });

    test('Three.js should be in separate chunk', () => {
        const threeChunk = bundleFiles.find(file =>
            file.includes('three') && file.endsWith('.js')
        );

        expect(threeChunk).toBeDefined();

        if (threeChunk) {
            const threeSize = statSync(join(distPath, threeChunk)).size;
            const threeSizeKB = Math.round(threeSize / 1024);
            console.log(`🎯 Three.js chunk: ${threeChunk} (${threeSizeKB}KB)`);

            // Three.js should be reasonably sized (300-800KB compressed)
            expect(threeSize).toBeGreaterThan(200 * 1024); // At least 200KB
            expect(threeSize).toBeLessThan(1024 * 1024); // Less than 1MB
        }
    });

    test('Individual chunks should not exceed 500KB', () => {
        const maxChunkSize = 500 * 1024; // 500KB
        const oversizedChunks = [];

        bundleFiles.forEach(file => {
            const filePath = join(distPath, file);
            const size = statSync(filePath).size;

            if (size > maxChunkSize) {
                oversizedChunks.push({
                    file,
                    size: Math.round(size / 1024),
                    sizeMB: Math.round(size / 1024 / 1024 * 100) / 100
                });
            }
        });

        if (oversizedChunks.length > 0) {
            console.warn('🚨 Oversized chunks:', oversizedChunks);
        }

        expect(oversizedChunks.length).toBe(0);
    });

    test('Should have CSS code splitting', () => {
        const cssFiles = bundleFiles.filter(file => file.endsWith('.css'));

        console.log(`🎨 CSS files: ${cssFiles.length}`);

        // Should have at least one CSS file
        expect(cssFiles.length).toBeGreaterThanOrEqual(1);

        // Total CSS should be reasonable
        const totalCSSSize = cssFiles.reduce((sum, file) => {
            return sum + statSync(join(distPath, file)).size;
        }, 0);

        const cssSizeKB = Math.round(totalCSSSize / 1024);
        console.log(`🎨 Total CSS size: ${cssSizeKB}KB`);

        // CSS should be under 100KB
        expect(totalCSSSize).toBeLessThan(100 * 1024);
    });

    test('Should have proper file naming for caching', () => {
        const jsFiles = bundleFiles.filter(file => file.endsWith('.js'));

        // All JS files should have hash in filename for cache busting
        jsFiles.forEach(file => {
            // Should match pattern: filename-[hash].js
            expect(file).toMatch(/-.+\.js$/);
        });
    });

    test('Should have asset optimization', () => {
        // Check for organized asset structure
        const assetDirs = ['js', 'css', 'assets'];

        assetDirs.forEach(dir => {
            const dirPath = join(distPath, dir);
            if (existsSync(dirPath)) {
                console.log(`✅ Asset directory exists: ${dir}`);
            }
        });

        // At least js and assets directories should exist
        expect(existsSync(join(distPath, 'js'))).toBe(true);
    });

    test('Bundle analysis results should be reasonable', () => {
        const bundleReport = {
            totalBundles: bundleFiles.length,
            totalSize: totalBundleSize,
            totalSizeMB: Math.round(totalBundleSize / 1024 / 1024 * 100) / 100,
            largestBundle: null,
            bundles: []
        };

        bundleFiles.forEach(file => {
            const size = statSync(join(distPath, file)).size;
            bundleReport.bundles.push({
                name: file,
                size: size,
                sizeMB: Math.round(size / 1024 / 1024 * 100) / 100,
                sizeKB: Math.round(size / 1024)
            });
        });

        bundleReport.bundles.sort((a, b) => b.size - a.size);
        bundleReport.largestBundle = bundleReport.bundles[0];

        console.log('\n📊 Bundle Analysis Report:');
        console.log(`📦 Total bundles: ${bundleReport.totalBundles}`);
        console.log(`📏 Total size: ${bundleReport.totalSizeMB}MB`);
        console.log(`🔍 Largest bundle: ${bundleReport.largestBundle.name} (${bundleReport.largestBundle.sizeKB}KB)`);

        console.log('\n📋 Bundle breakdown:');
        bundleReport.bundles.slice(0, 10).forEach(bundle => {
            console.log(`  ${bundle.name}: ${bundle.sizeKB}KB`);
        });

        // Validate overall structure
        expect(bundleReport.totalBundles).toBeGreaterThan(3);
        expect(bundleReport.totalSizeMB).toBeLessThan(1);
    });

    test('Performance budget compliance', () => {
        const performanceBudget = {
            totalJS: 800 * 1024, // 800KB
            totalCSS: 50 * 1024, // 50KB
            totalAssets: 1024 * 1024, // 1MB
            maxChunk: 500 * 1024, // 500KB per chunk
            maxInitialLoad: 600 * 1024 // 600KB initial load
        };

        const jsSize = bundleFiles
            .filter(f => f.endsWith('.js'))
            .reduce((sum, f) => sum + statSync(join(distPath, f)).size, 0);

        const cssSize = bundleFiles
            .filter(f => f.endsWith('.css'))
            .reduce((sum, f) => sum + statSync(join(distPath, f)).size, 0);

        console.log('\n💰 Performance Budget Check:');
        console.log(`JavaScript: ${Math.round(jsSize / 1024)}KB / ${Math.round(performanceBudget.totalJS / 1024)}KB`);
        console.log(`CSS: ${Math.round(cssSize / 1024)}KB / ${Math.round(performanceBudget.totalCSS / 1024)}KB`);
        console.log(`Total: ${Math.round(totalBundleSize / 1024)}KB / ${Math.round(performanceBudget.totalAssets / 1024)}KB`);

        expect(jsSize).toBeLessThan(performanceBudget.totalJS);
        expect(cssSize).toBeLessThan(performanceBudget.totalCSS);
        expect(totalBundleSize).toBeLessThan(performanceBudget.totalAssets);
    });

    afterAll(() => {
        // Output final optimization summary
        const originalSize = 2.5; // MB (from stability assessment)
        const currentSizeMB = Math.round(totalBundleSize / 1024 / 1024 * 100) / 100;
        const reduction = Math.round((1 - currentSizeMB / originalSize) * 100);

        console.log('\n🎉 Bundle Optimization Summary:');
        console.log(`📉 Size reduction: ${reduction}% (${originalSize}MB → ${currentSizeMB}MB)`);
        console.log(`📦 Total chunks: ${bundleFiles.length}`);
        console.log(`✅ Target achieved: ${currentSizeMB < 1 ? 'YES' : 'NO'}`);

        if (reduction >= 60) {
            console.log('🎯 Excellent! Bundle size reduced by 60%+ as targeted');
        } else if (reduction >= 40) {
            console.log('👍 Good reduction, consider further optimization');
        } else {
            console.log('⚠️ Bundle size reduction below target, optimization needed');
        }
    });
});