/**
 * Main Application Module for EASYSHIP NG
 * SPA Router, initialization, page management
 */

const App = (() => {

    let currentPage = 'dashboard';
    let socket = null;

    /**
     * Initialize the application
     */
    const init = () => {
        // Show splash screen
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');

            // Check auth state
            if (API.isAuthenticated()) {
                const user = API.getUser();

                // This page is the customer dashboard. If a rider or admin
                // token is still sitting in storage, clear it instead of
                // showing the wrong dashboard under the wrong identity.
                if (user && user.role && user.role !== 'customer') {
                    API.clearAuth();
                    showAuth();
                } else {
                    showApp();
                }
            } else {
                showAuth();
            }
        }, 1800);

        // Initialize all modules
        Auth.init();
        Dashboard.init();
        Orders.init();
        Tracking.init();
        Profile.init();

        // Setup sidebar navigation
        setupNavigation();

        // Setup mobile menu
        setupMobileMenu();

        // Handle hash changes
        window.addEventListener('hashchange', handleRoute);
        handleRoute();

        // Update topbar user info
        updateTopbarUser();
    };

    /**
     * Show auth page
     */
    const showAuth = () => {
        document.getElementById('auth-page').classList.add('active');
        document.getElementById('app-shell').classList.remove('active');
        Auth.showSigninForm();
        
        // Disconnect socket on logout
        disconnectSocket();
    };

    /**
     * Show app shell (after auth)
     */
    const showApp = () => {
        document.getElementById('auth-page').classList.remove('active');
        document.getElementById('app-shell').classList.add('active');

        updateTopbarUser();

        // Connect socket for live order updates
        connectSocket();

        handleRoute();
    };

    /**
     * Connect Socket.IO for real-time updates
     */
    const connectSocket = () => {
        const user = API.getUser();
        if (!user || !user.id) return;

        // Don't reconnect if already connected
        if (socket && socket.connected) return;

        try {
            socket = io();
            
            // Join user's private room
            socket.emit('join_room', user.id);
            
            console.log('🔌 Socket connected for user:', user.id);
            
            // Listen for order updates
            socket.on('order_update', (data) => {
                console.log('📦 Order update received:', data);
                
                // Show toast notification
                UI.showToast(`Order update: ${data.message}`, 'success');
                
                // If Orders module exists, refresh list and detail view
                if (typeof Orders !== 'undefined') {
                    // Reload orders list if on orders page
                    if (currentPage === 'orders' || currentPage === 'dashboard') {
                        Orders.loadOrders();
                    }
                    
                    // Update order detail if currently viewing this order
                    const currentOrderEl = document.getElementById(`order-status-${data.orderId}`);
                    if (currentOrderEl) {
                        currentOrderEl.innerText = formatOrderStatus(data.status);
                    }
                    
                    // Also update the detail view if it's open
                    if (currentPage === 'order-detail') {
                        const orderId = window.location.hash.split('/')[1];
                        if (orderId && orderId === data.orderId) {
                            Orders.loadOrderDetail(orderId);
                        }
                    }
                }
            });
            
            socket.on('disconnect', () => {
                console.log('🔌 Socket disconnected');
            });
            
            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });
            
        } catch (error) {
            console.error('Failed to connect socket:', error);
        }
    };

    /**
     * Disconnect socket
     */
    const disconnectSocket = () => {
        if (socket) {
            socket.disconnect();
            socket = null;
            console.log('🔌 Socket disconnected');
        }
    };

    /**
     * Format order status for display
     */
    const formatOrderStatus = (status) => {
        const map = {
            pending: 'Pending',
            dispatch_assigned: 'Rider Assigned',
            pickup_in_progress: 'Package Picked Up',
            in_transit: 'In Transit',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        };
        return map[status] || status;
    };

    /**
     * Called after successful auth
     */
    const onAuthSuccess = () => {
        showApp();
    };

    /**
     * Called after logout
     */
    const onAuthLogout = () => {
        disconnectSocket();
        showAuth();
        window.location.hash = '';
    };

    /**
     * Update topbar user info
     */
    const updateTopbarUser = () => {
        const user = API.getUser();
        if (!user) return;

        const name = user.name || 'User';
        const initials = UI.getInitials(name);

        document.getElementById('topbar-avatar').textContent = initials;
        document.getElementById('topbar-username').textContent = name;
    };

    /**
     * Setup sidebar navigation
     */
    const setupNavigation = () => {
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                const page = item.dataset.page;

                if (page) {
                    navigate(page);
                }

                closeMobileMenu();
            });
        });
    };

    /**
     * Setup mobile menu
     */
    const setupMobileMenu = () => {
        document.getElementById('menu-toggle').addEventListener('click', openMobileMenu);
        document.getElementById('sidebar-close').addEventListener('click', closeMobileMenu);
        document.getElementById('sidebar-overlay').addEventListener('click', closeMobileMenu);
    };

    const openMobileMenu = () => {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebar-overlay').classList.add('active');
    };

    const closeMobileMenu = () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    };

    /**
     * Navigate to a page
     */
    const navigate = (path) => {
        const cleanPath = path.replace(/^#/, '');

        if (window.location.hash !== `#${cleanPath}`) {
            window.location.hash = cleanPath;
        }

        switchPage(cleanPath);
    };

    /**
     * Handle route change
     */
    const handleRoute = () => {
        let hash = window.location.hash.replace('#', '');

        if (!hash) {
            hash = 'dashboard';
        }

        const parts = hash.split('/');
        const page = parts[0];
        const param = parts.slice(1).join('/');

        if (!API.isAuthenticated()) {
            showAuth();
            return;
        }

        switchPage(page, param);
    };

    /**
     * Switch active page
     */
    const switchPage = (page, param) => {

        document.querySelectorAll('.app-page').forEach(p => {
            p.classList.remove('active');
        });

        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.classList.remove('active');

            if (
                item.dataset.page === page ||
                (page === 'order-detail' && item.dataset.page === 'orders')
            ) {
                item.classList.add('active');
            }
        });

        const pageMap = {
            dashboard: {
                id: 'page-dashboard',
                title: 'Dashboard'
            },
            orders: {
                id: 'page-orders',
                title: 'Orders'
            },
            'create-order': {
                id: 'page-create-order',
                title: 'New Order'
            },
            tracking: {
                id: 'page-tracking',
                title: 'Track Shipment'
            },
            profile: {
                id: 'page-profile',
                title: 'Profile'
            },
            'order-detail': {
                id: 'page-order-detail',
                title: 'Order Details'
            }
        };

        const pageInfo = pageMap[page];

        if (!pageInfo) {
            switchPage('dashboard');
            return;
        }

        const pageEl = document.getElementById(pageInfo.id);

        if (pageEl) {
            pageEl.classList.add('active');
        }

        document.getElementById('page-title').textContent =
            pageInfo.title;

        loadPageData(page, param);

        currentPage = page;
    };

    /**
     * Load data for the current page
     */
    const loadPageData = (page, param) => {
        switch (page) {

            case 'dashboard':
                Dashboard.load();
                break;

            case 'orders':
                Orders.loadOrders();
                break;

            case 'order-detail':
                if (param) {
                    Orders.loadOrderDetail(param);
                }
                break;

            case 'tracking':
                if (param) {
                    Tracking.loadTrackingById(param);
                }
                break;

            case 'profile':
                Profile.load();
                break;

            case 'create-order':
                break;
        }
    };

    return {
        init,
        onAuthSuccess,
        onAuthLogout,
        navigate,
        updateTopbarUser,
        connectSocket,
        disconnectSocket
    };

})();

// ==================== BOOT ====================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});