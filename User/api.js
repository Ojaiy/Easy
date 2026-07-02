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

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw {
                    status: response.status,
                    message: data.message || data.error || 'Request failed',
                    data: data,
                };
            }

            return data;
        } catch (error) {
            if (error.status) throw error;
            // Network error
            throw {
                status: 0,
                message: 'Network error. Please check your connection and ensure the server is running.',
                data: null,
            };
        }
    };

    // ==================== AUTH ENDPOINTS ====================

    const signup = async (userData) => {
        const data = await request('/userSignup', {
            method: 'POST',
            body: userData,
        });
        return data;
    };

    const signin = async (credentials) => {
        const data = await request('/userSignin', {
            method: 'POST',
            body: credentials,
        });
        return data;
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
        const data = await request(`/profile/${userId}`);
        return data;
    };

    // ==================== ORDER ENDPOINTS ====================

    const createOrder = async (orderData) => {
        const data = await request('/createOrder', {
            method: 'POST',
            body: orderData,
        });
        return data;
    };

    const getOrders = async (customerId) => {
        const data = await request(`/orders/${customerId}`);
        return data;
    };

    const getOrder = async (orderId) => {
        const data = await request(`/order/${orderId}`);
        return data;
    };

    const getDashboard = async (customerId) => {
        const data = await request(`/dashboard/${customerId}`);
        return data;
    };

    // ==================== TRACKING ENDPOINTS ====================

    const startTracking = async (trackingData) => {
        const data = await request('/start', {
            method: 'POST',
            body: trackingData,
        });
        return data;
    };

    const updateTracking = async (trackingData) => {
        const data = await request('/update', {
            method: 'POST',
            body: trackingData,
        });
        return data;
    };

    const getTracking = async (orderId) => {
        const data = await request(`/${orderId}`);
        return data;
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