/**
 * CampusCare Centralized Fetch API Client
 * Manages credentials, sessions, CSRF headers, and error handling
 */
const api = {
  csrfToken: null,

  async getCsrfToken() {
    if (this.csrfToken) return this.csrfToken;
    try {
      const res = await fetch(`${CampusConfig.getApiBaseUrl()}/auth/csrf`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data && data.data && data.data.csrf_token) {
        this.csrfToken = data.data.csrf_token;
        sessionStorage.setItem('campus_csrf_token', this.csrfToken);
        return this.csrfToken;
      }
    } catch (e) {
      console.warn('Could not prefetch CSRF token:', e);
    }
    return sessionStorage.getItem('campus_csrf_token') || '';
  },

  setCsrfToken(token) {
    this.csrfToken = token;
    sessionStorage.setItem('campus_csrf_token', token);
  },

  async request(endpoint, options = {}) {
    const baseUrl = CampusConfig.getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    // If sending JSON body, set Content-Type
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    // Attach CSRF token on mutation requests
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const token = await this.getCsrfToken();
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }

    const config = {
      credentials: 'include', // required for cross-origin or same-site PHP sessions
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Handle 401 Unauthenticated
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          sessionStorage.removeItem('campus_user');
          if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'login.html';
          }
        }

        const errorMsg = data && data.message ? data.message : `Request failed with HTTP ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.errors = data && data.errors ? data.errors : null;
        throw err;
      }

      return data;
    } catch (err) {
      if (!err.status) {
        console.error('Network or CORS error connecting to backend:', err);
      }
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== null && val !== undefined && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString();
    const url = qStr ? `${endpoint}?${qStr}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  },

  postForm(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData
    });
  }
};
