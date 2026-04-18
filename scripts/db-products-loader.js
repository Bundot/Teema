// Database Products Loader
// Optimized for fast loading with caching and performance improvements

(function() {
    'use strict';
    
    // Cache configuration
    const CACHE_KEY = 'teema_products_cache';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    let loadingPromise = null;
    
    // Supabase client initialization
    let supabaseClient = null;
    
    function initSupabase() {
        if (supabaseClient) return supabaseClient;
        
        try {
            // Re-use an already instantiated client if available globally under TEEMA_DB_CLIENT
            if (window.TEEMA_DB_CLIENT) {
                supabaseClient = window.TEEMA_DB_CLIENT;
                return supabaseClient;
            }
            
            // Get the library module
            const SupabaseLib = window.supabase || window.supabaseJs;
            if (!SupabaseLib || !SupabaseLib.createClient) {
                console.warn('Supabase library not available');
                return null;
            }
            
            // Check for configuration either in TEEMA_CONFIG or window global
            const config = window.TEEMA_CONFIG || {};
            const url = config.SUPABASE_URL || window.SUPABASE_URL;
            const anonKey = config.SUPABASE_ANON || window.SUPABASE_ANON;
            
            if (!url || !anonKey) {
                console.warn('Supabase configuration missing');
                return null;
            }
            
            supabaseClient = SupabaseLib.createClient(url, anonKey);
            window.TEEMA_DB_CLIENT = supabaseClient; // cache globally
            return supabaseClient;
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            return null;
        }
    }
    
    // Check if cache is fresh
    function isCacheFresh(cacheData) {
        if (!cacheData || !cacheData.timestamp) return false;
        return (Date.now() - cacheData.timestamp) < CACHE_DURATION;
    }
    
    // Load products from cache using Stale-While-Revalidate
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return { data: null, isFresh: false };
            
            const cacheData = JSON.parse(cached);
            if (!cacheData || !cacheData.products) return { data: null, isFresh: false };
            
            const isFresh = isCacheFresh(cacheData);
            console.log(`Loaded products from local cache (${isFresh ? 'Fresh' : 'Stale'})`);
            return { data: cacheData.products, isFresh: isFresh };
        } catch (error) {
            console.error('Cache loading error:', error);
            return { data: null, isFresh: false };
        }
    }
    
    // Save products to cache
    function saveToCache(products) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                products: products
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Cache saving error:', error);
        }
    }
    
    // Fetch products from database with optimization
    async function fetchFromDatabase() {
        const client = initSupabase();
        if (!client) {
            throw new Error('Database client not available');
        }
        
        console.log('Fetching products from database...');
        const startTime = performance.now();
        
        try {
            // Optimized query - only fetch needed fields
            const { data, error } = await client
                .from('products')
                .select('id, name, price, image_url, sku, active')
                .eq('active', true) // Only fetch active products
                .order('name', { ascending: true })
                .limit(1000); // Increased limit to ensure all products load
            
            if (error) {
                throw error;
            }
            
            const endTime = performance.now();
            console.log(`Database fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
            
            // Transform data for frontend
            const products = (data || []).map(row => ({
                id: row.id,
                name: row.name,
                price: row.price, // Keep as pence for consistency
                image: row.image_url,
                sku: row.sku || generateSKU(row.name, row.id)
            }));
            
            // Cache the results
            saveToCache(products);
            
            return products;
        } catch (error) {
            console.error('Database fetch error:', error);
            throw error;
        }
    }
    
    // Generate SKU from name and ID
    function generateSKU(name, id) {
        const base = (name || '').toString()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .substring(0, 20);
        return `TEEMA-${base}-${(id || '').substring(0, 8).toUpperCase()}`;
    }
    
    // Main loading function with Stale-While-Revalidate pattern
    async function loadProducts(onBackgroundUpdate = null) {
        // Try cache first
        const cacheObj = loadFromCache();
        
        // If we have ANY cached data (even stale), return it instantly
        if (cacheObj.data) {
            // Trigger background revalidation if stale
            if (!cacheObj.isFresh && !loadingPromise) {
                console.log('Cache is stale, revalidating in background...');
                loadingPromise = fetchFromDatabase()
                    .then(newData => {
                        console.log('Background revalidation successful, updating UI');
                        if (typeof onBackgroundUpdate === 'function') {
                            onBackgroundUpdate(newData);
                        }
                    })
                    .catch(err => console.warn('Background revalidation failed:', err))
                    .finally(() => {
                        loadingPromise = null;
                    });
            }
            return cacheObj.data;
        }
        
        // If returning existing promise (we have no cache, but already fetching)
        if (loadingPromise) {
            return loadingPromise;
        }
        
        // Load from database blocking
        loadingPromise = fetchFromDatabase()
            .finally(() => {
                loadingPromise = null;
            });
        
        return loadingPromise;
    }
    
    // Fallback to static JSON if database fails
    async function loadFallbackProducts() {
        try {
            const response = await fetch('assets/products.json');
            if (response.ok) {
                const products = await response.json();
                console.log('Loaded fallback products from JSON');
                return products;
            }
        } catch (error) {
            console.warn('Fallback JSON loading failed:', error);
        }
        
        // Return empty array as last resort
        return [];
    }
    
    // Public API
    window.TeemaProducts = {
        load: async function(onBackgroundUpdate) {
            try {
                return await loadProducts(onBackgroundUpdate);
            } catch (error) {
                console.warn('Database loading failed, using fallback:', error);
                return await loadFallbackProducts();
            }
        },
        
        // Force refresh from database
        refresh: async function() {
            localStorage.removeItem(CACHE_KEY);
            return await loadProducts();
        },
        
        // Clear cache
        clearCache: function() {
            localStorage.removeItem(CACHE_KEY);
        },
        
        // Get cache status
        getCacheStatus: function() {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (!cached) return { valid: false, cached: false };
                
                const cacheData = JSON.parse(cached);
                return {
                    valid: isCacheValid(cacheData),
                    cached: true,
                    timestamp: cacheData.timestamp,
                    age: Date.now() - cacheData.timestamp
                };
            } catch (error) {
                return { valid: false, cached: false, error: error.message };
            }
        }
    };
    
})();
