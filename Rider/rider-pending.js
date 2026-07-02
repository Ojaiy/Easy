// rider-pending.js (or inline in rider-pending.html)

const checkRiderStatus = async () => {
    const token = localStorage.getItem('easyship_token'); // confirm this matches your actual storage key

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
                window.location.href = '/User/index.html';
            }
            return;
        }

        if (data.success && data.status === 'approved') {
            window.location.href = data.redirectPage;
        }

        if (data.success && data.status === 'rejected') {
            window.location.href = data.redirectPage;
        }

        // status === 'pending' or 'suspended' → stay on this page, do nothing

    } catch (error) {
        console.error('Status check failed:', error);
    }
};

// Check immediately on page load
checkRiderStatus();

// Poll every 30 seconds in case admin approves while rider has the tab open
const statusPollInterval = setInterval(checkRiderStatus, 30000);

// Clean up interval if the page is being navigated away from
window.addEventListener('beforeunload', () => {
    clearInterval(statusPollInterval);
});