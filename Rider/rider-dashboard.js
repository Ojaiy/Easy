/**
 * RIDER DASHBOARD - EASYSHIP NG
 */
const API_BASE_URL = 'https://easyshipp.onrender.com/api/v1';

let token = null;
let rider = null;
let socket = null;
let currentOrderId = null;

/* ================= AUTH GUARD ================= */

function protectRiderPage() {
    token = localStorage.getItem('easyship_token');
    if (!token) {
        window.location.href = '../User/index.html';
        return;
    }

    const stored = localStorage.getItem('easyship_user');
    if (!stored) {
        riderLogout();
        return;
    }

    try {
        rider = JSON.parse(stored);
    } catch (e) {
        riderLogout();
        return;
    }

    // ✅ Only check role — status is handled by backend
    if (!rider || rider.role !== 'rider') {
        riderLogout();
        return;
    }

    console.log('✅ Rider verified:', rider.email);
}

/* ================= SOCKET.IO ================= */

function connectSocket() {
    try {
        socket = io();

        // Join rider's personal room
        socket.emit('join_rider_room', rider.id);

        // Listen for new orders from customers
        socket.on('new_order', (order) => {
            showToast('New order available!', 'info');
            loadAvailableOrders();
            loadRiderStats();
        });
    } catch (error) {
        console.error('Socket connection error:', error);
    }
}

/* ================= LOAD DASHBOARD ================= */

async function loadRiderDashboard() {
    try {
        // Get rider from localStorage if not already set
        if (!rider) {
            const stored = localStorage.getItem('easyship_user');
            if (stored) {
                rider = JSON.parse(stored);
            } else {
                throw new Error('No rider data found');
            }
        }

        // Set rider name from localStorage immediately
        const displayName = rider.name || rider.firstName || 'Rider';
        document.getElementById('rider-name').innerText = displayName;
        document.getElementById('rider-status').innerText = 'Active';
        document.getElementById('profile-name').innerText = displayName;
        document.getElementById('profile-email').innerText = rider.email || '';
        document.getElementById('profile-status').innerText = 'Approved';
        
        // Set avatar
        document.getElementById('profile-avatar').innerText = displayName.charAt(0).toUpperCase();

        // Load real stats and orders from server
        await loadRiderStats();
        await loadAvailableOrders();

        // Connect socket for live updates
        connectSocket();

        console.log('✅ Rider dashboard loaded successfully');

    } catch (error) {
        console.error('Dashboard error:', error);
        // ✅ Show error on page instead of redirecting
        const container = document.querySelector('.dashboard-container');
        if (container) {
            container.innerHTML = `
                <div style="padding: 60px 20px; text-align: center; background: white; border-radius: 12px;">
                    <h2 style="color: #ef4444;">Error Loading Dashboard</h2>
                    <p style="color: #6b7280; margin: 16px 0;">${error.message}</p>
                    <button onclick="riderLogout()" style="padding: 10px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Go Back
                    </button>
                </div>
            `;
        }
    }
}

/* ================= RIDER STATS ================= */

async function loadRiderStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/rider/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        document.getElementById('total-deliveries').innerText = data.stats?.totalDeliveries || 0;
        document.getElementById('active-orders').innerText = data.stats?.activeOrders || 0;
        document.getElementById('completed-orders').innerText = data.stats?.completedOrders || 0;

        // Show active delivery if one exists
        if (data.activeDelivery) {
            currentOrderId = data.activeDelivery._id;
            showActiveDelivery(data.activeDelivery);
        } else {
            clearActiveDelivery();
        }

    } catch (error) {
        console.error('Stats load error:', error);
        // Don't redirect — just show zeros
    }
}

/* ================= AVAILABLE ORDERS ================= */

