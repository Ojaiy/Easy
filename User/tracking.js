/**
 * Tracking Module for EASYSHIP NG
 * Uses POST /start, POST /update, GET /:orderId for tracking
 */

const Tracking = (() => {

    /**
     * Initialize tracking module
     */
    const init = () => {
        document.getElementById('tracking-search-form').addEventListener('submit', handleTrackSearch);
    };

    /**
     * Handle tracking search form
     */
    const handleTrackSearch = async (e) => {
        e.preventDefault();

        const orderId = document.getElementById('tracking-order-id').value.trim();
        if (!orderId) {
            UI.showToast('Please enter an order ID.', 'warning');
            return;
        }

        await loadTracking(orderId);
    };

    /**
     * Load tracking data for an order
     * Note: The tracking endpoint is GET /:orderId under the tracking route
     */
    const loadTracking = async (orderId) => {
        const resultContainer = document.getElementById('tracking-result');
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = UI.loadingHTML('Fetching tracking information...');

        try {
            // Try the tracking endpoint: GET /api/v1/:orderId
            // This might be under /tracking/:orderId or just /:orderId
            // Based on the API spec: GET /:orderId (tracking endpoint)
            const response = await API.getTracking(orderId);
            const trackingData = response.data || response.tracking || response;
            renderTrackingResult(orderId, trackingData);
        } catch (error) {
            // If the dedicated tracking endpoint fails, try getting order details
            // and constructing tracking info from the order status
            try {
                const orderResponse = await API.getOrder(orderId);
                const order = orderResponse.data || orderResponse.order || orderResponse;
                renderTrackingFromOrder(orderId, order);
            } catch (orderError) {
                console.error('Tracking error:', error);
                resultContainer.innerHTML = UI.emptyStateHTML(
                    'map-pin-off',
                    'Tracking not found',
                    error.message || 'No tracking information available for this order ID.'
                );
                lucide.createIcons({ nodes: [resultContainer] });
            }
        }
    };

    /**
     * Render tracking result from tracking API data
     */
    const renderTrackingResult = (orderId, data) => {
        const resultContainer = document.getElementById('tracking-result');
        const status = data.status || 'pending';
        const currentLocation = data.currentLocation || data.current_location || data.location || 'Unknown';
        const updatedAt = data.updatedAt || data.updated_at || '';

        // Build timeline based on tracking status
        const timeline = buildTimeline(status, currentLocation, updatedAt, data);

        resultContainer.innerHTML = `
            <div class="tracking-result-card">
                <div class="tracking-result-header">
                    <h4>Order #${UI.shortId(orderId)}</h4>
                    ${UI.statusBadge(status)}
                </div>
                <div class="tracking-result-body">
                    <div class="tracking-timeline">
                        ${timeline}
                    </div>
                    <div class="tracking-location">
                        <i data-lucide="map-pin"></i>
                        <span>Current Location: ${currentLocation}</span>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons({ nodes: [resultContainer] });
    };

    /**
     * Render tracking from order data (fallback)
     */
    const renderTrackingFromOrder = (orderId, order) => {
        const resultContainer = document.getElementById('tracking-result');
        const status = order.status || 'pending';
        const pickup = order.pickup?.address || order.pickupAddress || 'Pickup location';
        const dropoff = order.dropoff?.address || order.dropoffAddress || 'Dropoff location';

        const timeline = buildTimeline(status, status === 'in_transit' ? 'En Route' : status === 'delivered' ? dropoff : pickup, order.updatedAt || '', order);

        resultContainer.innerHTML = `
            <div class="tracking-result-card">
                <div class="tracking-result-header">
                    <h4>Order #${UI.shortId(orderId)}</h4>
                    ${UI.statusBadge(status)}
                </div>
                <div class="tracking-result-body">
                    <div class="tracking-timeline">
                        ${timeline}
                    </div>
                    <div class="tracking-location">
                        <i data-lucide="map-pin"></i>
                        <span>${status === 'delivered' ? 'Delivered to: ' + dropoff : status === 'in_transit' ? 'En route to: ' + dropoff : 'At: ' + pickup}</span>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons({ nodes: [resultContainer] });
    };

    /**
     * Build tracking timeline based on status
     */
    const buildTimeline = (status, currentLocation, updatedAt, data) => {
        const steps = [
            { key: 'pending', label: 'Order Placed', desc: 'Your order has been received' },
            { key: 'picked_up', label: 'Picked Up', desc: 'Driver has picked up your package' },
            { key: 'in_transit', label: 'In Transit', desc: 'Package is on its way' },
            { key: 'delivered', label: 'Delivered', desc: 'Package has been delivered' },
        ];

        const statusOrder = ['pending', 'picked_up', 'in_transit', 'delivered'];
        const currentIndex = statusOrder.indexOf(status);
        const isCancelled = status === 'cancelled';

        let html = '';

        if (isCancelled) {
            html = `
                <div class="timeline-item">
                    <div class="timeline-dot active" style="border-color:var(--danger);background:var(--danger-light);"></div>
                    <div class="timeline-content">
                        <h5>Order Cancelled</h5>
                        <p>This order was cancelled</p>
                    </div>
                </div>
            `;
            return html;
        }

        steps.forEach((step, i) => {
            const dotClass = i < currentIndex ? 'completed' : i === currentIndex ? 'active' : '';
            const desc = i === currentIndex && currentLocation ? `Location: ${currentLocation}` : step.desc;
            const time = i <= currentIndex && updatedAt ? UI.formatDateTime(updatedAt) : '';

            html += `
                <div class="timeline-item">
                    <div class="timeline-dot ${dotClass}"></div>
                    <div class="timeline-content">
                        <h5>${step.label}</h5>
                        <p>${desc}${time ? ' — ' + time : ''}</p>
                    </div>
                </div>
            `;
        });

        return html;
    };

    /**
     * Load tracking by orderId (from URL param)
     */
    const loadTrackingById = (orderId) => {
        document.getElementById('tracking-order-id').value = orderId;
        loadTracking(orderId);
    };

    return {
        init,
        loadTracking,
        loadTrackingById,
    };
})();