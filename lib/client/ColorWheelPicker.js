export class ColorWheelPicker {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        this.radius = Math.min(canvas.width, canvas.height) / 2 - 5;
        
        this.currentHue = 0;
        this.currentSaturation = 1;
        this.currentBrightness = 1;
        
        this.onColorChange = options.onColorChange || null;
        this.onColorChangeComplete = options.onColorChangeComplete || null;
        this.handleElement = options.handleElement || null;
        this.brightnessSlider = options.brightnessSlider || null;
        this.brightnessHandle = options.brightnessHandle || null;
        
        this.isDragging = false;
        this.isDraggingBrightness = false;
        
        this.init();
    }
    
    init() {
        this.drawColorWheel();
        this.setupEventListeners();
        this.updateHandlePosition();
        this.updateBrightnessSlider();
    }
    
    drawColorWheel() {
        const ctx = this.ctx;
        const centerX = this.centerX;
        const centerY = this.centerY;
        const radius = this.radius;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create the wheel using ImageData for better performance and accuracy
        const imageData = ctx.createImageData(this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        for (let x = 0; x < this.canvas.width; x++) {
            for (let y = 0; y < this.canvas.height; y++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= radius) {
                    const angle = Math.atan2(dy, dx);
                    const hue = (angle * 180 / Math.PI + 360) % 360;
                    const saturation = Math.min(distance / radius, 1);
                    
                    const rgb = this.hslToRgb(hue / 360, saturation, 0.5);
                    const pixelIndex = (y * this.canvas.width + x) * 4;
                    
                    data[pixelIndex] = rgb.r;     // Red
                    data[pixelIndex + 1] = rgb.g; // Green
                    data[pixelIndex + 2] = rgb.b; // Blue
                    data[pixelIndex + 3] = 255;   // Alpha
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    setupEventListeners() {
        const picker = this.canvas.parentElement;
        
        // Color wheel events
        const handleMouseDown = (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.handleInteraction(e);
        };
        
        const handleMouseMove = (e) => {
            if (!this.isDragging && !this.isDraggingBrightness) return;
            e.preventDefault();
            if (this.isDragging) {
                this.handleInteraction(e);
            } else if (this.isDraggingBrightness) {
                this.handleBrightnessInteraction(e);
            }
        };
        
        const handleMouseUp = (e) => {
            e.preventDefault();
            this.isDragging = false;
            this.isDraggingBrightness = false;
        };
        
        // Mouse events for color wheel
        picker.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Brightness slider events
        if (this.brightnessSlider) {
            const handleBrightnessMouseDown = (e) => {
                e.preventDefault();
                this.isDraggingBrightness = true;
                this.handleBrightnessInteraction(e);
            };
            
            this.brightnessSlider.addEventListener('mousedown', handleBrightnessMouseDown);
        }
        
        // Touch events
        picker.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.handleInteraction(e.touches[0]);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.isDragging && !this.isDraggingBrightness) return;
            e.preventDefault();
            if (this.isDragging) {
                this.handleInteraction(e.touches[0]);
            } else if (this.isDraggingBrightness) {
                this.handleBrightnessInteraction(e.touches[0]);
            }
        });
        
        document.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isDragging = false;
            this.isDraggingBrightness = false;
        });
        
        if (this.brightnessSlider) {
            this.brightnessSlider.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isDraggingBrightness = true;
                this.handleBrightnessInteraction(e.touches[0]);
            });
        }
    }
    
    handleInteraction(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - this.centerX;
        const y = e.clientY - rect.top - this.centerY;
        
        const distance = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(y, x) * 180 / Math.PI;
        
        // Convert angle to 0-360 range
        const hue = (angle + 360) % 360;
        
        // Calculate saturation based on distance from center
        const maxDistance = this.radius * 0.8;
        const saturation = Math.min(distance / maxDistance, 1);
        
        // Only update if clicking within the wheel area
        if (distance <= this.radius) {
            this.currentHue = hue;
            this.currentSaturation = saturation;
            this.updateHandlePosition();
            
            if (this.onColorChange) {
                this.onColorChange(this.getCurrentColor());
            }
        }
    }
    
    handleBrightnessInteraction(e) {
        if (!this.brightnessSlider) return;
        
        const rect = this.brightnessSlider.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        
        // Invert Y coordinate (top = 1, bottom = 0)
        this.currentBrightness = Math.max(0, Math.min(1, 1 - (y / height)));
        
        this.updateBrightnessSlider();
        
        if (this.onColorChange) {
            this.onColorChange(this.getCurrentColor());
        }
    }
    
    updateHandlePosition() {
        if (!this.handleElement) return;
        
        const angle = this.currentHue * Math.PI / 180;
        const distance = this.currentSaturation * this.radius;
        
        const x = Math.cos(angle) * distance + this.centerX;
        const y = Math.sin(angle) * distance + this.centerY;
        
        this.handleElement.style.left = x + 'px';
        this.handleElement.style.top = y + 'px';
    }
    
    updateBrightnessSlider() {
        if (!this.brightnessHandle) return;
        
        const position = (1 - this.currentBrightness) * 100; // Invert for top-to-bottom
        this.brightnessHandle.style.top = position + '%';
    }
    
    getCurrentColor() {
        return `hsl(${this.currentHue}, ${this.currentSaturation * 100}%, ${this.currentBrightness * 100}%)`;
    }
    
    getCurrentHexColor() {
        const rgb = this.hsvToRgb(this.currentHue / 360, this.currentSaturation, this.currentBrightness);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    setColor(color) {
        // Parse color and update wheel
        const rgb = this.parseColor(color);
        if (rgb) {
            const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
            this.currentHue = hsv.h * 360;
            this.currentSaturation = hsv.s;
            // Ensure minimum brightness for visibility (if color is black, set to 50%)
            this.currentBrightness = hsv.v === 0 ? 0.5 : hsv.v;

            this.updateHandlePosition();
            this.updateBrightnessSlider();
        }
    }
    
    parseColor(color) {
        // Simple hex color parser
        const hex = color.replace('#', '');
        if (hex.length === 6) {
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16)
            };
        }
        return null;
    }
    
    hslToRgb(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h < 1/6) {
            r = c; g = x; b = 0;
        } else if (h < 2/6) {
            r = x; g = c; b = 0;
        } else if (h < 3/6) {
            r = 0; g = c; b = x;
        } else if (h < 4/6) {
            r = 0; g = x; b = c;
        } else if (h < 5/6) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (diff !== 0) {
            s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
            
            switch (max) {
                case r:
                    h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / diff + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / diff + 4) / 6;
                    break;
            }
        }
        
        return { h, s, l };
    }
    
    rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    // HSV conversion functions
    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = v - c;
        
        let r = 0, g = 0, b = 0;
        
        if (h < 1/6) {
            r = c; g = x; b = 0;
        } else if (h < 2/6) {
            r = x; g = c; b = 0;
        } else if (h < 3/6) {
            r = 0; g = c; b = x;
        } else if (h < 4/6) {
            r = 0; g = x; b = c;
        } else if (h < 5/6) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0, s = 0, v = max;
        
        if (diff !== 0) {
            s = diff / max;
            
            switch (max) {
                case r:
                    h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / diff + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / diff + 4) / 6;
                    break;
            }
        }
        
        return { h, s, v };
    }
    
    destroy() {
        // Clean up event listeners if needed
        this.onColorChange = null;
        this.handleElement = null;
        this.brightnessSlider = null;
        this.brightnessHandle = null;
    }
}