/**
 * API Service Layer for EASYSHIP NG
 * All HTTP requests to the backend go through this module.
 */

const API = (() => {
    const BASE_URL = 'https://easyshipp.onrender.com/api/v1';

    /**
     * Get the auth token from localStorage
     */
    const getToken = () => localStorage.getItem('easyship_token');

    /**
     * Get the current user from localStorage
     */
    const getUser = () => {
        const user = localStorage.getItem('easyship_user');
        return user ? JSON.parse(user) : null;
    };

    /**
     * Save auth data
     */
    const saveAuth = (token, user) => {
        localStorage.setItem('easyship_token', token);
        localStorage.setItem('easyship_user', JSON.stringify(user));
    };

    /**
     * Clear auth data
     */
    const clearAuth = () => {
        localStorage.removeItem('easyship_token');
        localStorage.removeItem('easyship_user');
    };

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = () => !!getToken();

    /**
     * Make an HTTP request
     */
    const request = async (endpoint, options = {}) => {
        const url = `${BASE_URL}${endpoint}`;
        const token = getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);
        const data = await response.json();

        // ✅ Return EVERYTHING — let caller handle status
        return {
            status: response.status,
            ok: response.ok,
            ...data
        };
    };

    // ==================== AUTH ENDPOINTS ====================

    const signup = async (userData) => {
        return await request('/userSignup', {
            method: 'POST',
            body: userData,
        });
    };

    const signin = async (credentials) => {
        return await request('/userSignin', {
            method: 'POST',
            body: credentials,
        });
    };

    const signout = async () => {
        try {
            await request('/userSignout', { method: 'POST' });
        } catch (e) {
            // Sign out locally even if API fails
        }
        clearAuth();
    };

    const getProfile = async (userId) => {
        return await request(`/profile/${userId}`);
    };

    // ==================== ORDER ENDPOINTS ====================

    const createOrder = async (orderData) => {
        return await request('/createOrder', {
            method: 'POST',
            body: orderData,
        });
    };

    const getOrders = async (customerId) => {
        return await request(`/orders/${customerId}`);
    };

    const getOrder = async (orderId) => {
        return await request(`/order/${orderId}`);
    };

    const getDashboard = async (customerId) => {
        return await request(`/dashboard/${customerId}`);
    };

    // ==================== TRACKING ENDPOINTS ====================

    const startTracking = async (trackingData) => {
        return await request('/start', {
            method: 'POST',
            body: trackingData,
        });
    };

    const updateTracking = async (trackingData) => {
        return await request('/update', {
            method: 'POST',
            body: trackingData,
        });
    };

    const getTracking = async (orderId) => {
        return await request(`/${orderId}`);
    };

    return {
        getToken,
        getUser,
        saveAuth,
        clearAuth,
        isAuthenticated,
        signup,
        signin,
        signout,
        getProfile,
        createOrder,
        getOrders,
        getOrder,
        getDashboard,
        startTracking,
        updateTracking,
        getTracking,
    };
})();