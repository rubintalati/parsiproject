/**
 * Authentication JavaScript for The Parsi Project
 * 
 * This file handles:
 * 1. Email/password authentication
 * 2. Google OAuth integration
 * 3. Password reset functionality
 * 4. Integration with existing user profile system
 */

document.addEventListener('DOMContentLoaded', function() {
    // UI Elements
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const resetPasswordModal = document.getElementById('resetPasswordModal');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    const modalClose = document.querySelector('.modal .close');
    const googleLoginButton = document.getElementById('googleLogin');
    const googleSignupButton = document.getElementById('googleSignup');

    // Configuration
    const API_URL = 'http://localhost:5000/api';
    const GOOGLE_CLIENT_ID = '813349114013-vif0k26ik7ngq44b82lqsur12654vl21.apps.googleusercontent.com'; 

    // Initialize Google OAuth client 
    const googleClientId = GOOGLE_CLIENT_ID;
    let googleAuth;

    // Load Google OAuth API
    gapi.load('auth2', function() {
        googleAuth = gapi.auth2.init({
            client_id: googleClientId,
            cookiepolicy: 'single_host_origin'
        });

        // Attach Google Sign-In to buttons
        googleAuth.attachClickHandler(googleLoginButton, {},
            onGoogleSignInSuccess, onGoogleSignInFailure);
        googleAuth.attachClickHandler(googleSignupButton, {},
            onGoogleSignInSuccess, onGoogleSignInFailure);
    });

    // Tab switching logic
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding form
            authForms.forEach(form => {
                if (form.id === `${targetTab}Form`) {
                    form.classList.add('active');
                } else {
                    form.classList.remove('active');
                }
            });
        });
    });

    // Show/hide reset password modal
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetPasswordModal.style.display = 'block';
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', function() {
            resetPasswordModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === resetPasswordModal) {
            resetPasswordModal.style.display = 'none';
        }
    });

    // Form Submissions
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Validate form
            if (!validateEmail(email)) {
                showFormError(document.getElementById('loginEmail'), 'Please enter a valid email address');
                return;
            }

            // Call API to login (to be implemented with backend)
            loginWithEmail(email, password, rememberMe);
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsAgreed = document.getElementById('termsAgreement').checked;
            
            // Validate form
            if (!validateName(firstName)) {
                showFormError(document.getElementById('firstName'), 'Please enter your first name');
                return;
            }

            if (!validateEmail(email)) {
                showFormError(document.getElementById('signupEmail'), 'Please enter a valid email address');
                return;
            }

            if (!validatePassword(password)) {
                showFormError(document.getElementById('signupPassword'), 'Password must be at least 8 characters with a number and special character');
                return;
            }

            if (password !== confirmPassword) {
                showFormError(document.getElementById('confirmPassword'), 'Passwords do not match');
                return;
            }

            if (!termsAgreed) {
                alert('Please agree to the terms and conditions');
                return;
            }

            // Call API to register (to be implemented with backend)
            registerWithEmail(firstName, lastName, email, password);
        });
    }

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value;
            
            // Validate email
            if (!validateEmail(email)) {
                showFormError(document.getElementById('resetEmail'), 'Please enter a valid email address');
                return;
            }

            // Call API to send reset link (to be implemented with backend)
            requestPasswordReset(email);
        });
    }

    // Form validation helpers
    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function validatePassword(password) {
        // At least 8 chars, 1 number, 1 special character
        const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        return re.test(password);
    }

    function validateName(name) {
        return name.trim().length > 0;
    }

    function showFormError(inputElement, message) {
        const formGroup = inputElement.parentElement;
        formGroup.classList.add('form-error');
        
        // Create or update error text
        let errorText = formGroup.querySelector('.error-text');
        if (!errorText) {
            errorText = document.createElement('div');
            errorText.className = 'error-text';
            formGroup.appendChild(errorText);
        }
        errorText.textContent = message;
        
        // Remove error after 3 seconds
        setTimeout(() => {
            formGroup.classList.remove('form-error');
        }, 3000);
    }

    // Show success message in the form
    function showSuccessMessage(form, message) {
        // Create success message element if it doesn't exist
        let successMessage = form.querySelector('.success-message');
        if (!successMessage) {
            successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            form.appendChild(successMessage);
        }
        
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }

    // Google Auth Callbacks
    function onGoogleSignInSuccess(googleUser) {
        const profile = googleUser.getBasicProfile();
        const id_token = googleUser.getAuthResponse().id_token;
        
        // Extract user data from Google profile
        const userData = {
            googleId: profile.getId(),
            firstName: profile.getGivenName(),
            lastName: profile.getFamilyName(),
            email: profile.getEmail(),
            imageUrl: profile.getImageUrl(),
            idToken: id_token
        };

        // Call API to handle Google sign-in/sign-up (to be implemented with backend)
        authenticateWithGoogle(userData);
    }

    function onGoogleSignInFailure(error) {
        console.error('Google Sign-In failed:', error);
        alert('Google Sign-In failed. Please try again or use email login.');
    }

    // API calls (to be connected to backend)
    async function loginWithEmail(email, password, rememberMe) {
        try {
            // Simulate API call (replace with actual backend call)
            console.log('Logging in with:', { email, password, rememberMe });
            
            // For demo/development only - simulated success response
            // This should be replaced with actual API call
            const response = await simulateApiCall({ email, password });
            
            if (response.success) {
                // Store auth token
                localStorage.setItem('authToken', response.token);
                
                // Merge with existing user profile data
                mergeUserProfile(response.user);
                
                // Redirect to home page
                window.location.href = '../index.html';
            } else {
                // Show error
                alert(response.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login. Please try again.');
        }
    }

    async function registerWithEmail(firstName, lastName, email, password) {
        try {
            // Simulate API call (replace with actual backend call)
            console.log('Registering with:', { firstName, lastName, email, password });
            
            // For demo/development only - simulated success response
            const response = await simulateApiCall({ 
                firstName, 
                lastName, 
                email, 
                password 
            });
            
            if (response.success) {
                // Show success message
                showSuccessMessage(signupForm, 'Account created successfully! You can now log in.');
                
                // Switch to login tab
                document.querySelector('[data-tab="login"]').click();
            } else {
                // Show error
                alert(response.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('An error occurred during registration. Please try again.');
        }
    }

    async function authenticateWithGoogle(userData) {
        try {
            // Simulate API call (replace with actual backend call)
            console.log('Authenticating with Google:', userData);
            
            // For demo/development only - simulated success response
            const response = await simulateApiCall(userData);
            
            if (response.success) {
                // Store auth token
                localStorage.setItem('authToken', response.token);
                
                // Merge with existing user profile data
                mergeUserProfile(response.user);
                
                // Redirect to home page
                window.location.href = '../index.html';
            } else {
                // Show error
                alert(response.message || 'Google authentication failed. Please try again.');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            alert('An error occurred during Google authentication. Please try again.');
        }
    }

    async function requestPasswordReset(email) {
        try {
            // Simulate API call (replace with actual backend call)
            console.log('Requesting password reset for:', email);
            
            // For demo/development only - simulated success response
            const response = await simulateApiCall({ email });
            
            if (response.success) {
                // Show success message
                showSuccessMessage(resetPasswordForm, 'Password reset link sent to your email!');
                
                // Clear form and close modal after delay
                setTimeout(() => {
                    document.getElementById('resetEmail').value = '';
                    resetPasswordModal.style.display = 'none';
                }, 3000);
            } else {
                // Show error
                alert(response.message || 'Failed to send reset link. Please try again.');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            alert('An error occurred while requesting password reset. Please try again.');
        }
    }

    // Helper to merge user data with existing profile
    function mergeUserProfile(userData) {
        // Get existing user data from localStorage
        const existingData = JSON.parse(localStorage.getItem('parsiUser')) || {
            firstName: 'guest',
            lastName: '',
            type: 'visitor',
            avatar: '0'
        };
        
        // Merge with new data
        const mergedData = {
            ...existingData,
            firstName: userData.firstName || existingData.firstName,
            lastName: userData.lastName || existingData.lastName,
            email: userData.email,
            // Keep existing user type and avatar if available
            type: existingData.type !== 'visitor' ? existingData.type : 'person',
            avatar: existingData.avatar !== '0' ? existingData.avatar : '0'
        };
        
        // Save back to localStorage
        localStorage.setItem('parsiUser', JSON.stringify(mergedData));
        
        // Update UI if needed
        if (typeof updateUserProfile === 'function') {
            updateUserProfile();
        }
    }

    // For development only - simulate API responses
    // This should be replaced with actual backend calls
    async function simulateApiCall(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate successful response
                resolve({
                    success: true,
                    message: 'Operation completed successfully',
                    token: 'sample-jwt-token-' + Math.random().toString(36).substring(2),
                    user: {
                        id: 'user-' + Math.random().toString(36).substring(2),
                        firstName: data.firstName || 'Demo',
                        lastName: data.lastName || 'User',
                        email: data.email || 'demo@example.com'
                    }
                });
            }, 1000); // Simulate network delay
        });
    }

    // Check if user is already logged in
    function checkAuthStatus() {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            // User is logged in, update UI or redirect if needed
            console.log('User is logged in with token:', authToken);
            
            // For demo, you can automatically redirect if user is on login page
            // but already logged in
            /* 
            if (window.location.pathname.includes('/login.html')) {
                window.location.href = '../index.html';
            }
            */
        }
    }

    // Run auth status check on page load
    checkAuthStatus();
});

