/**
 * Debug RLS Issues - Run this in browser console on admin page
 */

console.log('🔍 Debugging RLS Policies...');

// Test direct Supabase operations
async function testDirectSupabaseOperations() {
    const SUPABASE_URL = 'https://qnuznpihinvgzomddivo.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTc3NjYsImV4cCI6MjA4ODk3Mzc2Nn0.G9mYzgm5upwntLJW0sj-Uh3a2hTM-HbC1D4td0dgR8Y';
    
    const { createClient } = supabase;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    
    console.log('📋 Testing direct Supabase operations...');
    
    try {
        // 1. Test authentication
        console.log('🔐 Testing authentication...');
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            return;
        }
        
        if (!session) {
            console.error('❌ No session found');
            return;
        }
        
        console.log('✅ Session found:', session.user.email);
        console.log('✅ User ID:', session.user.id);
        console.log('✅ User Role:', session.user.role || 'no role');
        
        // 2. Test read operations
        console.log('📖 Testing read operations...');
        const { data: products, error: readError } = await supabase
            .from('products')
            .select('*')
            .limit(5);
            
        if (readError) {
            console.error('❌ Read error:', readError);
        } else {
            console.log('✅ Read successful, found products:', products.length);
        }
        
        // 3. Test update operation with a specific product
        if (products.length > 0) {
            const testProduct = products[0];
            console.log('📝 Testing update on product:', testProduct.slug || testProduct.id);
            
            const updateData = {
                name: testProduct.name + ' (RLS Test)',
                price: testProduct.price + 50,
                sku: testProduct.sku,
                image_url: testProduct.image_url
            };
            
            console.log('📤 Update payload:', updateData);
            
            const { data: updatedProduct, error: updateError } = await supabase
                .from('products')
                .update(updateData)
                .eq('slug', testProduct.slug || testProduct.id)
                .select();
                
            if (updateError) {
                console.error('❌ Update error:', updateError);
                console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
            } else {
                console.log('✅ Update successful:', updatedProduct);
            }
            
            // 4. Test permissions check
            console.log('🔍 Checking user permissions...');
            const { data: permissions, error: permError } = await supabase
                .rpc('check_user_permissions', { table_name: 'products' });
                
            if (permError) {
                console.log('⚠️ Could not check permissions (function may not exist)');
            } else {
                console.log('✅ User permissions:', permissions);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testDirectSupabaseOperations();
