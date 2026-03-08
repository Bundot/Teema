// Modal + CTA behaviour (replaces simple alert)
// Quick debug: confirm script loads
try { console.log('script.js loaded'); } catch (e) { }

// Global error catcher to surface runtime problems
window.addEventListener('error', (ev) => {
    try { console.error('Uncaught error in page:', ev.message, ev.error); } catch (e) { }
});
const cta = document.querySelector('.hero-text button');
const modal = document.getElementById('cta-modal');
const modalClose = modal && modal.querySelector('.modal-close');
const modalBackdrop = modal && modal.querySelector('.modal-backdrop');
const modalView = modal && document.getElementById('modal-view-combos');
const modalCloseSecondary = modal && document.getElementById('modal-close-secondary');

function openModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    // trap focus simply by focusing close button
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
}

function closeModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    // return focus to CTA
    if (cta) cta.focus();
}

if (cta) {
    cta.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalCloseSecondary) modalCloseSecondary.addEventListener('click', closeModal);
if (modalBackdrop) modalBackdrop.addEventListener('click', (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close === 'backdrop') closeModal();
});

// smooth scroll helper: scroll to the first .combos section
function scrollToCombos() {
    const combos = document.querySelector('.combos');
    if (combos) {
        combos.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

if (modalView) {
    modalView.addEventListener('click', () => {
        closeModal();
        // small timeout to allow modal close animation
        setTimeout(scrollToCombos, 120);
    });
}

// Close modal on Escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
    }
});

/* Toast helper (non-blocking feedback when adding items) */
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(message, actionText, actionCallback, duration = 3000) {
    if (!toastEl) return;
    toastEl.innerHTML = '';
    const msg = document.createElement('div'); msg.textContent = message;
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
    toastTimer = setTimeout(() => { toastEl.hidden = true; toastEl.innerHTML = ''; }, 220);
}

// Mobile menu toggle (ARIA-aware, closes on outside click / Esc, and on nav link click)
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.navbar nav');
if (menuToggle && nav) {
    // Toggle nav and ARIA
    menuToggle.addEventListener('click', (e) => {
        const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', String(!expanded));
        nav.classList.toggle('active');
    });

    // Close nav when a nav link is chosen (mobile behavior)
    const navLinks = Array.from(nav.querySelectorAll('a'));
    navLinks.forEach(link => link.addEventListener('click', () => {
        nav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    }));

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.classList.contains('active')) return;
        if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
            nav.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Close on Escape key and return focus to toggle
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('active')) {
            nav.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.focus();
        }
    });
}

// animate cards (existing) and sections (new)
const cards = document.querySelectorAll('.food-card, .combo-card');
const cardObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = 1;
            entry.target.style.transform = 'translateY(0)';
            entry.target.classList.add('in-view');
        }
    });
}, { threshold: 0.02 });

cards.forEach(card => {
    card.style.opacity = 0;
    card.style.transform = 'translateY(40px)';
    card.style.transition = 'all .7s ease';
    cardObserver.observe(card);
});

// Section entrance observer for .fade-in elements
const sections = document.querySelectorAll('.fade-in');
const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            sectionObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.02 });

sections.forEach(s => {
    sectionObserver.observe(s);
});

/* -----------------
   Cart logic
   ----------------- */
const CART_KEY = 'teema_cart_v1';
let cart = {};

// Debug: how many add-to-cart buttons exist at init
try {
    const addBtns = document.querySelectorAll('.add-to-cart');
    console.log('add-to-cart buttons found at init:', addBtns ? addBtns.length : 0);
} catch (e) { console.error('Error counting add-to-cart buttons', e); }

function loadCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        cart = raw ? JSON.parse(raw) : {};
    } catch (e) { cart = {}; }
    updateCartBadge();
}

function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badgeEls = document.querySelectorAll('.cart-badge');
    const count = Object.values(cart).reduce((s, i) => s + (i.quantity || 0), 0);
    badgeEls.forEach(el => el.textContent = count);
}

function formatNGN(n) {
    return '₦' + Number(n).toLocaleString('en-NG');
}

function addToCartItem(id, name, price, image) {
    if (!cart[id]) {
        cart[id] = { id, name, price: Number(price), image: image || '', quantity: 1 };
    } else {
        cart[id].quantity = (cart[id].quantity || 0) + 1;
    }
    saveCart();
}

function removeCartItem(id) {
    delete cart[id];
    saveCart();
}

function setItemQuantity(id, qty) {
    if (!cart[id]) return;
    const q = Number(qty);
    if (q <= 0) { removeCartItem(id); } else { cart[id].quantity = q; }
    saveCart();
}

function cartTotal() {
    return Object.values(cart).reduce((sum, i) => sum + (i.price * (i.quantity || 0)), 0);
}

