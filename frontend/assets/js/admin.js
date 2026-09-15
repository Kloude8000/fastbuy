// ============================================
// ADMIN DASHBOARD
// ============================================

async function checkAdmin() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/pages/login.html';
        return false;
    }
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/profile`, { headers: authHeaders() });
        if (!response.ok) throw new Error('Profile fetch failed');
        const user = await response.json();
        if (user.role !== 'admin') {
            showToast('Admin access only. You are logged in as: ' + (user.role || 'customer'), 'error');
            window.location.href = '/index.html';
            return false;
        }
        return true;
    } catch (err) {
        console.error('Admin check error:', err);
        showToast('Authentication error. Please log in again.', 'error');
        clearAuth();
        window.location.href = '/pages/login.html';
        return false;
    }
}

// ---------- Tabs ----------
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            // Load tab data
            if (tabId === 'orders') loadOrders();
            if (tabId === 'products') loadProducts();
            if (tabId === 'categories') loadCategories();
            if (tabId === 'reports') loadReports();
        });
    });
}

// ---------- Orders ----------
async function loadOrders() {
    const container = document.getElementById('orders-table-container');
    container.innerHTML = '<p>Loading orders...</p>';
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/admin/orders/all`, { headers: authHeaders() });
        if (!response.ok) throw new Error();
        const orders = await response.json();
        if (!orders.length) {
            container.innerHTML = '<p>No orders found.</p>';
            return;
        }
        const table = `
            <table>
                <thead>
                    <tr><th>ID</th><th>Customer</th><th>Total</th><th>Payment</th><th>Pay status</th><th>Status</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>#${order.id}</td>
                            <td>${escapeHtml(order.customer_name)} (${escapeHtml(order.email)})</td>
                            <td>${formatGhs(order.total_price)}</td>
                            <td>${formatPaymentMethod(order.payment_method)}</td>
                            <td>${formatPaymentStatus(order.payment_status)}</td>
                            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                            <td><button class="btn-sm update-order-status" data-id="${order.id}" data-status="${order.status}">Update Status</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = table;
        document.querySelectorAll('.update-order-status').forEach(btn => {
            btn.addEventListener('click', () => openOrderStatusModal(btn.dataset.id, btn.dataset.status));
        });
    } catch (err) {
        container.innerHTML = '<p>Failed to load orders.</p>';
    }
}

function openOrderStatusModal(orderId, currentStatus) {
    document.getElementById('order-id').value = orderId;
    document.getElementById('order-status').value = currentStatus;
    const modal = document.getElementById('order-status-modal');
    modal.style.display = 'flex';
}

async function updateOrderStatus() {
    const orderId = document.getElementById('order-id').value;
    const status = document.getElementById('order-status').value;
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            showToast('Order status updated', 'success');
            closeModals();
            loadOrders();
        } else {
            showToast('Update failed', 'error');
        }
    } catch (err) {
        if (!(err instanceof ApiError)) showToast('Network error', 'error');
    }
}

// ---------- Products ----------
async function loadProducts() {
    const container = document.getElementById('products-table-container');
    container.innerHTML = '<p>Loading products...</p>';
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) throw new Error();
        const products = await response.json();
        if (!products.length) {
            container.innerHTML = '<p>No products. <button id="create-product-from-empty" class="btn btn-primary">Add Product</button></p>';
            document.getElementById('create-product-from-empty')?.addEventListener('click', () => openProductModal());
            return;
        }
        const table = `
            <table>
                <thead>
                    <tr><th>ID</th><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.id}</td>
                            <td><img src="${uploadUrl(p.image)}" width="40" height="40" style="object-fit:cover;"></td>
                            <td>${escapeHtml(p.name)}</td>
                            <td>${formatGhs(p.price)}</td>
                            <td>${p.stock}</td>
                            <td>${p.category || 'Uncategorized'}</td>
                            <td><button class="btn-sm edit-product" data-id="${p.id}">Edit</button> <button class="btn-sm delete-product" data-id="${p.id}">Delete</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = table;
        document.querySelectorAll('.edit-product').forEach(btn => btn.addEventListener('click', () => openProductModal(btn.dataset.id)));
        document.querySelectorAll('.delete-product').forEach(btn => btn.addEventListener('click', () => deleteProduct(btn.dataset.id)));
    } catch (err) {
        container.innerHTML = '<p>Failed to load products.</p>';
    }
}

