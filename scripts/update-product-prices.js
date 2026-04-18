#!/usr/bin/env node
// Update existing product prices to handle decimal values properly
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node scripts/update-product-prices.js

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
const ADMIN_EMAIL = 'isaacdauda12@gmail.com';
const ADMIN_PASSWORD = '@Natan1234';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON environment variables');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Product parsing utilities
function parseProductInfo(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(jpeg|jpg|png|gif|webp)$/i, '');
  
  // Pattern to match price at the end (various formats)
  const pricePatterns = [
    /£\s*(\d+(?:\.\d{1,2})?)\s*$/,  // £8.49, £ 8.49, £8.49
    /\$\s*(\d+(?:\.\d{1,2})?)\s*$/,  // $8.49
    /(\d+(?:\.\d{1,2})?)\s*£\s*$/,  // 8.49£
    /(\d+(?:\.\d{1,2})?)\s*\$$\s*$/, // 8.49$
  ];
  
  let price = null;
  let productName = nameWithoutExt;
  
  // Try each price pattern
  for (const pattern of pricePatterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      price = parseFloat(match[1]);
      // Remove price from product name
      productName = nameWithoutExt.replace(pattern, '').trim();
      break;
    }
  }
  
  // Clean up product name
  productName = productName
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/\s*\.\s*$/, '') // Remove trailing dots
    .trim();
  
  return { name: productName, price };
}

async function authenticateAdmin() {
  console.log('=== AUTHENTICATING ADMIN ===');
  console.log(`Email: ${ADMIN_EMAIL}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (error) {
      console.error('Authentication failed:', error.message);
      return false;
    }
    
    console.log('Successfully authenticated as:', data.user.email);
    console.log('User ID:', data.user.id);
    return true;
  } catch (error) {
    console.error('Authentication error:', error.message);
    return false;
  }
}

async function getAllProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching products:', error.message);
    return [];
  }
}

async function updateProductPrice(productId, newPrice) {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ 
        price: newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select();
    
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error(`Error updating product ${productId}:`, error.message);
    return null;
  }
}

async function updateAllPrices() {
  console.log('=== PRODUCT PRICES UPDATE SCRIPT ===');
  console.log('Converting integer pence values to decimal pound values...\n');
  
  // Step 1: Authenticate
  const isAuthenticated = await authenticateAdmin();
  if (!isAuthenticated) {
    console.error('Authentication failed. Exiting.');
    process.exit(1);
  }
  
  // Step 2: Find TeemaProducts directory
  const teemaProductsDir = path.resolve(__dirname, '..', 'TeemaProducts');
  
  if (!fs.existsSync(teemaProductsDir)) {
    console.error(`TeemaProducts directory not found at: ${teemaProductsDir}`);
    process.exit(1);
  }
  
  console.log(`\n=== SCANNING TeemaProducts DIRECTORY ===`);
  console.log(`Directory: ${teemaProductsDir}`);
  
  const files = fs.readdirSync(teemaProductsDir);
  const imageFiles = files.filter(file => 
    /\.(jpeg|jpg|png|gif|webp)$/i.test(file)
  );
  
  console.log(`Found ${imageFiles.length} image files`);
  
  // Step 3: Parse prices from filenames
  const filePriceMap = new Map();
  
  for (const filename of imageFiles) {
    const productInfo = parseProductInfo(filename);
    if (productInfo.name && productInfo.price) {
      filePriceMap.set(productInfo.name.toLowerCase().trim(), productInfo.price);
      console.log(`Parsed: "${productInfo.name}" - £${productInfo.price}`);
    }
  }
  
  console.log(`\n=== FETCHING EXISTING PRODUCTS ===`);
  
  // Step 4: Get existing products from database
  const existingProducts = await getAllProducts();
  console.log(`Found ${existingProducts.length} products in database`);
  
  // Step 5: Update prices
  console.log(`\n=== UPDATING PRICES (CONVERTING PENCE TO POUNDS) ===`);
  
  const results = {
    updated: [],
    notFound: [],
    alreadyDecimal: [],
    failed: []
  };
  
  for (const product of existingProducts) {
    const normalizedName = product.name.toLowerCase().trim();
    const filePrice = filePriceMap.get(normalizedName);
    
    if (filePrice === undefined) {
      console.log(`\n[${product.id}] ${product.name}`);
      console.log(`  No price found in files - skipping`);
      results.notFound.push({ id: product.id, name: product.name });
      continue;
    }
    
    // Check if current price is already decimal (not integer)
    const currentPrice = Number(product.price);
    const isAlreadyDecimal = !Number.isInteger(currentPrice);
    
    if (isAlreadyDecimal) {
      console.log(`\n[${product.id}] ${product.name}`);
      console.log(`  Already decimal: £${currentPrice.toFixed(2)} - skipping`);
      results.alreadyDecimal.push({ id: product.id, name: product.name, price: currentPrice });
      continue;
    }
    
    // Convert integer pence to decimal pounds
    const newDecimalPrice = currentPrice / 100;
    
    console.log(`\n[${product.id}] ${product.name}`);
    console.log(`  Current price: ${currentPrice} (pence)`);
    console.log(`  New decimal price: £${newDecimalPrice.toFixed(2)}`);
    console.log(`  Updating...`);
    
    // Update with decimal price
    const updatedProduct = await updateProductPrice(product.id, newDecimalPrice);
    
    if (updatedProduct) {
      console.log(`  SUCCESS: Converted to £${newDecimalPrice.toFixed(2)}`);
      results.updated.push({
        id: product.id,
        name: product.name,
        oldPrice: currentPrice,
        newPrice: newDecimalPrice
      });
    } else {
      console.log(`  FAILED: Could not update price`);
      results.failed.push({ id: product.id, name: product.name, newPrice: newDecimalPrice });
    }
  }
  
  // Step 6: Summary
  console.log(`\n=== UPDATE SUMMARY ===`);
  console.log(`Total products in database: ${existingProducts.length}`);
  console.log(`Prices updated: ${results.updated.length}`);
  console.log(`Products already decimal: ${results.alreadyDecimal.length}`);
  console.log(`Products not found in files: ${results.notFound.length}`);
  console.log(`Failed updates: ${results.failed.length}`);
  
  if (results.updated.length > 0) {
    console.log(`\nSuccessfully converted prices:`);
    results.updated.forEach(item => {
      console.log(`  - ${item.name}: ${item.oldPrice} pence → £${item.newPrice.toFixed(2)}`);
    });
  }
  
  if (results.alreadyDecimal.length > 0) {
    console.log(`\nProducts already with decimal prices:`);
    results.alreadyDecimal.forEach(item => {
      console.log(`  - ${item.name}: £${item.price.toFixed(2)}`);
    });
  }
  
  if (results.notFound.length > 0) {
    console.log(`\nProducts not found in files:`);
    results.notFound.forEach(item => {
      console.log(`  - ${item.name} (ID: ${item.id})`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\nFailed updates:`);
    results.failed.forEach(item => {
      console.log(`  - ${item.name} (ID: ${item.id}): £${item.newPrice.toFixed(2)}`);
    });
  }
  
  console.log(`\n=== PRICE UPDATE COMPLETE ===`);
}

// Run the script
updateAllPrices().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
