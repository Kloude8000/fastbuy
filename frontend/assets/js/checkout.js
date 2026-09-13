// ============================================
// CHECKOUT PAGE
// ============================================

async function loadCartSummary() {
    if (!requireAuth()) return;

    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalSpan = document.getElementById('order-total');

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/cart`);
        if (!response.ok) throw new Error('Failed to load cart');
        const data = await response.json();
        const items = data.items || [];
        const grandTotal = parseFloat(data.grandTotal) || 0;

        if (items.length === 0) {
            orderItemsContainer.innerHTML = '<p class="empty-state">Your cart is empty. <a href="/pages/shop.html">Continue shopping</a></p>';
            const placeOrderBtn = document.getElementById('place-order-btn');
            if (placeOrderBtn) placeOrderBtn.disabled = true;
            return;
        }

        orderItemsContainer.innerHTML = items.map(item => `
            <div class="order-item">
                <img class="order-item-image" src="${uploadUrl(item.image)}" alt="${escapeHtml(item.name)}">
                <div class="order-item-details">
                    <div class="order-item-name">${escapeHtml(item.name)}</div>
                    <div class="order-item-price">$${parseFloat(item.price).toFixed(2)}</div>
                    <div class="order-item-quantity">Qty: ${item.quantity}</div>
                </div>
            </div>
        `).join('');
        orderTotalSpan.innerText = `$${grandTotal.toFixed(2)}`;
        window.orderTotal = grandTotal;

    } catch (err) {
        console.error('Error loading cart summary:', err);
        orderItemsContainer.innerHTML = '<p>Failed to load cart. Please refresh.</p>';
    }
}

async function placeOrder(event) {
    event.preventDefault();

    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Processing...';

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/checkout`, {
            method: 'POST',
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast(
                `Order #${data.orderId} placed — $${parseFloat(data.total).toFixed(2)}`,
                'success'
            );
            window.location.href = `/pages/order-confirmation.html?orderId=${data.orderId}`;
        } else {
            showToast(data.message || 'Order failed. Please try again.', 'error');
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
        }
    } catch (err) {
        if (err instanceof ApiError) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
            return;
        }
        console.error('Checkout error:', err);
        showToast('Network error. Please check your connection and try again.', 'error');
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    loadCartSummary();

    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', placeOrder);
    }
});
