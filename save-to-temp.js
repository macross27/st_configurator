const fs = require('fs');
const path = require('path');

// Function to save base64 image data to file
function saveBase64ToFile(base64Data, filePath) {
    try {
        // Remove data URL prefix
        const cleanBase64 = base64Data.replace(/^data:image\/png;base64,/, '');

        // Save to file
        fs.writeFileSync(filePath, cleanBase64, 'base64');
        console.log(`✅ Saved: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving ${filePath}:`, error.message);
        return false;
    }
}

// This will be filled with texture data from the browser
let textureData = {};

// Export function to be called with data
function saveTextures(data) {
    textureData = data;
    let savedCount = 0;

    console.log('🎨 Saving textures to E:\\temp...');

    if (textureData.pantsPattern) {
        if (saveBase64ToFile(textureData.pantsPattern, 'E:\\temp\\pants_dual_color_pattern.png')) {
            savedCount++;
        }
    }

    if (textureData.baseTexture) {
        if (saveBase64ToFile(textureData.baseTexture, 'E:\\temp\\base_texture_layermanager.png')) {
            savedCount++;
        }
    }

    if (textureData.finalMaterial) {
        if (saveBase64ToFile(textureData.finalMaterial, 'E:\\temp\\FINAL_MATERIAL_TEXTURE.png')) {
            savedCount++;
        }
    }

    console.log(`🎉 Saved ${savedCount} textures to E:\\temp`);
    return savedCount;
}

module.exports = { saveTextures };