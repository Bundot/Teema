#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function verifyCorrectSolution() {
    console.log('🔍 Verifying Correct Solution...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Monitor all console output
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('✅') || text.includes('❌') || text.includes('🔍') || text.includes('🛠️')) {
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
        solutionApplied: false,
        patchRequests: [],
        successfulPatches: 0,
        databaseVerified: false,
        productsPageVerified: false,
        errors: []
    };

    try {
        console.log('📝 Step 1: Login and navigate to admin');
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

        console.log('📝 Step 2: Apply correct solution');
        await page.waitForSelector('#products-list', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Load and execute correct solution
        const correctSolutionScript = await require('fs').readFileSync('/Users/m1pro/Applications/Teema/correct-solution.js', 'utf8');
        
        await page.evaluate((script) => {
            eval(script);
        }, correctSolutionScript);
        
        testResults.solutionApplied = true;
        console.log('✅ Correct solution applied');

        console.log('📝 Step 3: Test the correct solution');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for auto-test

        // Execute the test
        const testResult = await page.evaluate(async () => {
            try {
                const result = await window.testCorrectUpdate();
                return result;
            } catch (error) {
                return { error: error.message };
            }
        });

        if (testResult.error) {
            throw new Error(`Test execution failed: ${testResult.error}`);
        }

        console.log('✅ Correct solution test completed');

        // Wait for all PATCH requests to complete
        await new Promise(resolve => setTimeout(resolve, 15000));

        testResults.patchRequests = patchRequests;
        testResults.successfulPatches = patchRequests.filter(req => req.success && req.hasData).length;

        console.log('📊 PATCH Analysis:');
        patchRequests.forEach((req, index) => {
            console.log(`   PATCH ${index + 1}: ${req.status} ${req.success ? 'SUCCESS' : 'FAILED'} ${req.hasData ? 'HAS_DATA' : 'NO_DATA'}`);
            if (req.data) {
                console.log(`      Response: ${JSON.stringify(req.data)}`);
            }
        });

        console.log('📝 Step 4: Verify in database');
        const dbVerifyResult = await page.evaluate(async () => {
            try {
                // Get the test product
                const productsList = document.querySelector('#products-list');
                const productItems = productsList?.querySelectorAll('.item') || [];
                
                if (productItems.length > 0) {
                    return { error: 'No products found' };
                }
                
                const testProduct = productItems[0];
                const productId = testProduct.dataset.id;
                
                // Check if it was updated in database
                const { data: verifyProduct, error } = await window.supabaseClient
                    .from('products')
                    .select('*')
                    .eq('slug', productId)
                    .single();
                
                if (error) {
                    return { error: error.message };
                }
                
                const wasUpdated = verifyProduct && verifyProduct.name.includes('(CORRECT');
                
                return {
                    wasUpdated,
                    productName: verifyProduct?.name,
                    productId: productId
                };
                
            } catch (error) {
                return { error: error.message };
            }
        });

        if (dbVerifyResult.error) {
            console.log('❌ Database verification error:', dbVerifyResult.error);
        } else {
            testResults.databaseVerified = dbVerifyResult.wasUpdated;
            console.log(`✅ Database verification: ${dbVerifyResult.wasUpdated ? 'SUCCESS' : 'FAILED'}`);
            if (dbVerifyResult.productName) {
                console.log(`📦 Product in database: ${dbVerifyResult.productName}`);
            }
        }

        console.log('📝 Step 5: Verify on products page');
        await page.goto('http://localhost:8080/products.html', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const productsPageResult = await page.evaluate(() => {
            const productCards = document.querySelectorAll('.food-card');
            const updatedCard = Array.from(productCards).find(card => 
                card.querySelector('p')?.textContent.includes('(CORRECT')
            );
            
            return {
                totalCards: productCards.length,
                foundUpdatedCard: !!updatedCard,
                updatedCardText: updatedCard ? updatedCard.querySelector('p')?.textContent : null
            };
        });

        testResults.productsPageVerified = productsPageResult.foundUpdatedCard;
        console.log(`✅ Products page verification: ${productsPageResult.foundUpdatedCard ? 'SUCCESS' : 'FAILED'}`);
        if (productsPageResult.updatedCardText) {
            console.log(`📦 Updated product on page: ${productsPageResult.updatedCardText}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        testResults.errors.push(error.message);
    } finally {
        await browser.close();
        generateFinalReport(testResults);
    }
}

function generateFinalReport(results) {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 CORRECT SOLUTION VERIFICATION REPORT');
    console.log('='.repeat(70));
    
    console.log('\n📋 EXECUTION RESULTS:');
    console.log(`Login: ${results.login ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Solution Applied: ${results.solutionApplied ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`PATCH Requests: ${results.patchRequests.length}`);
    console.log(`Successful Patches: ${results.successfulPatches}`);
    console.log(`Database Verified: ${results.databaseVerified ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Products Page Verified: ${results.productsPageVerified ? '✅ SUCCESS' : '❌ FAILED'}`);
    
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
            }
        });
    }
    
    const overallSuccess = results.login && results.solutionApplied && 
                          results.successfulPatches > 0 && 
                          results.databaseVerified && 
                          results.productsPageVerified;
    
    console.log(`\n📈 OVERALL SUCCESS: ${overallSuccess ? '✅ YES' : '❌ NO'}`);
    
    if (results.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    console.log('\n🎯 FINAL CONCLUSION:');
    if (overallSuccess) {
        console.log('✅ CORRECT SOLUTION IS WORKING!');
        console.log('✅ Admin dashboard edit/update functions are FULLY OPERATIONAL');
        console.log('✅ Database updates are working correctly');
        console.log('✅ Changes are reflected on products page');
        console.log('✅ READY FOR PRODUCTION DEPLOYMENT');
    } else {
        console.log('⚠️ SOLUTION APPLIED BUT ISSUES REMAIN');
        if (!results.successfulPatches) {
            console.log('❌ PATCH requests are not successful');
            console.log('🔧 Check RLS policies in Supabase');
        }
        if (!results.databaseVerified) {
            console.log('❌ Updates not persisting in database');
            console.log('🔧 Check database permissions');
        }
        if (!results.productsPageVerified) {
            console.log('❌ Updates not showing on products page');
            console.log('🔧 Check page refresh logic');
        }
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    if (overallSuccess) {
        console.log('✅ Deploy to production');
        console.log('✅ Test with different browsers');
        console.log('✅ Monitor for any edge cases');
    } else {
        console.log('🔧 Check Supabase dashboard for RLS policy issues');
        console.log('🔧 Verify database table structure matches frontend expectations');
        console.log('🔧 Test with manual SQL updates in Supabase');
        console.log('🔧 Check network restrictions or CORS issues');
    }
    
    console.log('\n' + '='.repeat(70));
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
    
    console.log('✅ Server running. Verifying correct solution...');
    await verifyCorrectSolution();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { verifyCorrectSolution };
