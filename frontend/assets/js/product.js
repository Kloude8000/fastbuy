// ============================================
// FASTBUY - PRODUCT DETAIL PAGE (with Reviews)
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

// ========== HEADER AUTH ==========
async function updateHeaderAuth() {
    const loginListItem = document.getElementById('loginListItem');
    const userListItem = document.getElementById('userListItem');
    const userDisplayName = document.getElementById('userDisplayName');
    const logoutLink = document.getElementById('logoutLink');
    const cartIcon = document.getElementById('cartIconLink');

    const token = getAuthToken();
    if (!token) {
        if (loginListItem) loginListItem.style.display = '';
        if (userListItem) userListItem.style.display = 'none';
        if (cartIcon) cartIcon.href = '/pages/login.html';
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
            if (cartIcon) cartIcon.href = '/pages/cart.html';
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
            if (cartIcon) cartIcon.href = '/pages/login.html';
        }
    } catch (err) {
        console.error('Failed to fetch user profile', err);
    }
}

// ========== PRODUCT LOGIC ==========
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = (rating % 1) >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fas fa-star"></i>';
    if (halfStar) starsHtml += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="far fa-star"></i>';
    return starsHtml;
}

async function loadProduct() {
    const productId = getProductId();
    if (!productId) {
        window.location.href = '/index.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (!response.ok) {
            if (response.status === 404) {
                document.getElementById('product-name').innerHTML = 'Product not found';
                return;
            }
            throw new Error('Failed to load product');
        }
        const data = await response.json();
        displayProduct(data);
        displayReviews(data.reviews);
        displayRelatedProducts(data.relatedProducts);
        // After refreshing product data, re-initialize review form (for logged-in users)
        initReviewForm();
    } catch (err) {
        console.error('Error loading product:', err);
        document.getElementById('product-name').innerHTML = 'Error loading product. Please try again later.';
    }
}

function displayProduct(data) {
    const product = data.product;
    
    document.getElementById('product-name').innerHTML = product.name;
    document.getElementById('product-description').innerHTML = product.description || 'No description available.';
    document.getElementById('product-category').innerHTML = product.category_name || 'Uncategorized';
    document.getElementById('breadcrumb-product').innerHTML = product.name;
    if (product.category_name) {
        document.getElementById('breadcrumb-category').innerHTML = product.category_name;
        document.getElementById('breadcrumb-category').href = `/index.html?category=${product.category_id}`;
    }
    
    const imageUrl = product.image ? `${API_BASE_URL}/uploads/${product.image}` : 'https://via.placeholder.com/600x600?text=No+Image';
    document.getElementById('product-image').src = imageUrl;
    document.getElementById('product-image').alt = product.name;
    
    const isOnSale = product.is_on_sale === 1 || product.is_on_sale === true;
    const currentPriceSpan = document.querySelector('#product-pricing .current-price');
    const oldPriceSpan = document.querySelector('#product-pricing .old-price');
    currentPriceSpan.innerHTML = `$${parseFloat(product.price).toFixed(2)}`;
    if (isOnSale && product.old_price) {
        oldPriceSpan.innerHTML = `$${parseFloat(product.old_price).toFixed(2)}`;
        oldPriceSpan.style.display = 'inline';
    } else {
        oldPriceSpan.style.display = 'none';
    }
    
    const avgRating = parseFloat(data.averageRating) || 0;
    const totalReviews = data.totalReviews || 0;
    document.getElementById('product-stars').innerHTML = renderStars(avgRating);
    document.getElementById('product-review-count').innerHTML = `(${totalReviews} review${totalReviews !== 1 ? 's' : ''})`;
}

