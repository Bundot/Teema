// Secure Storage Utility with Encryption
// Provides encrypted storage for sensitive data

(function(window) {
    'use strict';
    
    // Simple XOR-based encryption for demo (replace with AES in production)
    class SimpleCrypto {
        constructor(key) {
            this.key = key;
        }
        
        _xor(str, key) {
            let result = '';
            for (let i = 0; i < str.length; i++) {
                result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        }
        
        encrypt(text) {
            if (!text) return '';
            return btoa(this._xor(text, this.key));
        }
        
        decrypt(encryptedText) {
            if (!encryptedText) return '';
            try {
                return this._xor(atob(encryptedText), this.key);
            } catch (e) {
                console.error('Decryption failed:', e);
                return '';
            }
        }
    }
    
    // Generate a device-specific key
    function generateDeviceKey() {
        let key = localStorage.getItem('teema_device_key');
        if (!key) {
            key = 'teema_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('teema_device_key', key);
        }
        return key;
    }
    
    const crypto = new SimpleCrypto(generateDeviceKey());
    
    // Secure storage API
    const SecureStorage = {
        setItem: function(key, value, ttl = null) {
            try {
                const data = {
                    value: value,
                    timestamp: Date.now(),
                    ttl: ttl
                };
                const encrypted = crypto.encrypt(JSON.stringify(data));
                localStorage.setItem(key, encrypted);
                return true;
            } catch (e) {
                console.error('Secure storage set error:', e);
                return false;
            }
        },
        
        getItem: function(key) {
            try {
                const encrypted = localStorage.getItem(key);
                if (!encrypted) return null;
                
                const decrypted = crypto.decrypt(encrypted);
                const data = JSON.parse(decrypted);
                
                // Check TTL
                if (data.ttl && (Date.now() - data.timestamp) > data.ttl) {
                    localStorage.removeItem(key);
                    return null;
                }
                
                return data.value;
            } catch (e) {
                console.error('Secure storage get error:', e);
                // Fallback to plain text for migration
                try {
                    return JSON.parse(localStorage.getItem(key));
                } catch (fallbackError) {
                    return null;
                }
            }
        },
        
        removeItem: function(key) {
            localStorage.removeItem(key);
        },
        
        clear: function() {
            // Only clear Teema-related items
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('teema_')) {
                    localStorage.removeItem(key);
                }
            });
        },
        
        // Utility functions
        setCart: function(cart) {
            return this.setItem('teema_cart_v1', cart, 24 * 60 * 60 * 1000); // 24 hours TTL
        },
        
        getCart: function() {
            return this.getItem('teema_cart_v1') || {};
        },
        
        setSession: function(session) {
            return this.setItem('teema_session', session, 60 * 60 * 1000); // 1 hour TTL
        },
        
        getSession: function() {
            return this.getItem('teema_session');
        }
    };
    
    // Export to global scope
    window.SecureStorage = SecureStorage;
    
    // Log initialization (without sensitive data)
    console.log('✅ Secure storage initialized');
    
})(typeof window !== 'undefined' ? window : global);
