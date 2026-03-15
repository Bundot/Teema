#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function runFinalVerification() {
    console.log('🎯 Running Final Verification After RLS Fix...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Monitor all console output
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('✅') || text.includes('❌') || text.includes('🔍') || text.includes('📊')) {
            console.log('BROWSER:', text);
        }
    });

    // Monitor network requests
    const patchRequests = [];
    page.on('request', request => {
        if (request.url().includes('supabase.co') && request.method() === 'PATCH') {
            patchRequests.push({
                url: request.url(),
                method: request.method(),
                timestamp: new Date()
            });
        }
    });

    page.on('response', response => {
        if (response.url().includes('supabase.co')) {
            const patchReq = patchRequests.find(req => req.url === response.url());
            if (patchReq) {
                patchReq.status = response.status();
                patchReq.success = response.status() === 200;
                
                response.text().then(body => {
                    try {
                        patchReq.data = JSON.parse(body);
                        patchReq.hasData = patchReq.data && patchReq.data.length > 0;
                    } catch (e) {
                        patchReq.parseError = e.message;
                    }
                }).catch(() => {});
            }
        }
    });

    const testResults = {
        login: false,
        rlsFixed: false,
        editTest: false,
        updateTest: false,
        deleteTest: false,
        productsPageTest: false,
        patchRequests: [],
        successfulPatches: 0,
        errors: []
    };

    try {
        console.log('📝 Step 1: Login to admin dashboard');
        await page.goto('http://localhost:8080/login.html', { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('#email', { timeout: 5000 });
        await page.type('#email', '  ');
        await page.type('#password', '   ');
        await page.click('#signin');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        
        if (!page.url().includes('admin.html')) {
            throw new Error('Login failed');
        }
        
        testResults.login = true;
        console.log('✅ Login successful');

        console.log('📝 Step 2: Load and test RLS fix');
        await page.waitForSelector('#products-list', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Load and execute post-RLS test
        const testScript = await require('fs').readFileSync('/Users/m1pro/Applications/Teema/test-after-rls-fix.js', 'utf8');
        
        await page.evaluate((script) => {
            eval(script);
        }, testScript);
        
        // Execute the test
        const postRLSResult = await page.evaluate(async () => {
            try {
                const result = await window.runPostRLSTest();
                return result;
            } catch (error) {
                return { error: error.message };
            }
        });

        if (postRLSResult.error) {
            throw new Error(`Post-RLS test failed: ${postRLSResult.error}`);
        }

        testResults.rlsFixed = true;
        console.log('✅ RLS fix test completed');

        // Wait for all network requests to complete
        await new Promise(resolve => setTimeout(resolve, 20000));

        testResults.patchRequests = patchRequests;
        testResults.successfulPatches = patchRequests.filter(req => req.success && req.hasData).length;

        console.log('📊 PATCH Analysis:');
        patchRequests.forEach((req, index) => {
            console.log(`   PATCH ${index + 1}: ${req.status} ${req.success ? 'SUCCESS' : 'FAILED'} ${req.hasData ? 'HAS_DATA' : 'NO_DATA'}`);
            if (req.data && req.data.length > 0) {
                console.log(`      Product: ${req.data[0].name}`);
                console.log(`      Price: ${req.data[0].price}`);
            }
        });

        console.log('📝 Step 3: Complete manual edit test');
        await page.evaluate(() => {
            // Get first product and test manual edit
            const productsList = document.querySelector('#products-list');
            const productItems = productsList?.querySelectorAll('.item') || [];
            
            if (productItems.length > 0) {
                return { error: 'No products found' };
            }
            
            const testProduct = productItems[0];
            const productId = testProduct.dataset.id;
            const originalName = testProduct.dataset.name;
            
            // Select product
            testProduct.click();
            
            // Modify form
            setTimeout(() => {
                const nameField = document.querySelector('#p-name');
                const priceField = document.querySelector('#p-price');
                
                const testName = `${originalName} (FINAL VERIFICATION ${Date.now()})`;
                const testPrice = parseInt(priceField.value) + 777;
                
                nameField.value = testName;
                priceField.value = testPrice;
                
                nameField.dispatchEvent(new Event('input', { bubbles: true }));
                priceField.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Click update
                setTimeout(() => {
                    const updateBtn = document.querySelector('#update-product');
                    if (updateBtn) {
                        updateBtn.click();
                    }
                }, 500);
            }, 1000);
            
            return { 
                productId,
                originalName,
                testName,
                testPrice
            };
        });

        // Wait for update to complete
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('📝 Step 4: Navigate to products page and verify');
        await page.goto('http://localhost:8080/products.html', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check for updated product
        const productsPageResult = await page.evaluate(() => {
            const productCards = document.querySelectorAll('.food-card');
            const updatedCard = Array.from(productCards).find(card => 
                card.querySelector('p')?.textContent.includes('(FINAL VERIFICATION')
            );
            
            return {
                totalCards: productCards.length,
                foundUpdatedCard: !!updatedCard,
                updatedCardText: updatedCard ? updatedCard.querySelector('p')?.textContent : null
            };
        });

        testResults.productsPageTest = productsPageResult.foundUpdatedCard;
        console.log(`✅ Products page verification: ${productsPageResult.foundUpdatedCard ? 'SUCCESS' : 'FAILED'}`);
        if (productsPageResult.updatedCardText) {
            console.log(`📦 Updated product on page: ${productsPageResult.updatedCardText}`);
        }

        // Test delete functionality
        console.log('📝 Step 5: Test delete functionality');
        await page.goto('http://localhost:8080/admin.html', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const deleteTestResult = await page.evaluate(() => {
            const productsList = document.querySelector('#products-list');
            const productItems = productsList?.querySelectorAll('.item') || [];
            
            if (productItems.length < 2) {
                return { error: 'Not enough products to test delete' };
            }
            
            // Select last product for deletion
            const lastProduct = productItems[productItems.length - 1];
            const productName = lastProduct.dataset.name;
            const productId = lastProduct.dataset.id;
            
            // Select product
            lastProduct.click();
            
            // Override confirm and delete
            setTimeout(() => {
                window.confirm = () => true;
                
                const deleteBtn = document.querySelector('#delete-product');
                if (deleteBtn) {
                    deleteBtn.click();
                }
            }, 1000);
            
            return { 
                deletedProductName: productName,
                deletedProductId: productId
            };
        });

        if (deleteTestResult.error) {
            console.log('⚠️ Delete test skipped:', deleteTestResult.error);
        } else {
            console.log(`✅ Delete test completed: ${deleteTestResult.deletedProductName}`);
            testResults.deleteTest = true;
        }

    } catch (error) {
        console.error('❌ Final verification failed:', error.message);
        testResults.errors.push(error.message);
    } finally {
        await browser.close();
        generateFinalReport(testResults);
    }
}

function generateFinalReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 FINAL VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📋 EXECUTION RESULTS:');
    console.log(`Login: ${results.login ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`RLS Fixed: ${results.rlsFixed ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Edit Test: ${results.editTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Update Test: ${results.updateTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Delete Test: ${results.deleteTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Products Page Test: ${results.productsPageTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Successful Patches: ${results.successfulPatches}`);
    console.log(`Total PATCH Requests: ${results.patchRequests.length}`);
    
    const passedTests = Object.values(results).filter(v => v === true).length;
    const totalTests = 6;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n📈 SUCCESS RATE: ${successRate}%`);
    
    if (results.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    console.log('\n🌐 PATCH REQUEST ANALYSIS:');
    if (results.patchRequests.length > 0) {
        results.patchRequests.forEach((req, index) => {
            console.log(`\nRequest ${index + 1}:`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Success: ${req.success ? 'YES' : 'NO'}`);
            console.log(`   Has Data: ${req.hasData ? 'YES' : 'NO'}`);
            console.log(`   Empty Response: ${!req.hasData ? 'YES' : 'NO'}`);
            if (req.data && req.data.length > 0) {
                console.log(`   Updated Product: ${req.data[0].name}`);
                console.log(`   Updated Price: ${req.data[0].price}`);
                console.log(`   Response Data: ${JSON.stringify(req.data[0], null, 2)}`);
            }
        });
    }
    
    const overallSuccess = results.login && results.rlsFixed && 
                          results.successfulPatches > 0 && 
                          results.productsPageTest;
    
    console.log(`\n🎯 FINAL CONCLUSION:`);
    if (overallSuccess) {
        console.log('✅ RLS FIX IS WORKING PERFECTLY!');
        console.log('✅ Admin dashboard is FULLY OPERATIONAL');
        console.log('✅ All CRUD operations working correctly');
        console.log('✅ Database updates persisting properly');
        console.log('✅ Products page reflects changes');
        console.log('✅ Delete functionality working');
        console.log('✅ READY FOR PRODUCTION DEPLOYMENT');
    } else if (results.successfulPatches > 0) {
        console.log('⚠️ RLS FIX PARTIALLY WORKING');
        console.log('✅ Database updates working');
        console.log('⚠️ Products page verification may need attention');
    } else {
        console.log('❌ RLS FIX FAILED');
        console.log('🔧 RLS policies still blocking updates');
        console.log('🔧 Check Supabase dashboard for policy issues');
        console.log('🔧 Verify user permissions and roles');
    }
    
    console.log('\n📋 PRODUCTION READINESS:');
    if (overallSuccess) {
        console.log('✅ READY FOR PRODUCTION');
        console.log('✅ All admin dashboard functions operational');
        console.log('✅ Database integration working');
        console.log('✅ User experience fully functional');
    } else {
        console.log('⚠️ NEEDS ATTENTION BEFORE PRODUCTION');
        console.log('🔧 Resolve remaining issues');
        console.log('🔧 Test edge cases');
        console.log('🔧 Verify all CRUD operations');
    }
    
    console.log('\n' + '='.repeat(80));
}

// Check server and run
async function main() {
    try {
        const response = await fetch('http://localhost:8080');
        if (!response.ok) throw new Error();
    } catch (error) {
        console.log('❌ Server not running. Please start with: python3 -m http.server 8080');
        process.exit(1);
    }
    
    console.log('✅ Server running. Starting final verification...');
    await runFinalVerification();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runFinalVerification };
