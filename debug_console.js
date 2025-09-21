// Debug script - paste this into browser console
console.clear();
console.log('🔍 DEBUGGING UNIFORM CONFIGURATOR');
console.log('=================================');

// Check if app exists
if (window.uniformConfigurator) {
    const app = window.uniformConfigurator;
    console.log('✅ App found:', app);

    // Check base texture
    console.log('📷 Base texture image:', app.baseTextureImage);

    // Check managers
    console.log('🎬 Scene Manager:', app.sceneManager);
    console.log('🎨 Layer Manager:', app.layerManager);
    console.log('🖥️ UI Manager:', app.uiManager);

    // Check 3D model
    if (app.sceneManager) {
        console.log('🎯 3D Model loaded:', !!app.sceneManager.model);
        console.log('🎯 Scene material:', app.sceneManager.material);
        console.log('🎯 Scene renderer:', !!app.sceneManager.renderer);
    }

    // Check texture system
    if (app.layerManager) {
        console.log('🎨 Texture canvas:', app.layerManager.textureCanvas);
        console.log('🎨 Current texture:', app.layerManager.texture);
        console.log('🎨 Layers count:', app.layerManager.layers.length);
        console.log('🎨 Current layers:', app.layerManager.layers);
    }

    // Test texture creation
    console.log('\n🧪 TESTING TEXTURE CREATION...');
    if (app.layerManager && app.layerManager.textureCanvas) {
        const canvas = app.layerManager.textureCanvas;
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

        // Try to add a test layer
        console.log('Adding test text layer...');
        try {
            const layer = app.layerManager.addTextLayer('DEBUG TEST');
            console.log('Test layer added:', layer);

            // Check if texture updated
            setTimeout(() => {
                console.log('Texture after test layer:', app.layerManager.texture);
                console.log('Texture needsUpdate:', app.layerManager.texture?.needsUpdate);
            }, 500);
        } catch (error) {
            console.error('❌ Error adding test layer:', error);
        }
    }

} else {
    console.log('❌ window.uniformConfigurator not found');
    console.log('Available globals:', Object.keys(window).filter(k => k.includes('uniform') || k.includes('config')));
}

// Check for error messages in DOM
const errorElements = document.querySelectorAll('[data-error], .error, .notification');
console.log('🚨 Error elements found:', errorElements.length);
errorElements.forEach((el, i) => {
    console.log(`Error ${i}:`, el.textContent, el);
});

// Check initialization errors
console.log('\n🔍 CHECKING FOR INITIALIZATION ERRORS...');
console.log('Document ready state:', document.readyState);

// Monitor console for errors
const originalError = console.error;
console.error = function(...args) {
    console.log('🚨 CONSOLE ERROR CAUGHT:', args);
    originalError.apply(console, args);
};