// Authentication & User Management Script

// Configuration
const API_URL = 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = '813349114013-vif0k26ik7ngq44b82lqsur12654vl21.apps.googleusercontent.com'; 

// DOM Elements
let loginForm;
let signupForm;
let passwordResetForm;
let googleLoginBtn;
let forgotPasswordLink;
let resetPasswordModal;
let resetPasswordCloseBtn;

// Initialize auth functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get form elements
    loginForm = document.getElementById('loginForm');
    signupForm = document.getElementById('signupForm');
    passwordResetForm = document.getElementById('passwordResetForm');
    googleLoginBtn = document.getElementById('googleLoginBtn');
    forgotPasswordLink = document.getElementById('forgotPasswordLink');
    resetPasswordModal = document.getElementById('resetPasswordModal');
    resetPasswordCloseBtn = document.getElementById('resetPasswordClose');

    // Add event listeners
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (passwordResetForm) passwordResetForm.addEventListener('submit', handlePasswordReset);
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', showResetPasswordModal);
    if (resetPasswordCloseBtn) resetPasswordCloseBtn.addEventListener('click', hideResetPasswordModal);

    // Check if user is already logged in
    checkAuthStatus();
    
    // Initialize Google Sign-In API
    // initGoogleSignIn();
});

// Check if user is already authenticated
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    
    if (token) {
        // Redirect from login page if already authenticated
        if (window.location.pathname.includes('/login.html')) {
            window.location.href = '/index.html';
        }
        
        // Update UI for logged in user
        updateUIForAuthenticatedUser();
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Basic validation
    if (!validateEmail(email)) {
        showFormError(emailInput, 'Please enter a valid email address');
        return;
    }
    
    if (password.length < 6) {
        showFormError(passwordInput, 'Password must be at least 6 characters');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        // Attempt API login
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store authentication token
            localStorage.setItem('authToken', data.token);
            
            // Update user profile data
            const userData = {
                firstName: data.user.firstName,
                lastName: data.user.lastName,
                email: data.user.email,
                type: data.user.userType,
                avatar: data.user.avatar
            };
            
            localStorage.setItem('parsiUser', JSON.stringify(userData));
            
            // Redirect to home page
            window.location.href = '/index.html';
        } else {
            throw new Error(data.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Show error message
        const errorMessage = document.getElementById('loginErrorMessage');
        if (errorMessage) {
            errorMessage.textContent = error.message || 'Failed to login. Please try again.';
            errorMessage.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }
    } finally {
        // Reset button state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
    }
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    const firstNameInput = document.getElementById('signupFirstName');
    const lastNameInput = document.getElementById('signupLastName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('signupConfirmPassword');
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    
    // Basic validation
    if (firstName.length < 2) {
        showFormError(firstNameInput, 'First name is required');
        return;
    }
    
    if (!validateEmail(email)) {
        showFormError(emailInput, 'Please enter a valid email address');
        return;
    }
    
    if (password.length < 6) {
        showFormError(passwordInput, 'Password must be at least 6 characters');
        return;
    }
    
    if (password !== confirmPassword) {
        showFormError(confirmPasswordInput, 'Passwords do not match');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;
        
        // Get existing user profile data for avatar and user type
        const existingUserData = JSON.parse(localStorage.getItem('parsiUser')) || {};
        
        // Attempt API signup
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                password,
                userType: existingUserData.type || 'visitor',
                avatar: existingUserData.avatar || '0'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store authentication token
            localStorage.setItem('authToken', data.token);
            
            // Update user profile data
            const userData = {
                firstName: data.user.firstName,
                lastName: data.user.lastName,
                email: data.user.email,
                type: data.user.userType,
                avatar: data.user.avatar
            };
            
            localStorage.setItem('parsiUser', JSON.stringify(userData));
            
            // Redirect to home page
            window.location.href = '/index.html';
        } else {
            throw new Error(data.message || 'Failed to create account');
        }
    } catch (error) {
        console.error('Signup error:', error);
        
        // Show error message
        const errorMessage = document.getElementById('signupErrorMessage');
        if (errorMessage) {
            errorMessage.textContent = error.message || 'Failed to create account. Please try again.';
            errorMessage.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }
    } finally {
        // Reset button state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Sign Up';
        submitBtn.disabled = false;
    }
}

// Handle Google Sign In
function handleGoogleLogin() {
    console.log('Google login button clicked');
    
    // TEMPORARY IMPLEMENTATION WHILE WAITING FOR GOOGLE VERIFICATION
    // This is a mock for testing the Google login flow
    
    // Show loading state on button
    googleLoginBtn.textContent = 'Connecting...';
    googleLoginBtn.disabled = true;
    
    // Simulate Google login delay
    setTimeout(() => {
        // Mock user data as if it came from Google
        const mockGoogleUser = {
            email: 'google.user@example.com',
            firstName: 'Google',
            lastName: 'User',
            picture: 'https://via.placeholder.com/150'
        };
        
        // Call the handleGoogleAuthResponse with mock data
        handleGoogleAuthResponse({
            userInfo: mockGoogleUser,
            idToken: 'mock-google-token-for-testing'
        });
        
        // Reset button
        googleLoginBtn.textContent = 'Continue with Google';
        googleLoginBtn.disabled = false;
    }, 1500);
    
    /* COMMENTED OUT UNTIL GOOGLE VERIFICATION IS COMPLETE
    // This will be triggered when the Google Sign-In API is loaded
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signIn().then(googleUser => {
        // Get user details from Google
        const profile = googleUser.getBasicProfile();
        const id_token = googleUser.getAuthResponse().id_token;
        
        // Get profile information
        const email = profile.getEmail();
        const firstName = profile.getGivenName();
        const lastName = profile.getFamilyName();
        const imageUrl = profile.getImageUrl();
        
        // Send Google token to our backend
        handleGoogleAuthResponse(id_token, {
            email,
            firstName,
            lastName,
            picture: imageUrl
        });
    }).catch(error => {
        console.error('Google Sign-In Error:', error);
        googleLoginBtn.textContent = 'Continue with Google';
        googleLoginBtn.disabled = false;
        
        // Show error message
        alert('Google Sign-In failed. Please try again or use email login.');
    });
    */
}

// Handle Google auth response
async function handleGoogleAuthResponse(googleResponse) {
    try {
        // Show loading state
        googleLoginBtn.textContent = 'Verifying...';
        
        // Get existing user profile data for avatar and user type
        const existingUserData = JSON.parse(localStorage.getItem('parsiUser')) || {};
        
        // Send Google token to our backend
        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idToken: googleResponse.idToken,
                userInfo: googleResponse.userInfo,
                avatar: existingUserData.avatar || '0',
                userType: existingUserData.type || 'visitor'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store authentication token
            localStorage.setItem('authToken', data.token);
            
            // Update user profile data
            const userData = {
                firstName: data.user.firstName,
                lastName: data.user.lastName,
                email: data.user.email,
                type: data.user.userType,
                avatar: data.user.avatar
            };
            
            localStorage.setItem('parsiUser', JSON.stringify(userData));
            
            // Redirect to home page
            window.location.href = '/index.html';
        } else {
            throw new Error(data.message || 'Google authentication failed');
        }
    } catch (error) {
        console.error('Google auth error:', error);
        
        // Show error message
        alert('Google Sign-In failed. Please try again or use email login.');
    } finally {
        // Reset button state
        googleLoginBtn.textContent = 'Continue with Google';
        googleLoginBtn.disabled = false;
    }
}

