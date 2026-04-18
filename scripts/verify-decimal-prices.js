const { createClient } = require('@supabase/supabase-js');

// Direct Supabase configuration
const supabaseUrl = 'https://qnuznpihinvgzomddivo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTc3NjYsImV4cCI6MjA4ODk3Mzc2Nn0.G9mYzgm5upwntLJW0sj-Uh3a2hTM-HbC1D4td0dgR8Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDecimalPrices() {
  try {
    console.log('=== VERIFYING DECIMAL PRICES IN DATABASE ===\n');
    
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
    
    // Display first 15 products as sample
    console.log('SAMPLE PRODUCTS (First 15):');
    console.log('=====================================');
    
    for (let i = 0; i < Math.min(15, products.length); i++) {
      const product = products[i];
      const price = product.price;
      const priceType = typeof price;
      const isDecimal = priceType === 'number' && price % 1 !== 0;
      
      console.log(`${i + 1}. ${product.name}`);
      console.log(`   Price: ${price}`);
      console.log(`   Type: ${priceType}`);
      console.log(`   Is decimal: ${isDecimal}`);
      console.log('');
    }
    
    // Analyze price types
    const integerPrices = products.filter(p => Number.isInteger(p.price));
    const decimalPrices = products.filter(p => !Number.isInteger(p.price));
    
    console.log('PRICE ANALYSIS:');
    console.log('================');
    console.log(`Integer prices: ${integerPrices.length}`);
    console.log(`Decimal prices: ${decimalPrices.length}`);
    console.log(`Total products: ${products.length}`);
    console.log('');
    
    // Show some decimal price examples
    if (decimalPrices.length > 0) {
      console.log('DECIMAL PRICE EXAMPLES:');
      console.log('=======================');
      decimalPrices.slice(0, 10).forEach(product => {
        console.log(`${product.name}: ${product.price}`);
      });
      console.log('');
    }
    
    // Show some integer price examples
    if (integerPrices.length > 0) {
      console.log('INTEGER PRICE EXAMPLES:');
      console.log('======================');
      integerPrices.slice(0, 10).forEach(product => {
        console.log(`${product.name}: ${product.price}`);
      });
      console.log('');
    }
    
    // Price range analysis
    const prices = products.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    console.log('PRICE RANGE:');
    console.log('============');
    console.log(`Min Price: ${minPrice}`);
    console.log(`Max Price: ${maxPrice}`);
    console.log(`Avg Price: ${avgPrice.toFixed(2)}`);
    console.log('');
    
    console.log('=== VERIFICATION COMPLETE ===');
    console.log(`Database now contains ${decimalPrices.length} decimal prices and ${integerPrices.length} integer prices`);
    
  } catch (error) {
    console.error('Verification error:', error);
  }
}

// Run the verification
verifyDecimalPrices();
