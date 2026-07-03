/**
 * Main Application Module for EASYSHIP NG
 * SPA Router, initialization, page management
 */

const App = (() => {

    let currentPage = 'dashboard';
    let socket = null;
    let isAppReady = false;

    /**
     * Initialize the application
     */
    const init = () => {
        // Show splash screen
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.classList.add('hidden');

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

        // Initialize all modules (with error handling)
        try {
            if (typeof Auth !== 'undefined' && Auth.init) {
                Auth.init();
            }
        } catch (e) {
            console.error('Auth init error:', e);
        }

        try {
            if (typeof Dashboard !== 'undefined' && Dashboard.init) {
                Dashboard.init();
            }
        } catch (e) {
            console.error('Dashboard init error:', e);
        }

        try {
            if (typeof Orders !== 'undefined' && Orders.init) {
                Orders.init();
            }
        } catch (e) {
            console.error('Orders init error:', e);
        }

        try {
            if (typeof Tracking !== 'undefined' && Tracking.init) {
                Tracking.init();
            }
        } catch (e) {
            console.error('Tracking init error:', e);
        }

        try {
            if (typeof Profile !== 'undefined' && Profile.init) {
                Profile.init();
            }
        } catch (e) {
            console.error('Profile init error:', e);
        }

        // Setup sidebar navigation
        setupNavigation();

        // Setup mobile menu
        setupMobileMenu();

        // Handle hash changes
        window.addEventListener('hashchange', handleRoute);
        
        // Handle initial route after DOM is ready
        setTimeout(handleRoute, 200);

        // Update topbar user info
        updateTopbarUser();

        // Close mobile menu on resize to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                closeMobileMenu();
            }
        });

        isAppReady = true;
        console.log('✅ App initialized');
    };

    /**
     * Show auth page
     */
    const showAuth = () => {
    // Check if already logged in - if so, redirect back
    if (API.isAuthenticated()) {
        const user = API.getUser();
        if (user) {
            const role = user.role || 'customer';
            const redirects = {
                'customer': '/User/index.html',
                'rider': '/Rider/rider-dashboard.html',
                'admin': '/Admin/index.html'
            };
            window.location.href = redirects[role] || redirects['customer'];
            return;
        }
    }
    
    const authPage = document.getElementById('auth-page');
    const appShell = document.getElementById('app-shell');
    if (authPage) authPage.classList.add('active');
    if (appShell) appShell.classList.remove('active');
    
    try {
        if (typeof Auth !== 'undefined' && Auth.showSigninForm) {
            Auth.showSigninForm();
        }
    } catch (e) {}
    
    disconnectSocket();
};

    /**
     * Show app shell (after auth)
     */
    const showApp = () => {
        const authPage = document.getElementById('auth-page');
        const appShell = document.getElementById('app-shell');
        if (authPage) authPage.classList.remove('active');
        if (appShell) appShell.classList.add('active');

        updateTopbarUser();

        // Connect socket for live order updates
        connectSocket();

        // Load initial route
        setTimeout(handleRoute, 100);
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
            // Check if socket.io is available
            if (typeof io === 'undefined') {
                console.warn('Socket.IO not loaded');
                return;
            }

            socket = io({
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            
            socket.on('connect', () => {
                // Join user's private room
                socket.emit('join_room', user.id);
                console.log('🔌 Socket connected for user:', user.id);
            });
            
            // Listen for order updates
            socket.on('order_update', (data) => {
                console.log('📦 Order update received:', data);
                
                // Show toast notification
                if (typeof UI !== 'undefined' && UI.showToast) {
                    UI.showToast(data.message || 'Order updated!', 'success');
                }
                
                // Refresh orders if on orders or dashboard page
                if (currentPage === 'orders' || currentPage === 'dashboard') {
                    try {
                        if (typeof Orders !== 'undefined' && Orders.loadOrders) {
                            Orders.loadOrders();
                        }
                    } catch (e) {
                        console.error('Order refresh error:', e);
                    }
                }
                
                // Update order detail if currently viewing this order
                if (currentPage === 'order-detail') {
                    const orderId = window.location.hash.split('/')[1];
                    if (orderId && orderId === data.orderId) {
                        try {
                            if (typeof Orders !== 'undefined' && Orders.loadOrderDetail) {
                                Orders.loadOrderDetail(orderId);
                            }
                        } catch (e) {
                            console.error('Order detail refresh error:', e);
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
            try {
                socket.disconnect();
            } catch (e) {
                // Ignore
            }
            socket = null;
            console.log('🔌 Socket disconnected');
        }
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
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        const avatar = document.getElementById('topbar-avatar');
        const username = document.getElementById('topbar-username');
        
        if (avatar) avatar.textContent = initials || 'U';
        if (username) username.textContent = name;
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
        const toggle = document.getElementById('menu-toggle');
        const close = document.getElementById('sidebar-close');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (toggle) toggle.addEventListener('click', openMobileMenu);
        if (close) close.addEventListener('click', closeMobileMenu);
        if (overlay) overlay.addEventListener('click', closeMobileMenu);
    };

    const openMobileMenu = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeMobileMenu = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    /**
     * Navigate to a page
     */
    const navigate = (path) => {
        const cleanPath = path.replace(/^#/, '');

        if (window.location.hash !== `#${cleanPath}`) {
            window.location.hash = cleanPath;
        } else {
            switchPage(cleanPath);
        }
    };

    /**
     * Handle route change
     */
    const handleRoute = () => {
        if (!API.isAuthenticated()) {
            showAuth();
            return;
        }

        let hash = window.location.hash.replace('#', '');

        if (!hash) {
            hash = 'dashboard';
        }

        const parts = hash.split('/');
        const page = parts[0];
        const param = parts.slice(1).join('/');

        switchPage(page, param);
    };

    /**
     * Switch active page
     */
    const switchPage = (page, param) => {
        // Hide all pages
        document.querySelectorAll('.app-page').forEach(p => {
            p.classList.remove('active');
        });

        // Update nav items
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page || 
                (page === 'order-detail' && item.dataset.page === 'orders')) {
                item.classList.add('active');
            }
        });

        const pageMap = {
            dashboard: { id: 'page-dashboard', title: 'Dashboard' },
            orders: { id: 'page-orders', title: 'Orders' },
            'create-order': { id: 'page-create-order', title: 'New Order' },
            tracking: { id: 'page-tracking', title: 'Track Shipment' },
            profile: { id: 'page-profile', title: 'Profile' },
            'order-detail': { id: 'page-order-detail', title: 'Order Details' }
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

        const title = document.getElementById('page-title');
        if (title) {
            title.textContent = pageInfo.title;
        }

        // Close mobile menu
        closeMobileMenu();

        // Load page data
        loadPageData(page, param);

        currentPage = page;
    };

    /**
     * Load data for the current page
     */
    const loadPageData = (page, param) => {
        try {
            switch (page) {
                case 'dashboard':
                    if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                        Dashboard.load();
                    }
                    break;

                case 'orders':
                    if (typeof Orders !== 'undefined' && Orders.loadOrders) {
                        Orders.loadOrders();
                    }
                    break;

                case 'order-detail':
                    if (param && typeof Orders !== 'undefined' && Orders.loadOrderDetail) {
                        Orders.loadOrderDetail(param);
                    }
                    break;

                case 'tracking':
                    if (param && typeof Tracking !== 'undefined' && Tracking.loadTrackingById) {
                        Tracking.loadTrackingById(param);
                    } else if (typeof Tracking !== 'undefined' && Tracking.load) {
                        Tracking.load();
                    }
                    break;

                case 'profile':
                    if (typeof Profile !== 'undefined' && Profile.load) {
                        Profile.load();
                    }
                    break;

                case 'create-order':
                    break;
            }
        } catch (error) {
            console.error('Error loading page data:', error);
        }
    };

    /**
     * Check if app is ready
     */
    const isReady = () => isAppReady;

    return {
        init,
        onAuthSuccess,
        onAuthLogout,
        navigate,
        updateTopbarUser,
        connectSocket,
        disconnectSocket,
        isReady
    };

})();

// ==================== BOOT ====================
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
        try {
            App.init();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            // Show error state
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.innerHTML = `
                    <div style="text-align:center;color:#ef4444;padding:20px;">
                        <h2>Failed to load application</h2>
                        <p style="color:#94a3b8;">Please refresh the page</p>
                        <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#f59e0b;border:none;border-radius:8px;color:#0f172a;font-weight:700;cursor:pointer;">
                            Refresh
                        </button>
                    </div>
                `;
                splash.classList.remove('hidden');
            }
        }
    }, 100);
});

console.log('✅ App module loaded');