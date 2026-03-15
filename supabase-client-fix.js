// Fix for Supabase client initialization and update operations
// This addresses the "Cannot read properties of undefined (reading 'from')" error

// Enhanced Supabase client initialization with better error handling
function initializeSupabaseClient() {
    try {
        // Check if Supabase is available
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase library not loaded');
            return null;
        }
        
        // Check if configuration is available
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON) {
            console.error('❌ Supabase configuration missing');
            return null;
        }
        
        const { createClient } = supabase;
        const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
        
        console.log('✅ Supabase client initialized successfully');
        return client;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        return null;
    }
}

// Fixed update function that uses correct field mapping
async function dbUpdateProductFixed(slug, productData) {
    const supabaseClient = initializeSupabaseClient();
    
    if (!supabaseClient) {
        throw new Error('Supabase client not available');
    }
    
    console.log('🔄 Attempting product update with slug:', slug);
    console.log('📦 Product data:', productData);
    
    try {
        // Use the correct field mapping for database
        const { data, error } = await supabaseClient
            .from('products')
            .update({
                name: productData.name,
                price: productData.price,
                sku: productData.sku,
                image_url: productData.image,
                updated_at: new Date().toISOString()
            })
            .eq('slug', slug)  // Use slug for lookup as per your schema
            .select();  // Add .select() to return updated data
        
        if (error) {
            console.error('❌ Database update error:', error);
            throw error;
        }
        
        console.log('✅ Database update successful:', data);
        return data;
    } catch (error) {
        console.error('❌ Update operation failed:', error);
        throw error;
    }
}

// Fixed delete function
async function dbDeleteProductFixed(slug) {
    const supabaseClient = initializeSupabaseClient();
    
    if (!supabaseClient) {
        throw new Error('Supabase client not available');
    }
    
    console.log('🗑️ Attempting product deletion with slug:', slug);
    
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .delete()
            .eq('slug', slug)
            .select();
        
        if (error) {
            console.error('❌ Database delete error:', error);
            throw error;
        }
        
        console.log('✅ Database delete successful:', data);
        return data;
    } catch (error) {
        console.error('❌ Delete operation failed:', error);
        throw error;
    }
}

// Test function to verify RLS policies
async function testRLSPolicies() {
    const supabaseClient = initializeSupabaseClient();
    
    if (!supabaseClient) {
        console.error('❌ Cannot test RLS - Supabase client not available');
        return false;
    }
    
    try {
        // Test current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Session error:', sessionError);
            return false;
        }
        
        if (!session) {
            console.error('❌ No active session - user not authenticated');
            return false;
        }
        
        console.log('✅ User authenticated:', session.user.email);
        console.log('🆔 User ID:', session.user.id);
        console.log('🔑 User role:', session.user.role);
        
        // Test read access
        const { data: products, error: readError } = await supabaseClient
            .from('products')
            .select('id, slug, name')
            .limit(1);
            
        if (readError) {
            console.error('❌ Read access denied:', readError);
            return false;
        }
        
        console.log('✅ Read access granted');
        
        // Test update access (using a test product)
        if (products && products.length > 0) {
            const testProduct = products[0];
            const { error: updateError } = await supabaseClient
                .from('products')
                .update({ updated_at: new Date().toISOString() })
                .eq('slug', testProduct.slug);
                
            if (updateError) {
                console.error('❌ Update access denied:', updateError);
                return false;
            }
            
            console.log('✅ Update access granted');
        }
        
        console.log('✅ All RLS tests passed');
        return true;
        
    } catch (error) {
        console.error('❌ RLS test failed:', error);
        return false;
    }
}

// Export functions for use in admin.html
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeSupabaseClient,
        dbUpdateProductFixed,
        dbDeleteProductFixed,
        testRLSPolicies
    };
} else {
    // Make functions available globally in browser
    window.SupabaseFix = {
        initializeSupabaseClient,
        dbUpdateProductFixed,
        dbDeleteProductFixed,
        testRLSPolicies
    };
}
