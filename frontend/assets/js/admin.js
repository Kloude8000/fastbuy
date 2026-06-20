// ============================================
// ADMIN DASHBOARD (with Header Auth)
// ============================================

const API_BASE_URL = 'https://fastbuy-iewu.onrender.com';

// ---------- Auth Helpers ----------
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

// ---------- Header Authentication (same as home.js) ----------
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
        if (cartIcon) cartIcon.href = 'login.html';
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
            if (cartIcon) cartIcon.href = 'cart.html';

            // Show admin link only if user is admin
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
            if (cartIcon) cartIcon.href = 'login.html';
            if (adminLink) adminLink.style.display = 'none';
        }
    } catch (err) {
        console.error('Failed to fetch user profile', err);
        if (loginListItem) loginListItem.style.display = '';
        if (userListItem) userListItem.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

// ---------- Admin Access Check ----------
async function checkAdmin() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/pages/login.html';
        return false;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, { headers: authHeaders() });
        if (!response.ok) throw new Error('Profile fetch failed');
        const user = await response.json();
        if (user.role !== 'admin') {
            alert('Admin access only. You are logged in as: ' + (user.role || 'customer'));
            window.location.href = '/index.html';
            return false;
        }
        return true;
    } catch (err) {
        console.error('Admin check error:', err);
        alert('Authentication error. Please log in again.');
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
        const response = await fetch(`${API_BASE_URL}/api/admin/orders/all`, { headers: authHeaders() });
        if (!response.ok) throw new Error();
        const orders = await response.json();
        if (!orders.length) {
            container.innerHTML = '<p>No orders found.</p>';
            return;
        }
        const table = `
            <table>
                <thead>
                    <tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>#${order.id}</td>
                            <td>${escapeHtml(order.customer_name)} (${escapeHtml(order.email)})</td>
                            <td>$${parseFloat(order.total_price).toFixed(2)}</td>
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
    document.getElementById('order-status-modal').style.display = 'block';
}

async function updateOrderStatus() {
    const orderId = document.getElementById('order-id').value;
    const status = document.getElementById('order-status').value;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            alert('Order status updated');
            closeModals();
            loadOrders();
        } else {
            alert('Update failed');
        }
    } catch (err) {
        alert('Network error');
    }
}

// ---------- Products ----------
async function loadProducts() {
    const container = document.getElementById('products-table-container');
    container.innerHTML = '<p>Loading products...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
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
                            <td><img src="${p.image ? API_BASE_URL+'/uploads/'+p.image : 'https://via.placeholder.com/40'}" width="40" height="40" style="object-fit:cover;"></td>
                            <td>${escapeHtml(p.name)}</td>
                            <td>$${parseFloat(p.price).toFixed(2)}</td>
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
        fetch(`${API_BASE_URL}/api/products/${productId}`)
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
    modal.style.display = 'block';
}

async function loadCategorySelect(selectedId = null) {
    const select = document.getElementById('product-category-id');
    const response = await fetch(`${API_BASE_URL}/api/categories`);
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
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(updateData)
            });
            if (response.ok) {
                alert('Product updated successfully');
                closeModals();
                loadProducts();
            } else {
                const error = await response.json();
                alert('Update failed: ' + (error.message || JSON.stringify(error.errors)));
            }
        } catch (err) {
            alert('Network error');
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
            const response = await fetch(`${API_BASE_URL}/api/products`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                body: formData
            });
            if (response.ok) {
                alert('Product created successfully');
                closeModals();
                loadProducts();
            } else {
                const error = await response.json();
                alert('Creation failed: ' + (error.message || JSON.stringify(error.errors)));
            }
        } catch (err) {
            alert('Network error');
        }
    }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (response.ok) {
            alert('Product deleted');
            loadProducts();
        } else {
            alert('Delete failed');
        }
    } catch (err) {
        alert('Network error');
    }
}

// ---------- Categories ----------
async function loadCategories() {
    const container = document.getElementById('categories-table-container');
    container.innerHTML = '<p>Loading categories...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
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
    document.getElementById('category-modal').style.display = 'block';
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
        const response = await fetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify({ name })
        });
        if (response.ok) {
            alert('Category saved');
            closeModals();
            loadCategories();
            loadCategorySelect();
        } else {
            alert('Save failed');
        }
    } catch (err) {
        alert('Network error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete category? Products in this category will have category_id set to NULL.')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (response.ok) {
            alert('Category deleted');
            loadCategories();
            loadCategorySelect();
        } else {
            alert('Delete failed');
        }
    } catch (err) {
        alert('Network error');
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
        const res = await fetch(`${API_BASE_URL}/api/reports/revenue`, { headers: authHeaders() });
        const data = await res.json();
        container.innerHTML = `
            <p><strong>Total Orders:</strong> ${data.totalOrders}</p>
            <p><strong>Total Revenue:</strong> $${parseFloat(data.totalRevenue).toFixed(2)}</p>
            <p><strong>Average Order Value:</strong> $${parseFloat(data.averageOrderValue).toFixed(2)}</p>
        `;
    } catch (err) {
        container.innerHTML = '<p>Failed to load revenue data.</p>';
    }
}

async function loadOrderStatusReport() {
    const container = document.getElementById('order-status-report');
    try {
        const res = await fetch(`${API_BASE_URL}/api/reports/orders`, { headers: authHeaders() });
        const data = await res.json();
        container.innerHTML = `<ul>` + data.map(item => `<li><strong>${item.status}:</strong> ${item.total}</li>`).join('') + `</ul>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load order status.</p>';
    }
}

async function loadTopProducts() {
    const container = document.getElementById('top-products');
    try {
        const res = await fetch(`${API_BASE_URL}/api/reports/products`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.length) { container.innerHTML = '<p>No sales data.</p>'; return; }
        container.innerHTML = `<table><thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead><tbody>` +
            data.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${p.unitsSold}</td><td>$${parseFloat(p.revenue).toFixed(2)}</td></tr>`).join('') +
            `</tbody></table>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load top products.</p>';
    }
}

async function loadTopCustomers() {
    const container = document.getElementById('top-customers');
    try {
        const res = await fetch(`${API_BASE_URL}/api/reports/customers`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.length) { container.innerHTML = '<p>No customer data.</p>'; return; }
        container.innerHTML = `<table><thead><tr><th>Customer</th><th>Orders</th><th>Total Spent</th></tr></thead><tbody>` +
            data.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${c.totalOrders}</td><td>$${parseFloat(c.totalSpent).toFixed(2)}</td></tr>`).join('') +
            `</tbody></table>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load top customers.</p>';
    }
}

async function loadInventoryReport() {
    const container = document.getElementById('inventory-report');
    try {
        const res = await fetch(`${API_BASE_URL}/api/reports/inventory`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.length) { container.innerHTML = '<p>No inventory data.</p>'; return; }
        container.innerHTML = `<table><thead><tr><th>Product</th><th>Stock</th><th>Price</th></tr></thead><tbody>` +
            data.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${p.stock}</td><td>$${parseFloat(p.price).toFixed(2)}</td></tr>`).join('') +
            `</tbody></table>`;
    } catch (err) {
        container.innerHTML = '<p>Failed to load inventory.</p>';
    }
}

// ---------- Modal & Helper ----------
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
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

// ---------- Event Listeners ----------
document.addEventListener('headerLoaded', async () => {
    await updateHeaderAuth();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginListItem')) {
        await updateHeaderAuth();
    }

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