export class PatternManager {
    constructor(patternCompositor = null) {
        this.patterns = new Map();
        this.currentPattern = null;
        this.onPatternChange = null;
        this.currentDesignType = 'regulan'; // default to regulan
        this.patternCompositor = patternCompositor;
    }

    async initialize(designType = 'regulan') {
        this.currentDesignType = designType;
        await this.scanPatternFolders();
        this.setupPatternButtons();
        this.setupAdditionalColorPickers(); // Add event listeners for pants/neck colors
        this.updatePatternVisibility();

        // Set default pattern based on design type after initialization
        setTimeout(() => {
            const defaultPattern = designType === 'setin' ? 'setin_custom-1-1' : 'reg_custom-1-2';
            this.selectPattern(defaultPattern);

            // Ensure additional color picker event listeners are set up after DOM is ready
            this.setupAdditionalColorPickers();
        }, 100);
    }

    async scanPatternFolders() {
        const patternFolders = ['setin_custom-1-1', 'reg_custom-1-2', 'setin_custom-1-3'];

        for (const folder of patternFolders) {
            try {
                const patternData = await this.analyzePattern(folder);
                this.patterns.set(folder, patternData);
                console.log(`Pattern ${folder}:`, patternData);
            } catch (error) {
                console.error(`Failed to analyze pattern ${folder}:`, error);
            }
        }
    }

    async analyzePattern(patternName) {
        // Determine texture files based on pattern name
        let textureFiles;
        let texturePath;

        // All custom patterns have 1_2_3.png (3 layers)
        textureFiles = [`1_2_3.png`];
        texturePath = `assets/textures/customPatterns/${patternName}/`;

        // Parse layer count from filenames
        let maxLayer = 0;
        const fileMapping = [];

        for (const filename of textureFiles) {
            const layers = this.parseLayerNumbers(filename);
            const channelMapping = this.createChannelMapping(layers);

            fileMapping.push({
                filename,
                layers,
                channels: channelMapping
            });

            maxLayer = Math.max(maxLayer, ...layers);
        }

        return {
            name: patternName,
            layerCount: maxLayer,
            files: fileMapping,
            texturePath: texturePath
        };
    }

    parseLayerNumbers(filename) {
        // Extract numbers from filename like "1_2_3.png" -> [1, 2, 3]
        const nameWithoutExt = filename.replace('.png', '');
        return nameWithoutExt.split('_').map(num => parseInt(num));
    }

    createChannelMapping(layers) {
        // Map layer numbers to RGB channels
        const channels = ['r', 'g', 'b'];
        const mapping = {};

        layers.forEach((layerNum, index) => {
            if (index < channels.length) {
                mapping[layerNum] = channels[index];
            }
        });

        return mapping;
    }

    setupPatternButtons() {
        const buttons = [
            { id: 'custom-1-1-btn', pattern: 'setin_custom-1-1', type: 'setin' },
            { id: 'custom-1-2-btn', pattern: 'reg_custom-1-2', type: 'regulan' },
            { id: 'custom-1-3-btn', pattern: 'setin_custom-1-3', type: 'setin' }
        ];

        buttons.forEach(({ id, pattern, type }) => {
            const button = document.getElementById(id);
            if (button) {
                button.setAttribute('data-design-type', type);
                button.addEventListener('click', () => {
                    this.selectPattern(pattern);
                });
            }
        });
    }

    selectPattern(patternName) {
        console.log('🎨 Selecting pattern:', patternName);

        // Update button states
        this.updateButtonStates(patternName);

        // Set current pattern
        this.currentPattern = this.patterns.get(patternName);

        if (!this.currentPattern) {
            console.error('❌ Pattern not found:', patternName);
            return;
        }

        // Update color pickers
        this.updateColorPickers();

        // Trigger pattern change callback
        if (this.onPatternChange) {
            console.log('🔄 Triggering pattern change callback');
            this.onPatternChange(this.currentPattern);
        } else {
            console.warn('⚠️ No onPatternChange callback set');
        }

        console.log('✅ Selected pattern:', this.currentPattern);
    }

    updateButtonStates(selectedPattern) {
        const buttons = [
            { id: 'custom-1-1-btn', pattern: 'setin_custom-1-1' },
            { id: 'custom-1-2-btn', pattern: 'reg_custom-1-2' },
            { id: 'custom-1-3-btn', pattern: 'setin_custom-1-3' }
        ];

        buttons.forEach(({ id, pattern }) => {
            const button = document.getElementById(id);
            if (button) {
                button.classList.toggle('active', pattern === selectedPattern);
            }
        });
    }

