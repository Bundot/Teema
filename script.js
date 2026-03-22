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
        
        // Clear toast safely
        while (toastEl.firstChild) {
            toastEl.removeChild(toastEl.firstChild);
        }
        
        const msg = document.createElement('div'); 
        msg.textContent = message; // Safe textContent instead of innerHTML
        toastEl.appendChild(msg);
        
        if (actionText && actionCallback) {
            const act = document.createElement('button'); 
            act.className = 'toast-action'; 
            act.textContent = actionText;
            act.addEventListener('click', () => { actionCallback(); hideToast(); });
            toastEl.appendChild(act);
        }
        toastEl.hidden = false; 
        requestAnimationFrame(() => toastEl.classList.add('show'));
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, duration);
    }
    function hideToast() { 
        if (!toastEl) return; 
        toastEl.classList.remove('show'); 
        toastTimer = setTimeout(() => { 
            toastEl.hidden = true; 
            // Clear toast safely
            while (toastEl.firstChild) {
                toastEl.removeChild(toastEl.firstChild);
            }
        }, 220); 
    }

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
    const DELIVERY_FEE = 500; // flat delivery fee (£ )
    const CART_KEY = 'teema_cart_v1';
    let cart = {};

    function loadCart() { 
        try { 
            // Use secure storage if available, fallback to localStorage
            if (window.SecureStorage) {
                cart = window.SecureStorage.getCart();
            } else {
                const raw = localStorage.getItem(CART_KEY); 
                cart = raw ? JSON.parse(raw) : {}; 
            }
        } catch (e) { 
            console.error('Cart load error:', e);
            cart = {}; 
        } 
        updateCartBadge(); 
    }
    
    function saveCart() { 
        try {
            // Use secure storage if available, fallback to localStorage
            if (window.SecureStorage) {
                window.SecureStorage.setCart(cart);
            } else {
                localStorage.setItem(CART_KEY, JSON.stringify(cart));
            }
            updateCartBadge(); 
        } catch (e) {
            console.error('Cart save error:', e);
        }
    }
    function updateCartBadge() { const badgeEls = document.querySelectorAll('.cart-badge'); const count = Object.values(cart).reduce((s, i) => s + (i.quantity || 0), 0); badgeEls.forEach(el => el.textContent = count); }
    function formatNGN(n) { return '£ ' + Number(n).toLocaleString('en-NG'); }

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
        
        // Clear cart list safely
        while (cartList.firstChild) {
            cartList.removeChild(cartList.firstChild);
        }
        
        const items = Object.values(cart);
        if (items.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty';
            emptyDiv.textContent = 'Your cart is empty.';
            cartList.appendChild(emptyDiv);
        } else {
            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'cart-item';
                
                // Create safe HTML structure
                const img = document.createElement('img');
                img.src = item.image || 'https://via.placeholder.com/64';
                img.alt = item.name; // Safe alt text
                img.loading = 'lazy';
                
                const metaDiv = document.createElement('div');
                metaDiv.className = 'meta';
                
                const nameHeader = document.createElement('h4');
                nameHeader.textContent = item.name;
                
                const pricePara = document.createElement('p');
                pricePara.textContent = formatNGN(item.price);
                
                const quantityDiv = document.createElement('div');
                quantityDiv.className = 'quantity-controls';
                
                const minusBtn = document.createElement('button');
                minusBtn.textContent = '-';
                minusBtn.setAttribute('aria-label', 'Decrease quantity');
                
                const quantitySpan = document.createElement('span');
                quantitySpan.textContent = item.quantity || 1;
                
                const plusBtn = document.createElement('button');
                plusBtn.textContent = '+';
                plusBtn.setAttribute('aria-label', 'Increase quantity');
                
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.className = 'remove-btn';
                removeBtn.setAttribute('aria-label', 'Remove item from cart');
                removeBtn.setAttribute('data-id', item.id);
                
                // Assemble the structure
                quantityDiv.appendChild(minusBtn);
                quantityDiv.appendChild(quantitySpan);
                quantityDiv.appendChild(plusBtn);
                
                metaDiv.appendChild(nameHeader);
                metaDiv.appendChild(pricePara);
                metaDiv.appendChild(quantityDiv);
                metaDiv.appendChild(removeBtn);
                
                el.appendChild(img);
                el.appendChild(metaDiv);
                
                // Add event listeners
                minusBtn.addEventListener('click', () => {
                    const newQty = (item.quantity || 1) - 1;
                    if (newQty > 0) {
                        setItemQuantity(item.id, newQty);
                        renderCart();
                    }
                });
                
                plusBtn.addEventListener('click', () => {
                    const newQty = (item.quantity || 1) + 1;
                    setItemQuantity(item.id, newQty);
                    renderCart();
                });
                
                removeBtn.addEventListener('click', () => {
                    removeCartItem(item.id);
                    renderCart();
                });
                
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
        
        const cartBtn = t.closest('.add-to-cart');
        if (cartBtn) {
            e.preventDefault();
            const card = cartBtn.closest('.food-card'); if (!card) return;
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

        const buyBtn = t.closest('.buy-now');
        if (buyBtn) {
            e.preventDefault();
            const card = buyBtn.closest('.food-card'); if (!card) return;
            const name = card.dataset.name || card.getAttribute('data-name') || (card.querySelector('p') ? card.querySelector('p').textContent.trim() : 'Item');
            let price = card.dataset.price || card.getAttribute('data-price');
            if (!price) { const priceEl = card.querySelector('.price'); if (priceEl) { const digits = priceEl.textContent.replace(/[^0-9\.]/g, ''); price = digits ? Number(digits) : 0; } else price = 0; }
            
            const lines = [];
            lines.push(`Hello, I would like to buy: ${name}`);
            lines.push(`Price: ${formatNGN(price)}`);
            lines.push('');
            lines.push('Please confirm availability and delivery details.');
            const message = lines.join('\n');
            const rawPhone = '+447588290168';
            const phoneDigits = rawPhone.replace(/\D/g, '');
            const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            return;
        }

        const comboBtn = t.closest('.add-combo');
        if (comboBtn) {
            e.preventDefault();
            const name = comboBtn.getAttribute('data-name') || 'Combo';
            const desc = comboBtn.getAttribute('data-desc') || '';
            const lines = [];
            lines.push(`Hello, I would like to enquire about the Combo: ${name}`);
            if (desc) lines.push(`Details: ${desc}`);
            lines.push('');
            lines.push('Please confirm availability and delivery details.');
            const message = lines.join('\n');
            const rawPhone = '+447588290168';
            const phoneDigits = rawPhone.replace(/\D/g, '');
            const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            return;
        }

        if (t.dataset && (t.dataset.action === 'inc' || t.dataset.action === 'dec')) { const id = t.dataset.id; if (!id || !cart[id]) return; const delta = t.dataset.action === 'inc' ? 1 : -1; const newQty = (cart[id].quantity || 0) + delta; setItemQuantity(id, newQty); renderCart(); return; }
        if (t.classList && t.classList.contains('remove-btn')) { const id = t.dataset.id; if (!id) return; removeCartItem(id); renderCart(); return; }
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
                // itemized lines without SKU
                items.forEach(it => {
                    const qty = it.quantity || 0;
                    const per = formatNGN(it.price);
                    const subtotal = formatNGN((it.price || 0) * qty);
                    lines.push(`${qty} x ${it.name} — ${per} each = ${subtotal}`);
                });
                lines.push('');
                lines.push(`Total: ${formatNGN(cartTotal())}`);
                lines.push('');
                lines.push('Delivery address:');
                lines.push('Contact name:');
                lines.push('Phone:');
                lines.push('Please confirm your phone number above before sending.');
                const message = lines.join('\n');
                const rawPhone = '+447588290168';
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
            const btn = document.createElement('button'); btn.className = 'add-to-cart'; btn.setAttribute('aria-label', `Add ${p.name} to cart`); btn.innerHTML = '<span>Cart</span>';
            const buyBtn = document.createElement('button'); buyBtn.className = 'buy-now'; buyBtn.setAttribute('aria-label', `Buy ${p.name} now`); buyBtn.innerHTML = '<span>Buy Now</span>';
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions';
            actionsDiv.appendChild(btn);
            actionsDiv.appendChild(buyBtn);

            card.appendChild(img); card.appendChild(title); card.appendChild(priceEl); card.appendChild(actionsDiv);
            return card;
        }

        function renderEmptyState(container, type) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px dashed rgba(0,0,0,0.1);">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">
                        ${type === 'products' ? '🛍️' : '🍱'}
                    </div>
                    <h3 style="font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #1e293b; margin-bottom: 12px; letter-spacing: 0.5px;">No ${type === 'products' ? 'Products' : 'Combos'} Available</h3>
                    <p style="color: #64748b; margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                        There are currently no active ${type} in the store. Please log in to the admin dashboard to add and configure new inventory.
                    </p>
                    <a href="admin.html" class="btn btn-primary" style="display: inline-block; text-decoration: none;">Go to Admin Dashboard</a>
                </div>
            `;
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
                                container.innerHTML = '';
                                if (data.length === 0) { renderEmptyState(container, 'products'); }
                                else { data.forEach((p, i) => container.appendChild(createProductCard(mapDbToProduct(p), i))); }
                                resolve();
                            }).catch(err => { console.warn('Supabase fetch failed', err); fetchLocalFallback(); });
                        }).catch(e => { console.warn('Could not import supabase client', e); fetchLocalFallback(); });
                        return;
                    }
                } catch (e) { console.warn('Error while attempting supabase fetch', e); }

                // If we reach here, Supabase is not configured, so use fallback
                fetchLocalFallback();

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
                                container.innerHTML = '';
                                if (data.length === 0) { renderEmptyState(container, 'products'); }
                                else { data.forEach((p, i) => container.appendChild(createProductCard(mapDbToProduct(p), i))); }
                                try { console.log('renderHomeProducts: rendered', data.length, 'items from Supabase'); } catch (e) {}
                                resolve();
                            }).catch(err => { console.warn('Supabase fetch failed (home)', err); localHomeFallback(); });
                        }).catch(e => { console.warn('Could not import supabase client (home)', e); localHomeFallback(); });
                        return;
                    }
                } catch (e) { console.warn('Error while attempting supabase fetch (home)', e); }

                // If we reach here, Supabase is not configured, so use fallback
                localHomeFallback();

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
                id: row.id,     // Use primary key 'id' for updates/deletes
                name: row.name || row.title || '',
                price: Number(row.price || 0),
                image: row.image_url || row.image || '',
                sku: row.sku || ''
            };
        }

        function createComboCard(c) {
            const card = document.createElement('div');
            card.className = 'combo-card';
            const bgUrl = c.image_url || c.image || 'assets/banner.jpg';
            card.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url('${bgUrl}')`;
            
            const content = document.createElement('div');
            content.className = 'combo-content';
            
            const title = document.createElement('h3');
            title.textContent = c.title || 'Combo';
            
            const descStr = c.description || (c.items && Array.isArray(c.items) ? c.items.join(', ') : '');
            const desc = document.createElement('p');
            desc.textContent = descStr;
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-ghost add-combo';
            btn.style.color = '#fff';
            btn.style.borderColor = 'rgba(255,255,255,0.3)';
            btn.setAttribute('data-name', c.title || 'Combo');
            btn.setAttribute('data-desc', descStr);
            btn.textContent = 'Enquire Now';
            
            content.appendChild(title);
            content.appendChild(desc);
            content.appendChild(btn);
            card.appendChild(content);
            return card;
        }

        function renderCombosList() {
            const container = document.getElementById('combos-grid');
            if (!container) return Promise.resolve();
            return new Promise((resolve) => {
                try {
                    if (window.SUPABASE_URL && window.SUPABASE_ANON) {
                        import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm').then(mod => {
                            const { createClient } = mod;
                            const sup = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
                            sup.from('combos').select('*').order('created_at', { ascending: false }).then(r => {
                                if (r.error) return resolve();
                                container.innerHTML = ''; 
                                const visibleCombos = (r.data || []).filter(c => c.active !== false);
                                if (visibleCombos.length === 0) { renderEmptyState(container, 'combos'); }
                                else { visibleCombos.forEach(c => container.appendChild(createComboCard(c))); }
                                resolve();
                            }).catch(() => resolve());
                        }).catch(() => resolve());
                        return;
                    }
                } catch(e) { resolve(); }
            });
        }

    // initialize: render home first (first 4), then full products list, then initialize cart
    // initialize: render home first (first 4), then full products list, then combos, then initialize cart
    renderHomeProducts(4).then(() => renderProductsList()).then(() => renderCombosList()).then(() => { loadCart(); renderCart(); });
})();