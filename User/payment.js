/**
 * Payment Module for EASYSHIP NG
 */

const Payment = (() => {

    let currentOrderId = null;
    let currentReference = null;
    let pollInterval = null;

    const init = () => {
        // Check if we're returning from a Paystack callback
        if (window.location.hash === '#payment-callback') {
            const reference = sessionStorage.getItem('payment_reference');
            const orderId = sessionStorage.getItem('payment_order_id');

            if (reference && orderId) {
                handlePaymentCallback(reference, orderId);
            }
        }
    };

    // ─── Load Payment Page ────────────────────────────────────────────────────
    const loadPaymentPage = async (orderId) => {
        currentOrderId = orderId;
        const container = document.getElementById('payment-content');
        if (!container) return;

        container.innerHTML = UI.loadingHTML('Loading order details...');

        try {
            const response = await API.getOrder(orderId);
            const order = response.order || response.data || response;
            renderPaymentPage(order);
        } catch (error) {
            container.innerHTML = UI.emptyStateHTML(
                'alert-circle',
                'Could not load order',
                error.message || 'Please try again.'
            );
        }
    };

    // ─── Render Payment Summary ───────────────────────────────────────────────
    const renderPaymentPage = (order) => {
        const container = document.getElementById('payment-content');
        if (!container) return;

        const orderId = order._id || order.id;
        const pickup = order.pickup?.address || 'N/A';
        const dropoff = order.dropoff?.address || 'N/A';
        const distance = order.distance ? `${order.distance} km` : '—';
        const price = order.price || 0;
        const paymentStatus = order.paymentStatus || 'pending';
        const orderStatus = order.orderStatus || 'pending_payment';

        // If already paid, show confirmation instead of payment button
        if (paymentStatus === 'paid') {
            renderPaymentSuccess(order);
            return;
        }

        container.innerHTML = `
            <div style="max-width:520px;margin:0 auto;">
                <button onclick="App.navigate('orders')"
                    style="display:inline-flex;align-items:center;gap:8px;
                           margin-bottom:20px;padding:8px 16px;
                           background:rgba(255,255,255,0.04);border:none;
                           border-radius:8px;color:#94a3b8;cursor:pointer;
                           font-size:0.9rem;">
                    <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                    Back to Orders
                </button>

                <!-- Order Summary Card -->
                <div style="background:rgba(255,255,255,0.03);
                            border:1px solid rgba(255,255,255,0.08);
                            border-radius:16px;padding:24px;margin-bottom:20px;">

                    <div style="display:flex;justify-content:space-between;
                                align-items:center;margin-bottom:20px;">
                        <h3 style="font-size:1rem;font-weight:600;">
                            Order Summary
                        </h3>
                        <span style="font-size:0.75rem;padding:4px 10px;
                                     background:rgba(245,158,11,0.15);
                                     color:#f59e0b;border-radius:20px;font-weight:500;">
                            Awaiting Payment
                        </span>
                    </div>

                    <div style="font-size:0.72rem;text-transform:uppercase;
                                color:#64748b;font-weight:600;margin-bottom:4px;">
                        Order ID
                    </div>
                    <div style="font-weight:600;margin-bottom:16px;
                                font-family:monospace;font-size:0.9rem;">
                        #${UI.shortId(orderId)}
                    </div>

                    <!-- Route -->
                    <div style="background:rgba(255,255,255,0.02);
                                border-radius:12px;padding:16px;margin-bottom:16px;
                                border:1px solid rgba(255,255,255,0.04);">

                        <div style="display:flex;gap:12px;align-items:flex-start;">
                            <div style="display:flex;flex-direction:column;
                                        align-items:center;padding-top:4px;">
                                <div style="width:10px;height:10px;border-radius:50%;
                                            background:#22c55e;"></div>
                                <div style="width:2px;height:30px;
                                            background:rgba(255,255,255,0.1);
                                            margin:4px 0;"></div>
                                <div style="width:10px;height:10px;border-radius:50%;
                                            background:#ef4444;"></div>
                            </div>
                            <div style="flex:1;">
                                <div style="margin-bottom:16px;">
                                    <div style="font-size:0.7rem;color:#64748b;
                                                margin-bottom:2px;">PICKUP</div>
                                    <div style="font-size:0.9rem;">${pickup}</div>
                                </div>
                                <div>
                                    <div style="font-size:0.7rem;color:#64748b;
                                                margin-bottom:2px;">DROPOFF</div>
                                    <div style="font-size:0.9rem;">${dropoff}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Row -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;
                                gap:12px;margin-bottom:16px;">
                        <div style="background:rgba(255,255,255,0.02);
                                    border-radius:10px;padding:12px;
                                    border:1px solid rgba(255,255,255,0.04);">
                            <div style="font-size:0.7rem;color:#64748b;
                                        margin-bottom:4px;">DISTANCE</div>
                            <div style="font-weight:600;">${distance}</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.02);
                                    border-radius:10px;padding:12px;
                                    border:1px solid rgba(255,255,255,0.04);">
                            <div style="font-size:0.7rem;color:#64748b;
                                        margin-bottom:4px;">PACKAGE</div>
                            <div style="font-weight:600;">
                                ${order.package?.type || 'Package'}
                            </div>
                        </div>
                    </div>

                    <!-- Price -->
                    <div style="background:rgba(245,158,11,0.08);
                                border:1px solid rgba(245,158,11,0.2);
                                border-radius:12px;padding:16px;
                                display:flex;justify-content:space-between;
                                align-items:center;">
                        <span style="font-size:0.9rem;color:#94a3b8;">
                            Delivery Fee
                        </span>
                        <span style="font-size:1.5rem;font-weight:700;color:#f59e0b;">
                            ${UI.formatCurrency(price)}
                        </span>
                    </div>
                </div>

                <!-- Pay Button -->
                <button
                    id="pay-now-btn"
                    onclick="Payment.startPayment('${orderId}')"
                    style="width:100%;padding:16px;background:linear-gradient(135deg,#22c55e,#16a34a);
                           border:none;border-radius:12px;color:white;font-size:1rem;
                           font-weight:600;cursor:pointer;display:flex;
                           align-items:center;justify-content:center;gap:10px;
                           transition:all 0.3s ease;min-height:52px;">
                    <i data-lucide="credit-card" style="width:20px;height:20px;"></i>
                    <span id="pay-btn-text">Pay ${UI.formatCurrency(price)}</span>
                </button>

                <p style="text-align:center;margin-top:12px;font-size:0.8rem;
                           color:#64748b;">
                    <i data-lucide="shield" style="width:12px;height:12px;
                                                    display:inline;"></i>
                    Secured by Paystack • Your payment is encrypted
                </p>

                <!-- Retry option if previously failed -->
                <div id="payment-error-box" style="display:none;margin-top:16px;
                     background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
                     border-radius:12px;padding:16px;text-align:center;">
                    <p style="color:#ef4444;font-size:0.9rem;margin-bottom:12px;">
                        Previous payment attempt failed.
                    </p>
                    <button onclick="Payment.startPayment('${orderId}')"
                        style="padding:10px 20px;background:#ef4444;border:none;
                               border-radius:8px;color:white;cursor:pointer;
                               font-weight:500;">
                        Try Again
                    </button>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });

        // Check if there was a previously failed payment
        checkForFailedPayment(orderId);
    };

    // ─── Start Payment ────────────────────────────────────────────────────────
    const startPayment = async (orderId) => {
        const btn = document.getElementById('pay-now-btn');
        const btnText = document.getElementById('pay-btn-text');

        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
        }
        if (btnText) btnText.textContent = 'Initializing payment...';

        try {
            const response = await API.initializePayment(orderId);

            if (!response.success || !response.authorizationUrl) {
                throw new Error('Failed to initialize payment');
            }

            // Store reference and orderId so we can verify after redirect
            sessionStorage.setItem('payment_reference', response.reference);
            sessionStorage.setItem('payment_order_id', orderId);
            currentReference = response.reference;

            // Redirect to Paystack
            window.location.href = response.authorizationUrl;

        } catch (error) {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
            if (btnText) btnText.textContent = 'Pay Now';
            UI.showToast(error.message || 'Payment initialization failed', 'error');
        }
    };

    // ─── Handle Paystack Callback ─────────────────────────────────────────────
    const handlePaymentCallback = async (reference, orderId) => {
        // Clear stored values
        sessionStorage.removeItem('payment_reference');
        sessionStorage.removeItem('payment_order_id');

        // Navigate to payment page and show verifying state
        App.navigate(`payment/${orderId}`);

        const container = document.getElementById('payment-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <div class="spinner" style="margin:0 auto 20px;"></div>
                    <h3 style="margin-bottom:8px;">Verifying Payment</h3>
                    <p style="color:#94a3b8;">Please wait while we confirm your payment...</p>
                </div>
            `;
        }

        try {
            const response = await API.verifyPayment(reference);

            if (response.success && response.paymentStatus === 'successful') {
                renderPaymentSuccess({ _id: orderId, paidAt: response.paidAt });
                UI.showToast('Payment successful! Looking for a rider.', 'success');

                // Refresh dashboard stats
                if (typeof Dashboard !== 'undefined') Dashboard.load();

            } else {
                renderPaymentFailed(orderId, response.message || 'Payment was not successful');
            }

        } catch (error) {
            renderPaymentFailed(orderId, error.message || 'Verification failed');
        }
    };

    // ─── Success State ────────────────────────────────────────────────────────
    const renderPaymentSuccess = (order) => {
        const container = document.getElementById('payment-content');
        if (!container) return;

        const orderId = order._id || order.id;

        container.innerHTML = `
            <div style="max-width:480px;margin:0 auto;text-align:center;padding:40px 20px;">
                <div style="width:80px;height:80px;background:rgba(34,197,94,0.15);
                            border-radius:50%;display:flex;align-items:center;
                            justify-content:center;margin:0 auto 24px;
                            border:2px solid rgba(34,197,94,0.3);">
                    <i data-lucide="check-circle"
                       style="width:40px;height:40px;color:#22c55e;"></i>
                </div>

                <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:8px;">
                    Payment Successful!
                </h2>
                <p style="color:#94a3b8;margin-bottom:32px;">
                    Your order has been confirmed. We are now looking for an available rider.
                </p>

                <div style="background:rgba(34,197,94,0.08);
                            border:1px solid rgba(34,197,94,0.2);
                            border-radius:12px;padding:20px;margin-bottom:32px;">
                    <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">
                        ORDER ID
                    </div>
                    <div style="font-weight:600;font-family:monospace;">
                        #${UI.shortId(orderId)}
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;">
                    <button onclick="App.navigate('order-detail/${orderId}')"
                        style="padding:14px;background:rgba(255,255,255,0.06);
                               border:1px solid rgba(255,255,255,0.1);
                               border-radius:10px;color:white;cursor:pointer;
                               font-size:0.95rem;">
                        Track This Order
                    </button>
                    <button onclick="App.navigate('orders')"
                        style="padding:14px;background:transparent;border:none;
                               color:#94a3b8;cursor:pointer;font-size:0.9rem;">
                        View All Orders
                    </button>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    };

    // ─── Failed State ─────────────────────────────────────────────────────────
    const renderPaymentFailed = (orderId, reason) => {
        const container = document.getElementById('payment-content');
        if (!container) return;

        container.innerHTML = `
            <div style="max-width:480px;margin:0 auto;text-align:center;padding:40px 20px;">
                <div style="width:80px;height:80px;background:rgba(239,68,68,0.15);
                            border-radius:50%;display:flex;align-items:center;
                            justify-content:center;margin:0 auto 24px;
                            border:2px solid rgba(239,68,68,0.3);">
                    <i data-lucide="x-circle"
                       style="width:40px;height:40px;color:#ef4444;"></i>
                </div>

                <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:8px;">
                    Payment Failed
                </h2>
                <p style="color:#94a3b8;margin-bottom:8px;">${reason}</p>
                <p style="color:#64748b;font-size:0.85rem;margin-bottom:32px;">
                    No money was deducted. You can try again safely.
                </p>

                <div style="display:flex;flex-direction:column;gap:12px;">
                    <button onclick="Payment.startPayment('${orderId}')"
                        style="padding:14px;background:linear-gradient(135deg,#22c55e,#16a34a);
                               border:none;border-radius:10px;color:white;
                               cursor:pointer;font-size:0.95rem;font-weight:600;">
                        Try Again
                    </button>
                    <button onclick="App.navigate('orders')"
                        style="padding:14px;background:transparent;border:none;
                               color:#94a3b8;cursor:pointer;font-size:0.9rem;">
                        Back to Orders
                    </button>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    };

    // ─── Check for previously failed payment ─────────────────────────────────
    const checkForFailedPayment = async (orderId) => {
        try {
            const response = await API.getPaymentStatus(orderId);
            if (response.paymentStatus === 'failed') {
                const box = document.getElementById('payment-error-box');
                if (box) box.style.display = 'block';
            }
        } catch (e) {
            // No payment yet — that's fine
        }
    };

    return {
        init,
        loadPaymentPage,
        startPayment,
        handlePaymentCallback,
    };

})();