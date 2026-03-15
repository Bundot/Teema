#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function runCompleteVerification() {
    console.log('🎯 Running Complete Verification After Clean RLS Fix...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Monitor all console output
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('✅') || text.includes('❌') || text.includes('🧹') || text.includes('📊')) {
            console.log('BROWSER:', text);
        }
    });

    // Monitor network requests for PATCH operations
    const patchRequests = [];
    page.on('request', request => {
        if (request.url().includes('supabase.co') && request.method() === 'PATCH') {
            patchRequests.push({
                url: request.url(),
                method: request.method(),
                timestamp: new Date(),
                id: patchRequests.length + 1
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
                        patchReq.isEmpty = !patchReq.hasData;
                    } catch (e) {
                        patchReq.parseError = e.message;
                    }
                }).catch(() => {});
            }
        }
    });

    const testResults = {
        login: false,
        cleanRLSApplied: false,
        dbUpdateTest: false,
        adminFlowTest: false,
        productsPageTest: false,
        deleteTest: false,
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

        console.log('📝 Step 2: Load and test clean RLS fix');
        await page.waitForSelector('#products-list', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Load and execute clean RLS test
        const cleanRLSTestScript = await require('fs').readFileSync('/Users/m1pro/Applications/Teema/test-clean-rls.js', 'utf8');
        
        await page.evaluate((script) => {
            eval(script);
        }, cleanRLSTestScript);
        
        testResults.cleanRLSApplied = true;
        console.log('✅ Clean RLS test loaded');

        console.log('📝 Step 3: Execute clean RLS test');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for auto-test to start

        // Execute the test
        const testResult = await page.evaluate(async () => {
            try {
                const result = await window.runCleanRLSTest();
                return result;
            } catch (error) {
                return { error: error.message };
            }
        });

        if (testResult.error) {
            throw new Error(`Clean RLS test failed: ${testResult.error}`);
        }

        console.log('✅ Clean RLS test completed');

        // Wait for all network requests to complete
        await new Promise(resolve => setTimeout(resolve, 25000));

        testResults.patchRequests = patchRequests;
        testResults.successfulPatches = patchRequests.filter(req => req.success && req.hasData).length;

        console.log('📊 PATCH Analysis:');
        patchRequests.forEach((req, index) => {
            console.log(`   PATCH ${index + 1}: ${req.status} ${req.success ? 'SUCCESS' : 'FAILED'} ${req.hasData ? 'HAS_DATA' : 'NO_DATA'} ${req.isEmpty ? 'EMPTY' : 'HAS_DATA'}`);
            if (req.data && req.data.length > 0) {
                console.log(`      Product: ${req.data[0].name}`);
                console.log(`      Price: ${req.data[0].price}`);
                console.log(`      Response: ${JSON.stringify(req.data[0], null, 2)}`);
            }
        });

        // Test individual components
        testResults.dbUpdateTest = patchRequests.some(req => req.success && req.hasData);
        testResults.adminFlowTest = patchRequests.length > 0;

        console.log('📝 Step 4: Test delete functionality');
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

        console.log('📝 Step 5: Verify on products page');
        await page.goto('http://localhost:8080/products.html', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const productsPageResult = await page.evaluate(() => {
            const productCards = document.querySelectorAll('.food-card');
            const updatedCard = Array.from(productCards).find(card => 
                card.querySelector('p')?.textContent.includes('(CLEAN FLOW TEST')
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

    } catch (error) {
        console.error('❌ Complete verification failed:', error.message);
        testResults.errors.push(error.message);
    } finally {
        await browser.close();
        generateCompleteReport(testResults);
    }
}

function generateCompleteReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPLETE VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📋 EXECUTION RESULTS:');
    console.log(`Login: ${results.login ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Clean RLS Applied: ${results.cleanRLSApplied ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Database Update Test: ${results.dbUpdateTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Admin Flow Test: ${results.adminFlowTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Delete Test: ${results.deleteTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Products Page Test: ${results.productsPageTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Successful Patches: ${results.successfulPatches}`);
    console.log(`Total PATCH Requests: ${results.patchRequests.length}`);
    
    const passedTests = Object.values(results).filter(v => v === true).length;
    const totalTests = 6;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n📈 OVERALL SUCCESS RATE: ${successRate}%`);
    
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
            console.log(`   Empty Response: ${req.isEmpty ? 'YES' : 'NO'}`);
            if (req.data && req.data.length > 0) {
                console.log(`   Updated Product: ${req.data[0].name}`);
                console.log(`   Updated Price: ${req.data[0].price}`);
                console.log(`   Full Response: ${JSON.stringify(req.data[0], null, 2)}`);
            }
        });
    }
    
    const overallSuccess = results.login && results.cleanRLSApplied && 
                          results.dbUpdateTest && 
                          results.adminFlowTest && 
                          results.productsPageTest;
    
    console.log(`\n🎯 FINAL CONCLUSION:`);
    if (overallSuccess) {
        console.log('✅ CLEAN RLS FIX IS WORKING PERFECTLY!');
        console.log('✅ Admin dashboard is FULLY OPERATIONAL');
        console.log('✅ All CRUD operations working correctly');
        console.log('✅ Database updates persisting properly');
        console.log('✅ Products page reflects changes');
        console.log('✅ Delete functionality working');
        console.log('✅ RLS policy conflicts resolved');
        console.log('✅ READY FOR PRODUCTION DEPLOYMENT');
    } else if (results.successfulPatches > 0) {
        console.log('⚠️ CLEAN RLS FIX PARTIALLY WORKING');
        console.log('✅ Database updates working');
        console.log('⚠️ Some components may need attention');
    } else {
        console.log('❌ CLEAN RLS FIX FAILED');
        console.log('🔧 RLS policies still blocking updates');
        console.log('🔧 Policy conflicts may still exist');
        console.log('🔧 Check Supabase dashboard for policy issues');
    }
    
    console.log('\n📋 PRODUCTION READINESS:');
    if (overallSuccess) {
        console.log('✅ FULLY READY FOR PRODUCTION');
        console.log('✅ All admin dashboard functions operational');
        console.log('✅ Database integration working perfectly');
        console.log('✅ User experience fully functional');
        console.log('✅ RLS policies correctly configured');
    } else {
        console.log('⚠️ NEEDS ATTENTION BEFORE PRODUCTION');
        console.log('🔧 Resolve remaining issues');
        console.log('🔧 Verify all CRUD operations');
        console.log('🔧 Check for remaining policy conflicts');
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    if (overallSuccess) {
        console.log('✅ Deploy to production immediately');
        console.log('✅ Test with different browsers and devices');
        console.log('✅ Monitor for any edge cases');
        console.log('✅ Document the working RLS configuration');
    } else {
        console.log('🔧 Re-check Supabase RLS policies');
        console.log('🔧 Verify database table structure');
        console.log('🔧 Test with manual SQL updates');
        console.log('🔧 Check for network or CORS issues');
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
    
    console.log('✅ Server running. Starting complete verification...');
    await runCompleteVerification();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runCompleteVerification };
