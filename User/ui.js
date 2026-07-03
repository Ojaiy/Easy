/**
 * UI Utilities for EASYSHIP NG
 * Toast notifications, helpers, status formatting
 */

const UI = (() => {

    /**
     * Show a toast notification
     */
    const showToast = (message, type = 'info', duration = 4000) => {
        const container = document.getElementById('toast-container');
        if (!container) {
            // Fallback alert if container doesn't exist
            console.log(`[${type}] ${message}`);
            return;
        }

        const iconMap = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${iconMap[type] || 'info'}" class="toast-icon"></i>
            <span class="toast-message">${message}</span>
            <i data-lucide="x" class="toast-close"></i>
        `;

        container.appendChild(toast);

        // Create icons if lucide is available
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ nodes: [toast] });
        }

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => removeToast(toast));
        }

        // Auto remove
        const timeoutId = setTimeout(() => removeToast(toast), duration);

        // Pause auto-remove on hover
        toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
        toast.addEventListener('mouseleave', () => {
            setTimeout(() => removeToast(toast), 1000);
        });

        return toast;
    };

    const removeToast = (toast) => {
        if (!toast || toast.classList.contains('removing')) return;
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    };

    /**
     * Format status for display
     */
    const formatStatus = (status) => {
        if (!status) return 'Pending';
        const map = {
            pending: 'Pending',
            picked_up: 'Picked Up',
            in_transit: 'In Transit',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
            approved: 'Approved',
            rejected: 'Rejected'
        };
        return map[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    /**
     * Get status badge HTML
     */
    const statusBadge = (status) => {
        const formatted = formatStatus(status);
        const statusClass = status || 'pending';
        return `<span class="status-badge ${statusClass}">${formatted}</span>`;
    };

    /**
     * Get status color
     */
    const getStatusColor = (status) => {
        const colors = {
            pending: '#f59e0b',
            picked_up: '#3b82f6',
            in_transit: '#8b5cf6',
            delivered: '#10b981',
            cancelled: '#ef4444',
            approved: '#10b981',
            rejected: '#ef4444'
        };
        return colors[status] || '#94a3b8';
    };

    /**
     * Format currency (Nigerian Naira)
     */
    const formatCurrency = (amount) => {
        if (amount == null || isNaN(amount)) return '₦0';
        return '₦' + Number(amount).toLocaleString('en-NG', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    /**
     * Format date
     */
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleDateString('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return '—';
        }
    };

    /**
     * Format date & time
     */
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleDateString('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '—';
        }
    };

    /**
     * Time ago
     */
    const timeAgo = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            
            const now = new Date();
            const diff = Math.floor((now - date) / 1000);
            
            if (diff < 60) return 'just now';
            if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
            if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
            if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
            return formatDate(dateStr);
        } catch {
            return '—';
        }
    };

    /**
     * Truncate text
     */
    const truncate = (str, len = 20) => {
        if (!str) return '—';
        if (str.length <= len) return str;
        return str.slice(0, len) + '…';
    };

    /**
     * Shorten order ID
     */
    const shortId = (id) => {
        if (!id) return '—';
        if (id.length <= 12) return id;
        return id.slice(0, 8) + '…' + id.slice(-4);
    };

    /**
     * Get initials from name
     */
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        if (parts.length === 1 && parts[0].length > 0) {
            return parts[0][0].toUpperCase();
        }
        return 'U';
    };

    /**
     * Set button loading state
     */
    const setButtonLoading = (btn, loading, text = 'Please wait...') => {
        if (!btn) return;
        
        const textEl = btn.querySelector('.btn-text');
        const loaderEl = btn.querySelector('.btn-loader');

        if (loading) {
            btn.disabled = true;
            if (textEl) {
                btn.dataset.originalText = textEl.textContent;
                textEl.textContent = text;
            }
            if (loaderEl) loaderEl.style.display = 'inline-block';
        } else {
            btn.disabled = false;
            if (textEl) {
                textEl.textContent = btn.dataset.originalText || textEl.textContent;
            }
            if (loaderEl) loaderEl.style.display = 'none';
        }
    };

    /**
     * Clear form errors
     */
    const clearErrors = (formId) => {
        const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
        if (!form) return;
        form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    };

    /**
     * Set field error
     */
    const setFieldError = (fieldId, message) => {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (field) field.classList.add('error');
        if (errorEl) errorEl.textContent = message || '';
    };

    /**
     * Validate email
     */
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    /**
     * Validate phone (basic)
     */
    const isValidPhone = (phone) => {
        if (!phone) return false;
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        return cleaned.length >= 10 && cleaned.length <= 14 && /^[0-9]+$/.test(cleaned);
    };

    /**
     * Validate password strength
     */
    const isStrongPassword = (password) => {
        if (!password) return false;
        return password.length >= 6;
    };

    /**
     * Empty state HTML
     */
    const emptyStateHTML = (icon, title, description) => {
        return `
            <div class="empty-state">
                <i data-lucide="${icon || 'inbox'}"></i>
                <h4>${title || 'Nothing here'}</h4>
                <p>${description || 'No items to display'}</p>
            </div>
        `;
    };

    /**
     * Loading spinner HTML
     */
    const loadingHTML = (message = 'Loading...') => {
        return `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    };

    /**
     * Skeleton card HTML
     */
    const skeletonCardHTML = (count = 3) => {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="skeleton skeleton-circle"></div>
                    <div style="flex:1;">
                        <div class="skeleton skeleton-text medium"></div>
                        <div class="skeleton skeleton-text short"></div>
                    </div>
                    <div class="skeleton skeleton-text" style="width:60px;"></div>
                </div>
            `;
        }
        return html;
    };

    /**
     * Escape HTML
     */
    const escapeHTML = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    /**
     * Copy to clipboard
     */
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast('Copied to clipboard!', 'success', 2000);
            return true;
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('Copied to clipboard!', 'success', 2000);
                return true;
            } catch {
                showToast('Failed to copy', 'error');
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    };

    /**
     * Debounce function
     */
    const debounce = (fn, delay = 300) => {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    };

    return {
        showToast,
        removeToast,
        formatStatus,
        statusBadge,
        getStatusColor,
        formatCurrency,
        formatDate,
        formatDateTime,
        timeAgo,
        truncate,
        shortId,
        getInitials,
        setButtonLoading,
        clearErrors,
        setFieldError,
        isValidEmail,
        isValidPhone,
        isStrongPassword,
        emptyStateHTML,
        loadingHTML,
        skeletonCardHTML,
        escapeHTML,
        copyToClipboard,
        debounce
    };
})();

// Make UI globally available
window.UI = UI;

console.log('✅ UI module loaded');