/**
 * API Service Layer for EASYSHIP NG
 */

const API = (() => {
    const BASE_URL = 'https://easyshipp.onrender.com/api/v1';
    
    const CONFIG = {
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 30000,
        maxRetries: 3
    };

    let isOnline = navigator.onLine;
    
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('🌐 API: Connection restored');
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('🌐 API: Connection lost');
    });

    const getToken = () => localStorage.getItem('easyship_token');

    const getUser = () => {
        const user = localStorage.getItem('easyship_user');
        return user ? JSON.parse(user) : null;
    };

    const saveAuth = (token, user) => {
        if (token) localStorage.setItem('easyship_token', token);
        if (user) localStorage.setItem('easyship_user', JSON.stringify(user));
    };

    const clearAuth = () => {
        localStorage.removeItem('easyship_token');
        localStorage.removeItem('easyship_user');
        sessionStorage.removeItem('api_retry_count');
    };

    const isAuthenticated = () => !!getToken();

    class APIError extends Error {
        constructor(message, status, data) {
            super(message);
            this.name = 'APIError';
            this.status = status;
            this.data = data;
        }
    }

    const isNetworkError = (error) => {
        return error.message === 'Failed to fetch' || 
               error.message === 'Network request failed' ||
               error.message === 'NetworkError' ||
               error.name === 'TypeError' ||
               error.code === 'ECONNABORTED' ||
               !isOnline;
    };

    const getErrorMessage = (error, status) => {
        if (!isOnline) return 'No internet connection. Please check your network.';
        if (status === 401) return 'Your session has expired. Please sign in again.';
        if (status === 403) return 'You do not have permission to perform this action.';
        if (status === 404) return 'The requested resource was not found.';
        if (status === 429) return 'Too many requests. Please try again later.';
        if (status >= 500) return 'Server error. Please try again later.';
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            return 'Network error. Please check your connection.';
        }
        return error.message || 'An unexpected error occurred.';
    };

    const prepareRequest = (options = {}) => {
        const token = getToken();
        
        const config = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
            ...options,
        };

        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        const controller = new AbortController();
        config.signal = controller.signal;
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, CONFIG.timeout);

        config._timeoutId = timeoutId;

        return config;
    };

    const processResponse = async (response) => {
        if (response.config && response.config._timeoutId) {
            clearTimeout(response.config._timeoutId);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (response.ok) {
                return {
                    status: response.status,
                    ok: response.ok,
                    data: await response.blob()
                };
            }
            throw new APIError('Invalid response format', response.status);
        }

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new APIError('Invalid JSON response', response.status);
        }

        if (!response.ok) {
            const errorMessage = data.message || data.error || 'Request failed';
            const error = new APIError(errorMessage, response.status, data);
            
            if (response.status === 401) {
                clearAuth();
                if (!window.location.pathname.includes('/User/')) {
                    window.location.href = '/User/index.html';
                }
            }
            
            throw error;
        }

        return {
            status: response.status,
            ok: response.ok,
            ...data
        };
    };

    const executeWithRetry = async (fn, retryCount = 0) => {
        try {
            return await fn();
        } catch (error) {
            if (error.status === 401 || error.status === 403) throw error;
            if (error.status === 400) throw error;
            
            if (isNetworkError(error) && retryCount < CONFIG.maxRetries) {
                const delay = CONFIG.retryDelay * Math.pow(2, retryCount);
                console.log(`🔄 API: Retrying request (${retryCount + 1}/${CONFIG.maxRetries}) in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return executeWithRetry(fn, retryCount + 1);
            }
            
            throw error;
        }
    };

    const request = async (endpoint, options = {}) => {
        if (!isOnline) {
            throw new APIError('No internet connection', 0, { offline: true });
        }

        const url = `${BASE_URL}${endpoint}`;
        const config = prepareRequest(options);
        const requestConfig = { ...config };

        try {
            const response = await executeWithRetry(async () => {
                const fetchPromise = fetch(url, config);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), CONFIG.timeout);
                });
                const result = await Promise.race([fetchPromise, timeoutPromise]);
                result.config = requestConfig;
                return result;
            });

            return await processResponse(response);
        } catch (error) {
            if (config._timeoutId) clearTimeout(config._timeoutId);

            if (error.message === 'Request timeout') {
                throw new APIError('Request timed out. Please try again.', 408);
            }
            if (error.name === 'AbortError') {
                throw new APIError('Request cancelled.', 499);
            }
            if (error instanceof APIError) throw error;
            if (isNetworkError(error)) {
                throw new APIError('Network error. Please check your connection.', 0);
            }
            throw new APIError(error.message || 'Request failed', 500);
        }
    };

    // ==================== AUTH ====================
    const signup = async (userData) => {
        return await request('/userSignup', { method: 'POST', body: userData });
    };

    const signin = async (credentials) => {
        const response = await request('/userSignin', { method: 'POST', body: credentials });
        if (response.ok && response.token) {
            saveAuth(response.token, response.user);
        }
        return response;
    };

    const signout = async () => {
        try {
            await request('/userSignout', { method: 'POST' });
        } catch (e) {}
        clearAuth();
        return { ok: true };
    };

    const getProfile = async (userId) => {
        if (!userId) {
            const user = getUser();
            if (user && user.id) userId = user.id;
            else throw new APIError('User ID not found', 400);
        }
        return await request(`/profile/${userId}`);
    };

    // ==================== ORDERS ====================
    const createOrder = async (orderData) => {
        const isFormData = orderData instanceof FormData;
        return await request('/createOrder', {
            method: 'POST',
            body: orderData,
            headers: isFormData ? {} : undefined,
        });
    };

    const getOrders = async (customerId) => {
        if (!customerId) {
            const user = getUser();
            if (user && user.id) customerId = user.id;
            else throw new APIError('Customer ID not found', 400);
        }
        return await request(`/orders/${customerId}`);
    };

    const getOrder = async (orderId) => {
        if (!orderId) throw new APIError('Order ID is required', 400);
        return await request(`/order/${orderId}`);
    };

    const getDashboard = async (customerId) => {
        if (!customerId) {
            const user = getUser();
            if (user && user.id) customerId = user.id;
            else throw new APIError('Customer ID not found', 400);
        }
        return await request(`/dashboard/${customerId}`);
    };

    // ==================== TRACKING ====================
    const startTracking = async (trackingData) => {
        return await request('/start', { method: 'POST', body: trackingData });
    };

    const updateTracking = async (trackingData) => {
        return await request('/update', { method: 'POST', body: trackingData });
    };

    const getTracking = async (orderId) => {
        if (!orderId) throw new APIError('Order ID is required for tracking', 400);
        return await request(`/${orderId}`);
    };

    // ==================== RIDER ====================
    const riderSignup = async (formData) => {
        const data = formData instanceof FormData ? formData : new FormData();
        return await request('/riderSignup', { method: 'POST', body: data, headers: {} });
    };

    const getRiderStatus = async () => {
        return await request('/rider/status', { method: 'GET' });
    };

    // ==================== PUBLIC API ====================
    return {
        getToken,
        getUser,
        saveAuth,
        clearAuth,
        isAuthenticated,
        isOnline: () => isOnline,
        APIError,
        getErrorMessage,
        isNetworkError,
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
        riderSignup,
        getRiderStatus,
        request,
    };
})();

// Make API globally available
window.API = API;

console.log('✅ API Service initialized');