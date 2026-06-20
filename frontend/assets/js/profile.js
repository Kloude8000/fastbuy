// ============================================
// USER PROFILE PAGE (with Header Auth & Admin Link)
// ============================================

const API_BASE_URL = 'http://localhost:5000';

// Auth helpers
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

function requireAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
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

            // Show admin link only for admin users
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

// ---------- Profile Management ----------
async function loadProfile() {
    if (!requireAuth()) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            headers: authHeaders()
        });
        if (!response.ok) {
            if (response.status === 401) {
                clearAuth();
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to load profile');
        }
        const user = await response.json();
        document.getElementById('name').value = user.name;
        document.getElementById('email').value = user.email;
    } catch (err) {
        console.error('Error loading profile:', err);
        showMessage('profile-message', 'Failed to load profile data.', 'error');
    }
}

async function updateProfile(event) {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const submitBtn = document.getElementById('update-profile-btn');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ name, email })
        });
        const data = await response.json();

        if (response.ok) {
            showMessage('profile-message', 'Profile updated successfully!', 'success');
            // Refresh header to show updated name
            await updateHeaderAuth();
        } else {
            showMessage('profile-message', data.message || 'Update failed.', 'error');
        }
    } catch (err) {
        console.error('Update error:', err);
        showMessage('profile-message', 'Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function changePassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const submitBtn = document.getElementById('change-password-btn');
    const originalText = submitBtn.textContent;

    if (newPassword !== confirmPassword) {
        showMessage('password-message', 'New passwords do not match.', 'error');
        return;
    }
    if (newPassword.length < 6) {
        showMessage('password-message', 'New password must be at least 6 characters.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Changing...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/password`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await response.json();

        if (response.ok) {
            showMessage('password-message', 'Password changed successfully!', 'success');
            document.getElementById('password-form').reset();
        } else {
            showMessage('password-message', data.message || 'Password change failed.', 'error');
        }
    } catch (err) {
        console.error('Password change error:', err);
        showMessage('password-message', 'Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function showMessage(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.textContent = message;
    container.className = `form-message ${type}`;
    container.style.display = 'block';
    setTimeout(() => {
        container.style.display = 'none';
        container.className = 'form-message';
    }, 5000);
}

// ---------- Initialization ----------
document.addEventListener('headerLoaded', async () => {
    await updateHeaderAuth();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginListItem')) {
        await updateHeaderAuth();
    }
    if (!requireAuth()) return;
    loadProfile();

    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    profileForm.addEventListener('submit', updateProfile);
    passwordForm.addEventListener('submit', changePassword);
});