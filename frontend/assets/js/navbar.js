/**
 * CampusCare — Dedicated Top Navbar & Header Component
 * File: frontend/assets/js/navbar.js
 * 
 * Manages:
 * - Dynamic Breadcrumb Navigation (Portal / Current Page)
 * - Mobile Menu Hamburger Trigger
 * - Theme Switcher Button (Dark / Light Mode)
 * - Live Notifications Counter Bubble
 * - User Display Badge & Header Logout Actions
 */
const Navbar = {
  // Page titles map for automated breadcrumb generation
  pageTitles: {
    dashboard: 'Dashboard',
    submit: 'File Grievance',
    complaints: 'Grievance Directory',
    'my-complaints': 'My Grievances',
    reports: 'Analytics & SLA Reports',
    roles: 'Roles & Privileges',
    users: 'User Directory',
    'audit-logs': 'Security Audit Logs',
    notifications: 'Notifications',
    profile: 'My Profile',
    settings: 'Settings',
    details: 'Grievance Details'
  },

  render(user, activePage = '', customBreadcrumb = null) {
    const headerEl = document.querySelector('.app-header');
    if (!headerEl) return;

    const pageLabel = customBreadcrumb || this.pageTitles[activePage] || 'Portal';
    const isDetailsPage = activePage === 'details' || window.location.pathname.includes('complaint-details.html');
    const roleSlug = user && user.role_slug ? user.role_slug.toLowerCase() : 'student';
    const complaintsUrl = roleSlug === 'student' ? 'my-complaints.html' : 'complaints.html';

    let breadcrumbsHtml = '';
    if (isDetailsPage) {
      breadcrumbsHtml = `
        <a href="dashboard.html" style="color:var(--color-text-muted);text-decoration:none;">Dashboard</a>
        <span class="breadcrumb-separator">/</span>
        <a href="${complaintsUrl}" style="color:var(--color-text-muted);text-decoration:none;">Grievances</a>
        <span class="breadcrumb-separator">/</span>
        <span id="detail-ref" class="breadcrumb-current">${customBreadcrumb || 'Loading...'}</span>
      `;
    } else {
      breadcrumbsHtml = `
        <a href="dashboard.html" style="color:var(--color-text-muted);text-decoration:none;">Portal</a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">${pageLabel}</span>
      `;
    }

    // 1. Ensure left breadcrumbs section
    let headerLeft = headerEl.querySelector('.header-left');
    if (!headerLeft) {
      headerLeft = document.createElement('div');
      headerLeft.className = 'header-left';
      headerEl.prepend(headerLeft);
    }

    const menuIcon = typeof Icons !== 'undefined' ? Icons.create('menu', 20) : '☰';
    headerLeft.innerHTML = `
      <button id="menu-toggle" class="menu-toggle-btn" aria-label="Toggle navigation drawer" title="Toggle Navigation">
        ${menuIcon}
      </button>
      <nav class="breadcrumbs" aria-label="Breadcrumbs">
        ${breadcrumbsHtml}
      </nav>
    `;

    // 2. Ensure right actions section (Theme Toggle, Notifications, User/Logout)
    let headerRight = headerEl.querySelector('.header-right');
    if (!headerRight) {
      headerRight = document.createElement('div');
      headerRight.className = 'header-right';
      headerEl.appendChild(headerRight);
    }

    const bellIcon = typeof Icons !== 'undefined' ? Icons.create('bell', 18) : '🔔';
    const logoutIcon = typeof Icons !== 'undefined' ? Icons.create('log-out', 16) : '🚪';

    headerRight.innerHTML = `
      <button type="button" class="theme-toggle-btn" id="theme-toggle-button" aria-label="Toggle dark/light theme" title="Toggle light/dark theme"></button>
      <a href="notifications.html" class="header-action-btn" title="Notifications" aria-label="View notifications">
        ${bellIcon}
        <span id="notif-bubble" class="notif-bubble" style="display:none;">0</span>
      </a>
      <button type="button" class="btn btn-ghost btn-sm" data-action="logout" title="Sign Out" style="display:inline-flex; align-items:center; gap:6px;">
        ${logoutIcon} <span>Logout</span>
      </button>
    `;

    // 3. Attach Theme Manager listener
    const toggleBtn = headerRight.querySelector('#theme-toggle-button');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (typeof ThemeManager !== 'undefined') {
          ThemeManager.toggle();
        }
      });
    }

    if (typeof ThemeManager !== 'undefined') {
      ThemeManager.updateToggleButtons(ThemeManager.getTheme());
    }

    // 4. Attach Logout listener
    const logoutBtn = headerRight.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out of CampusCare?')) {
          if (typeof auth !== 'undefined' && auth.logout) {
            auth.logout();
          } else {
            window.location.href = 'login.html';
          }
        }
      });
    }

    // 5. Wire up mobile toggle button with Sidebar
    if (typeof Sidebar !== 'undefined' && Sidebar.setupMobileMenu) {
      Sidebar.setupMobileMenu();
    }
  },

  setBreadcrumb(pageName) {
    const refEl = document.getElementById('detail-ref');
    if (refEl) {
      refEl.textContent = pageName;
    }
    const currentEl = document.querySelector('.breadcrumb-current');
    if (currentEl) {
      currentEl.textContent = pageName;
    }
  }
};

// Expose globally
window.Navbar = Navbar;
