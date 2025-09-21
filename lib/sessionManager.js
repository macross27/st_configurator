const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Security utility functions for path validation
class PathSecurity {
    static validateSessionId(sessionId) {
        // Ensure sessionId is a string and not null/undefined
        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error('Invalid session ID: must be a non-empty string');
        }

        // Check for path traversal attempts
        if (sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\')) {
            throw new Error('Invalid session ID: contains path traversal characters');
        }

        // Ensure sessionId only contains alphanumeric characters and safe special chars
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(sessionId)) {
            throw new Error('Invalid session ID: must contain only alphanumeric characters, underscores, and hyphens (max 50 chars)');
        }

        return sessionId;
    }

    static validateLayerId(layerId) {
        // Similar validation for layer IDs
        if (!layerId || typeof layerId !== 'string') {
            throw new Error('Invalid layer ID: must be a non-empty string');
        }

        if (layerId.includes('..') || layerId.includes('/') || layerId.includes('\\')) {
            throw new Error('Invalid layer ID: contains path traversal characters');
        }

        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(layerId)) {
            throw new Error('Invalid layer ID: must contain only alphanumeric characters, underscores, and hyphens (max 100 chars)');
        }

        return layerId;
    }

    static sanitizePath(basePath, userPath) {
        // Resolve the user path against the base path
        const resolvedPath = path.resolve(basePath, userPath);

        // Ensure the resolved path is still within the base directory
        if (!resolvedPath.startsWith(path.resolve(basePath))) {
            throw new Error('Path traversal attempt detected: resolved path outside base directory');
        }

        return resolvedPath;
    }

    static validateFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            throw new Error('Invalid filename: must be a non-empty string');
        }

        // Block dangerous characters and sequences
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
            throw new Error('Invalid filename: contains dangerous characters');
        }

        // Only allow safe filenames with common extensions
        if (!/^[a-zA-Z0-9_.-]{1,255}$/.test(filename)) {
            throw new Error('Invalid filename: must contain only safe characters (max 255 chars)');
        }

        return filename;
    }
}

class SessionManager {
    constructor(options = {}) {
        this.sessionsDir = options.sessionsDir || './sessions';
        this.sessionTimeoutMs = options.sessionTimeoutMs || 24 * 60 * 60 * 1000; // 24 hours
        this.maxSessionsPerIP = options.maxSessionsPerIP || 10;
        
        this.ensureSessionsDirectory();
    }
    
    async ensureSessionsDirectory() {
        try {
            await fs.mkdir(this.sessionsDir, { recursive: true });
            console.log(`Sessions directory ensured: ${this.sessionsDir}`);
        } catch (error) {
            console.error('Error creating sessions directory:', error);
        }
    }
    
    generateSessionId() {
        // Generate a URL-safe session ID (12 characters, alphanumeric)
        return crypto.randomBytes(9).toString('base64url').slice(0, 12);
    }
    
    async createSession(clientIP = 'unknown') {
        try {
            const sessionId = this.generateSessionId();

            // Validate the generated sessionId (should always pass, but safety check)
            const validSessionId = PathSecurity.validateSessionId(sessionId);

            const sessionData = {
                sessionId: validSessionId,
                clientIP,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                layers: [],
                modelSettings: {
                    modelPath: null,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 }
                },
                configuration: {}
            };

            const sessionDir = path.join(this.sessionsDir, validSessionId);
            await fs.mkdir(sessionDir, { recursive: true });
            await fs.mkdir(path.join(sessionDir, 'original_uploads'), { recursive: true });

            await this.saveSessionData(validSessionId, sessionData);

            console.log(`✅ Created new session: ${validSessionId}`);
            return validSessionId;

        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }
    
