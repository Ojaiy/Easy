// ============================================================
// EASYSHIP NG - Logistics Platform
// ============================================================

// ============ CONFIGURATION ============
const Config = {
  API_BASE: 'https://easyshipp.onrender.com/',
  TOKEN_KEY: 'easyship_token',
  USER_KEY: 'easyship_user',
  TOAST_DURATION: 4500,
  PAGES: [
    { id: 'home', label: 'Home', public: true, icon: 'home' },
    { id: 'about', label: 'About', public: true, icon: 'info' },
    { id: 'services', label: 'Services', public: true, icon: 'briefcase' },
    { id: 'pricing', label: 'Pricing', public: true, icon: 'tag' },
    { id: 'tracking', label: 'Track', public: true, icon: 'map-pin' },
    { id: 'contact', label: 'Contact', public: true, icon: 'mail' },
    { id: 'login', label: 'Sign In', public: true, auth: false, icon: 'log-in' },
    { id: 'signup', label: 'Sign Up', public: true, auth: false, icon: 'user-plus' },
    { id: 'dashboard', label: 'Dashboard', public: false, icon: 'layout-dashboard' },
    { id: 'vendor-dashboard', label: 'Vendor Hub', public: false, icon: 'store' },
    { id: 'orders', label: 'Orders', public: false, icon: 'package' },
    { id: 'vendor-orders', label: 'Vendor Orders', public: false, icon: 'clipboard-list' },
    { id: 'create-order', label: 'Create Order', public: false, icon: 'plus-circle' },
    { id: 'profile', label: 'Profile', public: false, icon: 'user' },
    { id: 'settings', label: 'Settings', public: false, icon: 'settings' },
    { id: 'help-center', label: 'Help Center', public: false, icon: 'life-buoy' },
  ],
  PROTECTED_PAGES: ['dashboard','vendor-dashboard','orders','vendor-orders','create-order','profile','settings','help-center'],
  AUTH_PAGES: ['login','signup'],
};

// ============ STATE ============
const State = {
  currentPage: 'home',
  user: null,
  token: null,
  loading: false,
  dropdownOpen: false,
  mobileMenuOpen: false,
  orders: [],
  trackingData: null,
};

// ============ API SERVICE ============
const API = {
  async request(endpoint, options = {}) {
    const url = `${Config.API_BASE}${endpoint}`;

    const token = localStorage.getItem(Config.TOKEN_KEY);

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      let data;

      // Safe JSON parsing (prevents crash if backend returns empty response)
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          Auth.logout();
          throw new Error('Session expired. Please sign in again.');
        }

        if (response.status === 403) {
          throw new Error('You do not have permission for this action.');
        }

        if (response.status === 404) {
          throw new Error('The requested resource was not found.');
        }

        if (response.status === 409) {
          throw new Error(data.message || 'A conflict occurred with your request.');
        }

        if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }

        throw new Error(data.message || 'Something went wrong.');
      }

      return data;

    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      throw error;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// ============ NOTIFICATION SYSTEM ============
let toastId = 0;
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = ++toastId;
  const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const iconColors = { success: 'text-emerald-500', error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500' };

  const toast = document.createElement('div');
  toast.id = `toast-${id}`;
  toast.className = `toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${colors[type] || colors.info}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <i data-lucide="${icons[type] || icons.info}" class="w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[type] || iconColors.info}"></i>
    <p class="text-sm font-medium flex-1">${escapeHtml(message)}</p>
    <button onclick="dismissToast(${id})" class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });

  setTimeout(() => dismissToast(id), Config.TOAST_DURATION);
  return id;
}

function dismissToast(id) {
  const toast = document.getElementById(`toast-${id}`);
  if (!toast) return;
  toast.classList.remove('toast-enter');
  toast.classList.add('toast-exit');
  setTimeout(() => toast.remove(), 300);
}

// ============ LOADING ============
function showLoading(text = 'Loading...') {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  if (overlay) { overlay.classList.remove('hidden'); }
  if (loadingText) { loadingText.textContent = text; }
  State.loading = true;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
  State.loading = false;
}

// ============ MODAL ============
function showModal(content) {
  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-content');
  if (backdrop && container) {
    container.innerHTML = content;
    container.classList.add('modal-enter');
    backdrop.classList.remove('hidden');
    lucide.createIcons({ nodes: [container] });
  }
}

function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.classList.add('hidden');
}

// ============ AUTH SERVICE ============
const Auth = {
  isLoggedIn() {
    return !!localStorage.getItem(Config.TOKEN_KEY);
  },
  getUser() {
    try {
      const u = localStorage.getItem(Config.USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },
  getToken() {
    return localStorage.getItem(Config.TOKEN_KEY);
  },
  setSession(token, user) {
    localStorage.setItem(Config.TOKEN_KEY, token);
    localStorage.setItem(Config.USER_KEY, JSON.stringify(user));
    State.token = token;
    State.user = user;
  },
  clearSession() {
    localStorage.removeItem(Config.TOKEN_KEY);
    localStorage.removeItem(Config.USER_KEY);
    State.token = null;
    State.user = null;
  },
 async signup(data) {
  showLoading('Creating Account...');

  try {
    const res = await API.post('api/v1/userSignup', data);

    console.log("SIGNUP RESPONSE:", res);

   if (res.success && res.token) {
  this.setSession(res.token, res.user);

  showToast(res.message || 'Account created successfully!', 'success');

  navigate('dashboard');
} else {
  showToast(res.message || 'Signup failed.', 'error');
}

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
},
 async signin(data) {
  showLoading('Signing In...');

  try {
    const res = await API.post('api/v1/userSignin', data);


   if (res.success && res.token) {
  this.setSession(res.token, res.user);

  showToast(res.message || 'Logged in successfully!', 'success');

  navigate('dashboard');
}
} catch (err) {

    console.error(err);
    showToast(err.message, 'error');

  } finally {

    hideLoading();

  }
},
  async vendorSignup(data) {
    showLoading('Creating Vendor Account...');
    try {
      const res = await API.post('/vendorSignup', data);
      if (res.success) {
        showToast(res.message || 'Vendor account created!', 'success');
        navigate('login');
      } else {
        showToast(res.message || 'Vendor signup failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally { hideLoading(); }
  },
  async logout() {
    showLoading('Logging Out...');
    try {
      await API.post('/userSignout', {});
    } catch (e) { /* ignore */ }
    this.clearSession();
    hideLoading();
    showToast('You have been logged out.', 'info');
    navigate('home');
  },
  restoreSession() {
    const token = localStorage.getItem(Config.TOKEN_KEY);
    const user = this.getUser();
    if (token && user) {
      State.token = token;
      State.user = user;
    }
  }
};

// ============ HELPERS ============
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount) {
  if (amount == null) return '₦0.00';
  return '₦' + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initials(name) {
  if (!name) return 'U';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  const map = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    in_transit: 'bg-purple-50 text-purple-700 border-purple-200',
    'in transit': 'bg-purple-50 text-purple-700 border-purple-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${map[s] || 'bg-slate-50 text-slate-700 border-slate-200'}`;
}

// ============ SKELETON HELPERS ============
function skeletonCard() {
  return `<div class="bg-white rounded-2xl p-6 border border-slate-100"><div class="skeleton h-4 w-24 mb-4"></div><div class="skeleton h-8 w-16 mb-2"></div><div class="skeleton h-3 w-32"></div></div>`;
}
function skeletonRow() {
  return `<div class="bg-white rounded-xl p-4 mb-2 border border-slate-100 flex gap-4"><div class="skeleton h-4 w-20"></div><div class="skeleton h-4 w-32"></div><div class="skeleton h-4 w-24 ml-auto"></div></div>`;
}
function skeletonForm() {
  return Array(4).fill(`<div class="mb-4"><div class="skeleton h-4 w-24 mb-2"></div><div class="skeleton h-12 w-full"></div></div>`).join('');
}

// ============ EMPTY STATE ============
function emptyState(icon, title, description, actionText, actionPage) {
  return `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
        <i data-lucide="${icon}" class="w-10 h-10 text-slate-400"></i>
      </div>
      <h3 class="text-lg font-semibold text-slate-700 mb-2">${title}</h3>
      <p class="text-slate-500 text-sm max-w-sm mb-6">${description}</p>
      ${actionText ? `<button onclick="navigate('${actionPage}')" class="btn-primary">${actionText}</button>` : ''}
    </div>
  `;
}

