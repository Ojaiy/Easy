/**
 * Authentication Module for EASYSHIP NG
 */

const Auth = (() => {

    /**
     * Initialize auth event listeners
     */
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

        // Toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                // Update icon
                const iconEl = btn.querySelector('[data-lucide]');
                iconEl.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                lucide.createIcons({ nodes: [btn] });
            });
        });

        // Sign In form submission
        document.getElementById('signin-form-el').addEventListener('submit', handleSignin);

        // Sign Up form submission
        document.getElementById('signup-form-el').addEventListener('submit', handleSignup);

        // Sign Out button
        document.getElementById('signout-btn').addEventListener('click', handleSignout);
    };

    const showSigninForm = () => {
        document.getElementById('signin-form').classList.add('active');
        document.getElementById('signup-form').classList.remove('active');
        UI.clearErrors('signin-form-el');
    };

    const showSignupForm = () => {
        document.getElementById('signup-form').classList.add('active');
        document.getElementById('signin-form').classList.remove('active');
        UI.clearErrors('signup-form-el');
    };

    /**
     * Handle Sign In
     */
    const handleSignin = async (e) => {
        e.preventDefault();
        UI.clearErrors('signin-form-el');

        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;

        let hasError = false;

        if (!email) {
            UI.setFieldError('signin-email', 'Email is required');
            hasError = true;
        } else if (!UI.isValidEmail(email)) {
            UI.setFieldError('signin-email', 'Enter a valid email address');
            hasError = true;
        }

        if (!password) {
            UI.setFieldError('signin-password', 'Password is required');
            hasError = true;
        }

        if (hasError) return;

        const btn = document.getElementById('signin-btn');
        UI.setButtonLoading(btn, true);

        try {
            const response = await API.signin({ email, password });

            // ✅ NEW: Handle unapproved riders (403)
            if (response.status === 403) {
                UI.showToast(response.message || 'Your account is pending approval. Please wait for admin confirmation.', 'error');
                UI.setButtonLoading(btn, false);
                return;
            }

            // The API should return { token, user } or similar
            const token = response.token || response.data?.token || '';
            const user = response.user || response.data?.user || response.data || {};

            if (token) {
                API.saveAuth(token, user);
                UI.showToast('Welcome back! Signed in successfully.', 'success');

                if (response.redirectPage) {
                    window.location.href = response.redirectPage;
                    return;
                }

                App.onAuthSuccess();
            } else {
                UI.showToast('Sign in successful.', 'success');
                // Try to save what we can
                API.saveAuth('session', user);
                App.onAuthSuccess();
            }
        } catch (error) {
            // Check if error response has status 403
            if (error.status === 403) {
                UI.showToast(error.message || 'Your account is pending approval. Please wait for admin confirmation.', 'error');
            } else {
                UI.showToast(error.message || 'Sign in failed. Please try again.', 'error');
            }
        } finally {
            UI.setButtonLoading(btn, false);
        }
    };

    /**
     * Handle Sign Up
     */
    const handleSignup = async (e) => {
        e.preventDefault();
        UI.clearErrors('signup-form-el');

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const password = document.getElementById('signup-password').value;

        let hasError = false;

        if (!name) {
            UI.setFieldError('signup-name', 'Full name is required');
            hasError = true;
        }

        if (!email) {
            UI.setFieldError('signup-email', 'Email is required');
            hasError = true;
        } else if (!UI.isValidEmail(email)) {
            UI.setFieldError('signup-email', 'Enter a valid email address');
            hasError = true;
        }

        if (!phone) {
            UI.setFieldError('signup-phone', 'Phone number is required');
            hasError = true;
        } else if (!UI.isValidPhone(phone)) {
            UI.setFieldError('signup-phone', 'Enter a valid phone number');
            hasError = true;
        }

        if (!password) {
            UI.setFieldError('signup-password', 'Password is required');
            hasError = true;
        } else if (password.length < 6) {
            UI.setFieldError('signup-password', 'Password must be at least 6 characters');
            hasError = true;
        }

        if (hasError) return;

        const btn = document.getElementById('signup-btn');
        UI.setButtonLoading(btn, true);

        try {
            const response = await API.signup({ name, email, phone, password });

            const token = response.token || response.data?.token || '';
            const user = response.user || response.data?.user || response.data || {};

            if (token) {
                API.saveAuth(token, user);
                UI.showToast('Account created successfully! Welcome to EASYSHIP NG.', 'success');
                App.onAuthSuccess();
            } else {
                UI.showToast('Account created! Please sign in.', 'success');
                showSigninForm();
                document.getElementById('signin-email').value = email;
            }
        } catch (error) {
            UI.showToast(error.message || 'Sign up failed. Please try again.', 'error');
        } finally {
            UI.setButtonLoading(btn, false);
        }
    };

    /**
     * Handle Sign Out
     */
    const handleSignout = async () => {
        await API.signout();
        UI.showToast('You have been signed out.', 'info');
        App.onAuthLogout();
    };

    return {
        init,
        showSigninForm,
        showSignupForm,
        handleSignout,
    };
})();