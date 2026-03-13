#!/usr/bin/env node
// Verify that assets/products.json entries are present in Supabase `products` table
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node test/verify-products-source.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
if(!SUPABASE_URL || !SUPABASE_ANON){ console.error('Please set SUPABASE_URL and SUPABASE_ANON'); process.exit(2); }

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
async function run(){
  const p = path.resolve(__dirname, '..', 'assets', 'products.json');
  if(!fs.existsSync(p)){ console.error('assets/products.json not found'); process.exit(3); }
  const local = JSON.parse(fs.readFileSync(p,'utf8'));
  console.log('Local products.json items:', local.length);

  // fetch from supabase
  const { data: dbRows, error } = await supabase.from('products').select('id,slug,name,price,sku,image_url').order('created_at', { ascending: true });
  if(error){ console.error('Error fetching from supabase', error); process.exit(4); }
  console.log('Supabase products rows fetched:', dbRows.length);

  const dbMap = new Map();
  for(const r of dbRows){ if(r.slug) dbMap.set(String(r.slug), r); }

  const missing = [];
  const diffs = [];
  for(const item of local){ const slug = String(item.id || ''); const db = dbMap.get(slug); if(!db){ missing.push(slug); continue; }
    // compare fields
    const fieldDiffs = [];
    if((db.name||'') !== (item.name||'')) fieldDiffs.push({field:'name', local:item.name, db:db.name});
    // numeric compare
    const localPrice = Number(item.price||0); const dbPrice = Number(db.price||0);
    if(localPrice !== dbPrice) fieldDiffs.push({field:'price', local:localPrice, db:dbPrice});
    if((db.sku||'') !== (item.sku||'')) fieldDiffs.push({field:'sku', local:item.sku||'', db:db.sku||''});
    const localImg = String(item.image||item.image_url||''); const dbImg = String(db.image_url||'');
    if(localImg !== dbImg) fieldDiffs.push({field:'image_url', local:localImg, db:dbImg});
    if(fieldDiffs.length) diffs.push({slug, diffs: fieldDiffs});
  }

  // extras: rows in DB not present in local file
  const localSlugs = new Set(local.map(x=>String(x.id||'')));
  const extras = [];
  for(const [slug,r] of dbMap.entries()){ if(!localSlugs.has(slug)) extras.push(slug); }

  console.log('\nSummary:');
  console.log('Missing in DB (present in products.json but not found by slug):', missing.length);
  if(missing.length) console.log(missing.join(', '));
  console.log('Extra in DB (present in DB but not in products.json):', extras.length);
  if(extras.length) console.log(extras.slice(0,50).join(', '));
  console.log('Items with differing fields:', diffs.length);
  if(diffs.length) console.log(JSON.stringify(diffs, null, 2));

  if(missing.length===0 && diffs.length===0){ console.log('\nAll local items are present in Supabase and matched on compared fields.'); }
  else { console.log('\nSome local items are missing or differ.'); }
}

run().catch(e=>{ console.error(e); process.exit(99); });