// Cart modal controls
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

function openCart() {
    if (!cartModal) return;
    cartModal.setAttribute('aria-hidden', 'false');
    cartModal.classList.add('open');
    renderCart();
    // focus first focusable
    const first = cartModal.querySelector('.cart-close');
    if (first) first.focus();
    document.querySelectorAll('.cart-toggle').forEach(b => b.setAttribute('aria-expanded', 'true'));
}

function closeCart() {
    if (!cartModal) return;
    cartModal.setAttribute('aria-hidden', 'true');
    cartModal.classList.remove('open');
    document.querySelectorAll('.cart-toggle').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

// Wire cart toggle buttons
if (cartToggle && cartToggle.length) {
    cartToggle.forEach(btn => btn.addEventListener('click', () => {
        // toggle
        if (cartModal && cartModal.getAttribute('aria-hidden') === 'false') closeCart(); else openCart();
    }));
}

// Wire close buttons
if (cartCloseBtns && cartCloseBtns.length) {
    cartCloseBtns.forEach(b => b.addEventListener('click', closeCart));
}

// Click outside to close cart
document.addEventListener('click', (e) => {
    if (!cartModal || cartModal.getAttribute('aria-hidden') === 'true') return;
    if (e.target && e.target.dataset && e.target.dataset.close === 'cart-backdrop') { closeCart(); }
});

// Cart interactions (delegate)
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('add-to-cart')) {
        try { console.log('add-to-cart click', { target: t }); } catch (e) { }
        const card = t.closest('.food-card');
        if (!card) return;
        let id = card.dataset.id || card.getAttribute('data-id');
        const name = card.dataset.name || card.getAttribute('data-name') || (card.querySelector('p') ? card.querySelector('p').textContent.trim() : 'Item');
        let price = card.dataset.price || card.getAttribute('data-price');
        const img = card.querySelector('img') ? card.querySelector('img').src : '';

        // If id is missing, generate a safe id from the name
        if (!id) {
            id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }

        // If price is missing, try to read from .price text and parse numbers
        if (!price) {
            const priceEl = card.querySelector('.price');
            if (priceEl) {
                const digits = priceEl.textContent.replace(/[^0-9\.]/g, '');
                price = digits ? Number(digits) : 0;
            } else {
                price = 0;
            }
        }

        try {
            console.log('parsed add-to-cart', { id, name, price, img });
            addToCartItem(id, name, price, img);
        } catch (err) {
            console.error('addToCartItem error', err);
        }
        // feedback: show toast with quick action to open cart
        renderCart();
        showToast(`${name} added to cart`, 'View cart', () => { openCart(); renderCart(); }, 4000);
    }

    // qty buttons
    if (t && t.dataset && (t.dataset.action === 'inc' || t.dataset.action === 'dec')) {
        const id = t.dataset.id;
        if (!id || !cart[id]) return;
        const delta = t.dataset.action === 'inc' ? 1 : -1;
        const newQty = (cart[id].quantity || 0) + delta;
        setItemQuantity(id, newQty);
        renderCart();
    }

    if (t && t.classList && t.classList.contains('remove-item')) {
        const id = t.dataset.id; if (!id) return; removeCartItem(id); renderCart();
    }
});

// qty input change
document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('qty-input')) {
        const id = t.dataset.id; const v = Number(t.value) || 0; setItemQuantity(id, v); renderCart();
    }
});

// close on Escape for cart
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartModal && cartModal.getAttribute('aria-hidden') === 'false') {
        closeCart();
    }
});

// checkout click and success modal
const checkoutBtn = document.getElementById('checkout-btn');
const successModal = document.getElementById('success-modal');
const successCloseBtns = document.querySelectorAll('.success-close');

function openSuccess() {
    if (!successModal) return;
    successModal.setAttribute('aria-hidden', 'false');
    successModal.classList.add('open');
    cart = {}; // Clear cart on success
    saveCart();
    renderCart();

    // Add confetti effect or just let the CSS handle the emoji float
}

function closeSuccess() {
    if (!successModal) return;
    successModal.setAttribute('aria-hidden', 'true');
    successModal.classList.remove('open');
}

if (successCloseBtns && successCloseBtns.length) {
    successCloseBtns.forEach(b => b.addEventListener('click', closeSuccess));
}
document.addEventListener('click', (e) => {
    if (!successModal || successModal.getAttribute('aria-hidden') === 'true') return;
    if (e.target && e.target.dataset && e.target.dataset.close === 'success-backdrop') { closeSuccess(); }
});

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (Object.keys(cart).length === 0) {
            alert('Your cart is empty.');
            return;
        }
        closeCart();
        setTimeout(openSuccess, 300);
    });
}

// initialize
loadCart();
renderCart();