    async getSession(sessionId) {
        try {
            // Validate sessionId for security
            const validSessionId = PathSecurity.validateSessionId(sessionId);

            const sessionPath = path.join(this.sessionsDir, validSessionId, 'session.json');
            const data = await fs.readFile(sessionPath, 'utf8');
            const sessionData = JSON.parse(data);

            // Update last accessed time
            sessionData.lastAccessed = new Date().toISOString();
            await this.saveSessionData(validSessionId, sessionData);

            return sessionData;

        } catch (error) {
            if (error.code === 'ENOENT') {
                return null; // Session not found
            }
            throw error;
        }
    }
    
    async saveSessionData(sessionId, sessionData) {
        try {
            // Validate sessionId for security
            const validSessionId = PathSecurity.validateSessionId(sessionId);

            sessionData.lastModified = new Date().toISOString();
            const sessionPath = path.join(this.sessionsDir, validSessionId, 'session.json');
            await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving session data:', error);
            throw error;
        }
    }
    
    async updateSession(sessionId, updates) {
        try {
            const sessionData = await this.getSession(sessionId);
            if (!sessionData) {
                throw new Error('Session not found');
            }
            
            // Deep merge updates
            const updatedData = this.deepMerge(sessionData, updates);
            await this.saveSessionData(sessionId, updatedData);
            
            return updatedData;
            
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }
    
    async addLayer(sessionId, layerData, imageBuffer = null, originalBuffer = null, files = null) {
        console.log(`Processing layer ${layerData.id} for session ${sessionId}`);
        console.log(`Image buffer size: ${imageBuffer ? imageBuffer.length : 'null'} bytes`);

        try {
            // Validate sessionId for security
            const validSessionId = PathSecurity.validateSessionId(sessionId);

            const sessionData = await this.getSession(validSessionId);
            if (!sessionData) {
                throw new Error(`Session not found: ${validSessionId}`);
            }

            const layerId = layerData.id || `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            // Validate layerId for security
            const validLayerId = PathSecurity.validateLayerId(layerId);

            // Enhanced image buffer extraction using helper method
            if (!imageBuffer && files) {
                console.log(`Attempting to extract image buffer from files for layer ${validLayerId}`);
                imageBuffer = this.extractImageBuffer(files, validLayerId);
                if (!imageBuffer) {
                    console.error(`No image buffer received for layer ${validLayerId}`);
                    console.error(`Available file fields:`, Object.keys(files));
                    // Continue without image if buffer extraction fails
                }
            }

            // Save processed image if provided with enhanced validation
            let imagePath = null;
            if (imageBuffer) {
                console.log(`Attempting to write image for layer ${validLayerId}, buffer size: ${imageBuffer.length} bytes`);
                imagePath = await this.writeLayerImage(validSessionId, validLayerId, imageBuffer);
                if (imagePath) {
                    console.log(`✅ Successfully saved image: ${imagePath}`);
                } else {
                    console.error(`❌ Failed to save image for layer ${validLayerId}`);
                    // Continue without image path if write fails
                }
            }

            // Save original image if provided
            let originalPath = null;
            if (originalBuffer) {
                console.log(`Attempting to write original image for layer ${validLayerId}, buffer size: ${originalBuffer.length} bytes`);
                originalPath = await this.writeOriginalImage(validSessionId, validLayerId, originalBuffer);
                if (originalPath) {
                    console.log(`✅ Successfully saved original image: ${originalPath}`);
                } else {
                    console.warn(`⚠️ Failed to save original image for layer ${validLayerId}`);
                }
            }

            // Add layer to session
            const layer = {
                id: validLayerId,
                type: layerData.type || 'image',
                name: layerData.name || `Layer ${sessionData.layers.length + 1}`,
                visible: layerData.visible !== undefined ? layerData.visible : true,
                properties: layerData.properties || {},
                imagePath: imagePath,
                originalPath: originalPath,
                createdAt: new Date().toISOString()
            };

            sessionData.layers.push(layer);
            await this.saveSessionData(validSessionId, sessionData);

            console.log(`✅ Added layer ${validLayerId} to session ${validSessionId} with ${imagePath ? 'image' : 'no image'}`);
            return layer;

        } catch (error) {
            console.error(`❌ Error adding layer to session ${sessionId}:`, error);
            console.error(`❌ Layer data:`, JSON.stringify(layerData, null, 2));
            console.error(`❌ Stack trace:`, error.stack);
            throw error;
        }
    }
    
    async updateLayer(sessionId, layerId, updates) {
        try {
            // Validate sessionId and layerId for security
            const validSessionId = PathSecurity.validateSessionId(sessionId);
            const validLayerId = PathSecurity.validateLayerId(layerId);

            const sessionData = await this.getSession(validSessionId);
            if (!sessionData) {
                throw new Error('Session not found');
            }

            const layerIndex = sessionData.layers.findIndex(layer => layer.id === validLayerId);
            if (layerIndex === -1) {
                throw new Error('Layer not found');
            }

            // Update layer properties
            sessionData.layers[layerIndex] = {
                ...sessionData.layers[layerIndex],
                ...updates,
                lastModified: new Date().toISOString()
            };

            await this.saveSessionData(validSessionId, sessionData);
            return sessionData.layers[layerIndex];

        } catch (error) {
            console.error('Error updating layer:', error);
            throw error;
        }
    }
    
    async removeLayer(sessionId, layerId) {
        try {
            // Validate sessionId and layerId for security
            const validSessionId = PathSecurity.validateSessionId(sessionId);
            const validLayerId = PathSecurity.validateLayerId(layerId);

            const sessionData = await this.getSession(validSessionId);
            if (!sessionData) {
                throw new Error('Session not found');
            }

            const layerIndex = sessionData.layers.findIndex(layer => layer.id === validLayerId);
            if (layerIndex === -1) {
                throw new Error('Layer not found');
            }

            const layer = sessionData.layers[layerIndex];
            const sessionDir = path.join(this.sessionsDir, validSessionId);

            // Delete associated files with path validation
            if (layer.imagePath) {
                try {
                    // Validate that the file path is safe before deletion
                    const safeImagePath = PathSecurity.sanitizePath(sessionDir, layer.imagePath);
                    await fs.unlink(safeImagePath);
                } catch (error) {
                    console.warn(`Could not delete image file: ${layer.imagePath}`);
                }
            }

            if (layer.originalPath) {
                try {
                    // Validate that the file path is safe before deletion
                    const safeOriginalPath = PathSecurity.sanitizePath(sessionDir, layer.originalPath);
                    await fs.unlink(safeOriginalPath);
                } catch (error) {
                    console.warn(`Could not delete original file: ${layer.originalPath}`);
                }
            }

            // Remove layer from session
            sessionData.layers.splice(layerIndex, 1);
            await this.saveSessionData(validSessionId, sessionData);

            console.log(`✅ Removed layer ${validLayerId} from session ${validSessionId}`);
            return true;

        } catch (error) {
            console.error('Error removing layer:', error);
            throw error;
        }
    }
    
    async getLayerImage(sessionId, layerId) {
        try {
            // Validate sessionId and layerId for security
            const validSessionId = PathSecurity.validateSessionId(sessionId);
            const validLayerId = PathSecurity.validateLayerId(layerId);

            const sessionData = await this.getSession(validSessionId);
            if (!sessionData) {
                throw new Error('Session not found');
            }

            const layer = sessionData.layers.find(layer => layer.id === validLayerId);
            if (!layer) {
                throw new Error('Layer not found');
            }

            // First try the stored imagePath with security validation
            if (layer.imagePath) {
                try {
                    // Validate that the image path is safe
                    const sessionDir = path.join(this.sessionsDir, validSessionId);
                    const safeImagePath = PathSecurity.sanitizePath(sessionDir, layer.imagePath);
                    return await fs.readFile(safeImagePath);
                } catch (error) {
                    console.warn(`⚠️ Could not load image from stored path: ${layer.imagePath}`);
                }
            }
            
            // Fallback: try to find image file by layer ID (for layers with null imagePath due to timeouts)
            if (layer.type !== 'text') {
                // First, try the session directory
                const sessionDir = path.join(this.sessionsDir, sessionId);
                const possibleExtensions = ['png', 'jpg', 'jpeg', 'webp'];
                
                for (const ext of possibleExtensions) {
                    const fallbackPath = path.join(sessionDir, `${layerId}.${ext}`);
                    try {
                        const imageBuffer = await fs.readFile(fallbackPath);
                        console.log(`✅ Found image via fallback in session dir: ${fallbackPath}`);
                        return imageBuffer;
                    } catch (error) {
                        // Continue trying other extensions
                    }
                }
                
                // Last resort: look in the processed directory for files that might match this layer
                // This handles cases where job completed after client timeout
                try {
                    const processedDir = process.env.PROCESSED_DIR || './processed';
                    const allProcessedFiles = await fs.readdir(processedDir);
                    
                    // Look for files that might belong to this layer based on creation time
                    // Layer IDs contain timestamp, so we can approximate
                    const layerTimestamp = layerId.split('_')[1]; // Extract timestamp from layer ID
                    if (layerTimestamp) {
                        // Look for processed files created around the same time
                        const targetTime = parseInt(layerTimestamp);
                        
                        for (const filename of allProcessedFiles) {
                            // Skip if not an image file
                            if (!filename.match(/\.(png|jpg|jpeg|webp)$/i)) continue;
                            
                            // Check if filename contains a timestamp near our layer timestamp
                            const timestampMatch = filename.match(/_(\d+)_/);
                            if (timestampMatch) {
                                const fileTimestamp = parseInt(timestampMatch[1]);
                                // Allow 30 second window around layer creation time
                                if (Math.abs(fileTimestamp - targetTime) < 30000) {
                                    const processedPath = path.join(processedDir, filename);
                                    try {
                                        const imageBuffer = await fs.readFile(processedPath);
                                        console.log(`✅ Found image via processed dir fallback: ${processedPath}`);
                                        return imageBuffer;
                                    } catch (error) {
                                        // Continue trying other files
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not search processed directory: ${error.message}`);
                }
            }
            
