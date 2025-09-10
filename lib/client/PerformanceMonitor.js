export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTimes: [],
            textureUpdateTimes: [],
            memoryUsage: [],
            frameDrops: 0,
            totalFrames: 0
        };
        
        this.lastFrameTime = 0;
        this.isEnabled = false;
        this.monitoringInterval = null;
        this.displayPanel = null;
        
        // Performance thresholds
        this.thresholds = {
            renderTime: 16.67, // 60fps = 16.67ms per frame
            textureUpdate: 20,  // 20ms max for texture updates
            memoryUsage: 0.8    // 80% of heap limit
        };
        
        // Performance monitor disabled by default
        // To enable: call performanceMonitor.enable() or add ?debug=performance to URL
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('debug') === 'performance') {
            this.enable();
        }
    }
    
    enable() {
        this.isEnabled = true;
        this.startMemoryMonitoring();
        this.createDisplayPanel();
        console.log('🔬 Performance monitoring enabled');
    }
    
    disable() {
        this.isEnabled = false;
        this.stopMemoryMonitoring();
        this.removeDisplayPanel();
        console.log('🔬 Performance monitoring disabled');
    }
    
    startRenderTimer() {
        return this.isEnabled ? performance.now() : null;
    }
    
    endRenderTimer(startTime) {
        if (!this.isEnabled || !startTime) return;
        
        const duration = performance.now() - startTime;
        this.metrics.renderTimes.push(duration);
        this.metrics.totalFrames++;
        
        // Keep only last 60 measurements (1 second at 60fps)
        if (this.metrics.renderTimes.length > 60) {
            this.metrics.renderTimes.shift();
        }
        
        // Detect frame drops
        if (duration > this.thresholds.renderTime) {
            this.metrics.frameDrops++;
            if (duration > 33) { // More than 2 frames
                console.warn(`🐌 Frame drop detected: ${duration.toFixed(2)}ms (>${this.thresholds.renderTime.toFixed(2)}ms threshold)`);
            }
        }
        
        this.updateDisplayPanel();
    }
    
    trackTextureUpdate(duration) {
        if (!this.isEnabled) return;
        
        this.metrics.textureUpdateTimes.push(duration);
        
        // Keep only last 20 measurements
        if (this.metrics.textureUpdateTimes.length > 20) {
            this.metrics.textureUpdateTimes.shift();
        }
        
        if (duration > this.thresholds.textureUpdate) {
            console.warn(`🎨 Slow texture update: ${duration.toFixed(2)}ms (>${this.thresholds.textureUpdate}ms threshold)`);
        }
    }
    
    startMemoryMonitoring() {
        if (this.monitoringInterval) return;
        
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 5000); // Check every 5 seconds
    }
    
    stopMemoryMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    
    checkMemoryUsage() {
        if (!this.isEnabled || !performance.memory) return;
        
        const usage = {
            used: performance.memory.usedJSHeapSize / 1024 / 1024,
            total: performance.memory.totalJSHeapSize / 1024 / 1024,
            limit: performance.memory.jsHeapSizeLimit / 1024 / 1024,
            timestamp: Date.now()
        };
        
        this.metrics.memoryUsage.push(usage);
        
        // Keep only last 20 measurements
        if (this.metrics.memoryUsage.length > 20) {
            this.metrics.memoryUsage.shift();
        }
        
        // Warn about high memory usage
        const usageRatio = usage.used / usage.limit;
        if (usageRatio > this.thresholds.memoryUsage) {
            console.warn(`🧠 High memory usage: ${usage.used.toFixed(1)}MB / ${usage.limit.toFixed(1)}MB (${(usageRatio * 100).toFixed(1)}%)`);
        }
    }
    
    createDisplayPanel() {
        if (!this.isEnabled || this.displayPanel) return;
        
        this.displayPanel = document.createElement('div');
        this.displayPanel.id = 'performance-monitor';
        this.displayPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            min-width: 200px;
            backdrop-filter: blur(5px);
        `;
        
        document.body.appendChild(this.displayPanel);
    }
    
    removeDisplayPanel() {
        if (this.displayPanel) {
            document.body.removeChild(this.displayPanel);
            this.displayPanel = null;
        }
    }
    
    updateDisplayPanel() {
        if (!this.displayPanel || !this.isEnabled) return;
        
        const avgRenderTime = this.getAverageRenderTime();
        const avgTextureTime = this.getAverageTextureUpdateTime();
        const frameRate = avgRenderTime > 0 ? (1000 / avgRenderTime) : 0;
        const memUsage = this.getCurrentMemoryUsage();
        
        this.displayPanel.innerHTML = `
            <div style="color: #00ff00; font-weight: bold; margin-bottom: 5px;">⚡ Performance Monitor</div>
            <div>FPS: ${frameRate.toFixed(1)} (${avgRenderTime.toFixed(2)}ms)</div>
            <div>Frame Drops: ${this.metrics.frameDrops} / ${this.metrics.totalFrames}</div>
            <div>Texture Update: ${avgTextureTime.toFixed(2)}ms avg</div>
            ${memUsage ? `<div>Memory: ${memUsage.used.toFixed(1)}MB / ${memUsage.limit.toFixed(1)}MB</div>` : ''}
            <div style="margin-top: 5px; font-size: 10px; color: #888;">
                Thresholds: ${this.thresholds.renderTime}ms render, ${this.thresholds.textureUpdate}ms texture
            </div>
        `;
    }
    
    getAverageRenderTime() {
        const times = this.metrics.renderTimes;
        if (times.length === 0) return 0;
        return times.reduce((a, b) => a + b) / times.length;
    }
    
    getAverageTextureUpdateTime() {
        const times = this.metrics.textureUpdateTimes;
        if (times.length === 0) return 0;
        return times.reduce((a, b) => a + b) / times.length;
    }
    
    getCurrentMemoryUsage() {
        const usage = this.metrics.memoryUsage;
        return usage.length > 0 ? usage[usage.length - 1] : null;
    }
    
    getPerformanceReport() {
        return {
            averageRenderTime: this.getAverageRenderTime(),
            averageTextureUpdateTime: this.getAverageTextureUpdateTime(),
            frameDropPercentage: this.metrics.totalFrames > 0 ? (this.metrics.frameDrops / this.metrics.totalFrames) * 100 : 0,
            currentMemoryUsage: this.getCurrentMemoryUsage(),
            totalFrames: this.metrics.totalFrames,
            isHealthy: this.isPerformanceHealthy()
        };
    }
    
    isPerformanceHealthy() {
        const avgRenderTime = this.getAverageRenderTime();
        const avgTextureTime = this.getAverageTextureUpdateTime();
        const frameDropRate = this.metrics.totalFrames > 0 ? (this.metrics.frameDrops / this.metrics.totalFrames) : 0;
        const memUsage = this.getCurrentMemoryUsage();
        
        return avgRenderTime <= this.thresholds.renderTime &&
               avgTextureTime <= this.thresholds.textureUpdate &&
               frameDropRate <= 0.05 && // Less than 5% frame drops
               (!memUsage || (memUsage.used / memUsage.limit) <= this.thresholds.memoryUsage);
    }
    
    logPerformanceReport() {
        const report = this.getPerformanceReport();
        console.group('🔬 Performance Report');
        console.log('Average Render Time:', report.averageRenderTime.toFixed(2), 'ms');
        console.log('Average Texture Update Time:', report.averageTextureUpdateTime.toFixed(2), 'ms');
        console.log('Frame Drop Rate:', report.frameDropPercentage.toFixed(2), '%');
        console.log('Total Frames Rendered:', report.totalFrames);
        if (report.currentMemoryUsage) {
            console.log('Memory Usage:', report.currentMemoryUsage.used.toFixed(1), 'MB /', report.currentMemoryUsage.limit.toFixed(1), 'MB');
        }
        console.log('Performance Health:', report.isHealthy ? '✅ Healthy' : '⚠️ Issues Detected');
        console.groupEnd();
        return report;
    }
    
    reset() {
        this.metrics.renderTimes.length = 0;
        this.metrics.textureUpdateTimes.length = 0;
        this.metrics.memoryUsage.length = 0;
        this.metrics.frameDrops = 0;
        this.metrics.totalFrames = 0;
        console.log('🔬 Performance metrics reset');
    }
    
    dispose() {
        this.disable();
        this.reset();
    }
}