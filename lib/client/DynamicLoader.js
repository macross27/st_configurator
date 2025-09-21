/**
 * Dynamic module loader with progressive loading and error handling
 * Implements lazy loading strategy for bundle size optimization
 */

export class DynamicLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.loadStartTimes = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
    }

    /**
     * Show loading indicator for module loading
     */
    showLoadingIndicator(moduleName, message) {
        const loadingId = `loading-${moduleName}`;
        let indicator = document.getElementById(loadingId);

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = loadingId;
            indicator.className = 'dynamic-loading-indicator';
            indicator.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message || `Loading ${moduleName}...`}</div>
                </div>
            `;
            document.body.appendChild(indicator);
        }

        indicator.style.display = 'flex';
        this.loadStartTimes.set(moduleName, performance.now());
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator(moduleName) {
        const loadingId = `loading-${moduleName}`;
        const indicator = document.getElementById(loadingId);
        if (indicator) {
            indicator.style.display = 'none';
        }

        // Log loading time
        const startTime = this.loadStartTimes.get(moduleName);
        if (startTime) {
            const loadTime = performance.now() - startTime;
            console.log(`📦 ${moduleName} loaded in ${loadTime.toFixed(2)}ms`);
            this.loadStartTimes.delete(moduleName);
        }
    }

    /**
     * Dynamically import a module with error handling and caching
     */
    async loadModule(modulePath, moduleName = null, options = {}) {
        const name = moduleName || modulePath.split('/').pop().replace('.js', '');

        // Return cached module if already loaded
        if (this.loadedModules.has(name)) {
            return this.loadedModules.get(name);
        }

        // Return existing loading promise if already in progress
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const {
            showLoader = true,
            loadingMessage = null,
            essential = false,
            fallback = null
        } = options;

        const loadingPromise = this._loadModuleWithRetry(modulePath, name, {
            showLoader,
            loadingMessage,
            essential,
            fallback
        });

        this.loadingPromises.set(name, loadingPromise);

        try {
            const module = await loadingPromise;
            this.loadedModules.set(name, module);
            this.loadingPromises.delete(name);
            this.retryAttempts.delete(name);
            return module;
        } catch (error) {
            this.loadingPromises.delete(name);
            throw error;
        }
    }

    /**
     * Load module with retry logic
     */
    async _loadModuleWithRetry(modulePath, name, options) {
        const { showLoader, loadingMessage, essential, fallback } = options;
        const currentAttempt = (this.retryAttempts.get(name) || 0) + 1;
        this.retryAttempts.set(name, currentAttempt);

        if (showLoader) {
            this.showLoadingIndicator(name, loadingMessage);
        }

        try {
            const module = await import(modulePath);

            if (showLoader) {
                this.hideLoadingIndicator(name);
            }

            return module;
        } catch (error) {
            console.error(`Failed to load ${name} (attempt ${currentAttempt}):`, error);

            if (showLoader) {
                this.hideLoadingIndicator(name);
            }

            // Retry logic
            if (currentAttempt < this.maxRetries) {
                console.log(`Retrying ${name} (attempt ${currentAttempt + 1}/${this.maxRetries})...`);
                await this._delay(1000 * currentAttempt); // Exponential backoff
                return this._loadModuleWithRetry(modulePath, name, options);
            }

            // Handle failure based on whether module is essential
            if (essential) {
                throw new Error(`Failed to load essential module ${name}: ${error.message}`);
            } else if (fallback) {
                console.warn(`Using fallback for ${name}:`, fallback);
                return fallback;
            } else {
                console.warn(`Non-essential module ${name} failed to load, continuing...`);
                return null;
            }
        }
    }

    /**
     * Load multiple modules in parallel
     */
    async loadModules(moduleConfigs) {
        const loadPromises = moduleConfigs.map(config => {
            if (typeof config === 'string') {
                return this.loadModule(config);
            }
            return this.loadModule(config.path, config.name, config.options);
        });

        try {
            return await Promise.all(loadPromises);
        } catch (error) {
            console.error('Error loading modules:', error);
            throw error;
        }
    }

    /**
     * Load modules sequentially (for dependency chains)
     */
    async loadModulesSequential(moduleConfigs) {
        const loadedModules = [];

        for (const config of moduleConfigs) {
            try {
                let module;
                if (typeof config === 'string') {
                    module = await this.loadModule(config);
                } else {
                    module = await this.loadModule(config.path, config.name, config.options);
                }
                loadedModules.push(module);
            } catch (error) {
                console.error('Sequential loading failed:', error);
                throw error;
            }
        }

        return loadedModules;
    }

    /**
     * Preload modules in the background
     */
    async preloadModules(modulePaths, priority = 'low') {
        const preloadPromises = modulePaths.map(async (path) => {
            try {
                // Use low priority loading
                if ('scheduler' in window && window.scheduler.postTask) {
                    await window.scheduler.postTask(() =>
                        this.loadModule(path, null, { showLoader: false }),
                        { priority }
                    );
                } else {
                    // Fallback for browsers without scheduler API
                    setTimeout(() =>
                        this.loadModule(path, null, { showLoader: false }),
                        100
                    );
                }
            } catch (error) {
                console.warn(`Preload failed for ${path}:`, error);
            }
        });

        return Promise.allSettled(preloadPromises);
    }

    /**
     * Check if module is loaded
     */
    isLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    /**
     * Get loaded module
     */
    getModule(moduleName) {
        return this.loadedModules.get(moduleName);
    }

    /**
     * Clear module cache
     */
    clearCache(moduleName = null) {
        if (moduleName) {
            this.loadedModules.delete(moduleName);
            this.loadingPromises.delete(moduleName);
            this.retryAttempts.delete(moduleName);
        } else {
            this.loadedModules.clear();
            this.loadingPromises.clear();
            this.retryAttempts.clear();
        }
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            loadedModules: Array.from(this.loadedModules.keys()),
            currentlyLoading: Array.from(this.loadingPromises.keys()),
            retryAttempts: Object.fromEntries(this.retryAttempts),
            totalLoaded: this.loadedModules.size
        };
    }

    /**
     * Utility delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CSS for loading indicators
const loaderStyles = `
.dynamic-loading-indicator {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: Arial, sans-serif;
}

.loading-content {
    background: #1a1a1a;
    color: #ffffff;
    padding: 2rem;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    min-width: 200px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333;
    border-top: 3px solid #00ff88;
    border-radius: 50%;
    animation: loading-spin 1s linear infinite;
}

.loading-text {
    font-size: 14px;
    text-align: center;
    color: #cccccc;
}

@keyframes loading-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Inject styles if not already present
if (!document.getElementById('dynamic-loader-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'dynamic-loader-styles';
    styleSheet.textContent = loaderStyles;
    document.head.appendChild(styleSheet);
}

// Export singleton instance
export const dynamicLoader = new DynamicLoader();