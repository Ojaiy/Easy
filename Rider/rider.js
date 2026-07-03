// ========================================
// EASYSHIP NG - Rider Registration
// Enhanced with validation, file preview, and better UX
// ========================================

const API_BASE_URL = 'https://easyshipp.onrender.com/api/v1';

// ========================================
// DOM Elements
// ========================================
const form = document.getElementById('rider-register-form');
const registerBtn = document.getElementById('register-btn');

// File input elements
const fileInputs = {
    profilePhoto: document.getElementById('profilePhoto'),
    driversLicense: document.getElementById('driversLicense'),
    governmentId: document.getElementById('governmentId'),
    vehicleRegistration: document.getElementById('vehicleRegistration'),
    vehiclePhoto: document.getElementById('vehiclePhoto')
};

// ========================================
// File Preview Function
// ========================================
function setupFilePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!input || !preview) return;
    
    input.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            preview.classList.add('show');
            
            // For images, show thumbnail
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = preview.querySelector('img');
                    if (img) {
                        img.src = e.target.result;
                        img.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
            
            // Show filename
            const span = preview.querySelector('span');
            if (span) {
                span.textContent = file.name;
            }
            
            // Remove button
            const removeBtn = preview.querySelector('.remove-file');
            if (removeBtn) {
                removeBtn.onclick = function() {
                    input.value = '';
                    preview.classList.remove('show');
                    const img = preview.querySelector('img');
                    if (img) img.src = '';
                };
            }
        } else {
            preview.classList.remove('show');
        }
    });
}

// Setup all file previews (only if preview elements exist)
setupFilePreview('profilePhoto', 'profilePhoto-preview');
setupFilePreview('driversLicense', 'driversLicense-preview');
setupFilePreview('governmentId', 'governmentId-preview');
setupFilePreview('vehicleRegistration', 'vehicleRegistration-preview');
setupFilePreview('vehiclePhoto', 'vehiclePhoto-preview');

// ========================================
// Toast Notification System
// ========================================
function showToast(message, type = 'info', duration = 4000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Icon mapping
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" aria-label="Close notification">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    
    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%) translateY(-20px)',
        padding: '16px 24px',
        borderRadius: '14px',
        fontSize: '14px',
        fontWeight: '600',
        zIndex: '9999',
        maxWidth: '90%',
        width: 'auto',
        minWidth: '280px',
        textAlign: 'left',
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        opacity: '0',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontFamily: "'Inter', -apple-system, sans-serif",
        pointerEvents: 'auto'
    });
    
    // Color schemes
    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.95)', text: '#ffffff' },
        error: { bg: 'rgba(239, 68, 68, 0.95)', text: '#ffffff' },
        warning: { bg: 'rgba(245, 158, 11, 0.95)', text: '#0f172a' },
        info: { bg: 'rgba(59, 130, 246, 0.95)', text: '#ffffff' }
    };
    
    const color = colors[type] || colors.info;
    toast.style.background = color.bg;
    toast.style.color = color.text;
    
    // Close button style
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px 8px',
            marginLeft: 'auto',
            opacity: '0.7',
            transition: 'opacity 0.3s ease',
            touchAction: 'manipulation'
        });
        
        closeBtn.addEventListener('click', () => {
            removeToast(toast);
        });
        
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.opacity = '1';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.opacity = '0.7';
        });
    }
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Auto remove after duration
    let timeoutId = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    // Pause auto-remove on hover
    toast.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
    });
    
    toast.addEventListener('mouseleave', () => {
        timeoutId = setTimeout(() => {
            removeToast(toast);
        }, 1500);
    });
    
    return toast;
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 400);
}

// ========================================
// Form Validation
// ========================================
function validateForm() {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    let firstError = null;
    
    // Clear previous errors
    document.querySelectorAll('.error').forEach(el => {
        el.classList.remove('error');
    });
    
    requiredFields.forEach(field => {
        if (!field.value || !field.value.trim()) {
            field.classList.add('error');
            isValid = false;
            if (!firstError) firstError = field;
        }
    });
    
    // Validate email
    const email = document.getElementById('email');
    if (email.value && email.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            email.classList.add('error');
            isValid = false;
            if (!firstError) firstError = email;
            showToast('Please enter a valid email address', 'error');
        }
    }
    
    // Validate phone (Nigerian format)
    const phone = document.getElementById('phone');
    if (phone.value && phone.value.trim()) {
        const phoneClean = phone.value.trim().replace(/\s/g, '');
        if (phoneClean.length < 10 || phoneClean.length > 14) {
            phone.classList.add('error');
            isValid = false;
            if (!firstError) firstError = phone;
            showToast('Please enter a valid phone number (10-14 digits)', 'error');
        }
    }
    
    // Validate password (minimum 8 characters)
    const password = document.getElementById('password');
    if (password.value) {
        if (password.value.length < 8) {
            password.classList.add('error');
            isValid = false;
            if (!firstError) firstError = password;
            showToast('Password must be at least 8 characters', 'error');
        }
    }
    
    // Validate date of birth (must be 18+)
    const dob = document.getElementById('dateOfBirth');
    if (dob.value) {
        const birthDate = new Date(dob.value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 18) {
            dob.classList.add('error');
            isValid = false;
            if (!firstError) firstError = dob;
            showToast('You must be at least 18 years old to register', 'error');
        }
    }
    
    // Validate vehicle fields
    const vehicleType = document.getElementById('vehicleType');
    if (vehicleType && !vehicleType.value) {
        vehicleType.classList.add('error');
        isValid = false;
        if (!firstError) firstError = vehicleType;
    }
    
    // Validate file uploads
    const fileFields = ['profilePhoto', 'driversLicense', 'governmentId', 'vehicleRegistration', 'vehiclePhoto'];
    fileFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input && !input.files || !input.files[0]) {
            input.classList.add('error');
            isValid = false;
            if (!firstError) firstError = input;
        }
    });
    
    // Scroll to first error
    if (firstError) {
        firstError.focus();
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return isValid;
}

