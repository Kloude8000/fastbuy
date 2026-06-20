// API Configuration
const API_BASE_URL = 'https://fastbuy-iewu.onrender.com'; // Change this to your backend URL

// DOM Elements
const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const messageContainer = document.getElementById('messageContainer');

// Input elements
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');

// Error message elements
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmError = document.getElementById('confirmError');

// Real-time validation
nameInput.addEventListener('input', () => validateName());
emailInput.addEventListener('input', () => validateEmail());
passwordInput.addEventListener('input', () => validatePassword());
confirmInput.addEventListener('input', () => validateConfirmPassword());

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    clearMessages();
    
    // Validate all fields
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();
    
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
        showMessage('Please fix the errors above', 'error');
        return;
    }
    
    // Disable button during submission
    setLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Registration successful
            handleSuccess(data);
        } else {
            // Handle different error formats
            handleErrors(response, data);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Unable to connect to server. Please check your internet connection.', 'error');
    } finally {
        setLoading(false);
    }
});

// Validation Functions
function validateName() {
    const name = nameInput.value.trim();
    
    if (!name) {
        showError(nameError, 'Name is required');
        markError(nameInput);
        return false;
    }
    
    if (name.length < 2) {
        showError(nameError, 'Name must be at least 2 characters');
        markError(nameInput);
        return false;
    }
    
    clearError(nameError);
    clearMarkError(nameInput);
    return true;
}

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
    
    if (password.length < 6) {
        showError(passwordError, 'Password must be at least 6 characters');
        markError(passwordInput);
        return false;
    }
    
    clearError(passwordError);
    clearMarkError(passwordInput);
    return true;
}

function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    
    if (!confirm) {
        showError(confirmError, 'Please confirm your password');
        markError(confirmInput);
        return false;
    }
    
    if (password !== confirm) {
        showError(confirmError, 'Passwords do not match');
        markError(confirmInput);
        return false;
    }
    
    clearError(confirmError);
    clearMarkError(confirmInput);
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
        submitBtn.textContent = 'Creating account...';
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}

function handleSuccess(data) {
    // Store authentication token
    if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    showMessage(data.message || 'Registration successful! Redirecting...', 'success');
    
    // Redirect to login or home page after 2 seconds
    setTimeout(() => {
        window.location.href = '/pages/login.html';
    }, 2000);
}

function handleErrors(response, data) {
    // Handle express-validator errors format
    if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach(error => {
            if (error.path === 'name') {
                showError(nameError, error.msg);
                markError(nameInput);
            } else if (error.path === 'email') {
                showError(emailError, error.msg);
                markError(emailInput);
            } else if (error.path === 'password') {
                showError(passwordError, error.msg);
                markError(passwordInput);
            }
        });
        showMessage('Please fix the validation errors', 'error');
    }
    // Handle simple message error
    else if (data.message) {
        if (response.status === 400 && data.message === 'User already exists') {
            showError(emailError, 'This email is already registered');
            markError(emailInput);
            showMessage('Account already exists. Please login instead.', 'error');
        } else {
            showMessage(data.message, 'error');
        }
    }
    // Handle unknown error
    else {
        showMessage('Registration failed. Please try again.', 'error');
    }
}