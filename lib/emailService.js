const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Get SMTP configuration from environment variables
        const smtpConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        // Only create transporter if we have credentials
        if (smtpConfig.auth.user && smtpConfig.auth.pass) {
            this.transporter = nodemailer.createTransport(smtpConfig);
        } else {
            console.warn('Email service not configured: Missing SMTP credentials');
        }
    }

    async sendEmail(to, subject, html, text = null, attachments = null) {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: {
                name: process.env.SMTP_FROM_NAME || 'ST Configurator',
                address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
            },
            to: to,
            subject: subject,
            html: html,
            text: text || this.htmlToText(html) // Auto-generate text version if not provided
        };

        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', result.messageId);
            return result;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Simple HTML to text conversion
    htmlToText(html) {
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    async testConnection() {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error('Email connection test failed:', error);
            throw error;
        }
    }

    // Method to easily switch SMTP providers
    updateConfiguration(config) {
        const smtpConfig = {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass
            }
        };

        this.transporter = nodemailer.createTransport(smtpConfig);
    }

    // Template methods for common email types
    async sendNotification(to, title, message, actionUrl = null) {
        const html = this.createNotificationTemplate(title, message, actionUrl);
        return await this.sendEmail(to, title, html);
    }

    async sendWelcome(to, name) {
        const subject = 'Welcome to ST Configurator';
        const html = this.createWelcomeTemplate(name);
        return await this.sendEmail(to, subject, html);
    }

    // HTML Email Templates
    createNotificationTemplate(title, message, actionUrl = null) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
    </div>
    <div class="content">
        <p>${message}</p>
        ${actionUrl ? `<a href="${actionUrl}" class="button">Take Action</a>` : ''}
    </div>
    <div class="footer">
        <p>Sent by ST Configurator - 3D Uniform Configuration Tool</p>
    </div>
