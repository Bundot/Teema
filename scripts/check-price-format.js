#!/usr/bin/env node
// Check database schema and current price format
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node scripts/check-price-format.js

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON environment variables');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function checkPriceFormat() {
  console.log('=== CHECKING PRICE FORMAT ===');
  
  try {
    // Get a few sample products to check price format
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price')
      .limit(10);
    
    if (error) {
      console.error('Error fetching products:', error);
      return;
    }
    
    console.log('\nSample products and their price values:');
    console.log('ID\t\t\tName\t\t\tPrice (raw)\tPrice (as number)');
    console.log(''.padEnd(80, '-'));
    
    products.forEach(product => {
      const priceType = typeof product.price;
      const priceValue = product.price;
      const priceAsNumber = Number(product.price);
      const isInteger = Number.isInteger(priceAsNumber);
      
      console.log(`${product.id.substring(0, 8)}...\t${product.name.substring(0, 15)}\t${priceValue}\t\t${priceAsNumber} (${priceType}, integer: ${isInteger})`);
    });
    
    // Get price statistics
    const { data: allProducts } = await supabase
      .from('products')
      .select('price');
    
    if (allProducts && allProducts.length > 0) {
      const prices = allProducts.map(p => Number(p.price));
      const integers = prices.filter(p => Number.isInteger(p));
      const decimals = prices.filter(p => !Number.isInteger(p));
      
      console.log('\n=== PRICE ANALYSIS ===');
      console.log(`Total products: ${allProducts.length}`);
      console.log(`Integer prices: ${integers.length}`);
      console.log(`Decimal prices: ${decimals.length}`);
      console.log(`Min price: ${Math.min(...prices)}`);
      console.log(`Max price: ${Math.max(...prices)}`);
      console.log(`Sample decimal prices: ${decimals.slice(0, 5).join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPriceFormat();
