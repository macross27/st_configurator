const fs = require('fs');

// Simple function to decode and save base64 image
function saveBase64Image(base64String, outputPath) {
    try {
        // Remove data URL prefix if present
        const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');

        // Convert to buffer and save
        const imageBuffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(outputPath, imageBuffer);

        console.log(`✅ Saved: ${outputPath} (${Math.round(imageBuffer.length / 1024)} KB)`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving ${outputPath}:`, error.message);
        return false;
    }
}

// Test with a simple placeholder
const testData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

saveBase64Image(testData, 'E:\\temp\\test.png');

console.log('Script ready to save textures. Call saveBase64Image(data, path) with your texture data.');

module.exports = { saveBase64Image };