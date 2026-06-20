// ============================================
// SHOP PAGE - PRODUCT LISTING, FILTERS, PAGINATION (with Header Auth)
// ============================================

const API_BASE_URL = 'http://localhost:5000';

// ---------- Helper Functions ----------
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

// ========== HEADER AUTH ==========
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
    }
}

// ---------- Global State ----------
let currentState = {
    page: 1,
    limit: 12,
    category: 'all',
    tag: 'all',
    sort: 'newest',
    search: ''
};

let totalPages = 1;

// ---------- DOM Elements ----------
const productsGrid = document.getElementById('products-grid');
const paginationDiv = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const sortSelect = document.getElementById('sort-select');

// ---------- Load Categories ----------
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        if (!response.ok) throw new Error();
        const categories = await response.json();
        const container = document.getElementById('category-filters');
        container.innerHTML = '<button class="filter-chip is-active" data-category="all">All</button>';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-chip';
            btn.dataset.category = cat.id;
            btn.textContent = cat.name;
            container.appendChild(btn);
        });
        attachCategoryListeners();
    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

function attachCategoryListeners() {
    document.querySelectorAll('#category-filters .filter-chip').forEach(btn => {
        btn.removeEventListener('click', handleCategoryClick);
        btn.addEventListener('click', handleCategoryClick);
    });
}

function handleCategoryClick(e) {
    const btn = e.currentTarget;
    const category = btn.dataset.category;
    document.querySelectorAll('#category-filters .filter-chip').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    currentState.category = category;
    currentState.page = 1;
    loadProducts();
    updateURL();
}

function attachTagListeners() {
    document.querySelectorAll('#tag-filters .filter-chip').forEach(btn => {
        btn.removeEventListener('click', handleTagClick);
        btn.addEventListener('click', handleTagClick);
    });
}

function handleTagClick(e) {
    const btn = e.currentTarget;
    const tag = btn.dataset.tag;
    document.querySelectorAll('#tag-filters .filter-chip').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    currentState.tag = tag;
    currentState.page = 1;
    loadProducts();
    updateURL();
}

