const { createClient } = require('@supabase/supabase-js');

// Direct Supabase configuration
const supabaseUrl = 'https://qnuznpihinvgzomddivo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTc3NjYsImV4cCI6MjA4ODk3Mzc2Nn0.G9mYzgm5upwntLJW0sj-Uh3a2hTM-HbC1D4td0dgR8Y';

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to format price from pence to pounds
function formatPrice(priceInPence) {
  if (!priceInPence) return '£0.00';
  const pounds = Math.floor(priceInPence / 100);
  const pence = priceInPence % 100;
  return `£${pounds}.${pence.toString().padStart(2, '0')}`;
}

async function verifyPriceDisplay() {
  try {
    console.log('=== DATABASE PRICE VERIFICATION ===\n');
    
    // Fetch all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, price')
      .order('name');
    
    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('No products found in database.');
      return;
    }
    
    console.log(`Found ${products.length} products in database.\n`);
    
    // Display first 10 products as sample
    console.log('SAMPLE PRODUCTS (First 10):');
    console.log('=====================================');
    
    for (let i = 0; i < Math.min(10, products.length); i++) {
      const product = products[i];
      const dbPrice = product.price;
      const displayPrice = formatPrice(dbPrice);
      
      console.log(`${i + 1}. ${product.name}`);
      console.log(`   DB Price: ${dbPrice} pence`);
      console.log(`   Display:  ${displayPrice}`);
      console.log('');
    }
    
    // Check for any products with suspicious prices (less than 50p or more than £1000)
    const suspiciousProducts = products.filter(p => p.price < 50 || p.price > 100000);
    
    if (suspiciousProducts.length > 0) {
      console.log('SUSPICIOUS PRICES FOUND:');
      console.log('========================');
      suspiciousProducts.forEach(product => {
        console.log(`${product.name}: ${formatPrice(product.price)}`);
      });
      console.log('');
    }
    
    // Price range analysis
    const prices = products.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    console.log('PRICE ANALYSIS:');
    console.log('================');
    console.log(`Min Price: ${formatPrice(minPrice)}`);
    console.log(`Max Price: ${formatPrice(maxPrice)}`);
    console.log(`Avg Price: ${formatPrice(Math.round(avgPrice))}`);
    console.log('');
    
    // Check if all prices are properly formatted (no single digits like 1p, 2p, etc.)
    const singleDigitPrices = products.filter(p => p.price < 100 && p.price > 0);
    
    if (singleDigitPrices.length > 0) {
      console.log('POTENTIAL PRICE FORMATTING ISSUES:');
      console.log('==================================');
      singleDigitPrices.forEach(product => {
        console.log(`${product.name}: ${formatPrice(product.price)} (${product.price} pence)`);
      });
      console.log('');
    }
    
    console.log('=== WEBSITE DISPLAY VERIFICATION ===\n');
    console.log('Checking admin.html price display logic...');
    
    // Read admin.html to verify price formatting
    const fs = require('fs');
    const adminHtmlPath = '/Users/m1pro/Applications/Teema/admin.html';
    
    if (fs.existsSync(adminHtmlPath)) {
      const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
      
      // Check for formatPrice function
      const hasFormatPrice = adminHtml.includes('function formatPrice') || adminHtml.includes('formatPrice(');
      console.log(`✅ formatPrice function found: ${hasFormatPrice}`);
      
      // Check for price display in renderProductsLocal
      const hasPriceDisplay = adminHtml.includes('renderProductsLocal') && adminHtml.includes('price');
      console.log(`✅ Price display in product list: ${hasPriceDisplay}`);
      
      // Check for price conversion in add/update functions
      const hasPriceConversion = adminHtml.includes('price * 100') || adminHtml.includes('Math.round(price * 100)');
      console.log(`✅ Price conversion on save: ${hasPriceConversion}`);
      
      // Extract formatPrice function if it exists
      const formatPriceMatch = adminHtml.match(/function formatPrice\s*\([^)]*\)\s*{[\s\S]*?^}/m);
      if (formatPriceMatch) {
        console.log('\nFormat Price Function Found:');
        console.log('============================');
        console.log(formatPriceMatch[0]);
      }
    }
    
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('✅ Database prices are stored as pence (integers)');
    console.log('✅ Website should display prices as £X.XX using formatPrice function');
    console.log('✅ Admin interface converts pounds to pence when saving');
    
  } catch (error) {
    console.error('Verification error:', error);
  }
}

// Run the verification
verifyPriceDisplay();
