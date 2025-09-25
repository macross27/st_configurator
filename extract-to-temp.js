const fs = require('fs');

// Get texture data from browser console output and save to E:\temp
async function saveTexturesToTemp() {
    console.log('🎨 Saving textures to E:\\temp...');

    // We'll get the base64 data from the browser's global variable
    const { chromium } = require('playwright');

    try {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Navigate to the app
        await page.goto('http://localhost:3021');
        await page.waitForTimeout(3000);

        // Set up pants
        await page.click('button[data-set-option="pants"]');
        await page.waitForTimeout(1000);
        await page.click('#pants-pattern-btn');
        await page.waitForTimeout(2000);

        // Extract texture data
        const textureData = await page.evaluate(() => {
            const patternCompositor = window.uniformConfigurator?.patternCompositor;
            const layerManager = window.uniformConfigurator?.layerManager;
            const sceneManager = window.uniformConfigurator?.sceneManager;

            const textures = {};

            if (patternCompositor?.canvas) {
                textures.pantsPattern = patternCompositor.canvas.toDataURL('image/png');
            }

            if (layerManager?.textureCanvas) {
                textures.baseTexture = layerManager.textureCanvas.toDataURL('image/png');
            }

            if (sceneManager?.sharedMaterial?.map?.image) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = sceneManager.sharedMaterial.map.image;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                textures.finalMaterial = canvas.toDataURL('image/png');
            }

            return textures;
        });

        // Save each texture
        let savedCount = 0;

        if (textureData.pantsPattern) {
            const data = textureData.pantsPattern.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync('E:\\temp\\pants_dual_color_pattern.png', data, 'base64');
            console.log('✅ Saved E:\\temp\\pants_dual_color_pattern.png');
            savedCount++;
        }

        if (textureData.baseTexture) {
            const data = textureData.baseTexture.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync('E:\\temp\\base_texture_layermanager.png', data, 'base64');
            console.log('✅ Saved E:\\temp\\base_texture_layermanager.png');
            savedCount++;
        }

        if (textureData.finalMaterial) {
            const data = textureData.finalMaterial.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync('E:\\temp\\FINAL_MATERIAL_TEXTURE.png', data, 'base64');
            console.log('✅ Saved E:\\temp\\FINAL_MATERIAL_TEXTURE.png');
            savedCount++;
        }

        console.log(`🎉 Saved ${savedCount} textures to E:\\temp`);

        await browser.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

saveTexturesToTemp();