// ========================================
// Handle Form Submission
// ========================================
async function handleRiderRegistration(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Show loading state
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="btn-loader"></span> <span class="btn-text">Creating Account...</span>';

    try {
        const formData = new FormData();

        // Personal Information
        formData.append('firstName', document.getElementById('firstName').value.trim());
        formData.append('lastName', document.getElementById('lastName').value.trim());
        formData.append('email', document.getElementById('email').value.trim());
        formData.append('phone', document.getElementById('phone').value.trim());
        formData.append('password', document.getElementById('password').value);
        formData.append('dateOfBirth', document.getElementById('dateOfBirth').value);
        formData.append('address', document.getElementById('address').value.trim());

        // Vehicle Information
        formData.append('vehicleType', document.getElementById('vehicleType').value);
        formData.append('vehicleBrand', document.getElementById('vehicleBrand').value.trim());
        formData.append('vehicleModel', document.getElementById('vehicleModel').value.trim());
        formData.append('vehicleColor', document.getElementById('vehicleColor').value.trim());
        formData.append('plateNumber', document.getElementById('plateNumber').value.trim().toUpperCase());

        // Files
        const fileFields = ['profilePhoto', 'driversLicense', 'governmentId', 'vehicleRegistration', 'vehiclePhoto'];
        fileFields.forEach(field => {
            const input = document.getElementById(field);
            if (input && input.files && input.files[0]) {
                formData.append(field, input.files[0]);
            }
        });

        const response = await fetch(`${API_BASE_URL}/riderSignup`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed. Please try again.');
        }

        // Save under unified keys matching the rest of the app
        localStorage.setItem('easyship_token', data.token);
        localStorage.setItem('easyship_user', JSON.stringify({
            id: data.rider.id,
            name: `${data.rider.firstName} ${data.rider.lastName}`,
            email: data.rider.email,
            role: 'rider',
            status: data.rider.status || 'pending'
        }));

        // Show success message
        showToast(
            data.message || 'Registration successful! Your application is being reviewed.',
            'success',
            5000
        );

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = '/Rider/rider-pending.html';
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message || 'Registration failed. Please check your connection.', 'error');
        
        // Reset button
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<span class="btn-text">Register as Rider</span>';
    }
}

// ========================================
// Auto-clear error states on input
// ========================================
document.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', function() {
        this.classList.remove('error');
    });
    field.addEventListener('change', function() {
        this.classList.remove('error');
    });
});

// ========================================
// Add keyboard shortcut (Enter to submit)
// ========================================
document.addEventListener('keydown', function(e) {
    // Don't submit if pressing Enter in a textarea (allow new lines)
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        // Check if the focused element is inside the form
        if (form && form.contains(e.target)) {
            const submitBtn = document.querySelector('.register-btn');
            if (submitBtn && !submitBtn.disabled) {
                e.preventDefault();
                submitBtn.click();
            }
        }
    }
});

// ========================================
// Add animation keyframes for toast
// ========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .btn-loader {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(15, 23, 42, 0.2);
        border-top-color: #0f172a;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        vertical-align: middle;
        margin-right: 8px;
    }
    
    .register-btn .btn-text {
        position: relative;
        z-index: 1;
    }
    
    .toast-close {
        background: none !important;
        border: none !important;
        color: inherit !important;
        cursor: pointer !important;
        font-size: 16px !important;
        padding: 4px 8px !important;
        margin-left: auto !important;
        opacity: 0.7 !important;
        transition: opacity 0.3s ease !important;
        touch-action: manipulation !important;
        min-height: auto !important;
        min-width: auto !important;
        border-radius: 50% !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    
    .toast-close:hover {
        opacity: 1 !important;
        background: rgba(255,255,255,0.1) !important;
    }
    
    .toast-close:active {
        transform: scale(0.9);
    }
    
    .form-group input.error,
    .form-group select.error,
    .form-group textarea.error {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08) !important;
    }
`;
document.head.appendChild(style);

// ========================================
// Log initialization
// ========================================
console.log('✅ Rider Registration initialized');
console.log('📡 API Base URL:', API_BASE_URL);

// ========================================
// Form submit listener
// ========================================
if (form) {
    form.addEventListener('submit', handleRiderRegistration);
} else {
    console.error('❌ Form not found!');
}