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
                    <div class="order-item-price">${formatGhs(item.price)}</div>
                    <div class="order-item-quantity">Qty: ${item.quantity}</div>
                </div>
            </div>
        `).join('');
        orderTotalSpan.innerText = formatGhs(grandTotal);
        window.orderTotal = grandTotal;

    } catch (err) {
        console.error('Error loading cart summary:', err);
        orderItemsContainer.innerHTML = '<p>Failed to load cart. Please refresh.</p>';
    }
}

function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="paymentMethod"]:checked');
    return selected ? selected.value : 'cod';
}

function setCheckoutLoading(isLoading, label) {
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (!placeOrderBtn) return;
    placeOrderBtn.disabled = isLoading;
    placeOrderBtn.textContent = label || (isLoading ? 'Processing...' : 'Place order');
}

async function placeCodOrder() {
    const response = await apiFetch(`${API_BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'cod' }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
        showToast(
            `Order #${data.orderId} placed — ${formatGhs(data.total)}`,
            'success'
        );
        window.location.href = `/pages/order-confirmation.html?orderId=${data.orderId}`;
        return;
    }

    showToast(data.message || 'Order failed. Please try again.', 'error');
    setCheckoutLoading(false, 'Place order');
}

function redirectToPaymentCallback(reference) {
    const target = `/pages/payment-callback.html?reference=${encodeURIComponent(reference)}`;
    window.location.href = target;
}

async function startPaystackPayment() {
    if (typeof PaystackPop === 'undefined') {
        showToast('Paystack failed to load. Please refresh and try again.', 'error');
        setCheckoutLoading(false, 'Place order');
        return;
    }

    const response = await apiFetch(`${API_BASE_URL}/api/payments/paystack/initialize`, {
        method: 'POST',
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.access_code) {
        showToast(data.message || 'Unable to start Paystack payment.', 'error');
        setCheckoutLoading(false, 'Place order');
        return;
    }

    const popup = new PaystackPop();
    popup.resumeTransaction(data.access_code, {
        onSuccess: function (transaction) {
            const reference =
                transaction?.reference || transaction?.trxref || data.reference;
            redirectToPaymentCallback(reference);
        },
        onCancel: function () {
            setCheckoutLoading(false, 'Place order');
        },
        onError: function (error) {
            showToast(error?.message || 'Paystack payment failed to load.', 'error');
            setCheckoutLoading(false, 'Place order');
        },
    });
}

async function placeOrder(event) {
    event.preventDefault();

    setCheckoutLoading(true);

    try {
        const method = getSelectedPaymentMethod();
        if (method === 'paystack') {
            await startPaystackPayment();
            return;
        }
        await placeCodOrder();
    } catch (err) {
        if (err instanceof ApiError) {
            setCheckoutLoading(false, 'Place order');
            return;
        }
        console.error('Checkout error:', err);
        showToast('Network error. Please check your connection and try again.', 'error');
        setCheckoutLoading(false, 'Place order');
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
