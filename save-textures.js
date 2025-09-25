const fs = require('fs');

// Simple script to save base64 texture data
function saveTextureFromBase64(base64Data, filename) {
    try {
        // Remove data URL prefix
        const cleanBase64 = base64Data.replace(/^data:image\/png;base64,/, '');

        // Save to file
        fs.writeFileSync(filename, cleanBase64, 'base64');
        console.log(`✅ Saved ${filename}`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving ${filename}:`, error.message);
        return false;
    }
}

// You'll paste the base64 data here
const textureData = {
    // Paste the base64 strings here manually
};

// Save textures
Object.entries(textureData).forEach(([key, data]) => {
    if (data) {
        const filename = `${key}_texture.png`;
        saveTextureFromBase64(data, filename);
    }
});

console.log('Texture extraction complete!');