#!/usr/bin/env node
// Write a small JS file that sets window.SUPABASE_URL and window.SUPABASE_ANON
// This file is intended to be created at build time (CI / Vercel) using environment variables
// and must NOT be committed. Add it to .gitignore.

require('dotenv').config({ path: '.env.production' });

const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON || '';

if (!url || !anon) {
  console.warn('SUPABASE_URL or SUPABASE_ANON not set; writing empty config (admin will fallback to local JSON).');
}

const outDir = path.resolve(process.cwd(), 'config');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const content = `// Auto-generated at build time. Do NOT commit to source control.\n` +
  `window.SUPABASE_URL = ${JSON.stringify(url)};\n` +
  `window.SUPABASE_ANON = ${JSON.stringify(anon)};\n`;

fs.writeFileSync(path.join(outDir, 'supabase.js'), content, { encoding: 'utf8' });
console.log('Wrote config/supabase.js');