    updateColorPickers() {
        if (!this.currentPattern) return;

        // Use the pattern colors section for all patterns
        const colorSection = document.querySelector('.color-group .color-pickers');
        const idPrefix = 'pattern-color';

        if (!colorSection) {
            console.error('❌ Could not find appropriate color section for pattern:', this.currentPattern.name);
            return;
        }

        // Clear existing color pickers
        colorSection.innerHTML = '';

        // Create color pickers for each layer
        for (let i = 1; i <= this.currentPattern.layerCount; i++) {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = `${idPrefix}-${i}`;
            colorInput.className = 'custom-color-picker';

            // Set default colors
            const defaultColors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff'];
            colorInput.value = defaultColors[(i - 1) % defaultColors.length];

            // Add change listener for real-time updates
            const changeHandler = (event) => {
                console.log(`🎨 Color input changed: Layer ${i}, Color: ${event.target.value}`);
                // Use arrow function to preserve 'this' context
                this.onColorChange(i, event.target.value);
            };

            colorInput.addEventListener('input', changeHandler);
            colorInput.addEventListener('change', changeHandler);

            // Also add a click handler for testing
            colorInput.addEventListener('click', () => {
                console.log(`🖱️ Color picker ${i} clicked, current value: ${colorInput.value}`);
            });

            console.log(`✅ Added event listeners to color picker ${i} (ID: ${colorInput.id})`);

            colorSection.appendChild(colorInput);

            // Verify the element was added and test event binding
            setTimeout(() => {
                const addedElement = document.getElementById(`${idPrefix}-${i}`);
                if (addedElement) {
                    console.log(`🔍 Verified color picker ${i} exists in DOM:`, addedElement.id);
                } else {
                    console.error(`❌ Color picker ${i} NOT found in DOM after creation`);
                }
            }, 100);
        }

        console.log(`Created ${this.currentPattern.layerCount} color pickers for pattern ${this.currentPattern.name}`);
    }

    setupAdditionalColorPickers() {
        console.log('🎨 Setting up additional color pickers (pants/neck)');

        // Set up pants color pickers
        const pantsColor1 = document.querySelector('#pants-color-1');
        const pantsColor2 = document.querySelector('#pants-color-2');

        // Set up neck color pickers
        const neckColor1 = document.querySelector('#neck-color-1');
        const neckColor2 = document.querySelector('#neck-color-2');

        const additionalColorPickers = [
            { element: pantsColor1, name: 'pants-color-1' },
            { element: pantsColor2, name: 'pants-color-2' },
            { element: neckColor1, name: 'neck-color-1' },
            { element: neckColor2, name: 'neck-color-2' }
        ];

        additionalColorPickers.forEach(({ element, name }) => {
            if (element) {
                const changeHandler = (event) => {
                    console.log(`🎨 Additional color picker changed: ${name}, Color: ${event.target.value}`);
                    this.onAdditionalColorChange(name, event.target.value);
                };

                element.addEventListener('input', changeHandler);
                element.addEventListener('change', changeHandler);
                console.log(`✅ Added event listeners to ${name}`);
            } else {
                console.warn(`⚠️ Additional color picker not found: ${name}`);
            }
        });
    }

    onAdditionalColorChange(pickerName, color) {
        console.log(`🎨 Additional color ${pickerName} changed to ${color}`);

        if (this.currentPattern && this.onPatternChange) {
            console.log('🔄 Triggering pattern texture update due to additional color change');

            // Clear pattern compositor cache to force regeneration with new colors
            if (this.patternCompositor) {
                this.patternCompositor.clearCache();
                this.patternCompositor.clearTextureCache();
                console.log('🗑️ Cleared pattern compositor cache and texture cache');
            } else if (window.uniformConfigurator?.patternCompositor) {
                window.uniformConfigurator.patternCompositor.clearCache();
                window.uniformConfigurator.patternCompositor.clearTextureCache();
                console.log('🗑️ Cleared pattern compositor cache and texture cache via global reference');
            }

            // Also force LayerManager texture update
            if (window.uniformConfigurator?.layerManager) {
                window.uniformConfigurator.layerManager.updateTexture(true);
                console.log('🔄 Forced LayerManager texture update');
            }

            // Small delay to ensure the color picker value is updated in DOM
            setTimeout(() => {
                this.onPatternChange(this.currentPattern);
            }, 10);
        } else {
            console.warn('⚠️ Cannot update pattern - missing currentPattern or onPatternChange callback');
        }
    }

