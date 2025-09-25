const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function extractTextures() {
    console.log('🎨 Starting texture extraction...');

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to the application
        console.log('📱 Navigating to application...');
        await page.goto('http://localhost:3021');

        // Wait for application to load
        await page.waitForTimeout(3000);

        // Click pants preset button
        console.log('👖 Selecting pants preset...');
        await page.click('button[data-set-option="pants"]');
        await page.waitForTimeout(1000);

        // Click pants pattern button
        console.log('🎨 Selecting pants pattern...');
        await page.click('#pants-pattern-btn');
        await page.waitForTimeout(2000);

        // Extract texture data
        console.log('📸 Extracting texture data...');
        const textures = await page.evaluate(() => {
            const patternCompositor = window.uniformConfigurator?.patternCompositor;
            const layerManager = window.uniformConfigurator?.layerManager;
            const sceneManager = window.uniformConfigurator?.sceneManager;

            const result = {};

            // Pattern compositor texture
            if (patternCompositor?.canvas) {
                result.pantsPattern = patternCompositor.canvas.toDataURL('image/png');
            }

            // Layer manager texture
            if (layerManager?.textureCanvas) {
                result.baseTexture = layerManager.textureCanvas.toDataURL('image/png');
            }

            // Final material texture
            if (sceneManager?.sharedMaterial?.map?.image) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = sceneManager.sharedMaterial.map.image;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                result.finalMaterial = canvas.toDataURL('image/png');
            }

            return result;
        });

        // Save textures to project root
        const projectRoot = __dirname;

        if (textures.pantsPattern) {
            const base64Data = textures.pantsPattern.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(path.join(projectRoot, 'pants_dual_color_pattern.png'), base64Data, 'base64');
            console.log('✅ Saved pants_dual_color_pattern.png');
        }

        if (textures.baseTexture) {
            const base64Data = textures.baseTexture.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(path.join(projectRoot, 'base_texture_layermanager.png'), base64Data, 'base64');
            console.log('✅ Saved base_texture_layermanager.png');
        }

        if (textures.finalMaterial) {
            const base64Data = textures.finalMaterial.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(path.join(projectRoot, 'FINAL_MATERIAL_TEXTURE.png'), base64Data, 'base64');
            console.log('✅ Saved FINAL_MATERIAL_TEXTURE.png');
        }

        console.log('🎉 All textures saved to project root!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

// Run the extraction if this script is called directly
if (require.main === module) {
    extractTextures().catch(console.error);
}

module.exports = { extractTextures };