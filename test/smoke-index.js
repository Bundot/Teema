const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function(){
  const root = path.resolve(__dirname, '..');
  const indexPath = path.join(root, 'index.html');
  const scriptPath = path.join(root, 'script.js');

  const html = fs.readFileSync(indexPath, 'utf8');

  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.localStorage = window.localStorage;
  global.navigator = window.navigator;

  // stub window.open so script doesn't try to open anything
  window.open = function(url, target){ console.log('window.open called with:', url); };

  if (typeof window.IntersectionObserver === 'undefined') {
    window.IntersectionObserver = class { constructor(cb, opts) { this._cb = cb; } observe() {} unobserve() {} disconnect() {} };
  }
  if (typeof window.requestAnimationFrame === 'undefined') {
    window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  }
  global.IntersectionObserver = window.IntersectionObserver;
  global.requestAnimationFrame = window.requestAnimationFrame;

  try {
    require(scriptPath);
    console.log('Loaded script.js into jsdom (index)');
  } catch (err) {
    console.error('Error loading script.js for index:', err && err.stack || err);
    process.exit(2);
  }

  // wait for async rendering
  await new Promise(r => setTimeout(r, 400));

  const homeGrid = window.document.getElementById('home-products-grid');
  if (!homeGrid) {
    console.error('No #home-products-grid found');
    process.exit(3);
  }
  console.log('#home-products-grid children count =', homeGrid.children.length);
  Array.from(homeGrid.children).forEach((c, i) => {
    console.log('child', i, 'data-id=', c.getAttribute('data-id'), 'name=', c.getAttribute('data-name'));
  });

  process.exit(0);
})();
