const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '/Users/m1pro/Applications/Teema/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;

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
  const teemaProductsDir = path.resolve('/Users/m1pro/Applications/Teema/TeemaProducts');
  const files = fs.readdirSync(teemaProductsDir);
  const imageFiles = files.filter(file => /\.(jpeg|jpg|png|gif|webp)$/i.test(file));
  
  // Local items
  const localItems = imageFiles.map(file => {
    const { name, price } = parseProductInfo(file);
    return {
      filename: file,
      cleanName: name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      originalName: name,
      priceDecimal: price,
    };
  });

  // DB items
  const { data: dbItems, error } = await supabase.from('products').select('id, slug, name, price');
  if (error) {
    console.error('Error fetching DB products:', error);
    process.exit(1);
  }

  let updatedCount = 0;

  for (const local of localItems) {
    // Find matching DB item
    const dbItem = dbItems.find(db => 
      db.slug === local.cleanName || 
      db.name.toLowerCase() === local.originalName.toLowerCase()
    );

    if (dbItem) {
      // Update logic: set price to priceDecimal
      const { error: updateError } = await supabase
        .from('products')
        .update({ price: local.priceDecimal })
        .eq('id', dbItem.id);
        
      if (updateError) {
        console.error(`Failed to update ${local.originalName}:`, updateError.message);
      } else {
        console.log(`Updated "${local.originalName}" to £${local.priceDecimal}`);
        updatedCount++;
      }
    } else {
      console.log(`Could not find "${local.originalName}" in database to update.`);
    }
  }

  console.log(`\nSuccessfully verified and updated ${updatedCount} products.`);
}

run().catch(console.error);
