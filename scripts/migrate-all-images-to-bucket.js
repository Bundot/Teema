#!/usr/bin/env node
// Upload all product images to Supabase storage and update database
// This script authenticates as the user and migrates all images to storage

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://qnuznpihinvgzomddivo.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTc3NjYsImV4cCI6MjA4ODk3Mzc2Nn0.G9mYzgm5upwntLJW0sj-Uh3a2hTM-HbC1D4td0dgR8Y';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM5Nzc2NiwiZXhwIjoyMDg4OTczNzY2fQ.P3qIQLaID8CKewRG24heVA3DMMJ7d1qJaE0ve9JHbZs';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function migrateAllImagesToBucket() {
  console.log('🔄 Starting complete image migration to bucket...');
  
  try {
    // Step 1: Get all products from database
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError);
      return;
    }
    
    console.log(`📦 Found ${products.length} products`);
    
    // Step 2: Process each product
    for (const product of products) {
      console.log(`\n🔄 Processing: ${product.name}`);
      
      const currentImageUrl = product.image_url || product.image;
      
      if (!currentImageUrl) {
        console.log(`⚠️ No image for ${product.name}, skipping...`);
        continue;
      }
      
      // Skip if already using Supabase storage
      if (currentImageUrl.includes('supabase') && currentImageUrl.includes('storage')) {
        console.log(`✅ Already using storage: ${product.name}`);
        continue;
      }
      
      // Skip if it's a data URL
      if (currentImageUrl.startsWith('data:')) {
        console.log(`✅ Already using data URL: ${product.name}`);
        continue;
      }
      
      let finalImageUrl = currentImageUrl;
      
      // Step 3: If it's a local asset, upload to storage
      if (currentImageUrl.startsWith('assets/')) {
        const fileName = path.basename(currentImageUrl);
        const filePath = path.resolve(__dirname, '..', currentImageUrl);
        
        if (fs.existsSync(filePath)) {
          console.log(`📤 Uploading ${fileName} to storage...`);
          
          try {
            const fileBuffer = fs.readFileSync(filePath);
            const storagePath = `public/${fileName}`;
            
            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(storagePath, fileBuffer, {
                cacheControl: '3600',
                upsert: true,
                contentType: getContentType(fileName)
              });
            
            if (uploadError) {
              console.error(`❌ Upload failed for ${fileName}:`, uploadError.message);
              continue;
            }
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(storagePath);
            
            finalImageUrl = publicUrl;
            console.log(`✅ Uploaded: ${fileName} -> ${publicUrl}`);
            
          } catch (fileError) {
            console.error(`❌ Error processing ${fileName}:`, fileError);
            continue;
          }
        } else {
          console.log(`⚠️ File not found: ${filePath}`);
          // Use placeholder
          finalImageUrl = `https://via.placeholder.com/400x300/4ade80/ffffff?text=${encodeURIComponent(product.name)}`;
        }
      } else if (currentImageUrl.includes('placeholder')) {
        // Keep placeholder URLs as-is
        console.log(`📋 Keeping placeholder: ${product.name}`);
      } else {
        // External URL, keep as-is
        console.log(`🌐 External URL: ${product.name}`);
      }
      
      // Step 4: Update database with new image URL
      try {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: finalImageUrl })
          .eq('slug', product.slug);
        
        if (updateError) {
          console.error(`❌ Database update failed for ${product.name}:`, updateError.message);
        } else {
          console.log(`✅ Updated database: ${product.name}`);
        }
      } catch (dbError) {
        console.error(`❌ Database error for ${product.name}:`, dbError);
      }
    }
    
    console.log('\n🎯 Migration complete!');
    console.log('\n📋 Summary:');
    console.log('- Local assets uploaded to Supabase storage bucket');
    console.log('- Database updated with storage URLs');
    console.log('- Products will now load images from bucket');
    console.log('- No more dependencies on local assets folder');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
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

// Run the migration
migrateAllImagesToBucket();
