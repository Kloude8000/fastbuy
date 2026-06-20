// ============================================
// CART PAGE - FETCH, UPDATE, REMOVE (with Header Auth)
// ============================================

const API_BASE_URL = 'https://fastbuy-iewu.onrender.com/'; // Change to your backend URL

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

// Redirect to login if not authenticated
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

// Fetch and render cart
async function loadCart() {
    if (!requireAuth()) return;

    const loadingDiv = document.getElementById('cart-loading');
    const emptyDiv = document.getElementById('cart-empty');
    const containerDiv = document.getElementById('cart-items-container');
    const itemsList = document.getElementById('cart-items-list');

    try {
        loadingDiv.style.display = 'block';
        emptyDiv.style.display = 'none';
        containerDiv.style.display = 'none';

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
        const grandTotal = data.grandTotal;

        // Ensure grandTotal is a number
        const total = parseFloat(grandTotal) || 0;

        if (items.length === 0) {
            loadingDiv.style.display = 'none';
            emptyDiv.style.display = 'block';
            return;
        }

        itemsList.innerHTML = items.map(item => renderCartItem(item)).join('');
        document.getElementById('summary-subtotal').innerText = `$${total.toFixed(2)}`;
        document.getElementById('summary-total').innerText = `$${total.toFixed(2)}`;

        loadingDiv.style.display = 'none';
        containerDiv.style.display = 'block';

        attachCartEvents();

    } catch (err) {
        console.error('Error loading cart:', err);
        loadingDiv.innerHTML = '<p class="error">Failed to load cart. Please try again.</p>';
    }
}

function renderCartItem(item) {
    const imageUrl = item.image ? `${API_BASE_URL}/uploads/${item.image}` : 'https://via.placeholder.com/80x80?text=No+Image';
    const productPrice = parseFloat(item.price).toFixed(2);
    const itemTotal = parseFloat(item.total).toFixed(2);

    return `
        <div class="cart-item" data-cart-id="${item.cart_id}" data-product-id="${item.id}">
            <div class="cart-product">
                <img class="cart-product-image" src="${imageUrl}" alt="${escapeHtml(item.name)}">
                <div class="cart-product-info">
                    <div class="cart-product-name">${escapeHtml(item.name)}</div>
                    <div class="cart-product-category">${escapeHtml(item.category || 'Product')}</div>
                </div>
            </div>
            <div class="cart-price">$${productPrice}</div>
            <div class="cart-quantity">
                <button class="quantity-btn dec">-</button>
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" step="1">
                <button class="quantity-btn inc">+</button>
            </div>
            <div class="cart-subtotal">$${itemTotal}</div>
            <button class="cart-remove"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
}

function attachCartEvents() {
    document.querySelectorAll('.cart-item').forEach(itemEl => {
        const cartId = itemEl.dataset.cartId;
        const input = itemEl.querySelector('.quantity-input');
        const decBtn = itemEl.querySelector('.dec');
        const incBtn = itemEl.querySelector('.inc');
        const removeBtn = itemEl.querySelector('.cart-remove');

        decBtn.addEventListener('click', () => {
            let newVal = parseInt(input.value) - 1;
            if (newVal < 1) newVal = 1;
            input.value = newVal;
            updateQuantity(cartId, newVal);
        });

        incBtn.addEventListener('click', () => {
            let newVal = parseInt(input.value) + 1;
            if (newVal > 99) newVal = 99;
            input.value = newVal;
            updateQuantity(cartId, newVal);
        });

        input.addEventListener('change', () => {
            let newVal = parseInt(input.value);
            if (isNaN(newVal) || newVal < 1) newVal = 1;
            if (newVal > 99) newVal = 99;
            input.value = newVal;
            updateQuantity(cartId, newVal);
        });

        removeBtn.addEventListener('click', () => {
            if (confirm('Remove this item from cart?')) {
                removeCartItem(cartId);
            }
        });
    });
}

async function updateQuantity(cartId, quantity) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cart/${cartId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ quantity })
        });
        if (!response.ok) throw new Error('Update failed');
        await loadCart();
    } catch (err) {
        console.error('Update error:', err);
        alert('Failed to update quantity. Please try again.');
        await loadCart();
    }
}

async function removeCartItem(cartId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cart/${cartId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (!response.ok) throw new Error('Remove failed');
        await loadCart();
    } catch (err) {
        console.error('Remove error:', err);
        alert('Failed to remove item. Please try again.');
    }
}

// Helper: escape HTML
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
    loadCart();

    // Attach checkout button listener
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            window.location.href = 'checkout.html';
        });
    }
});