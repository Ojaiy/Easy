/**
 * Dashboard Module for EASYSHIP NG
 * Loads real data from GET /dashboard/:customerId
 */

const Dashboard = (() => {

    let dashboardData = null;

    /**
     * Initialize dashboard
     */
    const init = () => {
        // Dashboard will load when user navigates to it
    };

    /**
     * Load dashboard data from API
     */
    const load = async () => {
        const user = API.getUser();
        if (!user) return;

        const customerId = user.id || user._id || user.userId;
        if (!customerId) {
            renderEmpty();
            return;
        }

        // Show skeleton loading
        showSkeletonLoading();

        try {
            const response = await API.getDashboard(customerId);

            // Handle various response formats from the API
            dashboardData = response.data || response.dashboard || response;
            render(dashboardData);
        } catch (error) {
            console.error('Dashboard load error:', error);
            renderError(error.message);
        }
    };

    /**
     * Show skeleton loading state
     */
    const showSkeletonLoading = () => {
        document.getElementById('dash-total-orders').textContent = '—';
        document.getElementById('dash-active-orders').textContent = '—';
        document.getElementById('dash-delivered-orders').textContent = '—';
        document.getElementById('dash-total-spent').textContent = '—';

        document.getElementById('recent-orders-list').innerHTML = UI.loadingHTML('Loading dashboard...');
    };

    /**
     * Render dashboard with real data
     */
    const render = (data) => {
        // The API may return dashboard stats in different formats
        // We handle: { totalOrders, activeOrders, deliveredOrders, totalSpent, recentOrders }
        // or: { data: { ... } }
        // or: { orders: [...], stats: { ... } }

        const stats = data.stats || data.data || data;
        const orders = data.recentOrders || data.orders || data.data?.orders || [];

        // Total Orders
        const totalOrders = stats.totalOrders ?? stats.total_orders ?? stats.orderCount ?? (Array.isArray(orders) ? orders.length : 0);
        document.getElementById('dash-total-orders').textContent = totalOrders.toLocaleString();

        // Active Shipments
        const activeOrders = stats.activeOrders ?? stats.active_orders ?? stats.inTransit ?? 0;
        document.getElementById('dash-active-orders').textContent = activeOrders.toLocaleString();

        // Delivered
        const deliveredOrders = stats.deliveredOrders ?? stats.delivered_orders ?? stats.completed ?? 0;
        document.getElementById('dash-delivered-orders').textContent = deliveredOrders.toLocaleString();

        // Total Spent
        const totalSpent = stats.totalSpent ?? stats.total_spent ?? stats.totalRevenue ?? 0;
        document.getElementById('dash-total-spent').textContent = UI.formatCurrency(totalSpent);

        // Render recent orders
        renderRecentOrders(orders);
    };

    /**
     * Render recent orders list
     */
    const renderRecentOrders = (orders) => {
        const container = document.getElementById('recent-orders-list');

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            container.innerHTML = UI.emptyStateHTML('inbox', 'No orders yet', 'Create your first order to get started.');
            lucide.createIcons({ nodes: [container] });
            return;
        }

        // Show only the 5 most recent
        const recent = orders.slice(0, 5);

        let html = '';
        recent.forEach(order => {
            const orderId = order._id || order.id || '';
            const status = order.status || 'pending';
            const pickup = order.pickup?.address || order.pickupAddress || 'Pickup';
            const dropoff = order.dropoff?.address || order.dropoffAddress || 'Dropoff';
            const price = order.price || 0;

            const iconColor = status === 'delivered' ? 'emerald' : status === 'in_transit' ? 'blue' : 'green';

            html += `
                <div class="recent-order-item" onclick="App.navigate('order-detail/${orderId}')">
                    <div class="recent-order-icon stat-icon-wrap ${iconColor}">
                        <i data-lucide="package"></i>
                    </div>
                    <div class="recent-order-info">
                        <div class="recent-order-id">${UI.shortId(orderId)}</div>
                        <div class="recent-order-route">${UI.truncate(pickup, 18)} → ${UI.truncate(dropoff, 18)}</div>
                    </div>
                    <div class="recent-order-status">
                        ${UI.statusBadge(status)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        lucide.createIcons({ nodes: [container] });
    };

    /**
     * Render error state
     */
    const renderError = (message) => {
        document.getElementById('dash-total-orders').textContent = '0';
        document.getElementById('dash-active-orders').textContent = '0';
        document.getElementById('dash-delivered-orders').textContent = '0';
        document.getElementById('dash-total-spent').textContent = '₦0';

        document.getElementById('recent-orders-list').innerHTML = UI.emptyStateHTML(
            'alert-circle',
            'Could not load dashboard',
            message || 'Check your connection and try again.'
        );
        lucide.createIcons({ nodes: [document.getElementById('recent-orders-list')] });
    };

    const renderEmpty = () => {
        document.getElementById('dash-total-orders').textContent = '0';
        document.getElementById('dash-active-orders').textContent = '0';
        document.getElementById('dash-delivered-orders').textContent = '0';
        document.getElementById('dash-total-spent').textContent = '₦0';

        document.getElementById('recent-orders-list').innerHTML = UI.emptyStateHTML(
            'inbox',
            'No data available',
            'Start by creating an order.'
        );
        lucide.createIcons({ nodes: [document.getElementById('recent-orders-list')] });
    };

    return {
        init,
        load,
    };
})();