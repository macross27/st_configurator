import { ModelPreloader } from './ModelPreloader.js';

/**
 * ModelSelector - Advanced UI for switching between GLB models with preloading
 * Week 2+ implementation with intelligent preloading system
 */
export class ModelSelector {
    constructor(sceneManager, availableModels = []) {
        this.sceneManager = sceneManager;
        this.availableModels = availableModels;
        this.currentModelIndex = 0;
        this.isInitialized = false;
        
        // Initialize preloader with advanced features
        this.preloader = new ModelPreloader(
            sceneManager.modelCache, 
            sceneManager
        );
        
        // Error handling
        this.lastError = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // No fallback models - use only provided models
        
        console.log(`🎮 ModelSelector initialized with ${this.availableModels.length} models and advanced preloading`);
    }
    
    /**
     * Initialize the model selector with advanced preloading
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('🎮 Initializing advanced ModelSelector...');
            
            // Load initial model
            await this.switchToModel(0);
            
            // UI creation disabled - clean 3D viewer only
            // this.createModelSelectorUI();
            
            // Start intelligent background preloading
            if (this.availableModels.length > 1) {
                console.log('🚀 Starting intelligent background preloading...');
                await this.preloader.startLazyPreloading(
                    this.availableModels, 
                    this.currentModelIndex
                );
            }
            
            this.isInitialized = true;
            console.log('✅ Advanced ModelSelector initialized with', this.availableModels.length, 'models');
        } catch (error) {
            console.error('❌ Failed to initialize ModelSelector:', error);
            this.showError('Failed to initialize model selector: ' + error.message);
        }
    }
    
    /**
     * Switch to a specific model by index with intelligent preloading
     */
    async switchToModel(modelIndex) {
        if (modelIndex < 0 || modelIndex >= this.availableModels.length) {
            console.warn(`Invalid model index: ${modelIndex}`);
            return;
        }

        const model = this.availableModels[modelIndex];
        const wasInstant = this.sceneManager.modelCache.hasModel(model.path);
        
        try {
            const startTime = performance.now();
            
            // Record access pattern for learning
            this.preloader.recordAccess(model.path, modelIndex);
            
            await this.sceneManager.switchToModel(model.path);
            const endTime = performance.now();
            
            this.currentModelIndex = modelIndex;
            this.updateUISelection(modelIndex);
            this.lastError = null;
            this.retryCount = 0;
            
            const loadTime = endTime - startTime;
            console.log(`✅ Switched to model ${modelIndex}: ${model.name} in ${loadTime.toFixed(1)}ms ${wasInstant ? '(cached)' : '(loaded)'}`);
            
            // Update cache status display
            this.updateCacheStatus();
            
        } catch (error) {
            console.error('❌ Failed to switch model:', error);
            await this.handleModelSwitchError(modelIndex, error);
        }
    }
    
    /**
     * Handle model switching errors with retry logic
     */
    async handleModelSwitchError(modelIndex, error) {
        this.lastError = error;
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`🔄 Retrying model switch (attempt ${this.retryCount}/${this.maxRetries})...`);
            
            // Wait a bit before retrying
            await this.sleep(1000 * this.retryCount);
            