// ============ BUTTON STYLES ============
const btnPrimary = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm';
const btnSecondary = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-50 text-sm';
const btnDanger = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all text-sm';
const btnGhost = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition-all text-sm';
const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all text-sm';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const cardClass = 'bg-white rounded-2xl border border-slate-100 shadow-sm hover-lift';

// ============ ROUTER ============
function navigate(page) {
  console.log("NAVIGATING TO:", page);

  State.currentPage = page;
  window.location.hash = `#/${page}`;
  renderPage(page);

  console.log("RENDER COMPLETE");
}

function getCurrentPage() {
  const hash = window.location.hash.replace('#/', '') || 'home';
  return hash.split('?')[0];
}

function handleRoute() {
  const page = getCurrentPage();
  State.currentPage = page;

  // Auth guard
  if (Config.PROTECTED_PAGES.includes(page) && !Auth.isLoggedIn()) {
    showToast('Please sign in to access this page.', 'warning');
    navigate('login');
    return;
  }

  // Redirect logged-in users away from auth pages
  if (Config.AUTH_PAGES.includes(page) && Auth.isLoggedIn()) {
    navigate('dashboard');
    return;
  }

  renderPage(page);
}

// ============ NAVBAR ============
function renderNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const user = Auth.getUser();
  const loggedIn = Auth.isLoggedIn();
  const page = State.currentPage;

  nav.innerHTML = `
    <div class="glass shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <a href="#/home" class="flex items-center gap-2.5 group">
            <div class="w-9 h-9 rounded-xl gradient-card flex items-center justify-center shadow-md shadow-primary-300/30">
              <i data-lucide="truck" class="w-5 h-5 text-white"></i>
            </div>
            <span class="text-xl font-bold text-primary-900 tracking-tight">EASY<span class="text-primary-600">SHIP</span></span>
          </a>

          <!-- Desktop Navigation -->
          <div class="hidden lg:flex items-center gap-1">
            ${Config.PAGES.filter(p => p.public && !p.auth).slice(0, 6).map(p =>
              `<a href="#/${p.id}" class="px-3 py-2 rounded-lg text-sm font-medium transition-colors ${page === p.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">${p.label}</a>`
            ).join('')}
          </div>

          <!-- Right Section -->
          <div class="flex items-center gap-3">
            ${loggedIn ? `
              <a href="#/create-order" class="${btnPrimary} hidden sm:inline-flex">
                <i data-lucide="plus" class="w-4 h-4"></i> New Shipment
              </a>
              <!-- User Dropdown -->
              <div class="relative">
                <button id="user-menu-btn" onclick="toggleDropdown(event)" class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors" aria-haspopup="true" aria-expanded="${State.dropdownOpen}">
                  <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">${initials(user?.name)}</div>
                  <span class="hidden md:block text-sm font-medium text-slate-700 max-w-[100px] truncate">${escapeHtml(user?.name || 'User')}</span>
                  <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 hidden md:block"></i>
                </button>
                <div id="user-dropdown" class="${State.dropdownOpen ? '' : 'hidden'} absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 dropdown-enter z-50">
                  <div class="px-4 py-2 border-b border-slate-100 mb-1">
                    <p class="text-sm font-semibold text-slate-800">${escapeHtml(user?.name || 'User')}</p>
                    <p class="text-xs text-slate-500 truncate">${escapeHtml(user?.email || '')}</p>
                  </div>
                  <a href="#/profile" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <i data-lucide="user" class="w-4 h-4 text-slate-400"></i> Profile
                  </a>
                  <a href="#/dashboard" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <i data-lucide="layout-dashboard" class="w-4 h-4 text-slate-400"></i> Dashboard
                  </a>
                  <a href="#/settings" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <i data-lucide="settings" class="w-4 h-4 text-slate-400"></i> Settings
                  </a>
                  <a href="#/help-center" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <i data-lucide="life-buoy" class="w-4 h-4 text-slate-400"></i> Help Center
                  </a>
                  <div class="border-t border-slate-100 mt-1 pt-1">
                    <button onclick="Auth.logout()" class="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                      <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ` : `
              <a href="#/login" class="${btnGhost}">Sign In</a>
              <a href="#/signup" class="${btnPrimary}">Get Started</a>
            `}
            <!-- Mobile Menu Toggle -->
            <button onclick="toggleMobileMenu()" class="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Menu">
              <i data-lucide="${State.mobileMenuOpen ? 'x' : 'menu'}" class="w-5 h-5 text-slate-700"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Menu -->
      <div id="mobile-menu" class="${State.mobileMenuOpen ? '' : 'hidden'} lg:hidden border-t border-slate-100 bg-white">
        <div class="px-4 py-3 space-y-1">
          ${Config.PAGES.filter(p => p.public && !p.auth).map(p =>
            `<a href="#/${p.id}" onclick="closeMobileMenu()" class="block px-3 py-2.5 rounded-lg text-sm font-medium ${page === p.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}">${p.label}</a>`
          ).join('')}
          ${loggedIn ? `
            <div class="border-t border-slate-100 pt-2 mt-2">
              <a href="#/dashboard" onclick="closeMobileMenu()" class="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Dashboard</a>
              <a href="#/orders" onclick="closeMobileMenu()" class="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Orders</a>
              <a href="#/create-order" onclick="closeMobileMenu()" class="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Create Order</a>
              <a href="#/profile" onclick="closeMobileMenu()" class="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Profile</a>
              <button onclick="Auth.logout()" class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">Sign Out</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  lucide.createIcons({ nodes: [nav] });
}

function toggleDropdown(event) {
  event.stopPropagation();

  State.dropdownOpen = !State.dropdownOpen;

  renderNavbar();
}
function closeDropdown() {
  if (State.dropdownOpen) {
    State.dropdownOpen = false;
    renderNavbar();
  }
}

function toggleMobileMenu() {
  State.mobileMenuOpen = !State.mobileMenuOpen;
  renderNavbar();
}

function closeMobileMenu() {
  State.mobileMenuOpen = false;
  State.dropdownOpen = false;
}

// Close dropdown on outside click
document.addEventListener('click', function (e) {
  const dropdown = document.getElementById('user-dropdown');

  if (
    State.dropdownOpen &&
    dropdown &&
    !dropdown.contains(e.target)
  ) {
    closeDropdown();
  }
});

// Keyboard accessibility for dropdown
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDropdown();
    closeModal();
  }
});

