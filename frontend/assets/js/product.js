// ============================================
// FASTBUY - PRODUCT DETAIL PAGE (with Reviews)
// ============================================

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

function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

async function loadProduct() {
    const productId = getProductId();
    if (!productId) {
        window.location.href = '/index.html';
        return;
    }

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}`, {
            redirectOn401: false,
        });
        if (!response.ok) {
            if (response.status === 404) {
                setTextContent('product-name', 'Product not found');
                return;
            }
            throw new Error('Failed to load product');
        }
        const data = await response.json();
        displayProduct(data);
        displayReviews(data.reviews);
        displayRelatedProducts(data.relatedProducts);
        initReviewForm();
    } catch (err) {
        if (err instanceof ApiError) return;
        console.error('Error loading product:', err);
        setTextContent('product-name', 'Error loading product. Please try again later.');
    }
}

function displayProduct(data) {
    const product = data.product;
    
    setTextContent('product-name', product.name);
    setTextContent('product-description', product.description || 'No description available.');
    setTextContent('product-category', product.category_name || 'Uncategorized');
    setTextContent('breadcrumb-product', product.name);

    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    if (product.category_name && breadcrumbCategory) {
        breadcrumbCategory.textContent = product.category_name;
        breadcrumbCategory.href = `/index.html?category=${product.category_id}`;
    }
    
    const imageEl = document.getElementById('product-image');
    if (imageEl) {
        imageEl.src = uploadUrl(product.image);
        imageEl.alt = product.name;
    }
    
    const isOnSale = product.is_on_sale === 1 || product.is_on_sale === true;
    const currentPriceSpan = document.querySelector('#product-pricing .current-price');
    const oldPriceSpan = document.querySelector('#product-pricing .old-price');
    if (currentPriceSpan) {
        currentPriceSpan.textContent = formatGhs(product.price);
    }
    if (oldPriceSpan) {
        if (isOnSale && product.old_price) {
            oldPriceSpan.textContent = formatGhs(product.old_price);
            oldPriceSpan.style.display = 'inline';
        } else {
            oldPriceSpan.style.display = 'none';
        }
    }
    
    const avgRating = parseFloat(data.averageRating) || 0;
    const totalReviews = data.totalReviews || 0;
    const starsEl = document.getElementById('product-stars');
    if (starsEl) starsEl.innerHTML = renderStars(avgRating);
    setTextContent('product-review-count', `(${totalReviews} review${totalReviews !== 1 ? 's' : ''})`);
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
            <a href="/pages/product.html?id=${product.id}">
                <img class="related-product-image" src="${uploadUrl(product.image)}" alt="${escapeAttr(product.name)}">
                <div class="related-product-body">
                    <h3 class="related-product-title">${escapeHtml(product.name)}</h3>
                    <div class="related-product-price">${formatGhs(product.price)}</div>
                </div>
            </a>
        </div>
    `).join('');
}

async function addToCart(productId, quantity) {
    const token = getAuthToken();
    if (!token) {
        showToast('Please log in to add items to cart', 'info');
        window.location.href = '/pages/login.html';
        return false;
    }
    
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/cart`, {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity: parseInt(quantity, 10) }),
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
    selectedRating = parseInt(e.target.dataset.rating, 10);
    document.getElementById('rating-value').value = selectedRating;
    updateStars(selectedRating);
}

function starHoverHandler(e) {
    const hoverRating = parseInt(e.target.dataset.rating, 10);
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
        const response = await apiFetch(`${API_BASE_URL}/api/reviews`, {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, rating, comment }),
        });
        const data = await response.json();
        if (response.ok) {
            messageDiv.textContent = 'Review submitted! Thank you.';
            messageDiv.className = 'success';
            document.getElementById('review-form').reset();
            selectedRating = 0;
            updateStars(0);
            await loadProduct();
        } else {
            messageDiv.textContent = data.message || 'Failed to submit review.';
            messageDiv.className = 'error';
        }
    } catch (err) {
        if (err instanceof ApiError) return;
        console.error('Review submit error:', err);
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadProduct();
    initReviewForm();

    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const quantityInput = document.getElementById('quantity');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const productId = getProductId();
            const quantity = quantityInput ? quantityInput.value : 1;
            addToCart(productId, quantity);
        });
    }
});
