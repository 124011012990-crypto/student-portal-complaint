/**
 * CampusCare Global UI Controller
 * Renders dynamic role navigation, grouped sidebar, headers with theme toggle, toasts, and unified footer
 */
const app = {
  async initLayout(activePage = '') {
    const user = await auth.getCurrentUser();
    if (!user) return;

    // 1. Render Dedicated Sidebar Component
    if (typeof Sidebar !== 'undefined') {
      Sidebar.render(user, activePage);
    } else {
      this.renderSidebar(user, activePage);
    }

    // 2. Render Dedicated Top Navbar Component
    if (typeof Navbar !== 'undefined') {
      Navbar.render(user, activePage);
    } else {
      this.renderHeader(user);
    }

    // 3. Render Dedicated Footer Component
    if (typeof Footer !== 'undefined') {
      Footer.render();
    } else {
      this.renderFooter();
    }

    this.setupMobileMenu();
    this.setupLogoutButtons();
    notifications.loadBadge();

    if (typeof ThemeManager !== 'undefined') {
      ThemeManager.updateToggleButtons(ThemeManager.getTheme());
    }

    if (typeof Icons !== 'undefined') {
      Icons.renderPageIcons();
    }
  },

  renderSidebar(user, activePage) {
    if (typeof Sidebar !== 'undefined') {
      Sidebar.render(user, activePage);
      return;
    }
    const sidebarEl = document.getElementById('app-sidebar');
    if (!sidebarEl) return;

    const role = (user.role_slug || 'student').toLowerCase();

    // Institutional role profiles & permission configurations
    const roleProfiles = {
      student: {
        title: 'Student Portal',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeColor: '#3b82f6',
        icon: 'user',
        scope: `${user.department_code || 'NIET'} • Personal Grievances`,
        shieldNotice: 'Staff Identity Shielded',
        perms: ['Submit Cases', 'Track Own', 'Feedback', 'Comments'],
        navGroups: [
          {
            title: 'Overview',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', url: 'dashboard.html' }
            ]
          },
          {
            title: 'Student Grievances',
            items: [
              { id: 'submit', label: 'File Grievance', icon: 'file-plus', url: 'submit-complaint.html' },
              { id: 'my-complaints', label: 'My Grievances', icon: 'folder', url: 'my-complaints.html' }
            ]
          },
          {
            title: 'Account & System',
            items: [
              { id: 'notifications', label: 'Notifications', icon: 'bell', url: 'notifications.html' },
              { id: 'profile', label: 'My Profile', icon: 'user', url: 'profile.html' },
              { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
            ]
          }
        ]
      },
      faculty: {
        title: 'Faculty / Staff',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#10b981',
        icon: 'users',
        scope: `${user.department_name || 'Academic Unit'} • Assigned Desk`,
        shieldNotice: 'Assigned Cases Scope',
        perms: ['Assigned Queue', 'Status Updates', 'Public Responses'],
        navGroups: [
          {
            title: 'Overview',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', url: 'dashboard.html' }
            ]
          },
          {
            title: 'Case Workdesk',
            items: [
              { id: 'complaints', label: 'My Assigned Cases', icon: 'clipboard-list', url: 'complaints.html' }
            ]
          },
          {
            title: 'Account & System',
            items: [
              { id: 'notifications', label: 'Notifications', icon: 'bell', url: 'notifications.html' },
              { id: 'profile', label: 'My Profile', icon: 'user', url: 'profile.html' },
              { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
            ]
          }
        ]
      },
      hod: {
        title: 'Department HOD',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
        badgeColor: '#8b5cf6',
        icon: 'clipboard-list',
        scope: `${user.department_name || 'Department'} • Triage Desk`,
        shieldNotice: 'Dept Governance Authority',
        perms: ['Dept Cases', 'Assign Faculty', 'Internal Notes', 'Dept Reports'],
        navGroups: [
          {
            title: 'Overview',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', url: 'dashboard.html' }
            ]
          },
          {
            title: 'Department Triage',
            items: [
              { id: 'complaints', label: 'Department Cases', icon: 'clipboard-list', url: 'complaints.html' }
            ]
          },
          {
            title: 'Analytics & SLA',
            items: [
              { id: 'reports', label: 'Department Reports', icon: 'bar-chart-2', url: 'reports.html' }
            ]
          },
          {
            title: 'Account & System',
            items: [
              { id: 'notifications', label: 'Notifications', icon: 'bell', url: 'notifications.html' },
              { id: 'profile', label: 'My Profile', icon: 'user', url: 'profile.html' },
              { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
            ]
          }
        ]
      },
      officer: {
        title: 'Grievance Officer',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#f59e0b',
        icon: 'shield',
        scope: 'Campus Redressal Authority',
        shieldNotice: 'Standard + Confidential Authority',
        perms: ['Campus Intake', 'Assign Staff', 'Resolution Closure', 'SLA Reports'],
        navGroups: [
          {
            title: 'Overview',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', url: 'dashboard.html' }
            ]
          },
          {
            title: 'Grievance Cell',
            items: [
              { id: 'complaints', label: 'Campus Intake & Cases', icon: 'clipboard-list', url: 'complaints.html' }
            ]
          },
          {
            title: 'Governance & Analytics',
            items: [
              { id: 'reports', label: 'Analytics & Reports', icon: 'bar-chart-2', url: 'reports.html' },
              { id: 'roles', label: 'Roles & Privileges', icon: 'shield', url: 'roles.html' }
            ]
          },
          {
            title: 'Account & System',
            items: [
              { id: 'notifications', label: 'Notifications', icon: 'bell', url: 'notifications.html' },
              { id: 'profile', label: 'My Profile', icon: 'user', url: 'profile.html' },
              { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
            ]
          }
        ]
      },
      admin: {
        title: 'System Admin',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeColor: '#ef4444',
        icon: 'settings',
        scope: 'Full Institutional Governance',
        shieldNotice: 'Full Administrative Access',
        perms: ['Manage Users', 'RBAC Matrix', 'All Cases', 'Audit Logs', 'Purge Cases'],
        navGroups: [
          {
            title: 'Overview',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', url: 'dashboard.html' }
            ]
          },
          {
            title: 'Grievance Oversight',
            items: [
              { id: 'submit', label: 'Submit Grievance', icon: 'file-plus', url: 'submit-complaint.html' },
              { id: 'complaints', label: 'All Grievances', icon: 'clipboard-list', url: 'complaints.html' }
            ]
          },
          {
            title: 'System Governance',
            items: [
              { id: 'users', label: 'User Directory', icon: 'users', url: 'users.html' },
              { id: 'roles', label: 'Roles & Privileges', icon: 'shield', url: 'roles.html' },
              { id: 'reports', label: 'Analytics & Reports', icon: 'bar-chart-2', url: 'reports.html' },
              { id: 'audit-logs', label: 'Security Audit Logs', icon: 'file-text', url: 'audit-logs.html' }
            ]
          },
          {
            title: 'Account & System',
            items: [
              { id: 'notifications', label: 'Notifications', icon: 'bell', url: 'notifications.html' },
              { id: 'profile', label: 'My Profile', icon: 'user', url: 'profile.html' },
              { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
            ]
          }
        ]
      },
      auditor: {
        title: 'Quality Auditor',
        badgeBg: 'rgba(100, 116, 139, 0.15)',
        badgeColor: '#64748b',
        icon: 'file-text',
        scope: 'Statutory Compliance Audit',
        shieldNotice: 'Read-Only Compliance Mode',
        perms: ['Compliance Analytics', 'Inspect Audit Trails', 'Inspect Public Cases'],
        navGroups: [
          {
            title: 'Overview',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', url: 'dashboard.html' }
            ]
          },
          {
            title: 'Audit & Records',
            items: [
              { id: 'complaints', label: 'All Grievances', icon: 'clipboard-list', url: 'complaints.html' }
            ]
          },
          {
            title: 'Statutory Compliance',
            items: [
              { id: 'reports', label: 'Analytics & Reports', icon: 'bar-chart-2', url: 'reports.html' },
              { id: 'audit-logs', label: 'Security Audit Logs', icon: 'file-text', url: 'audit-logs.html' },
              { id: 'roles', label: 'Roles & Privileges', icon: 'shield', url: 'roles.html' }
            ]
          },
          {
            title: 'Account & System',
            items: [
              { id: 'notifications', label: 'Notifications', icon: 'bell', url: 'notifications.html' },
              { id: 'profile', label: 'My Profile', icon: 'user', url: 'profile.html' },
              { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
            ]
          }
        ]
      }
    };

    const profile = roleProfiles[role] || roleProfiles.student;

    let groupsHtml = '';
    profile.navGroups.forEach(group => {
      const linksHtml = group.items.map(item => {
        const iconSvg = typeof Icons !== 'undefined' ? Icons.create(item.icon, 18) : '';
        const isActive = activePage === item.id ? 'active' : '';
        return `
          <a href="${item.url}" class="nav-link ${isActive}" id="nav-item-${item.id}">
            <span class="nav-icon">${iconSvg}</span>
            <span>${item.label}</span>
          </a>
        `;
      }).join('');

      groupsHtml += `
        <div class="nav-group">
          <div class="nav-group-title">${group.title}</div>
          ${linksHtml}
        </div>
      `;
    });

    const logoutIcon = typeof Icons !== 'undefined' ? Icons.create('log-out', 16) : '';
    const roleIconSvg = typeof Icons !== 'undefined' ? Icons.create(profile.icon, 14) : '';

    const permChipsHtml = profile.perms.map(p => `
      <span class="sidebar-perm-chip">${p}</span>
    `).join('');

    sidebarEl.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-icon">CC</div>
        <div class="brand-text">
          <h1>CampusCare</h1>
          <p>${user.department_code || 'NIET'} PORTAL</p>
        </div>
      </div>

      <!-- Prominent Role & Authority Info Box -->
      <div class="sidebar-role-panel">
        <div class="sidebar-role-header">
          <span class="sidebar-role-badge" style="background:${profile.badgeBg}; color:${profile.badgeColor};">
            ${roleIconSvg} ${profile.title}
          </span>
          <span style="font-size:0.65rem; color:var(--color-success-text); font-weight:700;">ACTIVE</span>
        </div>
        <div class="sidebar-role-scope" title="${profile.scope}">
          ${profile.scope}
        </div>
        <div style="font-size:0.68rem; color:var(--color-text-light); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px; font-weight:600;">
          Authorized Capabilities
        </div>
        <div class="sidebar-perm-chips">
          ${permChipsHtml}
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Main Navigation">
        ${groupsHtml}
      </nav>

      <div class="sidebar-footer">
        <div class="user-mini-card">
          <div class="user-avatar" style="background:linear-gradient(135deg, ${profile.badgeColor} 0%, var(--color-primary) 100%);">
            ${this.getInitials(user.full_name)}
          </div>
          <div class="user-details">
            <div class="user-name" title="${user.full_name}">${user.full_name}</div>
            <div class="user-role-badge" style="color:${profile.badgeColor}; font-weight:600;">${user.role_name}</div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-action="logout" title="Sign out" style="padding:4px 6px;margin-left:auto;" aria-label="Sign out">
            ${logoutIcon}
          </button>
        </div>
      </div>
    `;
  },

  renderHeader(user, activePage) {
    if (typeof Navbar !== 'undefined') {
      Navbar.render(user, activePage);
      return;
    }
    const userDisplay = document.getElementById('header-user-name');
    if (userDisplay) {
      userDisplay.textContent = user.full_name;
    }

    const headerRight = document.querySelector('.header-right');
    if (headerRight && !headerRight.querySelector('.theme-toggle-btn')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'theme-toggle-btn';
      toggleBtn.id = 'theme-toggle-button';
      toggleBtn.setAttribute('aria-label', 'Toggle light/dark theme');
      toggleBtn.setAttribute('title', 'Toggle light/dark theme');
      toggleBtn.addEventListener('click', () => {
        if (typeof ThemeManager !== 'undefined') {
          ThemeManager.toggle();
        }
      });

      // Insert before notification or user avatar if present
      headerRight.insertBefore(toggleBtn, headerRight.firstChild);
    }
  },

  renderFooter() {
    if (typeof Footer !== 'undefined') {
      Footer.render();
      return;
    }
    const mainEl = document.querySelector('.app-main');
    if (!mainEl || mainEl.querySelector('.app-footer')) return;

    const currentYear = new Date().getFullYear();
    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.innerHTML = `
      <div class="app-footer-left">
        <div class="footer-brand-badge">
          <span class="system-status-indicator" title="System Operational"></span>
          <strong style="color:var(--color-text-main);">CampusCare</strong>
        </div>
        <span class="footer-divider">•</span>
        <span class="footer-desc">College Grievance Redressal Portal</span>
        <span class="footer-divider">•</span>
        <span class="footer-copy">&copy; ${currentYear} All rights reserved.</span>
      </div>
      <div class="app-footer-right">
        <a href="settings.html" class="app-footer-link">Settings</a>
        <a href="reports.html" class="app-footer-link">SLA Metrics</a>
        <a href="notifications.html" class="app-footer-link">Helpdesk</a>
        <span class="badge" style="font-size:0.65rem; background:var(--color-surface-hover); border:1px solid var(--color-border); color:var(--color-text-muted);">v2.4.0</span>
      </div>
    `;
    mainEl.appendChild(footer);
  },

  setupMobileMenu() {
    const toggleBtn = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }
  },

  setupLogoutButtons() {
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out of CampusCare?')) {
          auth.logout();
        }
      });
    });
  },

  getInitials(name = '') {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatDateShort(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  getStatusBadge(status) {
    const slug = (status || '').toLowerCase().replace(/\s+/g, '-');
    return `<span class="badge badge-${slug}">${status}</span>`;
  },

  getPriorityBadge(priority) {
    const slug = (priority || 'medium').toLowerCase();
    return `<span class="badge badge-priority-${slug}">${priority}</span>`;
  },

  getConfidentialityBadge(level) {
    const lockIcon = typeof Icons !== 'undefined' ? Icons.create('lock', 12) : '';
    const userIcon = typeof Icons !== 'undefined' ? Icons.create('user', 12) : '';

    if (level === 'Confidential') {
      return `<span class="badge badge-confidential">${lockIcon} Confidential</span>`;
    }
    if (level === 'Anonymous') {
      return `<span class="badge badge-anonymous">${userIcon} Anonymous</span>`;
    }
    return `<span class="badge badge-priority-low">Standard</span>`;
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (typeof Icons !== 'undefined') {
      const iconMap = {
        success: 'check-circle-2',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
      };
      iconSvg = Icons.create(iconMap[type] || 'info', 20);
    }

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 1000);
  }
};