// Initialize Google Sign-In API
function initGoogleSignIn() {
    // Load Google Sign-In API script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/platform.js';
    script.onload = () => {
        gapi.load('auth2', () => {
            gapi.auth2.init({
                client_id: GOOGLE_CLIENT_ID
            }).then(() => {
                console.log('Google Sign-In API initialized');
                // Enable Google login button
                if (googleLoginBtn) {
                    googleLoginBtn.disabled = false;
                }
            }).catch(error => {
                console.error('Google Sign-In API initialization error:', error);
            });
        });
    };
    document.head.appendChild(script);
}

// Handle password reset request
async function handlePasswordReset(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('resetEmail');
    const email = emailInput.value.trim();
    
    // Basic validation
    if (!validateEmail(email)) {
        showFormError(emailInput, 'Please enter a valid email address');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = passwordResetForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        // Attempt API password reset
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            const successMessage = document.getElementById('resetSuccessMessage');
            
            if (successMessage) {
                successMessage.style.display = 'block';
                
                // Reset form
                passwordResetForm.reset();
                
                // Hide modal after delay
                setTimeout(() => {
                    hideResetPasswordModal();
                    successMessage.style.display = 'none';
                }, 5000);
            } else {
                alert('Password reset email sent! Please check your inbox.');
                hideResetPasswordModal();
            }
        } else {
            throw new Error(data.message || 'Failed to send password reset email');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        
        // Show error message
        const errorMessage = document.getElementById('resetErrorMessage');
        if (errorMessage) {
            errorMessage.textContent = error.message || 'Failed to send password reset. Please try again.';
            errorMessage.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        } else {
            alert('Error: ' + (error.message || 'Failed to send password reset. Please try again.'));
        }
    } finally {
        // Reset button state
        const submitBtn = passwordResetForm.querySelector('button[type="submit"]');
        submitBtn.textContent = originalBtnText || 'Reset Password';
        submitBtn.disabled = false;
    }
}

