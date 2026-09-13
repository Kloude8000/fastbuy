// ============================================
// ORDER HISTORY PAGE
// ============================================

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

        const response = await apiFetch(`${API_BASE_URL}/api/orders`);
        if (!response.ok) throw new Error('Failed to load orders');

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
                <span class="status-pill ${statusClass}">${order.status}</span>
            </div>
            <div class="order-footer">
                <span class="order-total">Total: $${parseFloat(order.total_price).toFixed(2)}</span>
                <a href="/pages/order-confirmation.html?orderId=${order.id}" class="view-order-btn">View Details</a>
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
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});