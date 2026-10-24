/**
 * CampusCare Central Configuration
 * Auto-detects runtime environment (Localhost / start.bat / XAMPP / Docker / Vercel / Render)
 */
const CampusConfig = {
  // Production backend API URL (Render cloud deployment)
  API_PRODUCTION_URL: 'https://student-portal-complaint.onrender.com/api',

  // Dynamically detect base API path for both local development and cloud production
  getApiBaseUrl() {
    // 1. Explicit override via window variable or persistent localStorage
    if (window.CAMPUS_API_BASE) {
      return window.CAMPUS_API_BASE;
    }
    const storedApi = localStorage.getItem('campus_api_base');
    if (storedApi) {
      return storedApi;
    }

    const host = window.location.hostname || 'localhost';
    const port = window.location.port;
    const pathname = window.location.pathname;

    // 2. XAMPP / Apache with project subfolder (e.g., http://localhost/Student_portal_complaint/frontend/...)
    if (pathname.includes('/frontend/')) {
      const projectRoot = pathname.substring(0, pathname.indexOf('/frontend/'));
      return `${projectRoot}/backend/public/api`;
    }

    // 3. Localhost / Local LAN IP detection
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '';
    const isLocalLan = /^192\.168\.\d+\.\d+$/.test(host) || /^10\.\d+\.\d+\.\d+$/.test(host) || host.endsWith('.local');

    if (isLocalhost || isLocalLan) {
      // If served via start.bat unified dev-router on port 8000, use relative /api
      if (port === '8000') {
        return '/api';
      }
      // If frontend is running on a different local port (e.g., 8080 Docker, 5500 Live Server, 3000, 5173),
      // point directly to the PHP backend running on port 8000
      if (port && port !== '80' && port !== '443') {
        return `http://${host}:8000/api`;
      }
      // Standard local web root (port 80 / 443)
      return '/api';
    }

    // 4. Same-origin cloud deployment (e.g. Render/Docker hosting both frontend and backend)
    if (host.includes('onrender.com') || host.includes('render.com')) {
      return '/api';
    }

    // 5. Cloud deployment (Vercel, Netlify, GitHub Pages, or external custom domain)
    // Requests route to the live Render backend API
    return this.API_PRODUCTION_URL;
  },

  // Portal metadata
  APP_NAME: 'CampusCare',
  VERSION: '2.4.0',
  INSTITUTION_NAME: 'National Institute of Engineering & Technology'
};
