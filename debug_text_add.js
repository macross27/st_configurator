// Debug script for text adding - paste in browser console
console.clear();
console.log('🧪 DEBUGGING TEXT ADD FUNCTIONALITY');

try {
    // Check if app exists
    if (!window.uniformConfigurator) {
        console.error('❌ uniformConfigurator not found');
        throw new Error('App not found');
    }

    const app = window.uniformConfigurator;
    console.log('✅ App found');

    // Check layer manager
    if (!app.layerManager) {
        console.error('❌ LayerManager not found');
        throw new Error('LayerManager not found');
    }
    console.log('✅ LayerManager found');

    // Check current layers
    const beforeLayers = app.layerManager.getLayers();
    console.log('📝 Layers before:', beforeLayers.length);

    // Try to add text layer directly
    console.log('🧪 Testing addTextLayer method...');
    try {
        const layer = app.layerManager.addTextLayer('Debug Test');
        console.log('✅ addTextLayer succeeded:', layer);

        const afterLayers = app.layerManager.getLayers();
        console.log('📝 Layers after:', afterLayers.length);

    } catch (error) {
        console.error('❌ addTextLayer failed:', error);
        console.error('❌ Stack:', error.stack);
    }

    // Try clicking the button
    console.log('🧪 Testing button click...');
    const textBtn = document.getElementById('add-text-btn');
    if (textBtn) {
        console.log('✅ Button found, attempting click...');

        // Override console.error to catch errors
        const originalError = console.error;
        let errorCaught = null;
        console.error = function(...args) {
            errorCaught = args;
            originalError.apply(console, args);
        };

        try {
            textBtn.click();
            console.log('✅ Button clicked successfully');

            // Check if error was caught
            if (errorCaught) {
                console.log('❌ Error caught during click:', errorCaught);
            }

        } catch (error) {
            console.error('❌ Button click failed:', error);
            console.error('❌ Stack:', error.stack);
        }

        // Restore console.error
        console.error = originalError;

    } else {
        console.error('❌ Text button not found');
    }

} catch (error) {
    console.error('❌ Debug failed:', error);
}