</body>
</html>`;
    }

    createWelcomeTemplate(name) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ST Configurator</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to ST Configurator!</h1>
    </div>
    <div class="content">
        <p>Hello ${name || 'there'},</p>
        <p>Welcome to ST Configurator - the premier 3D uniform configuration tool!</p>
        
        <div class="feature">
            <h3>🎨 3D Texture Editor</h3>
            <p>Create custom uniforms with our advanced 3D texture editing system</p>
        </div>
        
        <div class="feature">
            <h3>📱 Layer Management</h3>
            <p>Add text, logos, and images with precise positioning and rotation</p>
        </div>
        
        <div class="feature">
            <h3>💾 Session Management</h3>
            <p>Save and load your configurations for easy collaboration</p>
        </div>
        
        <p>Get started by visiting our application and creating your first uniform design!</p>
    </div>
    <div class="footer">
        <p>ST Configurator - 3D Uniform Configuration Tool</p>
    </div>
</body>
</html>`;
    }

    async sendSessionFiles(sessionId, sessionData, recipient = null) {
        try {
            const emailRecipient = recipient || process.env.EMAIL_RECIPIENT;
            if (!emailRecipient) {
                throw new Error('No email recipient configured');
            }

            console.log(`📧 Preparing to send session files for session: ${sessionId}`);

            // Create a temporary zip file with all session files
            const zipPath = await this.createSessionZip(sessionId, sessionData);

            // Create email with session details
            const subject = `ST Configurator Session: ${sessionId}`;
            const html = this.createSessionEmailTemplate(sessionId, sessionData);

            // Prepare attachment
            const attachments = [{
                filename: `session_${sessionId}.zip`,
                path: zipPath,
                contentType: 'application/zip'
            }];

            // Send email with zip attachment
            const result = await this.sendEmail(emailRecipient, subject, html, null, attachments);

            // Clean up temporary zip file
            try {
                await fs.unlink(zipPath);
                console.log(`🧹 Cleaned up temporary zip file: ${zipPath}`);
            } catch (cleanupError) {
                console.warn('Failed to clean up temporary zip file:', cleanupError);
            }

            console.log(`✅ Session files sent successfully to: ${emailRecipient}`);
            return result;

        } catch (error) {
            console.error('Error sending session files:', error);
            throw error;
        }
    }

    async createSessionZip(sessionId, sessionData) {
        return new Promise(async (resolve, reject) => {
            try {
                const sessionsDir = process.env.SESSIONS_DIR || './sessions';
                const sessionDir = path.join(sessionsDir, sessionId);
                const tempDir = process.env.TEMP_DIR || './temp';
                
                // Ensure temp directory exists
                try {
                    await fs.mkdir(tempDir, { recursive: true });
                } catch (error) {
                    // Directory might already exist
                }

                const zipPath = path.join(tempDir, `session_${sessionId}.zip`);
                const output = require('fs').createWriteStream(zipPath);
                const archive = archiver('zip', { zlib: { level: 9 } });

                output.on('close', () => {
                    console.log(`📦 Session zip created: ${zipPath} (${archive.pointer()} bytes)`);
                    resolve(zipPath);
                });

                archive.on('error', (error) => {
                    console.error('Archive error:', error);
                    reject(error);
                });

                archive.pipe(output);

                // Add session.json file
                const sessionJsonPath = path.join(sessionDir, 'session.json');
                try {
                    await fs.access(sessionJsonPath);
                    archive.file(sessionJsonPath, { name: 'session.json' });
                    console.log('📄 Added session.json to zip');
                } catch (error) {
                    console.warn('session.json not found, creating from data');
                    archive.append(JSON.stringify(sessionData, null, 2), { name: 'session.json' });
                }

                // Add all layer files from the session directory
                try {
                    const sessionFiles = await fs.readdir(sessionDir);
                    for (const file of sessionFiles) {
                        const filePath = path.join(sessionDir, file);
                        const stat = await fs.stat(filePath);
                        
                        if (stat.isFile()) {
                            archive.file(filePath, { name: file });
                            console.log(`📄 Added ${file} to zip`);
                        }
                    }
                } catch (error) {
                    console.warn('Error reading session directory:', error);
                }

                // Also add any processed images from the processed directory
                const processedDir = process.env.PROCESSED_DIR || './processed';
                try {
                    const processedFiles = await fs.readdir(processedDir);
                    for (const file of processedFiles) {
                        // Check if file name contains session ID (common naming pattern)
                        if (file.includes(sessionId)) {
                            const filePath = path.join(processedDir, file);
                            const stat = await fs.stat(filePath);
                            
                            if (stat.isFile()) {
                                archive.file(filePath, { name: `processed/${file}` });
                                console.log(`🖼️ Added processed image ${file} to zip`);
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Error reading processed directory:', error);
                }

                // Add upload directory files related to this session
                const uploadDir = process.env.UPLOAD_DIR || './uploads';
                try {
                    const uploadFiles = await fs.readdir(uploadDir);
                    for (const file of uploadFiles) {
                        // Check if file name contains session ID
                        if (file.includes(sessionId)) {
                            const filePath = path.join(uploadDir, file);
                            const stat = await fs.stat(filePath);
                            
                            if (stat.isFile()) {
                                archive.file(filePath, { name: `uploads/${file}` });
                                console.log(`📤 Added uploaded file ${file} to zip`);
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Error reading upload directory:', error);
                }

                await archive.finalize();

            } catch (error) {
                console.error('Error creating session zip:', error);
                reject(error);
            }
        });
    }

    createSessionEmailTemplate(sessionId, sessionData) {
        const layerCount = sessionData?.layers?.length || 0;
        const timestamp = new Date().toISOString();
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ST Configurator Session: ${sessionId}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
        .session-details { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .layer-list { background: white; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .layer-item { padding: 8px; margin: 5px 0; background: #f5f5f5; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 ST Configurator Session</h1>
        <p>Session ID: ${sessionId}</p>
    </div>
    <div class="content">
        <p>A new session has been submitted with all configuration files and assets.</p>
        
        <div class="session-details">
            <h3>📊 Session Details</h3>
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <p><strong>Total Layers:</strong> ${layerCount}</p>
        </div>

        ${layerCount > 0 ? `
        <div class="layer-list">
            <h3>📋 Layers in This Session</h3>
            ${sessionData.layers.map(layer => `
                <div class="layer-item">
                    <strong>${layer.name || 'Unnamed Layer'}</strong> - ${layer.type || 'unknown'} layer
                    ${layer.properties ? `<br><small>Position: (${layer.properties.x || 0}, ${layer.properties.y || 0}), Scale: ${layer.properties.scale || 1}</small>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="info-box">
            <h3>📦 Attached Files</h3>
            <p>This email includes a ZIP file containing:</p>
            <ul>
                <li>Session configuration (session.json)</li>
                <li>All layer images and assets</li>
                <li>Original uploaded files</li>
                <li>Processed/converted images</li>
                <li>Any additional session-related files</li>
            </ul>
        </div>

        <div class="info-box">
            <h3>🔗 Session Access</h3>
            <p>This session can be accessed online at:</p>
            <p><strong>${process.env.SERVER_PROTOCOL || 'http'}://${process.env.SERVER_HOST || 'localhost'}:${process.env.PORT}/${sessionId}</strong></p>
        </div>
    </div>
    <div class="footer">
        <p>Generated by ST Configurator - 3D Uniform Configuration Tool</p>
        <p>Timestamp: ${timestamp}</p>
    </div>
</body>
</html>`;
    }
}

module.exports = EmailService;