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

    rider = JSON.parse(stored);

    if (rider.role !== 'rider') {
        riderLogout();
        return;
    }
}

/* ================= SOCKET.IO ================= */

function connectSocket() {
    socket = io();

    // Join rider's personal room
    socket.emit('join_rider_room', rider.id);

    // Listen for new orders from customers
    socket.on('new_order', (order) => {
        showToast('New order available!', 'info');
        loadAvailableOrders();
        loadRiderStats();
    });
}

/* ================= LOAD DASHBOARD ================= */

async function loadRiderDashboard() {
    try {
        // Set rider name from localStorage immediately
        document.getElementById('rider-name').innerText = rider.name;
        document.getElementById('rider-status').innerText = 'Active';
        document.getElementById('profile-name').innerText = rider.name;
        document.getElementById('profile-email').innerText = rider.email;
        document.getElementById('profile-status').innerText = 'Approved';

        // Load real stats and orders from server
        await loadRiderStats();
        await loadAvailableOrders();

        // Connect socket for live updates
        connectSocket();

    } catch (error) {
        console.error('Dashboard error:', error);
        riderLogout();
    }
}

/* ================= RIDER STATS ================= */

async function loadRiderStats() {
    try {
        const res = await fetch('/api/v1/rider/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        document.getElementById('total-deliveries').innerText = data.stats.totalDeliveries;
        document.getElementById('active-orders').innerText = data.stats.activeOrders;
        document.getElementById('completed-orders').innerText = data.stats.completedOrders;

        // Show active delivery if one exists
        if (data.activeDelivery) {
            currentOrderId = data.activeDelivery._id;
            showActiveDelivery(data.activeDelivery);
        } else {
            clearActiveDelivery();
        }

    } catch (error) {
        console.error('Stats load error:', error);
    }
}

/* ================= AVAILABLE ORDERS ================= */

async function loadAvailableOrders() {
    try {
        const res = await fetch('/api/v1/rider/orders/available', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        renderAvailableOrders(data.orders);

    } catch (error) {
        console.error('Available orders error:', error);
    }
}

function renderAvailableOrders(orders) {
    const container = document.getElementById('available-orders-container');

    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p class="no-orders">No available orders right now.</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card" id="order-${order._id}">
            <div class="order-info">
                <p><strong>Pickup:</strong> ${order.pickup.address}</p>
                <p><strong>Dropoff:</strong> ${order.dropoff.address}</p>
                <p><strong>Recipient:</strong> ${order.dropoff.recipientName}</p>
                <p><strong>Package:</strong> ${order.package.type} (${order.package.weight}kg)</p>
                <p><strong>Price:</strong> ₦${order.price}</p>
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
        const res = await fetch(`/api/v1/rider/orders/${orderId}/accept`, {
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
        const res = await fetch(`/api/v1/rider/orders/${currentOrderId}/pickup`, {
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
        const res = await fetch(`/api/v1/rider/orders/${currentOrderId}/deliver`, {
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
    const statusEl = document.getElementById('delivery-status');

    if (pickupEl) pickupEl.innerText = order.pickup.address;
    if (dropoffEl) dropoffEl.innerText = order.dropoff.address;
    if (statusEl) statusEl.innerText = formatStatus(order.status);

    // Show correct action buttons based on status
    const acceptBtn = document.querySelector('.btn.accept');
    const pickupBtn = document.querySelector('.btn.pickup');
    const deliverBtn = document.querySelector('.btn.deliver');

    if (acceptBtn) acceptBtn.style.display = 'none';

    if (order.status === 'dispatch_assigned') {
        if (pickupBtn) pickupBtn.style.display = 'inline-block';
        if (deliverBtn) deliverBtn.style.display = 'none';
    } else if (order.status === 'pickup_in_progress') {
        if (pickupBtn) pickupBtn.style.display = 'none';
        if (deliverBtn) deliverBtn.style.display = 'inline-block';
    }
}

function clearActiveDelivery() {
    const pickupEl = document.getElementById('pickup-location');
    const dropoffEl = document.getElementById('dropoff-location');
    const statusEl = document.getElementById('delivery-status');

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
        dispatch_assigned: 'Rider assigned — heading to pickup',
        pickup_in_progress: 'Package picked up — in transit',
        in_transit: 'In transit',
        delivered: 'Delivered'
    };
    return map[status] || status;
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
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/* ================= LOGOUT ================= */

function riderLogout() {
    if (socket) socket.disconnect();
    localStorage.removeItem('easyship_token');
    localStorage.removeItem('easyship_user');
    window.location.href = '../User/index.html';
}