function displayReviews(reviews) {
    const reviewsContainer = document.getElementById('reviews-list');
    if (!reviews || reviews.length === 0) {
        reviewsContainer.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
        return;
    }
    
    reviewsContainer.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <span class="review-author">${escapeHtml(review.name)}</span>
                <span class="review-rating">${renderStars(review.rating)}</span>
            </div>
            <div class="review-comment">${escapeHtml(review.comment)}</div>
            <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function displayRelatedProducts(products) {
    const container = document.getElementById('related-grid');
    if (!products || products.length === 0) {
        container.innerHTML = '<p>No related products found.</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="related-product-card">
            <a href="product.html?id=${product.id}">
                <img class="related-product-image" src="${product.image ? API_BASE_URL + '/uploads/' + product.image : 'https://via.placeholder.com/300x300'}" alt="${product.name}">
                <div class="related-product-body">
                    <h3 class="related-product-title">${escapeHtml(product.name)}</h3>
                    <div class="related-product-price">$${parseFloat(product.price).toFixed(2)}</div>
                </div>
            </a>
        </div>
    `).join('');
}

async function addToCart(productId, quantity) {
    const token = getAuthToken();
    if (!token) {
        alert('Please login to add items to cart');
        window.location.href = '/pages/login.html';
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/cart`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ product_id: productId, quantity: parseInt(quantity) })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Added to cart successfully!');
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

function addToWishlist(productId) {
    alert(`Wishlist feature coming soon! Product ID: ${productId}`);
}

// ========== REVIEW SUBMISSION ==========
let selectedRating = 0;

function initReviewForm() {
    const token = getAuthToken();
    const writeReviewDiv = document.getElementById('write-review');
    if (token && writeReviewDiv) {
        writeReviewDiv.style.display = 'block';
        setupStarRating();
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.removeEventListener('submit', handleReviewSubmit);
            reviewForm.addEventListener('submit', handleReviewSubmit);
        }
    } else if (writeReviewDiv) {
        writeReviewDiv.style.display = 'none';
    }
}

function setupStarRating() {
    const stars = document.querySelectorAll('.rating-input .star');
    stars.forEach(star => {
        star.removeEventListener('click', starClickHandler);
        star.removeEventListener('mouseenter', starHoverHandler);
        star.removeEventListener('mouseleave', starLeaveHandler);
        star.addEventListener('click', starClickHandler);
        star.addEventListener('mouseenter', starHoverHandler);
        star.addEventListener('mouseleave', starLeaveHandler);
    });
}

function starClickHandler(e) {
    selectedRating = parseInt(e.target.dataset.rating);
    document.getElementById('rating-value').value = selectedRating;
    updateStars(selectedRating);
}

function starHoverHandler(e) {
    const hoverRating = parseInt(e.target.dataset.rating);
    updateStars(hoverRating, true);
}

function starLeaveHandler() {
    updateStars(selectedRating);
}

function updateStars(rating, isHover = false) {
    const stars = document.querySelectorAll('.rating-input .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
            if (isHover) star.classList.add('hover');
        } else {
            star.classList.remove('selected');
            if (isHover) star.classList.remove('hover');
        }
    });
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const productId = getProductId();
    const rating = selectedRating;
    const comment = document.getElementById('review-comment').value.trim();
    const submitBtn = document.getElementById('submit-review-btn');
    const messageDiv = document.getElementById('review-message');

    if (rating === 0) {
        messageDiv.textContent = 'Please select a rating.';
        messageDiv.className = 'error';
        return;
    }
    if (!comment) {
        messageDiv.textContent = 'Please write a review.';
        messageDiv.className = 'error';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/reviews`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ product_id: productId, rating, comment })
        });
        const data = await response.json();
        if (response.ok) {
            messageDiv.textContent = 'Review submitted! Thank you.';
            messageDiv.className = 'success';
            document.getElementById('review-form').reset();
            selectedRating = 0;
            updateStars(0);
            // Reload product data to show new review and updated rating
            await loadProduct();
        } else {
            messageDiv.textContent = data.message || 'Failed to submit review.';
            messageDiv.className = 'error';
        }
    } catch (err) {
        console.error('Review submit error:', err);
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
}

// ========== HELPERS ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== INITIALIZATION ==========
document.addEventListener('headerLoaded', async () => {
    await updateHeaderAuth();
    initReviewForm();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginListItem')) {
        await updateHeaderAuth();
    }
    loadProduct();

    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const wishlistBtn = document.getElementById('wishlist-btn');
    const quantityInput = document.getElementById('quantity');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const productId = getProductId();
            const quantity = quantityInput ? quantityInput.value : 1;
            addToCart(productId, quantity);
        });
    }
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
            const productId = getProductId();
            addToWishlist(productId);
        });
    }
});