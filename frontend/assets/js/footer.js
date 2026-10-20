/**
 * CampusCare — Dedicated Footer Component
 * File: frontend/assets/js/footer.js
 * 
 * Manages:
 * - Live Operational Status Pulse Indicator
 * - Institutional Grievance Redressal Branding
 * - Dynamic Copyright Year Generation
 * - Quick Institutional Links (Settings, SLA Metrics, Helpdesk)
 * - Semantic System Version Tag (v2.4.0)
 */
const Footer = {
  version: 'v2.4.0',

  render() {
    const mainEl = document.querySelector('.app-main');
    if (!mainEl) return;

    // Prevent duplicate rendering
    let footerEl = mainEl.querySelector('.app-footer');
    if (!footerEl) {
      footerEl = document.createElement('footer');
      footerEl.className = 'app-footer';
      footerEl.id = 'app-footer';
      mainEl.appendChild(footerEl);
    }

    const currentYear = new Date().getFullYear();

    footerEl.innerHTML = `
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
        <span class="badge" style="font-size:0.65rem; background:var(--color-surface-hover); border:1px solid var(--color-border); color:var(--color-text-muted);">${this.version}</span>
      </div>
    `;
  }
};

// Expose globally
window.Footer = Footer;
