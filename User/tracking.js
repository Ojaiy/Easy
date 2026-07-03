/**
 * Tracking Module for EASYSHIP NG
 */

const Tracking = (() => {

    const init = () => {
        const form = document.getElementById('tracking-search-form');
        if (form) {
            form.addEventListener('submit', handleTrackSearch);
        }
    };

    const handleTrackSearch = async (e) => {
        e.preventDefault();

        const orderId = document.getElementById('tracking-order-id').value.trim();
        if (!orderId) {
            UI.showToast('Please enter an order ID.', 'warning');
            return;
        }

        await loadTracking(orderId);
    };

    const loadTracking = async (orderId) => {
        const resultContainer = document.getElementById('tracking-result');
        if (!resultContainer) return;
        
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = UI.loadingHTML('Fetching tracking information...');

        try {
            const response = await API.getTracking(orderId);
            const trackingData = response.data || response.tracking || response;
            renderTrackingResult(orderId, trackingData);
        } catch (error) {
            // Fallback: try getting order details
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
                if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [resultContainer] });
            }
        }
    };

    const renderTrackingResult = (orderId, data) => {
        const resultContainer = document.getElementById('tracking-result');
        if (!resultContainer) return;

        const status = data.status || 'pending';
        const currentLocation = data.currentLocation || data.current_location || data.location || 'Unknown';
        const updatedAt = data.updatedAt || data.updated_at || '';

        const timeline = buildTimeline(status, currentLocation, updatedAt, data);

        resultContainer.innerHTML = `
            <div class="tracking-result-card" style="background:rgba(255,255,255,0.03);border-radius:16px;padding:24px;border:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                    <h4 style="font-size:1rem;">Order #${UI.shortId(orderId)}</h4>
                    ${UI.statusBadge(status)}
                </div>
                <div style="position:relative;padding-left:24px;">
                    ${timeline}
                </div>
                <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:0.9rem;">
                    <i data-lucide="map-pin" style="width:18px;height:18px;color:#f59e0b;"></i>
                    <span>Current Location: ${currentLocation}</span>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [resultContainer] });
    };

    const renderTrackingFromOrder = (orderId, order) => {
        const resultContainer = document.getElementById('tracking-result');
        if (!resultContainer) return;

        const status = order.status || 'pending';
        const pickup = order.pickup?.address || order.pickupAddress || 'Pickup location';
        const dropoff = order.dropoff?.address || order.dropoffAddress || 'Dropoff location';
        const location = status === 'delivered' ? dropoff : status === 'in_transit' ? 'En Route to ' + dropoff : pickup;

        const timeline = buildTimeline(status, location, order.updatedAt || '', order);

        resultContainer.innerHTML = `
            <div class="tracking-result-card" style="background:rgba(255,255,255,0.03);border-radius:16px;padding:24px;border:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                    <h4 style="font-size:1rem;">Order #${UI.shortId(orderId)}</h4>
                    ${UI.statusBadge(status)}
                </div>
                <div style="position:relative;padding-left:24px;">
                    ${timeline}
                </div>
                <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:0.9rem;">
                    <i data-lucide="map-pin" style="width:18px;height:18px;color:#f59e0b;"></i>
                    <span>${location}</span>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [resultContainer] });
    };

    const buildTimeline = (status, currentLocation, updatedAt, data) => {
        const steps = [
            { key: 'pending', label: 'Order Placed', desc: 'Your order has been received' },
            { key: 'picked_up', label: 'Picked Up', desc: 'Driver has picked up your package' },
            { key: 'in_transit', label: 'In Transit', desc: 'Package is on its way' },
            { key: 'delivered', label: 'Delivered', desc: 'Package has been delivered' },
        ];

        const statusOrder = ['pending', 'picked_up', 'in_transit', 'delivered'];
        const currentIndex = statusOrder.indexOf(status);

        if (status === 'cancelled') {
            return `
                <div class="timeline-item" style="display:flex;gap:14px;margin-bottom:16px;">
                    <div style="width:12px;height:12px;border-radius:50%;background:#ef4444;border:2px solid rgba(239,68,68,0.3);margin-top:4px;flex-shrink:0;"></div>
                    <div>
                        <h5 style="color:#ef4444;">Order Cancelled</h5>
                        <p style="color:#94a3b8;font-size:0.85rem;margin-top:2px;">This order was cancelled</p>
                    </div>
                </div>
            `;
        }

        let html = '';
        steps.forEach((step, i) => {
            const isCompleted = i < currentIndex;
            const isActive = i === currentIndex;
            const dotClass = isCompleted ? 'completed' : isActive ? 'active' : '';
            const dotColor = isCompleted ? '#10b981' : isActive ? '#f59e0b' : '#334155';
            const dotBorder = isCompleted ? 'rgba(16,185,129,0.3)' : isActive ? 'rgba(245,158,11,0.3)' : 'rgba(51,65,85,0.3)';
            const lineShow = i < steps.length - 1 ? 'block' : 'none';
            const desc = isActive && currentLocation ? `Location: ${currentLocation}` : step.desc;
            const time = i <= currentIndex && updatedAt ? UI.formatDateTime(updatedAt) : '';

            html += `
                <div class="timeline-item" style="display:flex;gap:14px;margin-bottom:${i < steps.length - 1 ? '20px' : '0'};position:relative;">
                    <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
                        <div style="width:12px;height:12px;border-radius:50%;background:${dotColor};border:2px solid ${dotBorder};margin-top:4px;flex-shrink:0;"></div>
                        ${i < steps.length - 1 ? `<div style="width:2px;flex:1;background:${isCompleted ? '#10b981' : '#334155'};margin:4px 0;min-height:20px;"></div>` : ''}
                    </div>
                    <div style="flex:1;padding-bottom:${i < steps.length - 1 ? '4px' : '0'};">
                        <h5 style="font-size:0.9rem;color:${isActive ? '#f59e0b' : isCompleted ? '#f1f5f9' : '#64748b'};">${step.label}</h5>
                        <p style="color:#94a3b8;font-size:0.85rem;margin-top:2px;">${desc}${time ? ' — ' + time : ''}</p>
                    </div>
                </div>
            `;
        });

        return html;
    };

    const loadTrackingById = (orderId) => {
        const input = document.getElementById('tracking-order-id');
        if (input) input.value = orderId;
        loadTracking(orderId);
    };

    return {
        init,
        loadTracking,
        loadTrackingById,
    };
})();