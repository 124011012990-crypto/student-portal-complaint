/**
 * CampusCare — Dedicated Sidebar Component & Role Authority Manager
 * File: frontend/assets/js/sidebar.js
 * 
 * Manages:
 * - Dynamic Role Profiles (Student, Faculty, HOD, Officer, Admin, Auditor)
 * - Authority Scopes & Confidentiality / Shield Notices
 * - Authorized Capabilities micro-chips
 * - Grouped Navigation links filtered by RBAC permissions
 * - Sidebar user profile card with role badge and logout action
 * - Mobile responsive drawer toggle and overlay handling
 */
const Sidebar = {
  roleProfiles: {
    student: {
      title: 'Student Portal',
      badgeBg: 'rgba(59, 130, 246, 0.15)',
      badgeColor: '#3b82f6',
      icon: 'user',
      scope: 'Personal Grievances Scope',
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
      scope: 'Assigned Case Desk',
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
      scope: 'Department Triage Desk',
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
  },

  getProfile(user) {
    const role = (user && user.role_slug ? user.role_slug : 'student').toLowerCase();
    const profile = this.roleProfiles[role] || this.roleProfiles.student;
    
    // Dynamic Department Customization
    const dept = user && (user.department_code || user.department_name) ? (user.department_code || user.department_name) : 'Campus';
    const scopeWithDept = role === 'student' ? `${dept} • Personal Grievances` :
                         role === 'faculty' ? `${dept} • Assigned Desk` :
                         role === 'hod' ? `${dept} • Dept Triage Desk` :
                         profile.scope;
    
    return {
      ...profile,
      scope: scopeWithDept
    };
  },

  render(user, activePage = '') {
    const sidebarEl = document.getElementById('app-sidebar');
    if (!sidebarEl || !user) return;

    const profile = this.getProfile(user);

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

    const userInitials = (user.full_name || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

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
            ${userInitials}
          </div>
          <div class="user-details">
            <div class="user-name" title="${user.full_name || ''}">${user.full_name || 'User'}</div>
            <div class="user-role-badge" style="color:${profile.badgeColor}; font-weight:600;">${user.role_name || profile.title}</div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-action="logout" title="Sign out" style="padding:4px 6px;margin-left:auto;" aria-label="Sign out">
            ${logoutIcon}
          </button>
        </div>
      </div>
    `;

    this.setupMobileMenu();
    this.setupLogoutButtons();
  },

  setupMobileMenu() {
    const toggleBtn = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar && overlay && !sidebar.dataset.menuBound) {
      sidebar.dataset.menuBound = 'true';
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
      if (btn.dataset.boundLogout) return;
      btn.dataset.boundLogout = 'true';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out of CampusCare?')) {
          if (typeof auth !== 'undefined' && auth.logout) {
            auth.logout();
          } else {
            window.location.href = 'login.html';
          }
        }
      });
    });
  }
};

// Expose globally
window.Sidebar = Sidebar;
