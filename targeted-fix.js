/**
 * Targeted Fix for Supabase Update Issue
 * Run this in browser console on admin page after login
 */

console.log('🔧 Applying Targeted Fix...');

async function applyTargetedFix() {
    
    // Fix 1: Patch dbUpdateProduct with better error handling and field mapping
    if (typeof window.dbUpdateProduct === 'function') {
        console.log('🔧 Fixing dbUpdateProduct function...');
        
        const originalDbUpdateProduct = window.dbUpdateProduct;
        
        window.dbUpdateProduct = async function(slug, p) {
            console.log('🔧 Enhanced dbUpdateProduct called');
            console.log('📤 Input slug:', slug);
            console.log('📤 Input product:', p);
            
            try {
                // Ensure we have proper field mapping
                const updateData = {
                    name: p.name,
                    price: Number(p.price), // Ensure number
                    sku: p.sku || '',
                    image_url: p.image || p.image_url || ''
                };
                
                console.log('📤 Mapped update data:', updateData);
                
                // Use the correct identifier - try both slug and id
                let result;
                
                // First try with slug
                const { data: result1, error: error1 } = await window.supabaseClient
                    .from('products')
                    .update(updateData)
                    .eq('slug', slug)
                    .select();
                
                console.log('📥 Slug-based result:', { data: result1, error: error1 });
                
                if (error1 || !result1 || result1.length === 0) {
                    console.log('🔄 Slug update failed, trying with id...');
                    
                    // Try with id field
                    const { data: result2, error: error2 } = await window.supabaseClient
                        .from('products')
                        .update(updateData)
                        .eq('id', slug)
                        .select();
                    
                    console.log('📥 ID-based result:', { data: result2, error: error2 });
                    
                    if (error2) {
                        console.error('❌ Both update methods failed');
                        console.error('Slug error:', error1);
                        console.error('ID error:', error2);
                        throw error2;
                    }
                    
                    result = result2;
                } else {
                    result = result1;
                }
                
                if (result && result.length > 0) {
                    console.log('✅ Update successful:', result[0]);
                    return result[0];
                } else {
                    console.error('❌ Update returned empty result');
                    throw new Error('Update returned empty result');
                }
                
            } catch (error) {
                console.error('❌ Enhanced dbUpdateProduct error:', error);
                throw error;
            }
        };
        
        console.log('✅ dbUpdateProduct patched');
    }
    
    // Fix 2: Patch updateProduct to ensure proper data preparation
    if (typeof window.updateProduct === 'function') {
        console.log('🔧 Fixing updateProduct function...');
        
        const originalUpdateProduct = window.updateProduct;
        
        window.updateProduct = async function() {
            console.log('🔧 Enhanced updateProduct called');
            
            try {
                // Get form data with better validation
                const form = document.querySelector('#product-form');
                const formData = new FormData(form);
                
                // Build product object with proper field validation
                const product = {
                    id: document.querySelector('#p-id').dataset.original,
                    name: document.querySelector('#p-name').value.trim(),
                    price: document.querySelector('#p-price').value.trim(),
                    image: document.querySelector('#p-image').value.trim(),
                    sku: document.querySelector('#p-sku').value.trim()
                };
                
                console.log('📋 Enhanced form data:', product);
                
                // Validate required fields
                if (!product.name || !product.price) {
                    window.showToast('Please fill in all required fields', 'error');
                    return;
                }
                
                // Ensure price is a number
                const numericPrice = parseFloat(product.price);
                if (isNaN(numericPrice) || numericPrice <= 0) {
                    window.showToast('Please enter a valid price', 'error');
                    return;
                }
                
                product.price = numericPrice;
                
                console.log('📤 Validated product data:', product);
                
                // Call the enhanced dbUpdateProduct
                const result = await window.dbUpdateProduct(product.id, product);
                
                if (result) {
                    console.log('✅ Product updated successfully');
                    window.showToast('Product updated successfully!', 'success');
                    
                    // Reload data
                    await loadProducts();
                    await loadCombos();
                    
                    // Clear form
                    clearProductForm();
                } else {
                    console.error('❌ Update failed - no result returned');
                    window.showToast('Failed to update product', 'error');
                }
                
            } catch (error) {
                console.error('❌ Enhanced updateProduct error:', error);
                window.showToast(`Error updating product: ${error.message}`, 'error');
            }
        };
        
        console.log('✅ updateProduct patched');
    }
    
    // Fix 3: Add direct Supabase test function
    window.testDirectUpdate = async function() {
        console.log('🧪 Testing direct Supabase update...');
        
        try {
            // Get a sample product
            const { data: products, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .limit(1);
                
            if (error || !products || products.length === 0) {
                console.error('❌ Cannot get sample product:', error);
                return;
            }
            
            const sample = products[0];
            console.log('📦 Sample product:', sample);
            
            // Test with minimal data
            const minimalUpdate = {
                name: sample.name + ' (DIRECT TEST)'
            };
            
            console.log('📤 Testing minimal update:', minimalUpdate);
            
            // Try different approaches
            const approaches = [
                { method: 'slug', value: sample.slug },
                { method: 'id', value: sample.id }
            ];
            
            for (let i = 0; i < approaches.length; i++) {
                const approach = approaches[i];
                console.log(`🔄 Testing approach ${i + 1}: ${approach.method}`);
                
                const { data: result, error: updateError } = await window.supabaseClient
                    .from('products')
                    .update(minimalUpdate)
                    .eq(approach.method, approach.value)
                    .select();
                
                console.log(`📥 Approach ${i + 1} result:`, { data: result, error: updateError });
                
                if (updateError) {
                    console.error(`❌ Approach ${i + 1} error:`, updateError.message);
                }
                
                if (result && result.length > 0) {
                    console.log(`✅ Approach ${i + 1} successful!`, result[0]);
                    return result[0];
                }
                
                // Wait between attempts
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.error('❌ All approaches failed');
            
        } catch (error) {
            console.error('❌ Direct test error:', error);
        }
    };
    
    // Fix 4: Add RLS policy checker
    window.checkRLSPolicies = async function() {
        console.log('🔍 Checking RLS policies...');
        
        try {
            // Test if we can read our own updates
            const { data: testProduct, error: readError } = await window.supabaseClient
                .from('products')
                .select('*')
                .limit(1);
                
            if (readError) {
                console.error('❌ Read error (RLS issue):', readError);
                return false;
            }
            
            if (testProduct && testProduct.length > 0) {
                console.log('✅ Read permissions OK');
                
                // Test if we can update
                const updateTest = { name: testProduct[0].name + ' (RLS TEST)' };
                
                const { data: updateResult, error: updateError } = await window.supabaseClient
                    .from('products')
                    .update(updateTest)
                    .eq('slug', testProduct[0].slug)
                    .select();
                
                if (updateError) {
                    console.error('❌ Update error (RLS issue):', updateError);
                    console.error('Error details:', {
                        message: updateError.message,
                        details: updateError.details,
                        hint: updateError.hint,
                        code: updateError.code
                    });
                    return false;
                }
                
                if (updateResult && updateResult.length > 0) {
                    console.log('✅ Update permissions OK');
                    return true;
                } else {
                    console.error('❌ Update returned empty (RLS issue)');
                    return false;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ RLS check error:', error);
            return false;
        }
    };
    
    console.log('✅ All targeted fixes applied');
    console.log('🧪 Available test functions:');
    console.log('   - testDirectUpdate()');
    console.log('   - checkRLSPolicies()');
    
    // Auto-test RLS policies
    console.log('🔍 Auto-checking RLS policies...');
    await window.checkRLSPolicies();
}

// Apply fixes
applyTargetedFix();
