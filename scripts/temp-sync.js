const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '/Users/m1pro/Applications/Teema/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
const ADMIN_EMAIL = 'isaacdauda12@gmail.com';
const ADMIN_PASSWORD = '@Natan1234';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function parseProductInfo(filename) {
  const nameWithoutExt = filename.replace(/\.(jpeg|jpg|png|gif|webp)$/i, '');
  const pricePatterns = [
    /£\s*(\d+(?:\.\d{1,2})?)\s*$/,
    /\$\s*(\d+(?:\.\d{1,2})?)\s*$/,
    /(\d+(?:\.\d{1,2})?)\s*£\s*$/,
    /(\d+(?:\.\d{1,2})?)\s*\$$\s*$/,
  ];
  
  let price = null;
  let productName = nameWithoutExt;
  
  for (const pattern of pricePatterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      price = parseFloat(match[1]);
      productName = nameWithoutExt.replace(pattern, '').trim();
      break;
    }
  }
  
  productName = productName
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*$/, '')
    .trim();
  
  return { name: productName, price };
}

async function run() {
  console.log('Authenticating...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (authError) {
    console.error('Auth failed:', authError.message);
    process.exit(1);
  }
  
  console.log('Authenticated correctly.');

  const teemaProductsDir = path.resolve('/Users/m1pro/Applications/Teema/TeemaProducts');
  const files = fs.readdirSync(teemaProductsDir);
  const imageFiles = files.filter(file => /\.(jpeg|jpg|png|gif|webp)$/i.test(file));
  
  const localItems = imageFiles.map(file => {
    const { name, price } = parseProductInfo(file);
    return {
      filename: file,
      cleanName: name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      originalName: name,
      priceDecimal: price,
      expectedDbPrice: price ? Math.round(price * 100) : null
    };
  });

  const { data: dbItems, error } = await supabase.from('products').select('id, slug, name, price, active');
  if (error) {
    console.error('Error fetching DB products:', error);
    process.exit(1);
  }

  let updatedCount = 0;

  for (const local of localItems) {
    if (!local.expectedDbPrice) continue;

    const dbItem = dbItems.find(db => 
      db.slug === local.cleanName || 
      db.name.toLowerCase() === local.originalName.toLowerCase()
    );

    if (dbItem) {
      if (dbItem.price !== local.expectedDbPrice) {
        // Authenticated update!
        const { data, error: updateError } = await supabase
          .from('products')
          .update({ price: local.expectedDbPrice })
          .eq('id', dbItem.id)
          .select();
          
        if (updateError) {
          console.error(`Failed to update ${local.originalName}:`, updateError.message);
        } else if (data && data.length > 0) {
          console.log(`Updated "${local.originalName}" from ${dbItem.price} to correct pence value ${local.expectedDbPrice}`);
          updatedCount++;
        } else {
          console.error(`Row Level Security blocked update for "${local.originalName}". User verified, but RLS might deny this.`);
        }
      }
    }
  }

  console.log(`\nSuccessfully fixed ${updatedCount} products to pence format!`);
}

run().catch(console.error);
