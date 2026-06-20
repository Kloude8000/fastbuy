// ============================================
// ORDER CONFIRMATION PAGE (with Header Auth)
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
        window.location.href = '/pages/login.html';
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
        if (cartIcon) cartIcon.href = '/pages/login.html';
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
            if (cartIcon) cartIcon.href = '/pages/cart.html';
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
            if (cartIcon) cartIcon.href = '/pages/login.html';
        }
    } catch (err) {
        console.error('Failed to fetch user profile', err);
    }
}

// Get order ID from URL
function getOrderId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('orderId');
}

// Fetch and display order details
async function loadOrderConfirmation() {
    if (!requireAuth()) return;

    const orderId = getOrderId();
    if (!orderId) {
        document.getElementById('order-details').innerHTML = '<div class="confirmation-error">No order ID provided.</div>';
        return;
    }

    const container = document.getElementById('order-details');
    container.innerHTML = '<div class="confirmation-loading"><i class="fas fa-spinner fa-spin"></i> Loading order details...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            headers: authHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                clearAuth();
                window.location.href = '/pages/login.html';
                return;
            }
            if (response.status === 404) {
                container.innerHTML = '<div class="confirmation-error">Order not found.</div>';
                return;
            }
            throw new Error('Failed to load order');
        }

        const data = await response.json();
        displayOrder(data);

    } catch (err) {
        console.error('Error loading order:', err);
        container.innerHTML = '<div class="confirmation-error">Failed to load order details. Please try again.</div>';
    }
}

function displayOrder(data) {
    const order = data.order;
    const items = data.items;

    // Format date
    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Status class
    const statusClass = getStatusClass(order.status);

    // Build items table
    let itemsHtml = '';
    let subtotal = 0;

    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        itemsHtml += `
            <tr>
                <td class="item-product">
                    <img class="item-image" src="${item.image ? API_BASE_URL + '/uploads/' + item.image : 'https://via.placeholder.com/60'}" alt="${escapeHtml(item.name)}">
                    <span class="item-name">${escapeHtml(item.name)}</span>
                </td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>$${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const total = parseFloat(order.total_price) || subtotal;

    const html = `
        <div class="order-info">
            <div class="info-group">
                <p><strong>Order Number:</strong> #${order.id}</p>
                <p><strong>Date:</strong> ${orderDate}</p>
            </div>
            <div class="info-group">
                <p><strong>Order Status:</strong> <span class="order-status ${statusClass}">${order.status.toUpperCase()}</span></p>
                <p><strong>Payment Method:</strong> Cash on Delivery</p>
            </div>
        </div>
        <table class="order-items">
            <thead>
                <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr class="order-total-row">
                    <td colspan="3" style="text-align:right;">Total:</td>
                    <td>$${total.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    const container = document.getElementById('order-details');
    container.innerHTML = html;
}

function getStatusClass(status) {
    const map = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'shipped': 'status-shipped',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled'
    };
    return map[status] || 'status-pending';
}

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
    loadOrderConfirmation();
});