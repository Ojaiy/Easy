// ========================================
// EASYSHIP NG - Rider Pending Status Check
// Enhanced with better UX and error handling
// ========================================

// DOM Elements (for dynamic UI updates)
const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const statusSubmessage = document.getElementById('status-submessage');
const statusBox = document.getElementById('status-box');
const statusText = document.getElementById('status-text');
const statusTiming = document.getElementById('status-timing');
const actionBtn = document.getElementById('action-btn');

// ========================================
// Core Functions
// ========================================

// Logout function
function logout() {
    localStorage.removeItem('easyship_token');
    localStorage.removeItem('easyship_user');
    window.location.href = '/User/index.html';
}

// Update UI based on status
function updateUI(status, redirectPage) {
    switch(status) {
        case 'pending':
            statusIcon.textContent = '⏳';
            statusIcon.className = 'icon';
            statusTitle.textContent = 'Application Submitted';
            statusTitle.style.color = '#0f172a';
            statusMessage.textContent = 'Your rider application has been received successfully.';
            statusSubmessage.textContent = 'Our team is reviewing your documents and information.';
            statusBox.className = 'status-box';
            statusText.textContent = 'Pending Approval';
            statusTiming.textContent = 'Review usually takes 24 - 48 hours.';
            actionBtn.textContent = 'Logout';
            actionBtn.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
            actionBtn.onclick = logout;
            break;
            
        case 'approved':
            // Will redirect, but show brief success message
            statusIcon.textContent = '✅';
            statusIcon.className = 'icon';
            statusTitle.textContent = 'Application Approved!';
            statusTitle.style.color = '#16a34a';
            statusMessage.textContent = 'Congratulations! Your application has been approved.';
            statusSubmessage.textContent = 'You will be redirected to your dashboard...';
            statusBox.className = 'status-box';
            statusBox.style.background = '#dcfce7';
            statusBox.style.color = '#166534';
            statusText.textContent = 'Approved';
            statusTiming.textContent = 'Redirecting...';
            actionBtn.textContent = 'Go to Dashboard';
            actionBtn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
            actionBtn.onclick = () => {
                window.location.href = redirectPage;
            };
            break;
            
        case 'rejected':
            statusIcon.textContent = '❌';
            statusIcon.className = 'icon rejected';
            statusTitle.textContent = 'Application Rejected';
            statusTitle.style.color = '#dc2626';
            statusMessage.textContent = 'We regret to inform you that your application was not approved.';
            statusSubmessage.textContent = 'Please check your email for more details.';
            statusBox.className = 'status-box rejected-box';
            statusText.textContent = 'Rejected';
            statusTiming.textContent = 'You will be redirected shortly...';
            actionBtn.textContent = 'Return to Home';
            actionBtn.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
            actionBtn.onclick = logout;
            break;
            
        case 'suspended':
            statusIcon.textContent = '⚠️';
            statusIcon.className = 'icon rejected';
            statusTitle.textContent = 'Account Suspended';
            statusTitle.style.color = '#dc2626';
            statusMessage.textContent = 'Your rider account has been suspended.';
            statusSubmessage.textContent = 'Please contact support for more information.';
            statusBox.className = 'status-box rejected-box';
            statusText.textContent = 'Suspended';
            statusTiming.textContent = 'You will be redirected shortly...';
            actionBtn.textContent = 'Contact Support';
            actionBtn.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
            actionBtn.onclick = () => {
                window.location.href = '/support.html';
            };
            break;
            
        default:
            // Fallback to pending
            updateUI('pending');
    }
}

// Check rider status
const checkRiderStatus = async () => {
    const token = localStorage.getItem('easyship_token');

    if (!token) {
        window.location.href = '/User/index.html';
        return;
    }

    try {
        const response = await fetch('/api/v1/rider/status', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            // Token invalid/expired — send back to signin
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('easyship_token');
                localStorage.removeItem('easyship_user');
                window.location.href = '/User/index.html';
            }
            return;
        }

        // Update UI based on status
        if (data.success) {
            updateUI(data.status, data.redirectPage);
            
            // If approved, redirect after showing success
            if (data.status === 'approved') {
                setTimeout(() => {
                    window.location.href = data.redirectPage;
                }, 2000);
                return;
            }
            
            // If rejected or suspended, redirect after showing message
            if (data.status === 'rejected' || data.status === 'suspended') {
                setTimeout(() => {
                    window.location.href = data.redirectPage;
                }, 3000);
                return;
            }
        }

    } catch (error) {
        console.error('Status check failed:', error);
        // Show error state
        statusMessage.textContent = 'Unable to check status. Please check your connection.';
        statusMessage.style.color = '#ef4444';
    }
};

// ========================================
// Initialize on page load
// ========================================

// Check immediately on page load
checkRiderStatus();

// Poll every 30 seconds in case admin approves while rider has the tab open
const statusPollInterval = setInterval(checkRiderStatus, 30000);

// Clean up interval if the page is being navigated away from
window.addEventListener('beforeunload', () => {
    clearInterval(statusPollInterval);
});

// ========================================
// Enhanced Features
// ========================================

// 1. Retry on network reconnect
window.addEventListener('online', () => {
    checkRiderStatus();
});

// 2. Check when tab becomes visible again
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        checkRiderStatus();
    }
});

// 3. Prevent double submission on logout
let isLoggingOut = false;
const originalLogout = logout;
logout = function() {
    if (isLoggingOut) return;
    isLoggingOut = true;
    if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.textContent = 'Processing...';
    }
    originalLogout();
};

// 4. Show loading state when checking status
let isLoading = false;
const originalCheck = checkRiderStatus;
checkRiderStatus = async function() {
    if (isLoading) return;
    isLoading = true;
    try {
        await originalCheck();
    } finally {
        isLoading = false;
    }
};

console.log('✅ Rider Pending Status Checker initialized');