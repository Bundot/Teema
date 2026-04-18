#!/usr/bin/env node
// Migrate existing product images to Supabase storage
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node scripts/migrate-product-images.js

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

async function migrateImages() {
  console.log('🔄 Starting image migration...');
  
  try {
    // Fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching products:', error);
      return;
    }
    
    console.log(`📦 Found ${products.length} products`);
    
    for (const product of products) {
      const currentImageUrl = product.image_url || product.image;
      
      if (!currentImageUrl) {
        console.log(`⚠️ No image for product ${product.name}, skipping...`);
        continue;
      }
      
      // Skip if it's already a Supabase storage URL
      if (currentImageUrl.includes('supabase') && currentImageUrl.includes('storage')) {
        console.log(`✅ Product ${product.name} already uses storage, skipping...`);
        continue;
      }
      
      // Skip if it's a data URL
      if (currentImageUrl.startsWith('data:')) {
        console.log(`✅ Product ${product.name} already uses data URL, skipping...`);
        continue;
      }
      
      console.log(`🔄 Processing ${product.name}: ${currentImageUrl}`);
      
      try {
        // For local assets, we would need to upload the actual file
        // For now, we'll create a placeholder or update to a remote URL
        if (currentImageUrl.startsWith('assets/')) {
          // This is a local asset - we can't directly upload it from Node.js
          // without the actual file being available
          console.log(`⚠️ Local asset ${currentImageUrl} - manual upload required`);
          
          // Update with a placeholder for now
          const placeholderUrl = `https://via.placeholder.com/400x300/4ade80/ffffff?text=${encodeURIComponent(product.name)}`;
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ image_url: placeholderUrl })
            .eq('slug', product.slug);
            
          if (updateError) {
            console.error(`❌ Error updating ${product.name}:`, updateError);
          } else {
            console.log(`✅ Updated ${product.name} with placeholder`);
          }
        } else {
          // It's already an external URL, keep it as is
          console.log(`✅ Product ${product.name} has external URL, keeping...`);
        }
      } catch (productError) {
        console.error(`❌ Error processing ${product.name}:`, productError);
      }
    }
    
    console.log('🎯 Migration complete!');
    console.log('ℹ️ Note: Local assets need to be manually uploaded to the Supabase storage bucket');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateImages();
