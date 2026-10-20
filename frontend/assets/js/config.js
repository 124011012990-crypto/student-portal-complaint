/**
 * CampusCare Central Configuration
 * Auto-detects runtime environment (XAMPP / PHP dev server / Docker)
 */
const CampusConfig = {
  // Dynamically detect base API path
  getApiBaseUrl() {
    // If user explicitly configured an origin via window.CAMPUS_API_BASE
    if (window.CAMPUS_API_BASE) {
      return window.CAMPUS_API_BASE;
    }

    const host = window.location.hostname;
    const port = window.location.port;
    const pathname = window.location.pathname;

    // If running under XAMPP / Apache with project subfolder
    if (pathname.includes('/frontend/')) {
      // Subdirectory deployment
      const projectRoot = pathname.substring(0, pathname.indexOf('/frontend/'));
      return `${projectRoot}/backend/public/api`;
    }

    // If running with frontend on port 8080 and backend on 8000
    if (port === '8080') {
      return `http://${host}:8000/api`;
    }

    // Default standard relative path
    return '/api';
  },

  // Portal metadata
  APP_NAME: 'CampusCare',
  VERSION: '2.4.0',
  INSTITUTION_NAME: 'National Institute of Engineering & Technology'
};
