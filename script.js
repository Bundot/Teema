// Teema site interactions (clean, single-file)
(function () {
    'use strict';
    try { console.log('script.js loaded'); } catch (e) { }

    // surface uncaught errors
    window.addEventListener('error', (ev) => { try { console.error('Uncaught error in page:', ev.message, ev.error); } catch (e) { } });

    // Elements used across features
    const cta = document.querySelector('.hero-text button');
    const modal = document.getElementById('cta-modal');
    const modalClose = modal && modal.querySelector('.modal-close');
    const modalBackdrop = modal && modal.querySelector('.modal-backdrop');
    const modalView = modal && document.getElementById('modal-view-combos');
    const modalCloseSecondary = modal && document.getElementById('modal-close-secondary');

    // Toast
    const toastEl = document.getElementById('toast');
    let toastTimer = null;
    function showToast(message, actionText, actionCallback, duration = 3000) {
        if (!toastEl) return;
        toastEl.innerHTML = '';
        const msg = document.createElement('div'); msg.textContent = message;
        toastEl.appendChild(msg);
        if (actionText && actionCallback) {
            const act = document.createElement('button'); act.className = 'toast-action'; act.textContent = actionText;
            act.addEventListener('click', () => { actionCallback(); hideToast(); });
            toastEl.appendChild(act);
        }
        toastEl.hidden = false; requestAnimationFrame(() => toastEl.classList.add('show'));
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, duration);
    }
    function hideToast() { if (!toastEl) return; toastEl.classList.remove('show'); toastTimer = setTimeout(() => { toastEl.hidden = true; toastEl.innerHTML = ''; }, 220); }

    // Modal helpers
    function openModal() { if (!modal) return; modal.setAttribute('aria-hidden', 'false'); modal.classList.add('open'); const closeBtn = modal.querySelector('.modal-close'); if (closeBtn) closeBtn.focus(); }
    function closeModal() { if (!modal) return; modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('open'); if (cta) cta.focus(); }
    if (cta) cta.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCloseSecondary) modalCloseSecondary.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', (e) => { if (e.target && e.target.dataset && e.target.dataset.close === 'backdrop') closeModal(); });
    if (modalView) modalView.addEventListener('click', () => { closeModal(); setTimeout(() => { const combos = document.querySelector('.combos'); if (combos) combos.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') closeModal(); });

    // Mobile nav
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.navbar nav');
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => { const expanded = menuToggle.getAttribute('aria-expanded') === 'true'; menuToggle.setAttribute('aria-expanded', String(!expanded)); nav.classList.toggle('active'); });
        Array.from(nav.querySelectorAll('a')).forEach(a => a.addEventListener('click', () => { nav.classList.remove('active'); menuToggle.setAttribute('aria-expanded', 'false'); }));
        document.addEventListener('click', (e) => { if (!nav.classList.contains('active')) return; if (!nav.contains(e.target) && !menuToggle.contains(e.target)) { nav.classList.remove('active'); menuToggle.setAttribute('aria-expanded', 'false'); } });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('active')) { nav.classList.remove('active'); menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.focus(); } });
    }

    // Entrance observers (cards and sections)
    const cards = document.querySelectorAll('.food-card, .combo-card');
    if (cards && cards.length) {
        const cardObserver = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.opacity = 1; entry.target.style.transform = 'translateY(0)'; entry.target.classList.add('in-view'); } }); }, { threshold: 0.02 });
        cards.forEach(card => { card.style.opacity = 0; card.style.transform = 'translateY(40px)'; card.style.transition = 'all .7s ease'; cardObserver.observe(card); });
    }
    // Ensure product cards have a SKU; generate one if missing to standardize markup across pages
    try {
        document.querySelectorAll('.food-card').forEach(card => {
            if (!card.dataset.sku) {
                const idVal = card.dataset.id || card.getAttribute('data-id') || '';
                const nameVal = card.dataset.name || card.getAttribute('data-name') || (card.querySelector('p') ? card.querySelector('p').textContent : 'ITEM');
                const base = (idVal || nameVal).toString().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                card.dataset.sku = `TEEMA-${base}`;
            }
        });
    } catch (e) { /* non-fatal */ }
    const sections = document.querySelectorAll('.fade-in'); if (sections && sections.length) { const sectionObserver = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); sectionObserver.unobserve(entry.target); } }); }, { threshold: 0.02 }); sections.forEach(s => sectionObserver.observe(s)); }

    /* Cart implementation */
    const DELIVERY_FEE = 500; // flat delivery fee (₦)
    const CART_KEY = 'teema_cart_v1';
    let cart = {};

    function loadCart() { try { const raw = localStorage.getItem(CART_KEY); cart = raw ? JSON.parse(raw) : {}; } catch (e) { cart = {}; } updateCartBadge(); }
    function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); }
    function updateCartBadge() { const badgeEls = document.querySelectorAll('.cart-badge'); const count = Object.values(cart).reduce((s, i) => s + (i.quantity || 0), 0); badgeEls.forEach(el => el.textContent = count); }
    function formatNGN(n) { return '₦' + Number(n).toLocaleString('en-NG'); }

    function addToCartItem(id, name, price, image, sku) { if (!id) return; if (!cart[id]) cart[id] = { id, name, price: Number(price || 0), image: image || '', sku: sku || '', quantity: 1 }; else cart[id].quantity = (cart[id].quantity || 0) + 1; saveCart(); }
    function removeCartItem(id) { delete cart[id]; saveCart(); }
    function setItemQuantity(id, qty) { if (!cart[id]) return; const q = Number(qty); if (q <= 0) removeCartItem(id); else cart[id].quantity = q; saveCart(); }
    function cartTotal() { return Object.values(cart).reduce((sum, i) => sum + (i.price * (i.quantity || 0)), 0); }

    const cartToggle = document.querySelectorAll('.cart-toggle');
    const cartModal = document.getElementById('cart-modal');
    const cartCloseBtns = document.querySelectorAll('.cart-close');
    const cartList = document.querySelector('.cart-list');
    const cartTotalEl = document.querySelector('.cart-total');

    function renderCart() {
        if (!cartList) return;
        cartList.innerHTML = '';
        const items = Object.values(cart);
        if (items.length === 0) {
            cartList.innerHTML = '<div class="empty">Your cart is empty.</div>';
        } else {
            items.forEach(item => {
                                const el = document.createElement('div');
                                el.className = 'cart-item';
                                el.innerHTML = `
                                        <img src="${item.image || 'https://via.placeholder.com/64'}" alt="${item.name}">
                                        <div class="meta">
                                            <h4>${item.name}</h4>
                                            <div class="sku">SKU: ${item.sku || 'N/A'}</div>
                                            <div class="price">${formatNGN(item.price)}</div>
                                        </div>
                    <div class="controls">
                      <button class="qty-btn" data-action="dec" data-id="${item.id}">-</button>
                      <input class="qty-input" data-id="${item.id}" value="${item.quantity}" style="width:44px;text-align:center;padding:6px;border-radius:6px;border:1px solid #e6e6e6">
                      <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
                      <button class="remove-item" data-id="${item.id}" aria-label="Remove ${item.name}">Remove</button>
                    </div>
                `;
                cartList.appendChild(el);
            });
        }
        if (cartTotalEl) cartTotalEl.textContent = formatNGN(cartTotal());
    }

    function openCart() { if (!cartModal) return; cartModal.setAttribute('aria-hidden', 'false'); cartModal.classList.add('open'); renderCart(); const first = cartModal.querySelector('.cart-close'); if (first) first.focus(); document.querySelectorAll('.cart-toggle').forEach(b => b.setAttribute('aria-expanded', 'true')); }
    function closeCart() { if (!cartModal) return; cartModal.setAttribute('aria-hidden', 'true'); cartModal.classList.remove('open'); document.querySelectorAll('.cart-toggle').forEach(b => b.setAttribute('aria-expanded', 'false')); }

    if (cartToggle && cartToggle.length) cartToggle.forEach(btn => btn.addEventListener('click', () => { if (cartModal && cartModal.getAttribute('aria-hidden') === 'false') closeCart(); else openCart(); }));
    if (cartCloseBtns && cartCloseBtns.length) cartCloseBtns.forEach(b => b.addEventListener('click', closeCart));
    document.addEventListener('click', (e) => { if (!cartModal || cartModal.getAttribute('aria-hidden') === 'true') return; if (e.target && e.target.dataset && e.target.dataset.close === 'cart-backdrop') closeCart(); });

    // Delegated handlers: add-to-cart, qty, remove
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t) return;
        if (t.classList && t.classList.contains('add-to-cart')) {
            const card = t.closest('.food-card'); if (!card) return;
            let id = card.dataset.id || card.getAttribute('data-id');
            const name = card.dataset.name || card.getAttribute('data-name') || (card.querySelector('p') ? card.querySelector('p').textContent.trim() : 'Item');
            let price = card.dataset.price || card.getAttribute('data-price');
            const img = card.querySelector('img') ? card.querySelector('img').src : '';
            const sku = card.dataset.sku || card.getAttribute('data-sku') || '';
            if (!id) id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            if (!price) { const priceEl = card.querySelector('.price'); if (priceEl) { const digits = priceEl.textContent.replace(/[^0-9\.]/g, ''); price = digits ? Number(digits) : 0; } else price = 0; }
            try { addToCartItem(id, name, price, img, sku); } catch (err) { console.error('addToCartItem error', err); }
            renderCart(); showToast(`${name} added to cart`, 'View cart', () => { openCart(); renderCart(); }, 4000);
            return;
        }
        if (t.dataset && (t.dataset.action === 'inc' || t.dataset.action === 'dec')) { const id = t.dataset.id; if (!id || !cart[id]) return; const delta = t.dataset.action === 'inc' ? 1 : -1; const newQty = (cart[id].quantity || 0) + delta; setItemQuantity(id, newQty); renderCart(); return; }
        if (t.classList && t.classList.contains('remove-item')) { const id = t.dataset.id; if (!id) return; removeCartItem(id); renderCart(); return; }
    });

    document.addEventListener('input', (e) => { const t = e.target; if (t && t.classList && t.classList.contains('qty-input')) { const id = t.dataset.id; const v = Number(t.value) || 0; setItemQuantity(id, v); renderCart(); } });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cartModal && cartModal.getAttribute('aria-hidden') === 'false') closeCart(); });

    // Checkout - WhatsApp
    const checkoutBtn = document.getElementById('checkout-btn');
    const successModal = document.getElementById('success-modal');
    const successCloseBtns = document.querySelectorAll('.success-close');
    function openSuccess() { if (!successModal) return; successModal.setAttribute('aria-hidden', 'false'); successModal.classList.add('open'); cart = {}; saveCart(); renderCart(); }
    function closeSuccess() { if (!successModal) return; successModal.setAttribute('aria-hidden', 'true'); successModal.classList.remove('open'); }
    if (successCloseBtns && successCloseBtns.length) successCloseBtns.forEach(b => b.addEventListener('click', closeSuccess));
    document.addEventListener('click', (e) => { if (!successModal || successModal.getAttribute('aria-hidden') === 'true') return; if (e.target && e.target.dataset && e.target.dataset.close === 'success-backdrop') closeSuccess(); });
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            const items = Object.values(cart);
            if (!items || items.length === 0) { showToast('Your cart is empty'); return; }
            try {
                const lines = [];
                lines.push('Hello, I would like to place an order from Teema:');
                lines.push('');
                // itemized lines with SKU
                items.forEach(it => {
                    const qty = it.quantity || 0;
                    const per = formatNGN(it.price);
                    const subtotal = formatNGN((it.price || 0) * qty);
                    lines.push(`${qty} x ${it.name} (SKU: ${it.sku || 'N/A'}) — ${per} each = ${subtotal}`);
                });
                lines.push('');
                lines.push(`Subtotal: ${formatNGN(cartTotal())}`);
                lines.push(`Delivery fee: ${formatNGN(DELIVERY_FEE)}`);
                lines.push(`Grand total: ${formatNGN(cartTotal() + DELIVERY_FEE)}`);
                lines.push('');
                lines.push('Delivery address:');
                lines.push('Contact name:');
                lines.push('Phone:');
                lines.push('Please confirm your phone number above before sending.');
                const message = lines.join('\n');
                const rawPhone = '+2349031576385';
                const phoneDigits = rawPhone.replace(/\D/g, '');
                const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            } catch (err) { console.error('Error preparing WhatsApp checkout', err); alert('Could not open WhatsApp — please copy your cart and contact us.'); }
        });
    }

    // initialize
        // shared product card builder (hoisted so home + products list can both use it)
        function createProductCard(p, idx) {
            try { console.log('createProductCard:', p && p.id, p && p.name); } catch (e) {}
            const card = document.createElement('div');
            card.className = 'food-card';
            // add a subtle color stripe by index
            const colors = ['red','orange','yellow','brown','purple','blue','green','dark'];
            card.classList.add(colors[idx % colors.length]);
            card.setAttribute('data-id', p.id);
            card.setAttribute('data-name', p.name);
            card.setAttribute('data-price', p.price);
            card.setAttribute('data-sku', p.sku || `TEEMA-${(p.id||p.name||'ITEM').toString().toUpperCase().replace(/[^A-Z0-9]+/g,'-')}`);
            const img = document.createElement('img'); img.loading = 'lazy'; img.src = p.image || 'https://via.placeholder.com/240'; img.alt = p.name;
            const title = document.createElement('p'); title.textContent = p.name;
            const priceEl = document.createElement('div'); priceEl.className = 'price'; priceEl.textContent = formatNGN(p.price);
            const btn = document.createElement('button'); btn.className = 'add-to-cart'; btn.setAttribute('aria-label', `Add ${p.name} to cart`); btn.textContent = 'Add to cart';
            card.appendChild(img); card.appendChild(title); card.appendChild(priceEl); card.appendChild(btn);
            return card;
        }

        // Product rendering: parse inline JSON or fallback to fetch assets/products.json
        function renderProductsList() {
            const container = document.getElementById('products-grid');
            if (!container) return Promise.resolve();
            // Prefer live Supabase data when available (config via config/supabase.local.js)
            return new Promise((resolve) => {
                try {
                    if (window.SUPABASE_URL && window.SUPABASE_ANON) {
                        // dynamic import of supabase client
                        import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm').then(mod => {
                            const { createClient } = mod;
                            const sup = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
                            sup.from('products').select('*').order('created_at', { ascending: true }).then(r => {
                                if (r.error) { console.warn('Supabase products fetch error', r.error); fetchLocalFallback(); return; }
                                const data = r.data || [];
                                data.forEach((p, i) => container.appendChild(createProductCard(mapDbToProduct(p), i)));
                                resolve();
                            }).catch(err => { console.warn('Supabase fetch failed', err); fetchLocalFallback(); });
                        }).catch(e => { console.warn('Could not import supabase client', e); fetchLocalFallback(); });
                        return;
                    }
                } catch (e) { console.warn('Error while attempting supabase fetch', e); }

                // fallback to inline JSON or static assets
                function fetchLocalFallback() {
                    try {
                        const inline = document.getElementById('products-json');
                        if (inline) {
                            const raw = inline.textContent.trim();
                            if (raw) {
                                const data = JSON.parse(raw);
                                data.forEach((p, i) => container.appendChild(createProductCard(p, i)));
                                resolve(); return;
                            }
                        }
                    } catch (e) { console.warn('Could not parse inline products JSON', e); }
                    fetch('assets/products.json').then(r => r.json()).then(data => { data.forEach((p,i) => container.appendChild(createProductCard(p,i))); resolve(); }).catch(err => { console.warn('Could not load products.json', err); resolve(); });
                }
            });
        }

    // render a short home grid using the first `limit` products
    function renderHomeProducts(limit = 4) {
            try { console.log('renderHomeProducts start - limit=', limit); } catch (e) {}
            const container = document.getElementById('home-products-grid');
            try { console.log('home-products-grid element found?', !!container); } catch (e) {}
            if (!container) return Promise.resolve();
            return new Promise((resolve) => {
                try {
                    if (window.SUPABASE_URL && window.SUPABASE_ANON) {
                        import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm').then(mod => {
                            const { createClient } = mod;
                            const sup = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
                            sup.from('products').select('*').order('created_at', { ascending: true }).then(r => {
                                if (r.error) { console.warn('Supabase products fetch error (home)', r.error); localHomeFallback(); return; }
                                const data = (r.data || []).slice(0, limit);
                                data.forEach((p, i) => container.appendChild(createProductCard(mapDbToProduct(p), i)));
                                try { console.log('renderHomeProducts: rendered', data.length, 'items from Supabase'); } catch (e) {}
                                resolve();
                            }).catch(err => { console.warn('Supabase fetch failed (home)', err); localHomeFallback(); });
                        }).catch(e => { console.warn('Could not import supabase client (home)', e); localHomeFallback(); });
                        return;
                    }
                } catch (e) { console.warn('Error while attempting supabase fetch (home)', e); }

                function localHomeFallback() {
                    try { console.log('renderHomeProducts: attempting inline products-json fallback'); } catch (e) {}
                    try {
                        const inline = document.getElementById('products-json');
                        if (inline) {
                            const raw = inline.textContent.trim();
                            if (raw) {
                                const data = JSON.parse(raw).slice(0, limit);
                                data.forEach((p, i) => container.appendChild(createProductCard(p, i)));
                                try { console.log('renderHomeProducts: rendered', data.length, 'items from inline JSON'); } catch (e) {}
                                resolve(); return;
                            }
                        }
                    } catch (e) { console.warn('Could not parse inline products JSON for home', e); }
                    fetch('assets/products.json').then(r => r.json()).then(data => { data.slice(0, limit).forEach((p,i) => container.appendChild(createProductCard(p,i))); resolve(); }).catch(err => { console.warn('Could not load products.json for home', err); resolve(); });
                }
            });
        }

        // map DB row to product shape used by createProductCard
        function mapDbToProduct(row) {
            return {
                id: row.slug || row.id,
                name: row.name || row.title || '',
                price: Number(row.price || 0),
                image: row.image_url || row.image || '',
                sku: row.sku || ''
            };
        }

    // initialize: render home first (first 4), then full products list, then initialize cart
    renderHomeProducts(4).then(() => renderProductsList()).then(() => { loadCart(); renderCart(); });
})();