// ============ FOOTER ============
function renderFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;
  const year = new Date().getFullYear();

  footer.innerHTML = `
    <footer class="bg-slate-900 text-white mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <!-- Brand -->
          <div class="lg:col-span-1">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-9 h-9 rounded-xl gradient-card flex items-center justify-center">
                <i data-lucide="truck" class="w-5 h-5 text-white"></i>
              </div>
              <span class="text-xl font-bold tracking-tight">EASY<span class="text-primary-400">SHIP</span></span>
            </div>
            <p class="text-slate-400 text-sm leading-relaxed mb-6">Smart logistics solutions for modern businesses. Ship, track, and deliver with confidence.</p>
            <div class="flex gap-3">
              <a href="#" class="w-9 h-9 rounded-lg bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-colors"><i data-lucide="globe" class="w-4 h-4"></i></a>
              <a href="#" class="w-9 h-9 rounded-lg bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-colors"><i data-lucide="share 2" class="w-4 h-4"></i></a>
              <a href="#" class="w-9 h-9 rounded-lg bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-colors"><i data-lucide="mail" class="w-4 h-4"></i></a>
            </div>
          </div>
          <!-- Quick Links -->
          <div>
            <h4 class="font-semibold text-sm uppercase tracking-wider text-slate-300 mb-4">Company</h4>
            <ul class="space-y-2.5">
              <li><a href="#/about" class="text-slate-400 hover:text-white text-sm transition-colors">About Us</a></li>
              <li><a href="#/services" class="text-slate-400 hover:text-white text-sm transition-colors">Services</a></li>
              <li><a href="#/pricing" class="text-slate-400 hover:text-white text-sm transition-colors">Pricing</a></li>
              <li><a href="#/contact" class="text-slate-400 hover:text-white text-sm transition-colors">Contact</a></li>
            </ul>
          </div>
          <!-- Services -->
          <div>
            <h4 class="font-semibold text-sm uppercase tracking-wider text-slate-300 mb-4">Services</h4>
            <ul class="space-y-2.5">
              <li><a href="#/services" class="text-slate-400 hover:text-white text-sm transition-colors">Express Delivery</a></li>
              <li><a href="#/services" class="text-slate-400 hover:text-white text-sm transition-colors">Freight Shipping</a></li>
              <li><a href="#/services" class="text-slate-400 hover:text-white text-sm transition-colors">Warehousing</a></li>
              <li><a href="#/services" class="text-slate-400 hover:text-white text-sm transition-colors">Last Mile</a></li>
            </ul>
          </div>
          <!-- Contact -->
          <div>
            <h4 class="font-semibold text-sm uppercase tracking-wider text-slate-300 mb-4">Contact</h4>
            <ul class="space-y-3">
              <li class="flex items-start gap-3"><i data-lucide="map-pin" class="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0"></i><span class="text-slate-400 text-sm">Lagos, Nigeria</span></li>
              <li class="flex items-start gap-3"><i data-lucide="phone" class="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0"></i><span class="text-slate-400 text-sm">+234 812 345 6789</span></li>
              <li class="flex items-start gap-3"><i data-lucide="mail" class="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0"></i><span class="text-slate-400 text-sm">hello@easyship.ng</span></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-slate-500 text-sm">&copy; ${year} EASYSHIP NG. All rights reserved.</p>
          <div class="flex gap-6">
            <a href="#" class="text-slate-500 hover:text-white text-sm transition-colors">Privacy</a>
            <a href="#" class="text-slate-500 hover:text-white text-sm transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  lucide.createIcons({ nodes: [footer] });
}

// ============ SIDEBAR (for dashboard pages) ============
function dashboardSidebar(activePage) {
  const items = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { id: 'orders', icon: 'package', label: 'My Orders' },
    { id: 'create-order', icon: 'plus-circle', label: 'Create Order' },
    { id: 'vendor-dashboard', icon: 'store', label: 'Vendor Hub' },
    { id: 'vendor-orders', icon: 'clipboard-list', label: 'Vendor Orders' },
    { id: 'profile', icon: 'user', label: 'Profile' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
    { id: 'help-center', icon: 'life-buoy', label: 'Help Center' },
  ];

  return `
    <aside class="hidden lg:block w-64 flex-shrink-0">
      <div class="sticky top-20 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div class="flex items-center gap-3 p-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">${initials(Auth.getUser()?.name)}</div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(Auth.getUser()?.name || 'User')}</p>
            <p class="text-xs text-slate-500 truncate">${escapeHtml(Auth.getUser()?.email || '')}</p>
          </div>
        </div>
        <nav class="space-y-1">
          ${items.map(item => `
            <a href="#/${item.id}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activePage === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}">
              <i data-lucide="${item.icon}" class="w-4 h-4"></i>${item.label}
            </a>
          `).join('')}
        </nav>
        <div class="border-t border-slate-100 mt-4 pt-4">
          <button onclick="Auth.logout()" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full">
            <i data-lucide="log-out" class="w-4 h-4"></i>Sign Out
          </button>
        </div>
      </div>
    </aside>
  `;
}

// Mobile bottom nav for dashboard
function mobileBottomNav(activePage) {
  const items = [
    { id: 'dashboard', icon: 'layout-dashboard' },
    { id: 'orders', icon: 'package' },
    { id: 'create-order', icon: 'plus-circle' },
    { id: 'profile', icon: 'user' },
    { id: 'settings', icon: 'settings' },
  ];

  return `
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1 safe-area-bottom">
      <div class="flex items-center justify-around">
        ${items.map(item => `
          <a href="#/${item.id}" class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${activePage === item.id ? 'text-primary-600' : 'text-slate-400'}">
            <i data-lucide="${item.icon}" class="w-5 h-5"></i>
            <span class="text-[10px] font-medium">${item.id === 'create-order' ? 'Create' : item.id.charAt(0).toUpperCase() + item.id.slice(0,5)}</span>
          </a>
        `).join('')}
      </div>
    </nav>
  `;
}

// ============ DASHBOARD LAYOUT WRAPPER ============
function dashboardLayout(activePage, content, fullwidth = false) {
  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div class="${fullwidth ? '' : 'flex gap-6'}">
        ${dashboardSidebar(activePage)}
        <div class="flex-1 min-w-0 pb-20 lg:pb-0">
          <div class="page-enter">${content}</div>
        </div>
      </div>
    </div>
    ${mobileBottomNav(activePage)}
  `;
}

// ============ PAGES ============

