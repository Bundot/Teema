const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function(){
  const root = path.resolve(__dirname, '..');
  const productsPath = path.join(root, 'products.html');
  const scriptPath = path.join(root, 'script.js');

  const html = fs.readFileSync(productsPath, 'utf8');

  // create jsdom with a basic window
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.localStorage = window.localStorage;
  global.navigator = window.navigator;

  // expose a small window.open stub to capture WhatsApp URL
  let opened = null;
  window.open = function(url, target){
    opened = url;
    console.log('window.open called with:', url);
  };

  // Minimal mocks for browser APIs not present in Node/jsdom environment
  if (typeof window.IntersectionObserver === 'undefined') {
    window.IntersectionObserver = class {
      constructor(cb, opts) { this._cb = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (typeof window.requestAnimationFrame === 'undefined') {
    window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  }
  // Mirror to globals so required scripts can access them as in a browser
  global.IntersectionObserver = window.IntersectionObserver;
  global.requestAnimationFrame = window.requestAnimationFrame;

  // load the site script
  try {
    require(scriptPath);
    console.log('Loaded script.js into jsdom');
  } catch (err) {
    console.error('Error loading script.js:', err && err.stack || err);
    process.exit(2);
  }

  // wait a bit for any async initializers (none expected), then simulate add-to-cart
  await new Promise(r => setTimeout(r, 200));

  // find the first add-to-cart button and click it
  const addBtn = window.document.querySelector('.add-to-cart');
  if (!addBtn) {
    console.error('No .add-to-cart button found in products.html');
    process.exit(3);
  }
  console.log('Found add-to-cart button, simulating click');
  addBtn.click();

  // show localStorage cart
  console.log('localStorage teema_cart_v1 =', window.localStorage.getItem('teema_cart_v1'));

  // find checkout button and click to capture WhatsApp URL
  const checkout = window.document.getElementById('checkout-btn');
  if (!checkout) {
    console.error('No #checkout-btn found');
    process.exit(4);
  }
  console.log('Clicking checkout button to generate WhatsApp URL...');
  checkout.click();

  // print captured URL
  console.log('Captured WhatsApp URL:', opened);
  process.exit(0);
})();
