/**
 * CampusCare Dashboard Controller
 * Role-Differentiated Experience based on RBAC Authorities
 */
const dashboard = {
  user: null,
  recentComplaintsData: [],

  async init() {
    this.user = await auth.requireAuth();
    if (!this.user) return;

    await app.initLayout('dashboard');
    this.initThemeObserver();
    this.applyRoleCustomizations(this.user);
    await this.loadSummary();
  },

  applyRoleCustomizations(user) {
    const role = (user.role_slug || 'student').toLowerCase();

    // 1. Configure Welcome Banner
    const roleBadgeEl = document.getElementById('dash-role-badge');
    const statusBadgeEl = document.getElementById('dash-status-badge');
    const titleEl = document.getElementById('dash-welcome-title');
    const descEl = document.getElementById('dash-welcome-desc');
    const actionsEl = document.getElementById('dash-banner-actions');

    const roleConfigs = {
      student: {
        badgeText: 'Student Portal',
        badgeBg: 'var(--color-primary-light)',
        badgeColor: 'var(--color-primary)',
        statusText: 'Active Student Desk',
        statusBg: 'var(--color-success-bg)',
        statusColor: 'var(--color-success-text)',
        scopeTitle: 'Personal Submissions Scope',
        scopeDesc: 'Authorized for personal grievance filings and feedback tracking. In accordance with institutional anti-bias standards, respondent staff identities are shielded and anonymous.',
        authorizedPerms: ['✓ File Grievances', '✓ View Personal Cases', '✓ Rate Resolution', '✓ Post Comments', '🛡️ Staff Shielded'],
        title: `Welcome back, ${user.full_name}`,
        desc: `Roll No: ${user.roll_number || 'Enrolled'} • Department: ${user.department_name || 'Campus Wide'} • Track personal grievances and feedback`,
        actions: `
          <a href="submit-complaint.html" id="dash-submit-btn" class="btn btn-primary">
            <span data-icon="file-plus" data-icon-size="16"></span> File New Grievance
          </a>
          <a href="complaints.html" class="btn btn-secondary">
            <span data-icon="clipboard-list" data-icon-size="16"></span> My Grievances
          </a>
        `,
        metrics: {
          total: { label: 'My Filed Grievances', icon: 'clipboard-list' },
          pending: { label: 'Awaiting Review', icon: 'clock' },
          in_progress: { label: 'Under Investigation', icon: 'refresh-cw' },
          resolved: { label: 'Resolved for Me', icon: 'check-circle-2' },
          overdue: { label: 'SLA Delayed Cases', icon: 'alert-triangle' }
        },
        domainCards: `
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?dept=ACAD'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(59,130,246,0.12); color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="file-text" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Academics & Labs</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Curriculum, Marks, Labs</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?dept=INFRA'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(16,185,129,0.12); color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="settings" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Campus Infrastructure</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">WiFi, Classrooms, Power</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?dept=HOSTEL'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(245,158,11,0.12); color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="folder" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Hostel & Mess</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Catering, Rooms, Water</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='submit-complaint.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(239,68,68,0.12); color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="shield" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Conduct & Safety</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Staff Shielded • Anti-Ragging</div>
            </div>
          </div>
        `,
        tableTitle: 'My Recent Grievances',
        tableDesc: 'Latest complaints submitted from your student account',
        viewAllText: 'View All My Grievances →',
        viewAllHref: 'complaints.html'
      },

      faculty: {
        badgeText: 'Faculty & Staff Desk',
        badgeBg: 'rgba(16,185,129,0.12)',
        badgeColor: '#059669',
        statusText: 'Assigned Case Officer',
        statusBg: 'var(--color-primary-light)',
        statusColor: 'var(--color-primary)',
        scopeTitle: `Assigned Case Desk • ${user.department_name || 'Academic Unit'}`,
        scopeDesc: `Authorized to investigate student grievances specifically routed to your desk, record progress updates, advance status to In Progress, and communicate with complainants.`,
        authorizedPerms: ['✓ View Assigned Cases', '✓ Advance Status to In-Progress', '✓ Post Public Progress Notes', '📋 Faculty Queue'],
        title: `Welcome, ${user.full_name}`,
        desc: `Department: ${user.department_name || 'Academic Unit'} • Cases assigned to your desk for investigation and resolution`,
        actions: `
          <a href="complaints.html" class="btn btn-primary">
            <span data-icon="clipboard-list" data-icon-size="16"></span> My Assigned Cases
          </a>
          <a href="complaints.html?status=In Progress" class="btn btn-secondary">
            <span data-icon="refresh-cw" data-icon-size="16"></span> Active Investigations
          </a>
        `,
        metrics: {
          total: { label: 'Assigned to Me', icon: 'clipboard-list' },
          pending: { label: 'New Assignments', icon: 'clock' },
          in_progress: { label: 'Under Investigation', icon: 'refresh-cw' },
          resolved: { label: 'Resolved by Me', icon: 'check-circle-2' },
          overdue: { label: 'SLA Warning Cases', icon: 'alert-triangle' }
        },
        domainCards: `
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(59,130,246,0.12); color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="clipboard-list" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Assigned Cases</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Direct case assignments</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=Assigned'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(245,158,11,0.12); color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="clock" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Awaiting Review</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Newly assigned to you</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=In Progress'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(99,102,241,0.12); color:#4f46e5; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="refresh-cw" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">In-Progress Cases</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Ongoing investigations</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=Resolved'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(16,185,129,0.12); color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="check-circle-2" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Resolved Cases</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Past resolution history</div>
            </div>
          </div>
        `,
        tableTitle: 'My Assigned Case Queue',
        tableDesc: 'Grievances routed to your desk requiring active updates or resolution',
        viewAllText: 'View All Assigned Cases →',
        viewAllHref: 'complaints.html'
      },

      hod: {
        badgeText: 'Department HOD Portal',
        badgeBg: 'rgba(139,92,246,0.12)',
        badgeColor: '#7c3aed',
        statusText: 'Dept Governance Authority',
        statusBg: 'var(--color-success-bg)',
        statusColor: 'var(--color-success-text)',
        scopeTitle: `Department Authority & Oversight • ${user.department_name || 'Department'}`,
        scopeDesc: `Full supervisory oversight across all grievances reported in your department. Authorized to assign cases to faculty staff, record confidential internal officer notes, and monitor departmental resolution SLAs.`,
        authorizedPerms: ['✓ Department Cases', '✓ Assign Faculty Staff', '✓ Internal Officer Notes', '✓ Department SLA Analytics'],
        title: `Welcome, HOD ${user.full_name}`,
        desc: `Head of Department • ${user.department_name || 'Academic Unit'} • Triage, faculty assignment, and departmental SLA performance`,
        actions: `
          <a href="complaints.html?status=Submitted" class="btn btn-primary">
            <span data-icon="user" data-icon-size="16"></span> Assign Pending Cases
          </a>
          <a href="complaints.html" class="btn btn-secondary">
            <span data-icon="clipboard-list" data-icon-size="16"></span> Dept Cases
          </a>
          <a href="reports.html" class="btn btn-ghost">
            <span data-icon="bar-chart-2" data-icon-size="16"></span> Dept Reports
          </a>
        `,
        metrics: {
          total: { label: 'Department Cases', icon: 'clipboard-list' },
          pending: { label: 'Needs Staff Assignment', icon: 'clock' },
          in_progress: { label: 'Faculty In-Progress', icon: 'refresh-cw' },
          resolved: { label: 'Department Resolved', icon: 'check-circle-2' },
          overdue: { label: 'Dept SLA Breaches', icon: 'alert-triangle' }
        },
        domainCards: `
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=Submitted'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(245,158,11,0.12); color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="user" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Unassigned Triage</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Route cases to faculty</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=In Progress'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(59,130,246,0.12); color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="refresh-cw" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Under Faculty Action</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Active investigations</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=Escalated'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(239,68,68,0.12); color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="alert-triangle" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Dept SLA Warnings</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Requires urgent triage</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='reports.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(16,185,129,0.12); color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="bar-chart-2" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Dept Analytics</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Resolution metrics & SLA</div>
            </div>
          </div>
        `,
        tableTitle: 'Department Grievance Triage',
        tableDesc: `Recent student complaints submitted under ${user.department_name || 'your department'}`,
        viewAllText: 'View All Department Cases →',
        viewAllHref: 'complaints.html'
      },

      officer: {
        badgeText: 'Central Grievance Office',
        badgeBg: 'rgba(245,158,11,0.12)',
        badgeColor: '#d97706',
        statusText: 'Central Investigation Cell',
        statusBg: 'var(--color-primary-light)',
        statusColor: 'var(--color-primary)',
        scopeTitle: 'Central Grievance Redressal Authority',
        scopeDesc: 'Institution-wide authority across standard and confidential grievances. Central triage, inter-departmental routing, escalation management, and official resolution closure.',
        authorizedPerms: ['✓ Campus Case Intake', '✓ Assign Any Staff', '✓ Mark Officially Resolved', '✓ Internal Notes', '✓ Confidential Cases', '✓ SLA Reports'],
        title: `Welcome, Officer ${user.full_name}`,
        desc: `Central Grievance Authority • Institution-wide case intake, investigation, and official resolution closure`,
        actions: `
          <a href="complaints.html?status=Submitted" class="btn btn-primary">
            <span data-icon="check-circle-2" data-icon-size="16"></span> Triage New Intake
          </a>
          <a href="complaints.html?status=Escalated" class="btn btn-secondary">
            <span data-icon="alert-triangle" data-icon-size="16"></span> Escalations & SLA Breaches
          </a>
          <a href="reports.html" class="btn btn-ghost">
            <span data-icon="bar-chart-2" data-icon-size="16"></span> SLA Reports
          </a>
        `,
        metrics: {
          total: { label: 'Campus Grievances', icon: 'clipboard-list' },
          pending: { label: 'Pending Triage', icon: 'clock' },
          in_progress: { label: 'Under Investigation', icon: 'refresh-cw' },
          resolved: { label: 'Officially Resolved', icon: 'check-circle-2' },
          overdue: { label: 'Critical SLA Breaches', icon: 'alert-triangle' }
        },
        domainCards: `
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=Submitted'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(59,130,246,0.12); color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="clock" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">New Intake Triage</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Unreviewed college filings</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?status=Escalated'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(239,68,68,0.12); color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="alert-triangle" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Escalated Grievances</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">SLA overdue alerts</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html?dept=ACAD'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(16,185,129,0.12); color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="file-text" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Academic Redressal</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Curriculum & faculty conduct</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='reports.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(139,92,246,0.12); color:#7c3aed; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="bar-chart-2" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Institutional SLA</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Compliance & analytics</div>
            </div>
          </div>
        `,
        tableTitle: 'Campus-Wide Case Intake Stream',
        tableDesc: 'Live stream of student grievances requiring review, assignment, or resolution approval',
        viewAllText: 'View All Campus Cases →',
        viewAllHref: 'complaints.html'
      },

      admin: {
        badgeText: 'System Governance',
        badgeBg: 'rgba(239,68,68,0.12)',
        badgeColor: '#dc2626',
        statusText: 'Full Governance Control',
        statusBg: 'var(--color-success-bg)',
        statusColor: 'var(--color-success-text)',
        scopeTitle: 'Full Institutional System Governance',
        scopeDesc: 'Comprehensive portal privileges: user account management, password administration, RBAC permission configuration, case deletion, and immutable security audit logs.',
        authorizedPerms: ['✓ Manage User Accounts', '✓ Configure RBAC Privileges', '✓ Permanent Deletion', '✓ Security Audit Logs', '✓ System Configuration'],
        title: `Welcome, Administrator ${user.full_name}`,
        desc: `System Governance • Manage portal security, user accounts, RBAC permissions, and system audit logs`,
        actions: `
          <a href="roles.html" class="btn btn-primary">
            <span data-icon="shield" data-icon-size="16"></span> Manage Roles & RBAC
          </a>
          <a href="users.html" class="btn btn-secondary">
            <span data-icon="users" data-icon-size="16"></span> User Accounts
          </a>
          <a href="audit-logs.html" class="btn btn-ghost">
            <span data-icon="file-text" data-icon-size="16"></span> Audit Logs
          </a>
        `,
        metrics: {
          total: { label: 'Total Campus Cases', icon: 'clipboard-list' },
          pending: { label: 'Pending Triage', icon: 'clock' },
          in_progress: { label: 'Active In-Progress', icon: 'refresh-cw' },
          resolved: { label: 'Resolved & Closed', icon: 'check-circle-2' },
          overdue: { label: 'SLA Overdue Cases', icon: 'alert-triangle' }
        },
        domainCards: `
          <div class="card dash-domain-item" onclick="window.location.href='roles.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(239,68,68,0.12); color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="shield" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Roles & Permissions</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Manage RBAC capabilities</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='users.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(59,130,246,0.12); color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="users" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">User Management</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Accounts & credentials</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='reports.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(16,185,129,0.12); color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="bar-chart-2" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">System Reports</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">SLA analytics & CSV export</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='audit-logs.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(100,116,139,0.12); color:#475569; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="file-text" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Security Audit Logs</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Immutable audit trail</div>
            </div>
          </div>
        `,
        tableTitle: 'Institutional Grievance Activity',
        tableDesc: 'Comprehensive stream of student complaints submitted across all campus units',
        viewAllText: 'View Complete Repository →',
        viewAllHref: 'complaints.html'
      },

      auditor: {
        badgeText: 'Quality & Compliance Audit',
        badgeBg: 'rgba(100,116,139,0.12)',
        badgeColor: '#475569',
        statusText: 'Read-Only Audit Mode',
        statusBg: 'rgba(245,158,11,0.15)',
        statusColor: '#d97706',
        scopeTitle: 'Statutory Compliance & Quality Audit',
        scopeDesc: 'Read-only independent quality compliance scope across non-confidential cases, institutional resolution turnaround times, SLA metrics, and immutable audit trails.',
        authorizedPerms: ['✓ Statutory Compliance Reports', '✓ Inspect Audit Trails', '✓ Non-Confidential Cases', '✓ Role Matrix Review', '🔒 Read-Only Mode'],
        title: `Welcome, Auditor ${user.full_name}`,
        desc: `Quality Assurance Cell • Independent inspection of grievance resolution SLAs and audit trails`,
        actions: `
          <a href="reports.html" class="btn btn-primary">
            <span data-icon="bar-chart-2" data-icon-size="16"></span> Compliance Reports
          </a>
          <a href="audit-logs.html" class="btn btn-secondary">
            <span data-icon="file-text" data-icon-size="16"></span> Inspect Audit Logs
          </a>
          <a href="roles.html" class="btn btn-ghost">
            <span data-icon="shield" data-icon-size="16"></span> Role Matrix
          </a>
        `,
        metrics: {
          total: { label: 'Audited Grievances', icon: 'clipboard-list' },
          pending: { label: 'Open Reviews', icon: 'clock' },
          in_progress: { label: 'Active In-Progress', icon: 'refresh-cw' },
          resolved: { label: 'Verified Resolved', icon: 'check-circle-2' },
          overdue: { label: 'SLA Non-Compliant', icon: 'alert-triangle' }
        },
        domainCards: `
          <div class="card dash-domain-item" onclick="window.location.href='reports.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(59,130,246,0.12); color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="bar-chart-2" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">SLA Compliance Reports</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Turnaround times & metrics</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='audit-logs.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(100,116,139,0.12); color:#475569; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="file-text" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">Audit Trail Inspector</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Timestamped action history</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='roles.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(139,92,246,0.12); color:#7c3aed; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="shield" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">RBAC Authorization Audit</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">View role capability matrix</div>
            </div>
          </div>
          <div class="card dash-domain-item" onclick="window.location.href='complaints.html'">
            <div style="width:42px; height:42px; border-radius:var(--radius-md); background:rgba(16,185,129,0.12); color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span data-icon="clipboard-list" data-icon-size="20"></span>
            </div>
            <div>
              <div style="font-size:var(--font-size-sm); font-weight:var(--font-weight-bold); color:var(--color-text-main);">All Case Records</div>
              <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Inspect non-confidential cases</div>
            </div>
          </div>
        `,
        tableTitle: 'Compliance Inspection Stream',
        tableDesc: 'Latest non-confidential grievance cases available for audit verification',
        viewAllText: 'View All Auditable Cases →',
        viewAllHref: 'complaints.html'
      }
    };

    const config = roleConfigs[role] || roleConfigs.student;

    if (roleBadgeEl) {
      roleBadgeEl.textContent = config.badgeText;
      roleBadgeEl.style.background = config.badgeBg;
      roleBadgeEl.style.color = config.badgeColor;
    }

    if (statusBadgeEl) {
      statusBadgeEl.innerHTML = `<span class="system-status-indicator" style="width:6px; height:6px;"></span> ${config.statusText}`;
      statusBadgeEl.style.background = config.statusBg;
      statusBadgeEl.style.color = config.statusColor;
    }

    if (titleEl) titleEl.textContent = config.title;
    if (descEl) descEl.textContent = config.desc;
    if (actionsEl) actionsEl.innerHTML = config.actions;

    // 2. Configure Dedicated Role Authority & Scope Card
    const scopeBadgeEl = document.getElementById('dash-role-scope-badge');
    const scopeDescEl = document.getElementById('dash-role-scope-desc');
    const permsListEl = document.getElementById('dash-role-perms-list');

    if (scopeBadgeEl && config.scopeTitle) {
      scopeBadgeEl.textContent = config.scopeTitle;
      scopeBadgeEl.style.background = config.badgeBg;
      scopeBadgeEl.style.color = config.badgeColor;
      scopeBadgeEl.style.fontWeight = '700';
    }

    if (scopeDescEl && config.scopeDesc) {
      scopeDescEl.textContent = config.scopeDesc;
    }

    if (permsListEl && config.authorizedPerms) {
      permsListEl.innerHTML = config.authorizedPerms.map(p => `
        <span class="badge" style="background:var(--color-surface-hover); border:1px solid var(--color-border); font-size:0.72rem; color:var(--color-text-main); font-weight:600;">
          ${p}
        </span>
      `).join('');
    }

    // 3. Configure Metric Labels
    if (config.metrics) {
      const labelTotal = document.getElementById('metric-label-total');
      const labelPending = document.getElementById('metric-label-pending');
      const labelInProgress = document.getElementById('metric-label-in-progress');
      const labelResolved = document.getElementById('metric-label-resolved');
      const labelOverdue = document.getElementById('metric-label-overdue');

      if (labelTotal) labelTotal.textContent = config.metrics.total.label;
      if (labelPending) labelPending.textContent = config.metrics.pending.label;
      if (labelInProgress) labelInProgress.textContent = config.metrics.in_progress.label;
      if (labelResolved) labelResolved.textContent = config.metrics.resolved.label;
      if (labelOverdue) labelOverdue.textContent = config.metrics.overdue.label;
    }

    // 4. Configure Domain Cards
    const domainCardsContainer = document.getElementById('dash-domain-cards');
    if (domainCardsContainer && config.domainCards) {
      domainCardsContainer.innerHTML = config.domainCards;
    }

    // 5. Configure Recent Complaints Header
    const tableTitleEl = document.getElementById('dash-table-title');
    const tableDescEl = document.getElementById('dash-table-desc');
    const tableViewLinkEl = document.getElementById('dash-table-view-link');

    if (tableTitleEl) tableTitleEl.textContent = config.tableTitle;
    if (tableDescEl) tableDescEl.textContent = config.tableDesc;
    if (tableViewLinkEl) {
      tableViewLinkEl.textContent = config.viewAllText;
      tableViewLinkEl.href = config.viewAllHref;
    }

    if (typeof Icons !== 'undefined') {
      Icons.renderPageIcons();
    }
  },

  lastFullData: null,

  async loadSummary() {
    try {
      const res = await api.get('/dashboard/summary');
      if (res && res.data) {
        this.lastFullData = res.data;
        this.statusDistData = res.data.status_distribution || {};
        this.priorityDistData = res.data.priority_distribution || {};
        this.renderMetrics(res.data.metrics);
        this.renderRecentComplaints(res.data.recent_complaints);
        this.renderStatusView();
        this.renderPriorityView();
        this.renderRoleWorkspace(res.data.role_data || {}, res.data);
      }
    } catch (e) {
      app.showToast('Failed to load dashboard metrics: ' + e.message, 'error');
    }
  },

  renderMetrics(metrics) {
    if (!metrics) return;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? 0;
    };
    setVal('metric-total', metrics.total);
    setVal('metric-pending', metrics.pending);
    setVal('metric-in-progress', metrics.in_progress);
    setVal('metric-resolved', metrics.resolved);
    setVal('metric-overdue', metrics.overdue);
  },

  renderRecentComplaints(complaints = []) {
    this.recentComplaintsData = complaints || [];
    this.filterAndRenderTable('');

    const searchInput = document.getElementById('dash-recent-search');
    if (searchInput && !searchInput.dataset.listening) {
      searchInput.dataset.listening = 'true';
      searchInput.addEventListener('input', (e) => {
        this.filterAndRenderTable(e.target.value.trim().toLowerCase());
      });
    }
  },

  filterAndRenderTable(keyword = '') {
    const tbody = document.getElementById('recent-complaints-tbody');
    const emptyState = document.getElementById('recent-empty-state');
    if (!tbody) return;

    let filtered = this.recentComplaintsData;
    if (keyword) {
      filtered = filtered.filter(c => 
        (c.title && c.title.toLowerCase().includes(keyword)) ||
        (c.reference_number && c.reference_number.toLowerCase().includes(keyword)) ||
        (c.category_name && c.category_name.toLowerCase().includes(keyword)) ||
        (c.department_name && c.department_name.toLowerCase().includes(keyword))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = filtered.map(c => `
      <tr style="cursor: pointer;" onclick="window.location.href='complaint-details.html?ref=${encodeURIComponent(c.reference_number)}'">
        <td><strong style="color:var(--color-primary); font-family:var(--font-mono); font-size:0.8rem;">${c.reference_number}</strong></td>
        <td>
          <div style="font-weight:var(--font-weight-medium); color:var(--color-text-main);">${c.title}</div>
          <div style="font-size:var(--font-size-xs); color:var(--color-text-muted); margin-top:2px;">${c.category_name} • ${c.department_name}</div>
        </td>
        <td>${app.getPriorityBadge(c.priority)}</td>
        <td>${app.getStatusBadge(c.status)}</td>
        <td style="color:var(--color-text-muted); font-size:var(--font-size-xs);">${app.formatDateShort(c.created_at)}</td>
        <td style="text-align:right;">
          <a href="complaint-details.html?ref=${encodeURIComponent(c.reference_number)}" class="btn btn-secondary btn-sm" style="padding:0.3rem 0.7rem; font-size:0.75rem;" onclick="event.stopPropagation();">
            View
          </a>
        </td>
      </tr>
    `).join('');
  },

  statusDistData: null,
  priorityDistData: null,
  statusChartInstance: null,
  priorityChartInstance: null,
  statusCurrentMode: 'donut',
  priorityCurrentMode: 'donut',
  themeObserverAttached: false,

  initThemeObserver() {
    if (this.themeObserverAttached) return;
    this.themeObserverAttached = true;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          if (this.statusCurrentMode === 'donut' && this.statusDistData) {
            this.renderStatusDonut(this.statusDistData);
          }
          if (this.priorityCurrentMode === 'donut' && this.priorityDistData) {
            this.renderPriorityDonut(this.priorityDistData);
          }
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  },

  renderStatusView() {
    this.toggleStatusView(this.statusCurrentMode || 'donut');
  },

  renderPriorityView() {
    this.togglePriorityView(this.priorityCurrentMode || 'donut');
  },

  toggleStatusView(mode = 'donut') {
    this.statusCurrentMode = mode;
    const donutContainer = document.getElementById('status-donut-container');
    const barsContainer = document.getElementById('status-bars-container');
    const btnDonut = document.getElementById('btn-status-view-donut');
    const btnBars = document.getElementById('btn-status-view-bars');

    const updateBtns = (activeBtn) => {
      [btnDonut, btnBars].forEach(b => {
        if (!b) return;
        if (b === activeBtn) {
          b.className = 'btn btn-sm active';
          b.style.background = 'var(--color-surface)';
        } else {
          b.className = 'btn btn-ghost btn-sm';
          b.style.background = 'transparent';
        }
      });
    };

    if (mode === 'bars') {
      if (donutContainer) donutContainer.style.display = 'none';
      if (barsContainer) barsContainer.style.display = 'flex';
      updateBtns(btnBars);
      this.renderStatusBars(this.statusDistData || {});
    } else {
      if (donutContainer) donutContainer.style.display = 'flex';
      if (barsContainer) barsContainer.style.display = 'none';
      updateBtns(btnDonut);
      this.renderStatusDonut(this.statusDistData || {});
    }

    this.updateStatusFooter(this.statusDistData || {});
    if (typeof Icons !== 'undefined') {
      Icons.renderPageIcons();
    }
  },

  togglePriorityView(mode = 'donut') {
    this.priorityCurrentMode = mode;
    const donutContainer = document.getElementById('priority-donut-container');
    const barsContainer = document.getElementById('priority-bars-container');
    const btnDonut = document.getElementById('btn-priority-view-donut');
    const btnBars = document.getElementById('btn-priority-view-bars');

    const updateBtns = (activeBtn) => {
      [btnDonut, btnBars].forEach(b => {
        if (!b) return;
        if (b === activeBtn) {
          b.className = 'btn btn-sm active';
          b.style.background = 'var(--color-surface)';
        } else {
          b.className = 'btn btn-ghost btn-sm';
          b.style.background = 'transparent';
        }
      });
    };

    if (mode === 'bars') {
      if (donutContainer) donutContainer.style.display = 'none';
      if (barsContainer) barsContainer.style.display = 'flex';
      updateBtns(btnBars);
      this.renderPriorityBars(this.priorityDistData || {});
    } else {
      if (donutContainer) donutContainer.style.display = 'flex';
      if (barsContainer) barsContainer.style.display = 'none';
      updateBtns(btnDonut);
      this.renderPriorityDonut(this.priorityDistData || {});
    }

    this.updatePriorityFooter(this.priorityDistData || {});
    if (typeof Icons !== 'undefined') {
      Icons.renderPageIcons();
    }
  },

  renderStatusDistribution(dist = {}, mode = null) {
    this.statusDistData = dist;
    this.toggleStatusView(mode || this.statusCurrentMode || 'donut');
  },

  renderPriorityBreakdown(pri = {}, mode = null) {
    this.priorityDistData = pri;
    this.togglePriorityView(mode || this.priorityCurrentMode || 'donut');
  },

  renderStatusDonut(dist = {}) {
    this.statusDistData = dist;
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('dash-status-canvas');
    if (!canvas) return;

    if (this.statusChartInstance) {
      this.statusChartInstance.destroy();
      this.statusChartInstance = null;
    }

    const statuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated', 'Rejected'];
    const counts = statuses.map(s => Number(dist[s] || 0));
    const total = counts.reduce((a, b) => a + b, 0);
    const colors = ['#64748b', '#f59e0b', '#0284c7', '#6366f1', '#10b981', '#94a3b8', '#ef4444', '#dc2626'];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const borderColor = isDark ? '#111a2e' : '#ffffff';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const isZero = total === 0;

    let activeHoverText = null;

    const centerPlugin = {
      id: 'dashStatusCenterText',
      afterDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;
        const centerArc = meta.data[0];
        const x = centerArc.x;
        const y = centerArc.y;
        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (activeHoverText) {
          ctx.font = '700 22px Outfit, sans-serif';
          ctx.fillStyle = activeHoverText.color;
          ctx.fillText(activeHoverText.count.toString(), x, y - 8);

          ctx.font = '600 10px Outfit, sans-serif';
          ctx.fillStyle = textColor;
          ctx.fillText(activeHoverText.label.toUpperCase(), x, y + 12);
        } else {
          ctx.font = '700 24px Outfit, sans-serif';
          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          ctx.fillText(isZero ? '0' : total.toString(), x, y - 8);

          ctx.font = '600 10px Outfit, sans-serif';
          ctx.fillStyle = textColor;
          ctx.fillText(isZero ? 'NO CASES' : 'TOTAL CASES', x, y + 12);
        }

        ctx.restore();
      }
    };

    this.statusChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: statuses,
        datasets: [{
          data: isZero ? [1] : counts,
          backgroundColor: isZero ? [isDark ? '#1e293b' : '#e2e8f0'] : colors,
          borderWidth: 2,
          borderColor: borderColor,
          hoverOffset: isZero ? 0 : 5
        }]
      },
      plugins: [centerPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        onHover: (event, activeElements) => {
          if (activeElements && activeElements.length > 0 && !isZero) {
            const idx = activeElements[0].index;
            activeHoverText = {
              label: statuses[idx],
              count: counts[idx],
              color: colors[idx]
            };
          } else {
            activeHoverText = null;
          }
          if (this.statusChartInstance) this.statusChartInstance.draw();
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 9,
              font: { size: 11, family: 'Outfit, sans-serif', weight: '500' },
              color: textColor,
              generateLabels(chart) {
                if (isZero) {
                  return [{
                    text: 'No Complaints Logged',
                    fillStyle: isDark ? '#1e293b' : '#e2e8f0',
                    strokeStyle: borderColor,
                    pointStyle: 'circle'
                  }];
                }
                return statuses.map((label, i) => ({
                  text: `${label} (${counts[i]})`,
                  fillStyle: colors[i],
                  strokeStyle: colors[i],
                  lineWidth: 0,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                }));
              }
            }
          },
          tooltip: {
            enabled: !isZero,
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            usePointStyle: true,
            callbacks: {
              label(ctx) {
                const val = ctx.raw || 0;
                const pct = total ? Math.round((val / total) * 100) : 0;
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },

  renderPriorityDonut(pri = {}) {
    this.priorityDistData = pri;
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('dash-priority-canvas');
    if (!canvas) return;

    if (this.priorityChartInstance) {
      this.priorityChartInstance.destroy();
      this.priorityChartInstance = null;
    }

    const priorities = ['Urgent', 'High', 'Medium', 'Low'];
    const counts = priorities.map(p => Number(pri[p] || 0));
    const total = counts.reduce((a, b) => a + b, 0);
    const colors = ['#ef4444', '#f59e0b', '#0284c7', '#64748b'];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const borderColor = isDark ? '#111a2e' : '#ffffff';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const isZero = total === 0;

    let activeHoverText = null;

    const centerPlugin = {
      id: 'dashPriorityCenterText',
      afterDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;
        const centerArc = meta.data[0];
        const x = centerArc.x;
        const y = centerArc.y;
        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (activeHoverText) {
          ctx.font = '700 22px Outfit, sans-serif';
          ctx.fillStyle = activeHoverText.color;
          ctx.fillText(activeHoverText.count.toString(), x, y - 8);

          ctx.font = '600 10px Outfit, sans-serif';
          ctx.fillStyle = textColor;
          ctx.fillText(activeHoverText.label.toUpperCase(), x, y + 12);
        } else {
          ctx.font = '700 24px Outfit, sans-serif';
          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          ctx.fillText(isZero ? '0' : total.toString(), x, y - 8);

          ctx.font = '600 10px Outfit, sans-serif';
          ctx.fillStyle = textColor;
          ctx.fillText(isZero ? 'NO CASES' : 'TOTAL CASES', x, y + 12);
        }

        ctx.restore();
      }
    };

    this.priorityChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: priorities,
        datasets: [{
          data: isZero ? [1] : counts,
          backgroundColor: isZero ? [isDark ? '#1e293b' : '#e2e8f0'] : colors,
          borderWidth: 2,
          borderColor: borderColor,
          hoverOffset: isZero ? 0 : 5
        }]
      },
      plugins: [centerPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        onHover: (event, activeElements) => {
          if (activeElements && activeElements.length > 0 && !isZero) {
            const idx = activeElements[0].index;
            activeHoverText = {
              label: priorities[idx],
              count: counts[idx],
              color: colors[idx]
            };
          } else {
            activeHoverText = null;
          }
          if (this.priorityChartInstance) this.priorityChartInstance.draw();
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 10,
              font: { size: 11, family: 'Outfit, sans-serif', weight: '500' },
              color: textColor,
              generateLabels(chart) {
                if (isZero) {
                  return [{
                    text: 'No Priority Cases',
                    fillStyle: isDark ? '#1e293b' : '#e2e8f0',
                    strokeStyle: borderColor,
                    pointStyle: 'circle'
                  }];
                }
                return priorities.map((label, i) => ({
                  text: `${label} (${counts[i]})`,
                  fillStyle: colors[i],
                  strokeStyle: colors[i],
                  lineWidth: 0,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                }));
              }
            }
          },
          tooltip: {
            enabled: !isZero,
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            usePointStyle: true,
            callbacks: {
              label(ctx) {
                const val = ctx.raw || 0;
                const pct = total ? Math.round((val / total) * 100) : 0;
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },

  renderStatusBars(dist = {}) {
    this.statusDistData = dist;
    const container = document.getElementById('status-bars-container');
    if (!container) return;

    const statuses = [
      { name: 'Submitted', desc: 'Awaiting Triage', color: '#64748b', icon: 'inbox' },
      { name: 'Under Review', desc: 'Initial Review', color: '#f59e0b', icon: 'clock' },
      { name: 'Assigned', desc: 'Investigator Assigned', color: '#0284c7', icon: 'user-check' },
      { name: 'In Progress', desc: 'Active Investigation', color: '#6366f1', icon: 'refresh-cw' },
      { name: 'Resolved', desc: 'Resolution Verified', color: '#10b981', icon: 'check-circle-2' },
      { name: 'Closed', desc: 'Officially Closed', color: '#94a3b8', icon: 'check' },
      { name: 'Escalated', desc: 'SLA Escalation', color: '#ef4444', icon: 'alert-triangle' },
      { name: 'Rejected', desc: 'Non-Admissible', color: '#dc2626', icon: 'x' }
    ];

    const total = Object.values(dist).reduce((a, b) => a + Number(b), 0);
    const safeTotal = total > 0 ? total : 1;

    container.innerHTML = statuses.map(s => {
      const count = Number(dist[s.name] || 0);
      const pct = total ? Math.round((count / safeTotal) * 100) : 0;
      const iconSvg = typeof Icons !== 'undefined' ? Icons.create(s.icon, 13) : '';

      return `
        <div class="dash-bar-row" onclick="window.location.href='complaints.html?status=${encodeURIComponent(s.name)}'" title="Filter by ${s.name} status">
          <div class="dash-bar-header">
            <div class="dash-bar-label-group">
              <span class="dash-bar-icon" style="background:${s.color}22; color:${s.color};">
                ${iconSvg}
              </span>
              <div class="dash-bar-text">
                <span class="dash-bar-name">${s.name}</span>
                <span class="dash-bar-sub">• ${s.desc}</span>
              </div>
            </div>
            <div class="dash-bar-stats">
              <span class="dash-bar-count">${count}</span>
              <span class="dash-bar-pct">(${pct}%)</span>
            </div>
          </div>
          <div class="dash-bar-track">
            <div class="dash-bar-fill" style="width:${pct}%; background:${s.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderPriorityBars(pri = {}) {
    this.priorityDistData = pri;
    const container = document.getElementById('priority-bars-container');
    if (!container) return;

    const priorities = [
      { name: 'Urgent', sla: '< 24 Hours • Critical', color: '#ef4444', icon: 'alert-circle' },
      { name: 'High', sla: '48 Hours • Priority', color: '#f59e0b', icon: 'alert-triangle' },
      { name: 'Medium', sla: '5 Days • Standard', color: '#0284c7', icon: 'clock' },
      { name: 'Low', sla: '7 Days • Routine', color: '#64748b', icon: 'check' }
    ];

    const total = Object.values(pri).reduce((a, b) => a + Number(b), 0);
    const safeTotal = total > 0 ? total : 1;

    container.innerHTML = priorities.map(p => {
      const count = Number(pri[p.name] || 0);
      const pct = total ? Math.round((count / safeTotal) * 100) : 0;
      const iconSvg = typeof Icons !== 'undefined' ? Icons.create(p.icon, 13) : '';

      return `
        <div class="dash-bar-row" onclick="window.location.href='complaints.html?priority=${encodeURIComponent(p.name)}'" title="Filter by ${p.name} priority">
          <div class="dash-bar-header">
            <div class="dash-bar-label-group">
              <span class="dash-bar-icon" style="background:${p.color}22; color:${p.color};">
                ${iconSvg}
              </span>
              <div class="dash-bar-text">
                <span class="dash-bar-name">${p.name}</span>
                <span class="dash-bar-sub">• SLA: ${p.sla}</span>
              </div>
            </div>
            <div class="dash-bar-stats">
              <span class="dash-bar-count">${count}</span>
              <span class="dash-bar-pct">(${pct}%)</span>
            </div>
          </div>
          <div class="dash-bar-track">
            <div class="dash-bar-fill" style="width:${pct}%; background:${p.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  updateStatusFooter(dist = {}) {
    const footerEl = document.getElementById('status-card-footer');
    if (!footerEl) return;

    const total = Object.values(dist).reduce((a, b) => a + Number(b), 0);
    const resolvedCount = (Number(dist['Resolved'] || 0)) + (Number(dist['Closed'] || 0));
    const safeTotal = total > 0 ? total : 1;
    const rate = total ? Math.round((resolvedCount / safeTotal) * 100) : 0;

    footerEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <span data-icon="check-circle-2" data-icon-size="14" style="color:#10b981;"></span>
        <span style="color:var(--color-text-muted);">Redressal Turnaround:</span>
        <strong style="color:var(--color-text-main);">${rate}% Resolved</strong>
      </div>
      <span style="color:var(--color-text-muted); font-size:0.72rem;">${resolvedCount} of ${total} closed</span>
    `;
  },

  updatePriorityFooter(pri = {}) {
    const footerEl = document.getElementById('priority-card-footer');
    if (!footerEl) return;

    const total = Object.values(pri).reduce((a, b) => a + Number(b), 0);
    const urgentCount = Number(pri['Urgent'] || 0);
    const highCount = Number(pri['High'] || 0);
    const criticalCount = urgentCount + highCount;
    const safeTotal = total > 0 ? total : 1;
    const criticalPct = total ? Math.round((criticalCount / safeTotal) * 100) : 0;
    const isWarning = criticalPct > 40;

    footerEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="pulse-dot" style="background:${isWarning ? '#ef4444' : '#10b981'};"></span>
        <span style="color:var(--color-text-muted);">Expedited Attention Load:</span>
        <strong style="color:${isWarning ? '#ef4444' : 'var(--color-text-main)'};">${criticalPct}% Urgent/High</strong>
      </div>
      <span style="color:var(--color-text-muted); font-size:0.72rem;">${criticalCount} of ${total} cases</span>
    `;
  },

  // ==========================================
  // ROLE-SPECIFIC WORKSPACE RENDERERS
  // ==========================================

  renderRoleWorkspace(roleData = {}, fullData = {}) {
    const container = document.getElementById('dash-role-workspace');
    if (!container) return;

    const role = (this.user?.role_slug || 'student').toLowerCase();
    switch (role) {
      case 'student':
        this.renderStudentWorkspace(container, roleData, fullData);
        break;
      case 'faculty':
        this.renderFacultyWorkspace(container, roleData, fullData);
        break;
      case 'hod':
        this.renderHodWorkspace(container, roleData, fullData);
        break;
      case 'officer':
        this.renderOfficerWorkspace(container, roleData, fullData);
        break;
      case 'admin':
        this.renderAdminWorkspace(container, roleData, fullData);
        break;
      case 'auditor':
        this.renderAuditorWorkspace(container, roleData, fullData);
        break;
      default:
        container.innerHTML = '';
        break;
    }

    if (typeof Icons !== 'undefined') {
      Icons.renderPageIcons();
    }
  },

  // 1. STUDENT WORKSPACE
  renderStudentWorkspace(container, roleData, fullData) {
    const pendingRatings = roleData.pending_ratings || [];
    let feedbackBannerHtml = '';

    if (pendingRatings.length > 0) {
      feedbackBannerHtml = `
        <div class="card" style="margin-bottom:var(--space-6); background:linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%); border-left:4px solid #f59e0b; border-color:rgba(245, 158, 11, 0.3);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-3); margin-bottom:var(--space-3);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge" style="background:#f59e0b; color:#ffffff; font-weight:700;">Feedback Awaiting</span>
              <strong style="color:var(--color-text-main); font-size:var(--font-size-md);">Your Grievances Have Been Resolved</strong>
            </div>
            <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${pendingRatings.length} pending review</span>
          </div>
          <p style="font-size:var(--font-size-xs); color:var(--color-text-muted); margin-bottom:var(--space-4);">
            Help us verify resolution quality. Your feedback directly impacts institutional response accountability.
          </p>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:var(--space-3);">
            ${pendingRatings.map(c => `
              <div style="padding:var(--space-3); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center; gap:var(--space-2);">
                <div>
                  <div style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; color:var(--color-primary);">${c.reference_number}</div>
                  <div style="font-weight:600; font-size:0.85rem; color:var(--color-text-main);">${c.title}</div>
                  <div style="font-size:0.7rem; color:var(--color-text-muted);">${c.category_name} • Resolved ${app.formatDateShort(c.resolved_at)}</div>
                </div>
                <a href="complaint-details.html?ref=${encodeURIComponent(c.reference_number)}#feedback-section" class="btn btn-primary btn-sm" style="flex-shrink:0;">
                  Rate Case →
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      ${feedbackBannerHtml}
      <div class="dash-grid-2col">
        <!-- Student Guidance & Submission Card -->
        <div class="card" style="border-left:4px solid var(--color-primary); height:100%; display:flex; flex-direction:column;">
          <div class="card-header" style="margin-bottom:var(--space-3); padding-bottom:var(--space-3); flex-shrink:0;">
            <div>
              <h3 class="card-title" style="font-size:1rem; display:flex; align-items:center; gap:8px;">
                <span data-icon="file-plus" data-icon-size="18" style="color:var(--color-primary);"></span>
                Student Grievance Services
              </h3>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Institutional channels for transparent redressal</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:var(--space-3); flex:1; justify-content:space-between;">
            <div style="padding:var(--space-3); border-radius:var(--radius-md); background:var(--color-surface-hover); display:flex; align-items:center; justify-content:space-between;">
              <div>
                <strong style="font-size:0.85rem; color:var(--color-text-main); display:block;">File General Grievance</strong>
                <span style="font-size:0.75rem; color:var(--color-text-muted);">Academics, exams, labs, hostels, fee matters</span>
              </div>
              <a href="submit-complaint.html" class="btn btn-primary btn-sm">File Grievance</a>
            </div>
            <div style="padding:var(--space-3); border-radius:var(--radius-md); background:var(--color-surface-hover); display:flex; align-items:center; justify-content:space-between;">
              <div>
                <strong style="font-size:0.85rem; color:var(--color-text-main); display:block;">Confidential Disclosures</strong>
                <span style="font-size:0.75rem; color:var(--color-text-muted);">Direct escalation to Central Redressal Officer</span>
              </div>
              <a href="submit-complaint.html?confidential=1" class="btn btn-secondary btn-sm">Discreet Filing</a>
            </div>
            <div style="padding:var(--space-3); border-radius:var(--radius-md); background:var(--color-surface-hover); display:flex; align-items:center; justify-content:space-between;">
              <div>
                <strong style="font-size:0.85rem; color:var(--color-text-main); display:block;">Track Submissions</strong>
                <span style="font-size:0.75rem; color:var(--color-text-muted);">Follow status milestones and official responses</span>
              </div>
              <a href="complaints.html" class="btn btn-ghost btn-sm">View History →</a>
            </div>
          </div>
        </div>

        <!-- Student Anti-Bias & Shield Notice -->
        <div class="card" style="border-left:4px solid #10b981; height:100%; display:flex; flex-direction:column;">
          <div class="card-header" style="margin-bottom:var(--space-3); padding-bottom:var(--space-3); flex-shrink:0;">
            <div>
              <h3 class="card-title" style="font-size:1rem; display:flex; align-items:center; gap:8px;">
                <span data-icon="shield" data-icon-size="18" style="color:#10b981;"></span>
                Anti-Bias & Privacy Protection
              </h3>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">UGC & AICTE Grievance Compliance</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:var(--space-3); font-size:var(--font-size-xs); color:var(--color-text-muted); flex:1; justify-content:space-between;">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#10b981; font-weight:bold;">✓</span>
              <div>
                <strong style="color:var(--color-text-main);">Staff Identity Shielding:</strong>
                Investigating staff identities remain shielded to ensure completely unbiased communication and prevent retaliation.
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#10b981; font-weight:bold;">✓</span>
              <div>
                <strong style="color:var(--color-text-main);">Strict Scoping:</strong>
                Students may strictly access only their personal complaints. Other student records are partitioned at the database layer.
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#10b981; font-weight:bold;">✓</span>
              <div>
                <strong style="color:var(--color-text-main);">Resolution Rating Rights:</strong>
                You hold the authority to rate grievance resolution satisfaction and request re-investigation within 7 days of closure.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 2. FACULTY / STAFF WORKSPACE
  renderFacultyWorkspace(container, roleData, fullData) {
    const queue = roleData.assigned_queue || [];

    let tableRows = '';
    if (queue.length === 0) {
      tableRows = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2.5rem; color:var(--color-text-muted);">
            <div style="display:inline-flex; width:48px; height:48px; border-radius:var(--radius-full); background:var(--color-surface-hover); align-items:center; justify-content:center; margin-bottom:8px;">
              <span data-icon="check-circle-2" data-icon-size="24" style="color:#10b981;"></span>
            </div>
            <h4 style="color:var(--color-text-main); margin-bottom:4px;">No Pending Assigned Work</h4>
            <p style="font-size:var(--font-size-xs); margin:0;">All grievances assigned to your desk have been actively investigated or resolved.</p>
          </td>
        </tr>
      `;
    } else {
      tableRows = queue.map(c => {
        const isOverdue = c.due_date && new Date(c.due_date) < new Date() && !['Resolved', 'Closed', 'Rejected'].includes(c.status);
        const dueBadge = isOverdue
          ? `<span class="badge" style="background:var(--color-danger-bg); color:var(--color-danger); border:1px solid var(--color-danger-border); font-size:0.7rem;"><span data-icon="alert-triangle" data-icon-size="10"></span> Overdue SLA</span>`
          : `<span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${app.formatDateShort(c.due_date)}</span>`;

        let actionButtons = '';
        if (c.status === 'Assigned') {
          actionButtons = `
            <button class="btn btn-primary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="dashboard.startInvestigation('${c.reference_number}')" title="Acknowledge and mark in-progress">
              <span data-icon="play" data-icon-size="12"></span> Start
            </button>
          `;
        } else if (c.status === 'In Progress') {
          actionButtons = `
            <button class="btn btn-success btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="dashboard.openResolveModal('${c.reference_number}')" title="Implement resolution">
              <span data-icon="check" data-icon-size="12"></span> Resolve
            </button>
          `;
        }

        return `
          <tr style="cursor:pointer;" onclick="window.location.href='complaint-details.html?ref=${encodeURIComponent(c.reference_number)}'">
            <td><strong style="color:var(--color-primary); font-family:var(--font-mono); font-size:0.8rem;">${c.reference_number}</strong></td>
            <td>
              <div style="font-weight:600; font-size:0.85rem; color:var(--color-text-main);">${c.title}</div>
              <div style="font-size:0.7rem; color:var(--color-text-muted);">${c.category_name} • Complainant: ${c.student_name}</div>
            </td>
            <td>${app.getPriorityBadge(c.priority)}</td>
            <td>${dueBadge}</td>
            <td>${app.getStatusBadge(c.status)}</td>
            <td style="text-align:right;" onclick="event.stopPropagation();">
              <div style="display:flex; justify-content:flex-end; gap:4px;">
                ${actionButtons}
                <a href="complaint-details.html?ref=${encodeURIComponent(c.reference_number)}" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
                  Details
                </a>
                <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem; color:var(--color-danger);" onclick="dashboard.openEscalateModal('${c.reference_number}')" title="Escalate to HOD / Officer">
                  <span data-icon="alert-triangle" data-icon-size="14"></span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="card" style="border-left:4px solid #10b981;">
        <div class="card-header" style="flex-wrap:wrap; gap:var(--space-3);">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span data-icon="clipboard-list" data-icon-size="20" style="color:#10b981;"></span>
              <h3 class="card-title" style="font-size:1.15rem;">Faculty Investigation Desk</h3>
              <span class="badge" style="background:var(--color-success-bg); color:var(--color-success-text); font-size:0.72rem;">${queue.length} Active Tasks</span>
            </div>
            <p style="font-size:var(--font-size-xs); color:var(--color-text-muted); margin-top:2px;">
              Complaints directly assigned to your desk requiring active investigation, student communication, and resolution.
            </p>
          </div>
          <div style="display:flex; gap:6px;">
            <a href="complaints.html?status=In Progress" class="btn btn-secondary btn-sm">Active Investigations (${fullData.metrics?.in_progress || 0})</a>
            <a href="complaints.html" class="btn btn-ghost btn-sm">All Assigned →</a>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ref ID</th>
                <th>Subject & Complainant</th>
                <th>Priority</th>
                <th>SLA Target</th>
                <th>Current Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 3. DEPARTMENT COORDINATOR / HOD WORKSPACE
  renderHodWorkspace(container, roleData, fullData) {
    const unassigned = roleData.unassigned_queue || [];
    const faculty = roleData.department_faculty || [];

    let unassignedRows = '';
    if (unassigned.length === 0) {
      unassignedRows = `
        <tr>
          <td colspan="5" style="text-align:center; padding:2rem; color:var(--color-text-muted);">
            <div style="display:inline-flex; width:42px; height:42px; border-radius:50%; background:var(--color-surface-hover); align-items:center; justify-content:center; margin-bottom:6px;">
              <span data-icon="check" data-icon-size="20" style="color:#10b981;"></span>
            </div>
            <div style="font-weight:600; color:var(--color-text-main);">Triage Queue Cleared</div>
            <p style="font-size:var(--font-size-xs); margin:0;">All departmental grievances have been assigned to faculty investigators.</p>
          </td>
        </tr>
      `;
    } else {
      unassignedRows = unassigned.map(c => `
        <tr>
          <td><strong style="color:var(--color-primary); font-family:var(--font-mono); font-size:0.8rem;">${c.reference_number}</strong></td>
          <td>
            <div style="font-weight:600; font-size:0.85rem; color:var(--color-text-main);">${c.title}</div>
            <div style="font-size:0.7rem; color:var(--color-text-muted);">${c.category_name} • ${c.student_name}</div>
          </td>
          <td>${app.getPriorityBadge(c.priority)}</td>
          <td><span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${app.formatDateShort(c.created_at)}</span></td>
          <td style="text-align:right;">
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:4px;">
              <select id="assign-sel-${c.reference_number}" class="form-control" style="font-size:0.75rem; padding:0.25rem 0.5rem; width:160px; height:32px;">
                <option value="">Select Faculty...</option>
                ${faculty.map(f => `<option value="${f.id}">${f.full_name} (${f.active_cases} active)</option>`).join('')}
              </select>
              <button class="btn btn-primary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem; height:32px;" onclick="dashboard.quickAssignFaculty('${c.reference_number}')">
                Assign
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    const facultyRows = faculty.map(f => {
      let loadBadge = `<span class="badge" style="background:var(--color-success-bg); color:var(--color-success-text); font-size:0.7rem;">Available (0)</span>`;
      if (f.active_cases > 0 && f.active_cases <= 2) {
        loadBadge = `<span class="badge" style="background:var(--color-primary-light); color:var(--color-primary); font-size:0.7rem;">Optimal (${f.active_cases})</span>`;
      } else if (f.active_cases > 2) {
        loadBadge = `<span class="badge" style="background:var(--color-warning-bg); color:var(--color-warning-text); font-size:0.7rem;">Heavy (${f.active_cases})</span>`;
      }

      return `
        <tr>
          <td>
            <div style="font-weight:600; font-size:0.82rem; color:var(--color-text-main);">${f.full_name}</div>
            <div style="font-size:0.7rem; color:var(--color-text-muted);">${f.email}</div>
          </td>
          <td>${loadBadge}</td>
          <td style="font-size:0.78rem; font-weight:600; color:var(--color-text-main);">${f.resolved_cases} cases</td>
          <td style="text-align:right;">
            <a href="complaints.html?faculty_id=${f.id}" class="btn btn-ghost btn-sm" style="padding:0.2rem 0.5rem; font-size:0.72rem;">Cases →</a>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="dash-grid-2col">
        <!-- Column 1: Unassigned Triage Queue -->
        <div class="card" style="border-left:4px solid #7c3aed; height:100%; display:flex; flex-direction:column;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3); flex-shrink:0;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span data-icon="inbox" data-icon-size="18" style="color:#7c3aed;"></span>
                <h3 class="card-title" style="font-size:1.05rem;">Department Triage Queue</h3>
                <span class="badge" style="background:rgba(124,58,237,0.12); color:#7c3aed; font-size:0.7rem;">${unassigned.length} Unassigned</span>
              </div>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Cases awaiting allocation to faculty staff</span>
            </div>
          </div>
          <div class="table-responsive" style="flex:1;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Subject & Complainant</th>
                  <th>Priority</th>
                  <th>Submitted</th>
                  <th style="text-align:right;">Assign Staff</th>
                </tr>
              </thead>
              <tbody>
                ${unassignedRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Column 2: Department Faculty Workload Monitor -->
        <div class="card" style="border-left:4px solid #0284c7; height:100%; display:flex; flex-direction:column;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3); flex-shrink:0;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span data-icon="users" data-icon-size="18" style="color:#0284c7;"></span>
                <h3 class="card-title" style="font-size:1.05rem;">Faculty Workload Balance</h3>
                <span class="badge" style="background:var(--color-info-bg); color:var(--color-info-text); font-size:0.7rem;">${faculty.length} Faculty Members</span>
              </div>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Department caseload distribution monitor</span>
            </div>
          </div>
          <div class="table-responsive" style="flex:1;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Faculty Member</th>
                  <th>Workload</th>
                  <th>Resolved</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${facultyRows.length > 0 ? facultyRows : `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">No faculty registered in department.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // 4. GRIEVANCE OFFICER WORKSPACE
  renderOfficerWorkspace(container, roleData, fullData) {
    const escalated = roleData.escalated_queue || [];
    const confidential = roleData.confidential_queue || [];
    const pendingClosure = roleData.pending_closure_queue || [];

    const escalatedRows = escalated.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">No escalated grievances currently active across campus.</td></tr>`
      : escalated.map(c => `
          <tr style="cursor:pointer;" onclick="window.location.href='complaint-details.html?ref=${encodeURIComponent(c.reference_number)}'">
            <td><strong style="color:var(--color-danger); font-family:var(--font-mono); font-size:0.8rem;">${c.reference_number}</strong></td>
            <td>
              <div style="font-weight:600; font-size:0.85rem; color:var(--color-text-main);">${c.title}</div>
              <div style="font-size:0.7rem; color:var(--color-text-muted);">${c.department_name} • ${c.category_name}</div>
            </td>
            <td>${app.getPriorityBadge(c.priority)}</td>
            <td style="font-size:0.78rem; color:var(--color-text-muted);">${c.faculty_name || 'Unassigned'}</td>
            <td><span class="badge badge-escalated">Escalated</span></td>
            <td style="text-align:right;" onclick="event.stopPropagation();">
              <a href="complaint-details.html?ref=${encodeURIComponent(c.reference_number)}" class="btn btn-primary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
                Review Case
              </a>
            </td>
          </tr>
        `).join('');

    const confidentialRows = confidential.length === 0
      ? `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">No confidential grievance filings requiring clearance.</td></tr>`
      : confidential.map(c => `
          <tr style="cursor:pointer;" onclick="window.location.href='complaint-details.html?ref=${encodeURIComponent(c.reference_number)}'">
            <td><strong style="color:var(--color-warning-text); font-family:var(--font-mono); font-size:0.8rem;">${c.reference_number}</strong></td>
            <td>
              <div style="font-weight:600; font-size:0.85rem; color:var(--color-text-main);">${c.title}</div>
              <div style="font-size:0.7rem; color:var(--color-text-muted);">${c.department_name} • ${c.category_name}</div>
            </td>
            <td>${app.getPriorityBadge(c.priority)}</td>
            <td>${app.getStatusBadge(c.status)}</td>
            <td style="text-align:right;" onclick="event.stopPropagation();">
              <a href="complaint-details.html?ref=${encodeURIComponent(c.reference_number)}" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
                Discreet Review →
              </a>
            </td>
          </tr>
        `).join('');

    const closureRows = pendingClosure.length === 0
      ? `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">All resolved grievances have been officially verified and closed.</td></tr>`
      : pendingClosure.map(c => `
          <tr>
            <td><strong style="color:var(--color-success); font-family:var(--font-mono); font-size:0.8rem;">${c.reference_number}</strong></td>
            <td>
              <div style="font-weight:600; font-size:0.85rem; color:var(--color-text-main);">${c.title}</div>
              <div style="font-size:0.7rem; color:var(--color-text-muted);">${c.department_name} • Resolver: ${c.resolver_name || 'Staff'}</div>
              <div style="font-size:0.72rem; color:var(--color-text-main); background:var(--color-surface-hover); padding:3px 6px; border-radius:4px; margin-top:3px;">
                "${(c.resolution_summary || 'Resolution recorded').slice(0, 80)}..."
              </div>
            </td>
            <td><span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${app.formatDateShort(c.resolved_at)}</span></td>
            <td><span class="badge badge-resolved">Resolved</span></td>
            <td style="text-align:right;">
              <div style="display:flex; justify-content:flex-end; gap:4px;">
                <button class="btn btn-success btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="dashboard.quickOfficialClose('${c.reference_number}')" title="Approve and officially close grievance">
                  <span data-icon="check-circle-2" data-icon-size="12"></span> Close
                </button>
                <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:var(--color-warning-text);" onclick="dashboard.openReopenModal('${c.reference_number}')" title="Request clarification / return to review">
                  Clarify
                </button>
              </div>
            </td>
          </tr>
        `).join('');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:var(--space-6);">
        <!-- Row 1: Split Escalation and Confidential Authorities -->
        <div class="dash-grid-2col">
          <!-- Escalated Grievance Management -->
          <div class="card" style="border-left:4px solid #ef4444; height:100%; display:flex; flex-direction:column;">
            <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3); flex-shrink:0;">
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span data-icon="alert-triangle" data-icon-size="18" style="color:#ef4444;"></span>
                  <h3 class="card-title" style="font-size:1.05rem;">Campus Escalation Command</h3>
                  <span class="badge" style="background:var(--color-danger-bg); color:var(--color-danger); font-size:0.7rem;">${escalated.length} Cases</span>
                </div>
                <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">SLA breach & cross-department escalations</span>
              </div>
            </div>
            <div class="table-responsive" style="flex:1;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Subject & Dept</th>
                    <th>Priority</th>
                    <th>Investigator</th>
                    <th>Status</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${escalatedRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Confidential Grievance Queue -->
          <div class="card" style="border-left:4px solid #d97706; height:100%; display:flex; flex-direction:column;">
            <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3); flex-shrink:0;">
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span data-icon="lock" data-icon-size="18" style="color:#d97706;"></span>
                  <h3 class="card-title" style="font-size:1.05rem;">Authorized Confidential Cell</h3>
                  <span class="badge" style="background:rgba(217,119,6,0.12); color:#d97706; font-size:0.7rem;">${confidential.length} Protected</span>
                </div>
                <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Discreet anti-harassment & protected filings</span>
              </div>
            </div>
            <div class="table-responsive" style="flex:1;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Subject & Dept</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${confidentialRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Row 2: Official Case Closure & Final Verification Desk -->
        <div class="card" style="border-left:4px solid #10b981;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3);">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span data-icon="check-circle-2" data-icon-size="18" style="color:#10b981;"></span>
                <h3 class="card-title" style="font-size:1.05rem;">Case Verification & Official Closure</h3>
                <span class="badge" style="background:var(--color-success-bg); color:var(--color-success-text); font-size:0.7rem;">${pendingClosure.length} Awaiting Final Sign-Off</span>
              </div>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Review investigator resolutions and issue formal closure certifications</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Grievance & Resolution Details</th>
                  <th>Resolved Date</th>
                  <th>Stage</th>
                  <th style="text-align:right;">Official Actions</th>
                </tr>
              </thead>
              <tbody>
                ${closureRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // 5. SYSTEM ADMINISTRATOR WORKSPACE
  renderAdminWorkspace(container, roleData, fullData) {
    const rolesBreakdown = roleData.user_roles_breakdown || [];
    const securityEvents = roleData.recent_security_events || [];
    const counts = roleData.system_counts || {};

    const roleCardsHtml = rolesBreakdown.map(r => `
      <div style="padding:var(--space-3); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase; font-weight:700;">${r.role_name}</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--color-text-main); line-height:1.2;">${r.user_count}</div>
        </div>
        <a href="users.html?role=${encodeURIComponent(r.role_slug)}" class="btn btn-ghost btn-sm" style="font-size:0.72rem; padding:0.2rem 0.5rem;">Manage</a>
      </div>
    `).join('');

    const auditRows = securityEvents.length === 0
      ? `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">No security events recorded.</td></tr>`
      : securityEvents.map(e => `
          <tr>
            <td style="font-family:var(--font-mono); font-size:0.72rem; color:var(--color-text-muted);">${app.formatDate(e.created_at)}</td>
            <td>
              <div style="font-weight:600; font-size:0.8rem; color:var(--color-text-main);">${e.full_name}</div>
              <div style="font-size:0.68rem; color:var(--color-text-muted); font-family:var(--font-mono);">${e.username} • IP: ${e.ip_address || 'local'}</div>
            </td>
            <td><span class="badge" style="font-family:var(--font-mono); font-size:0.68rem; background:var(--color-surface-hover); border:1px solid var(--color-border);">${e.action}</span></td>
            <td style="font-size:0.75rem; color:var(--color-text-muted);">${e.entity_type} #${e.entity_id || '—'}</td>
            <td style="font-size:0.75rem; color:var(--color-text-muted);">${e.details || '—'}</td>
          </tr>
        `).join('');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:var(--space-6);">
        <!-- Platform Infrastructure Metrics -->
        <div class="card" style="border-left:4px solid #ef4444;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3);">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span data-icon="shield" data-icon-size="18" style="color:#ef4444;"></span>
                <h3 class="card-title" style="font-size:1.05rem;">Platform Governance & User Census</h3>
                <span class="badge" style="background:var(--color-danger-bg); color:var(--color-danger); font-size:0.7rem;">${counts.active_users || 0} Active Accounts</span>
              </div>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Infrastructure inventory and RBAC user distribution</span>
            </div>
            <div style="display:flex; gap:6px;">
              <a href="users.html" class="btn btn-secondary btn-sm"><span data-icon="users" data-icon-size="14"></span> All Users</a>
              <a href="roles.html" class="btn btn-primary btn-sm"><span data-icon="shield" data-icon-size="14"></span> RBAC Matrix</a>
            </div>
          </div>
          <div class="dash-census-grid">
            ${roleCardsHtml}
          </div>
          <div style="display:flex; gap:var(--space-4); flex-wrap:wrap; padding-top:var(--space-3); border-top:1px solid var(--color-border); font-size:0.75rem; color:var(--color-text-muted);">
            <span>Departments: <strong style="color:var(--color-text-main);">${counts.total_departments || 0}</strong></span>
            <span>•</span>
            <span>Categories: <strong style="color:var(--color-text-main);">${counts.total_categories || 0}</strong></span>
            <span>•</span>
            <span>Immutable Audit Logs: <strong style="color:var(--color-text-main);">${counts.total_audits || 0}</strong></span>
            <span>•</span>
            <span style="color:var(--color-primary); font-weight:600;">Privacy Principle: Complaint bodies remain shielded to handlers</span>
          </div>
        </div>

        <!-- Security & Access Audit Live Feed -->
        <div class="card" style="border-left:4px solid #64748b;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3);">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span data-icon="file-text" data-icon-size="18" style="color:#64748b;"></span>
                <h3 class="card-title" style="font-size:1.05rem;">Live Security Audit Trail</h3>
                <span class="badge" style="background:var(--color-surface-hover); border:1px solid var(--color-border); font-size:0.7rem;">Real-Time</span>
              </div>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Protected log of authentication, role mutations, and workflow events</span>
            </div>
            <a href="audit-logs.html" class="btn btn-ghost btn-sm">Full Audit Trail →</a>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor & IP</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${auditRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // 6. AUDITOR WORKSPACE
  renderAuditorWorkspace(container, roleData, fullData) {
    const compliance = roleData.compliance_summary || {};
    const catPerf = roleData.category_compliance || [];
    this.auditorTrailData = roleData.recent_audit_trail || [];

    const categoryRows = catPerf.map(cat => {
      const total = Number(cat.total_complaints || 0);
      const onTime = Number(cat.on_time || 0);
      const breaches = Number(cat.overdue_breaches || 0);
      const pct = total > 0 ? Math.round((onTime / Math.max(1, onTime + breaches)) * 100) : 100;
      const isHighCompliance = pct >= 80;

      return `
        <tr>
          <td><strong style="color:var(--color-text-main); font-size:0.82rem;">${cat.name}</strong></td>
          <td style="font-size:0.78rem; color:var(--color-text-muted);">${cat.sla_days} Days</td>
          <td style="font-weight:600; font-size:0.82rem;">${total}</td>
          <td style="color:#10b981; font-weight:600; font-size:0.82rem;">${onTime}</td>
          <td style="color:${breaches > 0 ? '#ef4444' : 'var(--color-text-muted)'}; font-weight:600; font-size:0.82rem;">${breaches}</td>
          <td>
            <span class="badge" style="background:${isHighCompliance ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}; color:${isHighCompliance ? 'var(--color-success-text)' : 'var(--color-danger)'}; font-size:0.7rem;">
              ${pct}% Compliance
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const auditRows = this.auditorTrailData.map(item => `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.72rem; color:var(--color-text-muted);">${app.formatDate(item.created_at)}</td>
        <td>
          <div style="font-weight:600; font-size:0.8rem; color:var(--color-text-main);">${item.full_name || item.username}</div>
          <div style="font-size:0.68rem; color:var(--color-text-muted);">${item.username}</div>
        </td>
        <td><span class="badge" style="font-family:var(--font-mono); font-size:0.68rem; background:var(--color-surface-hover); border:1px solid var(--color-border);">${item.action}</span></td>
        <td style="font-size:0.75rem;">${item.entity_type} #${item.entity_id || '—'}</td>
        <td style="font-family:var(--font-mono); font-size:0.72rem; color:var(--color-text-muted);">${item.ip_address || '—'}</td>
        <td style="font-size:0.75rem; color:var(--color-text-muted);">${item.details || '—'}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:var(--space-6);">
        <!-- Statutory Compliance Scorecard -->
        <div class="card" style="border-left:4px solid #0284c7;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3);">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span data-icon="check-circle-2" data-icon-size="18" style="color:#0284c7;"></span>
                <h3 class="card-title" style="font-size:1.05rem;">Statutory SLA Compliance Bureau</h3>
                <span class="badge" style="background:var(--color-info-bg); color:var(--color-info-text); font-size:0.7rem;">Auditor Read-Only</span>
              </div>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Independent verification of institutional grievance turnaround compliance</span>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="dashboard.exportComplianceReport()">
              <span data-icon="download" data-icon-size="14"></span> Export Compliance Audit (CSV)
            </button>
          </div>

          <div class="dash-scorecard-grid">
            <div style="padding:var(--space-4); border-radius:var(--radius-lg); background:var(--color-surface-hover); text-align:center;">
              <div style="font-size:2.2rem; font-weight:800; color:#10b981; line-height:1;">${compliance.compliance_pct ?? 100}%</div>
              <div style="font-size:0.75rem; font-weight:600; color:var(--color-text-main); margin-top:4px;">Institutional Turnaround Rate</div>
              <div style="font-size:0.68rem; color:var(--color-text-muted);">Resolved strictly within target SLA</div>
            </div>
            <div style="padding:var(--space-4); border-radius:var(--radius-lg); background:var(--color-surface-hover); text-align:center;">
              <div style="font-size:2.2rem; font-weight:800; color:var(--color-primary); line-height:1;">${compliance.on_time_count ?? 0}</div>
              <div style="font-size:0.75rem; font-weight:600; color:var(--color-text-main); margin-top:4px;">On-Time Resolutions</div>
              <div style="font-size:0.68rem; color:var(--color-text-muted);">Met or exceeded SLA milestones</div>
            </div>
            <div style="padding:var(--space-4); border-radius:var(--radius-lg); background:var(--color-surface-hover); text-align:center;">
              <div style="font-size:2.2rem; font-weight:800; color:#ef4444; line-height:1;">${compliance.sla_breaches ?? 0}</div>
              <div style="font-size:0.75rem; font-weight:600; color:var(--color-text-main); margin-top:4px;">SLA Non-Compliance Breaches</div>
              <div style="font-size:0.68rem; color:var(--color-text-muted);">Overdue or delayed resolutions</div>
            </div>
            <div style="padding:var(--space-4); border-radius:var(--radius-lg); background:var(--color-surface-hover); text-align:center;">
              <div style="font-size:2.2rem; font-weight:800; color:var(--color-text-main); line-height:1;">${compliance.total_audit_events ?? 0}</div>
              <div style="font-size:0.75rem; font-weight:600; color:var(--color-text-main); margin-top:4px;">Immutable Audit Events</div>
              <div style="font-size:0.68rem; color:var(--color-text-muted);">Total cryptographic audit entries</div>
            </div>
          </div>
        </div>

        <!-- Category Turnaround Audit Table -->
        <div class="card" style="border-left:4px solid #10b981;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3);">
            <div>
              <h3 class="card-title" style="font-size:1.05rem;">Category SLA Performance Audit</h3>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Statutory redressal turnaround by domain</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Target SLA</th>
                  <th>Audited Cases</th>
                  <th>On-Time</th>
                  <th>Overdue Breaches</th>
                  <th>Compliance Rating</th>
                </tr>
              </thead>
              <tbody>
                ${categoryRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Read-Only Audit Trail Inspector -->
        <div class="card" style="border-left:4px solid #64748b;">
          <div class="card-header" style="flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-3); padding-bottom:var(--space-3);">
            <div>
              <h3 class="card-title" style="font-size:1.05rem;">Immutable Compliance Audit Trail</h3>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">Auditor inspection feed (Mutation disabled by policy)</span>
            </div>
            <div style="position:relative; width:220px;">
              <input type="text" id="auditor-trail-search" class="form-control" placeholder="Search audit trail..." style="font-size:0.75rem; padding:0.35rem 0.7rem;" oninput="dashboard.filterAuditorTrail(this.value)">
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody id="auditor-trail-tbody">
                ${auditRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // DASHBOARD ACTION MODAL & WORKFLOW HANDLERS
  // ==========================================

  openModal(title, bodyHtml, footerHtml) {
    const modalEl = document.getElementById('dash-action-modal');
    const titleEl = document.getElementById('dash-modal-title');
    const bodyEl = document.getElementById('dash-modal-body');
    const footerEl = document.getElementById('dash-modal-footer');
    if (!modalEl || !titleEl || !bodyEl || !footerEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    footerEl.innerHTML = footerHtml;
    modalEl.classList.add('open');

    if (typeof Icons !== 'undefined') {
      Icons.renderPageIcons();
    }
  },

  closeModal() {
    const modalEl = document.getElementById('dash-action-modal');
    if (modalEl) modalEl.classList.remove('open');
  },

  async startInvestigation(ref) {
    try {
      await api.post(`/complaints/${encodeURIComponent(ref)}/update`, {
        status: 'In Progress',
        reason: 'Faculty acknowledged assignment and initiated formal investigation'
      });
      app.showToast(`Grievance [${ref}] status updated to In Progress`, 'success');
      await this.loadSummary();
    } catch (e) {
      app.showToast(e.message || 'Failed to update status', 'error');
    }
  },

  openResolveModal(ref) {
    const bodyHtml = `
      <div class="form-group" style="margin-bottom:1rem;">
        <label class="form-label" style="font-weight:600;">Resolution Summary <span style="color:var(--color-danger);">*</span></label>
        <p style="font-size:var(--font-size-xs); color:var(--color-text-muted); margin-bottom:0.5rem;">
          Provide a clear, detailed summary of the actions taken to resolve this grievance.
        </p>
        <textarea id="modal-resolve-summary" class="form-control" rows="4" placeholder="Enter findings, corrective actions taken, and resolution details..." required></textarea>
      </div>
    `;
    const footerHtml = `
      <button type="button" class="btn btn-secondary" onclick="dashboard.closeModal()">Cancel</button>
      <button type="button" class="btn btn-success" onclick="dashboard.submitResolution('${encodeURIComponent(ref)}')">
        <span data-icon="check-circle-2" data-icon-size="16"></span> Confirm Resolution
      </button>
    `;
    this.openModal(`Resolve Grievance [${ref}]`, bodyHtml, footerHtml);
  },

  async submitResolution(ref) {
    const textarea = document.getElementById('modal-resolve-summary');
    const summary = textarea?.value?.trim();
    if (!summary) {
      app.showToast('Please provide a resolution summary', 'error');
      return;
    }
    try {
      await api.post(`/complaints/${ref}/update`, {
        status: 'Resolved',
        resolution_summary: summary,
        reason: 'Investigation concluded and resolution implemented'
      });
      this.closeModal();
      app.showToast(`Grievance [${decodeURIComponent(ref)}] marked as Resolved`, 'success');
      await this.loadSummary();
    } catch (e) {
      app.showToast(e.message || 'Failed to resolve grievance', 'error');
    }
  },

  openEscalateModal(ref) {
    const bodyHtml = `
      <div class="form-group" style="margin-bottom:1rem;">
        <label class="form-label" style="font-weight:600;">Escalation Reason <span style="color:var(--color-danger);">*</span></label>
        <p style="font-size:var(--font-size-xs); color:var(--color-text-muted); margin-bottom:0.5rem;">
          Explain why this case requires escalation to the Department HOD or Central Grievance Officer.
        </p>
        <textarea id="modal-escalate-reason" class="form-control" rows="3" placeholder="Provide reason for SLA breach, jurisdictional block, or requirement for higher authority review..." required></textarea>
      </div>
    `;
    const footerHtml = `
      <button type="button" class="btn btn-secondary" onclick="dashboard.closeModal()">Cancel</button>
      <button type="button" class="btn btn-danger" onclick="dashboard.submitEscalation('${encodeURIComponent(ref)}')">
        <span data-icon="alert-triangle" data-icon-size="16"></span> Escalate Case
      </button>
    `;
    this.openModal(`Escalate Grievance [${ref}]`, bodyHtml, footerHtml);
  },

  async submitEscalation(ref) {
    const textarea = document.getElementById('modal-escalate-reason');
    const reason = textarea?.value?.trim();
    if (!reason) {
      app.showToast('Please provide an escalation reason', 'error');
      return;
    }
    try {
      await api.post(`/complaints/${ref}/update`, {
        status: 'Escalated',
        reason: reason
      });
      this.closeModal();
      app.showToast(`Grievance [${decodeURIComponent(ref)}] escalated successfully`, 'warning');
      await this.loadSummary();
    } catch (e) {
      app.showToast(e.message || 'Failed to escalate grievance', 'error');
    }
  },

  async quickAssignFaculty(ref) {
    const select = document.getElementById(`assign-sel-${ref}`);
    const facultyId = select?.value;
    if (!facultyId) {
      app.showToast('Please select a faculty investigator from the list', 'error');
      return;
    }
    try {
      await api.post(`/complaints/${encodeURIComponent(ref)}/assign`, {
        assigned_to_user_id: parseInt(facultyId, 10),
        note: 'Assigned by Department Coordinator via Dashboard Quick Triage'
      });
      app.showToast(`Grievance [${ref}] assigned to faculty investigator`, 'success');
      await this.loadSummary();
    } catch (e) {
      app.showToast(e.message || 'Failed to assign grievance', 'error');
    }
  },

  async quickOfficialClose(ref) {
    if (!confirm(`Are you sure you want to officially verify and close grievance [${ref}]?`)) return;
    try {
      await api.post(`/complaints/${encodeURIComponent(ref)}/update`, {
        status: 'Closed',
        reason: 'Officially verified and approved for closure by Central Grievance Officer'
      });
      app.showToast(`Grievance [${ref}] has been officially closed`, 'success');
      await this.loadSummary();
    } catch (e) {
      app.showToast(e.message || 'Failed to close grievance', 'error');
    }
  },

  openReopenModal(ref) {
    const bodyHtml = `
      <div class="form-group" style="margin-bottom:1rem;">
        <label class="form-label" style="font-weight:600;">Re-Investigation / Clarification Reason <span style="color:var(--color-danger);">*</span></label>
        <p style="font-size:var(--font-size-xs); color:var(--color-text-muted); margin-bottom:0.5rem;">
          Specify the clarification needed or reason the previous resolution requires further investigation.
        </p>
        <textarea id="modal-reopen-reason" class="form-control" rows="3" placeholder="Enter instructions for re-investigation..." required></textarea>
      </div>
    `;
    const footerHtml = `
      <button type="button" class="btn btn-secondary" onclick="dashboard.closeModal()">Cancel</button>
      <button type="button" class="btn btn-warning" onclick="dashboard.submitReopen('${encodeURIComponent(ref)}')">
        <span data-icon="refresh-cw" data-icon-size="16"></span> Request Clarification / Reopen
      </button>
    `;
    this.openModal(`Re-Open / Clarification for [${ref}]`, bodyHtml, footerHtml);
  },

  async submitReopen(ref) {
    const textarea = document.getElementById('modal-reopen-reason');
    const reason = textarea?.value?.trim();
    if (!reason) {
      app.showToast('Please provide a reason', 'error');
      return;
    }
    try {
      await api.post(`/complaints/${ref}/update`, {
        status: 'Under Review',
        reason: reason
      });
      this.closeModal();
      app.showToast(`Grievance [${decodeURIComponent(ref)}] returned to Under Review`, 'info');
      await this.loadSummary();
    } catch (e) {
      app.showToast(e.message || 'Failed to update status', 'error');
    }
  },

  auditorTrailData: [],
  filterAuditorTrail(keyword = '') {
    const tbody = document.getElementById('auditor-trail-tbody');
    if (!tbody) return;
    const filtered = (this.auditorTrailData || []).filter(item => {
      const kw = (keyword || '').toLowerCase();
      return (
        (item.action && item.action.toLowerCase().includes(kw)) ||
        (item.username && item.username.toLowerCase().includes(kw)) ||
        (item.full_name && item.full_name.toLowerCase().includes(kw)) ||
        (item.details && item.details.toLowerCase().includes(kw)) ||
        (item.entity_type && item.entity_type.toLowerCase().includes(kw)) ||
        (item.ip_address && item.ip_address.includes(kw))
      );
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">No audit entries matching filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.72rem; color:var(--color-text-muted);">${app.formatDate(item.created_at)}</td>
        <td>
          <div style="font-weight:600; font-size:0.8rem; color:var(--color-text-main);">${item.full_name || item.username}</div>
          <div style="font-size:0.68rem; color:var(--color-text-muted);">${item.username}</div>
        </td>
        <td>
          <span class="badge" style="font-family:var(--font-mono); font-size:0.68rem; background:var(--color-surface-hover); border:1px solid var(--color-border);">${item.action}</span>
        </td>
        <td style="font-size:0.75rem;">${item.entity_type || '—'} #${item.entity_id || '—'}</td>
        <td style="font-family:var(--font-mono); font-size:0.72rem; color:var(--color-text-muted);">${item.ip_address || '—'}</td>
        <td style="font-size:0.75rem; color:var(--color-text-muted);">${item.details || '—'}</td>
      </tr>
    `).join('');
  },

  exportComplianceReport() {
    if (!this.lastFullData || !this.lastFullData.role_data) {
      app.showToast('Compliance data not loaded yet', 'warning');
      return;
    }
    const roleData = this.lastFullData.role_data;
    const summary = roleData.compliance_summary || {};
    const categories = roleData.category_compliance || [];

    let csv = '=== CAMPUSCARE STATUTORY SLA COMPLIANCE AUDIT REPORT ===\r\n';
    csv += `Generated At,${new Date().toISOString()}\r\n`;
    csv += `Auditor Session,${this.user?.full_name || 'Auditor'} (${this.user?.username || 'auditor'})\r\n`;
    csv += `Compliance Rating,${summary.compliance_pct || 100}%\r\n`;
    csv += `Total Cases Audited,${summary.total_audited || 0}\r\n`;
    csv += `Resolved On-Time,${summary.on_time_count || 0}\r\n`;
    csv += `SLA Breaches,${summary.sla_breaches || 0}\r\n`;
    csv += `Total Audit Trail Records,${summary.total_audit_events || 0}\r\n\r\n`;

    csv += 'Category,SLA Days,Total Audited,Resolved On-Time,Overdue Breaches,Compliance Pct\r\n';
    categories.forEach(cat => {
      const total = Number(cat.total_complaints || 0);
      const onTime = Number(cat.on_time || 0);
      const breaches = Number(cat.overdue_breaches || 0);
      const pct = total > 0 ? Math.round((onTime / Math.max(1, onTime + breaches)) * 100) : 100;
      csv += `"${(cat.name || '').replace(/"/g, '""')}",${cat.sla_days || 0},${total},${onTime},${breaches},${pct}%\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `campuscare_sla_compliance_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    app.showToast('Compliance audit report exported successfully', 'success');
  }
};