// --- HOME ---
function pageHome() {
  return `
    <!-- Hero -->
    <section class="relative overflow-hidden gradient-hero min-h-[600px] lg:min-h-[700px] flex items-center">
      <div class="absolute inset-0 overflow-hidden">
        <div class="float-shape absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div class="float-shape absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>
        <div class="float-shape absolute top-1/2 left-1/2 w-48 h-48 bg-purple-300/10 rounded-full blur-2xl"></div>
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="fade-in-up">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-primary-200 text-sm font-medium mb-6">
              <span class="w-2 h-2 rounded-full bg-emerald-400 pulse-dot"></span>
              Now delivering across Nigeria
            </div>
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Ship Anything,<br>
              <span class="bg-gradient-to-r from-primary-300 to-purple-300 bg-clip-text text-transparent">Anywhere</span> in Nigeria
            </h1>
            <p class="text-lg text-indigo-200 mb-8 max-w-lg leading-relaxed">
              Modern logistics crafted for speed and reliability. Track your shipments in real-time, manage orders effortlessly, and deliver with confidence.
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <a href="#/signup" class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-900 font-semibold rounded-xl hover:bg-indigo-50 transition-all shadow-lg shadow-black/10 text-sm">
                Start Shipping <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </a>
              <a href="#/tracking" class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all text-sm">
                <i data-lucide="search" class="w-4 h-4"></i> Track Shipment
              </a>
            </div>
            <div class="flex items-center gap-8 mt-10 pt-8 border-t border-white/10">
              <div><p class="text-2xl font-bold text-white">10K+</p><p class="text-indigo-300 text-xs">Deliveries/Month</p></div>
              <div><p class="text-2xl font-bold text-white">99.5%</p><p class="text-indigo-300 text-xs">On-Time Rate</p></div>
              <div><p class="text-2xl font-bold text-white">36</p><p class="text-indigo-300 text-xs">States Covered</p></div>
            </div>
          </div>
          <div class="hidden lg:block">
            <div class="relative">
              <div class="absolute -inset-4 bg-gradient-to-tr from-primary-400/20 to-purple-400/20 rounded-3xl blur-2xl"></div>
              <img src="./EasyLogo.png" alt="EasyShip NG Logo">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 fade-in-up">
          <span class="text-primary-600 text-sm font-semibold uppercase tracking-wider">Why Choose Us</span>
          <h2 class="mt-3 text-3xl lg:text-4xl font-bold text-slate-900">Logistics Made Simple</h2>
          <p class="mt-4 text-slate-500 max-w-2xl mx-auto">From small packages to full freight, we provide end-to-end visibility and control over every shipment.</p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          ${[
            { icon: 'zap', title: 'Express Delivery', desc: 'Same-day and next-day delivery options across major Nigerian cities.', color: 'bg-amber-50 text-amber-600' },
            { icon: 'shield-check', title: 'Secure Handling', desc: 'End-to-end insurance and real-time tracking for every package.', color: 'bg-emerald-50 text-emerald-600' },
            { icon: 'map-pin', title: 'Real-Time Tracking', desc: 'Know exactly where your shipment is at every moment of its journey.', color: 'bg-blue-50 text-blue-600' },
            { icon: 'clock', title: 'On-Time Guarantee', desc: 'We commit to delivery windows and keep our promises.', color: 'bg-purple-50 text-purple-600' },
            { icon: 'truck', title: 'Nationwide Coverage', desc: 'Delivering to all 36 states including remote locations.', color: 'bg-rose-50 text-rose-600' },
            { icon: 'headphones', title: '24/7 Support', desc: 'Our dedicated team is always available to help with your shipments.', color: 'bg-indigo-50 text-indigo-600' },
          ].map(f => `
            <div class="${cardClass} p-6">
              <div class="w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4">
                <i data-lucide="${f.icon}" class="w-6 h-6"></i>
              </div>
              <h3 class="text-lg font-semibold text-slate-800 mb-2">${f.title}</h3>
              <p class="text-slate-500 text-sm leading-relaxed">${f.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span class="text-primary-600 text-sm font-semibold uppercase tracking-wider">How It Works</span>
          <h2 class="mt-3 text-3xl lg:text-4xl font-bold text-slate-900">Ship in 3 Easy Steps</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          ${[
            { step: '01', icon: 'package-plus', title: 'Create Shipment', desc: 'Enter pickup and delivery details, choose your package type and speed.' },
            { step: '02', icon: 'scan-line', title: 'Track in Real-Time', desc: 'Follow your package every step of the way with live updates and notifications.' },
            { step: '03', icon: 'package-check', title: 'Delivered Safely', desc: 'Your package arrives on time with proof of delivery and confirmation.' },
          ].map((s, i) => `
            <div class="text-center fade-in-up" style="animation-delay:${i*0.15}s">
              <div class="w-16 h-16 mx-auto rounded-2xl gradient-card flex items-center justify-center mb-5 shadow-lg shadow-primary-200/30">
                <i data-lucide="${s.icon}" class="w-8 h-8 text-white"></i>
              </div>
              <div class="text-xs font-bold text-primary-400 mb-2">STEP ${s.step}</div>
              <h3 class="text-xl font-bold text-slate-800 mb-3">${s.title}</h3>
              <p class="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">${s.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="gradient-card rounded-3xl p-10 lg:p-16 text-center relative overflow-hidden">
          <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4SDJ2MmgxNmM4LjgyMiAwIDE2IDcuMTc4IDE2IDE2djE2aDJWMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <div class="relative">
            <h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">Ready to Ship?</h2>
            <p class="text-primary-100 mb-8 text-lg max-w-md mx-auto">Join thousands of businesses that trust EASYSHIP for their logistics needs.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#/signup" class="${btnPrimary} bg-white text-primary-700 hover:bg-indigo-50 px-8 py-3.5 text-base">Create Free Account</a>
              <a href="#/contact" class="${btnSecondary} border-white/30 text-white hover:bg-white/10 px-8 py-3.5 text-base">Talk to Sales</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// --- ABOUT ---
function pageAbout() {
  return `
    <section class="py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 fade-in-up">
          <span class="text-primary-600 text-sm font-semibold uppercase tracking-wider">About Us</span>
          <h2 class="mt-3 text-3xl lg:text-4xl font-bold text-slate-900">Building the Future of Logistics</h2>
          <p class="mt-4 text-slate-500 max-w-2xl mx-auto">EASYSHIP NG was founded with a mission to make shipping accessible, reliable, and transparent for businesses and individuals across Nigeria.</p>
        </div>
        <div class="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div class="fade-in-up">
            <img src="http://static.photos/office/640x360/55" alt="Our Team" class="rounded-2xl shadow-lg w-full object-cover" style="max-height:400px">
          </div>
          <div class="fade-in-up" style="animation-delay:0.1s">
            <h3 class="text-2xl font-bold text-slate-900 mb-4">Our Mission</h3>
            <p class="text-slate-600 leading-relaxed mb-6">We believe every business deserves world-class logistics. Our platform connects shippers, drivers, and businesses through technology, creating a seamless delivery experience from pickup to doorstep.</p>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-primary-50 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-primary-700">2020</p><p class="text-xs text-primary-600 mt-1">Founded</p></div>
              <div class="bg-emerald-50 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-emerald-700">500+</p><p class="text-xs text-emerald-600 mt-1">Team Members</p></div>
              <div class="bg-amber-50 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-amber-700">100K+</p><p class="text-xs text-amber-600 mt-1">Shipments</p></div>
              <div class="bg-purple-50 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-purple-700">36</p><p class="text-xs text-purple-600 mt-1">States Covered</p></div>
            </div>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          ${[
            { icon: 'heart', title: 'Customer First', desc: 'Every decision we make starts with our customers\' needs.' },
            { icon: 'shield', title: 'Integrity', desc: 'Transparent pricing, honest communication, no hidden fees.' },
            { icon: 'rocket', title: 'Innovation', desc: 'Continuously improving with technology and data insights.' },
            { icon: 'users', title: 'Community', desc: 'Supporting local businesses and empowering drivers.' },
          ].map(v => `
            <div class="${cardClass} p-6 text-center">
              <div class="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4"><i data-lucide="${v.icon}" class="w-6 h-6"></i></div>
              <h3 class="font-semibold text-slate-800 mb-2">${v.title}</h3>
              <p class="text-slate-500 text-sm">${v.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// --- SERVICES ---
function pageServices() {
  return `
    <section class="py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 fade-in-up">
          <span class="text-primary-600 text-sm font-semibold uppercase tracking-wider">Our Services</span>
          <h2 class="mt-3 text-3xl lg:text-4xl font-bold text-slate-900">Comprehensive Logistics Solutions</h2>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          ${[
            { icon: 'zap', title: 'Express Delivery', desc: 'Same-day delivery within major cities. Perfect for urgent documents, parcels, and time-sensitive items.', color: 'from-amber-500 to-orange-500' },
            { icon: 'truck', title: 'Freight Shipping', desc: 'Full truckload and less-than-truckload options for heavy cargo across Nigeria.', color: 'from-primary-500 to-purple-500' },
            { icon: 'warehouse', title: 'Warehousing', desc: 'Secure storage facilities with inventory management and fulfillment services.', color: 'from-emerald-500 to-teal-500' },
            { icon: 'package', title: 'Last Mile Delivery', desc: 'Efficient doorstep delivery with real-time tracking and proof of delivery.', color: 'from-blue-500 to-cyan-500' },
            { icon: 'globe', title: 'Cross-Border Shipping', desc: 'International shipping with customs clearance and documentation support.', color: 'from-rose-500 to-pink-500' },
            { icon: 'bar-chart-3', title: 'Analytics & Reporting', desc: 'Detailed dashboards and reports to optimize your supply chain operations.', color: 'from-violet-500 to-indigo-500' },
          ].map(s => `
            <div class="${cardClass} overflow-hidden group">
              <div class="h-2 bg-gradient-to-r ${s.color}"></div>
              <div class="p-6">
                <div class="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center mb-4 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                  <i data-lucide="${s.icon}" class="w-6 h-6"></i>
                </div>
                <h3 class="text-lg font-semibold text-slate-800 mb-2">${s.title}</h3>
                <p class="text-slate-500 text-sm leading-relaxed">${s.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// --- PRICING ---
function pagePricing() {
  return `
    <section class="py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 fade-in-up">
          <span class="text-primary-600 text-sm font-semibold uppercase tracking-wider">Pricing</span>
          <h2 class="mt-3 text-3xl lg:text-4xl font-bold text-slate-900">Simple, Transparent Pricing</h2>
          <p class="mt-4 text-slate-500 max-w-2xl mx-auto">No hidden fees. No surprises. Choose the plan that fits your shipping volume.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
          ${[
            { name: 'Starter', price: '₦0', period: '/month', desc: 'Perfect for individuals getting started', features: ['5 shipments/month', 'Basic tracking', 'Email support', 'Standard delivery'], cta: 'Get Started Free', popular: false },
            { name: 'Business', price: '₦25,000', period: '/month', desc: 'For growing businesses with regular shipping needs', features: ['Unlimited shipments', 'Real-time tracking', 'Priority support', 'Express delivery', 'Analytics dashboard', 'API access'], cta: 'Start Business Plan', popular: true },
            { name: 'Enterprise', price: 'Custom', period: '', desc: 'For large organisations with complex logistics', features: ['Unlimited everything', 'Dedicated account manager', 'Custom integrations', 'White-label options', 'SLA guarantees', 'Warehousing included'], cta: 'Contact Sales', popular: false },
          ].map(p => `
            <div class="${p.popular ? 'ring-2 ring-primary-500 relative' : ''} ${cardClass} p-8">
              ${p.popular ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 gradient-card text-white text-xs font-bold rounded-full shadow-md">Most Popular</div>' : ''}
              <h3 class="text-lg font-bold text-slate-800">${p.name}</h3>
              <p class="text-sm text-slate-500 mt-1">${p.desc}</p>
              <div class="mt-6 mb-6">
                <span class="text-4xl font-bold text-slate-900">${p.price}</span>
                <span class="text-slate-500 text-sm">${p.period}</span>
              </div>
              <ul class="space-y-3 mb-8">
                ${p.features.map(f => `
                  <li class="flex items-center gap-3 text-sm text-slate-600">
                    <i data-lucide="check" class="w-4 h-4 text-primary-500 flex-shrink-0"></i>${f}
                  </li>
                `).join('')}
              </ul>
              <a href="#/${p.name === 'Enterprise' ? 'contact' : 'signup'}" class="${p.popular ? btnPrimary + ' w-full justify-center' : btnSecondary + ' w-full justify-center'}">${p.cta}</a>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// --- TRACKING ---
function pageTracking() {
  return `
    <section class="py-20 lg:py-28">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-10 fade-in-up">
          <div class="w-16 h-16 rounded-2xl gradient-card flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-200/30">
            <i data-lucide="map-pin" class="w-8 h-8 text-white"></i>
          </div>
          <h1 class="text-3xl lg:text-4xl font-bold text-slate-900">Track Your Shipment</h1>
          <p class="mt-3 text-slate-500">Enter your tracking number or order ID to see real-time status updates.</p>
        </div>

        <div class="${cardClass} p-6 sm:p-8 mb-8">
          <div class="flex gap-3">
            <div class="flex-1 relative">
              <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
              <input id="tracking-input" type="text" placeholder="Enter tracking number (e.g., ESS-2024-001)" class="${inputClass} pl-12" onkeydown="if(event.key==='Enter')trackShipment()">
            </div>
            <button id="track-btn" onclick="trackShipment()" class="${btnPrimary} flex-shrink-0">
              <i data-lucide="search" class="w-4 h-4"></i>
              <span class="hidden sm:inline">Track</span>
            </button>
          </div>
        </div>

        <div id="tracking-result" class="hidden"></div>
      </div>
    </section>
  `;
}

async function trackShipment() {
  const input = document.getElementById('tracking-input');
  const result = document.getElementById('tracking-result');
  const trackBtn = document.getElementById('track-btn');
  if (!input || !result) return;

  const orderId = input.value.trim();
  if (!orderId) {
    showToast('Please enter a tracking number or order ID.', 'warning');
    input.focus();
    return;
  }

  // Show loading
  trackBtn.disabled = true;
  trackBtn.innerHTML = '<div class="loading-spinner w-5 h-5"></div>';
  result.innerHTML = `<div class="${cardClass} p-6">${skeletonCard()}</div>`;
  result.classList.remove('hidden');

  try {
    const res = await API.get(`/tracking/${encodeURIComponent(orderId)}`);
    // Render tracking timeline
    const data = res.data || res.tracking || res;
    const statuses = data.updates || data.statuses || data.timeline || [];
    const status = data.status || data.currentStatus || 'Unknown';
    const pickup = data.pickupLocation || data.pickup || 'N/A';
    const destination = data.deliveryLocation || data.destination || data.delivery || 'N/A';
    const eta = data.estimatedArrival || data.eta || data.estimatedDelivery || 'N/A';

    result.innerHTML = `
      <div class="${cardClass} p-6 sm:p-8 page-enter">
        <!-- Shipment Info -->
        <div class="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
          <div>
            <h3 class="font-semibold text-slate-800">Order: ${escapeHtml(orderId)}</h3>
            <p class="text-sm text-slate-500 mt-1">Last updated: ${formatDate(data.updatedAt || new Date())}</p>
          </div>
          <span class="${statusBadge(status)}">${escapeHtml(status)}</span>
        </div>

        <!-- Route -->
        <div class="flex items-center gap-4 mb-8">
          <div class="flex-1 text-center">
            <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-2"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
            <p class="text-xs text-slate-500">Pickup</p>
            <p class="text-sm font-medium text-slate-800">${escapeHtml(pickup)}</p>
          </div>
          <div class="flex-shrink-0">
            <div class="w-24 h-[2px] bg-primary-200 relative">
              <div class="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary-500 border-2 border-white shadow"></div>
              <i data-lucide="truck" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary-500"></i>
            </div>
          </div>
          <div class="flex-1 text-center">
            <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
            <p class="text-xs text-slate-500">Delivery</p>
            <p class="text-sm font-medium text-slate-800">${escapeHtml(destination)}</p>
          </div>
        </div>

        <!-- ETA -->
        <div class="bg-primary-50 rounded-xl p-4 mb-8 flex items-center gap-3">
          <i data-lucide="clock" class="w-5 h-5 text-primary-600"></i>
          <div>
            <p class="text-sm font-medium text-primary-800">Estimated Arrival</p>
            <p class="text-sm text-primary-600">${escapeHtml(eta)}</p>
          </div>
        </div>

        <!-- Timeline -->
        ${statuses.length > 0 ? `
          <h4 class="font-semibold text-slate-800 mb-4">Tracking Timeline</h4>
          <div class="relative">
            <div class="timeline-line timeline-line-active"></div>
            ${statuses.map((s, i) => `
              <div class="flex items-start gap-4 pb-6 last:pb-0 relative">
                <div class="relative z-10 flex-shrink-0">
                  <div class="w-10 h-10 rounded-full ${i === 0 ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600'} flex items-center justify-center">
                    <i data-lucide="${i === 0 ? 'check-circle' : 'circle'}" class="w-5 h-5"></i>
                  </div>
                </div>
                <div class="flex-1 min-w-0 ${i === 0 ? '' : 'opacity-70'}">
                  <p class="text-sm font-semibold text-slate-800">${escapeHtml(s.status || s.title || 'Update')}</p>
                  <p class="text-xs text-slate-500 mt-1">${escapeHtml(s.location || s.description || '')}</p>
                  <p class="text-xs text-slate-400 mt-1">${formatDate(s.timestamp || s.date || s.time)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    lucide.createIcons({ nodes: [result] });
    showToast('Tracking information retrieved!', 'success');
  } catch (err) {
    result.innerHTML = `
      <div class="${cardClass} p-8 text-center page-enter">
        <div class="w-16 h-16 rounded-full bg-red-50 text-red-400 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="search-x" class="w-8 h-8"></i>
        </div>
        <h3 class="text-lg font-semibold text-slate-800 mb-2">Shipment Not Found</h3>
        <p class="text-slate-500 text-sm mb-6">${escapeHtml(err.message)}</p>
        <button onclick="document.getElementById('tracking-input').focus()" class="${btnSecondary}">Try Again</button>
      </div>
    `;
    lucide.createIcons({ nodes: [result] });
  } finally {
    trackBtn.disabled = false;
    trackBtn.innerHTML = '<i data-lucide="search" class="w-4 h-4"></i><span class="hidden sm:inline">Track</span>';
    lucide.createIcons({ nodes: [trackBtn] });
  }
}

// --- CONTACT ---
function pageContact() {
  return `
    <section class="py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 fade-in-up">
          <span class="text-primary-600 text-sm font-semibold uppercase tracking-wider">Contact Us</span>
          <h2 class="mt-3 text-3xl lg:text-4xl font-bold text-slate-900">Get in Touch</h2>
          <p class="mt-4 text-slate-500 max-w-2xl mx-auto">Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
        </div>
        <div class="grid lg:grid-cols-5 gap-10">
          <!-- Info -->
          <div class="lg:col-span-2">
            <div class="stagger-children space-y-6">
              ${[
                { icon: 'map-pin', title: 'Visit Us', info: '123 Logistics Way, Victoria Island, Lagos, Nigeria' },
                { icon: 'mail', title: 'Email Us', info: 'easyship70ng@gmail.com' },
                { icon: 'phone', title: 'Call Us', info: '+234 8119981998' },
                { icon: 'clock', title: 'Working Hours', info: 'Mon - Fri: 8:00 AM - 6:00 PM' },
              ].map(c => `
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0"><i data-lucide="${c.icon}" class="w-5 h-5"></i></div>
                  <div><h4 class="font-semibold text-slate-800 text-sm">${c.title}</h4><p class="text-slate-500 text-sm mt-1">${c.info}</p></div>
                </div>
              `).join('')}
            </div>
          </div>
          <!-- Form -->
          <div class="lg:col-span-3">
            <div class="${cardClass} p-6 sm:p-8">
              <form onsubmit="handleContactForm(event)" class="space-y-5">
                <div class="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label class="${labelClass}">Full Name</label>
                    <input type="text" required class="${inputClass}" placeholder="John Doe">
                  </div>
                  <div>
                    <label class="${labelClass}">Email</label>
                    <input type="email" required class="${inputClass}" placeholder="john@example.com">
                  </div>
                </div>
                <div>
                  <label class="${labelClass}">Subject</label>
                  <select class="${inputClass}" required>
                    <option value="">Select a subject</option>
                    <option>General Inquiry</option>
                    <option>Shipping Question</option>
                    <option>Partnership</option>
                    <option>Technical Support</option>
                    <option>Complaints</option>
                  </select>
                </div>
                <div>
                  <label class="${labelClass}">Message</label>
                  <textarea rows="5" required class="${inputClass} resize-none" placeholder="Tell us how we can help..."></textarea>
                </div>
                <button type="submit" class="${btnPrimary} w-full justify-center py-3">Send Message <i data-lucide="send" class="w-4 h-4"></i></button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function handleContactForm(e) {
  e.preventDefault();
  showToast('Thank you for your message! We\'ll get back to you soon.', 'success');
  e.target.reset();
}

// --- LOGIN ---
function pageLogin() {
  return `
    <section class="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8 fade-in-up">
          <div class="w-12 h-12 rounded-xl gradient-card flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200/30">
            <i data-lucide="log-in" class="w-6 h-6 text-white"></i>
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p class="text-slate-500 mt-2 text-sm">Sign in to your EASYSHIP account</p>
        </div>
        <div class="${cardClass} p-6 sm:p-8 fade-in-up" style="animation-delay:0.1s">
          <form onsubmit="handleLogin(event)" id="login-form">
            <div class="space-y-5">
              <div>
                <label for="login-email" class="${labelClass}">Email Address</label>
                <input id="login-email" type="email" required class="${inputClass}" placeholder="you@example.com" autocomplete="email">
              </div>
              <div>
                <label for="login-password" class="${labelClass}">Password</label>
                <div class="relative">
                  <input id="login-password" type="password" required class="${inputClass} pr-12" placeholder="Enter your password" autocomplete="current-password">
                  <button type="button" onclick="togglePasswordVisibility('login-password', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" aria-label="Toggle password visibility">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
              <button type="submit" id="login-btn" class="${btnPrimary} w-full justify-center py-3">Sign In</button>
            </div>
          </form>
        </div>
        <p class="text-center text-sm text-slate-500 mt-6">Don't have an account? <a href="#/signup" class="text-primary-600 font-semibold hover:text-primary-700">Sign up</a></p>
      </div>
    </section>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) { showToast('Please fill in all fields.', 'warning'); return; }

  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner w-5 h-5"></div> Signing In...';

  await Auth.signin({ email, password });

  btn.disabled = false;
  btn.innerHTML = 'Sign In';
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>`;
  lucide.createIcons({ nodes: [btn] });
}

// --- SIGNUP ---
function pageSignup() {
  return `
    <section class="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8 fade-in-up">
          <div class="w-12 h-12 rounded-xl gradient-card flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200/30">
            <i data-lucide="user-plus" class="w-6 h-6 text-white"></i>
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Create Account</h1>
          <p class="text-slate-500 mt-2 text-sm">Join EASYSHIP and start shipping today</p>
        </div>
        <div class="${cardClass} p-6 sm:p-8 fade-in-up" style="animation-delay:0.1s">
          <form onsubmit="handleSignup(event)" id="signup-form">
            <div class="space-y-5">
              <div>
                <label for="signup-name" class="${labelClass}">Full Name</label>
                <input id="signup-name" type="text" required class="${inputClass}" placeholder="John Doe" autocomplete="name">
              </div>
              <div>
                <label for="signup-email" class="${labelClass}">Email Address</label>
                <input id="signup-email" type="email" required class="${inputClass}" placeholder="you@example.com" autocomplete="email">
              </div>
              <div>
                <label for="signup-phone" class="${labelClass}">Phone Number</label>
                <input id="signup-phone" type="tel" required class="${inputClass}" placeholder="08123456789" autocomplete="tel">
              </div>
              <div>
                <label for="signup-password" class="${labelClass}">Password</label>
                <div class="relative">
                  <input id="signup-password" type="password" required minlength="6" class="${inputClass} pr-12" placeholder="Min. 6 characters" autocomplete="new-password">
                  <button type="button" onclick="togglePasswordVisibility('signup-password', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" aria-label="Toggle password visibility">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
              <button type="submit" id="signup-btn" class="${btnPrimary} w-full justify-center py-3">Create Account</button>
            </div>
          </form>
        </div>
        <p class="text-center text-sm text-slate-500 mt-6">Already have an account? <a href="#/login" class="text-primary-600 font-semibold hover:text-primary-700">Sign in</a></p>
      </div>
    </section>
  `;
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name || !email || !phone || !password) { showToast('Please fill in all fields.', 'warning'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters.', 'warning'); return; }

  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner w-5 h-5"></div> Creating Account...';

  await Auth.signup({ name, email, phone, password });

  btn.disabled = false;
  btn.innerHTML = 'Create Account';
}

// --- DASHBOARD ---
function pageDashboard() {
  const user = Auth.getUser();
  return dashboardLayout('dashboard', `
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">Welcome back, ${escapeHtml(user?.name?.split(' ')[0] || 'User')} 👋</h1>
      <p class="text-slate-500 mt-1">Here's an overview of your shipping activity.</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children" id="dashboard-stats">
      ${[
        { icon: 'package', label: 'Total Orders', value: '—', color: 'bg-primary-50 text-primary-600' },
        { icon: 'truck', label: 'Active Shipments', value: '—', color: 'bg-blue-50 text-blue-600' },
        { icon: 'package-check', label: 'Delivered', value: '—', color: 'bg-emerald-50 text-emerald-600' },
        { icon: 'wallet', label: 'Total Spending', value: '—', color: 'bg-amber-50 text-amber-600' },
      ].map(s => `
        <div class="${cardClass} p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-xl ${s.color} flex items-center justify-center"><i data-lucide="${s.icon}" class="w-5 h-5"></i></div>
          </div>
          <p class="text-2xl font-bold text-slate-900">${s.value}</p>
          <p class="text-xs text-slate-500 mt-1">${s.label}</p>
        </div>
      `).join('')}
    </div>

    <!-- Quick Actions + Recent Orders -->
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="${cardClass} overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-semibold text-slate-800">Recent Orders</h3>
            <a href="#/orders" class="text-primary-600 text-sm font-medium hover:text-primary-700">View All</a>
          </div>
          <div id="dashboard-recent-orders" class="p-6">
            ${emptyState('package', 'No shipment data available yet', 'Create your first shipment to see activity here.', 'Create Shipment', 'create-order')}
          </div>
        </div>
      </div>
      <div>
        <div class="${cardClass} p-6">
          <h3 class="font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div class="space-y-3">
            <a href="#/create-order" class="flex items-center gap-3 p-3 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
              <i data-lucide="plus-circle" class="w-5 h-5"></i><span class="text-sm font-medium">New Shipment</span>
            </a>
            <a href="#/tracking" class="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
              <i data-lucide="search" class="w-5 h-5"></i><span class="text-sm font-medium">Track Package</span>
            </a>
            <a href="#/orders" class="flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              <i data-lucide="package" class="w-5 h-5"></i><span class="text-sm font-medium">View Orders</span>
            </a>
            <a href="#/help-center" class="flex items-center gap-3 p-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
              <i data-lucide="life-buoy" class="w-5 h-5"></i><span class="text-sm font-medium">Get Help</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `);
}

// --- VENDOR DASHBOARD ---
function pageVendorDashboard() {
  return dashboardLayout('vendor-dashboard', `
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">Vendor Hub 🏪</h1>
      <p class="text-slate-500 mt-1">Manage your deliveries and business operations.</p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
      ${[
        { icon: 'package', label: 'Total Orders', value: '—', color: 'bg-primary-50 text-primary-600' },
        { icon: 'truck', label: 'Active Deliveries', value: '—', color: 'bg-blue-50 text-blue-600' },
        { icon: 'banknote', label: 'Revenue', value: '—', color: 'bg-emerald-50 text-emerald-600' },
        { icon: 'clock', label: 'Pending Pickups', value: '—', color: 'bg-amber-50 text-amber-600' },
      ].map(s => `
        <div class="${cardClass} p-5">
          <div class="w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3"><i data-lucide="${s.icon}" class="w-5 h-5"></i></div>
          <p class="text-2xl font-bold text-slate-900">${s.value}</p>
          <p class="text-xs text-slate-500 mt-1">${s.label}</p>
        </div>
      `).join('')}
    </div>

    <div class="${cardClass} overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100">
        <h3 class="font-semibold text-slate-800">Recent Orders</h3>
      </div>
      <div id="vendor-recent-orders" class="p-6">
        ${emptyState('clipboard-list', 'No orders yet', 'Orders assigned to you will appear here.', null, null)}
      </div>
    </div>
  `);
}

// --- ORDERS ---
function pageOrders() {
  return dashboardLayout('orders', `
    <div class="mb-8 flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">My Orders</h1>
        <p class="text-slate-500 mt-1">View and manage all your shipments.</p>
      </div>
      <a href="#/create-order" class="${btnPrimary}"><i data-lucide="plus" class="w-4 h-4"></i> New Shipment</a>
    </div>

    <!-- Search/Filter -->
    <div class="${cardClass} p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1 relative">
          <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
          <input id="orders-search" type="text" placeholder="Search by order ID, tracking number..." class="${inputClass} pl-10" oninput="filterOrders()">
        </div>
        <select id="orders-filter" class="${inputClass} w-full sm:w-40" onchange="filterOrders()">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>

    <div id="orders-list" class="space-y-3">
      ${emptyState('package', 'No orders yet', 'Create your first shipment to see it here.', 'Create Shipment', 'create-order')}
    </div>
  `);
}

function filterOrders() {
  // Will be enhanced when we have real data from API
}

// --- VENDOR ORDERS ---
function pageVendorOrders() {
  return dashboardLayout('vendor-orders', `
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">Vendor Orders</h1>
      <p class="text-slate-500 mt-1">Manage orders assigned to you as a vendor.</p>
    </div>

    <div id="vendor-orders-list" class="space-y-3">
      ${emptyState('clipboard-list', 'No vendor orders yet', 'Orders assigned to your vendor account will appear here.', null, null)}
    </div>
  `);
}

// --- CREATE ORDER ---
function pageCreateOrder() {
  return dashboardLayout('create-order', `
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">Create Shipment</h1>
      <p class="text-slate-500 mt-1">Fill in the details to schedule a new delivery.</p>
    </div>

    <div class="${cardClass} p-6 sm:p-8 max-w-3xl">
      <form onsubmit="handleCreateOrder(event)" id="create-order-form">
        <!-- Pickup -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><i data-lucide="map-pin" class="w-4 h-4"></i></div>
            Pickup Information
          </h3>
          <div class="space-y-5">
            <div>
              <label class="${labelClass}">Pickup Address <span class="text-red-500">*</span></label>
              <input id="order-pickup" type="text" required class="${inputClass}" placeholder="Enter pickup address">
            </div>
          </div>
        </div>

        <!-- Delivery -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><i data-lucide="map-pin" class="w-4 h-4"></i></div>
            Delivery Information
          </h3>
          <div class="space-y-5">
            <div>
              <label class="${labelClass}">Delivery Address <span class="text-red-500">*</span></label>
              <input id="order-delivery" type="text" required class="${inputClass}" placeholder="Enter delivery address">
            </div>
            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <label class="${labelClass}">Recipient Name <span class="text-red-500">*</span></label>
                <input id="order-recipient" type="text" required class="${inputClass}" placeholder="Full name">
              </div>
              <div>
                <label class="${labelClass}">Recipient Phone <span class="text-red-500">*</span></label>
                <input id="order-phone" type="tel" required class="${inputClass}" placeholder="Phone number">
              </div>
            </div>
          </div>
        </div>

        <!-- Package -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><i data-lucide="package" class="w-4 h-4"></i></div>
            Package Details
          </h3>
          <div class="space-y-5">
            <div>
              <label class="${labelClass}">Package Type <span class="text-red-500">*</span></label>
              <select id="order-type" required class="${inputClass}">
                <option value="">Select package type</option>
                <option value="document">Document</option>
                <option value="small">Small Package (&lt; 5kg)</option>
                <option value="medium">Medium Package (5-20kg)</option>
                <option value="large">Large Package (20-50kg)</option>
                <option value="freight">Freight (&gt; 50kg)</option>
              </select>
            </div>
            <div>
              <label class="${labelClass}">Package Weight (kg)</label>
              <input id="order-weight" type="number" min="0.1" step="0.1" class="${inputClass}" placeholder="e.g. 5.5">
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><i data-lucide="message-square" class="w-4 h-4"></i></div>
            Additional Information
          </h3>
          <div>
            <label class="${labelClass}">Delivery Instructions</label>
            <textarea id="order-instructions" rows="4" class="${inputClass} resize-none" placeholder="Any special instructions for the delivery..."></textarea>
          </div>
        </div>

        <div class="flex gap-3 pt-4 border-t border-slate-100">
          <button type="submit" id="create-order-btn" class="${btnPrimary} flex-1 justify-center py-3">Create Shipment <i data-lucide="arrow-right" class="w-4 h-4"></i></button>
          <button type="button" onclick="navigate('orders')" class="${btnSecondary} py-3">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleCreateOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('create-order-btn');

  const data = {
    pickupAddress: document.getElementById('order-pickup')?.value.trim(),
    deliveryAddress: document.getElementById('order-delivery')?.value.trim(),
    recipientName: document.getElementById('order-recipient')?.value.trim(),
    recipientPhone: document.getElementById('order-phone')?.value.trim(),
    packageType: document.getElementById('order-type')?.value,
    packageWeight: document.getElementById('order-weight')?.value,
    deliveryInstructions: document.getElementById('order-instructions')?.value.trim(),
  };

  // Validation
  if (!data.pickupAddress || !data.deliveryAddress || !data.recipientName || !data.recipientPhone || !data.packageType) {
    showToast('Please fill in all required fields.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner w-5 h-5"></div> Creating Shipment...';
  showLoading('Creating Shipment...');

  try {
    const res = await API.post('/start', data);
    showToast(res.message || 'Shipment created successfully!', 'success');
    navigate('orders');
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Shipment <i data-lucide="arrow-right" class="w-4 h-4"></i>';
    lucide.createIcons({ nodes: [btn] });
  }
}

// --- PROFILE ---
function pageProfile() {
  const user = Auth.getUser();
  return dashboardLayout('profile', `
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">Profile</h1>
      <p class="text-slate-500 mt-1">Manage your personal information.</p>
    </div>

    <div class="max-w-2xl">
      <!-- Avatar -->
      <div class="${cardClass} p-6 mb-6 flex items-center gap-5">
        <div class="w-20 h-20 rounded-2xl gradient-card flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-200/30">${initials(user?.name)}</div>
        <div>
          <h2 class="text-xl font-bold text-slate-900">${escapeHtml(user?.name || 'User')}</h2>
          <p class="text-slate-500 text-sm">${escapeHtml(user?.email || '')}</p>
          <span class="${statusBadge('active')} mt-2">Active</span>
        </div>
      </div>

      <!-- Info -->
      <div class="${cardClass} p-6 sm:p-8">
        <h3 class="font-semibold text-slate-800 mb-6">Personal Information</h3>
        <div class="space-y-5">
          <div>
            <label class="${labelClass}">Full Name</label>
            <input type="text" value="${escapeHtml(user?.name || '')}" class="${inputClass} bg-slate-50" readonly>
          </div>
          <div>
            <label class="${labelClass}">Email Address</label>
            <input type="email" value="${escapeHtml(user?.email || '')}" class="${inputClass} bg-slate-50" readonly>
          </div>
          <div>
            <label class="${labelClass}">Phone Number</label>
            <input type="tel" value="${escapeHtml(user?.phone || '')}" class="${inputClass} bg-slate-50" readonly>
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-6 flex items-center gap-2">
          <i data-lucide="info" class="w-3.5 h-3.5"></i>
          Profile editing will be available when the update endpoint is ready.
        </p>
      </div>
    </div>
  `);
}

// --- SETTINGS ---
function pageSettings() {
  return dashboardLayout('settings', `
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">Settings</h1>
      <p class="text-slate-500 mt-1">Manage your account preferences.</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <!-- Notifications -->
      <div class="${cardClass} p-6">
        <h3 class="font-semibold text-slate-800 mb-4">Notifications</h3>
        <div class="space-y-4">
          ${[
            { label: 'Shipment Updates', desc: 'Get notified when your shipment status changes', checked: true },
            { label: 'Email Notifications', desc: 'Receive order confirmations and receipts via email', checked: true },
            { label: 'SMS Alerts', desc: 'Get SMS notifications for critical updates', checked: false },
          ].map((n, i) => `
            <label class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div>
                <p class="text-sm font-medium text-slate-700">${n.label}</p>
                <p class="text-xs text-slate-500">${n.desc}</p>
              </div>
              <div class="relative">
                <input type="checkbox" ${n.checked ? 'checked' : ''} class="sr-only peer" id="notif-${i}">
                <div onclick="this.previousElementSibling.checked=!this.previousElementSibling.checked; this.className=this.previousElementSibling.checked?'w-11 h-6 bg-primary-600 rounded-full transition-colors peer-checked:bg-primary-600':'w-11 h-6 bg-slate-200 rounded-full transition-colors'; this.querySelector('span').className=this.previousElementSibling.checked?'absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform translate-x-5':'absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform translate-x-0'" class="w-11 h-6 ${n.checked ? 'bg-primary-600' : 'bg-slate-200'} rounded-full transition-colors">
                  <span class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${n.checked ? 'translate-x-5' : 'translate-x-0'} shadow-sm"></span>
                </div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Security -->
      <div class="${cardClass} p-6">
        <h3 class="font-semibold text-slate-800 mb-4">Security</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-3">
            <div>
              <p class="text-sm font-medium text-slate-700">Change Password</p>
              <p class="text-xs text-slate-500">Update your password regularly for security</p>
            </div>
            <button class="${btnSecondary} text-xs" onclick="showToast('Password change will be available soon.','info')">Change</button>
          </div>
          <div class="flex items-center justify-between p-3">
            <div>
              <p class="text-sm font-medium text-slate-700">Two-Factor Authentication</p>
              <p class="text-xs text-slate-500">Add an extra layer of security</p>
            </div>
            <button class="${btnSecondary} text-xs" onclick="showToast('2FA setup coming soon.','info')">Enable</button>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="${cardClass} p-6 border-red-200">
        <h3 class="font-semibold text-red-700 mb-4">Danger Zone</h3>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-700">Delete Account</p>
            <p class="text-xs text-slate-500">Permanently delete your account and all data</p>
          </div>
          <button class="${btnDanger} text-xs" onclick="confirmDeleteAccount()">Delete Account</button>
        </div>
      </div>
    </div>
  `);
}

function confirmDeleteAccount() {
  showModal(`
    <div class="p-6">
      <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4"><i data-lucide="alert-triangle" class="w-6 h-6"></i></div>
      <h3 class="text-lg font-bold text-slate-900 mb-2">Delete Account?</h3>
      <p class="text-slate-500 text-sm mb-6">This action is irreversible. All your data will be permanently removed.</p>
      <div class="flex gap-3">
        <button onclick="closeModal()" class="${btnSecondary} flex-1 justify-center">Cancel</button>
        <button onclick="closeModal();showToast('Account deletion coming soon.','info')" class="${btnDanger} flex-1 justify-center">Delete</button>
      </div>
    </div>
  `);
}

// --- HELP CENTER ---
function pageHelpCenter() {
  const faqs = [
    { q: 'How do I create a shipment?', a: 'Navigate to Create Order from your dashboard, fill in the pickup and delivery details, and submit. You\'ll receive a tracking number instantly.' },
    { q: 'How can I track my package?', a: 'Use the Track Shipment feature on the homepage or dashboard. Enter your tracking number to see real-time status updates.' },
    { q: 'What are the delivery timeframes?', a: 'Express deliveries within Lagos arrive same-day or next-day. Interstate deliveries typically take 2-5 business days depending on the route.' },
    { q: 'Is my shipment insured?', a: 'Yes, all shipments come with basic insurance. For high-value items, we recommend our premium insurance coverage for additional protection.' },
    { q: 'How do I become a vendor?', a: 'Sign up using the Vendor registration form. Once your application is approved, you can start accepting delivery requests.' },
    { q: 'What payment methods are accepted?', a: 'We accept bank transfers, debit cards, and mobile money. Enterprise customers can also use purchase orders.' },
  ];

  return dashboardLayout('help-center', `
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-slate-900">Help Center</h1>
      <p class="text-slate-500 mt-1">Find answers to common questions or reach out to our team.</p>
    </div>

    <!-- Search -->
    <div class="${cardClass} p-6 mb-8 max-w-2xl">
      <div class="relative">
        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
        <input type="text" placeholder="Search help articles..." class="${inputClass} pl-12">
      </div>
    </div>

    <!-- Quick Links -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
      ${[
        { icon: 'book-open', title: 'Getting Started', desc: 'Learn the basics of shipping' },
        { icon: 'truck', title: 'Shipping Guide', desc: 'Detailed shipping instructions' },
        { icon: 'credit-card', title: 'Billing & Payments', desc: 'Manage your payments' },
        { icon: 'shield-check', title: 'Claims & Insurance', desc: 'File claims and report issues' },
      ].map(l => `
        <a href="#" onclick="event.preventDefault();showToast('Article coming soon!','info')" class="${cardClass} p-5 !no-underline">
          <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3"><i data-lucide="${l.icon}" class="w-5 h-5"></i></div>
          <h4 class="font-semibold text-slate-800 text-sm">${l.title}</h4>
          <p class="text-xs text-slate-500 mt-1">${l.desc}</p>
        </a>
      `).join('')}
    </div>

    <!-- FAQs -->
    <div class="max-w-2xl">
      <h2 class="text-xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
      <div class="space-y-3">
        ${faqs.map((faq, i) => `
          <div class="${cardClass} overflow-hidden">
            <button onclick="toggleFaq(${i})" class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors" aria-expanded="false">
              <span class="text-sm font-medium text-slate-800 pr-4">${faq.q}</span>
              <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform faq-icon-${i}"></i>
            </button>
            <div id="faq-${i}" class="hidden px-6 pb-4">
              <p class="text-sm text-slate-600 leading-relaxed">${faq.a}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Contact CTA -->
      <div class="${cardClass} p-8 text-center mt-8">
        <h3 class="text-lg font-semibold text-slate-800 mb-2">Still need help?</h3>
        <p class="text-slate-500 text-sm mb-4">Our support team is available 24/7 to assist you.</p>
        <a href="#/contact" class="${btnPrimary}">Contact Support</a>
      </div>
    </div>
  `);
}

function toggleFaq(id) {
  const content = document.getElementById(`faq-${id}`);
  const icon = document.querySelector(`.faq-icon-${id}`);
  if (content) {
    content.classList.toggle('hidden');
    if (icon) icon.style.transform = content.classList.contains('hidden') ? '' : 'rotate(180deg)';
  }
}

// ============ RENDER PAGE ============
function renderPage(pageId) {
  const content = document.getElementById('page-content');
  const pageMap = {
    'home': pageHome,
    'about': pageAbout,
    'services': pageServices,
    'pricing': pagePricing,
    'tracking': pageTracking,
    'contact': pageContact,
    'login': pageLogin,
    'signup': pageSignup,
    'dashboard': pageDashboard,
    'vendor-dashboard': pageVendorDashboard,
    'orders': pageOrders,
    'vendor-orders': pageVendorOrders,
    'create-order': pageCreateOrder,
    'profile': pageProfile,
    'settings': pageSettings,
    'help-center': pageHelpCenter,
  };

  const renderer = pageMap[pageId];
  if (renderer) {
    content.innerHTML = renderer();
  } else {
    content.innerHTML = `
      <div class="min-h-[60vh] flex items-center justify-center">
        ${emptyState('file-question', 'Page Not Found', 'The page you are looking for does not exist.', 'Go Home', 'home')}
      </div>
    `;
  }

  State.dropdownOpen = false;
  State.mobileMenuOpen = false;
  renderNavbar();
  renderFooter();

  // Reinitialize icons
  requestAnimationFrame(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ============ APP INIT ============
function initApp() {
  // Restore session
  Auth.restoreSession();

  // Render initial shell
  renderNavbar();
  renderFooter();

  // Handle initial route
  handleRoute();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute);

  // Handle browser back/forward properly
  window.addEventListener('popstate', handleRoute);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}