// Show/hide reset password modal
function showResetPasswordModal(e) {
    if (e) e.preventDefault();
    if (resetPasswordModal) resetPasswordModal.style.display = 'flex';
}

function hideResetPasswordModal() {
    if (resetPasswordModal) resetPasswordModal.style.display = 'none';
    
    // Reset form and messages
    if (passwordResetForm) passwordResetForm.reset();
    
    const errorMessage = document.getElementById('resetErrorMessage');
    const successMessage = document.getElementById('resetSuccessMessage');
    
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    // Logic to update UI when user is logged in
    console.log('User is authenticated, updating UI');
    
    // Example: Hide login/signup forms, show profile section
    const authForms = document.querySelector('.auth-forms');
    const authProfile = document.querySelector('.auth-profile');
    
    if (authForms && authProfile) {
        authForms.style.display = 'none';
        authProfile.style.display = 'block';
        
        // Get user data and update profile section
        const userData = JSON.parse(localStorage.getItem('parsiUser'));
        
        if (userData) {
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            
            if (profileName) {
                profileName.textContent = `${userData.firstName} ${userData.lastName}`.trim();
            }
            
            if (profileEmail) {
                profileEmail.textContent = userData.email;
            }
        }
    }
}

// Logout function
function logout() {
    // Clear authentication data
    localStorage.removeItem('authToken');
    
    // Redirect to login page
    window.location.href = '/pages/login.html';
}

