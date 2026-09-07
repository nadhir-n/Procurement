if (window.location.hostname.endsWith('.onslate.com')) {
  window.location.replace('https://procurement-914406080.development.catalystserverless.com/app/developer.html');
}

// Same-origin API base (see app.js) — required for the auth session cookie to reach the API.
const API_BASE = '/server/procurement_api';

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '✔')}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// The function gateway needs the Catalyst auth token to identify the user —
// the session cookie alone is not forwarded as a user credential.
let _authToken = null;
async function getAuthToken(force = false) {
  if (_authToken && !force) return _authToken;
  try {
    const res = await window.catalyst.auth.generateAuthToken();
    _authToken = (res && (res.access_token || (res.content && res.content.access_token))) || null;
  } catch { _authToken = null; }
  return _authToken;
}

async function apiRequest(method, path, body = null, _retried = false) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getAuthToken();
  if (token) headers['Authorization'] = token;

  const options = { method, headers, credentials: 'include' };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  if (res.status === 401 && !_retried) {
    await getAuthToken(true);
    return apiRequest(method, path, body, true);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status} Error`);
  }
  return await res.json();
}

async function loadDeveloperOrgs() {
  const table = document.getElementById('dev-orgs-table');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading workspaces...</td></tr>';

  try {
    const orgs = await apiRequest('GET', '/api/developer/organizations');
    tbody.innerHTML = '';
    if (orgs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No workspaces registered on platform.</td></tr>`;
      return;
    }

    orgs.forEach(org => {
      const isPending = org.Status === 'Pending Validation';
      const statusBadge = isPending 
        ? `<span class="badge badge-warning">Pending Developer Approval</span>`
        : `<span class="badge badge-success">Active Authorized</span>`;

      const actionBtn = isPending
        ? `<button class="btn btn-primary" onclick="approveWorkspace('${org.ROWID}')" style="padding:0.35rem 0.75rem;font-size:0.75rem;">Approve & Activate</button>`
        : `<button class="btn btn-secondary" onclick="suspendWorkspace('${org.ROWID}')" style="padding:0.35rem 0.75rem;font-size:0.75rem;color:var(--color-danger);border-color:var(--color-danger);">Suspend</button>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${org.Name}</strong></td>
        <td>${org.Domain || '---'}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--color-danger);">Error loading data: ${err.message}</td></tr>`;
  }
}

window.approveWorkspace = async function(orgId) {
  try {
    showToast('Executing platform database update...', 'warning');
    await apiRequest('PUT', `/api/developer/organizations/${orgId}`, { Status: 'Active' });
    showToast('Workspace activated & verified successfully!', 'success');
    await loadDeveloperOrgs();
  } catch (err) {
    showToast(`Approval failed: ${err.message}`, 'error');
  }
};

window.suspendWorkspace = async function(orgId) {
  try {
    showToast('Banning/suspending tenant workspace...', 'warning');
    await apiRequest('PUT', `/api/developer/organizations/${orgId}`, { Status: 'Pending Validation' });
    showToast('Workspace suspended successfully!', 'warning');
    await loadDeveloperOrgs();
  } catch (err) {
    showToast(`Suspension failed: ${err.message}`, 'error');
  }
};

document.getElementById('btn-dev-clear').addEventListener('click', async () => {
  if (confirm('Are you sure you want to flush all transaction lists?')) {
    showToast('Mock workspace transaction database cleared (Simulated).', 'warning');
  }
});

document.getElementById('btn-dev-run-sim').addEventListener('click', async () => {
  showToast('Deploying full-stack demo items, suppliers, and transaction records (Simulated)...', 'warning');
});

// Init
window.addEventListener('DOMContentLoaded', () => {
  let sdkWaitTime = 0;
  const checkSDK = setInterval(() => {
    sdkWaitTime += 100;
    if (window.catalyst && window.catalyst.auth) {
      clearInterval(checkSDK);
      catalyst.auth.isUserAuthenticated().then(response => {
        // Enforce strict client-side role check
        const userEmail = response.content.email_id;
        if (userEmail !== 'sulaiman@cloudpartners.biz') {
          document.body.innerHTML = `
            <div style="display:flex; height:100vh; width:100vw; justify-content:center; align-items:center; background:#0f172a; color:white; font-family:sans-serif; flex-direction:column;">
              <h1 style="color:#ef4444; margin-bottom:1rem;">Access Denied (403)</h1>
              <p>You do not have Developer authorization to view this portal.</p>
              <a href="index.html" style="margin-top:2rem; color:#3b82f6; text-decoration:none;">Return to App</a>
            </div>
          `;
          return;
        }
        
        loadDeveloperOrgs();
      }).catch(err => {
        console.warn('Developer not logged in via Catalyst.', err);
        document.body.innerHTML = `
            <div style="display:flex; height:100vh; width:100vw; justify-content:center; align-items:center; background:#0f172a; color:white; font-family:sans-serif; flex-direction:column;">
              <h1 style="color:#ef4444; margin-bottom:1rem;">Authentication Required</h1>
              <p>Please log in with a Developer account.</p>
              <a href="index.html" style="margin-top:2rem; color:#3b82f6; text-decoration:none;">Return to App</a>
            </div>
          `;
      });
    } else if (sdkWaitTime > 3000) {
      clearInterval(checkSDK);
      console.error('Catalyst SDK failed to load within 3 seconds.');
      // Attempt load locally
      loadDeveloperOrgs();
    }
  }, 100);
});
