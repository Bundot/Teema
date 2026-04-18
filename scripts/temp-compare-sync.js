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
  const { data: dbItems, error } = await supabase.from('products').select('id, slug, name, price, active');
  if (error) {
    console.error('Error fetching DB products:', error);
    process.exit(1);
  }

  const mismatches = [];
  let matchCount = 0;

  for (const local of localItems) {
    // Find matching DB item
    const dbItem = dbItems.find(db => 
      db.slug === local.cleanName || 
      db.name.toLowerCase() === local.originalName.toLowerCase()
    );

    if (!dbItem) {
      mismatches.push({
        filename: local.filename,
        reason: 'Not found in database',
        localName: local.originalName,
        localPrice: local.priceDecimal
      });
      continue;
    }

    // Now expecting decimal to match exactly
    if (local.priceDecimal !== dbItem.price) {
      mismatches.push({
        filename: local.filename,
        reason: 'Price formatting mismatch',
        localPrice: local.priceDecimal,
        dbPrice: dbItem.price
      });
    } else {
      matchCount++;
    }
  }

  console.log(`Verification Complete!`);
  console.log(`Successfully verified ${matchCount} out of ${localItems.length} products have flawlessly matching prices.`);
  
  if (mismatches.length > 0) {
    console.log(`\nFound ${mismatches.length} mismatches:`);
    console.log(JSON.stringify(mismatches, null, 2));
  } else {
    console.log(`\nSUCCESS: 0 Mismatches found. The database is perfectly in sync with your local folder's prices.`);
  }
}

run().catch(console.error);