function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    form.reset();
    document.getElementById('product-id').value = '';
    if (productId) {
        title.innerText = 'Edit Product';
        apiFetch(`${API_BASE_URL}/api/products/${productId}`, { redirectOn401: false })
            .then(res => res.json())
            .then(data => {
                const p = data.product;
                document.getElementById('product-id').value = p.id;
                document.getElementById('product-name').value = p.name;
                document.getElementById('product-description').value = p.description;
                document.getElementById('product-price').value = p.price;
                document.getElementById('product-old-price').value = p.old_price || '';
                document.getElementById('product-stock').value = p.stock;
                document.getElementById('product-featured').checked = p.featured === 1;
                loadCategorySelect(p.category_id);
            });
    } else {
        title.innerText = 'Add Product';
        loadCategorySelect();
    }
    modal.style.display = 'flex';
}

async function loadCategorySelect(selectedId = null) {
    const select = document.getElementById('product-category-id');
    const response = await apiFetch(`${API_BASE_URL}/api/categories`);
    const categories = await response.json();
    select.innerHTML = '<option value="">Select Category</option>' + categories.map(c => `<option value="${c.id}" ${selectedId == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
}

async function saveProduct(event) {
    event.preventDefault();
    const productId = document.getElementById('product-id').value;
    const isUpdate = !!productId;

    // Get form values
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const oldPriceInput = document.getElementById('product-old-price').value;
    const stock = parseInt(document.getElementById('product-stock').value);
    const category_id = parseInt(document.getElementById('product-category-id').value);
    const featured = document.getElementById('product-featured').checked;

    if (isUpdate) {
        // --- UPDATE: send JSON (no image) ---
        const updateData = {
            name,
            description,
            price,
            stock,
            category_id,
            featured
        };
        // Only include old_price if it's a valid positive number
        if (oldPriceInput && !isNaN(parseFloat(oldPriceInput)) && parseFloat(oldPriceInput) > 0) {
            updateData.old_price = parseFloat(oldPriceInput);
        }

        try {
            const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(updateData)
            });
            if (response.ok) {
                showToast('Product updated successfully', 'success');
                closeModals();
                loadProducts();
            } else {
                const error = await response.json();
                showToast('Update failed: ' + (error.message || JSON.stringify(error.errors)), 'error');
            }
        } catch (err) {
            if (!(err instanceof ApiError)) showToast('Network error', 'error');
        }
    } else {
        // --- CREATE: send FormData (with image) ---
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', price);
        if (oldPriceInput && !isNaN(parseFloat(oldPriceInput)) && parseFloat(oldPriceInput) > 0) {
            formData.append('old_price', parseFloat(oldPriceInput));
        }
        formData.append('stock', stock);
        formData.append('category_id', category_id);
        formData.append('featured', featured);
        const imageFile = document.getElementById('product-image').files[0];
        if (imageFile) formData.append('image', imageFile);

        try {
            const response = await apiFetch(`${API_BASE_URL}/api/products`, {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                showToast('Product created successfully', 'success');
                closeModals();
                loadProducts();
            } else {
                const error = await response.json();
                showToast('Creation failed: ' + (error.message || JSON.stringify(error.errors)), 'error');
            }
        } catch (err) {
            if (!(err instanceof ApiError)) showToast('Network error', 'error');
        }
    }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (response.ok) {
            showToast('Product deleted', 'success');
            loadProducts();
        } else {
            showToast('Delete failed', 'error');
        }
    } catch (err) {
        if (!(err instanceof ApiError)) showToast('Network error', 'error');
    }
}

// ---------- Categories ----------
async function loadCategories() {
    const container = document.getElementById('categories-table-container');
    container.innerHTML = '<p>Loading categories...</p>';
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/categories`);
        if (!response.ok) throw new Error();
        const categories = await response.json();
        if (!categories.length) {
            container.innerHTML = '<p>No categories. <button id="create-category-from-empty" class="btn btn-primary">Add Category</button></p>';
            document.getElementById('create-category-from-empty')?.addEventListener('click', () => openCategoryModal());
            return;
        }
        const table = `
            <table>
                <thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead>
                <tbody>
                    ${categories.map(c => `
                        <tr>
                            <td>${c.id}</td>
                            <td>${escapeHtml(c.name)}</td>
                            <td><button class="btn-sm edit-category" data-id="${c.id}" data-name="${escapeHtml(c.name)}">Edit</button> <button class="btn-sm delete-category" data-id="${c.id}">Delete</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = table;
        document.querySelectorAll('.edit-category').forEach(btn => btn.addEventListener('click', () => openCategoryModal(btn.dataset.id, btn.dataset.name)));
        document.querySelectorAll('.delete-category').forEach(btn => btn.addEventListener('click', () => deleteCategory(btn.dataset.id)));
    } catch (err) {
        container.innerHTML = '<p>Failed to load categories.</p>';
    }
}

