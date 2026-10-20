/**
 * CampusCare Theme Controller
 * Manages Light/Dark theme switching, persistence, OS preference fallback, and smooth transitions
 */

const ThemeManager = {
  STORAGE_KEY: 'campuscare_theme',

  init() {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    this.applyTheme(initialTheme, false);

    // Listen for OS scheme changes if user hasn't explicitly set a preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.applyTheme(e.matches ? 'dark' : 'light', true);
        }
      });
    }
  },

  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  },

  toggle() {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next, true);
    localStorage.setItem(this.STORAGE_KEY, next);
    return next;
  },

  applyTheme(theme, animate = true) {
    if (animate) {
      document.documentElement.classList.add('theme-transitioning');
    }

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;

    this.updateToggleButtons(theme);

    if (animate) {
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);
    }
  },

  updateToggleButtons(theme) {
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(btn => {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-label', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
      btn.setAttribute('title', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
      if (typeof Icons !== 'undefined') {
        btn.innerHTML = isDark ? Icons.create('sun', 18) : Icons.create('moon', 18);
      }
    });
  }
};

// Immediate initialization to prevent flash
ThemeManager.init();
