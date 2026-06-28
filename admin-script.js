const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
  ? 'http://localhost:8080'
  : 'https://status-tracker-api.onrender.com';
const API_HEADERS = {
  get 'Content-Type'() { return 'application/json'; },
  get 'X-User-Email'() { return localStorage.getItem('userEmail') || ''; },
  get 'X-User-Name'() { return localStorage.getItem('userName') || ''; }
};

let allEntries = [];
let adminProgressChart = null;

function formatDateToDdMmmYyyy(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput;
  
  const match = typeof dateInput === 'string' && dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let day, monthIndex, year;
  if (match) {
    year = match[1];
    monthIndex = parseInt(match[2], 10) - 1;
    day = parseInt(match[3], 10);
  } else {
    day = date.getDate();
    monthIndex = date.getMonth();
    year = date.getFullYear();
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIndex];
  const dayStr = String(day).padStart(2, '0');
  
  return `${dayStr}-${monthName}-${year}`;
}

async function checkAdminSession() {
  const email = localStorage.getItem('userEmail') || '';
  const name = localStorage.getItem('userName') || '';
  if (!email || !name) {
    window.location.href = 'index.html';
    return;
  }
  
  const emailLower = email.toLowerCase();
  const isHardcodedAdmin = emailLower === 'vvnair7333@gmail.com';
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: API_HEADERS
    });
    if (response.ok) {
      const result = await response.json();
      if (result && result.success && result.data) {
        const role = result.data.role;
        if (role !== 'ADMIN') {
          window.location.href = 'index.html';
        }
      } else if (!isHardcodedAdmin) {
        window.location.href = 'index.html';
      }
    } else if (!isHardcodedAdmin) {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Failed to verify admin session:', error);
    if (!isHardcodedAdmin) {
      window.location.href = 'index.html';
    }
  }
}
checkAdminSession();

const messageBanner = document.getElementById('admin-message');

function showMessage(msg, isError = false) {
  if (!messageBanner) return;
  messageBanner.textContent = msg;
  messageBanner.style.display = 'block';
  messageBanner.style.background = isError ? 'rgba(248, 113, 113, 0.15)' : 'rgba(74, 222, 128, 0.15)';
  messageBanner.style.color = isError ? '#f87171' : '#4ade80';
  messageBanner.style.border = `1px solid ${isError ? 'rgba(248, 113, 113, 0.3)' : 'rgba(74, 222, 128, 0.3)'}`;
}

function hideMessage() {
  if (!messageBanner) return;
  messageBanner.style.display = 'none';
}

async function fetchWithRetry(url, options, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
    } catch (e) {
      console.warn(`Fetch failed (attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`);
      showMessage(`Connecting to backend server... (The server may be waking up, please wait)`, false);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Failed to connect to the backend server after multiple attempts.');
}

async function loadDashboardData() {
  try {
    hideMessage();
    
    // 1. Fetch overall summary
    const summaryResponse = await fetchWithRetry(`${BASE_URL}/api/admin/summary`, {
      method: 'GET',
      headers: API_HEADERS
    });
    const summaryResult = await summaryResponse.json();
    if (summaryResult && summaryResult.success && summaryResult.data) {
      updateOverallSummaryUI(summaryResult.data);
    }

    // 2. Fetch global entries log
    const entriesResponse = await fetch(`${BASE_URL}/api/admin/entries`, {
      method: 'GET',
      headers: API_HEADERS
    });
    const entriesResult = await entriesResponse.json();
    if (entriesResult && entriesResult.success && entriesResult.data) {
      allEntries = entriesResult.data;
      updateDateFilterOptions(allEntries);
      const select = document.getElementById('admin-date-filter');
      if (select) {
        renderDailySummaryForDate(select.value);
      }
      updateTotalCompletionTableUI(allEntries);
      updateAdminProgressChart(allEntries);
    }

    // 3. Fetch all users
    const usersResponse = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'GET',
      headers: API_HEADERS
    });
    const usersResult = await usersResponse.json();
    if (usersResult && usersResult.success && usersResult.data) {
      updateUsersTableUI(usersResult.data);
    }

    hideMessage();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    showMessage('Error connecting to the backend. Please check if the service is online.', true);
  }
}

