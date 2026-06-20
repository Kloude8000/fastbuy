// ============================================
// ORDER HISTORY PAGE (with Header Auth)
// ============================================

const API_BASE_URL = 'https://fastbuy-iewu.onrender.com';

// Auth helpers
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

// ========== HEADER AUTH (copied from home.js) ==========
async function updateHeaderAuth() {
    const loginListItem = document.getElementById('loginListItem');
    const userListItem = document.getElementById('userListItem');
    const userDisplayName = document.getElementById('userDisplayName');
    const logoutLink = document.getElementById('logoutLink');
    const cartIcon = document.getElementById('cartIconLink');
    const adminLink = document.getElementById('adminLink');

    const token = getAuthToken();
    if (!token) {
        if (loginListItem) loginListItem.style.display = '';
        if (userListItem) userListItem.style.display = 'none';
        if (cartIcon) cartIcon.href = '/pages/login.html';
        if (adminLink) adminLink.style.display = 'none';
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

            if (adminLink) {
                adminLink.style.display = (user.role === 'admin') ? 'inline' : 'none';
            }

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
            if (adminLink) adminLink.style.display = 'none';
        }
    } catch (err) {
        console.error('Failed to fetch user profile', err);
    }
}

// ========== ORDER LOADING ==========
async function loadOrders() {
    if (!requireAuth()) return;

    const loadingDiv = document.getElementById('orders-loading');
    const emptyDiv = document.getElementById('orders-empty');
    const listDiv = document.getElementById('orders-list');

    try {
        loadingDiv.style.display = 'block';
        emptyDiv.style.display = 'none';
        listDiv.style.display = 'none';

        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            headers: authHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                clearAuth();
                window.location.href = '/pages/login.html';
                return;
            }
            throw new Error('Failed to load orders');
        }

        const orders = await response.json();

        if (!orders || orders.length === 0) {
            loadingDiv.style.display = 'none';
            emptyDiv.style.display = 'block';
            return;
        }

        listDiv.innerHTML = orders.map(order => renderOrderCard(order)).join('');
        loadingDiv.style.display = 'none';
        listDiv.style.display = 'flex';

    } catch (err) {
        console.error('Error loading orders:', err);
        loadingDiv.innerHTML = '<p class="error">Failed to load orders. Please try again.</p>';
    }
}

function renderOrderCard(order) {
    const date = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const statusClass = getStatusClass(order.status);
    const totalItems = order.total_items || 0;

    return `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-date">${date}</span>
                <span class="order-status ${statusClass}">${order.status.toUpperCase()}</span>
            </div>
            <div class="order-footer">
                <span class="order-total">Total: $${parseFloat(order.total_price).toFixed(2)}</span>
                <a href="order-confirmation.html?orderId=${order.id}" class="view-order-btn">View Details</a>
            </div>
        </div>
    `;
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

// ========== INITIALIZATION ==========
document.addEventListener('headerLoaded', async () => {
    await updateHeaderAuth();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginListItem')) {
        await updateHeaderAuth();
    }
    loadOrders();
});