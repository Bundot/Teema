#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function executeFinalSolution() {
    console.log('🎯 Executing Final Solution...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Monitor all console output
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('✅') || text.includes('❌') || text.includes('🎯') || text.includes('🛠️')) {
            console.log('BROWSER:', text);
        }
    });

    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
        if (request.url().includes('supabase.co') && request.method() === 'PATCH') {
            networkRequests.push({
                url: request.url(),
                method: request.method(),
                timestamp: new Date()
            });
        }
    });

    page.on('response', response => {
        if (response.url().includes('supabase.co') && networkRequests.length > 0) {
            const lastRequest = networkRequests[networkRequests.length - 1];
            if (response.url() === lastRequest.url) {
                lastRequest.status = response.status();
                lastRequest.success = response.status() === 200;
                
                response.text().then(body => {
                    try {
                        lastRequest.data = JSON.parse(body);
                        lastRequest.hasData = lastRequest.data && lastRequest.data.length > 0;
                    } catch (e) {
                        lastRequest.parseError = e.message;
                    }
                }).catch(() => {});
            }
        }
    });

    const testResults = {
        login: false,
        solutionApplied: false,
        updateAttempted: false,
        updateSuccessful: false,
        networkRequests: [],
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

        console.log('📝 Step 2: Apply final solution');
        await page.waitForSelector('#products-list', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Load and execute final solution
        const finalSolutionScript = await require('fs').readFileSync('/Users/m1pro/Applications/Teema/final-solution.js', 'utf8');
        
        await page.evaluate((script) => {
            eval(script);
        }, finalSolutionScript);
        
        testResults.solutionApplied = true;
        console.log('✅ Final solution applied');

        console.log('📝 Step 3: Test the solution');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for auto-test

        // Execute the test
        const testResult = await page.evaluate(async () => {
            try {
                const result = await window.testWorkingUpdate();
                return result;
            } catch (error) {
                return { error: error.message };
            }
        });

        if (testResult.error) {
            throw new Error(`Test execution failed: ${testResult.error}`);
        }

        testResults.updateAttempted = true;
        console.log('✅ Update test attempted');

        // Wait for network requests to complete
        await new Promise(resolve => setTimeout(resolve, 10000));

        testResults.networkRequests = networkRequests;
        testResults.updateSuccessful = networkRequests.some(req => req.success && req.hasData);

        console.log('📊 Network Analysis:');
        networkRequests.forEach((req, index) => {
            console.log(`   ${index + 1}. ${req.method} ${req.status} ${req.success ? 'SUCCESS' : 'FAILED'} ${req.hasData ? 'HAS_DATA' : 'NO_DATA'}`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        testResults.errors.push(error.message);
    } finally {
        await browser.close();
        generateFinalReport(testResults);
    }
}

function generateFinalReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL SOLUTION EXECUTION REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📋 EXECUTION RESULTS:');
    console.log(`Login: ${results.login ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Solution Applied: ${results.solutionApplied ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Update Attempted: ${results.updateAttempted ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Update Successful: ${results.updateSuccessful ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    console.log('\n🌐 NETWORK ANALYSIS:');
    if (results.networkRequests.length > 0) {
        results.networkRequests.forEach((req, index) => {
            console.log(`Request ${index + 1}:`);
            console.log(`   Method: ${req.method}`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Success: ${req.success ? 'YES' : 'NO'}`);
            console.log(`   Has Data: ${req.hasData ? 'YES' : 'NO'}`);
            if (req.data) {
                console.log(`   Response: ${JSON.stringify(req.data)}`);
            }
            if (req.parseError) {
                console.log(`   Parse Error: ${req.parseError}`);
            }
        });
    } else {
        console.log('No network requests captured');
    }
    
    const successRate = results.updateSuccessful ? 100 : 0;
    
    console.log(`\n📈 SUCCESS RATE: ${successRate}%`);
    
    if (results.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (results.login && results.solutionApplied && results.updateSuccessful) {
        console.log('✅ FINAL SOLUTION WORKING!');
        console.log('✅ Admin dashboard edit/update functions are operational');
        console.log('✅ Ready for production deployment');
    } else if (results.login && results.solutionApplied) {
        console.log('⚠️ SOLUTION APPLIED BUT UPDATES FAILING');
        console.log('🔧 Check Supabase RLS policies manually');
        console.log('🔧 Verify database table structure');
    } else {
        console.log('❌ SOLUTION EXECUTION FAILED');
        console.log('🔧 Check browser console for detailed errors');
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (results.updateSuccessful) {
        console.log('✅ Test manual editing in admin dashboard');
        console.log('✅ Verify changes on products page');
        console.log('✅ Deploy to production');
    } else {
        console.log('🔧 Check network requests in browser dev tools');
        console.log('🔧 Verify Supabase service key permissions');
        console.log('🔧 Test with different Supabase client configuration');
    }
    
    console.log('\n' + '='.repeat(60));
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
    
    console.log('✅ Server running. Executing final solution...');
    await executeFinalSolution();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeFinalSolution };
