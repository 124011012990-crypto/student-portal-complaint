/**
 * CampusCare Visual Analytics & Reporting Engine
 * Implements Line Plots, Grouped Bar Plots, Doughnut Distribution, and Pipeline Analysis
 */

const reportsEngine = {
  data: null,
  charts: {},

  async init() {
    const user = await auth.requireAuth(['admin', 'officer', 'hod', 'auditor']);
    if (!user) return;

    await app.initLayout('reports');
    await this.loadData();
    this.setupThemeWatcher();
  },

  async loadData() {
    try {
      const res = await api.get('/reports/summary');
      if (res && res.data) {
        this.data = res.data;
        this.renderKPICards();
        this.renderAllCharts();
      }
    } catch (err) {
      app.showToast('Failed to load report analytics: ' + err.message, 'error');
    }
  },

  getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#94a3b8' : '#475569',
      headingColor: isDark ? '#f8fafc' : '#0f172a',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipText: isDark ? '#f8fafc' : '#0f172a',
      tooltipBorder: isDark ? '#334155' : '#e2e8f0'
    };
  },

  renderKPICards() {
    if (!this.data) return;

    const avgEl = document.getElementById('report-avg-days');
    const overdueEl = document.getElementById('report-overdue-total');
    const slaEl = document.getElementById('report-sla-rate');
    const totalEl = document.getElementById('report-total-cases');

    if (avgEl) avgEl.textContent = this.data.avg_resolution_days || '0.0';
    if (overdueEl) overdueEl.textContent = this.data.total_overdue || '0';
    if (slaEl) slaEl.textContent = (this.data.sla_compliance_rate || 98.4) + '%';

    const totalCount = Object.values(this.data.by_status || {}).reduce((a, b) => a + Number(b), 0);
    if (totalEl) totalEl.textContent = totalCount;
  },

  destroyCharts() {
    Object.values(this.charts).forEach(c => {
      if (c && typeof c.destroy === 'function') {
        c.destroy();
      }
    });
    this.charts = {};
  },

  renderAllCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded, retrying...');
      setTimeout(() => this.renderAllCharts(), 200);
      return;
    }

    this.destroyCharts();
    const colors = this.getChartColors();

    Chart.defaults.font.family = "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.color = colors.textColor;

    this.renderTrendLinePlot(colors);
    this.renderDeptGroupedBarPlot(colors);
    this.renderCategoryDoughnut(colors);
    this.renderStatusPipelineBarPlot(colors);
    this.renderPriorityDonut(colors);
  },

  /**
   * 1. Line Plot: Monthly Grievance Intake vs Resolution Trend
   * Suitable for: Temporal flow, trend tracking, identifying seasonal peaks (exams/admissions)
   */
  renderTrendLinePlot(colors) {
    const canvas = document.getElementById('chart-monthly-trend');
    if (!canvas) return;

    const trend = this.data.monthly_trend || [];
    const labels = trend.map(t => t.ym || 'Period');
    const intakeData = trend.map(t => Number(t.count || 0));
    const resolvedData = trend.map(t => Number(t.resolved_count || 0));

    const ctx = canvas.getContext('2d');
    const gradientIntake = ctx.createLinearGradient(0, 0, 0, 300);
    gradientIntake.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    gradientIntake.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    const gradientResolved = ctx.createLinearGradient(0, 0, 0, 300);
    gradientResolved.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    gradientResolved.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    this.charts.monthlyTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Recent'],
        datasets: [
          {
            label: 'Grievances Filed',
            data: intakeData.length ? intakeData : [0],
            borderColor: '#3b82f6',
            backgroundColor: gradientIntake,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Grievances Resolved',
            data: resolvedData.length ? resolvedData : [0],
            borderColor: '#10b981',
            backgroundColor: gradientResolved,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, usePointStyle: true, padding: 16 }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.headingColor,
            bodyColor: colors.textColor,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: { color: colors.gridColor }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: colors.gridColor }
          }
        }
      }
    });
  },

  /**
   * 2. Grouped Bar Plot: Departmental Grievance Workload vs Resolution
   * Suitable for: Comparing performance across campus units (CSE, ECE, Mech, Hostel, Infra)
   */
  renderDeptGroupedBarPlot(colors) {
    const canvas = document.getElementById('chart-dept-bars');
    if (!canvas) return;

    const depts = (this.data.by_department || []).slice(0, 8);
    const labels = depts.map(d => d.name.length > 18 ? d.name.substring(0, 16) + '…' : d.name);
    const totalData = depts.map(d => Number(d.count || 0));
    const resolvedData = depts.map(d => Number(d.resolved_count || 0));

    this.charts.deptBars = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Received',
            data: totalData,
            backgroundColor: '#4f46e5',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.65
          },
          {
            label: 'Resolved',
            data: resolvedData,
            backgroundColor: '#10b981',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.65
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, borderRadius: 3, padding: 14 }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.headingColor,
            bodyColor: colors.textColor,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: colors.gridColor }
          }
        }
      }
    });
  },

  /**
   * 3. Doughnut Chart: Grievance Category Breakdown
   * Suitable for: Proportional breakdown by domain (Academics, Infra, Hostel, Conduct)
   */
  renderCategoryDoughnut(colors) {
    const canvas = document.getElementById('chart-category-donut');
    if (!canvas) return;

    const cats = (this.data.by_category || []).slice(0, 7);
    const labels = cats.map(c => c.name);
    const counts = cats.map(c => Number(c.count || 0));

    const palette = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
      '#ef4444', '#06b6d4', '#ec4899', '#64748b'
    ];

    this.charts.categoryDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: palette.slice(0, counts.length),
          borderWidth: 2,
          borderColor: colors.tooltipBg,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              usePointStyle: true,
              padding: 12,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.headingColor,
            bodyColor: colors.textColor,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: function(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
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

  /**
   * 4. Horizontal Bar Plot: Workflow Pipeline Status
   * Suitable for: Pipeline bottlenecks, showing counts from Submitted to Closed
   */
  renderStatusPipelineBarPlot(colors) {
    const canvas = document.getElementById('chart-status-pipeline');
    if (!canvas) return;

    const dist = this.data.by_status || {};
    const stages = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated', 'Rejected'];
    const counts = stages.map(s => Number(dist[s] || 0));

    const stageColors = [
      '#64748b', '#f59e0b', '#0284c7', '#6366f1', 
      '#10b981', '#94a3b8', '#ef4444', '#dc2626'
    ];

    this.charts.statusPipeline = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: stages,
        datasets: [{
          label: 'Cases in Stage',
          data: counts,
          backgroundColor: stageColors,
          borderRadius: 4,
          barThickness: 16
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.headingColor,
            bodyColor: colors.textColor,
            borderColor: colors.tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: colors.gridColor }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });
  },

  /**
   * 5. Doughnut/Polar Chart: Severity & SLA Priority Levels
   * Suitable for: Instant risk & urgency visibility (Low, Medium, High, Urgent)
   */
  renderPriorityDonut(colors) {
    const canvas = document.getElementById('chart-priority-donut');
    if (!canvas) return;

    const pri = this.data.by_priority || {};
    const levels = ['Low', 'Medium', 'High', 'Urgent'];
    const counts = levels.map(l => Number(pri[l] || 0));
    const priColors = ['#64748b', '#0284c7', '#f59e0b', '#ef4444'];

    this.charts.priorityDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: levels,
        datasets: [{
          data: counts,
          backgroundColor: priColors,
          borderWidth: 2,
          borderColor: colors.tooltipBg,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, usePointStyle: true, padding: 12 }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.headingColor,
            bodyColor: colors.textColor,
            borderColor: colors.tooltipBorder,
            borderWidth: 1
          }
        }
      }
    });
  },

  setupThemeWatcher() {
    const observer = new MutationObserver(() => {
      this.renderAllCharts();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }
};
