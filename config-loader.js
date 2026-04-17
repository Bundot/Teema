// Secure Configuration Loader
// Loads configuration from environment variables with fallbacks

(function(window) {
    'use strict';
    
    // Configuration object with defaults
    const config = {
        SUPABASE_URL: 'https://qnuznpihinvgzomddivo.supabase.co',
        SUPABASE_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTc3NjYsImV4cCI6MjA4ODk3Mzc2Nn0.G9mYzgm5upwntLJW0sj-Uh3a2hTM-HbC1D4td0dgR8Y',
        SUPABASE_SERVICE_KEY: null,
        NODE_ENV: 'production',
        SESSION_TIMEOUT: 3600,
        ENABLE_CONSOLE_LOGS: true
    };
    
    // Try to load from environment (for development and production hosting)
    if (typeof process !== 'undefined' && process.env) {
        // Node.js environment (build time)
        config.SUPABASE_URL = process.env.SUPABASE_URL || config.SUPABASE_URL;
        config.SUPABASE_ANON = process.env.SUPABASE_ANON || config.SUPABASE_ANON;
        config.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || config.SUPABASE_SERVICE_KEY;
        config.NODE_ENV = process.env.NODE_ENV || config.NODE_ENV;
        config.SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || config.SESSION_TIMEOUT;
        config.ENABLE_CONSOLE_LOGS = process.env.ENABLE_CONSOLE_LOGS === 'true';
        
        // Log environment detection (without sensitive data)
        if (process.env.SUPABASE_URL) {
            console.log('🌍 Environment variables detected from Node.js environment');
        }
    } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // Production browser environment - check if variables were injected during build
        // Vercel injects environment variables as global variables via env-inject.js
        // Use a sufficient delay to ensure env-inject.js has loaded and executed
        const checkInjectedVars = (attempts = 0) => {
            if (typeof window.SUPABASE_URL !== 'undefined' && window.SUPABASE_URL) {
                config.SUPABASE_URL = window.SUPABASE_URL;
                config.SUPABASE_ANON = window.SUPABASE_ANON;
                config.SUPABASE_SERVICE_KEY = window.SUPABASE_SERVICE_KEY || config.SUPABASE_SERVICE_KEY;
                config.NODE_ENV = 'production';
                config.ENABLE_CONSOLE_LOGS = false;
                
                console.log('🌍 Production environment variables detected from build injection');
                
                // Re-validate and update global TEEMA_CONFIG
                const errors = validateConfig();
                if (errors.length === 0 && window.TEEMA_CONFIG) {
                    window.TEEMA_CONFIG.isValid = true;
                    window.TEEMA_CONFIG.errors = [];
                    window.TEEMA_CONFIG.SUPABASE_URL = config.SUPABASE_URL;
                    window.TEEMA_CONFIG.SUPABASE_ANON = config.SUPABASE_ANON;
                    window.TEEMA_CONFIG.SUPABASE_SERVICE_KEY = config.SUPABASE_SERVICE_KEY;
                    window.TEEMA_CONFIG.NODE_ENV = config.NODE_ENV;
                    window.TEEMA_CONFIG.ENABLE_CONSOLE_LOGS = config.ENABLE_CONSOLE_LOGS;
                    
                    console.log('✅ Configuration updated with production values');
                }
            } else if (attempts < 10) {
                // Retry every 100ms for up to 1 second
                setTimeout(() => checkInjectedVars(attempts + 1), 100);
            }
        };
        
        checkInjectedVars();
    }
    
    // Try to load from window config (fallback for browser environment)
    if (window.SUPABASE_URL && window.SUPABASE_ANON) {
        config.SUPABASE_URL = window.SUPABASE_URL;
        config.SUPABASE_ANON = window.SUPABASE_ANON;
        config.SUPABASE_SERVICE_KEY = window.SUPABASE_SERVICE_KEY || config.SUPABASE_SERVICE_KEY;
    }
    
    // Validate required configuration
    function validateConfig() {
        const errors = [];
        
        if (!config.SUPABASE_URL) {
            errors.push('SUPABASE_URL is required');
        }
        
        if (!config.SUPABASE_ANON) {
            errors.push('SUPABASE_ANON is required');
        }
        
        return errors;
    }
    
    // Initialize configuration (deferred to allow fallback values to load)
    function initializeConfig() {
        // Try to load from window config (fallback for browser environment)
        if (window.SUPABASE_URL && window.SUPABASE_ANON) {
            config.SUPABASE_URL = window.SUPABASE_URL;
            config.SUPABASE_ANON = window.SUPABASE_ANON;
            config.SUPABASE_SERVICE_KEY = window.SUPABASE_SERVICE_KEY || config.SUPABASE_SERVICE_KEY;
        }
        
        const errors = validateConfig();
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Secure logging function
    function secureLog(level, message, ...args) {
        if (!config.ENABLE_CONSOLE_LOGS && level !== 'error') {
            return;
        }
        
        // Sanitize sensitive information
        const sanitizedMessage = message
            .replace(/eyJ[a-zA-Z0-9._-]+/g, '[TOKEN]')
            .replace(/https:\/\/[a-zA-Z0-9.-]+\.supabase\.co/g, '[SUPABASE_URL]')
            .replace(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
        
        console[level](sanitizedMessage, ...args);
    }
    
    // Export configuration and utilities
    const configResult = initializeConfig();
    
    window.TEEMA_CONFIG = {
        ...config,
        isValid: configResult.isValid,
        errors: configResult.errors,
        log: {
            info: (msg, ...args) => secureLog('info', msg, ...args),
            warn: (msg, ...args) => secureLog('warn', msg, ...args),
            error: (msg, ...args) => secureLog('error', msg, ...args)
        },
        isProduction: config.NODE_ENV === 'production',
        reinit: function() {
            // Re-initialize configuration with updated window variables
            if (window.SUPABASE_URL && window.SUPABASE_ANON) {
                config.SUPABASE_URL = window.SUPABASE_URL;
                config.SUPABASE_ANON = window.SUPABASE_ANON;
                config.SUPABASE_SERVICE_KEY = window.SUPABASE_SERVICE_KEY || config.SUPABASE_SERVICE_KEY;
                const newResult = initializeConfig();
                window.TEEMA_CONFIG = {
                    ...window.TEEMA_CONFIG,
                    ...config,
                    isValid: newResult.isValid,
                    errors: newResult.errors
                };
                if (newResult.isValid) {
                    console.log('✅ Configuration re-initialized with fallback values');
                    window.TEEMA_CONFIG.log.info('🔐 Supabase configured:', !!config.SUPABASE_URL);
                } else {
                    console.error('❌ Re-initialization failed:', newResult.errors);
                }
            }
        }
    };
    
    // Log configuration status (without sensitive data)
    if (window.TEEMA_CONFIG.isValid) {
        window.TEEMA_CONFIG.log.info('✅ Configuration loaded successfully');
        window.TEEMA_CONFIG.log.info('🌐 Environment:', config.NODE_ENV);
        window.TEEMA_CONFIG.log.info('🔐 Supabase configured:', !!config.SUPABASE_URL);
    } else {
        // Only show error if no fallback values are available
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON) {
            console.error('❌ Failed to load configuration:', window.TEEMA_CONFIG.errors);
            console.warn('⚠️ Please set up environment variables');
        } else {
            // Silent mode - fallback values will be loaded shortly
            console.log('⏳ Waiting for fallback configuration...');
        }
    }
    
})(typeof window !== 'undefined' ? window : global);
