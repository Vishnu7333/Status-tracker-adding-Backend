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

function checkAdminSession() {
  const email = localStorage.getItem('userEmail') || '';
  const name = localStorage.getItem('userName') || '';
  if (!email || !name) {
    window.location.href = 'index.html';
    return;
  }
  
  const emailLower = email.toLowerCase();
  const isAdmin = emailLower === 'vvnair7333@gmail.com';
  if (!isAdmin) {
    window.location.href = 'index.html';
  }
}
checkAdminSession();

const messageBanner = document.getElementById('admin-message');

function showMessage(msg, isError = false) {
  if (!messageBanner) return;
  messageBanner.textContent = msg;
  messageBanner.style.display = 'block';
  messageBanner.style.background = isError ? 'rgba(255, 106, 112, 0.15)' : 'rgba(109, 245, 164, 0.15)';
  messageBanner.style.color = isError ? '#ff6a70' : '#6df5a4';
  messageBanner.style.border = `1px solid ${isError ? 'rgba(255, 106, 112, 0.3)' : 'rgba(109, 245, 164, 0.3)'}`;
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
    row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
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
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    tr.style.height = '3.5rem';
    tr.innerHTML = `
      <td style="font-weight: 800; color: #76d7ff;">${escapeHtml(g.project)}</td>
      <td style="text-align: right; font-weight: 700; color: #ffffff;">${g.total}</td>
      <td style="text-align: right; color: #6df5a4; font-weight: 600;">${g.pass}</td>
      <td style="text-align: right; color: #ff6a70; font-weight: 600;">${g.fail}</td>
      <td style="text-align: right; color: #ffc469; font-weight: 600;">${g.onhold}</td>
      <td style="text-align: right; color: #ffd54f; font-weight: 600;">${g.pending}</td>
      <td style="text-align: right; color: #b085f5; font-weight: 600;">${g.na}</td>
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
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    tr.style.height = '3.5rem';
    tr.innerHTML = `
      <td style="font-weight: 800; color: #76d7ff;">${escapeHtml(g.project)}</td>
      <td style="text-align: right; font-weight: 700; color: #ffffff;">${g.total}</td>
      <td style="text-align: right; color: #6df5a4; font-weight: 600;">${g.pass}</td>
      <td style="text-align: right; color: #ff6a70; font-weight: 600;">${g.fail}</td>
      <td style="text-align: right; color: #ffc469; font-weight: 600;">${g.onhold}</td>
      <td style="text-align: right; color: #ffd54f; font-weight: 600;">${g.pending}</td>
      <td style="text-align: right; color: #b085f5; font-weight: 600;">${g.na}</td>
      <td style="text-align: right; color: #f472b6; font-weight: 600;">${g.functionalTeam}</td>
      <td style="text-align: right; vertical-align: middle;">
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
          <div style="width: 80px; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; position: relative;">
            <div style="width: ${passRate}%; height: 100%; background: ${passRate >= 80 ? '#6df5a4' : passRate >= 50 ? '#ffc469' : '#ff6a70'}; border-radius: 4px;"></div>
          </div>
          <span class="rate-badge ${rateClass}" style="margin: 0; min-width: 55px; text-align: right;">${passRate.toFixed(1)}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateAdminProgressChart(entries) {
  const chartCanvas = document.getElementById('admin-progress-chart');
  if (!chartCanvas) return;

  const dailyData = {};
  entries.forEach(entry => {
    const date = entry.entryDate;
    if (!dailyData[date]) {
      dailyData[date] = { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0 };
    }
    dailyData[date].total += entry.total || 0;
    dailyData[date].pass += entry.pass || 0;
    dailyData[date].fail += entry.fail || 0;
    dailyData[date].onhold += entry.onhold || 0;
    dailyData[date].pending += entry.pending || 0;
  });

  const sortedDates = Object.keys(dailyData).sort();

  const labels = sortedDates.map(dateStr => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch(e) {
      return dateStr;
    }
  });

  const totalPoints = sortedDates.map(d => dailyData[d].total);
  const passPoints = sortedDates.map(d => dailyData[d].pass);
  const failPoints = sortedDates.map(d => dailyData[d].fail);
  const onholdPoints = sortedDates.map(d => dailyData[d].onhold);

  if (adminProgressChart) {
    adminProgressChart.destroy();
  }

  if (sortedDates.length === 0) {
    return;
  }

  const ctx = chartCanvas.getContext('2d');
  adminProgressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Cases',
          data: totalPoints,
          borderColor: 'rgba(118, 215, 255, 0.8)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
          pointRadius: 3
        },
        {
          label: 'Passed',
          data: passPoints,
          borderColor: 'rgba(109, 245, 164, 0.9)',
          backgroundColor: 'rgba(109, 245, 164, 0.05)',
          fill: true,
          borderWidth: 3,
          tension: 0.2,
          pointRadius: 4
        },
        {
          label: 'Failed',
          data: failPoints,
          borderColor: 'rgba(255, 106, 112, 0.9)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 3
        },
        {
          label: 'On Hold',
          data: onholdPoints,
          borderColor: 'rgba(255, 196, 105, 0.9)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#e7ecff',
            font: { family: 'Inter, sans-serif', size: 11 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#b2c0f0', font: { family: 'Inter, sans-serif' } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#b2c0f0', font: { family: 'Inter, sans-serif' } },
          min: 0
        }
      }
    }
  });
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  const select = document.getElementById('admin-date-filter');
  if (select) {
    select.addEventListener('change', (e) => {
      renderDailySummaryForDate(e.target.value);
    });
  }
});