            throw new Error('Layer image not found');
            
        } catch (error) {
            console.error('Error getting layer image:', error);
            throw error;
        }
    }
    
    async cleanupExpiredSessions() {
        try {
            console.log('🧹 Starting session cleanup...');
            const sessions = await fs.readdir(this.sessionsDir);
            let cleanedCount = 0;
            
            for (const sessionId of sessions) {
                try {
                    const sessionData = await this.getSession(sessionId);
                    if (sessionData) {
                        const lastAccessed = new Date(sessionData.lastAccessed || sessionData.lastModified);
                        const timeSinceAccess = Date.now() - lastAccessed.getTime();
                        
                        if (timeSinceAccess > this.sessionTimeoutMs) {
                            await this.deleteSession(sessionId);
                            cleanedCount++;
                        }
                    }
                } catch (error) {
                    console.warn(`Error checking session ${sessionId} for cleanup:`, error.message);
                }
            }
            
            console.log(`🧹 Session cleanup complete: ${cleanedCount} sessions removed`);
            return cleanedCount;
            
        } catch (error) {
            console.error('Error during session cleanup:', error);
            throw error;
        }
    }
    
    async deleteSession(sessionId) {
        try {
            // Validate sessionId for security
            const validSessionId = PathSecurity.validateSessionId(sessionId);

            const sessionDir = path.join(this.sessionsDir, validSessionId);
            await fs.rmdir(sessionDir, { recursive: true });
            console.log(`🗑️  Deleted session: ${validSessionId}`);
            return true;
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }
    
    extractImageBuffer(files, layerId) {
        console.log(`🔍 Extracting image buffer for layer ${layerId}`);
        console.log(`🔍 Available file fields:`, Object.keys(files));
        
        const fieldName = `layer_${layerId}_image`;
        console.log(`🔍 Looking for field: ${fieldName}`);
        
        // Try different file field formats with detailed logging
        if (files[fieldName]?.[0]?.buffer) {
            console.log(`✅ Found buffer in ${fieldName}[0].buffer, size: ${files[fieldName][0].buffer.length} bytes`);
            return files[fieldName][0].buffer;
        }
        
        if (files[fieldName]?.buffer) {
            console.log(`✅ Found buffer in ${fieldName}.buffer, size: ${files[fieldName].buffer.length} bytes`);
            return files[fieldName].buffer;
        }
        
        // Check for alternative field naming
        const altFieldName = `layer_image_${layerId}`;
        console.log(`🔍 Trying alternative field: ${altFieldName}`);
        if (files[altFieldName]?.[0]?.buffer) {
            console.log(`✅ Found buffer in ${altFieldName}[0].buffer, size: ${files[altFieldName][0].buffer.length} bytes`);
            return files[altFieldName][0].buffer;
        }
        
        // Also check for direct data property
        if (files[fieldName]?.[0]?.data) {
            console.log(`✅ Found data in ${fieldName}[0].data, size: ${files[fieldName][0].data.length} bytes`);
            return files[fieldName][0].data;
        }
        
        if (files[fieldName]?.data) {
            console.log(`✅ Found data in ${fieldName}.data, size: ${files[fieldName].data.length} bytes`);
            return files[fieldName].data;
        }
        
        // Check for generic 'image' field
        if (files.image?.[0]?.buffer) {
            console.log(`✅ Found buffer in image[0].buffer, size: ${files.image[0].buffer.length} bytes`);
            return files.image[0].buffer;
        }
        
        if (files.image?.buffer) {
            console.log(`✅ Found buffer in image.buffer, size: ${files.image.buffer.length} bytes`);
            return files.image.buffer;
        }
        
        // Log detailed field structure for debugging
        for (const [key, value] of Object.entries(files)) {
            if (Array.isArray(value)) {
                console.log(`🔍 Field ${key} is array with ${value.length} items:`, 
                    value.map(item => ({ 
                        hasBuffer: !!item.buffer, 
                        bufferSize: item.buffer ? item.buffer.length : null,
                        hasData: !!item.data,
                        dataSize: item.data ? item.data.length : null,
                        fieldname: item.fieldname,
                        originalname: item.originalname
                    })));
            } else if (value && typeof value === 'object') {
                console.log(`🔍 Field ${key} is object:`, { 
                    hasBuffer: !!value.buffer, 
                    bufferSize: value.buffer ? value.buffer.length : null,
                    hasData: !!value.data,
                    dataSize: value.data ? value.data.length : null
                });
            }
        }
        
        console.error(`❌ No image buffer found for layer ${layerId} after trying all extraction methods`);
        return null;
    }
    
    async writeLayerImage(sessionId, layerId, imageBuffer) {
        // Validate sessionId and layerId for security
        const validSessionId = PathSecurity.validateSessionId(sessionId);
        const validLayerId = PathSecurity.validateLayerId(layerId);

        const sessionDir = path.join(this.sessionsDir, validSessionId);
        const imagePath = `${validLayerId}.png`;
        const fullPath = path.join(sessionDir, imagePath);
        
        console.log(`🔧 Writing image for layer ${layerId} to: ${fullPath}`);
        console.log(`🔧 Image buffer size: ${imageBuffer ? imageBuffer.length : 'null'} bytes`);
        
        try {
            // Validate input parameters
            if (!imageBuffer) {
                throw new Error('Image buffer is null or undefined');
            }
            
            if (imageBuffer.length === 0) {
                throw new Error('Image buffer is empty');
            }
            
            // Ensure session directory exists
            await fs.mkdir(sessionDir, { recursive: true });
            
            // Write file with detailed error handling
            await fs.writeFile(fullPath, imageBuffer);
            console.log(`✅ File written successfully to: ${fullPath}`);
            
            // Validate file was written correctly
            const stats = await fs.stat(fullPath);
            console.log(`📊 Written file stats - size: ${stats.size} bytes, created: ${stats.birthtime}`);
            
            if (stats.size === 0) {
                throw new Error('Written file is empty (size = 0)');
            }
            
            if (stats.size !== imageBuffer.length) {
                console.warn(`⚠️ File size mismatch - expected: ${imageBuffer.length}, actual: ${stats.size}`);
                // Don't fail for small discrepancies, but log the warning
            }
            
            console.log(`✅ Image file validation passed for layer ${layerId}`);
            return imagePath;
            
        } catch (error) {
            console.error(`❌ Failed to write image for layer ${layerId}:`, error);
            console.error(`❌ Session directory: ${sessionDir}`);
            console.error(`❌ Full file path: ${fullPath}`);
            console.error(`❌ Error stack:`, error.stack);
            
            // Try to clean up partial file if it exists
            try {
                await fs.unlink(fullPath);
                console.log(`🧹 Cleaned up partial file: ${fullPath}`);
            } catch (cleanupError) {
                console.warn(`⚠️ Could not clean up partial file: ${cleanupError.message}`);
            }
            
            return null;
        }
    }
    
    async writeOriginalImage(sessionId, layerId, originalBuffer) {
        // Validate sessionId and layerId for security
        const validSessionId = PathSecurity.validateSessionId(sessionId);
        const validLayerId = PathSecurity.validateLayerId(layerId);

        const sessionDir = path.join(this.sessionsDir, validSessionId);
        const originalExtension = this.getImageExtension('original');
        const originalPath = `original_uploads/${validLayerId}_original.${originalExtension}`;
        const fullPath = path.join(sessionDir, originalPath);
        
        try {
            await fs.writeFile(fullPath, originalBuffer);
            
            // Validate file was written
            const stats = await fs.stat(fullPath);
            if (stats.size === 0) {
                throw new Error('Written original file is empty');
            }
            
            return originalPath;
        } catch (error) {
            console.error(`Failed to write original image for layer ${layerId}:`, error);
            return null;
        }
    }
    
    getImageExtension(type) {
        const extensions = {
            'logo': 'png',
            'text': 'png', 
            'image': 'png',
            'original': 'jpg'
        };
        return extensions[type] || 'png';
    }
    
    deepMerge(target, source) {
        const output = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        }
        return output;
    }
    
    async getStats() {
        try {
            const sessions = await fs.readdir(this.sessionsDir);
            let totalSessions = 0;
            let activeSessions = 0;
            let totalLayers = 0;
            
            for (const sessionId of sessions) {
                try {
                    const sessionData = await this.getSession(sessionId);
                    if (sessionData) {
                        totalSessions++;
                        totalLayers += sessionData.layers.length;
                        
                        const lastAccessed = new Date(sessionData.lastAccessed || sessionData.lastModified);
                        const timeSinceAccess = Date.now() - lastAccessed.getTime();
                        
                        if (timeSinceAccess < this.sessionTimeoutMs) {
                            activeSessions++;
                        }
                    }
                } catch (error) {
                    console.warn(`Error reading session stats for ${sessionId}:`, error.message);
                }
            }
            
            return {
                totalSessions,
                activeSessions,
                totalLayers,
                sessionTimeoutHours: this.sessionTimeoutMs / (1000 * 60 * 60)
            };
            
        } catch (error) {
            console.error('Error getting session stats:', error);
            return {
                totalSessions: 0,
                activeSessions: 0,
                totalLayers: 0,
                error: error.message
            };
        }
    }
}

module.exports = SessionManager;