async function loadAvailableOrders() {
    try {
        const res = await fetch(`${API_BASE_URL}/rider/orders/available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        renderAvailableOrders(data.orders || []);

    } catch (error) {
        console.error('Available orders error:', error);
        const container = document.getElementById('available-orders-container');
        if (container) {
            container.innerHTML = '<p class="no-orders">Unable to load orders. Please refresh.</p>';
        }
    }
}

function renderAvailableOrders(orders) {
    const container = document.getElementById('available-orders-container');

    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="no-orders">No available orders right now.</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card" id="order-${order._id}">
            <div class="order-info">
                <p><strong>Pickup:</strong> ${order.pickup?.address || 'N/A'}</p>
                <p><strong>Dropoff:</strong> ${order.dropoff?.address || 'N/A'}</p>
                <p><strong>Recipient:</strong> ${order.dropoff?.recipientName || 'N/A'}</p>
                <p><strong>Package:</strong> ${order.package?.type || 'N/A'} (${order.package?.weight || 0}kg)</p>
                <p><strong>Price:</strong> ₦${order.price || 0}</p>
            </div>
            <button class="btn accept" onclick="acceptOrder('${order._id}')">
                Accept Order
            </button>
        </div>
    `).join('');
}

/* ================= ORDER ACTIONS ================= */

async function acceptOrder(orderId) {
    try {
        const res = await fetch(`${API_BASE_URL}/rider/orders/${orderId}/accept`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) {
            showToast(data.message, 'error');
            return;
        }

        currentOrderId = orderId;
        showToast('Order accepted!', 'success');
        await loadRiderStats();
        await loadAvailableOrders();

    } catch (error) {
        console.error('Accept order error:', error);
        showToast('Failed to accept order', 'error');
    }
}

async function markPickedUp() {
    if (!currentOrderId) return;

    try {
        const res = await fetch(`${API_BASE_URL}/rider/orders/${currentOrderId}/pickup`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) {
            showToast(data.message, 'error');
            return;
        }

        showToast('Marked as picked up!', 'success');
        await loadRiderStats();

    } catch (error) {
        console.error('Pickup error:', error);
        showToast('Failed to update order', 'error');
    }
}

async function markDelivered() {
    if (!currentOrderId) return;

    try {
        const res = await fetch(`${API_BASE_URL}/rider/orders/${currentOrderId}/deliver`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) {
            showToast(data.message, 'error');
            return;
        }

        showToast('Order delivered!', 'success');
        currentOrderId = null;
        await loadRiderStats();
        await loadAvailableOrders();

    } catch (error) {
        console.error('Deliver error:', error);
        showToast('Failed to update order', 'error');
    }
}

/* ================= ACTIVE DELIVERY UI ================= */

function showActiveDelivery(order) {
    const pickupEl = document.getElementById('pickup-location');
    const dropoffEl = document.getElementById('dropoff-location');
    const statusEl = document.getElementById('delivery-status-badge');

    if (pickupEl) pickupEl.innerText = order.pickup?.address || '-';
    if (dropoffEl) dropoffEl.innerText = order.dropoff?.address || '-';
    if (statusEl) statusEl.innerText = formatStatus(order.status);

    // Show correct action buttons based on status
    const acceptBtn = document.querySelector('.btn.accept');
    const pickupBtn = document.querySelector('.btn.pickup');
    const deliverBtn = document.querySelector('.btn.deliver');

    if (acceptBtn) acceptBtn.style.display = 'none';

    if (order.status === 'dispatch_assigned' || order.status === 'assigned') {
        if (pickupBtn) pickupBtn.style.display = 'inline-block';
        if (deliverBtn) deliverBtn.style.display = 'none';
    } else if (order.status === 'picked_up' || order.status === 'pickup_in_progress') {
        if (pickupBtn) pickupBtn.style.display = 'none';
        if (deliverBtn) deliverBtn.style.display = 'inline-block';
    } else {
        if (pickupBtn) pickupBtn.style.display = 'none';
        if (deliverBtn) deliverBtn.style.display = 'none';
    }
}

function clearActiveDelivery() {
    const pickupEl = document.getElementById('pickup-location');
    const dropoffEl = document.getElementById('dropoff-location');
    const statusEl = document.getElementById('delivery-status-badge');

    if (pickupEl) pickupEl.innerText = '-';
    if (dropoffEl) dropoffEl.innerText = '-';
    if (statusEl) statusEl.innerText = 'No active delivery';

    const acceptBtn = document.querySelector('.btn.accept');
    const pickupBtn = document.querySelector('.btn.pickup');
    const deliverBtn = document.querySelector('.btn.deliver');

    if (acceptBtn) acceptBtn.style.display = 'none';
    if (pickupBtn) pickupBtn.style.display = 'none';
    if (deliverBtn) deliverBtn.style.display = 'none';
}

function formatStatus(status) {
    const map = {
        'pending': 'Pending',
        'dispatch_assigned': 'Rider assigned — heading to pickup',
        'assigned': 'Rider assigned — heading to pickup',
        'pickup_in_progress': 'Package picked up — in transit',
        'picked_up': 'Package picked up — in transit',
        'in_transit': 'In transit',
        'delivered': 'Delivered'
    };
    return map[status] || status || 'Unknown';
}

/* ================= TOAST ================= */

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ================= LOGOUT ================= */

function riderLogout() {
    if (socket) socket.disconnect();
    localStorage.removeItem('easyship_token');
    localStorage.removeItem('easyship_user');
    window.location.href = '../User/index.html';
}

// Add style for toast animation if not present
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);