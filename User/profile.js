/**
 * Profile Module for EASYSHIP NG
 */

const Profile = (() => {

    const init = () => {};

    const load = async () => {
        const user = API.getUser();
        if (!user) return;

        const userId = user.id || user._id || user.userId;
        if (!userId) {
            renderFromLocal(user);
            return;
        }

        const container = document.getElementById('profile-content');
        if (!container) return;
        container.innerHTML = UI.loadingHTML('Loading profile...');

        try {
            const response = await API.getProfile(userId);
            const profile = response.data || response.user || response.profile || response;
            renderProfile(profile);
        } catch (error) {
            console.error('Profile load error:', error);
            renderFromLocal(user);
            UI.showToast('Using cached profile data.', 'warning');
        }
    };

    const renderProfile = (profile) => {
        const container = document.getElementById('profile-content');
        if (!container) return;

        const name = profile.name || 'User';
        const email = profile.email || '—';
        const phone = profile.phone || '—';
        const initials = UI.getInitials(name);
        const createdAt = profile.createdAt || profile.created_at || profile.dateJoined || new Date();

        container.innerHTML = `
            <div style="max-width:600px;margin:0 auto;background:rgba(255,255,255,0.03);border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.04);">
                <div style="text-align:center;margin-bottom:24px;">
                    <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#0f172a;margin:0 auto 12px;">${initials}</div>
                    <div style="font-size:1.3rem;font-weight:700;">${name}</div>
                    <div style="color:#94a3b8;font-size:0.9rem;">${email}</div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
                    <div style="background:rgba(255,255,255,0.02);padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;">Phone</div>
                        <div style="font-weight:600;margin-top:2px;">${phone}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.02);padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;">Status</div>
                        <div style="font-weight:600;margin-top:2px;color:#10b981;">Active</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.02);padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);grid-column:1/-1;">
                        <div style="font-size:0.7rem;text-transform:uppercase;color:#64748b;font-weight:600;">Member Since</div>
                        <div style="font-weight:600;margin-top:2px;">${UI.formatDate(createdAt)}</div>
                    </div>
                </div>

                <div style="border-top:1px solid rgba(255,255,255,0.04);padding-top:20px;">
                    <h4 style="font-size:1rem;display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                        <i data-lucide="edit-3" style="width:18px;height:18px;color:#f59e0b;"></i> Update Profile
                    </h4>
                    <form id="profile-edit-form" novalidate>
                        <div class="form-group" style="margin-bottom:14px;">
                            <label for="edit-name" style="display:block;font-size:0.82rem;font-weight:600;color:#94a3b8;margin-bottom:4px;">Full Name</label>
                            <div class="input-wrapper">
                                <i data-lucide="user" class="input-icon" style="position:absolute;left:14px;width:18px;height:18px;color:#64748b;z-index:1;"></i>
                                <input type="text" id="edit-name" value="${name}" style="width:100%;padding:12px 14px 12px 42px;border:1.5px solid rgba(255,255,255,0.06);border-radius:8px;font-size:0.9rem;color:#f1f5f9;background:rgba(255,255,255,0.03);outline:none;transition:all 0.3s ease;">
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:16px;">
                            <label for="edit-phone" style="display:block;font-size:0.82rem;font-weight:600;color:#94a3b8;margin-bottom:4px;">Phone Number</label>
                            <div class="input-wrapper">
                                <i data-lucide="phone" class="input-icon" style="position:absolute;left:14px;width:18px;height:18px;color:#64748b;z-index:1;"></i>
                                <input type="tel" id="edit-phone" value="${phone}" style="width:100%;padding:12px 14px 12px 42px;border:1.5px solid rgba(255,255,255,0.06);border-radius:8px;font-size:0.9rem;color:#f1f5f9;background:rgba(255,255,255,0.03);outline:none;transition:all 0.3s ease;">
                            </div>
                        </div>
                        <button type="submit" class="btn-primary" style="width:100%;padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;border:none;border-radius:8px;font-weight:700;cursor:pointer;transition:all 0.3s ease;display:flex;align-items:center;justify-content:center;gap:8px;">
                            <i data-lucide="save" style="width:16px;height:16px;"></i>
                            <span class="btn-text">Save Changes</span>
                            <span class="btn-loader" style="display:none;"></span>
                        </button>
                    </form>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });

        const form = document.getElementById('profile-edit-form');
        if (form) {
            form.addEventListener('submit', handleUpdateProfile);
        }
    };

    const renderFromLocal = (user) => {
        renderProfile(user);
    };

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
            const response = await fetch(`https://easyshipp.onrender.com/api/v1/profile/${userId}`, {
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
                const mergedUser = { ...user, ...updatedUser, name, phone };
                localStorage.setItem('easyship_user', JSON.stringify(mergedUser));
                UI.showToast('Profile updated successfully!', 'success');
                renderProfile(mergedUser);
                App.updateTopbarUser();
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
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