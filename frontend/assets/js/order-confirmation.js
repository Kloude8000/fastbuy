// ============================================
// ORDER CONFIRMATION PAGE
// ============================================

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
        const response = await apiFetch(`${API_BASE_URL}/api/orders/${orderId}`);

        if (!response.ok) {
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
                    <img class="item-image" src="${uploadUrl(item.image)}" alt="${escapeHtml(item.name)}">
                    <span class="item-name">${escapeHtml(item.name)}</span>
                </td>
                <td>${formatGhs(item.price)}</td>
                <td>${item.quantity}</td>
                <td>${formatGhs(itemTotal)}</td>
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
                <p><strong>Order Status:</strong> <span class="status-pill ${statusClass}">${order.status}</span></p>
                <p><strong>Payment Method:</strong> ${formatPaymentMethod(order.payment_method)}</p>
                <p><strong>Payment Status:</strong> ${formatPaymentStatus(order.payment_status)}</p>
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
                    <td>${formatGhs(total)}</td>
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

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    loadOrderConfirmation();
});