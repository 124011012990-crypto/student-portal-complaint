/**
 * CampusCare Authentication & RBAC Guard
 * Central client-side authorization and session management
 */
const auth = {
  currentUser: null,

  async getCurrentUser(forceRefresh = false) {
    if (this.currentUser && !forceRefresh) {
      return this.currentUser;
    }

    try {
      const res = await api.get('/auth/me');
      if (res && res.data) {
        this.currentUser = res.data;
        if (this.currentUser.csrf_token) {
          api.setCsrfToken(this.currentUser.csrf_token);
        }
        if (this.currentUser.token) {
          api.setAuthToken(this.currentUser.token);
        }
        sessionStorage.setItem('campus_user', JSON.stringify(this.currentUser));
        return this.currentUser;
      }
    } catch (e) {
      this.currentUser = null;
      sessionStorage.removeItem('campus_user');
      api.setAuthToken(null);
    }
    return null;
  },

  async login(username, password, rememberMe = false) {
    const res = await api.post('/auth/login', { 
      username, 
      password,
      remember_me: !!rememberMe
    });

    if (res && res.data) {
      this.currentUser = res.data;
      if (this.currentUser.csrf_token) {
        api.setCsrfToken(this.currentUser.csrf_token);
      }
      if (this.currentUser.token) {
        api.setAuthToken(this.currentUser.token, !!rememberMe);
      }
      sessionStorage.setItem('campus_user', JSON.stringify(this.currentUser));
      return this.currentUser;
    }
    throw new Error(res && res.message ? res.message : 'Login failed');
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout API failed:', e);
    } finally {
      this.currentUser = null;
      sessionStorage.removeItem('campus_user');
      sessionStorage.removeItem('campus_csrf_token');
      api.setAuthToken(null);
      window.location.href = 'login.html';
    }
  },

  async initiateActivation(rollNumber, email) {
    return await api.post('/auth/activate/initiate', {
      roll_number: rollNumber,
      email: email
    });
  },

  async verifyActivationOtp(rollNumber, email, otp, sessionToken) {
    return await api.post('/auth/activate/verify', {
      roll_number: rollNumber,
      email: email,
      otp: otp,
      session_token: sessionToken
    });
  },

  async completeActivation(rollNumber, email, passwordGrantToken, password, phone = null) {
    return await api.post('/auth/activate/complete', {
      roll_number: rollNumber,
      email: email,
      password_grant_token: passwordGrantToken,
      password: password,
      phone: phone
    });
  },

  async requestPasswordReset(identifier) {
    return await api.post('/auth/forgot-password', {
      identifier: identifier
    });
  },

  async resetPassword(email, otp, newPassword) {
    return await api.post('/auth/reset-password', {
      email: email,
      otp: otp,
      new_password: newPassword
    });
  },

  async requireAuth(allowedRoles = []) {
    const user = await this.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }

    if (allowedRoles.length > 0) {
      const userRole = user.role_slug || '';
      if (!allowedRoles.includes(userRole)) {
        window.location.href = 'access-denied.html';
        return null;
      }
    }

    return user;
  },

  hasRole(role) {
    if (!this.currentUser) return false;
    return this.currentUser.role_slug === role;
  },

  hasPermission(perm) {
    if (!this.currentUser || !this.currentUser.permissions) return false;
    if (this.currentUser.role_slug === 'admin') return true;
    return this.currentUser.permissions.includes(perm);
  }
};
