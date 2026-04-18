#!/usr/bin/env node
// Upload local product images to Supabase storage
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node scripts/upload-product-assets.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function uploadProductAssets() {
  console.log('📤 Starting product asset uploads...');
  
  try {
    const assetsDir = path.resolve(__dirname, '..', 'assets', 'products');
    
    if (!fs.existsSync(assetsDir)) {
      console.error('❌ assets/products directory not found');
      return;
    }
    
    const files = fs.readdirSync(assetsDir);
    console.log(`📁 Found ${files.length} files in assets/products`);
    
    for (const file of files) {
      const filePath = path.join(assetsDir, file);
      const stats = fs.statSync(filePath);
      
      if (!stats.isFile()) continue;
      
      console.log(`📤 Uploading ${file}...`);
      
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = `public/${file}`;
        
        // Upload to storage
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, fileBuffer, {
            cacheControl: '3600',
            upsert: true,
            contentType: getContentType(file)
          });
        
        if (error) {
          if (error.message?.includes('bucket') || error.message?.includes('not found')) {
            console.log(`⚠️ Bucket doesn't exist yet, skipping ${file}`);
            continue;
          }
          console.error(`❌ Error uploading ${file}:`, error);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        console.log(`✅ Uploaded ${file} -> ${publicUrl}`);
        
        // Update products that use this asset
        const productSlug = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .or(`slug.eq.${productSlug},slug.ilike.%${file}%`);
        
        if (updateError) {
          console.log(`ℹ️ Could not auto-update product for ${file}:`, updateError.message);
        } else {
          console.log(`✅ Updated product database record for ${file}`);
        }
        
      } catch (fileError) {
        console.error(`❌ Error processing ${file}:`, fileError);
      }
    }
    
    console.log('🎯 Asset upload complete!');
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
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

uploadProductAssets();
