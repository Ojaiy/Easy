/**
 * Orders Module for EASYSHIP NG
 */

const Orders = (() => {

    let allOrders = [];
    let currentFilter = 'all';
    let currentSearch = '';
    let currentOrderId = null;

    const init = () => {
        const searchInput = document.getElementById('orders-search');
        const filterSelect = document.getElementById('orders-filter');
        const createForm = document.getElementById('create-order-form');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value.trim().toLowerCase();
                filterAndRender();
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                filterAndRender();
            });
        }

        if (createForm) {
            createForm.addEventListener('submit', handleCreateOrder);
        }
    };

    const loadOrders = async () => {
        const user = API.getUser();
        if (!user) return;

        const customerId = user.id || user._id || user.userId;
        if (!customerId) {
            renderEmpty();
            return;
        }

        const container = document.getElementById('orders-list');
        if (!container) return;
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
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
        }
    };

    const filterAndRender = () => {
        let filtered = [...allOrders];

        if (currentFilter !== 'all') {
            filtered = filtered.filter(o => (o.status || 'pending') === currentFilter);
        }

        if (currentSearch) {
            filtered = filtered.filter(o => {
                const id = (o._id || o.id || '').toLowerCase();
                const pickup = (o.pickup?.address || o.pickupAddress || '').toLowerCase();
                const dropoff = (o.dropoff?.address || o.dropoffAddress || '').toLowerCase();
                const recipient = (o.dropoff?.recipientName || o.recipientName || '').toLowerCase();
                return id.includes(currentSearch) || pickup.includes(currentSearch) || 
                       dropoff.includes(currentSearch) || recipient.includes(currentSearch);
            });
        }

        renderOrders(filtered);
    };

    const renderOrders = (orders) => {
        const container = document.getElementById('orders-list');
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = UI.emptyStateHTML(
                allOrders.length === 0 ? 'package' : 'search',
                allOrders.length === 0 ? 'No orders yet' : 'No matching orders',
                allOrders.length === 0 ? 'Create your first shipment to see it here.' : 'Try adjusting your search or filter.'
            );
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
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
                <div class="order-item" onclick="App.navigate('order-detail/${orderId}')">
                    <div class="order-item-left">
                        <div class="order-item-icon">
                            <i data-lucide="package"></i>
                        </div>
                        <div class="order-item-info">
                            <div class="order-item-id">#${UI.shortId(orderId)}</div>
                            <div class="order-item-details">${UI.truncate(pickup, 22)} → ${UI.truncate(dropoff, 22)}</div>
                            <div class="order-item-details" style="font-size:0.7rem;color:var(--text-muted);">
                                ${UI.formatStatus(packageType)} • ${UI.formatDate(date)}
                            </div>
                        </div>
                    </div>
                    <div class="order-item-right">
                        <span class="order-item-price">${UI.formatCurrency(price)}</span>
                        ${UI.statusBadge(status)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    };

    const renderEmpty = () => {
        const container = document.getElementById('orders-list');
        if (!container) return;
        container.innerHTML = UI.emptyStateHTML('package', 'No orders yet', 'Create your first shipment to see it here.');
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    };

    const loadOrderDetail = async (orderId) => {
        currentOrderId = orderId;
        const container = document.getElementById('order-detail-content');
        if (!container) return;
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
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
        }
    };

    const renderOrderDetail = (order) => {
        const container = document.getElementById('order-detail-content');
        if (!container) return;

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
            <button class="back-btn" onclick="App.navigate('orders')" style="display:inline-flex;align-items:center;gap:8px;margin-bottom:20px;padding:8px 16px;background:rgba(255,255,255,0.04);border:none;border-radius:8px;color:#94a3b8;cursor:pointer;font-size:0.9rem;transition:all 0.3s ease;">
                <i data-lucide="arrow-left" style="width:16px;height:16px;"></i> Back to Orders
            </button>
            <div class="card" style="padding:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                    <h3 style="font-size:1.1rem;">Order #${UI.shortId(orderId)}</h3>
                    ${UI.statusBadge(status)}
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                    <div style="grid-column:1/-1;background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="display:flex;gap:16px;flex-wrap:wrap;">
                            <div style="flex:1;min-width:150px;">
                                <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;">Pickup</div>
                                <div style="margin-top:4px;">${pickup}</div>
                            </div>
                            <div style="flex:1;min-width:150px;">
                                <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;">Dropoff</div>
                                <div style="margin-top:4px;">${dropoff}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:8px;">Recipient</div>
                        <div style="font-weight:600;">${recipientName}</div>
                        <div style="font-size:0.9rem;color:#94a3b8;">${recipientPhone}</div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:8px;">Package</div>
                        <div style="font-weight:600;">${UI.formatStatus(packageType)}</div>
                        <div style="font-size:0.9rem;color:#94a3b8;">${packageWeight} kg</div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:8px;">Price</div>
                        <div style="font-size:1.3rem;font-weight:700;color:#f59e0b;">${UI.formatCurrency(price)}</div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:8px;">Distance</div>
                        <div style="font-weight:600;">${distance}${typeof distance === 'number' ? ' km' : ''}</div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:8px;">Created</div>
                        <div style="font-weight:600;">${UI.formatDateTime(createdAt)}</div>
                    </div>
                    
                    ${driver ? `
                    <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:8px;">Driver</div>
                        <div style="font-weight:600;">${typeof driver === 'string' ? UI.shortId(driver) : driver.name || 'Assigned'}</div>
                    </div>
                    ` : ''}
                </div>
                
                ${instructions && instructions !== 'None' ? `
                <div style="margin-top:16px;background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                    <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:8px;">Instructions</div>
                    <div style="font-size:0.9rem;color:#94a3b8;">${instructions}</div>
                </div>
                ` : ''}
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    };

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

            document.getElementById('create-order-form').reset();
            const preview = document.getElementById('order-summary-preview');
            if (preview) preview.style.display = 'none';

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
    };
})();