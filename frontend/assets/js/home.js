// ============================================
// FASTBUY - HOME PAGE DYNAMIC CONTENT
// ============================================

// ==================== LOAD CATEGORIES ====================
async function loadCategories() {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/categories`, {
            redirectOn401: false,
        });
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
            const response = await apiFetch(`${API_BASE_URL}/api/products/featured/list`, {
                redirectOn401: false,
            });
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
            const response = await apiFetch(url, { redirectOn401: false });
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

    const imageUrl = uploadUrl(product.image);
    const categoryName = product.category_name || product.category || 'Uncategorized';

    // Price HTML: show old price crossed out if on sale
    const priceHtml = isSale && product.old_price
        ? `<span class="product-price">${formatGhs(product.price)}</span>
           <span class="product-price product-price--was">${formatGhs(product.old_price)}</span>`
        : `<span class="product-price">${formatGhs(product.price)}</span>`;

    return `
        <article class="product-card" data-category="${categoryName.toLowerCase()}" ${isSale ? 'data-sale="true"' : ''} ${isNew ? 'data-new="true"' : ''}>
            <div class="product-media">
                <a class="product-media-link" href="/pages/product.html?id=${product.id}" aria-label="${escapeAttr(product.name)}">
                    <img src="${imageUrl}" alt="${escapeAttr(product.name)}" width="600" height="600" loading="lazy" />
                    ${badgeHtml}
                </a>
                <button type="button" class="product-wish" data-product-id="${product.id}" aria-label="Save to wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <a class="product-card-link" href="/pages/product.html?id=${product.id}" style="text-decoration: none;">
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
        showToast('Please log in to add items to cart', 'info');
        window.location.href = '/pages/login.html';
        return false;
    }

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/cart`, {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity }),
        });
        const data = await response.json();
        if (response.ok) {
            window.location.href = '/pages/cart.html';
            return true;
        }
        showToast(data.message || 'Failed to add item', 'error');
        return false;
    } catch (err) {
        if (err instanceof ApiError) return false;
        console.error('Add to cart error:', err);
        showToast('Error adding to cart', 'error');
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

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    await loadProducts();
});