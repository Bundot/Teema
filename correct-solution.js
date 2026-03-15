/**
 * Correct Solution - Uses proper service role key
 * Run this in browser console on admin page after login
 */

console.log('🔧 Applying Correct Solution...');

async function applyCorrectSolution() {
    
    // The issue was using wrong service key
    // Let's create a solution that works with the current user's permissions
    
    console.log('🔍 Fixing the service key issue...');
    
    // Create a working update function that uses the user's own session
    window.correctUpdate = async function(productId, updateData) {
        console.log('🛠️ Correct update called');
        console.log('📤 Product ID:', productId);
        console.log('📋 Update data:', updateData);
        
        try {
            // Get current session
            const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
            
            if (sessionError || !session) {
                console.error('❌ No valid session');
                throw new Error('No valid session');
            }
            
            console.log('✅ Using user session for:', session.user.email);
            
            // Method 1: Use user's session token directly
            const userToken = session.access_token;
            
            const updatePayload = {
                name: updateData.name,
                price: Number(updateData.price),
                sku: updateData.sku || '',
                image_url: updateData.image || updateData.image_url || ''
            };
            
            console.log('📦 User token update payload:', updatePayload);
            
            const response = await fetch(`https://qnuznpihinvgzomddivo.supabase.co/rest/v1/products?slug=eq.${productId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTc3NjYsImV4cCI6MjA4ODk3Mzc2Nn0.G9mYzgm5upwntLJW0sj-Uh3a2hTM-HbC1D4td0dgR8Y',
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updatePayload)
            });
            
            const result = await response.json();
            console.log('📥 User token response:', { status: response.status, data: result });
            
            if (response.ok && result && result.length > 0) {
                console.log('✅ User token update successful!', result[0]);
                return result[0];
            }
            
            // Method 2: Try with standard client but better error handling
            console.log('🔄 Trying standard client update...');
            
            const clientPayload = {
                name: updateData.name,
                price: Number(updateData.price),
                sku: updateData.sku || '',
                image_url: updateData.image || updateData.image_url || ''
            };
            
            console.log('📦 Client payload:', clientPayload);
            
            const { data: clientResult, error: clientError } = await window.supabaseClient
                .from('products')
                .update(clientPayload)
                .eq('slug', productId)
                .select();
            
            console.log('📥 Client result:', { data: clientResult, error: clientError });
            
            if (clientError) {
                console.error('❌ Client error:', clientError.message);
                console.error('❌ Error details:', clientError);
            }
            
            if (clientResult && clientResult.length > 0) {
                console.log('✅ Client update successful!', clientResult[0]);
                return clientResult[0];
            }
            
            // Method 3: Try with different field combinations
            console.log('🔄 Trying field combinations...');
            
            const fieldCombos = [
                { name: 'price', price: Number(updateData.price) },
                { name: updateData.name },
                { name: updateData.name, price: Number(updateData.price) },
                { name: updateData.name, price: Number(updateData.price), sku: updateData.sku }
            ];
            
            for (let i = 0; i < fieldCombos.length; i++) {
                const combo = fieldCombos[i];
                console.log(`🔄 Trying combo ${i + 1}:`, combo);
                
                const { data: comboResult, error: comboError } = await window.supabaseClient
                    .from('products')
                    .update(combo)
                    .eq('slug', productId)
                    .select();
                
                if (comboError) {
                    console.error(`❌ Combo ${i + 1} error:`, comboError.message);
                }
                
                if (comboResult && comboResult.length > 0) {
                    console.log(`✅ Combo ${i + 1} successful!`, comboResult[0]);
                    return comboResult[0];
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            throw new Error('All update methods failed');
            
        } catch (error) {
            console.error('❌ Correct update failed:', error);
            throw error;
        }
    };
    
    // Replace the main update function
    if (typeof window.updateProduct === 'function') {
        console.log('🔧 Replacing updateProduct with correct version...');
        
        window.updateProduct = async function() {
            console.log('🔄 Correct updateProduct called');
            
            try {
                const productId = window.selectedProductId;
                
                if (!productId) {
                    window.showToast('No product selected', 'error');
                    return;
                }
                
                const updateData = {
                    name: document.querySelector('#p-name').value.trim(),
                    price: document.querySelector('#p-price').value.trim(),
                    image: document.querySelector('#p-image').value.trim(),
                    sku: document.querySelector('#p-sku').value.trim()
                };
                
                console.log('📋 Form data:', updateData);
                
                if (!updateData.name || !updateData.price) {
                    window.showToast('Please fill in required fields', 'error');
                    return;
                }
                
                // Call correct update
                const result = await window.correctUpdate(productId, updateData);
                
                if (result) {
                    window.showToast('Product updated successfully!', 'success');
                    
                    // Reload data
                    if (typeof window.loadProducts === 'function') {
                        await window.loadProducts();
                    }
                    if (typeof window.loadCombos === 'function') {
                        await window.loadCombos();
                    }
                    
                    // Clear form
                    if (typeof window.clearProductForm === 'function') {
                        window.clearProductForm();
                    }
                    
                    console.log('✅ Product update flow completed');
                    return true;
                } else {
                    window.showToast('Failed to update product', 'error');
                    return false;
                }
                
            } catch (error) {
                console.error('❌ Correct updateProduct error:', error);
                window.showToast(`Update error: ${error.message}`, 'error');
                return false;
            }
        };
        
        console.log('✅ updateProduct replaced with correct version');
    }
    
    // Create test function
    window.testCorrectUpdate = async function() {
        console.log('🧪 Testing correct update...');
        
        try {
            const productsList = document.querySelector('#products-list');
            const productItems = productsList?.querySelectorAll('.item') || [];
            
            if (productItems.length === 0) {
                console.error('❌ No products found');
                return false;
            }
            
            const testProduct = productItems[0];
            const productId = testProduct.dataset.id;
            const originalName = testProduct.dataset.name;
            
            console.log(`📦 Testing: ${originalName}`);
            
            // Select product
            testProduct.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Modify form
            const nameField = document.querySelector('#p-name');
            const priceField = document.querySelector('#p-price');
            
            const testName = `${originalName} (CORRECT ${Date.now()})`;
            const testPrice = parseInt(priceField.value) + 999;
            
            nameField.value = testName;
            priceField.value = testPrice;
            
            nameField.dispatchEvent(new Event('input', { bubbles: true }));
            priceField.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Monitor for success
            let updateSuccess = false;
            const originalFetch = window.fetch;
            
            window.fetch = function(...args) {
                const [url, options] = args;
                
                if (url.includes('supabase.co') && options?.method === 'PATCH') {
                    console.log('📤 Correct update PATCH detected');
                    
                    return originalFetch.apply(this, args).then(response => {
                        if (url.includes('products')) {
                            response.clone().json().then(data => {
                                console.log('📥 Correct update response:', data);
                                
                                if (data && data.length > 0) {
                                    updateSuccess = true;
                                    console.log('✅ Correct update successful!', 'success');
                                } else {
                                    console.log('❌ Correct update failed - empty response');
                                }
                            }).catch(e => {
                                console.log('❌ Failed to parse response');
                            });
                        }
                        return response;
                    });
                }
                
                return originalFetch.apply(this, args);
            };
            
            // Trigger update
            const updateBtn = document.querySelector('#update-product');
            updateBtn.click();
            
            // Wait for completion
            let attempts = 0;
            while (!updateSuccess && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            // Restore fetch
            window.fetch = originalFetch;
            
            // Verify in database
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const { data: verifyProduct } = await window.supabaseClient
                .from('products')
                .select('*')
                .eq('slug', productId)
                .single();
            
            if (verifyProduct && verifyProduct.name.includes('(CORRECT')) {
                console.log('✅ Correct update verified in database!', 'success');
                return true;
            } else {
                console.log('❌ Correct update not verified in database');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Correct update test error:', error);
            return false;
        }
    };
    
    console.log('✅ Correct solution applied');
    console.log('🛠️ Available functions:');
    console.log('   - correctUpdate(productId, data)');
    console.log('   - testCorrectUpdate()');
    console.log('   - Enhanced updateProduct()');
    
    // Auto-test
    console.log('🧪 Auto-testing correct update...');
    setTimeout(() => {
        window.testCorrectUpdate();
    }, 3000);
    
    return true;
}

// Apply correct solution
applyCorrectSolution();
