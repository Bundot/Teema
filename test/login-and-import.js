#!/usr/bin/env node
// Test script: sign in as a user and import products while authenticated
// Usage:
// SUPABASE_URL=... SUPABASE_ANON=... LOGIN_EMAIL=... LOGIN_PASSWORD=... node test/login-and-import.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if(!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON'); process.exit(2);
}
if(!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  console.error('Please set LOGIN_EMAIL and LOGIN_PASSWORD'); process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });

async function run(){
  console.log('Signing in as', LOGIN_EMAIL);
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD });
  if(signErr) { console.error('Sign-in error', signErr.message || signErr); process.exit(3); }
  if(!signData || !signData.session){ console.error('No session after sign-in', signData); process.exit(4); }
  console.log('Signed in; user id=', signData.user?.id);
  // set auth for subsequent requests
  const accessToken = signData.session.access_token;
  supabase.auth.setAuth ? supabase.auth.setAuth(accessToken) : (supabase.auth.session = signData.session);

  // read products
  const p = path.resolve(__dirname, '..', 'assets', 'products.json');
  if(!fs.existsSync(p)){ console.error('products.json not found'); process.exit(5); }
  const data = JSON.parse(fs.readFileSync(p,'utf8'));

  let success = 0, fail = 0;
  for(const item of data){
    const record = {
      slug: item.id || null,
      name: item.name,
      price: Number(item.price || 0),
      sku: item.sku || null,
      image_url: item.image || null,
      category: item.category || null,
      stock: item.stock || 0,
      active: item.active !== undefined ? item.active : true
    };
    try{
      const { data: inserted, error } = await supabase.from('products').insert([record]);
      if(error){ console.error('Insert error', error.message || error); fail++; }
      else { console.log('Inserted', inserted && inserted[0] && inserted[0].id); success++; }
    }catch(e){ console.error('Insert exception', e && e.message); fail++; }
  }
  console.log('Import finished. success=', success, 'fail=', fail);
}

run().catch(e=>{ console.error(e); process.exit(99); });