// Helper function to validate email format
function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

// Show form error
function showFormError(inputElement, message) {
    const formGroup = inputElement.parentElement;
    formGroup.classList.add('form-error');
    
    const errorText = formGroup.querySelector('.error-text');
    if (errorText) {
        errorText.textContent = message;
    }
    
    // Remove error after 3 seconds
    setTimeout(() => {
        formGroup.classList.remove('form-error');
    }, 3000);
}

/**
 * Authentication module for Parsi Project
 * Supports local storage fallback when server is unavailable
 */

const AUTH = {
  // API URL - change this to match your server
  apiUrl: 'http://localhost:5000/api',
  
  // Store user token in localStorage
  token: localStorage.getItem('token'),
  
  // Store user data in localStorage
  user: JSON.parse(localStorage.getItem('user')) || {},
  
  // Check if user is logged in
  isLoggedIn() {
    return !!this.token && !!this.user;
  },
  
  // Register new user
  async register(userData) {
    try {
      // Try server-side registration first
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.token = data.token;
        this.user = data.user;
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.warn('Server connection failed, using fallback mode');
      
      // Fallback to localStorage simulation
      // Check if email already exists in localStorage
      const existingUsers = JSON.parse(localStorage.getItem('mock_users')) || [];
      if (existingUsers.find(u => u.email === userData.email)) {
        return { success: false, message: 'Email already in use' };
      }
      
      // Create a mock user
      const mockUser = {
        id: Date.now().toString(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        userType: userData.userType || 'visitor',
        avatar: userData.avatar || '0'
      };
      
      // Store in mock database
      existingUsers.push(mockUser);
      localStorage.setItem('mock_users', JSON.stringify(existingUsers));
      
      // Log user in
      localStorage.setItem('token', 'mock-token-' + mockUser.id);
      localStorage.setItem('user', JSON.stringify(mockUser));
      this.token = 'mock-token-' + mockUser.id;
      this.user = mockUser;
      
      return { success: true, user: mockUser };
    }
  },
  
  // Login user
  async login(email, password) {
    try {
      // Try server-side login first
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.token = data.token;
        this.user = data.user;
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.warn('Server connection failed, using fallback mode');
      
      // Mock credentials for testing
      if (email === 'demo@example.com' && password === 'password') {
        const mockUser = {
          id: '1',
          firstName: 'Demo',
          lastName: 'User',
          email: 'demo@example.com',
          userType: 'visitor',
          avatar: '0'
        };
        
        // Store token and user data
        localStorage.setItem('token', 'mock-token-1');
        localStorage.setItem('user', JSON.stringify(mockUser));
        this.token = 'mock-token-1';
        this.user = mockUser;
        
        return { success: true, user: mockUser };
      }
      
      // Check mock users
      const existingUsers = JSON.parse(localStorage.getItem('mock_users')) || [];
      const mockUser = existingUsers.find(u => u.email === email);
      
      if (mockUser) {
        // In real app we'd verify password here, but for mock we'll accept any password
        localStorage.setItem('token', 'mock-token-' + mockUser.id);
        localStorage.setItem('user', JSON.stringify(mockUser));
        this.token = 'mock-token-' + mockUser.id;
        this.user = mockUser;
        
        return { success: true, user: mockUser };
      }
      
      return { success: false, message: 'Invalid credentials' };
    }
  },
  
  // Login with Google
  async googleLogin(userInfo) {
    try {
      // Try server-side Google auth first
      const response = await fetch(`${this.apiUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          idToken: 'mock-google-token',
          userInfo // Pass Google user info directly for testing
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.token = data.token;
        this.user = data.user;
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.warn('Server connection failed, using fallback mode');
      
      // Create a mock Google user
      const { email, firstName, lastName, picture } = userInfo;
      
      // Check if user exists
      const existingUsers = JSON.parse(localStorage.getItem('mock_users')) || [];
      let mockUser = existingUsers.find(u => u.email === email);
      
      if (!mockUser) {
        // Create new user
        mockUser = {
          id: Date.now().toString(),
          firstName,
          lastName,
          email,
          googleId: 'google-' + email,
          userType: 'visitor',
          avatar: '0'
        };
        
        // Add to mock database
        existingUsers.push(mockUser);
        localStorage.setItem('mock_users', JSON.stringify(existingUsers));
      }
      
      // Store token and user data
      localStorage.setItem('token', 'mock-token-' + mockUser.id);
      localStorage.setItem('user', JSON.stringify(mockUser));
      this.token = 'mock-token-' + mockUser.id;
      this.user = mockUser;
      
      return { success: true, user: mockUser };
    }
  },
  
  // Logout user
  logout() {
    // Remove token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token = null;
    this.user = {};
    return { success: true };
  },
  
  // Get current user
  getCurrentUser() {
    return this.user;
  },
  
  // Update user profile
  async updateProfile(userData) {
    try {
      // Try server-side update first
      const response = await fetch(`${this.apiUrl}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local user data
        this.user = data.data;
        localStorage.setItem('user', JSON.stringify(this.user));
        return { success: true, user: this.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.warn('Server connection failed, using fallback mode');
      
      // Update user in localStorage
      const updatedUser = { ...this.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.user = updatedUser;
      
      // Update mock users if exists
      const existingUsers = JSON.parse(localStorage.getItem('mock_users')) || [];
      const userIndex = existingUsers.findIndex(u => u.email === this.user.email);
      
      if (userIndex !== -1) {
        existingUsers[userIndex] = { ...existingUsers[userIndex], ...userData };
        localStorage.setItem('mock_users', JSON.stringify(existingUsers));
      }
      
      return { success: true, user: updatedUser };
    }
  },
  
  // Request password reset
  async forgotPassword(email) {
    try {
      // Try server-side password reset
      const response = await fetch(`${this.apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('Server connection failed, using fallback mode');
      
      // Check if user exists in mock users
      const existingUsers = JSON.parse(localStorage.getItem('mock_users')) || [];
      const mockUser = existingUsers.find(u => u.email === email);
      
      if (!mockUser && email !== 'demo@example.com') {
        return { success: false, message: 'User not found' };
      }
      
      // Generate mock reset token and store in localStorage
      const resetToken = Math.random().toString(36).substring(2, 15);
      const resetTokens = JSON.parse(localStorage.getItem('mock_reset_tokens')) || {};
      
      resetTokens[resetToken] = {
        email,
        expires: Date.now() + 600000 // 10 minutes
      };
      
      localStorage.setItem('mock_reset_tokens', JSON.stringify(resetTokens));
      
      // Show reset link in console for testing
      console.log(`MOCK RESET LINK: ${window.location.origin}/pages/reset-password.html?token=${resetToken}`);
      
      return { 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent. Check the console for the mock link.' 
      };
    }
  },
  
  // Reset password with token
  async resetPassword(token, password) {
    try {
      // Try server-side password reset
      const response = await fetch(`${this.apiUrl}/auth/reset-password/${token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.token = data.token;
        this.user = data.user;
      }
      
      return data;
    } catch (error) {
      console.warn('Server connection failed, using fallback mode');
      
      // Check if token exists and is valid
      const resetTokens = JSON.parse(localStorage.getItem('mock_reset_tokens')) || {};
      const tokenData = resetTokens[token];
      
      if (!tokenData || tokenData.expires < Date.now()) {
        return { success: false, message: 'Invalid or expired token' };
      }
      
      const email = tokenData.email;
      
      // Update password for mock user
      if (email === 'demo@example.com') {
        // Can't update demo user password
        const mockUser = {
          id: '1',
          firstName: 'Demo',
          lastName: 'User',
          email: 'demo@example.com',
          userType: 'visitor',
          avatar: '0'
        };
        
        // Store token and user data
        localStorage.setItem('token', 'mock-token-1');
        localStorage.setItem('user', JSON.stringify(mockUser));
        this.token = 'mock-token-1';
        this.user = mockUser;
        
        // Remove used token
        delete resetTokens[token];
        localStorage.setItem('mock_reset_tokens', JSON.stringify(resetTokens));
        
        return { success: true, message: 'Password reset successful' };
      }
      
      // Update password for real mock user
      const existingUsers = JSON.parse(localStorage.getItem('mock_users')) || [];
      const userIndex = existingUsers.findIndex(u => u.email === email);
      
      if (userIndex !== -1) {
        // Updated user
        const updatedUser = { ...existingUsers[userIndex] };
        existingUsers[userIndex] = updatedUser;
        localStorage.setItem('mock_users', JSON.stringify(existingUsers));
        
        // Store token and user data
        localStorage.setItem('token', 'mock-token-' + updatedUser.id);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.token = 'mock-token-' + updatedUser.id;
        this.user = updatedUser;
        
        // Remove used token
        delete resetTokens[token];
        localStorage.setItem('mock_reset_tokens', JSON.stringify(resetTokens));
        
        return { success: true, message: 'Password reset successful' };
      }
      
      return { success: false, message: 'User not found' };
    }
  }
};

// Initialize Google Sign-In
function initGoogleSignIn() {
  // This is a mock implementation for testing
  // In production, you would use the actual Google Sign-In API
  window.mockGoogleSignIn = function() {
    // Simulate Google sign-in
    const googleUser = {
      email: 'google-user@example.com',
      firstName: 'Google',
      lastName: 'User',
      picture: 'https://via.placeholder.com/150'
    };
    
    // Call the Google login function
    AUTH.googleLogin(googleUser)
      .then(result => {
        if (result.success) {
          // Update UI for logged-in user
          updateAuthUI();
          
          // Redirect to home page or dashboard
          window.location.href = '/index.html';
        } else {
          alert('Google login failed: ' + result.message);
        }
      });
  };
}

// Update UI based on authentication state
function updateAuthUI() {
  const loginButtons = document.querySelectorAll('.login-button, .signup-button');
  const profileButtons = document.querySelectorAll('.profile-button, .logout-button');
  const userNameElements = document.querySelectorAll('.user-name');
  
  if (AUTH.isLoggedIn()) {
    // User is logged in
    
    // Hide login/signup buttons
    loginButtons.forEach(button => {
      button.style.display = 'none';
    });
    
    // Show profile/logout buttons
    profileButtons.forEach(button => {
      button.style.display = 'inline-block';
    });
    
    // Update user name elements
    userNameElements.forEach(element => {
      element.textContent = `${AUTH.user.firstName} ${AUTH.user.lastName}`;
    });
    
    // Update avatar if exists
    const avatarElements = document.querySelectorAll('.user-avatar');
    avatarElements.forEach(element => {
      element.src = `/images/avatars/${AUTH.user.avatar || '0'}.png`;
    });
  } else {
    // User is not logged in
    
    // Show login/signup buttons
    loginButtons.forEach(button => {
      button.style.display = 'inline-block';
    });
    
    // Hide profile/logout buttons
    profileButtons.forEach(button => {
      button.style.display = 'none';
    });
  }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Google Sign-In
  initGoogleSignIn();
  
  // Update UI based on authentication state
  updateAuthUI();
  
  // Add event listeners for logout buttons
  const logoutButtons = document.querySelectorAll('.logout-button');
  logoutButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      AUTH.logout();
      updateAuthUI();
      window.location.href = '/index.html';
    });
  });
});

// Export AUTH object
window.AUTH = AUTH;
