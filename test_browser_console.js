// Paste this into browser console to test functionality
console.clear();
console.log('🧪 TESTING FUNCTIONALITY');

// 1. Check if app is loaded
if (window.uniformConfigurator) {
    const app = window.uniformConfigurator;
    console.log('✅ App found');

    // 2. Test base texture
    console.log('📷 Base texture:', app.baseTextureImage ? 'LOADED' : 'NOT LOADED');

    // 3. Test managers
    console.log('🎬 Scene Manager:', app.sceneManager ? 'OK' : 'MISSING');
    console.log('🎨 Layer Manager:', app.layerManager ? 'OK' : 'MISSING');

    // 4. Test 3D model
    if (app.sceneManager) {
        console.log('🎯 3D Model:', app.sceneManager.model ? 'LOADED' : 'NOT LOADED');
        console.log('🎯 Material:', app.sceneManager.material ? 'OK' : 'MISSING');
    }

    // 5. Test texture system
    if (app.layerManager) {
        console.log('🎨 Texture Canvas:', app.layerManager.textureCanvas ? 'OK' : 'MISSING');
        console.log('🎨 THREE Texture:', app.layerManager.texture ? 'OK' : 'MISSING');
        console.log('🎨 Current Layers:', app.layerManager.layers.length);
    }

    // 6. Try adding a text layer
    console.log('\n🧪 TESTING TEXT LAYER...');
    if (app.layerManager) {
        try {
            const beforeCount = app.layerManager.layers.length;
            const layer = app.layerManager.addTextLayer('TEST');
            const afterCount = app.layerManager.layers.length;

            console.log('Layer added:', layer);
            console.log('Before count:', beforeCount, 'After count:', afterCount);

            if (afterCount > beforeCount) {
                console.log('✅ Text layer added successfully');

                // Check if texture updated
                if (app.layerManager.texture && app.layerManager.texture.needsUpdate) {
                    console.log('✅ Texture marked for update');
                } else {
                    console.log('❌ Texture not marked for update');
                }
            } else {
                console.log('❌ Text layer not added');
            }
        } catch (error) {
            console.error('❌ Error adding text layer:', error);
        }
    }

    // 7. Test button click
    console.log('\n🧪 TESTING BUTTON CLICK...');
    const textBtn = document.getElementById('add-text-btn');
    if (textBtn) {
        console.log('Found text button, clicking...');
        textBtn.click();
    } else {
        console.log('❌ Text button not found');
    }

} else {
    console.log('❌ App not found');
}