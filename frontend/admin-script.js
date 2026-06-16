const BASE_URL = 'https://status-tracker-api.onrender.com';
const API_HEADERS = {
  get 'Content-Type'() { return 'application/json'; },
  get 'X-User-Email'() { return localStorage.getItem('userEmail') || ''; },
  get 'X-User-Name'() { return localStorage.getItem('userName') || ''; }
};

function checkAdminSession() {
  const email = localStorage.getItem('userEmail') || '';
  const name = localStorage.getItem('userName') || '';
  if (!email || !name) {
    window.location.href = 'index.html';
    return;
  }
  
  const emailLower = email.toLowerCase();
  const isAdmin = emailLower.includes('admin') || emailLower.includes('vishnu') || emailLower === 'john.doe@oracle.com';
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

    // 2. Fetch team performance
    const teamResponse = await fetch(`${BASE_URL}/api/admin/summary/per-user`, {
      method: 'GET',
      headers: API_HEADERS
    });
    const teamResult = await teamResponse.json();
    if (teamResult && teamResult.success && teamResult.data) {
      updateTeamTableUI(teamResult.data);
    }

    // 3. Fetch global entries log
    const entriesResponse = await fetch(`${BASE_URL}/api/admin/entries`, {
      method: 'GET',
      headers: API_HEADERS
    });
    const entriesResult = await entriesResponse.json();
    if (entriesResult && entriesResult.success && entriesResult.data) {
      updateGlobalEntriesTableUI(entriesResult.data);
    }

    hideMessage();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    showMessage('Error connecting to the backend. Please check if the service is online.', true);
  }
}

function updateOverallSummaryUI(summary) {
  const total = summary.total || 0;
  const pass = summary.pass || 0;
  const fail = summary.fail || 0;
  const onhold = summary.onhold || 0;
  const pending = summary.pending || 0;
  const passRate = summary.passRate !== undefined ? summary.passRate : 0;

  document.getElementById('overall-total').textContent = total;
  document.getElementById('overall-passrate').textContent = `Pass Rate: ${passRate.toFixed(1)}%`;
  document.getElementById('overall-pass').textContent = pass;
  document.getElementById('overall-fail').textContent = fail;
  document.getElementById('overall-onhold').textContent = onhold;
  document.getElementById('overall-pending').textContent = pending;

  const pct = (val) => total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

  document.getElementById('pass-percentage').textContent = `${pct(pass)}% of total`;
  document.getElementById('fail-percentage').textContent = `${pct(fail)}% of total`;
  document.getElementById('onhold-percentage').textContent = `${pct(onhold)}% of total`;
  document.getElementById('pending-percentage').textContent = `${pct(pending)}% of total`;
}

function updateTeamTableUI(teamSummaries) {
  const tbody = document.querySelector('#team-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (teamSummaries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No users registered in the system yet.</td></tr>`;
    return;
  }

  teamSummaries.forEach(item => {
    const user = item.user || {};
    const summary = item.summary || {};
    const displayName = user.displayName || 'Anonymous Developer';
    const email = user.email || 'N/A';
    const role = user.role || 'EMPLOYEE';
    const total = summary.total || 0;
    const passRate = summary.passRate !== undefined ? summary.passRate : 0;
    
    // Format Date
    let dateStr = 'N/A';
    if (user.createdAt) {
      try {
        dateStr = new Date(user.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Determine rate class
    let rateClass = 'rate-low';
    if (passRate >= 80) {
      rateClass = 'rate-high';
    } else if (passRate >= 50) {
      rateClass = 'rate-med';
    }

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
        <span class="status-badge ${role.toLowerCase() === 'admin' ? 'status-pass' : 'status-inprogress'}">
          ${role}
        </span>
      </td>
      <td style="color: rgba(231,236,255,0.7); font-size: 0.9rem;">${dateStr}</td>
      <td style="text-align: right; font-weight: 700;">${total}</td>
      <td style="text-align: right;">
        <span class="rate-badge ${rateClass}">${passRate.toFixed(1)}%</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateGlobalEntriesTableUI(entries) {
  const tbody = document.querySelector('#global-entries-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No status entries found in the system.</td></tr>`;
    return;
  }

  // Sort entries by project, module, submodule
  entries.sort((a, b) => {
    const projCompare = (a.project || '').localeCompare(b.project || '');
    if (projCompare !== 0) return projCompare;
    const modCompare = (a.module || '').localeCompare(b.module || '');
    if (modCompare !== 0) return modCompare;
    return (a.submodule || '').localeCompare(b.submodule || '');
  });

  entries.forEach(entry => {
    const displayName = entry.displayName || 'Unknown';
    const email = entry.email || 'N/A';
    const project = entry.project || 'N/A';
    const module = entry.module || 'N/A';
    const submodule = entry.submodule || 'N/A';
    const total = entry.total || 0;
    const pass = entry.pass || 0;
    const fail = entry.fail || 0;
    const onhold = entry.onhold || 0;
    const pending = entry.pending || 0;
    const comments = entry.comments || '-';

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
      <td style="font-weight: 700; color: #76d7ff;">${escapeHtml(project)}</td>
      <td>${escapeHtml(module)}</td>
      <td>${escapeHtml(submodule)}</td>
      <td style="text-align: right; font-weight: 700;">${total}</td>
      <td style="text-align: right; color: #6df5a4;">${pass}</td>
      <td style="text-align: right; color: #ff6a70;">${fail}</td>
      <td style="text-align: right; color: #ffc469;">${onhold}</td>
      <td style="text-align: right; color: #ffd54f;">${pending}</td>
      <td style="font-size: 0.88rem; color: rgba(231,236,255,0.7); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(comments)}">
        ${escapeHtml(comments)}
      </td>
    `;
    tbody.appendChild(row);
  });
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
document.addEventListener('DOMContentLoaded', loadDashboardData);