function updateUsersTableUI(users) {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No users registered in the system yet.</td></tr>`;
    return;
  }

  // Sort users alphabetically by display name
  users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

  users.forEach(user => {
    const userId = user.id;
    const displayName = user.displayName || 'Anonymous Developer';
    const email = user.email || 'N/A';
    const role = user.role || 'EMPLOYEE';
    
    // Format Date
    const dateStr = user.createdAt ? formatDateToDdMmmYyyy(user.createdAt) : 'N/A';

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #2d313c';
    row.style.height = '3.5rem';
    row.innerHTML = `
      <td>
        <div class="user-badge">
          <span class="user-badge-name">${escapeHtml(displayName)}</span>
          <span class="user-badge-email">${escapeHtml(email)}</span>
        </div>
      </td>
      <td>
        <select class="role-select" data-user-id="${userId}" onchange="handleRoleChange(this)">
          <option value="EMPLOYEE" ${role === 'EMPLOYEE' ? 'selected' : ''}>EMPLOYEE</option>
          <option value="ADMIN" ${role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
        </select>
      </td>
      <td style="color: rgba(231,236,255,0.7); font-size: 0.9rem;">${dateStr}</td>
      <td>
        <span class="status-badge status-pass">Active</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function handleRoleChange(select) {
  const userId = select.getAttribute('data-user-id');
  const newRole = select.value;
  const originalRole = newRole === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
  
  const confirmMsg = `Are you sure you want to change this user's role to ${newRole}?`;
  if (!confirm(confirmMsg)) {
    select.value = originalRole;
    return;
  }

  try {
    showMessage('Updating user role...', false);
    const response = await fetch(`${BASE_URL}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        ...API_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole })
    });
    
    const result = await response.json();
    if (result && result.success) {
      showMessage(`User role updated to ${newRole} successfully!`, false);
      // Reload dashboard data after a delay to refresh stats
      setTimeout(loadDashboardData, 1500);
    } else {
      throw new Error(result.message || 'Failed to update user role');
    }
  } catch (error) {
    console.error('Error changing role:', error);
    showMessage(`Failed to update role: ${error.message}`, true);
    select.value = originalRole;
  }
}

// Make sure handleRoleChange is globally available for inline onchange event handler
window.handleRoleChange = handleRoleChange;

function updateDateFilterOptions(entries) {
  const select = document.getElementById('admin-date-filter');
  if (!select) return;

  // Get unique dates sorted descending
  const dates = [...new Set(entries.map(e => e.entryDate))].sort((a, b) => b.localeCompare(a));

  const currentVal = select.value;
  select.innerHTML = '';

  if (dates.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No data';
    select.appendChild(opt);
    return;
  }

  dates.forEach(date => {
    const opt = document.createElement('option');
    opt.value = date;
    opt.textContent = formatDateToDdMmmYyyy(date);
    select.appendChild(opt);
  });

  if (dates.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = dates[0];
  }
}

function renderDailySummaryForDate(selectedDate) {
  const tbody = document.querySelector('#daily-project-summary-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!selectedDate) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No date selected.</td></tr>`;
    return;
  }

  const filtered = allEntries.filter(e => e.entryDate === selectedDate);
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No entries found for the selected date.</td></tr>`;
    return;
  }

  // Group by project name
  const groupings = {};
  filtered.forEach(entry => {
    const proj = entry.project || 'Untitled Project';
    if (!groupings[proj]) {
      groupings[proj] = {
        project: proj,
        total: 0,
        pass: 0,
        fail: 0,
        onhold: 0,
        pending: 0,
        na: 0,
        functionalTeam: 0
      };
    }
    const g = groupings[proj];
    g.total += entry.total || 0;
    g.pass += entry.pass || 0;
    g.fail += entry.fail || 0;
    g.onhold += entry.onhold || 0;
    g.pending += entry.pending || 0;
    g.na += entry.na || 0;
    g.functionalTeam += entry.functionalTeam || 0;
  });

  Object.values(groupings).forEach(g => {
    const passRate = g.total > 0 ? (g.pass / g.total * 100) : 0;
    let rateClass = 'rate-low';
    if (passRate >= 80) rateClass = 'rate-high';
    else if (passRate >= 50) rateClass = 'rate-med';

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #2d313c';
    tr.style.height = '3.5rem';
    tr.innerHTML = `
      <td style="font-weight: 800; color: #38bdf8;">${escapeHtml(g.project)}</td>
      <td style="text-align: right; font-weight: 700; color: #e2e8f0;">${g.total}</td>
      <td style="text-align: right; color: #4ade80; font-weight: 600;">${g.pass}</td>
      <td style="text-align: right; color: #f87171; font-weight: 600;">${g.fail}</td>
      <td style="text-align: right; color: #f59e0b; font-weight: 600;">${g.onhold}</td>
      <td style="text-align: right; color: #facc15; font-weight: 600;">${g.pending}</td>
      <td style="text-align: right; color: #a78bfa; font-weight: 600;">${g.na}</td>
      <td style="text-align: right; color: #f472b6; font-weight: 600;">${g.functionalTeam}</td>
      <td style="text-align: right;">
        <span class="rate-badge ${rateClass}">${passRate.toFixed(1)}%</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateTotalCompletionTableUI(entries) {
  const tbody = document.querySelector('#total-completion-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No entry data available.</td></tr>`;
    return;
  }

  // Group by project name
  const groupings = {};
  entries.forEach(entry => {
    const project = entry.project || 'Untitled Project';
    if (!groupings[project]) {
      groupings[project] = {
        project: project,
        total: 0,
        pass: 0,
        fail: 0,
        onhold: 0,
        pending: 0,
        na: 0,
        functionalTeam: 0
      };
    }
    const g = groupings[project];
    g.total += entry.total || 0;
    g.pass += entry.pass || 0;
    g.fail += entry.fail || 0;
    g.onhold += entry.onhold || 0;
    g.pending += entry.pending || 0;
    g.na += entry.na || 0;
    g.functionalTeam += entry.functionalTeam || 0;
  });

  Object.values(groupings).forEach(g => {
    const passRate = g.total > 0 ? (g.pass / g.total * 100) : 0;
    let rateClass = 'rate-low';
    if (passRate >= 80) rateClass = 'rate-high';
    else if (passRate >= 50) rateClass = 'rate-med';

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #2d313c';
    tr.style.height = '3.5rem';
    tr.innerHTML = `
      <td style="font-weight: 800; color: #38bdf8;">${escapeHtml(g.project)}</td>
      <td style="text-align: right; font-weight: 700; color: #e2e8f0;">${g.total}</td>
      <td style="text-align: right; color: #4ade80; font-weight: 600;">${g.pass}</td>
      <td style="text-align: right; color: #f87171; font-weight: 600;">${g.fail}</td>
      <td style="text-align: right; color: #f59e0b; font-weight: 600;">${g.onhold}</td>
      <td style="text-align: right; color: #facc15; font-weight: 600;">${g.pending}</td>
      <td style="text-align: right; color: #a78bfa; font-weight: 600;">${g.na}</td>
      <td style="text-align: right; color: #f472b6; font-weight: 600;">${g.functionalTeam}</td>
      <td style="text-align: right; vertical-align: middle;">
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
          <div style="width: 80px; height: 8px; background: #191c24; border-radius: 4px; overflow: hidden; position: relative;">
            <div style="width: ${passRate}%; height: 100%; background: ${passRate >= 80 ? '#4ade80' : passRate >= 50 ? '#f59e0b' : '#f87171'}; border-radius: 4px;"></div>
          </div>
          <span class="rate-badge ${rateClass}" style="margin: 0; min-width: 55px; text-align: right;">${passRate.toFixed(1)}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateAdminProgressChart(entries) {
  console.log('updateAdminProgressChart called with entries:', entries);
  const chartCanvas = document.getElementById('admin-progress-chart');
  if (!chartCanvas) {
    console.log('admin-progress-chart canvas not found!');
    return;
  }

  const dailyData = {};
  entries.forEach(entry => {
    const date = entry.entryDate;
    if (!dailyData[date]) {
      dailyData[date] = { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0, na: 0, functionalTeam: 0 };
    }
    dailyData[date].total += entry.total || 0;
    dailyData[date].pass += entry.pass || 0;
    dailyData[date].fail += entry.fail || 0;
    dailyData[date].onhold += entry.onhold || 0;
    dailyData[date].pending += entry.pending || 0;
    dailyData[date].na += entry.na || 0;
    dailyData[date].functionalTeam += entry.functionalTeam || 0;
  });

  const sortedDates = Object.keys(dailyData).sort();
  console.log('Sorted chart dates:', sortedDates);

  const labels = sortedDates.map(dateStr => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch(e) {
      return dateStr;
    }
  });

  const passPoints = sortedDates.map(d => dailyData[d].pass);
  const failPoints = sortedDates.map(d => dailyData[d].fail);
  const onholdPoints = sortedDates.map(d => dailyData[d].onhold);
  const pendingPoints = sortedDates.map(d => dailyData[d].pending);
  const naPoints = sortedDates.map(d => dailyData[d].na);
  const functionalTeamPoints = sortedDates.map(d => dailyData[d].functionalTeam);
  const passRatePoints = sortedDates.map(d => {
    const total = dailyData[d].total;
    return total > 0 ? parseFloat((dailyData[d].pass / total * 100).toFixed(1)) : 0;
  });

  if (adminProgressChart) {
    adminProgressChart.destroy();
  }

  if (sortedDates.length === 0) {
    console.log('No chart dates available, returning early.');
    return;
  }

  const ctx = chartCanvas.getContext('2d');
  console.log('Initializing Chart.js bar combo chart on admin canvas');
  adminProgressChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          type: 'line',
          label: 'Pass Rate (%)',
          data: passRatePoints,
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74, 222, 128, 0.15)',
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1',
          zIndex: 10
        },
        {
          label: 'Passed',
          data: passPoints,
          backgroundColor: 'rgba(74, 222, 128, 0.85)',
          borderColor: 'rgba(74, 222, 128, 1)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'Failed',
          data: failPoints,
          backgroundColor: 'rgba(248, 113, 113, 0.85)',
          borderColor: 'rgba(248, 113, 113, 1)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'On Hold',
          data: onholdPoints,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'Pending',
          data: pendingPoints,
          backgroundColor: 'rgba(250, 204, 21, 0.85)',
          borderColor: 'rgba(250, 204, 21, 1)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'N/A',
          data: naPoints,
          backgroundColor: 'rgba(167, 139, 250, 0.85)',
          borderColor: 'rgba(167, 139, 250, 1)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'Functional Team',
          data: functionalTeamPoints,
          backgroundColor: 'rgba(244, 114, 182, 0.85)',
          borderColor: 'rgba(244, 114, 182, 1)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#e2e8f0',
            font: { family: 'Inter, sans-serif', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.datasetIndex === 0) {
                  label += context.parsed.y + '%';
                } else {
                  label += context.parsed.y + ' cases';
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#b2c0f0', font: { family: 'Inter, sans-serif' } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#b2c0f0', font: { family: 'Inter, sans-serif' } },
          title: {
            display: true,
            text: 'Number of Cases',
            color: '#b2c0f0',
            font: { family: 'Inter, sans-serif', weight: 'bold' }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#4ade80',
            font: { family: 'Inter, sans-serif' },
            callback: function(value) {
              return value + '%';
            }
          },
          title: {
            display: true,
            text: 'Pass Rate (%)',
            color: '#4ade80',
            font: { family: 'Inter, sans-serif', weight: 'bold' }
          }
        }
      }
    }
  });
  console.log('Admin combo chart successfully initialized');
}

function updateOverallSummaryUI(summary) {
  const total = summary.total || 0;
  const pass = summary.pass || 0;
  const fail = summary.fail || 0;
  const onhold = summary.onhold || 0;
  const pending = summary.pending || 0;
  const na = summary.na || 0;
  const functionalTeam = summary.functionalTeam || 0;
  const passRate = summary.passRate !== undefined ? summary.passRate : 0;

  document.getElementById('overall-total').textContent = total;
  document.getElementById('overall-passrate').textContent = `Pass Rate: ${passRate.toFixed(1)}%`;
  document.getElementById('overall-pass').textContent = pass;
  document.getElementById('overall-fail').textContent = fail;
  document.getElementById('overall-onhold').textContent = onhold;
  document.getElementById('overall-pending').textContent = pending;
  if (document.getElementById('overall-na')) document.getElementById('overall-na').textContent = na;
  if (document.getElementById('overall-functional')) document.getElementById('overall-functional').textContent = functionalTeam;

  const pct = (val) => total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

  document.getElementById('pass-percentage').textContent = `${pct(pass)}% of total`;
  document.getElementById('fail-percentage').textContent = `${pct(fail)}% of total`;
  document.getElementById('onhold-percentage').textContent = `${pct(onhold)}% of total`;
  document.getElementById('pending-percentage').textContent = `${pct(pending)}% of total`;
  if (document.getElementById('na-percentage')) document.getElementById('na-percentage').textContent = `${pct(na)}% of total`;
  if (document.getElementById('functional-percentage')) document.getElementById('functional-percentage').textContent = `${pct(functionalTeam)}% of total`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// New helper function to get today's date in local YYYY-MM-DD
function getLocalTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Render Daily Summary table for a Date Range (inclusive)
function renderDailySummaryForDateRange(fromDate, toDate) {
  const tbody = document.querySelector('#daily-project-summary-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!fromDate || !toDate) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Please select a valid date range.</td></tr>`;
    return;
  }

  const filtered = allEntries.filter(e => e.entryDate >= fromDate && e.entryDate <= toDate);
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No entries found for the selected date range.</td></tr>`;
    return;
  }

  // Group by project name
  const groupings = {};
  filtered.forEach(entry => {
    const proj = entry.project || 'Untitled Project';
    if (!groupings[proj]) {
      groupings[proj] = {
        project: proj,
        total: 0,
        pass: 0,
        fail: 0,
        onhold: 0,
        pending: 0,
        na: 0,
        functionalTeam: 0
      };
    }
    const g = groupings[proj];
    g.total += entry.total || 0;
    g.pass += entry.pass || 0;
    g.fail += entry.fail || 0;
    g.onhold += entry.onhold || 0;
    g.pending += entry.pending || 0;
    g.na += entry.na || 0;
    g.functionalTeam += entry.functionalTeam || 0;
  });

  Object.values(groupings).forEach(g => {
    const passRate = g.total > 0 ? (g.pass / g.total * 100) : 0;
    let rateClass = 'rate-low';
    if (passRate >= 80) rateClass = 'rate-high';
    else if (passRate >= 50) rateClass = 'rate-med';

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #2d313c';
    tr.style.height = '3.5rem';
    tr.innerHTML = `
      <td style="font-weight: 800; color: #38bdf8;">${escapeHtml(g.project)}</td>
      <td style="text-align: right; font-weight: 700; color: #e2e8f0;">${g.total}</td>
      <td style="text-align: right; color: #4ade80; font-weight: 600;">${g.pass}</td>
      <td style="text-align: right; color: #f87171; font-weight: 600;">${g.fail}</td>
      <td style="text-align: right; color: #f59e0b; font-weight: 600;">${g.onhold}</td>
      <td style="text-align: right; color: #facc15; font-weight: 600;">${g.pending}</td>
      <td style="text-align: right; color: #a78bfa; font-weight: 600;">${g.na}</td>
      <td style="text-align: right; color: #f472b6; font-weight: 600;">${g.functionalTeam}</td>
      <td style="text-align: right;">
        <span class="rate-badge ${rateClass}">${passRate.toFixed(1)}%</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Download Excel for Date Wise Day Progress
function downloadDateWiseExcel() {
  const XLSX = window.XLSX;
  if (!XLSX) {
    alert("Excel library is not loaded.");
    return;
  }

  const fromVal = document.getElementById('admin-date-from').value;
  const toVal = document.getElementById('admin-date-to').value;
  if (!fromVal || !toVal) {
    alert("Please select a valid date range.");
    return;
  }

  const filtered = allEntries.filter(e => e.entryDate >= fromVal && e.entryDate <= toVal);
  if (filtered.length === 0) {
    alert("No data available for the selected range.");
    return;
  }

  // Group by project name (Summary sheet)
  const groupings = {};
  filtered.forEach(entry => {
    const proj = entry.project || 'Untitled Project';
    if (!groupings[proj]) {
      groupings[proj] = {
        project: proj,
        total: 0,
        pass: 0,
        fail: 0,
        onhold: 0,
        pending: 0,
        na: 0,
        functionalTeam: 0
      };
    }
    const g = groupings[proj];
    g.total += entry.total || 0;
    g.pass += entry.pass || 0;
    g.fail += entry.fail || 0;
    g.onhold += entry.onhold || 0;
    g.pending += entry.pending || 0;
    g.na += entry.na || 0;
    g.functionalTeam += entry.functionalTeam || 0;
  });

  // Summary rows
  const summaryRows = [
    ["Date Wise Day Progress Summary"],
    [`Range: ${formatDateToDdMmmYyyy(fromVal)} to ${formatDateToDdMmmYyyy(toVal)}`],
    [],
    ["Project", "Total Test Cases", "Passed", "Failed", "On Hold", "Pending", "N/A", "Taken care by functional team", "Pass Rate"]
  ];

  let totalSum = 0, passSum = 0, failSum = 0, onholdSum = 0, pendingSum = 0, naSum = 0, funcSum = 0;
  Object.values(groupings).forEach(g => {
    const passRate = g.total > 0 ? (g.pass / g.total * 100) : 0;
    summaryRows.push([
      g.project,
      g.total,
      g.pass,
      g.fail,
      g.onhold,
      g.pending,
      g.na,
      g.functionalTeam,
      `${passRate.toFixed(1)}%`
    ]);
    totalSum += g.total;
    passSum += g.pass;
    failSum += g.fail;
    onholdSum += g.onhold;
    pendingSum += g.pending;
    naSum += g.na;
    funcSum += g.functionalTeam;
  });

  // Grand Total row
  const grandPassRate = totalSum > 0 ? (passSum / totalSum * 100) : 0;
  summaryRows.push([]);
  summaryRows.push([
    "Grand Total",
    totalSum,
    passSum,
    failSum,
    onholdSum,
    pendingSum,
    naSum,
    funcSum,
    `${grandPassRate.toFixed(1)}%`
  ]);

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);

  // Detailed Entries sheet
  const detailedRows = [
    ["Date Wise Detailed Entries Log"],
    [`Range: ${formatDateToDdMmmYyyy(fromVal)} to ${formatDateToDdMmmYyyy(toVal)}`],
    [],
    ["Date", "Project", "Module", "Submodule", "Total", "Passed", "Failed", "On Hold", "Pending", "N/A", "Functional Team", "Status", "Comments", "Entered By"]
  ];

  filtered.forEach(e => {
    detailedRows.push([
      formatDateToDdMmmYyyy(e.entryDate),
      e.project || '',
      e.module || '',
      e.submodule || '',
      e.total || 0,
      e.pass || 0,
      e.fail || 0,
      e.onhold || 0,
      e.pending || 0,
      e.na || 0,
      e.functionalTeam || 0,
      e.status || 'Pending',
      e.comments || '',
      `${e.displayName || ''} (${e.email || ''})`
    ]);
  });
  const detailedSheet = XLSX.utils.aoa_to_sheet(detailedRows);

  // Apply beautiful styles using xlsx-js-style
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  };

  // Style Summary Sheet
  const totalSummaryRows = summaryRows.length;
  summarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
  ];
  summarySheet['!cols'] = [
    { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 12 }
  ];

  // Header formatting (row index 3)
  for (let col = 0; col < 9; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: col });
    if (summarySheet[cellRef]) {
      summarySheet[cellRef].s = {
        fill: { fgColor: { rgb: '1F4E78' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder
      };
    }
  }

  // Title styling
  if (summarySheet['A1']) {
    summarySheet['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: '1F4E78' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }
  if (summarySheet['A2']) {
    summarySheet['A2'].s = {
      font: { italic: true, sz: 10, color: { rgb: '595959' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // Data and total rows
  for (let r = 4; r < totalSummaryRows; r++) {
    const isGrandTotal = r === (totalSummaryRows - 1);
    if (isGrandTotal) {
      for (let col = 0; col < 9; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: r, c: col });
        if (!summarySheet[cellRef]) {
          summarySheet[cellRef] = { t: 's', v: '' };
        }
        summarySheet[cellRef].s = {
          fill: { fgColor: { rgb: 'FFF2CC' } },
          font: { bold: true, sz: 11 },
          border: thinBorder,
          alignment: { horizontal: col === 0 ? 'left' : 'right', vertical: 'center' }
        };
      }
    } else {
      const rowVal = summaryRows[r];
      if (rowVal && rowVal.length > 0) {
        for (let col = 0; col < 9; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: r, c: col });
          if (summarySheet[cellRef]) {
            summarySheet[cellRef].s = {
              border: thinBorder,
              alignment: { horizontal: col === 0 ? 'left' : 'right', vertical: 'center' }
            };
          }
        }
      }
    }
  }

  // Style Detailed Sheet
  const totalDetailedRows = detailedRows.length;
  detailedSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }
  ];
  detailedSheet['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 30 }
  ];

  // Title detailed
  if (detailedSheet['A1']) {
    detailedSheet['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: '1F4E78' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }
  if (detailedSheet['A2']) {
    detailedSheet['A2'].s = {
      font: { italic: true, sz: 10, color: { rgb: '595959' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // Header detailed (row index 3)
  for (let col = 0; col < 14; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: col });
    if (detailedSheet[cellRef]) {
      detailedSheet[cellRef].s = {
        fill: { fgColor: { rgb: '1F4E78' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder
      };
    }
  }

  // Data detailed
  for (let r = 4; r < totalDetailedRows; r++) {
    for (let col = 0; col < 14; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: r, c: col });
      if (detailedSheet[cellRef]) {
        detailedSheet[cellRef].s = {
          border: thinBorder,
          alignment: { horizontal: (col < 4 || col >= 11) ? 'left' : 'right', vertical: 'center' }
        };
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Progress Summary");
  XLSX.utils.book_append_sheet(workbook, detailedSheet, "Detailed Log");
  XLSX.writeFile(workbook, `date-wise-progress-${fromVal}-to-${toVal}.xlsx`);
}

// Download Excel for Total Completion Summary
function downloadTotalCompletionExcel() {
  const XLSX = window.XLSX;
  if (!XLSX) {
    alert("Excel library is not loaded.");
    return;
  }

  const fromSelect = document.getElementById('total-month-from');
  const toSelect = document.getElementById('total-month-to');
  const fromVal = fromSelect ? fromSelect.value : '';
  const toVal = toSelect ? toSelect.value : '';

  let filtered = allEntries;
  if (fromVal && toVal) {
    filtered = allEntries.filter(e => {
      if (!e.entryDate) return false;
      const ym = e.entryDate.substring(0, 7);
      return ym >= fromVal && ym <= toVal;
    });
  }

  if (filtered.length === 0) {
    alert("No data available to download.");
    return;
  }

  // Group by project name
  const groupings = {};
  filtered.forEach(entry => {
    const project = entry.project || 'Untitled Project';
    if (!groupings[project]) {
      groupings[project] = {
        project: project,
        total: 0,
        pass: 0,
        fail: 0,
        onhold: 0,
        pending: 0,
        na: 0,
        functionalTeam: 0
      };
    }
    const g = groupings[project];
    g.total += entry.total || 0;
    g.pass += entry.pass || 0;
    g.fail += entry.fail || 0;
    g.onhold += entry.onhold || 0;
    g.pending += entry.pending || 0;
    g.na += entry.na || 0;
    g.functionalTeam += entry.functionalTeam || 0;
  });

  let rangeStr = 'All Time';
  if (fromVal && toVal) {
    const parts = toVal.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const lastDay = new Date(year, month, 0).getDate();
    const toDay = String(lastDay).padStart(2, '0');
    rangeStr = `${formatDateToDdMmmYyyy(fromVal + "-01")} to ${formatDateToDdMmmYyyy(toVal + "-" + toDay)}`;
  }

  const rows = [
    ["Total Completion Summary Report"],
    [`Range: ${rangeStr}`],
    [],
    ["Project", "Total Test Cases", "Passed", "Failed", "On Hold", "Pending", "N/A", "Taken care by functional team", "Completion Progress"]
  ];

  let totalSum = 0, passSum = 0, failSum = 0, onholdSum = 0, pendingSum = 0, naSum = 0, funcSum = 0;
  Object.values(groupings).forEach(g => {
    const passRate = g.total > 0 ? (g.pass / g.total * 100) : 0;
    rows.push([
      g.project,
      g.total,
      g.pass,
      g.fail,
      g.onhold,
      g.pending,
      g.na,
      g.functionalTeam,
      `${passRate.toFixed(1)}%`
    ]);
    totalSum += g.total;
    passSum += g.pass;
    failSum += g.fail;
    onholdSum += g.onhold;
    pendingSum += g.pending;
    naSum += g.na;
    funcSum += g.functionalTeam;
  });

  // Grand Total row
  const grandPassRate = totalSum > 0 ? (passSum / totalSum * 100) : 0;
  rows.push([]);
  rows.push([
    "Grand Total",
    totalSum,
    passSum,
    failSum,
    onholdSum,
    pendingSum,
    naSum,
    funcSum,
    `${grandPassRate.toFixed(1)}%`
  ]);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);

  // Apply styling
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  };

  const totalRows = rows.length;
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
  ];
  sheet['!cols'] = [
    { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 20 }
  ];

  // Title styling
  if (sheet['A1']) {
    sheet['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: '1F4E78' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }
  if (sheet['A2']) {
    sheet['A2'].s = {
      font: { italic: true, sz: 10, color: { rgb: '595959' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // Header formatting (row index 3)
  for (let col = 0; col < 9; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: col });
    if (sheet[cellRef]) {
      sheet[cellRef].s = {
        fill: { fgColor: { rgb: '1F4E78' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder
      };
    }
  }

  // Data and total rows
  for (let r = 4; r < totalRows; r++) {
    const isGrandTotal = r === (totalRows - 1);
    if (isGrandTotal) {
      for (let col = 0; col < 9; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: r, c: col });
        if (!sheet[cellRef]) {
          sheet[cellRef] = { t: 's', v: '' };
        }
        sheet[cellRef].s = {
          fill: { fgColor: { rgb: 'FFF2CC' } },
          font: { bold: true, sz: 11 },
          border: thinBorder,
          alignment: { horizontal: col === 0 ? 'left' : 'right', vertical: 'center' }
        };
      }
    } else {
      const rowVal = rows[r];
      if (rowVal && rowVal.length > 0) {
        for (let col = 0; col < 9; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: r, c: col });
          if (sheet[cellRef]) {
            sheet[cellRef].s = {
              border: thinBorder,
              alignment: { horizontal: col === 0 ? 'left' : 'right', vertical: 'center' }
            };
          }
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, sheet, "Total Completion Summary");
  XLSX.writeFile(workbook, "total-completion-summary.xlsx");
}

// Dynamic Month Filter options populator
function updateMonthFilterOptions(entries) {
  const fromSelect = document.getElementById('total-month-from');
  const toSelect = document.getElementById('total-month-to');
  if (!fromSelect || !toSelect) return;

  // Extract unique Year-Month strings (YYYY-MM)
  const months = [...new Set(entries.map(e => {
    if (!e.entryDate) return '';
    return e.entryDate.substring(0, 7); // "YYYY-MM"
  }).filter(Boolean))].sort((a, b) => a.localeCompare(b)); // Sort ascending

  const currentFrom = fromSelect.value;
  const currentTo = toSelect.value;

  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';

  if (months.length === 0) {
    const opt1 = document.createElement('option');
    opt1.value = '';
    opt1.textContent = 'No data';
    fromSelect.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = '';
    opt2.textContent = 'No data';
    toSelect.appendChild(opt2);
    return;
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function formatYm(ymStr) {
    const [y, m] = ymStr.split('-');
    const mIdx = parseInt(m, 10) - 1;
    return `${monthNames[mIdx]} ${y}`;
  }

  months.forEach(ym => {
    const optF = document.createElement('option');
    optF.value = ym;
    optF.textContent = formatYm(ym);
    fromSelect.appendChild(optF);

    const optT = document.createElement('option');
    optT.value = ym;
    optT.textContent = formatYm(ym);
    toSelect.appendChild(optT);
  });

  // Restore or set defaults (Earliest to Latest to show everything by default)
  if (months.includes(currentFrom)) {
    fromSelect.value = currentFrom;
  } else {
    fromSelect.value = months[0];
  }

  if (months.includes(currentTo)) {
    toSelect.value = currentTo;
  } else {
    toSelect.value = months[months.length - 1];
  }
}

// Render the Total Completion Summary table for the selected Month Range
function renderTotalCompletionForMonthRange() {
  const fromSelect = document.getElementById('total-month-from');
  const toSelect = document.getElementById('total-month-to');
  if (!fromSelect || !toSelect) return;

  const fromVal = fromSelect.value;
  const toVal = toSelect.value;

  if (!fromVal || !toVal) return;

  const filtered = allEntries.filter(e => {
    if (!e.entryDate) return false;
    const ym = e.entryDate.substring(0, 7);
    return ym >= fromVal && ym <= toVal;
  });

  updateTotalCompletionTableUI(filtered);
}

// Render the Target Totals configuration mapping table
function renderProjectTotalsMappingTable(entries) {
  const tbody = document.querySelector('#project-totals-mapping-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No configuration data available.</td></tr>`;
    return;
  }

  // Find the latest total count for each unique (project, module, submodule)
  const mapping = {};
  entries.forEach(e => {
    const proj = e.project || 'Untitled Project';
    const mod = e.module || 'N/A';
    const sub = e.submodule || 'N/A';
    const key = `${proj.toLowerCase()}||${mod.toLowerCase()}||${sub.toLowerCase()}`;

    const entryDate = e.entryDate || '';
    const current = mapping[key];
    if (!current || entryDate.localeCompare(current.entryDate) > 0) {
      mapping[key] = {
        project: proj,
        module: mod,
        submodule: sub,
        total: e.total || 0,
        updatedBy: e.displayName || e.email || 'System',
        entryDate: entryDate
      };
    }
  });

  const rows = Object.values(mapping);
  // Sort by Project, then Module, then Submodule
  rows.sort((a, b) => {
    const compProj = a.project.localeCompare(b.project);
    if (compProj !== 0) return compProj;
    const compMod = a.module.localeCompare(b.module);
    if (compMod !== 0) return compMod;
    return a.submodule.localeCompare(b.submodule);
  });

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No target totals configured yet.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #2d313c';
    tr.style.height = '3.5rem';
    tr.innerHTML = `
      <td style="font-weight: 800; color: #38bdf8;">${escapeHtml(r.project)}</td>
      <td style="color: #e2e8f0; font-weight: 600;">${escapeHtml(r.module)}</td>
      <td style="color: rgba(231, 236, 255, 0.8);">${escapeHtml(r.submodule)}</td>
      <td style="text-align: right; font-weight: 700; color: #4ade80;">${r.total}</td>
      <td style="color: rgba(231, 236, 255, 0.7);">${escapeHtml(r.updatedBy)}</td>
      <td style="text-align: right; color: rgba(231, 236, 255, 0.6); font-size: 0.9rem;">${formatDateToDdMmmYyyy(r.entryDate)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Initialize the date inputs and setup custom logic
function initDateRangeFilter() {
  const fromInput = document.getElementById('admin-date-from');
  const toInput = document.getElementById('admin-date-to');
  const downloadDateWiseBtn = document.getElementById('admin-download-date-wise');
  const downloadTotalBtn = document.getElementById('admin-download-total-completion');

  const fromMonthSelect = document.getElementById('total-month-from');
  const toMonthSelect = document.getElementById('total-month-to');

  if (!fromInput || !toInput) return;

  // Default values to local current day (today)
  const todayStr = getLocalTodayString();
  if (!fromInput.value) {
    fromInput.value = todayStr;
  }
  if (!toInput.value) {
    toInput.value = todayStr;
  }

  // Initial render for Date Range
  renderDailySummaryForDateRange(fromInput.value, toInput.value);

  // Event listeners for date inputs to filter dynamically
  fromInput.addEventListener('change', () => {
    renderDailySummaryForDateRange(fromInput.value, toInput.value);
  });
  toInput.addEventListener('change', () => {
    renderDailySummaryForDateRange(fromInput.value, toInput.value);
  });

  // Event listeners for month selectors to filter dynamically
  if (fromMonthSelect && toMonthSelect) {
    fromMonthSelect.addEventListener('change', renderTotalCompletionForMonthRange);
    toMonthSelect.addEventListener('change', renderTotalCompletionForMonthRange);
  }

  // Excel downloads
  if (downloadDateWiseBtn) {
    downloadDateWiseBtn.addEventListener('click', downloadDateWiseExcel);
  }
  if (downloadTotalBtn) {
    downloadTotalBtn.addEventListener('click', downloadTotalCompletionExcel);
  }
}

// Intercept loadDashboardData dynamically to refresh all custom tables
const originalLoadDashboardData = window.loadDashboardData || loadDashboardData;
window.loadDashboardData = async function() {
  await originalLoadDashboardData();
  
  // 1. Refresh Date Range Progress Table
  const fromInput = document.getElementById('admin-date-from');
  const toInput = document.getElementById('admin-date-to');
  if (fromInput && toInput) {
    renderDailySummaryForDateRange(fromInput.value, toInput.value);
  }

  // 2. Populate Month Filter options and refresh Month-Filtered Total Completion Table
  updateMonthFilterOptions(allEntries);
  renderTotalCompletionForMonthRange();

  // 3. Render Project Submodule Target Totals mapping table
  renderProjectTotalsMappingTable(allEntries);
};

// Intercept updateUsersTableUI dynamically to ensure duplicate employees (same email, case-insensitive) are not rendered
const originalUpdateUsersTableUI = window.updateUsersTableUI || updateUsersTableUI;
window.updateUsersTableUI = function(users) {
  if (!users) {
    if (originalUpdateUsersTableUI) originalUpdateUsersTableUI(users);
    return;
  }
  const uniqueUsers = [];
  const seenEmails = new Set();
  users.forEach(user => {
    const emailKey = (user.email || '').toLowerCase().trim();
    if (emailKey && !seenEmails.has(emailKey)) {
      seenEmails.add(emailKey);
      uniqueUsers.push(user);
    } else if (!emailKey) {
      uniqueUsers.push(user);
    }
  });
  if (originalUpdateUsersTableUI) originalUpdateUsersTableUI(uniqueUsers);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.loadDashboardData();
  initDateRangeFilter();
});
