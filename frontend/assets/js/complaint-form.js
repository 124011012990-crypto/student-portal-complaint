/**
 * CampusCare Complaint Submission Controller
 */
const complaintForm = {
  categories: [],
  departments: [],

  async init() {
    const user = await auth.requireAuth(['student', 'admin']);
    if (!user) return;

    await app.initLayout('submit');
    await this.loadLookups();
    this.setupListeners();
  },

  async loadLookups() {
    try {
      const [catsRes, deptsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/departments')
      ]);

      this.categories = catsRes.data || [];
      this.departments = deptsRes.data || [];

      // Populate Categories
      const catSelect = document.getElementById('category_id');
      if (catSelect) {
        this.categories.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.name} (SLA: ${c.sla_days} days)`;
          catSelect.appendChild(opt);
        });
      }

      // Populate Departments
      const deptSelect = document.getElementById('department_id');
      if (deptSelect) {
        this.departments.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = `${d.name} (${d.code})`;
          deptSelect.appendChild(opt);
        });
      }
    } catch (e) {
      app.showToast('Failed to load categories or departments: ' + e.message, 'error');
    }
  },

  setupListeners() {
    const catSelect = document.getElementById('category_id');
    const slaNotice = document.getElementById('category-sla-notice');
    const deptSelect = document.getElementById('department_id');

    if (catSelect && slaNotice) {
      catSelect.addEventListener('change', () => {
        const selectedId = Number(catSelect.value);
        const cat = this.categories.find(c => c.id === selectedId);
        if (cat) {
          slaNotice.style.display = 'block';
          if (cat.name.toLowerCase().includes('staff') || cat.slug.includes('staff')) {
            slaNotice.innerHTML = `🛡️ <strong>Staff Grievance Shield Active:</strong> This grievance will be routed exclusively to the Executive Administrator & Central Grievance Cell. Individual staff members are prohibited from viewing or intercepting this complaint. Standard resolution SLA: ${cat.sla_days} working days.`;
            slaNotice.style.background = 'rgba(59, 130, 246, 0.12)';
            slaNotice.style.border = '1px solid rgba(59, 130, 246, 0.25)';
          } else {
            slaNotice.textContent = `⏱ Standard resolution SLA for '${cat.name}' is ${cat.sla_days} working days.`;
            slaNotice.style.background = 'var(--color-primary-light)';
            slaNotice.style.border = 'none';
          }
          if (cat.department_id && deptSelect) {
            deptSelect.value = cat.department_id;
          }
        } else {
          slaNotice.style.display = 'none';
        }
      });
    }

    const confSelect = document.getElementById('confidentiality_level');
    const anonNotice = document.getElementById('anonymity-notice');

    if (confSelect && anonNotice) {
      confSelect.addEventListener('change', () => {
        if (confSelect.value === 'Anonymous') {
          anonNotice.style.display = 'block';
          anonNotice.innerHTML = '🔒 <strong>Anonymous mode:</strong> Your student roll number and name will be masked from investigating faculty. You can still track responses directly in your account.';
        } else if (confSelect.value === 'Confidential') {
          anonNotice.style.display = 'block';
          anonNotice.innerHTML = '🛡️ <strong>Confidential mode:</strong> Only the Central Grievance Officer and System Administrator can view this grievance and its attachments.';
        } else {
          anonNotice.style.display = 'none';
        }
      });
    }

    // Form submission
    const form = document.getElementById('submit-complaint-form');
    const submitBtn = document.getElementById('btn-submit-complaint');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const categoryId = document.getElementById('category_id').value;
        const departmentId = document.getElementById('department_id').value;
        const subcategory = document.getElementById('subcategory').value.trim();
        const priority = document.getElementById('priority').value;
        const confLevel = document.getElementById('confidentiality_level').value;
        const fileInput = document.getElementById('attachment');

        if (!title || !description || !categoryId) {
          app.showToast('Please complete all required fields.', 'warning');
          return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category_id', categoryId);
        if (departmentId) formData.append('department_id', departmentId);
        if (subcategory) formData.append('subcategory', subcategory);
        formData.append('priority', priority);
        formData.append('confidentiality_level', confLevel);
        formData.append('is_anonymous', confLevel === 'Anonymous' ? '1' : '0');

        if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          if (file.size > 5 * 1024 * 1024) {
            app.showToast('Attached file exceeds 5MB limit.', 'error');
            return;
          }
          formData.append('attachment', file);
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting grievance...';
          }

          const res = await api.postForm('/complaints', formData);
          app.showToast('Grievance registered successfully!', 'success');

          const ref = res.data && res.data.reference_number ? res.data.reference_number : '';
          setTimeout(() => {
            window.location.href = `complaint-details.html?ref=${encodeURIComponent(ref)}`;
          }, 1200);
        } catch (err) {
          app.showToast('Submission failed: ' + err.message, 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Grievance';
          }
        }
      });
    }
  }
};
