const fs = require('fs');

// Base64 data for the pants pattern texture (extracted from browser)
const pantsPatternBase64 = `iVBORw0KGgoAAAANSUhEUgAAEAAAABAACAYAAADyoyQXAAAAAXNSR0IArs4c6QAAIABJREFUeF7s3MuW3CiUBVD7/z/avby6XZ3l`;

// This will be filled with the complete base64 data
function savePantsTexture(base64Data) {
    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Save to E:\temp
        fs.writeFileSync('E:\\temp\\pants_dual_color_FINAL.png', buffer);

        const sizeKB = Math.round(buffer.length / 1024);
        console.log(`✅ Saved pants texture to E:\\temp\\pants_dual_color_FINAL.png (${sizeKB} KB)`);

        return true;
    } catch (error) {
        console.error('❌ Error saving texture:', error.message);
        return false;
    }
}

// Test with partial data first
console.log('Script ready to save pants texture');
console.log('Call: savePantsTexture(completeBase64String)');

module.exports = { savePantsTexture };