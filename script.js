// Supabase Configuration
const SUPABASE_URL = 'https://exmyvjyluqwwovarungb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bXl2anlsdXF3d292YXJ1bmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDI3NjgsImV4cCI6MjA2OTExODc2OH0.BEHcE1HyhRSNPL-_rk7uSxxI5M6HFarzM2k9XlBkKco';

// Supabase Client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NEW_TABLE_NAME = 'oroto_store_items';

// DOM Elements
const productList = document.getElementById('product-list');
const cartButton = document.getElementById('cart-button');
const cartSidebar = document.getElementById('cart-sidebar');
const closeCartButton = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutButton = document.getElementById('checkout-btn');
const modal = document.getElementById('product-modal');
const closeModalButton = document.querySelector('.close-modal-btn');
const notification = document.getElementById('notification');
const searchInput = document.getElementById('search-input');

// State
let cart = [];
let allProducts = [];

// --- Database Functions ---
async function loadProductsFromDatabase(searchTerm = '') {
    console.log(`[INFO] Loading products from database... (Search: "${searchTerm}")`);

    let query = supabaseClient
        .from(NEW_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

    if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[ERROR] Error fetching products:', error);
        productList.innerHTML = `<p class="error">Failed to load products. Please try again later.</p>`;
        return;
    }

    if (data && data.length > 0) {
        console.log(`[SUCCESS] Loaded ${data.length} products from database`);
        allProducts = data;
        renderProducts(allProducts);
    } else {
        console.log('[INFO] No products found in database');
        productList.innerHTML = `<p class="error">No products available.</p>`;
    }
}

// --- Cart Functions ---

// --- Render Functions ---
function renderProducts(products) {
    if (!products || products.length === 0) {
        productList.innerHTML = `<p class="error">No products available.</p>`;
        return;
    }

    productList.innerHTML = products.map((product, index) => `
        <div class="product-card" data-product-id="${product.id}" style="animation-delay: ${index * 0.05}s">
            <img src="${product.image_url}" alt="${product.name}" class="product-image" 
                 onerror="this.src='https://via.placeholder.com/250x220/f0f0f0/666666?text=No+Image'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${formatPrice(product.price)}</p>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            const product = products.find(p => p.id == productId);
            if (product) {
                openProductModal(product);
            }
        });
    });
}

// --- Cart Functions ---
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
            showNotification(`${product.name} added to cart.`);
        } else {
            showNotification(`Not enough stock available!`, 'error');
        }
    } else {
        if (product.stock > 0) {
            cart.push({ ...product, quantity: 1 });
            showNotification(`${product.name} added to cart.`);
        } else {
            showNotification(`Out of stock!`, 'error');
        }
    }
    updateCartDisplay();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity > 0 && newQuantity <= item.stock) {
            item.quantity = newQuantity;
        } else if (newQuantity === 0) {
            removeFromCart(productId);
        } else if (newQuantity > item.stock) {
            showNotification(`Maximum stock limit reached!`, 'error');
        }
        updateCartDisplay();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
}

function updateCartDisplay() {
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image_url}" alt="${item.name}" class="cart-item-image"
                 onerror="this.src='https://via.placeholder.com/70x70/f0f0f0/666666?text=No+Image'">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.name}</p>
                <p class="cart-item-price">${formatPrice(item.price)}</p>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
            <button class="remove-item-btn" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotalPrice.textContent = formatPrice(total);
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    checkoutButton.disabled = cart.length === 0;
}

async function checkout() {
    if (cart.length === 0) return;

    const updates = cart.map(item => ({
        id: item.id,
        stock: item.stock - item.quantity
    }));

    const { error } = await supabaseClient.from(NEW_TABLE_NAME).upsert(updates);

    if (error) {
        showNotification('Payment processing error occurred.', 'error');
        console.error('[ERROR] Checkout error:', error);
    } else {
        showNotification('Order successfully completed!');
        cart = [];
        updateCartDisplay();
        cartSidebar.classList.remove('open');
        loadProductsFromDatabase(); // Refresh product stock info
    }
}

// --- Modal Functions ---
function openProductModal(product) {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}" class="modal-image"
             onerror="this.src='https://via.placeholder.com/250x250/f0f0f0/666666?text=No+Image'">
        <div class="modal-details">
            <h2 class="modal-name">${product.name}</h2>
            <p class="modal-description">${product.description}</p>
            <p class="modal-price">${formatPrice(product.price)}</p>
            <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
        </div>
    `;
    modal.classList.add('show');

    document.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
        addToCart(product);
        modal.classList.remove('show');
    });
}

// --- UI Event Listeners ---
cartButton.addEventListener('click', () => cartSidebar.classList.add('open'));
closeCartButton.addEventListener('click', () => cartSidebar.classList.remove('open'));
checkoutButton.addEventListener('click', checkout);
closeModalButton.addEventListener('click', () => modal.classList.remove('show'));
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show');
    }
});

// --- Utility Functions ---

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const debouncedSearch = debounce(loadProductsFromDatabase, 300);

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    debouncedSearch(searchTerm);
});

document.querySelector('.logo').addEventListener('click', (e) => {
    e.preventDefault();
    searchInput.value = '';
    loadProductsFromDatabase();
});

function formatPrice(price) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
}

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    loadProductsFromDatabase();
});
