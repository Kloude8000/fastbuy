// ============================================
// FASTBUY - HOME PAGE DYNAMIC CONTENT
// FULLY INTEGRATED WITH SALE FILTER (BACKEND)
// ============================================

const API_BASE_URL = 'https://fastbuy-iewu.onrender.com/';

// Helper: Get auth token
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function clearAuth() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
}

function authHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// ==================== HEADER AUTH ====================
async function updateHeaderAuth() {
    const loginListItem = document.getElementById('loginListItem');
    const userListItem = document.getElementById('userListItem');
    const userDisplayName = document.getElementById('userDisplayName');
    const logoutLink = document.getElementById('logoutLink');
    const cartIcon = document.getElementById('cartIconLink');
    const adminLink = document.getElementById('adminLink');  // added

    const token = getAuthToken();
    if (!token) {
        if (loginListItem) loginListItem.style.display = '';
        if (userListItem) userListItem.style.display = 'none';
        if (cartIcon) cartIcon.href = 'login.html';
        if (adminLink) adminLink.style.display = 'none';  // hide admin link
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
            
            // Show admin link only if user.role is 'admin'
            if (adminLink) {
                if (user.role === 'admin') {
                    adminLink.style.display = 'inline';
                } else {
                    adminLink.style.display = 'none';
                }
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

// ==================== LOAD CATEGORIES ====================
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        if (!response.ok) throw new Error('Failed to load categories');
        const categories = await response.json();

        const categoryFilterContainer = document.querySelector('.filter-chips[role="group"][aria-labelledby="category-label"]');
        if (!categoryFilterContainer) return;

        const allButton = categoryFilterContainer.querySelector('[data-category="all"]');
        categoryFilterContainer.innerHTML = '';
        if (allButton) {
            allButton.setAttribute('data-category', 'all');
            categoryFilterContainer.appendChild(allButton);
        } else {
            const allBtn = document.createElement('button');
            allBtn.type = 'button';
            allBtn.className = 'filter-chip is-active';
            allBtn.setAttribute('data-filter-role', 'category');
            allBtn.setAttribute('data-category', 'all');
            allBtn.setAttribute('aria-pressed', 'true');
            allBtn.textContent = 'All';
            categoryFilterContainer.appendChild(allBtn);
        }

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filter-chip';
            btn.setAttribute('data-filter-role', 'category');
            btn.setAttribute('data-category', cat.id);
            btn.setAttribute('aria-pressed', 'false');
            btn.textContent = cat.name;
            categoryFilterContainer.appendChild(btn);
        });

        attachFilterListeners();
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

// ==================== PRODUCT LOADING ====================
let currentFilters = {
    category: 'all',
    tag: 'all'
};

async function loadProducts() {
    const grid = document.getElementById('featured-grid');
    const emptyMsg = document.getElementById('featured-empty');
    if (!grid) return;

    grid.innerHTML = '<div class="loading-spinner">Loading products...</div>';
    if (emptyMsg) emptyMsg.hidden = true;

    try {
        let products = [];

        const isDefaultView = (currentFilters.category === 'all' && currentFilters.tag === 'all');
        
        if (isDefaultView) {
            const response = await fetch(`${API_BASE_URL}/api/products/featured/list`);
            if (!response.ok) throw new Error('Failed to load featured products');
            products = await response.json();
        } else {
            let url = `${API_BASE_URL}/api/products/catalog/list?limit=20`;
            if (currentFilters.category !== 'all') {
                url += `&category=${currentFilters.category}`;
            }
            // ==== UPDATED: Use &new=true for date-based filter
            if (currentFilters.tag === 'new') {
                url += `&new=true`;
            }
            if (currentFilters.tag === 'sales') {
                url += `&sale=true`;
            }
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load products');
            const data = await response.json();
            products = data.products;
        }

        if (products.length === 0) {
            if (emptyMsg) emptyMsg.hidden = false;
            grid.innerHTML = '';
            return;
        }

        grid.innerHTML = products.map(product => renderProductCard(product)).join('');
        attachCartButtons();
        attachWishlistButtons();
    } catch (err) {
        console.error('Error loading products:', err);
        grid.innerHTML = '<p class="error-message">Failed to load products. Please try again later.</p>';
    }
}

function renderProductCard(product) {
    // Determine badge
    let badgeHtml = '';
    const isNew = new Date(product.created_at) > new Date(Date.now() - 30*24*60*60*1000);
    const isSale = product.is_on_sale === 1 || product.is_on_sale === true;  // ==== uses backend flag

    if (isSale) {
        badgeHtml = `<span class="product-badge product-badge--sale">Sale</span>`;
    } else if (isNew) {
        badgeHtml = `<span class="product-badge product-badge--new">New</span>`;
    }

    const imageUrl = product.image 
        ? `${API_BASE_URL}/uploads/${product.image}`
        : 'https://via.placeholder.com/600x600?text=No+Image';
    const categoryName = product.category_name || product.category || 'Uncategorized';

    // Price HTML: show old price crossed out if on sale
    const priceHtml = isSale && product.old_price
        ? `<span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
           <span class="product-price product-price--was">$${parseFloat(product.old_price).toFixed(2)}</span>`
        : `<span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>`;

    return `
        <article class="product-card" data-category="${categoryName.toLowerCase()}" ${isSale ? 'data-sale="true"' : ''} ${isNew ? 'data-new="true"' : ''}>
            <div class="product-media">
                <a class="product-media-link" href="./product.html?id=${product.id}" aria-label="${product.name}">
                    <img src="${imageUrl}" alt="${product.name}" width="600" height="600" loading="lazy" />
                    ${badgeHtml}
                </a>
                <button type="button" class="product-wish" data-product-id="${product.id}" aria-label="Save to wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <a class="product-card-link" href="./product.html?id=${product.id}" style="text-decoration: none;">
                <div class="product-body">
                    <p class="product-category">${escapeHtml(categoryName)}</p>
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <div class="product-meta">
                        ${priceHtml}
                    </div>
                </div>
            </a>
            <button type="button" class="btn btn-primary product-add" data-product-id="${product.id}" data-product-name="${escapeHtml(product.name)}">
                Add to cart
            </button>
        </article>
    `;
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

// ==================== FILTER HANDLERS ====================
function attachFilterListeners() {
    const categoryButtons = document.querySelectorAll('.filter-chip[data-filter-role="category"]');
    const tagButtons = document.querySelectorAll('.filter-chip[data-filter-role="tag"]');

    categoryButtons.forEach(btn => {
        btn.removeEventListener('click', handleCategoryClick);
        btn.addEventListener('click', handleCategoryClick);
    });
    tagButtons.forEach(btn => {
        btn.removeEventListener('click', handleTagClick);
        btn.addEventListener('click', handleTagClick);
    });
}

function handleCategoryClick(e) {
    const btn = e.currentTarget;
    const category = btn.getAttribute('data-category');
    document.querySelectorAll('.filter-chip[data-filter-role="category"]').forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    currentFilters.category = category;
    loadProducts();
}

function handleTagClick(e) {
    const btn = e.currentTarget;
    const tag = btn.getAttribute('data-tag');
    document.querySelectorAll('.filter-chip[data-filter-role="tag"]').forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    currentFilters.tag = tag;
    loadProducts();
}

// ==================== CART ====================
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
            const toast = document.createElement('div');
            toast.textContent = 'Added to cart!';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.backgroundColor = '#4caf50';
            toast.style.color = 'white';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '5px';
            toast.style.zIndex = '9999';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
            return true;
        } else {
            alert(data.message || 'Failed to add item');
            return false;
        }
    } catch (err) {
        console.error('Add to cart error:', err);
        alert('Error adding to cart');
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
    e.preventDefault();
    const btn = e.currentTarget;
    const productId = btn.getAttribute('data-product-id');
    if (productId) {
        btn.disabled = true;
        btn.textContent = 'Adding...';
        await addToCart(productId, 1);
        btn.disabled = false;
        btn.textContent = 'Add to cart';
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
    const productId = btn.getAttribute('data-product-id');
    alert(`Wishlist feature coming soon! Product ID: ${productId}`);
}

// ==================== INITIALIZATION ====================
document.addEventListener('headerLoaded', async () => {
    await updateHeaderAuth();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginListItem')) {
        await updateHeaderAuth();
    }
    await loadCategories();
    await loadProducts();
});