/**
 * Authentication Module for EASYSHIP NG
 */

const Auth = (() => {

    const init = () => {
        // Switch between forms
        document.getElementById('goto-signup').addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });

        document.getElementById('goto-signin').addEventListener('click', (e) => {
            e.preventDefault();
            showSigninForm();
        });

        // Toggle password visibility - FIXED for mobile and PC
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;
                
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                
                // Update icon manually
                const icon = this.querySelector('i');
                if (icon) {
                    if (isPassword) {
                        icon.className = 'fa-regular fa-eye-slash';
                        icon.setAttribute('data-lucide', 'eye-off');
                    } else {
                        icon.className = 'fa-regular fa-eye';
                        icon.setAttribute('data-lucide', 'eye');
                    }
                }
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            });
        });

        // Sign In form submission
        document.getElementById('signin-form-el').addEventListener('submit', handleSignin);

        // Sign Up form submission
        document.getElementById('signup-form-el').addEventListener('submit', handleSignup);

        // Sign Out button
        document.getElementById('signout-btn').addEventListener('click', handleSignout);

        // Check for existing session
        checkSession();
    };

    const showSigninForm = () => {
        document.getElementById('signin-form').classList.add('active');
        document.getElementById('signup-form').classList.remove('active');
        clearFormErrors('signin-form-el');
    };

    const showSignupForm = () => {
        document.getElementById('signup-form').classList.add('active');
        document.getElementById('signin-form').classList.remove('active');
        clearFormErrors('signup-form-el');
    };

    const clearFormErrors = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;
        form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        form.querySelectorAll('input, select, textarea').forEach(el => el.classList.remove('error'));
    };

    const setFieldError = (fieldId, message) => {
        document.getElementById(fieldId)?.classList.add('error');
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl) errorEl.textContent = message;
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
                textSpan.textContent = btn.dataset.originalText || 'Submit';
                loaderSpan.style.display = 'none';
            }
        }
    };

    const showToast = (message, type = 'info') => {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message, type);
        } else {
            alert(message);
        }
    };

    // FIX #1 - Fixed checkSession to properly handle back button
    const checkSession = () => {
        const token = API.getToken();
        const user = API.getUser();
        
        if (token && user) {
            updateAuthUI(user);
            const authPage = document.getElementById('auth-page');
            const appShell = document.getElementById('app-shell');
            if (authPage) authPage.classList.remove('active');
            if (appShell) appShell.classList.add('active');
            
            // Redirect based on role
            const role = user.role || 'customer';
            const redirects = {
                'customer': '/User/index.html',
                'rider': '/Rider/rider-dashboard.html',
                'admin': '/Admin/index.html'
            };
            const currentPath = window.location.pathname;
            const targetPath = redirects[role] || redirects['customer'];
            
            // Only redirect if not already on the right page
            const targetFile = targetPath.split('/').pop();
            const currentFile = currentPath.split('/').pop() || 'index.html';
            if (currentFile !== targetFile && !currentPath.includes('/Admin/') && !currentPath.includes('/Rider/')) {
                window.location.href = targetPath;
            }
            return true;
        }
        return false;
    };

    const updateAuthUI = (user) => {
        const username = document.getElementById('topbar-username');
        if (username) username.textContent = user.name || user.email || 'User';
        const avatar = document.getElementById('topbar-avatar');
        if (avatar) avatar.textContent = (user.name || user.email || 'U')[0].toUpperCase();
    };

    const redirectBasedOnRole = (user) => {
        if (!user) return;
        const role = user.role || 'customer';
        const redirects = {
            'customer': '/User/index.html',
            'rider': '/Rider/rider-dashboard.html',
            'admin': '/Admin/index.html'
        };
        window.location.href = redirects[role] || redirects['customer'];
    };

    const handleSignin = async (e) => {
        e.preventDefault();
        clearFormErrors('signin-form-el');

        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;

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
        }

        if (hasError) return;

        const btn = document.getElementById('signin-btn');
        btn.dataset.originalText = btn.textContent;
        setButtonLoading(btn, true);

        try {
            const response = await API.signin({ email, password });

            if (response.status === 403) {
                showToast(response.message || 'Account pending approval.', 'warning');
                setButtonLoading(btn, false);
                return;
            }

            if (!response.ok) {
                showToast(response.message || 'Sign in failed.', 'error');
                setButtonLoading(btn, false);
                return;
            }

            const token = response.token;
            const user = response.user || response.data || {};

            if (token) {
                API.saveAuth(token, user);
                showToast('Welcome back!', 'success');
                if (response.redirectPage) {
                    window.location.href = response.redirectPage;
                    return;
                }
                updateAuthUI(user);
                const authPage = document.getElementById('auth-page');
                const appShell = document.getElementById('app-shell');
                if (authPage) authPage.classList.remove('active');
                if (appShell) appShell.classList.add('active');
                redirectBasedOnRole(user);
            }
        } catch (error) {
            showToast(error.message || 'Sign in failed.', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        clearFormErrors('signup-form-el');

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const password = document.getElementById('signup-password').value;

        let hasError = false;

        if (!name) {
            setFieldError('signup-name', 'Full name is required');
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
            setFieldError('signup-phone', 'Enter a valid phone number');
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
                showToast(response.message || 'Sign up failed.', 'error');
                setButtonLoading(btn, false);
                return;
            }

            const token = response.token || response.data?.token || '';
            const user = response.user || response.data?.user || response.data || {};

            if (token) {
                API.saveAuth(token, user);
                showToast('Account created!', 'success');
                const authPage = document.getElementById('auth-page');
                const appShell = document.getElementById('app-shell');
                if (authPage) authPage.classList.remove('active');
                if (appShell) appShell.classList.add('active');
                redirectBasedOnRole(user);
            } else {
                showToast('Account created! Please sign in.', 'success');
                showSigninForm();
                document.getElementById('signin-email').value = email;
            }
        } catch (error) {
            showToast(error.message || 'Sign up failed.', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    };

    const handleSignout = async () => {
        if (!confirm('Sign out?')) return;
        await API.signout();
        showToast('Signed out.', 'info');
        const appShell = document.getElementById('app-shell');
        const authPage = document.getElementById('auth-page');
        if (appShell) appShell.classList.remove('active');
        if (authPage) authPage.classList.add('active');
        showSigninForm();
    };

    return {
        init,
        showSigninForm,
        showSignupForm,
        handleSignout,
        checkSession
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            Auth.init();
        } catch (e) {
            console.error('Auth init error:', e);
        }
    }, 100);
});