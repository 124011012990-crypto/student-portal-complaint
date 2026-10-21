/**
 * CampusCare Central Configuration
 * Auto-detects runtime environment (XAMPP / PHP dev server / Docker)
 */
const CampusConfig = {
  // Production backend API URL (Render deployment)
  API_PRODUCTION_URL: 'https://student-portal-complaint.onrender.com/api',

  // Dynamically detect base API path
  getApiBaseUrl() {
    // If user explicitly configured an origin via window.CAMPUS_API_BASE
    if (window.CAMPUS_API_BASE) {
      return window.CAMPUS_API_BASE;
    }

    const host = window.location.hostname;
    const port = window.location.port;
    const pathname = window.location.pathname;

    // If running under XAMPP / Apache with project subfolder locally
    if (pathname.includes('/frontend/')) {
      const projectRoot = pathname.substring(0, pathname.indexOf('/frontend/'));
      return `${projectRoot}/backend/public/api`;
    }

    // If running locally with frontend on port 8080 and backend on 8000
    if (port === '8080') {
      return `http://${host}:8000/api`;
    }

    // If running locally on localhost or 127.0.0.1
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }

    // When hosted on Vercel or production domain, route requests to Render backend
    return this.API_PRODUCTION_URL;
  },

  // Portal metadata
  APP_NAME: 'CampusCare',
  VERSION: '2.4.0',
  INSTITUTION_NAME: 'National Institute of Engineering & Technology'
};
