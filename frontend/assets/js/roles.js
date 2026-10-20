/**
 * CampusCare Role-Based Access Control (RBAC) & Permission Manager
 */
const rolesManager = {
  roles: [],
  permissions: [],
  rolePermissions: {},
  selectedRoleId: null,
  currentUser: null,

  async init() {
    this.currentUser = await auth.requireAuth(['admin', 'auditor']);
    if (!this.currentUser) return;

    await app.initLayout('roles');
    await this.loadPermissionsMatrix();
  },

  async loadPermissionsMatrix() {
    const container = document.getElementById('rbac-manager-container');
    try {
      if (container) {
        container.innerHTML = `
          <div style="padding: 2.5rem; text-align: center; color: var(--color-text-muted);">
            <div class="spinner" style="margin: 0 auto 1rem;"></div>
            <p>Loading authoritative RBAC matrix from server...</p>
          </div>
        `;
      }

      const res = await api.get('/admin/roles/permissions');
      if (res && res.data) {
        this.roles = res.data.roles || [];
        this.permissions = res.data.permissions || [];
        this.rolePermissions = res.data.role_permissions || {};

        if (!this.selectedRoleId && this.roles.length > 0) {
          // Default to Student or first role
          const studentRole = this.roles.find(r => r.slug === 'student');
          this.selectedRoleId = studentRole ? studentRole.id : this.roles[0].id;
        }

        this.renderRoleTabs();
        this.renderPermissionsEditor();
        this.renderLiveCapabilityTable();
      }
    } catch (err) {
      if (container) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 2rem;">
            <div class="empty-icon"><span data-icon="alert-circle" data-icon-size="36"></span></div>
            <h4 class="empty-title">Failed to load permissions</h4>
            <p class="empty-desc">${err.message || 'Unable to retrieve RBAC matrix'}</p>
            <button class="btn btn-secondary btn-sm" onclick="rolesManager.loadPermissionsMatrix()">Retry</button>
          </div>
        `;
        if (typeof Icons !== 'undefined') Icons.renderPageIcons();
      }
      app.showToast('Failed to load permissions matrix: ' + err.message, 'error');
    }
  },

  renderRoleTabs() {
    const tabsContainer = document.getElementById('role-tabs-container');
    if (!tabsContainer) return;

    const roleColors = {
      student: '#3b82f6',
      faculty: '#10b981',
      hod: '#8b5cf6',
      officer: '#f59e0b',
      admin: '#ef4444',
      auditor: '#64748b'
    };

    const roleIcons = {
      student: 'user',
      faculty: 'users',
      hod: 'clipboard-list',
      officer: 'shield',
      admin: 'settings',
      auditor: 'file-text'
    };

    tabsContainer.innerHTML = this.roles.map(r => {
      const isSelected = r.id === this.selectedRoleId;
      const color = roleColors[r.slug] || 'var(--color-primary)';
      const icon = roleIcons[r.slug] || 'user';
      const assignedCount = (this.rolePermissions[r.id] || []).length;

      return `
        <button 
          type="button" 
          class="role-tab-btn ${isSelected ? 'active' : ''}" 
          style="
            display: flex; 
            align-items: center; 
            gap: 8px; 
            padding: 0.65rem 1.1rem; 
            border-radius: var(--radius-md); 
            font-size: var(--font-size-sm); 
            font-weight: var(--font-weight-medium); 
            border: 1px solid ${isSelected ? color : 'var(--color-border)'}; 
            background: ${isSelected ? (color + '15') : 'var(--color-surface)'}; 
            color: ${isSelected ? (color) : 'var(--color-text-main)'}; 
            cursor: pointer; 
            transition: all var(--transition-fast);
          "
          onclick="rolesManager.selectRole(${r.id})"
        >
          <span data-icon="${icon}" data-icon-size="16" style="color:${color};"></span>
          <span>${r.name}</span>
          <span class="badge" style="
            background: ${isSelected ? color : 'var(--color-surface-hover)'}; 
            color: ${isSelected ? '#ffffff' : 'var(--color-text-muted)'}; 
            font-size: 0.7rem; 
            padding: 1px 6px; 
            border-radius: var(--radius-full);
          ">${assignedCount}</span>
        </button>
      `;
    }).join('');

    if (typeof Icons !== 'undefined') Icons.renderPageIcons();
  },

  selectRole(roleId) {
    this.selectedRoleId = parseInt(roleId, 10);
    this.renderRoleTabs();
    this.renderPermissionsEditor();
  },

  renderPermissionsEditor() {
    const editorContainer = document.getElementById('rbac-manager-container');
    if (!editorContainer) return;

    const currentRole = this.roles.find(r => r.id === this.selectedRoleId);
    if (!currentRole) return;

    const isAdmin = this.currentUser && this.currentUser.role_slug === 'admin';
    const assignedPermIds = new Set(this.rolePermissions[this.selectedRoleId] || []);

    // Group permissions by module
    const modules = {};
    this.permissions.forEach(p => {
      const mod = p.module || 'general';
      if (!modules[mod]) modules[mod] = [];
      modules[mod].push(p);
    });

    const moduleTitles = {
      complaints: 'Grievance Lifecycle & Case Operations',
      comments: 'Notes, Discussions & Collaboration',
      reports: 'Analytics, Metrics & CSV Exports',
      audit: 'Audit Trails & System Compliance',
      users: 'User Directory & Account Controls',
      system: 'Platform Settings & Governance'
    };

    const moduleIcons = {
      complaints: 'clipboard-list',
      comments: 'message',
      reports: 'bar-chart-2',
      audit: 'shield',
      users: 'users',
      system: 'settings'
    };

    let modulesHtml = '';
    for (const [modKey, perms] of Object.entries(modules)) {
      const title = moduleTitles[modKey] || (modKey.charAt(0).toUpperCase() + modKey.slice(1));
      const icon = moduleIcons[modKey] || 'folder';
      
      const permsList = perms.map(p => {
        const isChecked = assignedPermIds.has(p.id);
        return `
          <label 
            style="
              display: flex; 
              align-items: flex-start; 
              gap: 12px; 
              padding: 0.75rem 1rem; 
              border: 1px solid ${isChecked ? 'var(--color-primary-light)' : 'var(--color-border)'}; 
              border-radius: var(--radius-md); 
              background: ${isChecked ? 'rgba(59, 130, 246, 0.04)' : 'var(--color-surface)'}; 
              cursor: ${isAdmin ? 'pointer' : 'default'}; 
              transition: all var(--transition-fast);
            "
          >
            <input 
              type="checkbox" 
              name="role_perm_${this.selectedRoleId}" 
              value="${p.id}" 
              ${isChecked ? 'checked' : ''} 
              ${!isAdmin ? 'disabled' : ''}
              style="margin-top: 3px; accent-color: var(--color-primary); width: 16px; height: 16px;"
              onchange="rolesManager.onPermToggle(${p.id}, this.checked)"
            >
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span style="font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); color: var(--color-text-main);">${p.name}</span>
                <code style="font-size: 0.72rem; padding: 1px 6px; background: var(--color-surface-hover); border-radius: 4px; color: var(--color-text-muted); font-family: var(--font-mono);">${p.slug}</code>
              </div>
              <p style="font-size: 0.78rem; color: var(--color-text-muted); margin: 3px 0 0; line-height: 1.4;">${p.description || 'Allow this role to perform this action.'}</p>
            </div>
          </label>
        `;
      }).join('');

      modulesHtml += `
        <div style="margin-bottom: var(--space-6); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span data-icon="${icon}" data-icon-size="18" style="color: var(--color-primary);"></span>
              <h4 style="font-size: 0.95rem; font-weight: var(--font-weight-bold); margin: 0; color: var(--color-text-main);">${title}</h4>
              <span class="badge" style="font-size: 0.7rem; background: var(--color-surface-hover); color: var(--color-text-muted);">${perms.length} capabilities</span>
            </div>
            ${isAdmin ? `
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="rolesManager.toggleModulePerms('${modKey}', true)">Grant All</button>
                <button type="button" class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="rolesManager.toggleModulePerms('${modKey}', false)">Revoke All</button>
              </div>
            ` : ''}
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-3);">
            ${permsList}
          </div>
        </div>
      `;
    }

    editorContainer.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-8); border-top: 4px solid var(--color-primary);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-6); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="badge" style="background: var(--color-primary-light); color: var(--color-primary); font-size: 0.8rem; font-weight: 700;">Role: ${currentRole.name}</span>
              ${!isAdmin ? `
                <span class="badge badge-warning" style="font-size: 0.75rem;">
                  <span data-icon="lock" data-icon-size="12"></span> Read-Only Compliance View (Auditor)
                </span>
              ` : `
                <span class="badge badge-success" style="font-size: 0.75rem;">
                  <span data-icon="check-circle-2" data-icon-size="12"></span> Active Permissions Editor
                </span>
              `}
            </div>
            <p style="font-size: 0.88rem; color: var(--color-text-muted); margin: 0; line-height: 1.5;">${currentRole.description || 'Configured system access permissions and capability boundaries.'}</p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${isAdmin ? `
              <button type="button" class="btn btn-ghost btn-sm" onclick="rolesManager.resetToOriginal()">
                <span data-icon="refresh-cw" data-icon-size="14"></span> Reset
              </button>
              <button type="button" id="save-permissions-btn" class="btn btn-primary" onclick="rolesManager.savePermissions()">
                <span data-icon="check" data-icon-size="16"></span> Save Role Permissions
              </button>
            ` : `
              <span style="font-size: 0.8rem; color: var(--color-text-muted);">Contact System Administrator to grant or revoke capabilities.</span>
            `}
          </div>
        </div>

        <div>
          ${modulesHtml}
        </div>
      </div>
    `;

    if (typeof Icons !== 'undefined') Icons.renderPageIcons();
  },

  onPermToggle(permId, isChecked) {
    if (!this.rolePermissions[this.selectedRoleId]) {
      this.rolePermissions[this.selectedRoleId] = [];
    }
    
    let list = this.rolePermissions[this.selectedRoleId];
    if (isChecked) {
      if (!list.includes(permId)) list.push(permId);
    } else {
      list = list.filter(id => id !== permId);
    }
    this.rolePermissions[this.selectedRoleId] = list;

    this.renderRoleTabs();
    this.renderLiveCapabilityTable();
  },

  toggleModulePerms(modKey, enable) {
    const modPerms = this.permissions.filter(p => p.module === modKey).map(p => p.id);
    let currentList = this.rolePermissions[this.selectedRoleId] || [];

    if (enable) {
      modPerms.forEach(id => {
        if (!currentList.includes(id)) currentList.push(id);
      });
    } else {
      currentList = currentList.filter(id => !modPerms.includes(id));
    }

    this.rolePermissions[this.selectedRoleId] = currentList;
    this.renderPermissionsEditor();
    this.renderRoleTabs();
    this.renderLiveCapabilityTable();
  },

  async resetToOriginal() {
    await this.loadPermissionsMatrix();
    app.showToast('Reset permissions to server state.', 'info');
  },

  async savePermissions() {
    const saveBtn = document.getElementById('save-permissions-btn');
    const currentRole = this.roles.find(r => r.id === this.selectedRoleId);
    if (!currentRole) return;

    const assignedIds = this.rolePermissions[this.selectedRoleId] || [];

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; margin-right:6px;"></span> Saving...';
    }

    try {
      const res = await api.post(`/admin/roles/${this.selectedRoleId}/permissions`, {
        permission_ids: assignedIds
      });

      app.showToast(`Permissions for ${currentRole.name} updated successfully!`, 'success');
      await this.loadPermissionsMatrix();
    } catch (err) {
      app.showToast('Failed to save permissions: ' + err.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span data-icon="check" data-icon-size="16"></span> Save Role Permissions';
        if (typeof Icons !== 'undefined') Icons.renderPageIcons();
      }
    }
  },

  renderLiveCapabilityTable() {
    const tableBody = document.getElementById('live-capabilities-tbody');
    if (!tableBody) return;

    if (!this.permissions || this.permissions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">No permissions available.</td></tr>';
      return;
    }

    // Map role slug to role object
    const roleBySlug = {};
    this.roles.forEach(r => { roleBySlug[r.slug] = r; });

    const orderSlugs = ['student', 'faculty', 'hod', 'officer', 'admin', 'auditor'];

    tableBody.innerHTML = this.permissions.map(p => {
      const cells = orderSlugs.map(slug => {
        const role = roleBySlug[slug];
        if (!role) return '<td style="text-align:center; color:var(--color-text-light);">&minus;</td>';

        const assigned = (this.rolePermissions[role.id] || []).includes(p.id);
        if (assigned) {
          return `<td style="text-align:center;"><span class="badge badge-resolved" style="padding:2px 8px; font-size:0.75rem;">Allowed</span></td>`;
        } else {
          return `<td style="text-align:center; color:var(--color-text-light); font-size:1rem;">&minus;</td>`;
        }
      }).join('');

      return `
        <tr>
          <td>
            <div style="font-weight:var(--font-weight-medium); color:var(--color-text-main); font-size:0.875rem;">${p.name}</div>
            <div style="font-size:0.72rem; color:var(--color-text-muted); font-family:var(--font-mono);">${p.slug}</div>
          </td>
          ${cells}
        </tr>
      `;
    }).join('');
  }
};
