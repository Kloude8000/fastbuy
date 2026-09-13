// DOM Elements
const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const messageContainer = document.getElementById('messageContainer');

// Input elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');

// Error message elements
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

// Check for saved credentials on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSavedCredentials();
});

// Real-time validation
emailInput.addEventListener('input', () => validateEmail());
passwordInput.addEventListener('input', () => validatePassword());

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    clearMessages();
    
    // Validate fields
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    
    if (!isEmailValid || !isPasswordValid) {
        showMessage('Please fix the errors above', 'error');
        return;
    }
    
    // Disable button during submission
    setLoading(true);
    
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            redirectOn401: false,
            headers: { Accept: 'application/json' },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: passwordInput.value
            }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Login successful
            handleSuccess(data);
        } else {
            // Handle error response
            handleErrors(response, data);
        }
    } catch (error) {
        if (error instanceof ApiError) return;
        console.error('Login error:', error);
        showMessage('Unable to connect to server. Please check your internet connection.', 'error');
    } finally {
        setLoading(false);
    }
});

// Validation Functions
function validateEmail() {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
        showError(emailError, 'Email is required');
        markError(emailInput);
        return false;
    }
    
    if (!emailRegex.test(email)) {
        showError(emailError, 'Please enter a valid email address');
        markError(emailInput);
        return false;
    }
    
    clearError(emailError);
    clearMarkError(emailInput);
    return true;
}

function validatePassword() {
    const password = passwordInput.value;
    
    if (!password) {
        showError(passwordError, 'Password is required');
        markError(passwordInput);
        return false;
    }
    
    clearError(passwordError);
    clearMarkError(passwordInput);
    return true;
}

// UI Helper Functions
function showError(errorElement, message) {
    errorElement.textContent = message;
}

function clearError(errorElement) {
    errorElement.textContent = '';
}

function markError(inputElement) {
    inputElement.classList.add('error-input');
}

function clearMarkError(inputElement) {
    inputElement.classList.remove('error-input');
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode === messageContainer) {
            messageDiv.remove();
        }
    }, 5000);
}

function clearMessages() {
    messageContainer.innerHTML = '';
}

function setLoading(loading) {
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
    }
}

function handleSuccess(data) {
    // Store authentication token
    if (data.token) {
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('savedEmail', emailInput.value.trim());
        } else {
            sessionStorage.setItem('authToken', data.token);
        }
    }
    
    showMessage(data.message || 'Login successful! Redirecting...', 'success');
    
    // Redirect to home/dashboard page after 1.5 seconds
    setTimeout(() => {
        // You can change this to your desired page (e.g., 'index.html', 'dashboard.html')
        window.location.href = '/index.html'; // index.html moved up a dir ---------------------------------------
    }, 1500);
}

function handleErrors(response, data) {
    // Handle express-validator errors format
    if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach(error => {
            if (error.path === 'email') {
                showError(emailError, error.msg);
                markError(emailInput);
            } else if (error.path === 'password') {
                showError(passwordError, error.msg);
                markError(passwordInput);
            }
        });
        showMessage('Please fix the validation errors', 'error');
    }
    // Handle simple message error (invalid credentials)
    else if (data.message) {
        if (data.message === 'Invalid credentials') {
            showError(passwordError, 'Incorrect email or password');
            markError(passwordInput);
            showMessage('Login failed. Please check your credentials.', 'error');
        } else {
            showMessage(data.message, 'error');
        }
    }
    // Handle unknown error
    else {
        showMessage('Login failed. Please try again.', 'error');
    }
}

// Remember Me functionality
function loadSavedCredentials() {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
        validateEmail(); // Clear any error styling
    }
}

// Optional: If user is already logged in, redirect to home
function checkAuth() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
        // User already logged in, redirect to home
        window.location.href = '/index.html';
    }
}

// Uncomment the line below to enable auto-redirect if already logged in
// checkAuth();