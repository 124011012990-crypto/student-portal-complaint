/**
 * CampusCare In-App Notifications Manager
 */
const notifications = {
  async loadBadge() {
    try {
      const res = await api.get('/notifications', { limit: 5 });
      if (res && res.data) {
        const unreadCount = res.data.unread_count || 0;
        const bubble = document.getElementById('notif-bubble');
        if (bubble) {
          if (unreadCount > 0) {
            bubble.textContent = unreadCount > 99 ? '99+' : unreadCount;
            bubble.style.display = 'flex';
          } else {
            bubble.style.display = 'none';
          }
        }
      }
    } catch (e) {
      console.warn('Could not load notification badge:', e);
    }
  },

  async markAllRead() {
    try {
      await api.post('/notifications/read');
      this.loadBadge();
    } catch (e) {
      console.error('Failed to mark notifications read:', e);
    }
  },

  async markSingleRead(id) {
    try {
      await api.post(`/notifications/${id}/read`);
      this.loadBadge();
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  }
};
