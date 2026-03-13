#!/usr/bin/env node
// Import products from assets/products.json into Supabase
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node scripts/import-products.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON env vars');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function run() {
  const p = path.resolve(__dirname, '..', 'assets', 'products.json');
  if (!fs.existsSync(p)) { console.error('assets/products.json not found'); process.exit(3); }
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const item of data) {
    // Do NOT insert the JSON `id` into the PK if the table expects a UUID.
    // Instead map the JSON id to a `slug` column and let Postgres generate the UUID PK.
    const record = {
      // slug holds the short string id from the JSON (e.g. 'rice', 'dericatomatoepaste')
      slug: item.id || null,
      name: item.name,
      price: Number(item.price || 0),
      sku: item.sku || null,
      image_url: item.image || null,
      category: item.category || null,
      stock: item.stock || 0,
      active: item.active !== undefined ? item.active : true
    };
    try {
      const { data: inserted, error } = await supabase.from('products').insert([record]);
      if (error) console.error('Insert error', error.message || error);
      else console.log('Inserted', inserted[0] && inserted[0].id || inserted[0]);
    } catch (e) { console.error('Error', e && e.message); }
  }
  console.log('Done');
}

run();
