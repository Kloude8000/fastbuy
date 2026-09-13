// ============================================
// USER PROFILE PAGE
// ============================================

// ---------- Profile Management ----------
async function loadProfile() {
    if (!requireAuth()) return;

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/profile`);
        if (!response.ok) throw new Error('Failed to load profile');
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
        const response = await apiFetch(`${API_BASE_URL}/api/profile`, {
            method: 'PUT',
            body: JSON.stringify({ name, email }),
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
        const response = await apiFetch(`${API_BASE_URL}/api/profile/password`, {
            method: 'PUT',
            body: JSON.stringify({ oldPassword, newPassword }),
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
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    loadProfile();

    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    profileForm.addEventListener('submit', updateProfile);
    passwordForm.addEventListener('submit', changePassword);
});