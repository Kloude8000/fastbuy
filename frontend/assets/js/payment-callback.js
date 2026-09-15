document.addEventListener('DOMContentLoaded', async () => {
    // Paystack may redirect the callback URL inside its iframe — break out to the top window
    if (window.self !== window.top) {
        window.top.location.href = window.location.href;
        return;
    }

    if (!requireAuth()) return;

    const statusEl = document.getElementById('payment-status');
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (!reference) {
        statusEl.textContent = 'Missing payment reference.';
        showToast('Payment reference not found.', 'error');
        return;
    }

    try {
        const response = await apiFetch(
            `${API_BASE_URL}/api/payments/paystack/verify/${encodeURIComponent(reference)}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
            statusEl.textContent = 'Payment confirmed. Redirecting to your order...';
            showToast(`Payment successful — ${formatGhs(data.total)}`, 'success');
            window.location.href = `/pages/order-confirmation.html?orderId=${data.orderId}`;
            return;
        }

        statusEl.textContent = data.message || 'Payment verification failed.';
        showToast(data.message || 'Payment verification failed.', 'error');
    } catch (err) {
        if (err instanceof ApiError) {
            statusEl.textContent =
                err.message || 'Verification failed. Please sign in and try again.';
            showToast(statusEl.textContent, 'error');
            return;
        }
        console.error('Payment verification error:', err);
        statusEl.textContent = 'Unable to verify payment. Please contact support.';
        showToast('Network error while verifying payment.', 'error');
    }
});
