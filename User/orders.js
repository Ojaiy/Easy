/**
 * Orders Module for EASYSHIP NG
 * Handles orders list, order detail, create order
 */

const Orders = (() => {

    let allOrders = [];
    let currentFilter = 'all';
    let currentSearch = '';
    let currentOrderId = null;

    /**
     * Initialize orders module
     */
    const init = () => {
        document.getElementById('orders-search').addEventListener('input', (e) => {
            currentSearch = e.target.value.trim().toLowerCase();
            filterAndRender();
        });

        document.getElementById('orders-filter').addEventListener('change', (e) => {
            currentFilter = e.target.value;
            filterAndRender();
        });

        document.getElementById('create-order-form').addEventListener('submit', handleCreateOrder);

        // Listen for global order updates from App socket
        document.addEventListener('orderUpdated', (e) => {
            const { orderId, status, message } = e.detail;
            handleOrderUpdate(orderId, status, message);
        });
    };

    /**
     * Handle real-time order update
     */
    const handleOrderUpdate = (orderId, status, message) => {
        // Update the order in allOrders array
        const orderIndex = allOrders.findIndex(o => (o._id || o.id) === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = status;
            // Re-render if on orders page or dashboard
            filterAndRender();
        }

        // Update the detail view if currently viewing this order
        if (currentOrderId === orderId) {
            loadOrderDetail(orderId);
        }

        // Update individual status element if it exists
        const statusEl = document.getElementById(`order-status-${orderId}`);
        if (statusEl) {
            statusEl.innerText = formatOrderStatus(status);
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
     * Load orders from API
     */
    const loadOrders = async () => {
        const user = API.getUser();
        if (!user) return;

        const customerId = user.id || user._id || user.userId;
        if (!customerId) {
            renderEmpty();
            return;
        }

        const container = document.getElementById('orders-list');
        container.innerHTML = UI.loadingHTML('Loading your orders...');

        try {
            const response = await API.getOrders(customerId);
            allOrders = response.data || response.orders || response;
            if (!Array.isArray(allOrders)) allOrders = [];
            filterAndRender();
        } catch (error) {
            console.error('Orders load error:', error);
            container.innerHTML = UI.emptyStateHTML(
                'alert-circle',
                'Could not load orders',
                error.message || 'Please try again later.'
            );
            lucide.createIcons({ nodes: [container] });
        }
    };

    /**
     * Filter and render orders
     */
    const filterAndRender = () => {
        let filtered = [...allOrders];

        // Filter by status
        if (currentFilter !== 'all') {
            filtered = filtered.filter(o => (o.status || 'pending') === currentFilter);
        }

        // Filter by search
        if (currentSearch) {
            filtered = filtered.filter(o => {
                const id = (o._id || o.id || '').toLowerCase();
                const pickup = (o.pickup?.address || o.pickupAddress || '').toLowerCase();
                const dropoff = (o.dropoff?.address || o.dropoffAddress || '').toLowerCase();
                const recipient = (o.dropoff?.recipientName || o.recipientName || '').toLowerCase();
                return id.includes(currentSearch) || pickup.includes(currentSearch) || dropoff.includes(currentSearch) || recipient.includes(currentSearch);
            });
        }

        renderOrders(filtered);
    };

    /**
     * Render orders list
     */
    const renderOrders = (orders) => {
        const container = document.getElementById('orders-list');

        if (!orders || orders.length === 0) {
            if (allOrders.length === 0) {
                container.innerHTML = UI.emptyStateHTML('package', 'No orders yet', 'Create your first shipment to see it here.');
            } else {
                container.innerHTML = UI.emptyStateHTML('search', 'No matching orders', 'Try adjusting your search or filter.');
            }
            lucide.createIcons({ nodes: [container] });
            return;
        }

        let html = '';
        orders.forEach(order => {
            const orderId = order._id || order.id || '';
            const status = order.status || 'pending';
            const pickup = order.pickup?.address || order.pickupAddress || 'N/A';
            const dropoff = order.dropoff?.address || order.dropoffAddress || 'N/A';
            const price = order.price || 0;
            const date = order.createdAt || order.created_at || '';
            const packageType = order.package?.type || order.packageType || 'package';

            html += `
                <div class="order-card" onclick="App.navigate('order-detail/${orderId}')">
                    <div class="order-card-icon">
                        <i data-lucide="package"></i>
                    </div>
                    <div class="order-card-info">
                        <div class="order-card-top">
                            <span class="order-card-id">#${UI.shortId(orderId)}</span>
                            <span id="order-status-${orderId}">${UI.statusBadge(status)}</span>
                        </div>
                        <div class="order-card-route">${UI.truncate(pickup, 22)} → ${UI.truncate(dropoff, 22)}</div>
                        <div class="order-card-meta">
                            <span>${packageType}</span>
                            <span>•</span>
                            <span>${UI.formatDate(date)}</span>
                        </div>
                    </div>
                    <div class="order-card-right">
                        <span class="order-card-price">${UI.formatCurrency(price)}</span>
                        <i data-lucide="chevron-right" style="width:16px;height:16px;color:var(--gray-3);"></i>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        lucide.createIcons({ nodes: [container] });
    };

    const renderEmpty = () => {
        const container = document.getElementById('orders-list');
        container.innerHTML = UI.emptyStateHTML('package', 'No orders yet', 'Create your first shipment to see it here.');
        lucide.createIcons({ nodes: [container] });
    };

    /**
     * Load single order detail
     */
    const loadOrderDetail = async (orderId) => {
        currentOrderId = orderId;
        const container = document.getElementById('order-detail-content');
        container.innerHTML = UI.loadingHTML('Loading order details...');

        try {
            const response = await API.getOrder(orderId);
            const order = response.data || response.order || response;
            renderOrderDetail(order);
        } catch (error) {
            console.error('Order detail error:', error);
            container.innerHTML = UI.emptyStateHTML(
                'alert-circle',
                'Could not load order',
                error.message || 'Please try again later.'
            );
            lucide.createIcons({ nodes: [container] });
        }
    };

    /**
     * Render order detail page
     */
    const renderOrderDetail = (order) => {
        const container = document.getElementById('order-detail-content');
        const orderId = order._id || order.id || '';
        const status = order.status || 'pending';
        const pickup = order.pickup?.address || order.pickupAddress || 'N/A';
        const dropoff = order.dropoff?.address || order.dropoffAddress || 'N/A';
        const recipientName = order.dropoff?.recipientName || order.recipientName || 'N/A';
        const recipientPhone = order.dropoff?.phone || order.recipientPhone || 'N/A';
        const packageType = order.package?.type || order.packageType || 'N/A';
        const packageWeight = order.package?.weight || order.packageWeight || 'N/A';
        const instructions = order.instructions || 'None';
        const price = order.price || 0;
        const distance = order.distance || '—';
        const driver = order.driver || null;
        const createdAt = order.createdAt || order.created_at || '';
        const updatedAt = order.updatedAt || order.updated_at || '';

        container.innerHTML = `
            <button class="back-btn" onclick="App.navigate('orders')">
                <i data-lucide="arrow-left"></i> Back to Orders
            </button>
            <div class="order-detail-card">
                <div class="order-detail-header">
                    <h3>Order #${UI.shortId(orderId)}</h3>
                    <span id="order-status-${orderId}">${UI.statusBadge(status)}</span>
                </div>
                <div class="order-detail-body">
                    <div class="detail-section">
                        <div class="route-visual">
                            <div class="route-line">
                                <div class="route-dot pickup"></div>
                                <div class="route-dash"></div>
                                <div class="route-dot dropoff"></div>
                            </div>
                            <div class="route-addresses">
                                <div>
                                    <div class="route-address-label pickup">PICKUP</div>
                                    <div class="route-address-text">${pickup}</div>
                                </div>
                                <div>
                                    <div class="route-address-label dropoff">DROPOFF</div>
                                    <div class="route-address-text">${dropoff}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Recipient</div>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Name</span>
                                <span class="detail-value">${recipientName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Phone</span>
                                <span class="detail-value">${recipientPhone}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Package</div>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Type</span>
                                <span class="detail-value">${UI.formatStatus(packageType)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Weight</span>
                                <span class="detail-value">${packageWeight} kg</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Order Info</div>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Price</span>
                                <span class="detail-value" style="color:var(--primary);font-size:1.1rem;">${UI.formatCurrency(price)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Distance</span>
                                <span class="detail-value">${distance}${typeof distance === 'number' ? ' km' : ''}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Created</span>
                                <span class="detail-value">${UI.formatDateTime(createdAt)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Updated</span>
                                <span class="detail-value">${UI.formatDateTime(updatedAt)}</span>
                            </div>
                            ${driver ? `
                            <div class="detail-item">
                                <span class="detail-label">Driver</span>
                                <span class="detail-value">${typeof driver === 'string' ? UI.shortId(driver) : driver.name || 'Assigned'}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    ${instructions && instructions !== 'None' ? `
                    <div class="detail-section">
                        <div class="detail-section-title">Instructions</div>
                        <p style="font-size:0.9rem;color:var(--dark-2);background:var(--gray-7);padding:12px;border-radius:var(--radius-sm);">${instructions}</p>
                    </div>
                    ` : ''}

                    ${status === 'in_transit' ? `
                    <div class="detail-section" style="margin-top:16px;">
                        <div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--primary-soft);border-radius:var(--radius-md);">
                            <i data-lucide="truck" style="width:24px;height:24px;color:var(--primary);"></i>
                            <div>
                                <div style="font-weight:600;color:var(--dark-1);">Your package is on the way!</div>
                                <div style="font-size:0.9rem;color:var(--dark-2);">Track your shipment in real-time</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${status === 'delivered' ? `
                    <div class="detail-section" style="margin-top:16px;">
                        <div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--success-soft);border-radius:var(--radius-md);">
                            <i data-lucide="check-circle" style="width:24px;height:24px;color:var(--success);"></i>
                            <div>
                                <div style="font-weight:600;color:var(--dark-1);">Delivered Successfully! ✅</div>
                                <div style="font-size:0.9rem;color:var(--dark-2);">Your package has been delivered.</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        lucide.createIcons({ nodes: [container] });
    };

    /**
     * Handle create order form submission
     */
    const handleCreateOrder = async (e) => {
        e.preventDefault();
        UI.clearErrors('create-order-form');

        const user = API.getUser();
        if (!user) {
            UI.showToast('Please sign in to create an order.', 'warning');
            return;
        }

        const customerId = user.id || user._id || user.userId;

        const pickupAddress = document.getElementById('pickup-address').value.trim();
        const dropoffAddress = document.getElementById('dropoff-address').value.trim();
        const recipientName = document.getElementById('recipient-name').value.trim();
        const recipientPhone = document.getElementById('recipient-phone').value.trim();
        const packageType = document.getElementById('package-type').value;
        const packageWeight = document.getElementById('package-weight').value;
        const instructions = document.getElementById('instructions').value.trim();

        let hasError = false;

        if (!pickupAddress) {
            UI.setFieldError('pickup-address', 'Pickup address is required');
            hasError = true;
        }

        if (!dropoffAddress) {
            UI.setFieldError('dropoff-address', 'Dropoff address is required');
            hasError = true;
        }

        if (!recipientName) {
            UI.setFieldError('recipient-name', 'Recipient name is required');
            hasError = true;
        }

        if (!recipientPhone) {
            UI.setFieldError('recipient-phone', 'Recipient phone is required');
            hasError = true;
        }

        if (!packageType) {
            UI.setFieldError('package-type', 'Please select a package type');
            hasError = true;
        }

        if (!packageWeight || parseFloat(packageWeight) <= 0) {
            UI.setFieldError('package-weight', 'Enter a valid weight');
            hasError = true;
        }

        if (hasError) return;

        const btn = document.getElementById('create-order-btn');
        UI.setButtonLoading(btn, true);

        const orderPayload = {
            customerId,
            pickup: { address: pickupAddress },
            dropoff: { address: dropoffAddress, recipientName, phone: recipientPhone },
            package: { type: packageType, weight: parseFloat(packageWeight) },
            instructions,
        };

        try {
            const response = await API.createOrder(orderPayload);
            UI.showToast('Order created successfully! 🚀', 'success');

            // Reset form
            document.getElementById('create-order-form').reset();
            document.getElementById('order-summary-preview').style.display = 'none';

            // Navigate to the new order
            const newOrder = response.data || response.order || response;
            const newOrderId = newOrder._id || newOrder.id || '';

            if (newOrderId) {
                App.navigate(`order-detail/${newOrderId}`);
            } else {
                App.navigate('orders');
            }
        } catch (error) {
            UI.showToast(error.message || 'Failed to create order. Please try again.', 'error');
        } finally {
            UI.setButtonLoading(btn, false);
        }
    };

    return {
        init,
        loadOrders,
        loadOrderDetail,
        handleCreateOrder,
        handleOrderUpdate,
    };
})();