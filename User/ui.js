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

        const iconMap = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${iconMap[type]}" class="toast-icon"></i>
            <span class="toast-message">${message}</span>
            <i data-lucide="x" class="toast-close"></i>
        `;

        container.appendChild(toast);
        lucide.createIcons({ nodes: [toast] });

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => removeToast(toast));

        // Auto remove
        setTimeout(() => removeToast(toast), duration);

        return toast;
    };

    const removeToast = (toast) => {
        if (toast.classList.contains('removing')) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    };

    /**
     * Format status for display
     */
    const formatStatus = (status) => {
        if (!status) return 'pending';
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    /**
     * Get status badge HTML
     */
    const statusBadge = (status) => {
        const formatted = formatStatus(status);
        return `<span class="status-badge ${status || 'pending'}"><span class="status-dot"></span>${formatted}</span>`;
    };

    /**
     * Format currency (Nigerian Naira)
     */
    const formatCurrency = (amount) => {
        if (amount == null) return '₦0';
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
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    /**
     * Format date & time
     */
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * Truncate text
     */
    const truncate = (str, len = 20) => {
        if (!str) return '—';
        return str.length > len ? str.slice(0, len) + '…' : str;
    };

    /**
     * Shorten order ID
     */
    const shortId = (id) => {
        if (!id) return '—';
        return id.length > 12 ? id.slice(0, 8) + '…' : id;
    };

    /**
     * Get initials from name
     */
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    /**
     * Set button loading state
     */
    const setButtonLoading = (btn, loading) => {
        const textEl = btn.querySelector('.btn-text');
        const loaderEl = btn.querySelector('.btn-loader');

        if (loading) {
            btn.disabled = true;
            if (textEl) textEl.style.display = 'none';
            if (loaderEl) loaderEl.style.display = 'inline-block';
        } else {
            btn.disabled = false;
            if (textEl) textEl.style.display = 'inline';
            if (loaderEl) loaderEl.style.display = 'none';
        }
    };

    /**
     * Clear form errors
     */
    const clearErrors = (formId) => {
        const form = document.getElementById(formId);
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
        if (errorEl) errorEl.textContent = message;
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
        return /^[\+]?[\d\s\-]{7,15}$/.test(phone);
    };

    /**
     * Empty state HTML
     */
    const emptyStateHTML = (icon, title, description) => {
        return `
            <div class="empty-state">
                <i data-lucide="${icon}"></i>
                <h4>${title}</h4>
                <p>${description}</p>
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
                <div class="order-card">
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

    return {
        showToast,
        formatStatus,
        statusBadge,
        formatCurrency,
        formatDate,
        formatDateTime,
        truncate,
        shortId,
        getInitials,
        setButtonLoading,
        clearErrors,
        setFieldError,
        isValidEmail,
        isValidPhone,
        emptyStateHTML,
        loadingHTML,
        skeletonCardHTML,
    };
})();