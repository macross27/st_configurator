// Test script to verify text and logo functionality
console.log('🧪 Testing app functionality...');

// Wait for the app to fully initialize
setTimeout(() => {
    try {
        // Test 1: Check if the app is initialized
        if (window.uniformConfigurator) {
            console.log('✅ UniformConfigurator is initialized');

            // Test 2: Check if base texture is loaded
            if (window.uniformConfigurator.baseTextureImage) {
                console.log('✅ Base texture is loaded:',
                    window.uniformConfigurator.baseTextureImage.width + 'x' +
                    window.uniformConfigurator.baseTextureImage.height);
            } else {
                console.log('❌ Base texture not loaded');
            }

            // Test 3: Try adding a text layer
            try {
                const textButton = document.getElementById('add-text-btn');
                if (textButton) {
                    console.log('🎯 Testing text layer addition...');
                    textButton.click();

                    // Check if layer was added
                    setTimeout(() => {
                        const layers = window.uniformConfigurator.layerManager.getLayers();
                        console.log('📝 Current layers:', layers.length);
                        if (layers.length > 0) {
                            console.log('✅ Text layer added successfully:', layers[layers.length - 1]);
                        } else {
                            console.log('❌ Text layer was not added');
                        }
                    }, 500);
                } else {
                    console.log('❌ Add text button not found');
                }
            } catch (error) {
                console.log('❌ Error testing text layer:', error);
            }

        } else {
            console.log('❌ UniformConfigurator not found');
        }
    } catch (error) {
        console.log('❌ Error during testing:', error);
    }
}, 3000); // Wait 3 seconds for full initialization