// ---------- Load Products ----------
async function loadProducts() {
    productsGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>';
    paginationDiv.innerHTML = '';

    let url = `${API_BASE_URL}/api/products/catalog/list?page=${currentState.page}&limit=${currentState.limit}`;

    if (currentState.category !== 'all') {
        url += `&category=${currentState.category}`;
    }
    if (currentState.tag === 'sales') {
        url += `&sale=true`;
    }
    if (currentState.tag === 'new') {
        url += `&new=true`;
    }
    if (currentState.sort) {
        url += `&sort=${currentState.sort}`;
    }
    if (currentState.search) {
        url += `&search=${encodeURIComponent(currentState.search)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        const products = data.products || [];
        totalPages = data.totalPages || 1;

        if (products.length === 0) {
            productsGrid.innerHTML = '<p class="no-results">No products found. Try adjusting your filters.</p>';
            return;
        }

        productsGrid.innerHTML = products.map(product => renderProductCard(product)).join('');
        renderPagination();
        attachCartButtons();
        attachWishlistButtons();
    } catch (err) {
        console.error(err);
        productsGrid.innerHTML = '<p class="error">Failed to load products. Please try again.</p>';
    }
}

function renderProductCard(product) {
    const isNew = new Date(product.created_at) > new Date(Date.now() - 30*24*60*60*1000);
    const isSale = product.is_on_sale === 1 || product.is_on_sale === true;
    let badgeHtml = '';
    if (isSale) badgeHtml = '<span class="product-badge product-badge--sale">Sale</span>';
    else if (isNew) badgeHtml = '<span class="product-badge product-badge--new">New</span>';

    const imageUrl = product.image ? `${API_BASE_URL}/uploads/${product.image}` : 'https://via.placeholder.com/300x300?text=No+Image';
    const categoryName = product.category_name || 'Uncategorized';
    const priceHtml = isSale && product.old_price
        ? `<span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
           <span class="product-price product-price--was">$${parseFloat(product.old_price).toFixed(2)}</span>`
        : `<span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>`;

    return `
        <article class="product-card">
            <div class="product-media">
                <a href="product.html?id=${product.id}">
                    <img src="${imageUrl}" alt="${escapeHtml(product.name)}">
                </a>
                ${badgeHtml}
                <button class="product-wish" data-product-id="${product.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <div class="product-body">
                <div class="product-category">${escapeHtml(categoryName)}</div>
                <h3 class="product-title">${escapeHtml(product.name)}</h3>
                <div class="product-meta">${priceHtml}</div>
            </div>
            <button class="product-add" data-product-id="${product.id}">Add to Cart</button>
        </article>
    `;
}

// ---------- Pagination ----------
function renderPagination() {
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    let html = '';
    if (currentState.page > 1) {
        html += `<button class="page-btn" data-page="${currentState.page - 1}">Prev</button>`;
    }
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentState.page - 2 && i <= currentState.page + 2)) {
            html += `<button class="page-btn ${i === currentState.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentState.page - 3 || i === currentState.page + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    if (currentState.page < totalPages) {
        html += `<button class="page-btn" data-page="${currentState.page + 1}">Next</button>`;
    }
    paginationDiv.innerHTML = html;
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (!isNaN(page)) {
                currentState.page = page;
                loadProducts();
                updateURL();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// ---------- Cart & Wishlist ----------
async function addToCart(productId, quantity = 1) {
    const token = getAuthToken();
    if (!token) {
        alert('Please login to add items to cart');
        window.location.href = 'login.html';
        return false;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/cart`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ product_id: productId, quantity })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Added to cart!');
            return true;
        } else {
            alert(data.message || 'Failed to add');
            return false;
        }
    } catch (err) {
        alert('Network error');
        return false;
    }
}

function attachCartButtons() {
    document.querySelectorAll('.product-add').forEach(btn => {
        btn.removeEventListener('click', cartClickHandler);
        btn.addEventListener('click', cartClickHandler);
    });
}

async function cartClickHandler(e) {
    const btn = e.currentTarget;
    const productId = btn.dataset.productId;
    if (productId) {
        btn.disabled = true;
        btn.textContent = 'Adding...';
        await addToCart(productId, 1);
        btn.disabled = false;
        btn.textContent = 'Add to Cart';
    }
}

function attachWishlistButtons() {
    document.querySelectorAll('.product-wish').forEach(btn => {
        btn.removeEventListener('click', wishlistClickHandler);
        btn.addEventListener('click', wishlistClickHandler);
    });
}

function wishlistClickHandler(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const productId = btn.dataset.productId;
    alert(`Wishlist feature coming soon! Product ID: ${productId}`);
}

// ---------- Sort & Search ----------
function initSortAndSearch() {
    sortSelect.addEventListener('change', () => {
        currentState.sort = sortSelect.value;
        currentState.page = 1;
        loadProducts();
        updateURL();
    });
    searchBtn.addEventListener('click', () => {
        currentState.search = searchInput.value.trim();
        currentState.page = 1;
        loadProducts();
        updateURL();
    });
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            currentState.search = searchInput.value.trim();
            currentState.page = 1;
            loadProducts();
            updateURL();
        }
    });
}

// ---------- URL Sync ----------
function updateURL() {
    const params = new URLSearchParams();
    if (currentState.page > 1) params.set('page', currentState.page);
    if (currentState.category !== 'all') params.set('category', currentState.category);
    if (currentState.tag !== 'all') params.set('tag', currentState.tag);
    if (currentState.sort !== 'newest') params.set('sort', currentState.sort);
    if (currentState.search) params.set('search', currentState.search);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('page')) currentState.page = parseInt(params.get('page'));
    if (params.has('category')) currentState.category = params.get('category');
    if (params.has('tag')) currentState.tag = params.get('tag');
    if (params.has('sort')) currentState.sort = params.get('sort');
    if (params.has('search')) currentState.search = params.get('search');
    if (currentState.search) searchInput.value = currentState.search;
    if (currentState.sort) sortSelect.value = currentState.sort;
    setTimeout(() => {
        if (currentState.category !== 'all') {
            const catBtn = document.querySelector(`#category-filters .filter-chip[data-category="${currentState.category}"]`);
            if (catBtn) catBtn.click();
        }
        if (currentState.tag !== 'all') {
            const tagBtn = document.querySelector(`#tag-filters .filter-chip[data-tag="${currentState.tag}"]`);
            if (tagBtn) tagBtn.click();
        }
    }, 100);
}

// ---------- Helper ----------
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ---------- Initialization ----------
document.addEventListener('headerLoaded', async () => {
    await updateHeaderAuth();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginListItem')) {
        await updateHeaderAuth();
    }
    await loadCategories();
    attachTagListeners();
    initSortAndSearch();
    loadFromURL();
    await loadProducts();
});