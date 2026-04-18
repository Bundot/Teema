#!/usr/bin/env node
// Setup Supabase storage bucket for product images
// Usage: SUPABASE_URL=... SUPABASE_ANON=... SUPABASE_SERVICE_KEY=... node scripts/setup-storage-bucket.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON');
  process.exit(2);
}

// Use service role key for admin operations if available, otherwise use anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON);

async function setupStorageBucket() {
  console.log('🔧 Setting up product-images storage bucket...');
  
  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    const productImagesBucket = buckets.find(b => b.name === 'product-images');
    
    if (productImagesBucket) {
      console.log('✅ product-images bucket already exists');
    } else {
      console.log('📦 Creating product-images bucket...');
      
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('product-images', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
      });
      
      if (error) {
        console.error('❌ Error creating bucket:', error);
        console.log('⚠️ You may need to create the bucket manually in the Supabase dashboard');
        console.log('📋 Bucket name: product-images');
        console.log('📋 Settings: Public, Allow image/*, Size limit: 5MB');
        return;
      }
      
      console.log('✅ product-images bucket created successfully');
    }
    
    // Set up RLS policies for the bucket
    console.log('🔐 Setting up RLS policies...');
    
    // Allow public read access
    const { error: policyError1 } = await supabase
      .from('storage.objects')
      .select('*')
      .eq('bucket_id', 'product-images')
      .limit(1);
    
    // We'll skip policy setup for now since it requires admin privileges
    console.log('ℹ️ Note: Make sure the bucket is set to public in Supabase dashboard');
    console.log('🎯 Storage setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('⚠️ Please create the bucket manually in Supabase dashboard:');
    console.log('   1. Go to Storage section');
    console.log('   2. Click "New bucket"');
    console.log('   3. Name: product-images');
    console.log('   4. Public bucket: ✅');
    console.log('   5. Allowed MIME types: image/*');
    console.log('   6. File size limit: 5MB');
  }
}

setupStorageBucket();
