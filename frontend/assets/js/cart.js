// ============================================
// CART PAGE
// ============================================

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

        const response = await apiFetch(`${API_BASE_URL}/api/cart`);
        if (!response.ok) throw new Error('Failed to load cart');

        const data = await response.json();
        const items = data.items || [];
        const total = parseFloat(data.grandTotal) || 0;

        if (items.length === 0) {
            loadingDiv.style.display = 'none';
            emptyDiv.style.display = 'block';
            await updateCartCount();
            return;
        }

        itemsList.innerHTML = items.map(item => renderCartItem(item)).join('');
        document.getElementById('summary-subtotal').innerText = `$${total.toFixed(2)}`;
        document.getElementById('summary-total').innerText = `$${total.toFixed(2)}`;

        loadingDiv.style.display = 'none';
        containerDiv.style.display = 'block';

        attachCartEvents();
        await updateCartCount();

    } catch (err) {
        console.error('Error loading cart:', err);
        loadingDiv.innerHTML = '<p class="error">Failed to load cart. Please try again.</p>';
    }
}

function renderCartItem(item) {
    const imageUrl = uploadUrl(item.image);
    const productPrice = parseFloat(item.price).toFixed(2);
    const itemTotal = parseFloat(item.total).toFixed(2);
    const maxQty = item.stock ? Math.min(99, item.stock) : 99;

    return `
        <div class="cart-item" data-cart-id="${item.cart_id}" data-product-id="${item.id}">
            <img class="cart-product-image" src="${imageUrl}" alt="${escapeAttr(item.name)}">
            <div class="cart-product-info">
                <div class="cart-product-name">${escapeHtml(item.name)}</div>
                <div class="cart-product-category">${escapeHtml(item.category || 'Product')}</div>
            </div>
            <div class="cart-price">$${productPrice}</div>
            <div class="cart-quantity">
                <button type="button" class="quantity-btn dec" aria-label="Decrease quantity">−</button>
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${maxQty}" step="1" aria-label="Quantity">
                <button type="button" class="quantity-btn inc" aria-label="Increase quantity">+</button>
            </div>
            <div class="cart-subtotal">$${itemTotal}</div>
            <button type="button" class="cart-remove" aria-label="Remove item"><i class="fas fa-trash-alt"></i></button>
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
        const maxQty = parseInt(input.max, 10) || 99;

        decBtn.addEventListener('click', () => {
            let newVal = parseInt(input.value, 10) - 1;
            if (newVal < 1) newVal = 1;
            input.value = newVal;
            updateQuantity(cartId, newVal);
        });

        incBtn.addEventListener('click', () => {
            let newVal = parseInt(input.value, 10) + 1;
            if (newVal > maxQty) newVal = maxQty;
            input.value = newVal;
            updateQuantity(cartId, newVal);
        });

        input.addEventListener('change', () => {
            let newVal = parseInt(input.value, 10);
            if (isNaN(newVal) || newVal < 1) newVal = 1;
            if (newVal > maxQty) newVal = maxQty;
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
        const response = await apiFetch(`${API_BASE_URL}/api/cart/${cartId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        });
        const data = await response.json();
        if (!response.ok) {
            showToast(data.message || 'Failed to update quantity', 'error');
        }
        await loadCart();
    } catch (err) {
        if (err instanceof ApiError) return;
        console.error('Update error:', err);
        showToast('Failed to update quantity. Please try again.', 'error');
        await loadCart();
    }
}

async function removeCartItem(cartId) {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/cart/${cartId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Remove failed');
        await loadCart();
    } catch (err) {
        if (err instanceof ApiError) return;
        console.error('Remove error:', err);
        showToast('Failed to remove item. Please try again.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    loadCart();

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            window.location.href = "/pages/checkout.html";
        });
    }
});
