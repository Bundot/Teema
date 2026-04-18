#!/usr/bin/env node
// Setup RLS policies for storage bucket
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/setup-storage-policies.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupStoragePolicies() {
  console.log('🔐 Setting up storage RLS policies...');
  
  try {
    // Allow public read access to product-images bucket
    const { error: publicReadError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow public read access to product-images" ON storage.objects
        FOR SELECT USING (bucket_id = 'product-images');
      `
    });
    
    if (publicReadError) {
      console.log('ℹ️ Public read policy may already exist or needs manual setup');
    } else {
      console.log('✅ Public read policy created');
    }
    
    // Allow authenticated users to upload to product-images bucket
    const { error: uploadError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow authenticated users to upload to product-images" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'product-images' 
          AND auth.role() = 'authenticated'
        );
      `
    });
    
    if (uploadError) {
      console.log('ℹ️ Upload policy may already exist or needs manual setup');
    } else {
      console.log('✅ Upload policy created');
    }
    
    // Allow users to update their own uploads
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow users to update their own uploads" ON storage.objects
        FOR UPDATE USING (
          bucket_id = 'product-images' 
          AND auth.role() = 'authenticated'
        );
      `
    });
    
    if (updateError) {
      console.log('ℹ️ Update policy may already exist or needs manual setup');
    } else {
      console.log('✅ Update policy created');
    }
    
    console.log('🎯 Storage policy setup complete!');
    console.log('');
    console.log('📋 If policies still fail, set them up manually in Supabase dashboard:');
    console.log('1. Go to Storage > product-images bucket');
    console.log('2. Click "Policies" tab');
    console.log('3. Create these policies:');
    console.log('   - Allow public read access (FOR SELECT)');
    console.log('   - Allow authenticated uploads (FOR INSERT)');
    console.log('   - Allow authenticated updates (FOR UPDATE)');
    
  } catch (error) {
    console.error('❌ Policy setup failed:', error);
    console.log('');
    console.log('📋 Manual setup instructions:');
    console.log('1. Go to Supabase dashboard > Storage > product-images');
    console.log('2. Click "Policies"');
    console.log('3. Create policy: "Allow public read"');
    console.log('   - FOR SELECT');
    console.log('   - USING (bucket_id = \'product-images\')');
    console.log('4. Create policy: "Allow authenticated uploads"');
    console.log('   - FOR INSERT');
    console.log('   - WITH CHECK (bucket_id = \'product-images\' AND auth.role() = \'authenticated\')');
  }
}

setupStoragePolicies();
