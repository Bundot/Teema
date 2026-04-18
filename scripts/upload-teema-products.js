#!/usr/bin/env node
// Upload all products from TeemaProducts folder to Supabase
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node scripts/upload-teema-products.js

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

function generateSkuFromName(name) {
  if (!name) return 'TEEMA-ITEM';
  
  // Remove special characters and convert to uppercase
  const clean = name.toString()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();
  
  // Replace spaces with hyphens and limit to reasonable length
  const normalized = clean.replace(/\s+/g, '-').substring(0, 20);
  
  return normalized || 'TEEMA-ITEM';
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return types[ext] || 'image/jpeg';
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

async function uploadImageToStorage(filename, fileBuffer) {
  try {
    // Clean filename: remove special characters and spaces
    const cleanFilename = filename
      .replace(/[^\w\s.-]/g, '') // Remove special characters except dots, hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores
      .trim();
    
    const storagePath = `public/${Date.now()}-${cleanFilename}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(storagePath, fileBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: getContentType(filename)
      });
    
    if (error) {
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        console.log(`Warning: Bucket 'product-images' doesn't exist, using data URL fallback`);
        return null;
      }
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath);
    
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading image ${filename}:`, error.message);
    return null;
  }
}

async function fileToDataURL(fileBuffer, filename) {
  // Simple base64 conversion as fallback
  const base64 = fileBuffer.toString('base64');
  const mimeType = getContentType(filename);
  return `data:${mimeType};base64,${base64}`;
}

async function checkProductExists(slug, name) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug')
      .or(`slug.eq.${slug},name.eq.${name}`)
      .limit(1);
    
    if (error) throw error;
    return data.length > 0;
  } catch (error) {
    console.error('Error checking product existence:', error.message);
    return false;
  }
}

async function insertProduct(productInfo, imageUrl) {
  try {
    const slug = productInfo.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const record = {
      slug: slug,
      name: productInfo.name,
      price: Math.round(productInfo.price * 100), // Convert to pence (integer)
      sku: generateSkuFromName(productInfo.name),
      image_url: imageUrl,
      category: 'general',
      stock: 100,
      active: true
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert([record])
      .select();
    
    if (error) throw error;
    
    return data[0];
  } catch (error) {
    console.error(`Error inserting product ${productInfo.name}:`, error.message);
    return null;
  }
}

async function uploadAllProducts() {
  console.log('=== TEEMA PRODUCTS UPLOAD SCRIPT ===');
  console.log('Starting upload process...\n');
  
  // Step 1: Authenticate
  const isAuthenticated = await authenticateAdmin();
  if (!isAuthenticated) {
    console.error('Authentication failed. Exiting.');
    process.exit(1);
  }
  
  // Check if we should clear existing products
  const clearExisting = process.env.CLEAR_EXISTING === 'true' || process.argv.includes('--clear');
  
  if (clearExisting) {
    console.log('\n=== CLEARING EXISTING PRODUCTS ===');
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error('Error clearing existing products:', error.message);
      } else {
        console.log('Successfully cleared existing products');
      }
    } catch (error) {
      console.error('Error clearing existing products:', error.message);
    }
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
  
  if (imageFiles.length === 0) {
    console.log('No image files found. Exiting.');
    return;
  }
  
  // Step 3: Process each file
  console.log(`\n=== PROCESSING PRODUCTS ===`);
  
  const results = {
    successful: [],
    failed: [],
    skipped: []
  };
  
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    console.log(`\n[${i + 1}/${imageFiles.length}] Processing: ${filename}`);
    
    try {
      // Parse product info
      const productInfo = parseProductInfo(filename);
      console.log(`  Parsed: "${productInfo.name}" - £${productInfo.price}`);
      
      if (!productInfo.name || !productInfo.price) {
        console.log(`  Skipping: Could not parse name or price`);
        results.skipped.push({ filename, reason: 'Parse error' });
        continue;
      }
      
      // Check if product already exists
      const exists = await checkProductExists(
        productInfo.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
        productInfo.name
      );
      
      if (exists) {
        console.log(`  Skipping: Product already exists`);
        results.skipped.push({ filename, reason: 'Already exists' });
        continue;
      }
      
      // Read image file
      const filePath = path.join(teemaProductsDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      
      // Upload image
      console.log(`  Uploading image...`);
      let imageUrl = await uploadImageToStorage(filename, fileBuffer);
      
      if (!imageUrl) {
        // Fallback to data URL
        console.log(`  Using data URL fallback...`);
        imageUrl = await fileToDataURL(fileBuffer, filename);
      }
      
      // Insert product
      console.log(`  Inserting product record...`);
      const productRecord = await insertProduct(productInfo, imageUrl);
      
      if (productRecord) {
        console.log(`  SUCCESS: Product "${productInfo.name}" added (ID: ${productRecord.id})`);
        results.successful.push({
          filename,
          name: productInfo.name,
          price: productInfo.price,
          id: productRecord.id,
          imageUrl
        });
      } else {
        console.log(`  FAILED: Could not insert product`);
        results.failed.push({ filename, name: productInfo.name, reason: 'Database insert failed' });
      }
      
    } catch (error) {
      console.error(`  ERROR: ${error.message}`);
      results.failed.push({ filename, reason: error.message });
    }
  }
  
  // Step 4: Summary
  console.log(`\n=== UPLOAD SUMMARY ===`);
  console.log(`Total files processed: ${imageFiles.length}`);
  console.log(`Successful uploads: ${results.successful.length}`);
  console.log(`Failed uploads: ${results.failed.length}`);
  console.log(`Skipped files: ${results.skipped.length}`);
  
  if (results.successful.length > 0) {
    console.log(`\nSuccessfully uploaded products:`);
    results.successful.forEach(item => {
      console.log(`  - ${item.name} (£${item.price}) - ID: ${item.id}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\nFailed uploads:`);
    results.failed.forEach(item => {
      console.log(`  - ${item.filename}: ${item.reason}`);
    });
  }
  
  if (results.skipped.length > 0) {
    console.log(`\nSkipped files:`);
    results.skipped.forEach(item => {
      console.log(`  - ${item.filename}: ${item.reason}`);
    });
  }
  
  console.log(`\n=== UPLOAD COMPLETE ===`);
}

// Run the script
uploadAllProducts().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
