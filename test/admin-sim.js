#!/usr/bin/env node
// Simulate add, edit, delete actions on the products table as an authenticated admin user
// Usage:
// SUPABASE_URL=... SUPABASE_ANON=... LOGIN_EMAIL=... LOGIN_PASSWORD=... node test/admin-sim.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if(!SUPABASE_URL || !SUPABASE_ANON || !LOGIN_EMAIL || !LOGIN_PASSWORD){
  console.error('Set SUPABASE_URL, SUPABASE_ANON, LOGIN_EMAIL, LOGIN_PASSWORD'); process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });

async function run(){
  console.log('Signing in as', LOGIN_EMAIL);
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD });
  if(signErr) { console.error('Sign-in error', signErr); process.exit(3); }
  if(!signData || !signData.session){ console.error('No session after sign-in', signData); process.exit(4); }
  console.log('Signed in, user id=', signData.user?.id);
  const accessToken = signData.session.access_token;
  // set auth for subsequent requests
  if (supabase.auth && typeof supabase.auth.setAuth === 'function') supabase.auth.setAuth(accessToken);
  else supabase.auth.session = signData.session;

  const slug = 'sim-product-' + Date.now();
  console.log('1) Adding product with slug=', slug);
  const newRecord = { slug, name: 'SIM Test Product', price: 999, sku: 'SIM-SKU', image_url: null, category: 'test', stock: 10, active: true };
  const { data: inserted, error: insertErr } = await supabase.from('products').insert([newRecord]).select('*');
  if(insertErr){ console.error('Insert error', insertErr); } else { console.log('Insert succeeded, returned:', inserted && inserted[0]); }

  // verify present
  const { data: found1, error: findErr1 } = await supabase.from('products').select('*').eq('slug', slug);
  if(findErr1){ console.error('Find after insert error', findErr1); } else { console.log('Found rows after insert count=', (found1 || []).length); }

  // update
  console.log('2) Updating product price and name');
  const { data: updated, error: updateErr } = await supabase.from('products').update({ name: 'SIM Test Product (Updated)', price: 1234 }).eq('slug', slug).select('*');
  if(updateErr){ console.error('Update error', updateErr); } else { console.log('Update returned:', updated && updated[0]); }

  // verify updated
  const { data: found2, error: findErr2 } = await supabase.from('products').select('*').eq('slug', slug);
  if(findErr2){ console.error('Find after update error', findErr2); } else { console.log('Found after update:', found2 && found2[0]); }

  // delete
  console.log('3) Deleting product');
  const { data: deleted, error: deleteErr } = await supabase.from('products').delete().eq('slug', slug).select('*');
  if(deleteErr){ console.error('Delete error', deleteErr); } else { console.log('Delete returned:', deleted); }

  // final verify
  const { data: found3, error: findErr3 } = await supabase.from('products').select('*').eq('slug', slug);
  if(findErr3){ console.error('Find after delete error', findErr3); } else { console.log('Found after delete count=', (found3 || []).length); }

  console.log('Simulation complete');
}

run().catch(e=>{ console.error('Unhandled', e); process.exit(99); });
