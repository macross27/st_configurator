const crypto = require('crypto');

/**
 * Secure File Validator - Magic Byte and Content Verification
 * Addresses CRITICAL vulnerability: Missing magic byte verification
 */
class FileValidator {
    constructor() {
        // Magic bytes for supported image formats
        this.magicBytes = {
            // JPEG formats
            'image/jpeg': [
                [0xFF, 0xD8, 0xFF],  // Standard JPEG
                [0xFF, 0xD8, 0xFF, 0xE0], // JFIF JPEG
                [0xFF, 0xD8, 0xFF, 0xE1], // EXIF JPEG
            ],

            // PNG format
            'image/png': [
                [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG signature
            ],

            // WebP format
            'image/webp': [
                [0x52, 0x49, 0x46, 0x46] // RIFF (need to check WEBP at offset 8)
            ],

            // GIF formats
            'image/gif': [
                [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
                [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
            ]
        };

        // Dangerous file signatures to block
        this.dangerousSignatures = [
            // Executables
            [0x4D, 0x5A], // PE/EXE
            [0x5A, 0x4D], // Alternative PE
            [0x7F, 0x45, 0x4C, 0x46], // ELF

            // Scripts
            [0x23, 0x21], // Shebang (#!)
            [0x3C, 0x3F, 0x70, 0x68, 0x70], // <?php
            [0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // <script

            // Archives (could contain malicious files)
            [0x50, 0x4B, 0x03, 0x04], // ZIP
            [0x50, 0x4B, 0x05, 0x06], // ZIP (empty)
            [0x50, 0x4B, 0x07, 0x08], // ZIP (spanned)
            [0x52, 0x61, 0x72, 0x21], // RAR
            [0x37, 0x7A, 0xBC, 0xAF], // 7-Zip

            // Office documents (could contain macros)
            [0xD0, 0xCF, 0x11, 0xE0], // MS Office (old format)
            [0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00], // DOCX/XLSX
        ];

        // Suspicious patterns in file content
        this.suspiciousPatterns = [
            // HTML/JavaScript injection patterns
            /<script[\s\S]*?>/i,
            /<iframe[\s\S]*?>/i,
            /javascript:/i,
            /vbscript:/i,
            /onload\s*=/i,
            /onerror\s*=/i,
            /eval\s*\(/i,

            // PHP injection patterns
            /<\?php/i,
            /<\?=/i,
            /exec\s*\(/i,
            /system\s*\(/i,
            /shell_exec\s*\(/i,

            // File inclusion patterns
            /\.\.\/+/g, // Path traversal
            /\0/g,      // Null bytes
        ];
    }

    /**
     * Comprehensive file validation
     * @param {Object} file - Multer file object with buffer
     * @returns {Object} - Validation result
     */
    validateFile(file) {
        const results = {
            isValid: false,
            mimeTypeValid: false,
            magicByteValid: false,
            contentSafe: false,
            errors: [],
            warnings: [],
            fileInfo: {
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                detectedType: null
            }
        };

        try {
            // 1. Basic file checks
            if (!file || !file.buffer || file.buffer.length === 0) {
                results.errors.push('File is empty or invalid');
                return results;
            }

            if (file.size > 50 * 1024 * 1024) { // 50MB absolute limit
                results.errors.push('File size exceeds absolute limit of 50MB');
                return results;
            }

            // 2. MIME type validation
            results.mimeTypeValid = this.validateMimeType(file.mimetype);
            if (!results.mimeTypeValid) {
                results.errors.push(`Unsupported MIME type: ${file.mimetype}`);
            }

            // 3. Magic byte verification (CRITICAL SECURITY CHECK)
            const magicByteResult = this.verifyMagicBytes(file.buffer, file.mimetype);
            results.magicByteValid = magicByteResult.valid;
            results.fileInfo.detectedType = magicByteResult.detectedType;

            if (!magicByteResult.valid) {
                results.errors.push(magicByteResult.error);
            }

            // 4. Dangerous signature detection
            if (this.containsDangerousSignatures(file.buffer)) {
                results.errors.push('File contains dangerous executable signatures');
            }

            // 5. Content safety scan
            const contentScan = this.scanContent(file.buffer, results.fileInfo);
            results.contentSafe = contentScan.safe;
            if (!contentScan.safe) {
                results.errors.push(...contentScan.threats);
            }
            results.warnings.push(...contentScan.warnings);

            // 6. Filename validation
            const filenameValidation = this.validateFilename(file.originalname);
            if (!filenameValidation.valid) {
                results.errors.push(...filenameValidation.errors);
            }

            // 7. MIME type vs magic byte consistency
            if (results.mimeTypeValid && results.magicByteValid) {
                if (file.mimetype !== magicByteResult.detectedType && magicByteResult.detectedType) {
                    results.warnings.push(
                        `MIME type mismatch: claimed ${file.mimetype}, detected ${magicByteResult.detectedType}`
                    );
                }
            }

            // Final validation
            results.isValid = results.mimeTypeValid &&
                            results.magicByteValid &&
                            results.contentSafe &&
                            results.errors.length === 0;

            return results;

        } catch (error) {
            results.errors.push(`Validation error: ${error.message}`);
            return results;
        }
    }

    /**
     * Verify magic bytes against expected signatures
     * @param {Buffer} buffer - File buffer
     * @param {string} claimedMimeType - Claimed MIME type
     * @returns {Object} - Verification result
     */
    verifyMagicBytes(buffer, claimedMimeType) {
        if (!buffer || buffer.length < 8) {
            return {
                valid: false,
                error: 'File too small for magic byte verification',
                detectedType: null
            };
        }

        // Check against claimed MIME type
        if (this.magicBytes[claimedMimeType]) {
            for (const signature of this.magicBytes[claimedMimeType]) {
                if (this.matchesSignature(buffer, signature, 0)) {
                    // Special case for WebP - need additional verification
                    if (claimedMimeType === 'image/webp') {
                        if (buffer.length >= 12) {
                            const webpCheck = buffer.slice(8, 12);
                            if (webpCheck.toString('ascii') === 'WEBP') {
                                return { valid: true, detectedType: claimedMimeType };
                            }
                        }
                        continue; // RIFF but not WebP
                    }
                    return { valid: true, detectedType: claimedMimeType };
                }
            }
        }

        // If claimed type doesn't match, scan all types to detect actual format
        for (const [mimeType, signatures] of Object.entries(this.magicBytes)) {
            for (const signature of signatures) {
                if (this.matchesSignature(buffer, signature, 0)) {
                    // Special WebP verification
                    if (mimeType === 'image/webp') {
                        if (buffer.length >= 12 && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
                            return {
                                valid: false,
                                error: `Magic bytes indicate ${mimeType}, but MIME type is ${claimedMimeType}`,
                                detectedType: mimeType
                            };
                        }
                        continue;
                    }

                    return {
                        valid: false,
                        error: `Magic bytes indicate ${mimeType}, but MIME type is ${claimedMimeType}`,
                        detectedType: mimeType
                    };
                }
            }
        }

        return {
            valid: false,
            error: 'Unrecognized file format - magic bytes do not match any supported image type',
            detectedType: null
        };
    }

    /**
     * Check if buffer matches signature at offset
     */
    matchesSignature(buffer, signature, offset = 0) {
        if (buffer.length < offset + signature.length) {
            return false;
        }

        for (let i = 0; i < signature.length; i++) {
            if (buffer[offset + i] !== signature[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check for dangerous executable signatures
     */
    containsDangerousSignatures(buffer) {
        for (const signature of this.dangerousSignatures) {
            if (this.matchesSignature(buffer, signature, 0)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Scan file content for suspicious patterns
     */
    scanContent(buffer, fileInfo = {}) {
        const result = {
            safe: true,
            threats: [],
            warnings: []
        };

        try {
            // Convert buffer to string for pattern matching (first 64KB only for performance)
            const textContent = buffer.slice(0, 65536).toString('utf8', 0, Math.min(buffer.length, 65536));

            // Check for suspicious patterns
            for (const pattern of this.suspiciousPatterns) {
                // Skip null byte check for validated image files (binary files naturally contain null bytes)
                if ((pattern.source === '\\0' || pattern.source === '\\\\0') && fileInfo.detectedType && fileInfo.detectedType.startsWith('image/')) {
                    continue;
                }

                if (pattern.test && pattern.test(textContent)) {
                    result.safe = false;
                    result.threats.push(`Suspicious pattern detected: ${pattern.source}`);
                } else if (textContent.match && textContent.match(pattern)) {
                    result.safe = false;
                    result.threats.push(`Suspicious pattern detected: ${pattern.source || pattern}`);
                }
            }

            // Check for high entropy (possible encrypted/compressed payload)
            const entropy = this.calculateEntropy(buffer.slice(0, 1024));
            if (entropy > 7.5) {
                result.warnings.push(`High entropy detected (${entropy.toFixed(2)}) - possible compressed/encrypted content`);
            }

            // Check for embedded files (multiple format signatures)
            let signatureCount = 0;
            for (const signatures of Object.values(this.magicBytes)) {
                for (const signature of signatures) {
                    let offset = 0;
                    while (offset < buffer.length - signature.length) {
                        if (this.matchesSignature(buffer, signature, offset)) {
                            signatureCount++;
                            break;
                        }
                        offset += 512; // Check every 512 bytes
                    }
                }
            }

            if (signatureCount > 1) {
                result.warnings.push('Multiple file format signatures detected - possible embedded files');
            }

        } catch (error) {
            result.warnings.push(`Content scan error: ${error.message}`);
        }

        return result;
    }

    /**
     * Calculate Shannon entropy
     */
    calculateEntropy(buffer) {
        const freq = new Array(256).fill(0);

        for (let i = 0; i < buffer.length; i++) {
            freq[buffer[i]]++;
        }

        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (freq[i] > 0) {
                const p = freq[i] / buffer.length;
                entropy -= p * Math.log2(p);
            }
        }

        return entropy;
    }

    /**
     * Validate MIME type
     */
    validateMimeType(mimeType) {
        const supportedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ];

        return supportedTypes.includes(mimeType);
    }

    /**
     * Validate filename for security
     */
    validateFilename(filename) {
        const result = {
            valid: true,
            errors: []
        };

        if (!filename || typeof filename !== 'string') {
            result.valid = false;
            result.errors.push('Invalid filename');
            return result;
        }

        // Check for path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            result.valid = false;
            result.errors.push('Filename contains path traversal characters');
        }

        // Check for null bytes
        if (filename.includes('\0')) {
            result.valid = false;
            result.errors.push('Filename contains null bytes');
        }

        // Check for executable extensions
        const dangerousExtensions = [
            '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
            '.js', '.vbs', '.jar', '.php', '.asp', '.jsp',
            '.sh', '.pl', '.py', '.rb'
        ];

        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (dangerousExtensions.includes(ext)) {
            result.valid = false;
            result.errors.push(`Dangerous file extension: ${ext}`);
        }

        // Length check
        if (filename.length > 255) {
            result.valid = false;
            result.errors.push('Filename too long (max 255 characters)');
        }

        return result;
    }

    /**
     * Generate file hash for integrity verification
     */
    generateFileHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Quick validation for known good files (performance optimization)
     */
    quickValidate(file) {
        // Basic checks only - use for trusted sources
        if (!file || !file.buffer || file.buffer.length === 0) {
            return false;
        }

        if (!this.validateMimeType(file.mimetype)) {
            return false;
        }

        // Quick magic byte check
        const magicResult = this.verifyMagicBytes(file.buffer, file.mimetype);
        return magicResult.valid;
    }
}

module.exports = FileValidator;