function openCategoryModal(id = null, name = '') {
    document.getElementById('category-modal').style.display = 'flex';
    document.getElementById('category-id').value = id || '';
    document.getElementById('category-name').value = name;
    document.getElementById('category-modal-title').innerText = id ? 'Edit Category' : 'Add Category';
}

async function saveCategory(event) {
    event.preventDefault();
    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value;
    const url = id ? `${API_BASE_URL}/api/categories/${id}` : `${API_BASE_URL}/api/categories`;
    const method = id ? 'PUT' : 'POST';
    try {
        const response = await apiFetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify({ name })
        });
        if (response.ok) {
            showToast('Category saved', 'success');
            closeModals();
            loadCategories();
            loadCategorySelect();
        } else {
            showToast('Save failed', 'error');
        }
    } catch (err) {
        if (!(err instanceof ApiError)) showToast('Network error', 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete category? Products in this category will have category_id set to NULL.')) return;
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/categories/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (response.ok) {
            showToast('Category deleted', 'success');
            loadCategories();
            loadCategorySelect();
        } else {
            showToast('Delete failed', 'error');
        }
    } catch (err) {
        if (!(err instanceof ApiError)) showToast('Network error', 'error');
    }
}

// ---------- Reports ----------
async function loadReports() {
    await loadRevenueReport();
    await loadOrderStatusReport();
    await loadTopProducts();
    await loadTopCustomers();
    await loadInventoryReport();
}

async function loadRevenueReport() {
    const container = document.getElementById('revenue-summary');
    try {
        const res = await apiFetch(`${API_BASE_URL}/api/reports/revenue`, { headers: authHeaders() });
        const data = await res.json();
        container.innerHTML = `
            <p><strong>Total Orders:</strong> ${data.totalOrders}</p>
            <p><strong>Total Revenue:</strong> ${formatGhs(data.totalRevenue)}</p>
            <p><strong>Average Order Value:</strong> ${formatGhs(data.averageOrderValue)}</p>
        `;
    } catch (err) {
        container.innerHTML = '<p>Failed to load revenue data.</p>';
    }
}

async function loadOrderStatusReport() {
    const container = document.getElementById('order-status-report');
    try {
        const res = await apiFetch(`${API_BASE_URL}/api/reports/orders`, { headers: authHeaders() });
        const data = await res.json();
        container.innerHTML = `<ul>` + data.map(item => `<li><strong>${item.status}:</strong> ${item.total}</li>`).join('') + `</ul>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load order status.</p>';
    }
}

async function loadTopProducts() {
    const container = document.getElementById('top-products');
    try {
        const res = await apiFetch(`${API_BASE_URL}/api/reports/products`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.length) { container.innerHTML = '<p>No sales data.</p>'; return; }
        container.innerHTML = `<table><thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead><tbody>` +
            data.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${p.unitsSold}</td><td>${formatGhs(p.revenue)}</td></tr>`).join('') +
            `</tbody></table>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load top products.</p>';
    }
}

async function loadTopCustomers() {
    const container = document.getElementById('top-customers');
    try {
        const res = await apiFetch(`${API_BASE_URL}/api/reports/customers`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.length) { container.innerHTML = '<p>No customer data.</p>'; return; }
        container.innerHTML = `<table><thead><tr><th>Customer</th><th>Orders</th><th>Total Spent</th></tr></thead><tbody>` +
            data.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${c.totalOrders}</td><td>${formatGhs(c.totalSpent)}</td></tr>`).join('') +
            `</tbody></table>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load top customers.</p>';
    }
}

async function loadInventoryReport() {
    const container = document.getElementById('inventory-report');
    try {
        const res = await apiFetch(`${API_BASE_URL}/api/reports/inventory`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.length) { container.innerHTML = '<p>No inventory data.</p>'; return; }
        container.innerHTML = `<table><thead><tr><th>Product</th><th>Stock</th><th>Price</th></tr></thead><tbody>` +
            data.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${p.stock}</td><td>${formatGhs(p.price)}</td></tr>`).join('') +
            `</tbody></table>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load inventory.</p>';
    }
}

// ---------- Modal & Helper ----------
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
}

// ---------- Event Listeners ----------
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;

    initTabs();
    loadOrders(); // default tab

    // Close modal buttons
    document.querySelectorAll('.close').forEach(close => close.addEventListener('click', closeModals));

    // Form submits
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('category-form').addEventListener('submit', saveCategory);
    document.getElementById('update-order-status-btn').addEventListener('click', updateOrderStatus);

    // Add buttons
    const createProductBtn = document.getElementById('create-product-btn');
    if (createProductBtn) createProductBtn.addEventListener('click', () => openProductModal());
    const createCategoryBtn = document.getElementById('create-category-btn');
    if (createCategoryBtn) createCategoryBtn.addEventListener('click', () => openCategoryModal());
});