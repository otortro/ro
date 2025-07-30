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
    
    // Add search loading effects
    const searchContainer = document.querySelector('.search-container');
    if (searchTerm) {
        searchContainer.classList.add('searching', 'loading');
    }
    
    // Enhanced loader with smooth transition
    productList.style.opacity = '0.6';
    productList.innerHTML = '<div class="loader"></div>';

    let query = supabaseClient
        .from(NEW_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

    if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    // Remove search effects after a delay for better UX
    setTimeout(() => {
        searchContainer.classList.remove('searching', 'loading');
        productList.style.opacity = '1';
    }, searchTerm ? 800 : 400);

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
            
            // Add smooth cart button animation
            animateCartButton();
        } else {
            showNotification(`Not enough stock available!`, 'error');
        }
    } else {
        if (product.stock > 0) {
            cart.push({ ...product, quantity: 1 });
            showNotification(`${product.name} added to cart.`);
            
            // Add smooth cart button animation
            animateCartButton();
        } else {
            showNotification(`Out of stock!`, 'error');
        }
    }
    updateCartDisplay();
}

function animateCartButton() {
    const cartButton = document.getElementById('cart-button');
    cartButton.style.transform = 'scale(1.1)';
    cartButton.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    setTimeout(() => {
        cartButton.style.transform = 'scale(1)';
    }, 200);
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
    // Animate cart items with staggered delays
    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item" style="animation-delay: ${index * 0.1}s">
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
    
    // Animate cart count update
    const newCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount.textContent !== newCount.toString()) {
        cartCount.style.transform = 'scale(1.3)';
        cartCount.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        
        setTimeout(() => {
            cartCount.textContent = newCount;
            cartCount.style.transform = 'scale(1)';
        }, 150);
    }
    
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
    
    // Check if mobile and apply fullscreen mode
    if (window.innerWidth <= 768) {
        modal.classList.add('mobile-fullscreen');
        document.body.style.position = 'fixed';
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.width = '100%';
    }
    
    // Show modal with enhanced animation
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Add scroll to top button for mobile
    addScrollToTopButton();
    
    // Add click event to add to cart button
    document.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
        e.preventDefault();
        
        // Add button click animation
        const btn = e.target;
        btn.style.transform = 'scale(0.95)';
        btn.style.transition = 'all 0.1s ease';
        
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
            addToCart(product);
            closeModal();
        }, 100);
    });
}

function addScrollToTopButton() {
    // Remove existing scroll to top button if any
    const existingBtn = document.querySelector('.scroll-to-top');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Create scroll to top button
    const scrollBtn = document.createElement('div');
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.innerHTML = '↑';
    scrollBtn.setAttribute('title', 'Scroll to top');
    document.body.appendChild(scrollBtn);
    
    // Handle scroll events in modal
    const modalContent = document.querySelector('.modal-content');
    let scrollTimeout;
    
    const handleScroll = () => {
        const scrollTop = modal.scrollTop || modalContent.scrollTop || 0;
        
        if (scrollTop > 200) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
        
        // Clear existing timeout
        clearTimeout(scrollTimeout);
        
        // Hide button after scroll stops
        scrollTimeout = setTimeout(() => {
            if (scrollTop <= 200) {
                scrollBtn.classList.remove('show');
            }
        }, 1500);
    };
    
    // Add scroll listeners
    modal.addEventListener('scroll', handleScroll);
    modalContent.addEventListener('scroll', handleScroll);
    
    // Handle click to scroll to top
    scrollBtn.addEventListener('click', () => {
        // Smooth scroll to top
        const scrollElement = modal.classList.contains('mobile-fullscreen') ? modal : modalContent;
        
        scrollElement.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Add click animation
        scrollBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            scrollBtn.style.transform = 'scale(1)';
        }, 150);
    });
}

function closeModal() {
    modal.classList.remove('show', 'mobile-fullscreen');
    
    // Restore scroll position on mobile
    if (window.innerWidth <= 768) {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    document.body.style.overflow = 'auto';
    
    // Remove scroll to top button
    const scrollBtn = document.querySelector('.scroll-to-top');
    if (scrollBtn) {
        scrollBtn.remove();
    }
}

// --- UI Event Listeners ---
cartButton.addEventListener('click', () => {
    cartSidebar.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
});

closeCartButton.addEventListener('click', () => {
    cartSidebar.classList.remove('open');
    document.body.style.overflow = 'auto'; // Restore scroll
});

checkoutButton.addEventListener('click', checkout);
closeModalButton.addEventListener('click', () => closeModal());

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
    
    // Close cart if clicking outside
    if (e.target === cartSidebar) {
        cartSidebar.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
});

// Handle window resize for modal
window.addEventListener('resize', () => {
    if (modal.classList.contains('show')) {
        if (window.innerWidth <= 768 && !modal.classList.contains('mobile-fullscreen')) {
            modal.classList.add('mobile-fullscreen');
        } else if (window.innerWidth > 768 && modal.classList.contains('mobile-fullscreen')) {
            modal.classList.remove('mobile-fullscreen');
            // Restore normal body styles
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        }
    }
});

// Enhanced touch handling for mobile
if ('ontouchstart' in window) {
    // Add touch feedback for buttons
    const addTouchFeedback = (element) => {
        element.addEventListener('touchstart', () => {
            element.style.transform = 'scale(0.95)';
            element.style.transition = 'all 0.1s ease';
        });
        
        element.addEventListener('touchend', () => {
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 100);
        });
    };
    
    // Apply to all buttons
    document.addEventListener('DOMContentLoaded', () => {
        const buttons = document.querySelectorAll('button, .product-card');
        buttons.forEach(addTouchFeedback);
    });
}

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
