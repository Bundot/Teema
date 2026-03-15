// Security Validation Utility
// Provides input validation and sanitization functions

(function(window) {
    'use strict';
    
    // Security validation class
    const SecurityValidator = {
        // Email validation
        isValidEmail: function(email) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return emailRegex.test(email);
        },
        
        // Product name validation
        isValidProductName: function(name) {
            if (!name || typeof name !== 'string') return false;
            const trimmed = name.trim();
            return trimmed.length >= 2 && trimmed.length <= 100 && /^[a-zA-Z0-9\s\-&(),.'"]+$/.test(trimmed);
        },
        
        // Price validation
        isValidPrice: function(price) {
            const numPrice = Number(price);
            return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 999999;
        },
        
        // SKU validation
        isValidSKU: function(sku) {
            if (!sku || typeof sku !== 'string') return true; // SKU is optional
            const trimmed = sku.trim();
            return trimmed.length <= 50 && /^[a-zA-Z0-9\-_]+$/.test(trimmed);
        },
        
        // Product ID validation
        isValidProductId: function(id) {
            if (!id || typeof id !== 'string') return false;
            const trimmed = id.trim();
            return trimmed.length >= 1 && trimmed.length <= 50 && /^[a-zA-Z0-9\-_]+$/.test(trimmed);
        },
        
        // Sanitize HTML content
        sanitizeHTML: function(str) {
            if (!str || typeof str !== 'string') return '';
            
            // Basic HTML sanitization
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },
        
        // Escape HTML entities
        escapeHTML: function(str) {
            if (!str || typeof str !== 'string') return '';
            
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '/': '&#x2F;'
            };
            
            return str.replace(/[&<>"'/]/g, char => map[char]);
        },
        
        // Validate product object
        validateProduct: function(product) {
            const errors = [];
            
            if (!this.isValidProductId(product.id)) {
                errors.push('Invalid product ID');
            }
            
            if (!this.isValidProductName(product.name)) {
                errors.push('Invalid product name');
            }
            
            if (!this.isValidPrice(product.price)) {
                errors.push('Invalid price');
            }
            
            if (!this.isValidSKU(product.sku)) {
                errors.push('Invalid SKU');
            }
            
            // Image URL validation (basic)
            if (product.image && typeof product.image === 'string') {
                const trimmed = product.image.trim();
                if (trimmed.length > 500) {
                    errors.push('Image URL too long');
                }
                // Allow data URLs and HTTP/HTTPS URLs
                if (!trimmed.startsWith('data:') && !trimmed.startsWith('http')) {
                    errors.push('Invalid image URL format');
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors: errors
            };
        },
        
        // CSRF token generation (simple implementation)
        generateCSRFToken: function() {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        },
        
        // Rate limiting check
        checkRateLimit: function(action, maxAttempts = 5, windowMs = 60000) {
            const key = `rate_limit_${action}`;
            const now = Date.now();
            
            try {
                const data = JSON.parse(localStorage.getItem(key) || '{"attempts": 0, "resetTime": now}');
                
                if (now > data.resetTime) {
                    // Reset window
                    data.attempts = 0;
                    data.resetTime = now + windowMs;
                }
                
                if (data.attempts >= maxAttempts) {
                    return false; // Rate limited
                }
                
                data.attempts++;
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.error('Rate limiting error:', e);
                return true; // Allow on error
            }
        },
        
        // Input sanitization for different types
        sanitizeInput: function(input, type) {
            if (!input || typeof input !== 'string') return '';
            
            const trimmed = input.trim();
            
            switch (type) {
                case 'text':
                    return this.escapeHTML(trimmed);
                case 'number':
                    return trimmed.replace(/[^0-9.]/g, '');
                case 'alphanumeric':
                    return trimmed.replace(/[^a-zA-Z0-9]/g, '');
                case 'filename':
                    return trimmed.replace(/[^a-zA-Z0-9.\-_]/g, '');
                default:
                    return this.escapeHTML(trimmed);
            }
        }
    };
    
    // Export to global scope
    window.SecurityValidator = SecurityValidator;
    
    // Log initialization
    console.log('✅ Security validator initialized');
    
})(typeof window !== 'undefined' ? window : global);
