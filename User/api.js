/**
 * API Service Layer for EASYSHIP NG
 * All HTTP requests to the backend go through this module.
 * 
 * Enhanced with:
 * - Better error handling
 * - Network retry logic
 * - Request/response interceptors
 * - Connection status detection
 * - Mobile-friendly timeout handling
 */

const API = (() => {
    const BASE_URL = 'https://easyshipp.onrender.com/api/v1';
    
    // ========================================
    // Configuration
    // ========================================
    const CONFIG = {
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
        timeout: 30000, // 30 seconds
        maxRetries: 3
    };

    // ========================================
    // Connection Status
    // ========================================
    let isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('🌐 API: Connection restored');
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('🌐 API: Connection lost');
    });

    // ========================================
    // Token Management
    // ========================================
    
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
        if (token) {
            localStorage.setItem('easyship_token', token);
        }
        if (user) {
            localStorage.setItem('easyship_user', JSON.stringify(user));
        }
    };

    /**
     * Clear auth data
     */
    const clearAuth = () => {
        localStorage.removeItem('easyship_token');
        localStorage.removeItem('easyship_user');
        sessionStorage.removeItem('api_retry_count');
    };

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = () => !!getToken();

    // ========================================
    // Error Handling
    // ========================================
    
    class APIError extends Error {
        constructor(message, status, data) {
            super(message);
            this.name = 'APIError';
            this.status = status;
            this.data = data;
        }
    }

    /**
     * Check if error is network-related
     */
    const isNetworkError = (error) => {
        return error.message === 'Failed to fetch' || 
               error.message === 'Network request failed' ||
               error.message === 'NetworkError' ||
               error.name === 'TypeError' ||
               error.code === 'ECONNABORTED' ||
               !isOnline;
    };

    /**
     * Get user-friendly error message
     */
    const getErrorMessage = (error, status) => {
        if (!isOnline) {
            return 'No internet connection. Please check your network.';
        }
        
        if (status === 401) {
            return 'Your session has expired. Please sign in again.';
        }
        
        if (status === 403) {
            return 'You do not have permission to perform this action.';
        }
        
        if (status === 404) {
            return 'The requested resource was not found.';
        }
        
        if (status === 429) {
            return 'Too many requests. Please try again later.';
        }
        
        if (status >= 500) {
            return 'Server error. Please try again later.';
        }
        
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            return 'Network error. Please check your connection.';
        }
        
        return error.message || 'An unexpected error occurred.';
    };

    // ========================================
    // Request Interceptor
    // ========================================
    
    /**
     * Prepare request configuration
     */
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

        // Handle FormData (don't set Content-Type for FormData)
        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        // Handle JSON body
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        // Add timeout
        const controller = new AbortController();
        config.signal = controller.signal;
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, CONFIG.timeout);

        // Store timeout ID for cleanup
        config._timeoutId = timeoutId;

        return config;
    };

    // ========================================
    // Response Interceptor
    // ========================================
    
    /**
     * Process response and extract data
     */
    const processResponse = async (response) => {
        // Clear timeout
        if (response.config && response.config._timeoutId) {
            clearTimeout(response.config._timeoutId);
        }

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // For non-JSON responses (like file downloads)
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

        // Handle API errors
        if (!response.ok) {
            const errorMessage = data.message || data.error || 'Request failed';
            const error = new APIError(errorMessage, response.status, data);
            
            // Handle specific status codes
            if (response.status === 401) {
                // Token expired - clear auth
                clearAuth();
                // Redirect to login if not already there
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

    // ========================================
    // Retry Logic
    // ========================================
    
    /**
     * Execute request with retry logic
     */
    const executeWithRetry = async (fn, retryCount = 0) => {
        try {
            return await fn();
        } catch (error) {
            // Don't retry on auth errors
            if (error.status === 401 || error.status === 403) {
                throw error;
            }
            
            // Don't retry on validation errors
            if (error.status === 400) {
                throw error;
            }
            
            // Check if we should retry
            if (isNetworkError(error) && retryCount < CONFIG.maxRetries) {
                const delay = CONFIG.retryDelay * Math.pow(2, retryCount);
                console.log(`🔄 API: Retrying request (${retryCount + 1}/${CONFIG.maxRetries}) in ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return executeWithRetry(fn, retryCount + 1);
            }
            
            throw error;
        }
    };

    // ========================================
    // Main Request Function
    // ========================================
    
    /**
     * Make an HTTP request
     */
    const request = async (endpoint, options = {}) => {
        // Check connection
        if (!isOnline) {
            throw new APIError('No internet connection', 0, { offline: true });
        }

        const url = `${BASE_URL}${endpoint}`;
        const config = prepareRequest(options);

        // Store config for response processing
        const requestConfig = { ...config };

        try {
            const response = await executeWithRetry(async () => {
                const fetchPromise = fetch(url, config);
                
                // Add timeout handling
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Request timeout'));
                    }, CONFIG.timeout);
                });
                
                // Race between fetch and timeout
                const result = await Promise.race([fetchPromise, timeoutPromise]);
                
                // Attach config to response for cleanup
                result.config = requestConfig;
                
                return result;
            });

            return await processResponse(response);
        } catch (error) {
            // Clean up timeout if it exists
            if (config._timeoutId) {
                clearTimeout(config._timeoutId);
            }

            // Handle timeout
            if (error.message === 'Request timeout') {
                throw new APIError('Request timed out. Please try again.', 408);
            }

            // Handle abort
            if (error.name === 'AbortError') {
                throw new APIError('Request cancelled.', 499);
            }

            // Re-throw API errors
            if (error instanceof APIError) {
                throw error;
            }

            // Handle network errors
            if (isNetworkError(error)) {
                throw new APIError('Network error. Please check your connection.', 0);
            }

            // Handle other errors
            throw new APIError(error.message || 'Request failed', 500);
        }
    };

    // ========================================
    // API Endpoints
    // ========================================

    // ==================== AUTH ENDPOINTS ====================

    const signup = async (userData) => {
        return await request('/userSignup', {
            method: 'POST',
            body: userData,
        });
    };

    const signin = async (credentials) => {
        const response = await request('/userSignin', {
            method: 'POST',
            body: credentials,
        });
        
        // Auto-save auth data if successful
        if (response.ok && response.token) {
            saveAuth(response.token, response.user);
        }
        
        return response;
    };

    const signout = async () => {
        try {
            await request('/userSignout', { method: 'POST' });
        } catch (e) {
            console.log('Signout API call failed, clearing local data');
        }
        clearAuth();
        return { ok: true };
    };

    const getProfile = async (userId) => {
        if (!userId) {
            const user = getUser();
            if (user && user.id) {
                userId = user.id;
            } else {
                throw new APIError('User ID not found', 400);
            }
        }
        return await request(`/profile/${userId}`);
    };

    // ==================== ORDER ENDPOINTS ====================

    const createOrder = async (orderData) => {
        // Ensure we have form data for file uploads
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
            if (user && user.id) {
                customerId = user.id;
            } else {
                throw new APIError('Customer ID not found', 400);
            }
        }
        return await request(`/orders/${customerId}`);
    };

    const getOrder = async (orderId) => {
        if (!orderId) {
            throw new APIError('Order ID is required', 400);
        }
        return await request(`/order/${orderId}`);
    };

    const getDashboard = async (customerId) => {
        if (!customerId) {
            const user = getUser();
            if (user && user.id) {
                customerId = user.id;
            } else {
                throw new APIError('Customer ID not found', 400);
            }
        }
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
        if (!orderId) {
            throw new APIError('Order ID is required for tracking', 400);
        }
        return await request(`/${orderId}`);
    };

    // ==================== RIDER ENDPOINTS ====================

    const riderSignup = async (formData) => {
        // Ensure it's FormData for file uploads
        const data = formData instanceof FormData ? formData : new FormData();
        return await request('/riderSignup', {
            method: 'POST',
            body: data,
            headers: {}, // Let browser set Content-Type for FormData
        });
    };

    const getRiderStatus = async () => {
        return await request('/rider/status', {
            method: 'GET',
        });
    };

    // ========================================
    // Public API
    // ========================================

    return {
        // Core utilities
        getToken,
        getUser,
        saveAuth,
        clearAuth,
        isAuthenticated,
        isOnline: () => isOnline,
        
        // Error handling
        APIError,
        getErrorMessage,
        isNetworkError,
        
        // Auth endpoints
        signup,
        signin,
        signout,
        getProfile,
        
        // Order endpoints
        createOrder,
        getOrders,
        getOrder,
        getDashboard,
        
        // Tracking endpoints
        startTracking,
        updateTracking,
        getTracking,
        
        // Rider endpoints
        riderSignup,
        getRiderStatus,
        
        // Raw request (for custom endpoints)
        request,
    };
})();

// ========================================
// Export for use in other files
// ========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}

// Make API globally available
window.API = API;

console.log('✅ API Service initialized');
console.log('📡 API Base URL:', API.BASE_URL || 'https://easyshipp.onrender.com/api/v1');/**
 * API Service Layer for EASYSHIP NG
 * All HTTP requests to the backend go through this module.
 * 
 * Enhanced with:
 * - Better error handling
 * - Network retry logic
 * - Request/response interceptors
 * - Connection status detection
 * - Mobile-friendly timeout handling
 */

const API = (() => {
    const BASE_URL = 'https://easyshipp.onrender.com/api/v1';
    
    // ========================================
    // Configuration
    // ========================================
    const CONFIG = {
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
        timeout: 30000, // 30 seconds
        maxRetries: 3
    };

    // ========================================
    // Connection Status
    // ========================================
    let isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('🌐 API: Connection restored');
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('🌐 API: Connection lost');
    });

    // ========================================
    // Token Management
    // ========================================
    
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
        if (token) {
            localStorage.setItem('easyship_token', token);
        }
        if (user) {
            localStorage.setItem('easyship_user', JSON.stringify(user));
        }
    };

    /**
     * Clear auth data
     */
    const clearAuth = () => {
        localStorage.removeItem('easyship_token');
        localStorage.removeItem('easyship_user');
        sessionStorage.removeItem('api_retry_count');
    };

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = () => !!getToken();

    // ========================================
    // Error Handling
    // ========================================
    
    class APIError extends Error {
        constructor(message, status, data) {
            super(message);
            this.name = 'APIError';
            this.status = status;
            this.data = data;
        }
    }

    /**
     * Check if error is network-related
     */
    const isNetworkError = (error) => {
        return error.message === 'Failed to fetch' || 
               error.message === 'Network request failed' ||
               error.message === 'NetworkError' ||
               error.name === 'TypeError' ||
               error.code === 'ECONNABORTED' ||
               !isOnline;
    };

    /**
     * Get user-friendly error message
     */
    const getErrorMessage = (error, status) => {
        if (!isOnline) {
            return 'No internet connection. Please check your network.';
        }
        
        if (status === 401) {
            return 'Your session has expired. Please sign in again.';
        }
        
        if (status === 403) {
            return 'You do not have permission to perform this action.';
        }
        
        if (status === 404) {
            return 'The requested resource was not found.';
        }
        
        if (status === 429) {
            return 'Too many requests. Please try again later.';
        }
        
        if (status >= 500) {
            return 'Server error. Please try again later.';
        }
        
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            return 'Network error. Please check your connection.';
        }
        
        return error.message || 'An unexpected error occurred.';
    };

    // ========================================
    // Request Interceptor
    // ========================================
    
    /**
     * Prepare request configuration
     */
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

        // Handle FormData (don't set Content-Type for FormData)
        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        // Handle JSON body
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        // Add timeout
        const controller = new AbortController();
        config.signal = controller.signal;
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, CONFIG.timeout);

        // Store timeout ID for cleanup
        config._timeoutId = timeoutId;

        return config;
    };

    // ========================================
    // Response Interceptor
    // ========================================
    
    /**
     * Process response and extract data
     */
    const processResponse = async (response) => {
        // Clear timeout
        if (response.config && response.config._timeoutId) {
            clearTimeout(response.config._timeoutId);
        }

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // For non-JSON responses (like file downloads)
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

        // Handle API errors
        if (!response.ok) {
            const errorMessage = data.message || data.error || 'Request failed';
            const error = new APIError(errorMessage, response.status, data);
            
            // Handle specific status codes
            if (response.status === 401) {
                // Token expired - clear auth
                clearAuth();
                // Redirect to login if not already there
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

    // ========================================
    // Retry Logic
    // ========================================
    
    /**
     * Execute request with retry logic
     */
    const executeWithRetry = async (fn, retryCount = 0) => {
        try {
            return await fn();
        } catch (error) {
            // Don't retry on auth errors
            if (error.status === 401 || error.status === 403) {
                throw error;
            }
            
            // Don't retry on validation errors
            if (error.status === 400) {
                throw error;
            }
            
            // Check if we should retry
            if (isNetworkError(error) && retryCount < CONFIG.maxRetries) {
                const delay = CONFIG.retryDelay * Math.pow(2, retryCount);
                console.log(`🔄 API: Retrying request (${retryCount + 1}/${CONFIG.maxRetries}) in ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return executeWithRetry(fn, retryCount + 1);
            }
            
            throw error;
        }
    };

    // ========================================
    // Main Request Function
    // ========================================
    
    /**
     * Make an HTTP request
     */
    const request = async (endpoint, options = {}) => {
        // Check connection
        if (!isOnline) {
            throw new APIError('No internet connection', 0, { offline: true });
        }

        const url = `${BASE_URL}${endpoint}`;
        const config = prepareRequest(options);

        // Store config for response processing
        const requestConfig = { ...config };

        try {
            const response = await executeWithRetry(async () => {
                const fetchPromise = fetch(url, config);
                
                // Add timeout handling
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Request timeout'));
                    }, CONFIG.timeout);
                });
                
                // Race between fetch and timeout
                const result = await Promise.race([fetchPromise, timeoutPromise]);
                
                // Attach config to response for cleanup
                result.config = requestConfig;
                
                return result;
            });

            return await processResponse(response);
        } catch (error) {
            // Clean up timeout if it exists
            if (config._timeoutId) {
                clearTimeout(config._timeoutId);
            }

            // Handle timeout
            if (error.message === 'Request timeout') {
                throw new APIError('Request timed out. Please try again.', 408);
            }

            // Handle abort
            if (error.name === 'AbortError') {
                throw new APIError('Request cancelled.', 499);
            }

            // Re-throw API errors
            if (error instanceof APIError) {
                throw error;
            }

            // Handle network errors
            if (isNetworkError(error)) {
                throw new APIError('Network error. Please check your connection.', 0);
            }

            // Handle other errors
            throw new APIError(error.message || 'Request failed', 500);
        }
    };

    // ========================================
    // API Endpoints
    // ========================================

    // ==================== AUTH ENDPOINTS ====================

    const signup = async (userData) => {
        return await request('/userSignup', {
            method: 'POST',
            body: userData,
        });
    };

    const signin = async (credentials) => {
        const response = await request('/userSignin', {
            method: 'POST',
            body: credentials,
        });
        
        // Auto-save auth data if successful
        if (response.ok && response.token) {
            saveAuth(response.token, response.user);
        }
        
        return response;
    };

    const signout = async () => {
        try {
            await request('/userSignout', { method: 'POST' });
        } catch (e) {
            console.log('Signout API call failed, clearing local data');
        }
        clearAuth();
        return { ok: true };
    };

    const getProfile = async (userId) => {
        if (!userId) {
            const user = getUser();
            if (user && user.id) {
                userId = user.id;
            } else {
                throw new APIError('User ID not found', 400);
            }
        }
        return await request(`/profile/${userId}`);
    };

    // ==================== ORDER ENDPOINTS ====================

    const createOrder = async (orderData) => {
        // Ensure we have form data for file uploads
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
            if (user && user.id) {
                customerId = user.id;
            } else {
                throw new APIError('Customer ID not found', 400);
            }
        }
        return await request(`/orders/${customerId}`);
    };

    const getOrder = async (orderId) => {
        if (!orderId) {
            throw new APIError('Order ID is required', 400);
        }
        return await request(`/order/${orderId}`);
    };

    const getDashboard = async (customerId) => {
        if (!customerId) {
            const user = getUser();
            if (user && user.id) {
                customerId = user.id;
            } else {
                throw new APIError('Customer ID not found', 400);
            }
        }
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
        if (!orderId) {
            throw new APIError('Order ID is required for tracking', 400);
        }
        return await request(`/${orderId}`);
    };

    // ==================== RIDER ENDPOINTS ====================

    const riderSignup = async (formData) => {
        // Ensure it's FormData for file uploads
        const data = formData instanceof FormData ? formData : new FormData();
        return await request('/riderSignup', {
            method: 'POST',
            body: data,
            headers: {}, // Let browser set Content-Type for FormData
        });
    };

    const getRiderStatus = async () => {
        return await request('/rider/status', {
            method: 'GET',
        });
    };

    // ========================================
    // Public API
    // ========================================

    return {
        // Core utilities
        getToken,
        getUser,
        saveAuth,
        clearAuth,
        isAuthenticated,
        isOnline: () => isOnline,
        
        // Error handling
        APIError,
        getErrorMessage,
        isNetworkError,
        
        // Auth endpoints
        signup,
        signin,
        signout,
        getProfile,
        
        // Order endpoints
        createOrder,
        getOrders,
        getOrder,
        getDashboard,
        
        // Tracking endpoints
        startTracking,
        updateTracking,
        getTracking,
        
        // Rider endpoints
        riderSignup,
        getRiderStatus,
        
        // Raw request (for custom endpoints)
        request,
    };
})();

// ========================================
// Export for use in other files
// ========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}

// Make API globally available
window.API = API;

console.log('✅ API Service initialized');
console.log('📡 API Base URL:', API.BASE_URL || 'https://easyshipp.onrender.com/api/v1');