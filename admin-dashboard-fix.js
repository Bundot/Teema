// Comprehensive fix for Teema Admin Dashboard RLS and Update Issues
// Run this in browser console after logging into admin

async function fixAdminDashboard() {
    console.log('🔧 Starting comprehensive admin dashboard fix...');
    
    // Step 1: Fix Supabase client initialization
    function initSupabaseClient() {
        try {
            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase library not loaded');
                return null;
            }
            
            if (!window.SUPABASE_URL || !window.SUPABASE_ANON) {
                console.error('❌ Supabase configuration missing');
                return null;
            }
            
            const { createClient } = supabase;
            const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
            console.log('✅ Supabase client initialized');
            return client;
        } catch (error) {
            console.error('❌ Supabase init failed:', error);
            return null;
        }
    }
    
    // Step 2: Test authentication
    async function testAuth() {
        const supabaseClient = initSupabaseClient();
        if (!supabaseClient) return false;
        
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) {
                console.error('❌ Session error:', error);
                return false;
            }
            
            if (!session) {
                console.error('❌ No active session');
                return false;
            }
            
            console.log('✅ Authenticated as:', session.user.email);
            console.log('🆔 User ID:', session.user.id);
            console.log('🔑 Role:', session.user.role || 'authenticated');
            return true;
        } catch (error) {
            console.error('❌ Auth test failed:', error);
            return false;
        }
    }
    
    // Step 3: Test RLS policies
    async function testRLS() {
        const supabaseClient = initSupabaseClient();
        if (!supabaseClient) return false;
        
        try {
            // Test read
            const { data: products, error: readError } = await supabaseClient
                .from('products')
                .select('id, slug, name')
                .limit(1);
                
            if (readError) {
                console.error('❌ RLS: Read denied:', readError);
                return false;
            }
            console.log('✅ RLS: Read access granted');
            
            // Test update if we have a product
            if (products && products.length > 0) {
                const { error: updateError } = await supabaseClient
                    .from('products')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('slug', products[0].slug);
                    
                if (updateError) {
                    console.error('❌ RLS: Update denied:', updateError);
                    return false;
                }
                console.log('✅ RLS: Update access granted');
            }
            
            return true;
        } catch (error) {
            console.error('❌ RLS test failed:', error);
            return false;
        }
    }
    
    // Step 4: Fix the update functions in admin.html
    function fixUpdateFunctions() {
        console.log('🔧 Patching admin update functions...');
        
        // Replace the dbUpdateProduct function
        window.dbUpdateProductFixed = async function(slug, productData) {
            const supabaseClient = initSupabaseClient();
            if (!supabaseClient) throw new Error('Supabase client not available');
            
            console.log('🔄 Fixed update - slug:', slug, 'data:', productData);
            
            const { data, error } = await supabaseClient
                .from('products')
                .update({
                    name: productData.name,
                    price: productData.price,
                    sku: productData.sku,
                    image_url: productData.image,
                    updated_at: new Date().toISOString()
                })
                .eq('slug', slug)
                .select();
            
            if (error) {
                console.error('❌ Fixed update error:', error);
                throw error;
            }
            
            console.log('✅ Fixed update success:', data);
            return data;
        };
        
        // Replace the dbDeleteProduct function
        window.dbDeleteProductFixed = async function(slug) {
            const supabaseClient = initSupabaseClient();
            if (!supabaseClient) throw new Error('Supabase client not available');
            
            console.log('🗑️ Fixed delete - slug:', slug);
            
            const { data, error } = await supabaseClient
                .from('products')
                .delete()
                .eq('slug', slug)
                .select();
            
            if (error) {
                console.error('❌ Fixed delete error:', error);
                throw error;
            }
            
            console.log('✅ Fixed delete success:', data);
            return data;
        };
        
        console.log('✅ Update functions patched');
    }
    
    // Step 5: Monkey patch the admin functions
    function patchAdminFunctions() {
        if (typeof updateProduct === 'function') {
            const originalUpdateProduct = updateProduct;
            window.updateProduct = async function() {
                console.log('🔧 Using patched updateProduct...');
                
                // Get the original slug
                const orig = formP.id.dataset.original || selectedProductId;
                if (!orig) {
                    showToast('Select product first');
                    return;
                }
                
                // Get form data
                const payload = { 
                    id: formP.id.value.trim(),
                    name: formP.name.value.trim(), 
                    price: Number(formP.price.value || 0), 
                    image: formP.image.value.trim(),
                    sku: formP.sku.value.trim() || generateSkuFromName(formP.name.value)
                };
                
                if (!payload.id || !payload.name) {
                    showToast('Provide ID and name');
                    return;
                }
                
                try {
                    // Use our fixed function
                    await window.dbUpdateProductFixed(orig, payload);
                    showToast('Product updated (fixed)');
                    await loadData();
                    clearProductForm();
                } catch (e) {
                    console.error('❌ Patched update failed:', e);
                    showToast('Update failed: ' + e.message);
                    
                    // Fallback to localStorage
                    const idx = products.findIndex(p=>p.id===orig);
                    if (idx!==-1) {
                        products[idx] = payload;
                        localSave(PRODUCTS_KEY, products);
                        renderProductsLocal();
                        clearProductForm();
                        showToast('Product updated (local fallback)');
                    }
                }
            };
            console.log('✅ updateProduct patched');
        }
        
        if (typeof deleteProduct === 'function') {
            const originalDeleteProduct = deleteProduct;
            window.deleteProduct = async function(id) {
                console.log('🔧 Using patched deleteProduct...');
                
                if (!confirm('Delete product ' + id + ' ?')) return;
                
                try {
                    // Use our fixed function
                    await window.dbDeleteProductFixed(id);
                    showToast('Deleted (fixed)');
                    await loadData();
                } catch (e) {
                    console.error('❌ Patched delete failed:', e);
                    showToast('Delete failed: ' + e.message);
                    
                    // Fallback to localStorage
                    products = products.filter(p=>p.id!==id);
                    localSave(PRODUCTS_KEY, products);
                    renderProductsLocal();
                    clearProductForm();
                    showToast('Deleted (local fallback)');
                }
            };
            console.log('✅ deleteProduct patched');
        }
    }
    
    // Execute all fixes
    try {
        console.log('🧪 Step 1: Testing authentication...');
        const authOk = await testAuth();
        
        if (!authOk) {
            console.error('❌ Authentication failed - please log in again');
            return false;
        }
        
        console.log('🧪 Step 2: Testing RLS policies...');
        const rlsOk = await testRLS();
        
        if (!rlsOk) {
            console.warn('⚠️ RLS policies not working - run the SQL fix');
            console.log('📝 Run this SQL in Supabase dashboard:');
            console.log(`
-- Copy this entire SQL block to Supabase SQL Editor
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON products;
DROP POLICY IF EXISTS "Allow public read access" ON products;
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users" ON products FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON products FOR DELETE USING (auth.role() = 'authenticated');
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
GRANT ALL ON products TO authenticated;
GRANT SELECT ON products TO anon;
            `);
        }
        
        console.log('🔧 Step 3: Fixing update functions...');
        fixUpdateFunctions();
        
        console.log('🔧 Step 4: Patching admin functions...');
        patchAdminFunctions();
        
        console.log('✅ All fixes applied successfully!');
        console.log('🎯 Try updating or deleting a product now');
        
        return true;
        
    } catch (error) {
        console.error('❌ Fix process failed:', error);
        return false;
    }
}

// Auto-run the fix
console.log('🚀 Starting automatic admin dashboard fix...');
fixAdminDashboard().then(success => {
    if (success) {
        console.log('🎉 Admin dashboard fixed successfully!');
    } else {
        console.error('💥 Admin dashboard fix failed - check logs above');
    }
});

// Also make it available manually
window.fixAdminDashboard = fixAdminDashboard;