    onColorChange(layerIndex, color) {
        console.log(`🎨 Layer ${layerIndex} color changed to ${color}`);

        if (this.currentPattern && this.onPatternChange) {
            console.log('🔄 Triggering pattern texture update due to color change');

            // Clear pattern compositor cache to force regeneration with new colors
            if (this.patternCompositor) {
                this.patternCompositor.clearCache();
                console.log('🗑️ Cleared pattern compositor cache');
            } else if (window.uniformConfigurator?.patternCompositor) {
                window.uniformConfigurator.patternCompositor.clearCache();
                console.log('🗑️ Cleared pattern compositor cache via global reference');
            }

            // Small delay to ensure the color picker value is updated in DOM
            setTimeout(() => {
                this.onPatternChange(this.currentPattern);
            }, 10);
        } else {
            console.warn('⚠️ Cannot update pattern texture - no current pattern or callback');
        }
    }

    getCurrentPattern() {
        return this.currentPattern;
    }

    getPatternInfo(patternName) {
        return this.patterns.get(patternName);
    }

    getAllPatterns() {
        return Array.from(this.patterns.values());
    }

    // Manual initialization helper for when automatic initialization fails
    manualInitializeColorListeners() {
        console.log('🔧 Manual initialization of color listeners...');

        const colorPickers = document.querySelectorAll('#body-color-1, #body-color-2, #body-color-3');
        console.log(`Found ${colorPickers.length} color pickers`);

        colorPickers.forEach((picker, index) => {
            const layerIndex = index + 1;

            const changeHandler = (event) => {
                console.log(`🎨 Manual event: Layer ${layerIndex}, Color: ${event.target.value}`);
                this.onColorChange(layerIndex, event.target.value);
            };

            // Add event listeners
            picker.addEventListener('input', changeHandler);
            picker.addEventListener('change', changeHandler);

            console.log(`✅ Added manual listeners to picker ${layerIndex} (${picker.id})`);
        });

        // Select default pattern based on design type
        const defaultPattern = this.currentDesignType === 'setin' ? 'setin_custom-1-1' : 'reg_custom-1-2';
        this.selectPattern(defaultPattern);

        console.log('✅ Manual initialization complete');
    }

    updatePatternVisibility() {
        const buttons = document.querySelectorAll('.custom-pattern-btn');

        buttons.forEach(button => {
            const buttonType = button.getAttribute('data-design-type');
            if (buttonType === this.currentDesignType || buttonType === 'both') {
                button.style.display = 'block';
                button.disabled = false;
            } else {
                button.style.display = 'none';
                button.disabled = true;
            }
        });

        console.log(`🎨 Updated pattern visibility for design type: ${this.currentDesignType}`);
    }

    onDesignTypeChange(newDesignType) {
        console.log(`🔄 Design type changed from ${this.currentDesignType} to ${newDesignType}`);

        this.currentDesignType = newDesignType;
        this.updatePatternVisibility();

        // Auto-select default pattern for the new design type
        const defaultPattern = newDesignType === 'setin' ? 'setin_custom-1-1' : 'reg_custom-1-2';

        // Always assign default texture when geometry changes (as per user requirements)
        console.log(`🎯 Assigning default texture for ${newDesignType}: ${defaultPattern}`);
        setTimeout(() => {
            this.selectPattern(defaultPattern);
        }, 50);
    }

    // Force re-attach event listeners to existing color pickers
    forceAttachEventListeners() {
        console.log('🔧 Force re-attaching event listeners to color pickers...');

        const colorPickers = document.querySelectorAll('#body-color-1, #body-color-2, #body-color-3');
        console.log(`Found ${colorPickers.length} existing color pickers`);

        colorPickers.forEach((picker, index) => {
            const layerIndex = index + 1;
            console.log(`Re-attaching listeners to color picker ${layerIndex} (${picker.id})`);

            // Remove any existing listeners (if any)
            const newPicker = picker.cloneNode(true);
            picker.parentNode.replaceChild(newPicker, picker);

            // Add fresh event listeners
            const changeHandler = (event) => {
                console.log(`🎨 Color input changed: Layer ${layerIndex}, Color: ${event.target.value}`);
                this.onColorChange(layerIndex, event.target.value);
            };

            newPicker.addEventListener('input', changeHandler);
            newPicker.addEventListener('change', changeHandler);

            console.log(`✅ Re-attached listeners to picker ${layerIndex}`);
        });

        console.log('✅ Force re-attach complete');
    }
}