/**
 * Authentication Module for EASYSHIP NG
 * Enhanced with:
 * - Better validation
 * - Role-based redirects
 * - Session management
 * - Auto-login detection
 * - Better error handling
 */

const Auth = (() => {

    // ========================================
    // Configuration
    // ========================================
    
    const ROLES = {
        CUSTOMER: 'customer',
        RIDER: 'rider',
        ADMIN: 'admin'
    };

    const REDIRECTS = {
        [ROLES.CUSTOMER]: '/User/index.html',
        [ROLES.RIDER]: '/Rider/rider-dashboard.html',
        [ROLES.ADMIN]: '/Admin/index.html'
    };

    // ========================================
    // Initialization
    // ========================================
    
    /**
     * Initialize auth event listeners
     */
    const init = () => {
        // Switch between forms
        const gotoSignup = document.getElementById('goto-signup');
        const gotoSignin = document.getElementById('goto-signin');
        
        if (gotoSignup) {
            gotoSignup.addEventListener('click', (e) => {
                e.preventDefault();
                showSignupForm();
            });
        }

        if (gotoSignin) {
            gotoSignin.addEventListener('click', (e) => {
                e.preventDefault();
                showSigninForm();
            });
        }

        // Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(btn => {
    const togglePassword = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            const iconEl = btn.querySelector('[data-lucide]');
            if (iconEl) {
                iconEl.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons({ nodes: [btn] });
                }
            }
        }
    };
    
    // Both click AND touch for mobile
    btn.addEventListener('click', togglePassword);
    btn.addEventListener('touchstart', togglePassword, { passive: true });
});

        // Sign In form submission
        const signinForm = document.getElementById('signin-form-el');
        if (signinForm) {
            signinForm.addEventListener('submit', handleSignin);
        }

        // Sign Up form submission
        const signupForm = document.getElementById('signup-form-el');
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
        }

        // Sign Out button
        const signoutBtn = document.getElementById('signout-btn');
        if (signoutBtn) {
            signoutBtn.addEventListener('click', handleSignout);
        }

        // Enter key support for forms
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const activeForm = document.querySelector('.auth-form.active form');
                if (activeForm) {
                    const submitBtn = activeForm.querySelector('button[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        e.preventDefault();
                        submitBtn.click();
                    }
                }
            }
        });

        // Check for existing session
        checkSession();
    };

    // ========================================
    // Form Navigation
    // ========================================
    
    const showSigninForm = () => {
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');
        if (signinForm) signinForm.classList.add('active');
        if (signupForm) signupForm.classList.remove('active');
        
        // Clear errors
        const form = document.getElementById('signin-form-el');
        if (form) clearFormErrors(form);
        
        // Focus first input
        const firstInput = document.getElementById('signin-email');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    };

    const showSignupForm = () => {
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');
        if (signinForm) signinForm.classList.remove('active');
        if (signupForm) signupForm.classList.add('active');
        
        // Clear errors
        const form = document.getElementById('signup-form-el');
        if (form) clearFormErrors(form);
        
        // Focus first input
        const firstInput = document.getElementById('signup-name');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    };

    // ========================================
    // Form Helpers
    // ========================================
    
    const clearFormErrors = (form) => {
        if (!form) return;
        const errorElements = form.querySelectorAll('.field-error');
        errorElements.forEach(el => el.textContent = '');
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(el => el.classList.remove('error'));
    };

    const setFieldError = (fieldId, message) => {
        const field = document.getElementById(fieldId);
        if (field) field.classList.add('error');
        
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl) {
            errorEl.textContent = message || '';
        }
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validatePhone = (phone) => {
        const cleaned = phone.replace(/\s/g, '');
        return cleaned.length >= 10 && cleaned.length <= 14 && /^[0-9+()\- ]+$/.test(phone);
    };

    const setButtonLoading = (btn, loading) => {
        if (!btn) return;
        btn.disabled = loading;
        const textSpan = btn.querySelector('.btn-text');
        const loaderSpan = btn.querySelector('.btn-loader');
        
        if (textSpan && loaderSpan) {
            if (loading) {
                textSpan.textContent = 'Please wait...';
                loaderSpan.style.display = 'inline-block';
            } else {
                // Restore original text from data attribute
                const originalText = btn.dataset.originalText || 'Submit';
                textSpan.textContent = originalText;
                loaderSpan.style.display = 'none';
            }
        }
    };

    const showToast = (message, type = 'info') => {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message, type);
        } else {
            // Fallback toast
            const container = document.getElementById('toast-container');
            if (container) {
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                toast.innerHTML = `
                    <span class="toast-message">${message}</span>
                    <button class="toast-close">&times;</button>
                `;
                container.appendChild(toast);
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, 3000);
            } else {
                alert(message);
            }
        }
    };

    // ========================================
    // Session Management
    // ========================================
    
    const checkSession = () => {
    const token = API.getToken();
    const user = API.getUser();
    
    if (token && user) {
        updateAuthUI(user);
        const authPage = document.getElementById('auth-page');
        const appShell = document.getElementById('app-shell');
        if (authPage) authPage.classList.remove('active');
        if (appShell) appShell.classList.add('active');
        
        const role = user.role || 'customer';
        const redirects = {
            'customer': '/User/index.html',
            'rider': '/Rider/rider-dashboard.html',
            'admin': '/Admin/index.html'
        };
        const currentPath = window.location.pathname;
        const targetPath = redirects[role] || redirects['customer'];
        
        // ONLY redirect if NOT already on the right page
        if (!currentPath.includes(targetPath.replace('/', ''))) {
            window.location.href = targetPath;
        }
        return true;
    }
    return false;
};

    const updateAuthUI = (user) => {
        if (!user) return;
        
        // Update topbar
        const username = document.getElementById('topbar-username');
        if (username) {
            username.textContent = user.name || user.email || 'User';
        }
        
        const avatar = document.getElementById('topbar-avatar');
        if (avatar) {
            const initial = (user.name || user.email || 'U')[0].toUpperCase();
            avatar.textContent = initial;
        }
        
        // Show app shell, hide auth
        const authPage = document.getElementById('auth-page');
        const appShell = document.getElementById('app-shell');
        
        if (authPage) authPage.classList.remove('active');
        if (appShell) appShell.classList.add('active');
    };

    const redirectBasedOnRole = (user) => {
        if (!user) return;
        
        // Check if user has a role
        const role = user.role || user.userType || 'customer';
        const redirectPath = REDIRECTS[role] || REDIRECTS[ROLES.CUSTOMER];
        
        // Don't redirect if already on the right page
        const currentPath = window.location.pathname;
        const targetPath = new URL(redirectPath, window.location.origin).pathname;
        
        if (currentPath !== targetPath) {
            window.location.href = redirectPath;
        }
    };

    // ========================================
    // Handle Sign In
    // ========================================
    
    const handleSignin = async (e) => {
    e.preventDefault();
    clearFormErrors(e.target);

    // FIX #4: Clean values for mobile (remove hidden characters)
    let email = document.getElementById('signin-email').value.trim().toLowerCase();
    let password = document.getElementById('signin-password').value;
    
    // Remove invisible/hidden characters mobile might add
    password = password.replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim();
    email = email.replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim();

    let hasError = false;

    if (!email) {
        setFieldError('signin-email', 'Email is required');
        hasError = true;
    } else if (!validateEmail(email)) {
        setFieldError('signin-email', 'Enter a valid email address');
        hasError = true;
    }

    if (!password) {
        setFieldError('signin-password', 'Password is required');
        hasError = true;
    } else if (password.length < 6) {
        setFieldError('signin-password', 'Password must be at least 6 characters');
        hasError = true;
    }

    if (hasError) return;

    const btn = document.getElementById('signin-btn');
    btn.dataset.originalText = btn.textContent;
    setButtonLoading(btn, true);

    try {
        const response = await API.signin({ email, password });

        // Handle 403 (pending/rejected/suspended rider)
        if (response.status === 403) {
            showToast(response.message || 'Your account is pending approval. Please wait for admin confirmation.', 'warning');
            setButtonLoading(btn, false);
            return;
        }

        // Handle other non-200 responses
        if (!response.ok || response.status !== 200) {
            showToast(response.message || 'Sign in failed. Please try again.', 'error');
            setButtonLoading(btn, false);
            return;
        }

        // Success - get token and user
        const token = response.token;
        const user = response.user || response.data || {};

        if (token) {
            API.saveAuth(token, user);
            showToast('Welcome back! Signed in successfully.', 'success');

            if (response.redirectPage) {
                setTimeout(() => {
                    window.location.href = response.redirectPage;
                }, 500);
                return;
            }

            updateAuthUI(user);
            setTimeout(() => {
                redirectBasedOnRole(user);
            }, 500);
            
        } else {
            showToast('Sign in successful.', 'success');
            if (user && user.id) {
                API.saveAuth('session', user);
            }
            updateAuthUI(user);
            setTimeout(() => {
                redirectBasedOnRole(user);
            }, 500);
        }
    } catch (error) {
        console.error('Signin error:', error);
        const errorMessage = error.message || 'Sign in failed. Please try again.';
        
        if (errorMessage.toLowerCase().includes('password')) {
            setFieldError('signin-password', 'Invalid password');
        } else if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('user')) {
            setFieldError('signin-email', 'Account not found');
        } else {
            showToast(errorMessage, 'error');
        }
    } finally {
        setButtonLoading(btn, false);
    }
};

    // ========================================
    // Handle Sign Up
    // ========================================
    
    const handleSignup = async (e) => {
        e.preventDefault();
        clearFormErrors(e.target);

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const password = document.getElementById('signup-password').value;

        let hasError = false;

        if (!name) {
            setFieldError('signup-name', 'Full name is required');
            hasError = true;
        } else if (name.length < 2) {
            setFieldError('signup-name', 'Name must be at least 2 characters');
            hasError = true;
        }

        if (!email) {
            setFieldError('signup-email', 'Email is required');
            hasError = true;
        } else if (!validateEmail(email)) {
            setFieldError('signup-email', 'Enter a valid email address');
            hasError = true;
        }

        if (!phone) {
            setFieldError('signup-phone', 'Phone number is required');
            hasError = true;
        } else if (!validatePhone(phone)) {
            setFieldError('signup-phone', 'Enter a valid phone number (10-14 digits)');
            hasError = true;
        }

        if (!password) {
            setFieldError('signup-password', 'Password is required');
            hasError = true;
        } else if (password.length < 6) {
            setFieldError('signup-password', 'Password must be at least 6 characters');
            hasError = true;
        }

        if (hasError) return;

        const btn = document.getElementById('signup-btn');
        btn.dataset.originalText = btn.textContent;
        setButtonLoading(btn, true);

        try {
            const response = await API.signup({ name, email, phone, password });

            if (!response.ok) {
                showToast(response.message || 'Sign up failed. Please try again.', 'error');
                setButtonLoading(btn, false);
                return;
            }

            const token = response.token || response.data?.token || '';
            const user = response.user || response.data?.user || response.data || {};

            if (token) {
                API.saveAuth(token, user);
                showToast('Account created successfully! Welcome to EASYSHIP NG.', 'success');
                updateAuthUI(user);
                setTimeout(() => {
                    redirectBasedOnRole(user);
                }, 500);
            } else {
                showToast('Account created! Please sign in.', 'success');
                showSigninForm();
                const emailField = document.getElementById('signin-email');
                if (emailField) emailField.value = email;
                // Focus password field
                const passwordField = document.getElementById('signin-password');
                if (passwordField) setTimeout(() => passwordField.focus(), 300);
            }
        } catch (error) {
            console.error('Signup error:', error);
            showToast(error.message || 'Sign up failed. Please try again.', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    };

    // ========================================
    // Handle Sign Out
    // ========================================
    
    const handleSignout = async (e) => {
        if (e) e.preventDefault();
        
        // Confirm signout
        if (!confirm('Are you sure you want to sign out?')) {
            return;
        }
        
        const btn = document.getElementById('signout-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>Signing out...</span>';
        }
        
        try {
            await API.signout();
            showToast('You have been signed out.', 'info');
            
            // Reset UI
            const appShell = document.getElementById('app-shell');
            const authPage = document.getElementById('auth-page');
            
            if (appShell) appShell.classList.remove('active');
            if (authPage) authPage.classList.add('active');
            
            // Show signin form
            showSigninForm();
            
            // Clear form fields
            const forms = ['signin-form-el', 'signup-form-el'];
            forms.forEach(formId => {
                const form = document.getElementById(formId);
                if (form) {
                    form.reset();
                    clearFormErrors(form);
                }
            });
            
        } catch (error) {
            console.error('Signout error:', error);
            showToast('Error signing out. Please try again.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="log-out"></i><span>Sign Out</span>';
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }
    };

    // ========================================
    // Public API
    // ========================================
    
    return {
        init,
        showSigninForm,
        showSignupForm,
        handleSignout,
        checkSession,
        updateAuthUI,
        redirectBasedOnRole,
        ROLES,
        REDIRECTS
    };
})();

// ========================================
// Auto-initialize when DOM is ready
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for UI to be ready
    setTimeout(() => {
        try {
            Auth.init();
            console.log('✅ Auth module initialized');
        } catch (error) {
            console.error('❌ Auth initialization error:', error);
        }
    }, 100);
});

// Make Auth globally available
window.Auth = Auth;

console.log('✅ Auth module loaded');