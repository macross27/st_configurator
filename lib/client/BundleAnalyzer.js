/**
 * Bundle Size Monitor and Performance Analyzer
 * Tracks bundle loading performance and provides optimization insights
 */

export class BundleAnalyzer {
    constructor() {
        this.bundleMetrics = new Map();
        this.loadingTimes = new Map();
        this.networkMetrics = new Map();
        this.memoryMetrics = new Map();
        this.performanceEntries = [];
        this.isMonitoring = false;

        this.initialize();
    }

    initialize() {
        // Monitor performance entries
        if ('PerformanceObserver' in window) {
            this.setupPerformanceObserver();
        }

        // Monitor memory usage
        if ('memory' in performance) {
            this.startMemoryMonitoring();
        }

        // Monitor network resources
        this.monitorNetworkResources();

        // Setup bundle size tracking
        this.trackBundleSizes();

        this.isMonitoring = true;
        console.log('📊 Bundle analyzer initialized');
    }

    setupPerformanceObserver() {
        try {
            // Monitor navigation timing
            const navObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordNavigationTiming(entry);
                }
            });
            navObserver.observe({ entryTypes: ['navigation'] });

            // Monitor resource loading
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordResourceTiming(entry);
                }
            });
            resourceObserver.observe({ entryTypes: ['resource'] });

            // Monitor largest contentful paint
            const lcpObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordLCP(entry);
                }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // Monitor cumulative layout shift
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordCLS(entry);
                }
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });

        } catch (error) {
            console.warn('Performance Observer not fully supported:', error);
        }
    }

    startMemoryMonitoring() {
        const measureMemory = () => {
            if ('memory' in performance) {
                const memory = performance.memory;
                this.memoryMetrics.set(Date.now(), {
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize,
                    jsHeapSizeLimit: memory.jsHeapSizeLimit,
                    usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
                    totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024)
                });
            }
        };

        // Measure every 5 seconds
        setInterval(measureMemory, 5000);
        measureMemory(); // Initial measurement
    }

    monitorNetworkResources() {
        // Track dynamic imports and chunk loading
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];

            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const loadTime = endTime - startTime;

                // Track if this is a bundle chunk
                if (typeof url === 'string' && (url.includes('.js') || url.includes('.css'))) {
                    this.recordChunkLoad(url, loadTime, response.ok);
                }

                return response;
            } catch (error) {
                const endTime = performance.now();
                const loadTime = endTime - startTime;
                this.recordChunkLoad(url, loadTime, false, error);
                throw error;
            }
        };
    }

    trackBundleSizes() {
        // Estimate bundle sizes from resource timing
        if ('getEntriesByType' in performance) {
            const resources = performance.getEntriesByType('resource');

            resources.forEach(resource => {
                if (resource.name.includes('.js') || resource.name.includes('.css')) {
                    this.estimateBundleSize(resource);
                }
            });
        }
    }

    recordNavigationTiming(entry) {
        this.performanceEntries.push({
            type: 'navigation',
            timestamp: Date.now(),
            metrics: {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart,
                firstPaint: entry.responseEnd - entry.fetchStart,
                totalTime: entry.loadEventEnd - entry.fetchStart
            }
        });
    }

    recordResourceTiming(entry) {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
            const chunkName = this.extractChunkName(entry.name);
            const loadTime = entry.responseEnd - entry.startTime;
            const size = entry.transferSize || entry.encodedBodySize || 0;

            this.bundleMetrics.set(chunkName, {
                name: chunkName,
                url: entry.name,
                size: size,
                loadTime: loadTime,
                compressionRatio: entry.decodedBodySize / entry.encodedBodySize || 1,
                cached: entry.transferSize === 0,
                timestamp: Date.now()
            });
        }
    }

    recordLCP(entry) {
        this.performanceEntries.push({
            type: 'lcp',
            timestamp: Date.now(),
            metrics: {
                startTime: entry.startTime,
                size: entry.size,
                element: entry.element?.tagName || 'unknown'
            }
        });
    }

    recordCLS(entry) {
        if (!entry.hadRecentInput) {
            this.performanceEntries.push({
                type: 'cls',
                timestamp: Date.now(),
                metrics: {
                    value: entry.value,
                    sources: entry.sources?.length || 0
                }
            });
        }
    }

    recordChunkLoad(url, loadTime, success, error = null) {
        const chunkName = this.extractChunkName(url);

        this.loadingTimes.set(chunkName, {
            url: url,
            loadTime: loadTime,
            success: success,
            error: error?.message || null,
            timestamp: Date.now()
        });
    }

    estimateBundleSize(resource) {
        const chunkName = this.extractChunkName(resource.name);
        const size = resource.transferSize || resource.encodedBodySize || 0;

        if (!this.bundleMetrics.has(chunkName)) {
            this.bundleMetrics.set(chunkName, {
                name: chunkName,
                url: resource.name,
                size: size,
                loadTime: resource.responseEnd - resource.startTime,
                cached: resource.transferSize === 0,
                timestamp: Date.now()
            });
        }
    }

    extractChunkName(url) {
        const matches = url.match(/\/([^\/]+)\.(js|css)$/);
        return matches ? matches[1] : 'unknown';
    }

    // Analysis methods
    getBundleReport() {
        const bundles = Array.from(this.bundleMetrics.values());
        const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
        const averageLoadTime = bundles.reduce((sum, bundle) => sum + bundle.loadTime, 0) / bundles.length;

        return {
            totalBundles: bundles.length,
            totalSize: totalSize,
            totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
            averageLoadTime: Math.round(averageLoadTime),
            largestBundle: bundles.sort((a, b) => b.size - a.size)[0],
            slowestBundle: bundles.sort((a, b) => b.loadTime - a.loadTime)[0],
            bundles: bundles.sort((a, b) => b.size - a.size)
        };
    }

    getPerformanceReport() {
        const lcp = this.performanceEntries.filter(e => e.type === 'lcp').pop();
        const clsEntries = this.performanceEntries.filter(e => e.type === 'cls');
        const totalCLS = clsEntries.reduce((sum, entry) => sum + entry.metrics.value, 0);

        const currentMemory = Array.from(this.memoryMetrics.values()).pop();

        return {
            coreWebVitals: {
                lcp: lcp?.metrics.startTime || null,
                cls: totalCLS,
                memory: currentMemory
            },
            loadingTimes: Array.from(this.loadingTimes.values()),
            memoryUsage: Array.from(this.memoryMetrics.values()),
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const bundleReport = this.getBundleReport();

        // Bundle size recommendations
        if (bundleReport.totalSizeMB > 2) {
            recommendations.push({
                type: 'warning',
                category: 'bundle-size',
                message: `Total bundle size (${bundleReport.totalSizeMB}MB) exceeds recommended 2MB limit`,
                suggestion: 'Consider implementing more aggressive code splitting'
            });
        }

        // Large bundle recommendations
        const largeBundles = bundleReport.bundles.filter(b => b.size > 500 * 1024); // > 500KB
        if (largeBundles.length > 0) {
            recommendations.push({
                type: 'info',
                category: 'large-bundles',
                message: `${largeBundles.length} bundles exceed 500KB`,
                suggestion: 'Consider splitting large bundles or lazy loading',
                bundles: largeBundles.map(b => ({ name: b.name, sizeMB: Math.round(b.size / 1024 / 1024 * 100) / 100 }))
            });
        }

        // Loading time recommendations
        const slowBundles = bundleReport.bundles.filter(b => b.loadTime > 1000); // > 1 second
        if (slowBundles.length > 0) {
            recommendations.push({
                type: 'warning',
                category: 'slow-loading',
                message: `${slowBundles.length} bundles take over 1 second to load`,
                suggestion: 'Optimize network delivery or implement preloading',
                bundles: slowBundles.map(b => ({ name: b.name, loadTime: Math.round(b.loadTime) }))
            });
        }

        // Memory recommendations
        const currentMemory = Array.from(this.memoryMetrics.values()).pop();
        if (currentMemory && currentMemory.usedMB > 100) {
            recommendations.push({
                type: 'warning',
                category: 'memory-usage',
                message: `High memory usage detected (${currentMemory.usedMB}MB)`,
                suggestion: 'Check for memory leaks and optimize object cleanup'
            });
        }

        return recommendations;
    }

    // Optimization suggestions
    getSplittingRecommendations() {
        const bundleReport = this.getBundleReport();
        const suggestions = [];

        // Identify candidates for splitting
        bundleReport.bundles.forEach(bundle => {
            if (bundle.size > 1024 * 1024) { // > 1MB
                suggestions.push({
                    bundle: bundle.name,
                    currentSize: Math.round(bundle.size / 1024 / 1024 * 100) / 100,
                    recommendation: 'Split into smaller chunks',
                    priority: 'high'
                });
            } else if (bundle.size > 512 * 1024) { // > 512KB
                suggestions.push({
                    bundle: bundle.name,
                    currentSize: Math.round(bundle.size / 1024 / 1024 * 100) / 100,
                    recommendation: 'Consider code splitting',
                    priority: 'medium'
                });
            }
        });

        return suggestions;
    }

    // Export data for analysis
    exportAnalytics() {
        return {
            bundleReport: this.getBundleReport(),
            performanceReport: this.getPerformanceReport(),
            splittingRecommendations: this.getSplittingRecommendations(),
            rawData: {
                bundleMetrics: Object.fromEntries(this.bundleMetrics),
                loadingTimes: Object.fromEntries(this.loadingTimes),
                memoryMetrics: Object.fromEntries(this.memoryMetrics),
                performanceEntries: this.performanceEntries
            },
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
    }

    // Console reporting
    logReport() {
        const bundleReport = this.getBundleReport();
        const performanceReport = this.getPerformanceReport();

        console.group('📊 Bundle Analysis Report');

        console.log(`🎯 Total Bundle Size: ${bundleReport.totalSizeMB}MB (${bundleReport.totalBundles} chunks)`);
        console.log(`⏱️ Average Load Time: ${bundleReport.averageLoadTime}ms`);

        if (bundleReport.largestBundle) {
            console.log(`📦 Largest Bundle: ${bundleReport.largestBundle.name} (${Math.round(bundleReport.largestBundle.size / 1024 / 1024 * 100) / 100}MB)`);
        }

        if (bundleReport.slowestBundle) {
            console.log(`🐌 Slowest Bundle: ${bundleReport.slowestBundle.name} (${Math.round(bundleReport.slowestBundle.loadTime)}ms)`);
        }

        const recommendations = performanceReport.recommendations;
        if (recommendations.length > 0) {
            console.group('💡 Recommendations');
            recommendations.forEach(rec => {
                console.log(`${rec.type === 'warning' ? '⚠️' : 'ℹ️'} ${rec.message}`);
                console.log(`   💭 ${rec.suggestion}`);
            });
            console.groupEnd();
        }

        console.groupEnd();
    }
}

// Create global instance
export const bundleAnalyzer = new BundleAnalyzer();

// Make available in window for debugging
if (typeof window !== 'undefined') {
    window.bundleAnalyzer = bundleAnalyzer;
}