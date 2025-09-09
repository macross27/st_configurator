export class SessionManager {
    constructor(options = {}) {
        this.serverUrl = options.serverUrl;
        this.currentSessionId = null;
        this.sessionData = null;
        this.hasUnsavedChanges = false;
        
        // Event callbacks
        this.onSessionCreated = options.onSessionCreated || (() => {});
        this.onSessionLoaded = options.onSessionLoaded || (() => {});
        this.onSessionSaved = options.onSessionSaved || (() => {});
        this.onSessionError = options.onSessionError || (() => {});
        
        this.checkForExistingSession();
    }
    
    async checkForExistingSession() {
        try {
            // Check if we have a session ID in URL path (e.g., /sessionId)
            const pathSegments = window.location.pathname.split('/').filter(segment => segment.length > 0);
            const sessionId = pathSegments.length > 0 ? pathSegments[0] : null;
            
            if (sessionId) {
                // Load existing session
                await this.loadSession(sessionId);
            }
            // If no session ID, do nothing - wait for user to submit
            
        } catch (error) {
            console.error('Error checking for existing session:', error);
            this.onSessionError(error);
        }
    }
    
    async createNewSession() {
        try {
            const url = `${this.serverUrl}/api/sessions`;
            console.log(`🔧 Creating new session at: ${url}`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create session: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.currentSessionId = data.sessionId;
            this.sessionData = {
                sessionId: data.sessionId,
                layers: [],
                modelSettings: {},
                configuration: {}
            };
            
            // Update URL without refreshing the page
            const newUrl = `${window.location.origin}${data.url}`;
            window.history.pushState({}, '', newUrl);
            
            console.log(`✅ Created new session: ${this.currentSessionId}`);
            this.onSessionCreated(this.sessionData);
            
            return this.currentSessionId;
            
        } catch (error) {
            console.error('Error creating session:', error);
            this.onSessionError(error);
            throw error;
        }
    }
    
    async loadSession(sessionId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/sessions/${sessionId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Session not found');
                }
                throw new Error(`Failed to load session: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.currentSessionId = sessionId;
            this.sessionData = data.session;
            
            // Mark all loaded layers as already uploaded to prevent re-submission
            if (this.sessionData && this.sessionData.layers) {
                this.sessionData.layers.forEach(layer => {
                    layer.sessionUploaded = true;
                });
            }
            
            console.log(`✅ Loaded session: ${sessionId} with ${this.sessionData.layers?.length || 0} layers`);
            
            this.onSessionLoaded(this.sessionData);
            
            return this.sessionData;
            
        } catch (error) {
            console.error('Error loading session:', error);
            this.onSessionError(error);
            throw error;
        }
    }
    
    async submitSession(layerManager = null) {
        try {
            // If no session exists, create one first
            if (!this.currentSessionId) {
                await this.createNewSession();
                // Small delay to ensure session is fully persisted on server
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Upload all layers with images to the session
            if (layerManager) {
                const layers = layerManager.getLayers();
                console.log(`🔍 DEBUG: Processing ${layers.length} layers for submission`);
                
                for (const layer of layers) {
                    console.log(`🔍 DEBUG: Layer ${layer.id || layer.name} - sessionUploaded: ${layer.sessionUploaded}`);
                    
                    if (!layer.sessionUploaded) {
                        console.log(`🔄 Uploading new layer: ${layer.id || layer.name}`);
                        // Upload layer to session - handle both image and non-image layers
                        const layerData = {
                            type: layer.type || 'unknown',
                            name: layer.name,
                            visible: layer.visible,
                            properties: {
                                x: layer.x || layer.position?.x || 0,
                                y: layer.y || layer.position?.y || 0,
                                scale: layer.scale || 1,
                                rotation: layer.rotation || 0,
                                opacity: layer.opacity || 1
                            }
                        };
                        
                        // Add type-specific properties
                        if (layer.type === 'text') {
                            layerData.properties.text = layer.text;
                            layerData.properties.color = layer.color;
                            layerData.properties.fontSize = layer.fontSize;
                            layerData.properties.fontFamily = layer.fontFamily;
                        }
                        
                        let file = null;
                        
                        // If layer has an image, handle it based on source
                        if (layer.image) {
                            // Check if this is a server-processed image (would cause CORS taint issues)
                            if (layer.serverImageUrl) {
                                // For server-processed images, pass the server URL instead of re-exporting
                                // The server can handle copying the existing processed image
                                layerData.serverImageUrl = layer.serverImageUrl;
                                console.log(`🔄 Using server image URL for layer ${layer.id}: ${layer.serverImageUrl}`);
                            } else {
                                // For client-processed images, export as blob (safe since no CORS taint)
                                try {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = layer.image.width;
                                    canvas.height = layer.image.height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(layer.image, 0, 0);
                                    
                                    // Convert canvas to blob
                                    const blob = await new Promise(resolve => {
                                        canvas.toBlob(resolve, 'image/png');
                                    });
                                    
                                    // Create a File object from the blob with a safe filename
                                    const safeFileName = typeof layer.name === 'string' && layer.name.trim() 
                                        ? layer.name.trim().replace(/[^a-zA-Z0-9\-_.]/g, '_')
                                        : `layer_${layer.id}`;
                                    file = new File([blob], `${safeFileName}.png`, { type: 'image/png' });
                                    console.log(`🔄 Exported client image as blob for layer ${layer.id}`);
                                } catch (error) {
                                    console.error(`❌ Failed to export image for layer ${layer.id}:`, error);
                                    // Still try to upload the layer without image
                                }
                            }
                        }
                        
                        await this.addLayer(layerData, file);
                        
                        // Mark layer as uploaded to avoid duplicate uploads
                        layer.sessionUploaded = true;
                    } else {
                        console.log(`🔍 DEBUG: Skipping layer upload - already uploaded`);
                    }
                }
            }
            
            // Save configuration and model settings
            const updates = {
                configuration: this.sessionData?.configuration || {},
                modelSettings: this.sessionData?.modelSettings || {}
            };
            
            const response = await fetch(`${this.serverUrl}/api/sessions/${this.currentSessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to submit session: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.sessionData = data.session;
            this.hasUnsavedChanges = false;
            
            console.log(`💾 Session submitted: ${this.currentSessionId}`);
            this.onSessionSaved(this.sessionData);
            
            // Send session notification via email using working endpoint
            try {
                console.log(`📧 Sending session notification via email...`);
                const emailResponse = await fetch(`${this.serverUrl}/api/email/notification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: 'ymacross27@yahoo.com',
                        title: `ST Configurator Session: ${this.currentSessionId}`,
                        message: `A new session has been submitted with ${this.sessionData.layers?.length || 0} layers. Session ID: ${this.currentSessionId}. View at: ${this.getShareableUrl()}`,
                        actionUrl: this.getShareableUrl()
                    })
                });
                
                if (emailResponse.ok) {
                    const emailResult = await emailResponse.json();
                    console.log(`✅ Session notification sent successfully`);
                } else {
                    const emailError = await emailResponse.json().catch(() => ({ error: 'Unknown error' }));
                    console.warn(`⚠️ Failed to send session notification: ${emailError.error || emailError.details}`);
                }
            } catch (emailError) {
                console.warn(`⚠️ Failed to send session notification:`, emailError.message);
            }
            
            return this.getShareableUrl();
            
        } catch (error) {
            console.error('Error submitting session:', error);
            this.onSessionError(error);
            throw error;
        }
    }
    
    async addLayer(layerData, imageFile = null) {
        if (!this.currentSessionId) {
            throw new Error('No active session');
        }
        
        try {
            const formData = new FormData();
            formData.append('layerData', JSON.stringify(layerData));
            
            if (imageFile) {
                formData.append('image', imageFile);
                formData.append('async', 'true'); // Request async processing for images
            }
            
            const url = `${this.serverUrl}/api/sessions/${this.currentSessionId}/layers`;
            console.log(`🔧 Attempting to fetch: ${url}`);
            console.log(`🔧 Server URL: ${this.serverUrl}`);
            console.log(`🔧 Session ID: ${this.currentSessionId}`);
            
            // Create AbortController for timeout handling
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout for initial request
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: abortController.signal
            });
            
            // Clear timeout if request completes successfully
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Failed to add layer: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // If async processing, poll for completion
            if (data.jobId) {
                console.log(`🔄 Layer processing started, polling job: ${data.jobId}`);
                return await this.pollJobCompletion(data.jobId);
            }
            
            // Synchronous completion (no image file)
            const layer = data.layer;
            
            // Add layer to local session data
            this.sessionData.layers.push(layer);
            this.markAsModified();
            
            console.log(`✅ Added layer to session: ${layer.id}`);
            return layer;
            
        } catch (error) {
            console.error('Error adding layer:', error);
            
            // Handle timeout/abort errors with better messaging
            if (error.name === 'AbortError') {
                const timeoutError = new Error('Request timed out. The server may be processing a large image. Please try again.');
                this.onSessionError(timeoutError);
                throw timeoutError;
            }
            
            this.onSessionError(error);
            throw error;
        }
    }
    
    async pollJobCompletion(jobId) {
        const maxAttempts = 90; // 90 attempts = ~3 minutes max
        const pollInterval = 2000; // 2 seconds
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const pollUrl = `${this.serverUrl}/api/sessions/${this.currentSessionId}/layers/job/${jobId}`;
                console.log(`🔄 Polling job ${jobId}, attempt ${attempts + 1}/${maxAttempts}`);
                
                const response = await fetch(pollUrl);
                if (!response.ok) {
                    throw new Error(`Polling failed: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.status === 'completed') {
                    const layer = data.layer;
                    
                    // Add layer to local session data
                    this.sessionData.layers.push(layer);
                    this.markAsModified();
                    
                    console.log(`✅ Layer processing completed: ${layer.id}`);
                    return layer;
                }
                
                if (data.status === 'failed') {
                    throw new Error(data.error || 'Layer processing failed');
                }
                
                // Still processing, wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
                
            } catch (error) {
                console.error(`Polling attempt ${attempts + 1} failed:`, error);
                attempts++;
                
                // If it's the last attempt, throw the error
                if (attempts >= maxAttempts) {
                    throw error;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }
        
        throw new Error('Layer processing timed out after 3 minutes');
    }
    
    async updateLayer(layerId, updates) {
        if (!this.currentSessionId) {
            throw new Error('No active session');
        }
        
        try {
            const response = await fetch(`${this.serverUrl}/api/sessions/${this.currentSessionId}/layers/${layerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update layer: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Update layer in local session data
            const layerIndex = this.sessionData.layers.findIndex(layer => layer.id === layerId);
            if (layerIndex !== -1) {
                this.sessionData.layers[layerIndex] = data.layer;
                this.markAsModified();
            }
            
            console.log(`✅ Updated layer: ${layerId}`);
            return data.layer;
            
        } catch (error) {
            console.error('Error updating layer:', error);
            this.onSessionError(error);
            throw error;
        }
    }
    
    async removeLayer(layerId) {
        if (!this.currentSessionId) {
            throw new Error('No active session');
        }
        
        try {
            const response = await fetch(`${this.serverUrl}/api/sessions/${this.currentSessionId}/layers/${layerId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to remove layer: ${response.statusText}`);
            }
            
            // Remove layer from local session data
            this.sessionData.layers = this.sessionData.layers.filter(layer => layer.id !== layerId);
            this.markAsModified();
            
            console.log(`✅ Removed layer: ${layerId}`);
            return true;
            
        } catch (error) {
            console.error('Error removing layer:', error);
            this.onSessionError(error);
            throw error;
        }
    }
    
    getLayerImageUrl(layerId) {
        if (!this.currentSessionId) {
            return null;
        }
        
        return `${this.serverUrl}/api/sessions/${this.currentSessionId}/layers/${layerId}/image`;
    }
    
    updateConfiguration(config) {
        if (!this.sessionData) {
            return;
        }
        
        this.sessionData.configuration = {
            ...this.sessionData.configuration,
            ...config
        };
        
        this.markAsModified();
    }
    
    updateModelSettings(settings) {
        if (!this.sessionData) {
            return;
        }
        
        this.sessionData.modelSettings = {
            ...this.sessionData.modelSettings,
            ...settings
        };
        
        this.markAsModified();
    }
    
    markAsModified() {
        this.hasUnsavedChanges = true;
    }
    
    
    getCurrentSession() {
        return {
            sessionId: this.currentSessionId,
            data: this.sessionData
        };
    }
    
    getShareableUrl() {
        if (!this.currentSessionId) {
            return null;
        }
        
        return `${window.location.origin}/${this.currentSessionId}`;
    }
    
    isSessionActive() {
        return this.currentSessionId !== null;
    }
    
    destroy() {
        this.currentSessionId = null;
        this.sessionData = null;
    }
}