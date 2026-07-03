/**
 * Main Application Module for EASYSHIP NG
 */

const App = (() => {

    let currentPage = 'dashboard';
    let socket = null;
    let isAppReady = false;

    const init = () => {
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.classList.add('hidden');

            if (API.isAuthenticated()) {
                const user = API.getUser();
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

        try {
            if (typeof Auth !== 'undefined' && Auth.init) Auth.init();
        } catch (e) { console.error('Auth init error:', e); }

        try {
            if (typeof Dashboard !== 'undefined' && Dashboard.init) Dashboard.init();
        } catch (e) { console.error('Dashboard init error:', e); }

        try {
            if (typeof Orders !== 'undefined' && Orders.init) Orders.init();
        } catch (e) { console.error('Orders init error:', e); }

        try {
            if (typeof Tracking !== 'undefined' && Tracking.init) Tracking.init();
        } catch (e) { console.error('Tracking init error:', e); }

        try {
            if (typeof Profile !== 'undefined' && Profile.init) Profile.init();
        } catch (e) { console.error('Profile init error:', e); }

        setupNavigation();
        setupMobileMenu();
        window.addEventListener('hashchange', handleRoute);
        setTimeout(handleRoute, 200);
        updateTopbarUser();

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) closeMobileMenu();
        });

        // FIX #1 - Prevent back button from logging out
        window.addEventListener('popstate', function() {
            if (API.isAuthenticated()) {
                const authPage = document.getElementById('auth-page');
                const appShell = document.getElementById('app-shell');
                if (authPage) authPage.classList.remove('active');
                if (appShell) appShell.classList.add('active');
                handleRoute();
            }
        });

        isAppReady = true;
        console.log('✅ App initialized');
    };

    // FIX #1 - Fixed showAuth to check session first
    const showAuth = () => {
        // If already logged in, stay in app
        if (API.isAuthenticated()) {
            showApp();
            return;
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

    const showApp = () => {
        const authPage = document.getElementById('auth-page');
        const appShell = document.getElementById('app-shell');
        if (authPage) authPage.classList.remove('active');
        if (appShell) appShell.classList.add('active');

        updateTopbarUser();
        connectSocket();
        setTimeout(handleRoute, 100);
    };

    const connectSocket = () => {
        const user = API.getUser();
        if (!user || !user.id) return;
        if (socket && socket.connected) return;

        try {
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
                socket.emit('join_room', user.id);
                console.log('🔌 Socket connected for user:', user.id);
            });
            
            socket.on('order_update', (data) => {
                console.log('📦 Order update received:', data);
                if (typeof UI !== 'undefined' && UI.showToast) {
                    UI.showToast(data.message || 'Order updated!', 'success');
                }
                if (currentPage === 'orders' || currentPage === 'dashboard') {
                    try {
                        if (typeof Orders !== 'undefined' && Orders.loadOrders) {
                            Orders.loadOrders();
                        }
                    } catch (e) {}
                }
                if (currentPage === 'order-detail') {
                    const orderId = window.location.hash.split('/')[1];
                    if (orderId && orderId === data.orderId) {
                        try {
                            if (typeof Orders !== 'undefined' && Orders.loadOrderDetail) {
                                Orders.loadOrderDetail(orderId);
                            }
                        } catch (e) {}
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

    const disconnectSocket = () => {
        if (socket) {
            try { socket.disconnect(); } catch (e) {}
            socket = null;
            console.log('🔌 Socket disconnected');
        }
    };

    const onAuthSuccess = () => { showApp(); };
    const onAuthLogout = () => {
        disconnectSocket();
        showAuth();
        window.location.hash = '';
    };

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

    const setupNavigation = () => {
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) navigate(page);
                closeMobileMenu();
            });
        });
    };

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

    const navigate = (path) => {
        const cleanPath = path.replace(/^#/, '');
        if (window.location.hash !== `#${cleanPath}`) {
            window.location.hash = cleanPath;
        } else {
            switchPage(cleanPath);
        }
    };

    // FIX #1 - Fixed handleRoute to check auth properly
    const handleRoute = () => {
        if (!API.isAuthenticated()) {
            showAuth();
            return;
        }

        let hash = window.location.hash.replace('#', '');
        if (!hash) hash = 'dashboard';

        const parts = hash.split('/');
        const page = parts[0];
        const param = parts.slice(1).join('/');
        switchPage(page, param);
    };

    const switchPage = (page, param) => {
        document.querySelectorAll('.app-page').forEach(p => {
            p.classList.remove('active');
        });

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
        if (!pageInfo) { switchPage('dashboard'); return; }

        const pageEl = document.getElementById(pageInfo.id);
        if (pageEl) pageEl.classList.add('active');

        const title = document.getElementById('page-title');
        if (title) title.textContent = pageInfo.title;

        closeMobileMenu();
        loadPageData(page, param);
        currentPage = page;
    };

    const loadPageData = (page, param) => {
        try {
            switch (page) {
                case 'dashboard':
                    if (typeof Dashboard !== 'undefined' && Dashboard.load) Dashboard.load();
                    break;
                case 'orders':
                    if (typeof Orders !== 'undefined' && Orders.loadOrders) Orders.loadOrders();
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
                    if (typeof Profile !== 'undefined' && Profile.load) Profile.load();
                    break;
                case 'create-order':
                    break;
            }
        } catch (error) {
            console.error('Error loading page data:', error);
        }
    };

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

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            App.init();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
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