const API_BASE_URL = 'http://localhost:5000/api/v1';

const form = document.getElementById('rider-register-form');
const registerBtn = document.getElementById('register-btn');

if (form) {
    form.addEventListener('submit', handleRiderRegistration);
}

async function handleRiderRegistration(e) {
    e.preventDefault();

    registerBtn.disabled = true;
    registerBtn.textContent = 'Creating Account...';

    try {
        const formData = new FormData();

        formData.append('firstName', document.getElementById('firstName').value.trim());
        formData.append('lastName', document.getElementById('lastName').value.trim());
        formData.append('email', document.getElementById('email').value.trim());
        formData.append('phone', document.getElementById('phone').value.trim());
        formData.append('password', document.getElementById('password').value);
        formData.append('dateOfBirth', document.getElementById('dateOfBirth').value);
        formData.append('address', document.getElementById('address').value.trim());

        formData.append('vehicleType', document.getElementById('vehicleType').value);
        formData.append('vehicleBrand', document.getElementById('vehicleBrand').value.trim());
        formData.append('vehicleModel', document.getElementById('vehicleModel').value.trim());
        formData.append('vehicleColor', document.getElementById('vehicleColor').value.trim());
        formData.append('plateNumber', document.getElementById('plateNumber').value.trim().toUpperCase());

        formData.append('profilePhoto', document.getElementById('profilePhoto').files[0]);
        formData.append('driversLicense', document.getElementById('driversLicense').files[0]);
        formData.append('governmentId', document.getElementById('governmentId').files[0]);
        formData.append('vehicleRegistration', document.getElementById('vehicleRegistration').files[0]);
        formData.append('vehiclePhoto', document.getElementById('vehiclePhoto').files[0]);

        const response = await fetch(`${API_BASE_URL}/riderSignup`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        // Save under unified keys matching the rest of the app
        localStorage.setItem('easyship_token', data.token);
        localStorage.setItem('easyship_user', JSON.stringify({
            id: data.rider.id,
            name: `${data.rider.firstName} ${data.rider.lastName}`,
            email: data.rider.email,
            role: 'rider'
        }));

        alert(data.message || 'Registration successful. Awaiting admin approval.');

        window.location.href = '/Rider/rider-pending.html';

    } catch (error) {
        alert(error.message);
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register as Rider';
    }
}