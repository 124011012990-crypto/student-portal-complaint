/**
 * CampusCare Complaints Controller
 * Supports listing, filtering, pagination, details view, comments, and lifecycle actions
 */
const complaints = {
  currentPage: 1,
  currentFilters: {},

  async initList(isMyComplaints = false) {
    const user = await auth.requireAuth();
    if (!user) return;

    await app.initLayout(isMyComplaints ? 'my-complaints' : 'complaints');
    await this.loadFilterOptions();
    this.setupFilterListeners(isMyComplaints);
    await this.fetchComplaints(1, isMyComplaints);
  },

  async loadFilterOptions() {
    try {
      // Load Categories
      const catRes = await api.get('/categories');
      const catSelect = document.getElementById('filter-category');
      if (catSelect && catRes.data) {
        catRes.data.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          catSelect.appendChild(opt);
        });
      }

      // Load Departments
      const deptRes = await api.get('/departments');
      const deptSelect = document.getElementById('filter-department');
      if (deptSelect && deptRes.data) {
        deptRes.data.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = d.name;
          deptSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Error loading filter options:', e);
    }
  },

  setupFilterListeners(isMyComplaints) {
    const searchInput = document.getElementById('search-input');
    const statusSelect = document.getElementById('filter-status');
    const prioritySelect = document.getElementById('filter-priority');
    const categorySelect = document.getElementById('filter-category');
    const deptSelect = document.getElementById('filter-department');
    const resetBtn = document.getElementById('btn-reset-filters');

    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentFilters.search = searchInput.value.trim();
          this.fetchComplaints(1, isMyComplaints);
        }, 350);
      });
    }

    const triggerFilter = () => {
      this.currentFilters.status = statusSelect ? statusSelect.value : '';
      this.currentFilters.priority = prioritySelect ? prioritySelect.value : '';
      this.currentFilters.category_id = categorySelect ? categorySelect.value : '';
      this.currentFilters.department_id = deptSelect ? deptSelect.value : '';
      this.fetchComplaints(1, isMyComplaints);
    };

    if (statusSelect) statusSelect.addEventListener('change', triggerFilter);
    if (prioritySelect) prioritySelect.addEventListener('change', triggerFilter);
    if (categorySelect) categorySelect.addEventListener('change', triggerFilter);
    if (deptSelect) deptSelect.addEventListener('change', triggerFilter);

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (statusSelect) statusSelect.value = '';
        if (prioritySelect) prioritySelect.value = '';
        if (categorySelect) categorySelect.value = '';
        if (deptSelect) deptSelect.value = '';
        this.currentFilters = {};
        this.fetchComplaints(1, isMyComplaints);
      });
    }
  },

  async fetchComplaints(page = 1, isMyComplaints = false) {
    this.currentPage = page;
    const tbody = document.getElementById('complaints-tbody');
    const emptyState = document.getElementById('complaints-empty-state');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-muted);">Loading grievances...</td></tr>`;

    try {
      const params = {
        page,
        per_page: 15,
        ...this.currentFilters
      };

      const res = await api.get('/complaints', params);
      const list = res.data && res.data.data ? res.data.data : [];
      const total = res.data ? res.data.total : 0;
      const totalPages = res.data ? res.data.total_pages : 1;

      if (list.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        this.renderPagination(0, 1, 15);
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      tbody.innerHTML = list.map(c => `
        <tr style="cursor: pointer;" onclick="window.location.href='complaint-details.html?ref=${encodeURIComponent(c.reference_number)}'">
          <td><strong style="color:var(--color-primary);">${c.reference_number}</strong></td>
          <td>
            <div style="font-weight:var(--font-weight-medium);">${c.title}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${c.category_name}</div>
          </td>
          <td>${c.department_name}</td>
          <td>${app.getPriorityBadge(c.priority)}</td>
          <td>${app.getStatusBadge(c.status)}</td>
          <td>${app.getConfidentialityBadge(c.confidentiality_level)}</td>
          <td style="color:var(--color-text-muted);font-size:var(--font-size-xs);">${app.formatDateShort(c.created_at)}</td>
        </tr>
      `).join('');

      this.renderPagination(total, page, 15, isMyComplaints);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-danger);padding:2rem;">Failed to load grievances: ${e.message}</td></tr>`;
    }
  },

  renderPagination(total, current, perPage, isMyComplaints) {
    const container = document.getElementById('pagination-container');
    const info = document.getElementById('pagination-info');
    if (!container) return;

    const totalPages = Math.ceil(total / perPage) || 1;
    if (info) {
      const start = total === 0 ? 0 : (current - 1) * perPage + 1;
      const end = Math.min(current * perPage, total);
      info.textContent = `Showing ${start}-${end} of ${total} grievances`;
    }

    let buttons = '';
    for (let p = 1; p <= totalPages; p++) {
      buttons += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="complaints.fetchComplaints(${p}, ${isMyComplaints})">${p}</button>`;
    }
    container.innerHTML = buttons;
  },

  // Complaint Details Page Init
  async initDetails() {
    const user = await auth.requireAuth();
    if (!user) return;

    await app.initLayout('complaints');

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    if (!ref) {
      window.location.href = 'complaints.html';
      return;
    }

    await this.loadDetails(ref, user);
    this.setupDetailsActions(ref, user);
  },

  async loadDetails(ref, user) {
    try {
      const res = await api.get(`/complaints/${encodeURIComponent(ref)}`);
      const c = res.data;
      this.renderDetailsData(c, user);
    } catch (e) {
      app.showToast('Grievance not found or access denied: ' + e.message, 'error');
      setTimeout(() => window.location.href = 'complaints.html', 1500);
    }
  },

  renderDetailsData(c, user) {
    // Header & Meta
    document.getElementById('detail-ref').textContent = c.reference_number;
    document.getElementById('detail-title').textContent = c.title;
    document.getElementById('detail-category').textContent = c.category_name;
    document.getElementById('detail-department').textContent = c.department_name;
    document.getElementById('detail-created').textContent = app.formatDate(c.created_at);
    document.getElementById('detail-due').textContent = app.formatDate(c.due_date);
    document.getElementById('detail-description').textContent = c.description;

    // Badges
    document.getElementById('detail-priority-badge').innerHTML = app.getPriorityBadge(c.priority);
    document.getElementById('detail-status-badge').innerHTML = app.getStatusBadge(c.status);
    document.getElementById('detail-conf-badge').innerHTML = app.getConfidentialityBadge(c.confidentiality_level);

    // Student Info (respected by anonymity rules)
    document.getElementById('detail-student-name').textContent = c.student_name;
    document.getElementById('detail-student-roll').textContent = c.roll_number || 'N/A';
    document.getElementById('detail-student-email').textContent = c.student_email || 'N/A';

    // Assigned Info (Shielded from student view, visible only to admin/officer)
    const assignedEl = document.getElementById('detail-assigned-to');
    if (assignedEl) {
      const currentUser = auth.getUser();
      const isStudent = currentUser && currentUser.role_slug === 'student';
      const isAdmin = currentUser && (currentUser.role_slug === 'admin' || currentUser.role_slug === 'officer');

      if (isStudent) {
        assignedEl.innerHTML = `<span style="color:var(--color-text-main); font-weight:500;">Institutional Grievance Committee</span> <span class="badge" style="font-size:0.65rem; background:var(--color-primary-light); color:var(--color-primary); margin-left:6px;">Staff Shielded</span>`;
      } else if (isAdmin) {
        assignedEl.innerHTML = c.assigned_to_name 
          ? `<strong>${c.assigned_to_name}</strong> <span style="font-size:0.75rem; color:var(--color-text-muted);">(${c.assigned_dept_name || c.department_name})</span> <span class="badge" style="font-size:0.65rem; background:rgba(37,99,235,0.15); color:var(--color-primary); margin-left:6px;">Visible to Admin</span>`
          : '<span style="color:var(--color-text-light);">Unassigned</span>';
      } else {
        assignedEl.textContent = c.assigned_to_name ? `${c.assigned_to_name} (${c.assigned_dept_name || c.department_name})` : 'Unassigned';
      }
    }

    // Resolution Summary if resolved/closed
    const resBox = document.getElementById('resolution-summary-box');
    if (resBox) {
      if (c.resolution_summary) {
        resBox.style.display = 'block';
        document.getElementById('detail-resolution-text').textContent = c.resolution_summary;
        document.getElementById('detail-resolved-at').textContent = app.formatDate(c.resolved_at);
      } else {
        resBox.style.display = 'none';
      }
    }

    // Attachments
    const attList = document.getElementById('detail-attachments-list');
    if (attList) {
      if (c.attachments && c.attachments.length > 0) {
        attList.innerHTML = c.attachments.map(a => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:0.5rem;">
            <div>
              <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);display:flex;align-items:center;gap:0.4rem;">
                ${typeof Icons !== 'undefined' ? Icons.create('paperclip', 14) : ''}
                <span>${a.file_name}</span>
              </div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">${(a.file_size / 1024).toFixed(1)} KB • ${app.formatDateShort(a.created_at)}</div>
            </div>
            <a href="${CampusConfig.getApiBaseUrl()}/complaints/attachments/${a.id}" class="btn btn-secondary btn-sm" target="_blank" download>Download</a>
          </div>
        `).join('');
      } else {
        attList.innerHTML = `<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No supporting documents attached.</div>`;
      }
    }

    // Render Timeline History (Shield staff identity if student is viewing)
    const timelineEl = document.getElementById('detail-timeline');
    if (timelineEl && c.history) {
      const currentUser = auth.getUser();
      const isStudent = currentUser && currentUser.role_slug === 'student';

      timelineEl.innerHTML = c.history.map(h => {
        const isStaffActor = h.changed_by_role && (h.changed_by_role.toLowerCase().includes('faculty') || h.changed_by_role.toLowerCase().includes('staff'));
        const actorDisplay = isStudent && isStaffActor 
          ? 'Grievance Officer' 
          : `${h.changed_by_name} (${h.changed_by_role})`;

        return `
          <div class="timeline-item">
            <div class="timeline-point"></div>
            <div class="timeline-title">${h.new_status} <span style="font-weight:normal;color:var(--color-text-muted);font-size:var(--font-size-xs);">by ${actorDisplay}</span></div>
            <div class="timeline-time">${app.formatDate(h.created_at)}</div>
            <div class="timeline-reason">${h.reason || ''}</div>
          </div>
        `;
      }).join('');
    }

    // Render Comments Thread
    const commentsEl = document.getElementById('detail-comments-container');
    if (commentsEl) {
      if (c.comments && c.comments.length > 0) {
        commentsEl.innerHTML = c.comments.map(comm => `
          <div class="comment-card ${comm.is_internal ? 'internal' : ''}">
            <div class="comment-header">
              <div class="comment-author">
                ${comm.is_internal ? (typeof Icons !== 'undefined' ? Icons.create('lock', 14) : '') + ' <strong style="color:#b45309;">INTERNAL NOTE:</strong>' : (typeof Icons !== 'undefined' ? Icons.create('message', 14) : '')}
                <span>${comm.author_name}</span>
                <span class="badge" style="background:var(--color-surface);border:1px solid var(--color-border);font-size:0.65rem;">${comm.author_role}</span>
              </div>
              <div class="comment-date">${app.formatDate(comm.created_at)}</div>
            </div>
            <div class="comment-body">${comm.comment_text}</div>
          </div>
        `).join('');
      } else {
        commentsEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--color-text-muted);font-size:var(--font-size-sm);">No comments yet. Start the conversation below.</div>`;
      }
    }

    // Configure role-dependent action buttons
    const role = user.role_slug;
    const btnUpdateStatus = document.getElementById('btn-open-status-modal');
    const btnAssign = document.getElementById('btn-open-assign-modal');
    const btnFeedback = document.getElementById('btn-open-feedback-modal');
    const btnDelete = document.getElementById('btn-delete-complaint');
    const internalNoteOption = document.getElementById('comment-internal-toggle');

    if (btnUpdateStatus) {
      btnUpdateStatus.style.display = ['admin', 'officer', 'hod', 'faculty'].includes(role) ? 'inline-flex' : 'none';
    }
    if (btnAssign) {
      btnAssign.style.display = ['admin', 'officer', 'hod'].includes(role) ? 'inline-flex' : 'none';
    }
    if (btnFeedback) {
      // Student can submit feedback / reopen if resolved or closed
      const isOwner = Number(c.student_id) === Number(user.id);
      btnFeedback.style.display = isOwner && ['Resolved', 'Closed'].includes(c.status) ? 'inline-flex' : 'none';
    }
    if (btnDelete) {
      btnDelete.style.display = role === 'admin' ? 'inline-flex' : 'none';
    }
    if (internalNoteOption) {
      internalNoteOption.style.display = ['admin', 'officer', 'hod'].includes(role) ? 'flex' : 'none';
    }
  },

  setupDetailsActions(ref, user) {
    // 1. Post Comment Form
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('comment-input').value.trim();
        const isInternalCheckbox = document.getElementById('comment-is-internal');
        const isInternal = isInternalCheckbox ? isInternalCheckbox.checked : false;

        if (!text) return;

        try {
          await api.post(`/complaints/${encodeURIComponent(ref)}/comments`, {
            comment: text,
            is_internal: isInternal
          });
          document.getElementById('comment-input').value = '';
          app.showToast('Comment posted successfully', 'success');
          await this.loadDetails(ref, user);
        } catch (err) {
          app.showToast('Failed to post comment: ' + err.message, 'error');
        }
      });
    }

    // 2. Status Update Modal
    const statusForm = document.getElementById('status-update-form');
    if (statusForm) {
      statusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newStatus = document.getElementById('modal-status-select').value;
        const reason = document.getElementById('modal-status-reason').value;
        const summary = document.getElementById('modal-status-summary').value;

        try {
          await api.post(`/complaints/${encodeURIComponent(ref)}/update`, {
            status: newStatus,
            reason: reason,
            resolution_summary: summary || null
          });
          document.getElementById('status-modal-overlay').classList.remove('open');
          app.showToast(`Status updated to ${newStatus}`, 'success');
          await this.loadDetails(ref, user);
        } catch (err) {
          app.showToast('Status update failed: ' + err.message, 'error');
        }
      });
    }

    // 3. Assignment Modal
    const assignForm = document.getElementById('assign-form');
    if (assignForm) {
      // Preload staff and departments for assignment dropdown
      api.get('/admin/staff').then(res => {
        const staffSelect = document.getElementById('modal-assign-staff');
        if (staffSelect && res.data) {
          res.data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.full_name} (${s.role_name} - ${s.department_name || 'Admin'})`;
            staffSelect.appendChild(opt);
          });
        }
      });

      api.get('/departments').then(res => {
        const deptSelect = document.getElementById('modal-assign-dept');
        if (deptSelect && res.data) {
          res.data.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            deptSelect.appendChild(opt);
          });
        }
      });

      assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const staffId = document.getElementById('modal-assign-staff').value;
        const deptId = document.getElementById('modal-assign-dept').value;
        const note = document.getElementById('modal-assign-note').value;

        try {
          await api.post(`/complaints/${encodeURIComponent(ref)}/assign`, {
            assigned_to_user_id: staffId || null,
            assigned_to_dept_id: deptId || null,
            note: note
          });
          document.getElementById('assign-modal-overlay').classList.remove('open');
          app.showToast('Grievance assignment updated', 'success');
          await this.loadDetails(ref, user);
        } catch (err) {
          app.showToast('Assignment failed: ' + err.message, 'error');
        }
      });
    }

    // 4. Feedback / Reopen Modal
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = document.getElementById('modal-feedback-rating').value;
        const comments = document.getElementById('modal-feedback-comments').value;
        const reopenCheck = document.getElementById('modal-feedback-reopen');
        const reopenReason = document.getElementById('modal-feedback-reopen-reason').value;

        try {
          await api.post(`/complaints/${encodeURIComponent(ref)}/feedback`, {
            rating: parseInt(rating, 10),
            comments: comments,
            reopen_requested: reopenCheck ? reopenCheck.checked : false,
            reopen_reason: reopenReason
          });
          document.getElementById('feedback-modal-overlay').classList.remove('open');
          app.showToast('Feedback submitted successfully', 'success');
          await this.loadDetails(ref, user);
        } catch (err) {
          app.showToast('Failed to submit feedback: ' + err.message, 'error');
        }
      });
    }

    // 5. Admin Delete Complaint
    const btnDelete = document.getElementById('btn-delete-complaint');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to permanently delete grievance ${ref}? This action cannot be undone.`)) {
          try {
            await api.post(`/complaints/${encodeURIComponent(ref)}/delete`);
            app.showToast('Grievance deleted', 'info');
            setTimeout(() => window.location.href = 'complaints.html', 1000);
          } catch (err) {
            app.showToast('Delete failed: ' + err.message, 'error');
          }
        }
      });
    }
  }
};
