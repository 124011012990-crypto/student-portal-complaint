/**
 * CampusCare Settings Page Controller
 */
const SettingsController = {
  currentUser: null,

  async init() {
    this.currentUser = await auth.requireAuth();
    if (!this.currentUser) return;

    await app.initLayout('settings');
    this.setupTabs();
    this.populateProfile(this.currentUser);
    this.setupForms();
    this.syncThemeUI();
    this.loadSavedPreferences();

    // Show Admin tab if admin
    if (this.currentUser.role_slug === 'admin') {
      const adminTab = document.getElementById('nav-tab-admin');
      if (adminTab) adminTab.style.display = 'inline-flex';
    }
  },

  setupTabs() {
    const tabBtns = document.querySelectorAll('.settings-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  },

  populateProfile(u) {
    document.getElementById('prof_username').value = u.username || '';
    document.getElementById('prof_email').value = u.email || '';
    document.getElementById('prof_fullname').value = u.full_name || '';
    document.getElementById('prof_phone').value = u.phone || '';
    document.getElementById('prof_department').value = u.department_name ? `${u.department_name} (${u.department_code || ''})` : 'Institutional Wide';
    document.getElementById('prof_role').value = u.role_name || '';
  },

  setupForms() {
    // 1. Profile Update Form
    const profForm = document.getElementById('settings-profile-form');
    if (profForm) {
      profForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('prof_fullname').value.trim();
        const phone = document.getElementById('prof_phone').value.trim();

        if (!fullName) {
          app.showToast('Full name is required.', 'warning');
          return;
        }

        const btn = document.getElementById('btn-save-profile');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
          const res = await api.post('/auth/profile', {
            full_name: fullName,
            phone: phone
          });

          if (res && res.data) {
            this.currentUser = res.data;
            app.showToast('Profile updated successfully!', 'success');
            // Refresh header user name display
            const headerName = document.getElementById('header-user-name');
            if (headerName) headerName.textContent = res.data.full_name;
          }
        } catch (err) {
          app.showToast('Failed to update profile: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<span data-icon="check" data-icon-size="16"></span> Save Profile Changes`;
          if (typeof Icons !== 'undefined') Icons.renderPageIcons();
        }
      });
    }

    // 2. Password Change Form
    const pwdForm = document.getElementById('settings-password-form');
    if (pwdForm) {
      pwdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('pwd_current').value;
        const newPassword = document.getElementById('pwd_new').value;
        const confirmPassword = document.getElementById('pwd_confirm').value;

        if (newPassword !== confirmPassword) {
          app.showToast('New passwords do not match. Please verify.', 'error');
          return;
        }

        if (newPassword.length < 8) {
          app.showToast('New password must be at least 8 characters long.', 'warning');
          return;
        }

        const btn = document.getElementById('btn-save-password');
        btn.disabled = true;
        btn.textContent = 'Updating...';

        try {
          await api.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword
          });

          app.showToast('Password changed successfully! Keep your credentials secure.', 'success');
          pwdForm.reset();
        } catch (err) {
          app.showToast('Password update failed: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<span data-icon="lock" data-icon-size="16"></span> Update Password`;
          if (typeof Icons !== 'undefined') Icons.renderPageIcons();
        }
      });
    }
  },

  syncThemeUI() {
    const currentTheme = ThemeManager.getTheme();
    document.querySelectorAll('.theme-card-option').forEach(card => card.classList.remove('selected'));
    const activeCard = document.getElementById(`theme-card-${currentTheme}`);
    if (activeCard) activeCard.classList.add('selected');
  },

  setTheme(theme) {
    ThemeManager.applyTheme(theme, true);
    localStorage.setItem(ThemeManager.STORAGE_KEY, theme);
    this.syncThemeUI();
    app.showToast(`Switched to ${theme.toUpperCase()} theme`, 'info');
  },

  loadSavedPreferences() {
    try {
      const prefs = JSON.parse(localStorage.getItem('campuscare_notif_prefs') || '{}');
      if (typeof prefs.inapp !== 'undefined') document.getElementById('notif-inapp').checked = prefs.inapp;
      if (typeof prefs.email !== 'undefined') document.getElementById('notif-email').checked = prefs.email;
      if (typeof prefs.privacy !== 'undefined') document.getElementById('notif-privacy').checked = prefs.privacy;

      const adminSLA = JSON.parse(localStorage.getItem('campuscare_admin_sla') || '{}');
      if (adminSLA.days) document.getElementById('admin_sla_days').value = adminSLA.days;
      if (adminSLA.hours) document.getElementById('admin_escalation_hours').value = adminSLA.hours;
    } catch (e) {
      // default fallbacks
    }
  },

  saveNotifications() {
    const prefs = {
      inapp: document.getElementById('notif-inapp').checked,
      email: document.getElementById('notif-email').checked,
      privacy: document.getElementById('notif-privacy').checked
    };
    localStorage.setItem('campuscare_notif_prefs', JSON.stringify(prefs));
    app.showToast('Notification preferences saved successfully.', 'success');
  },

  saveAdminConfig() {
    const slaDays = document.getElementById('admin_sla_days').value;
    const hours = document.getElementById('admin_escalation_hours').value;
    localStorage.setItem('campuscare_admin_sla', JSON.stringify({ days: slaDays, hours: hours }));
    app.showToast(`Institutional SLA policy updated: ${slaDays} days default SLA, ${hours}h escalation window.`, 'success');
  }
};
