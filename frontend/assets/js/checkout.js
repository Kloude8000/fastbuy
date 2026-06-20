// ============================================
// CHECKOUT PAGE - LOAD CART, PLACE ORDER (with Header Auth)
// ============================================

const API_BASE_URL = 'https://fastbuy-iewu.onrender.com/';

// Helper: Get auth token
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function authHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function clearAuth() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
}

function requireAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ==== HEADER AUTH (copied from home.js) ====
async function updateHeaderAuth() {
    const loginListItem = document.getElementById('loginListItem');
    const userListItem = document.getElementById('userListItem');
    const userDisplayName = document.getElementById('userDisplayName');
    const logoutLink = document.getElementById('logoutLink');
    const cartIcon = document.getElementById('cartIconLink');

    const token = getAuthToken();
    if (!token) {
        if (loginListItem) loginListItem.style.display = '';
        if (userListItem) userListItem.style.display = 'none';
        if (cartIcon) cartIcon.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            headers: authHeaders()
        });
        if (response.ok) {
            const user = await response.json();
            if (userDisplayName) userDisplayName.textContent = `Hi, ${user.name}`;
            if (loginListItem) loginListItem.style.display = 'none';
            if (userListItem) userListItem.style.display = '';
            if (cartIcon) cartIcon.href = 'cart.html';
            if (logoutLink) {
                logoutLink.onclick = (e) => {
                    e.preventDefault();
                    clearAuth();
                    window.location.reload();
                };
            }
        } else {
            clearAuth();
            if (loginListItem) loginListItem.style.display = '';
            if (userListItem) userListItem.style.display = 'none';
            if (cartIcon) cartIcon.href = 'login.html';
        }
    } catch (err) {
        console.error('Failed to fetch user profile', err);
    }
}

// Load cart items to display in order summary
async function loadCartSummary() {
    if (!requireAuth()) return;

    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalSpan = document.getElementById('order-total');

    try {
        const response = await fetch(`${API_BASE_URL}/api/cart`, {
            headers: authHeaders()
        });
        if (!response.ok) {
            if (response.status === 401) {
                clearAuth();
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to load cart');
        }
        const data = await response.json();
        const items = data.items || [];
        const grandTotal = parseFloat(data.grandTotal) || 0;

        if (items.length === 0) {
            orderItemsContainer.innerHTML = '<p>Your cart is empty. <a href="shop.html">Continue shopping</a></p>';
            const placeOrderBtn = document.getElementById('place-order-btn');
            if (placeOrderBtn) placeOrderBtn.disabled = true;
            return;
        }

        // Render order items
        orderItemsContainer.innerHTML = items.map(item => `
            <div class="order-item">
                <img class="order-item-image" src="${item.image ? API_BASE_URL + '/uploads/' + item.image : 'https://via.placeholder.com/60'}" alt="${escapeHtml(item.name)}">
                <div class="order-item-details">
                    <div class="order-item-name">${escapeHtml(item.name)}</div>
                    <div class="order-item-price">$${parseFloat(item.price).toFixed(2)}</div>
                    <div class="order-item-quantity">Qty: ${item.quantity}</div>
                </div>
            </div>
        `).join('');
        orderTotalSpan.innerText = `$${grandTotal.toFixed(2)}`;

        // Store total for later (optional)
        window.orderTotal = grandTotal;

    } catch (err) {
        console.error('Error loading cart summary:', err);
        orderItemsContainer.innerHTML = '<p>Failed to load cart. Please refresh.</p>';
    }
}

// Handle form submission
async function placeOrder(event) {
    event.preventDefault();

    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Processing...';

    try {
        // Call the backend checkout endpoint (no body needed, uses cart)
        const response = await fetch(`${API_BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: authHeaders()
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Order successful
            alert(`Order placed successfully! Order #${data.orderId}\nTotal: $${parseFloat(data.total).toFixed(2)}`);
            // Redirect to order confirmation page
            window.location.href = `order-confirmation.html?orderId=${data.orderId}`;
        } else {
            // Show error message from backend
            alert(data.message || 'Order failed. Please try again.');
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
        }
    } catch (err) {
        console.error('Checkout error:', err);
        alert('Network error. Please check your connection and try again.');
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
    }
}

// Helper escape
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== INITIALIZATION ==========
document.addEventListener('headerLoaded', async () => {
    await updateHeaderAuth();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginListItem')) {
        await updateHeaderAuth();
    }
    if (!requireAuth()) return;
    loadCartSummary();

    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', placeOrder);
    }
});