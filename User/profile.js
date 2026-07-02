/**
 * Profile Module for EASYSHIP NG
 * Loads real data from GET /profile/:userId
 */

const Profile = (() => {

    /**
     * Initialize profile module
     */
    const init = () => {
        // Profile will load when user navigates to it
    };

    /**
     * Load profile data from API
     */
    const load = async () => {
        const user = API.getUser();
        if (!user) return;

        const userId = user.id || user._id || user.userId;
        if (!userId) {
            renderFromLocal(user);
            return;
        }

        const container = document.getElementById('profile-content');
        container.innerHTML = UI.loadingHTML('Loading profile...');

        try {
            const response = await API.getProfile(userId);
            const profile = response.data || response.user || response.profile || response;
            renderProfile(profile);
        } catch (error) {
            console.error('Profile load error:', error);
            // Fallback to local user data
            renderFromLocal(user);
            UI.showToast('Using cached profile data.', 'warning');
        }
    };

    /**
     * Render profile page
     */
    const renderProfile = (profile) => {
        const container = document.getElementById('profile-content');

        const name = profile.name || 'User';
        const email = profile.email || '—';
        const phone = profile.phone || '—';
        const initials = UI.getInitials(name);

        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar-large">${initials}</div>
                    <div class="profile-name">${name}</div>
                    <div class="profile-email">${email}</div>
                </div>
                <div class="profile-body">
                    <div class="profile-field">
                        <span class="profile-field-label">
                            <i data-lucide="user"></i> Full Name
                        </span>
                        <span class="profile-field-value">${name}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">
                            <i data-lucide="mail"></i> Email Address
                        </span>
                        <span class="profile-field-value">${email}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">
                            <i data-lucide="phone"></i> Phone Number
                        </span>
                        <span class="profile-field-value">${phone}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">
                            <i data-lucide="shield"></i> Account Status
                        </span>
                        <span class="profile-field-value" style="color:var(--secondary);">Active</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">
                            <i data-lucide="calendar"></i> Member Since
                        </span>
                        <span class="profile-field-value">${UI.formatDate(profile.createdAt || profile.created_at || new Date())}</span>
                    </div>

                    <div class="profile-edit-section">
                        <h4><i data-lucide="edit-3"></i> Update Profile</h4>
                        <form id="profile-edit-form" novalidate>
                            <div class="form-group">
                                <label for="edit-name">Full Name</label>
                                <div class="input-wrapper">
                                    <i data-lucide="user" class="input-icon"></i>
                                    <input type="text" id="edit-name" value="${name}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="edit-phone">Phone Number</label>
                                <div class="input-wrapper">
                                    <i data-lucide="phone" class="input-icon"></i>
                                    <input type="tel" id="edit-phone" value="${phone}">
                                </div>
                            </div>
                            <button type="submit" class="btn-primary">
                                <i data-lucide="save" style="width:16px;height:16px;"></i>
                                <span class="btn-text">Save Changes</span>
                                <span class="btn-loader" style="display:none;"></span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons({ nodes: [container] });

        // Attach edit form handler
        document.getElementById('profile-edit-form').addEventListener('submit', handleUpdateProfile);
    };

    /**
     * Render from local data (fallback)
     */
    const renderFromLocal = (user) => {
        renderProfile(user);
    };

    /**
     * Handle profile update
     * Note: There's no dedicated update profile endpoint in the spec,
     * so this will attempt the call and handle gracefully
     */
    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        const user = API.getUser();
        if (!user) return;

        const userId = user.id || user._id || user.userId;
        const name = document.getElementById('edit-name').value.trim();
        const phone = document.getElementById('edit-phone').value.trim();

        if (!name) {
            UI.showToast('Name is required.', 'warning');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        UI.setButtonLoading(btn, true);

        try {
            // Attempt to update - if there's no endpoint, this will fail gracefully
            const response = await fetch(`http://localhost:5000/api/v1/profile/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${API.getToken()}`,
                },
                body: JSON.stringify({ name, phone }),
            });

            if (response.ok) {
                const data = await response.json();
                const updatedUser = data.data || data.user || data;
                // Update local storage
                const mergedUser = { ...user, ...updatedUser, name, phone };
                localStorage.setItem('easyship_user', JSON.stringify(mergedUser));
                UI.showToast('Profile updated successfully!', 'success');
                renderProfile(mergedUser);
                App.updateTopbarUser();
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            // Update locally even if API doesn't support it yet
            const updatedUser = { ...user, name, phone };
            localStorage.setItem('easyship_user', JSON.stringify(updatedUser));
            UI.showToast('Profile saved locally.', 'info');
            renderProfile(updatedUser);
            App.updateTopbarUser();
        } finally {
            UI.setButtonLoading(btn, false);
        }
    };

    return {
        init,
        load,
    };
})();