            try {
                await this.switchToModel(modelIndex);
                return;
            } catch (retryError) {
                console.error(`❌ Retry ${this.retryCount} failed:`, retryError);
            }
        }
        
        // All retries failed
        const model = this.availableModels[modelIndex];
        const errorMsg = `Failed to load model: ${model.name || model.path}`;
        this.showError(errorMsg);
        
        // Revert to previous working model if possible
        if (modelIndex !== this.currentModelIndex && this.currentModelIndex >= 0) {
            console.log('🔄 Reverting to previous model...');
            try {
                await this.switchToModel(this.currentModelIndex);
            } catch (revertError) {
                console.error('❌ Failed to revert to previous model:', revertError);
            }
        }
    }
    
    /**
     * Utility: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Add a new model to the available list
     */
    addModel(name, path) {
        this.availableModels.push({ name, path });
        console.log(`📦 Added model: ${name} (${path})`);
        
        // Refresh UI if initialized
        if (this.isInitialized) {
            this.refreshUI();
        }
    }
    
    /**
     * Create enhanced model selector UI integrated with app layout
     */
    createModelSelectorUI() {
        // Check if UI already exists
        if (document.querySelector('.model-selector-container')) {
            return;
        }
        
        const selectorHTML = `
            <div class="model-selector-container">
                <div class="model-selector">
                    <div class="model-selector-header">
                        <h4>3D Model Selection</h4>
                    </div>
                    <div class="model-controls">
                        <select id="model-dropdown" class="model-dropdown">
                            ${this.availableModels.map((model, index) => 
                                `<option value="${index}" ${index === this.currentModelIndex ? 'selected' : ''}>${model.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="model-info">
                        <div class="model-description" id="model-description">
                            ${this.availableModels[this.currentModelIndex]?.description || this.availableModels[this.currentModelIndex]?.name || 'No description available'}
                        </div>
                    </div>
                    <div class="cache-status">
                        <div class="cache-info">
                            <span class="cache-stat">
                                <strong>Cached:</strong> <span id="cache-info">Loading...</span>
                            </span>
                            <span class="cache-stat">
                                <strong>Memory:</strong> <span id="memory-usage">0MB</span>
                            </span>
                            <span class="cache-stat">
                                <strong>Status:</strong> <span id="preload-status">Initializing...</span>
                            </span>
                            <span class="cache-stat" id="performance-info" style="display: none;">
                                <strong>FPS:</strong> <span>N/A</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert into the viewer panel (instead of body)
        const viewerPanel = document.querySelector('.viewer-panel');
        if (viewerPanel) {
            viewerPanel.insertAdjacentHTML('afterbegin', selectorHTML);
        } else {
            // Fallback to body if viewer panel not found
            document.body.insertAdjacentHTML('beforeend', selectorHTML);
        }
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Update status periodically
        this.statusUpdateInterval = setInterval(() => this.updateCacheStatus(), 2000);
        
        // Initial status update
        this.updateCacheStatus();
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        const dropdown = document.getElementById('model-dropdown');

        if (dropdown) {
            dropdown.addEventListener('change', (e) => {
                this.switchToModel(parseInt(e.target.value));
            });
        }
    }
    
    /**
     * Setup keyboard shortcuts for model navigation
     */
    setupKeyboardShortcuts() {
        this.keyHandler = (e) => {
            // Only handle shortcuts when not typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.currentModelIndex > 0) {
                        this.switchToModel(this.currentModelIndex - 1);
                    }
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.currentModelIndex < this.availableModels.length - 1) {
                        this.switchToModel(this.currentModelIndex + 1);
                    }
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
    }
    
    /**
     * Update UI selection state
     */
    updateUISelection(modelIndex) {
        const dropdown = document.getElementById('model-dropdown');

        if (dropdown) {
            dropdown.value = modelIndex;
        }
    }
    
    /**
     * Update cache status display with preloading info
     */
    updateCacheStatus() {
        // Get cache stats safely - check if method exists
        const cacheStats = this.sceneManager.getCacheStats ?
            this.sceneManager.getCacheStats() :
            { cachedModels: 0, memoryUsage: 0 };
        const preloadStats = this.preloader.getPreloadStats();
        
        const cacheInfo = document.getElementById('cache-info');
        const memoryUsage = document.getElementById('memory-usage');
        const preloadStatus = document.getElementById('preload-status');
        const performanceInfo = document.getElementById('performance-info');
        
        if (cacheInfo) {
            cacheInfo.textContent = `Cached: ${cacheStats.cachedModels}/${this.availableModels.length}`;
            
            // Animate cache count changes
            if (this.lastCacheSize !== cacheStats.cachedModels) {
                cacheInfo.style.color = '#4CAF50';
                setTimeout(() => { cacheInfo.style.color = '#ccc'; }, 1000);
                this.lastCacheSize = cacheStats.cachedModels;
            }
        }
        
        if (memoryUsage) {
            memoryUsage.textContent = `Memory: ${cacheStats.memoryUsage.toFixed(1)}MB / ${cacheStats.maxMemory}MB`;
        }
        
        if (preloadStatus) {
            if (preloadStats.isPreloading) {
                preloadStatus.textContent = `Loading... (${preloadStats.queueLength} queued)`;
                preloadStatus.style.color = '#FF9800';
            } else if (preloadStats.queueLength > 0) {
                preloadStatus.textContent = `${preloadStats.queueLength} pending`;
                preloadStatus.style.color = '#FFC107';
            } else {
                preloadStatus.textContent = 'Ready';
                preloadStatus.style.color = '#4CAF50';
            }
        }
        
        if (performanceInfo && this.sceneManager.getPerformanceReport) {
            const perf = this.sceneManager.getPerformanceReport();
            performanceInfo.textContent = `FPS: ${perf.averageRenderTime > 0 ? (1000 / perf.averageRenderTime).toFixed(1) : 'N/A'}`;
        }
    }
    
    /**
     * Refresh UI after model list changes
     */
    refreshUI() {
        const dropdown = document.getElementById('model-dropdown');
        if (dropdown) {
            dropdown.innerHTML = this.availableModels.map((model, index) => 
                `<option value="${index}" ${index === this.currentModelIndex ? 'selected' : ''}>${model.name}</option>`
            ).join('');
        }
        this.updateCacheStatus();
    }
    
    /**
     * Manually optimize memory usage
     */
    async optimizeMemory() {
        try {
            console.log('🧹 Manual memory optimization triggered');
            const result = await this.sceneManager.optimizeMemory();
            
            this.showNotification(`Memory optimized: freed space`, 'success');
            this.updateCacheStatus();
        } catch (error) {
            console.error('❌ Memory optimization failed:', error);
            this.showNotification('Memory optimization failed', 'error');
        }
    }
    
    /**
     * Preload all available models
     */
    async preloadAllModels() {
        try {
            console.log('📦 Preloading all models...');
            
            const preloadButton = document.getElementById('preload-all');
            if (preloadButton) {
                preloadButton.disabled = true;
                preloadButton.textContent = '⏳ Loading...';
            }
            
            // Manual preloading since preloader might not be fully initialized
            const promises = this.availableModels.map(async (model, index) => {
                if (!this.sceneManager.modelCache.hasModel(model.path)) {
                    try {
                        await this.sceneManager.modelCache.getOrLoadModel(model.path);
                        console.log(`✅ Preloaded: ${model.name}`);
                        return { success: true, model };
                    } catch (error) {
                        console.warn(`⚠️ Failed to preload ${model.name}:`, error.message);
                        return { success: false, model, error };
                    }
                }
                return { success: true, model, cached: true };
            });
            
            const results = await Promise.all(promises);
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            this.showNotification(`Preloaded ${successful}/${this.availableModels.length} models`, failed > 0 ? 'warning' : 'success');
            this.updateCacheStatus();
        } catch (error) {
            console.error('❌ Failed to preload all models:', error);
            this.showNotification('Failed to preload models', 'error');
        } finally {
            // Reset preload button
            const preloadButton = document.getElementById('preload-all');
            if (preloadButton) {
                preloadButton.disabled = false;
                preloadButton.textContent = '📦 Preload All';
            }
        }
    }
    
    /**
     * Show user notification
     */
    showNotification(message, type = 'info') {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = `model-selector-notification ${type}`;
        notification.textContent = message;
        
        // Add to model selector container
        const container = document.querySelector('.model-selector-container');
        if (container) {
            container.appendChild(notification);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 3000);
        } else {
            // Fallback to console
            console.log(`Notification [${type}]: ${message}`);
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('ModelSelector Error:', message);
        this.showNotification(message, 'error');
    }
    
    /**
     * Get current model info
     */
    getCurrentModel() {
        return this.availableModels[this.currentModelIndex];
    }
    
    /**
     * Dispose of the model selector and all resources
     */
    dispose() {
        // Clear update interval
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
        
        // Remove keyboard event listener
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        
        // Dispose preloader
        if (this.preloader) {
            this.preloader.dispose();
            this.preloader = null;
        }
        
        // Remove UI element
        const selectorContainer = document.querySelector('.model-selector-container');
        if (selectorContainer) {
            selectorContainer.remove();
        }
        
        this.isInitialized = false;
        console.log('🗑️ Advanced ModelSelector disposed');
    }
}