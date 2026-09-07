'use strict';

// -------------------------------------------------------------
// ProcureFlow - Core Frontend Application Controller
// -------------------------------------------------------------

// The app must be served from the same origin as the Catalyst functions
// (Web Client Hosting or `catalyst serve`) so the auth session cookie flows to the API.
// The retired Slate deployment is cross-origin — forward anyone still using that link.
if (window.location.hostname.endsWith('.onslate.com')) {
  window.location.replace('https://procurement-914406080.development.catalystserverless.com/app/index.html');
}

// Same-origin API base: works on the deployed domain and under `catalyst serve` alike.
const API_BASE = '/server/procurement_api';

// Application Core State
const state = {
  organizations: [],
  activeOrgId: null,
  roles: [],
  users: [],
  suppliers: [],
  items: [],
  prs: [],
  pos: [],
  grns: [],
  invoices: [],
  budgets: [],
  rfqs: [],
  bids: [],
  currentUser: {
    name: 'Admin',
    role: 'Super Admin',
    userId: null,
    email: 'admin@procureflow.local'
  },
  matchingTolerance: 0.0, // Default matching price tolerance %
  autoApprovePO: 5000 // PO auto approval limit
};

// Toast Notifications Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '✔';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠';
  
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global Secure API Request Helper
async function apiRequest(method, path, body = null, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  
  if (state.activeOrgId) {
    headers['X-Org-ID'] = state.activeOrgId;
  }
  if (state.currentUser.userId) {
    headers['X-User-ID'] = state.currentUser.userId;
  }

  const options = { method, headers, credentials: 'include' };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status} Error`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Request Error [${method} ${path}]:`, err.message);
    throw err;
  }
}

// -------------------------------------------------------------
// Navigation & Router Management
// -------------------------------------------------------------
function switchView(targetPageId) {
  // Check workspace lock context before navigating
  const activeOrg = state.organizations.find(o => o.ROWID === state.activeOrgId);
  const isLocked = activeOrg && activeOrg.Status === 'Pending Validation';

  if (isLocked) {
    showToast('Access Denied: This workspace is currently locked pending developer approval.', 'warning');
    targetPageId = 'pending-page';
  }

  // Toggle active class on sidebar navigation lists
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-target') === targetPageId) {
      item.classList.add('active');
    }
  });

  // Toggle active class on views
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const activeSec = document.getElementById(targetPageId);
  if (activeSec) {
    activeSec.classList.add('active');
  }

  // Dynamically update view headers
  updateHeaderContent(targetPageId);
}

function updateHeaderContent(pageId) {
  const titleMap = {
    'dashboard-page': { title: 'Procurement Dashboard', sub: 'Expenditure charts, pending approvals, and matching health.' },
    'employees-page': { title: 'Roles & Delegation of Authority', sub: 'Configure corporate profiles, RBAC permissions, and approval limit tiers.' },
    'catalog-page': { title: 'Suppliers & Product Catalog', sub: 'Master contract directories, inventory SKUs, and negotiated pricing.' },
    'requisitions-page': { title: 'Internal Requisitions (PR)', sub: 'File multi-item procurement requisitions with auto-escalation limits.' },
    'orders-page': { title: 'Purchase Orders Contract Registry', sub: 'Review, audit, and convert requisitions to legal supplier agreements.' },
    'receipts-page': { title: 'Goods Receipts Notes (GRN)', sub: 'Verify delivery arrivals, inspect accept/reject counts, and lock inventories.' },
    'matching-page': { title: '3-Way Match Auditing', sub: 'Cross-examine bills against PO values and GRN arrivals in real-time.' },
    'budgets-page': { title: 'Department Budgets & Spend Controls', sub: 'Configure spend allowances, monitor actual expenditure, and configure budget warnings.' },
    'settings-page': { title: 'Operational Settings', sub: 'Set tolerance margins, base currencies, and manage enterprise policy settings.' },
    'analytics-page': { title: 'Analytics & Reporting', sub: 'Deep insights across the S2P cycle for data-informed spending decisions.' },
    'recurring-bills-page': { title: 'Recurring Bills', sub: 'Automate repetitive subscription and retainer vendor invoices.' },
    'vendor-credits-page': { title: 'Vendor Credits', sub: 'Manage credit notes, returns, and offset balances.' },
    'custom-modules-page': { title: 'Custom Modules Builder', sub: 'Extend ProcureFlow with bespoke table schemas and workflows.' },
    'pending-page': { title: 'Workspace Verification Lock', sub: 'This client workspace is registered and awaiting platform authorization.' }
  };

  const meta = titleMap[pageId] || { title: 'ProcureFlow Workspace', sub: 'Procure-to-Pay enterprise software.' };
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');
  if (viewTitle) viewTitle.textContent = meta.title;
  if (viewSubtitle) viewSubtitle.textContent = meta.sub;
}

// Hook navigation clicks
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const pageId = item.getAttribute('data-target');
    switchView(pageId);
  });
});

// Modal Helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// -------------------------------------------------------------
// Organization & Verification Lifecycle ()
// -------------------------------------------------------------
async function loadOrganizations() {
  try {
    const orgs = await apiRequest('GET', '/api/organizations');
    state.organizations = orgs;

    const switcher = document.getElementById('tenant-switcher');
    if (!switcher) return;

    switcher.innerHTML = '';

    if (orgs.length === 0) {
      switcher.innerHTML = '<option value="">No workspace found</option>';
      document.getElementById('onboarding-overlay').style.display = 'flex';
      return;
    }

    document.getElementById('onboarding-overlay').style.display = 'none';

    orgs.forEach(org => {
      const opt = document.createElement('option');
      opt.value = org.ROWID;
      opt.textContent = `${org.Name} (${org.Status})`;
      switcher.appendChild(opt);
    });

    // Auto-select first org or keep active
    if (!state.activeOrgId || !orgs.some(o => o.ROWID === state.activeOrgId)) {
      state.activeOrgId = orgs[0].ROWID;
    }
    switcher.value = state.activeOrgId;

    await handleWorkspaceVerification();
  } catch (err) {
    console.warn('Failed to load organizations from Catalyst:', err.message);
    showToast('Starting in Offline Sandbox Simulation mode.', 'warning');
    initializeMockSandbox();
  }
}

async function handleWorkspaceVerification() {
  const activeOrg = state.organizations.find(o => o.ROWID === state.activeOrgId);
  if (!activeOrg) return;

  const isPending = activeOrg.Status === 'Pending Validation';
  const pendingPage = document.getElementById('pending-page');
  const pendingOrgLabel = document.getElementById('pending-org-name');

  if (isPending) {
    if (pendingOrgLabel) pendingOrgLabel.textContent = activeOrg.Name;
    switchView('pending-page');
  } else {
    // Workspace is Active! Unlock and load data
    const activeSec = document.querySelector('.view-section.active');
    if (!activeSec || activeSec.id === 'pending-page') {
      switchView('dashboard-page');
    }
    await refreshAllData();
  }
}

// Listen to tenant switcher change
document.getElementById('tenant-switcher').addEventListener('change', async (e) => {
  state.activeOrgId = e.target.value;
  await handleWorkspaceVerification();
  showToast(`Switched active workspace context!`, 'success');
});

// -------------------------------------------------------------
// Signup Onboarding Submit
// -------------------------------------------------------------
document.getElementById('onboarding-signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = 'Creating Organization...';
    btn.disabled = true;

    const orgName = document.getElementById('signup-org-name').value;
    const domain = document.getElementById('signup-org-domain').value;
    const adminName = document.getElementById('signup-user-name').value;
    const adminEmail = document.getElementById('signup-user-email').value;
    const industry = document.getElementById('signup-org-industry').value;
    const currency = document.getElementById('signup-currency') ? document.getElementById('signup-currency').value : 'USD';
    const approvalLimit = document.getElementById('signup-user-limit') ? document.getElementById('signup-user-limit').value : 10000;

    try {
      const res = await apiRequest('POST', '/api/onboarding', {
        orgName: orgName,
        domain: domain,
        adminName: adminName,
        adminEmail: adminEmail,
        industry: industry,
        currency: currency,
        adminApprovalLimit: approvalLimit
      });
      showToast('Organization created successfully!', 'success');
      document.getElementById('onboarding-overlay').style.display = 'none';
      await loadOrganizations(); // Refresh workspaces
    } catch (err) {
      showToast('Error creating organization: ' + err.message, 'error');
    } finally {
      btn.innerText = oldText;
      btn.disabled = false;
    }
});

// Onboard deployer trigger button
document.getElementById('btn--signup').addEventListener('click', () => {
  document.getElementById('onboarding-overlay').style.display = 'flex';
});


document.getElementById('btn-pending-refresh').addEventListener('click', async () => {
  showToast('Synchronizing lock status with Zoho cloud...', 'warning');
  await loadOrganizations();
});



// -------------------------------------------------------------
// Core Functional Data Refresh
// -------------------------------------------------------------
async function refreshAllData() {
  if (!state.activeOrgId) return;

  const currentOrg = state.organizations.find(o => o.ROWID === state.activeOrgId);
  if (currentOrg) {
    // Load Settings
    try {
      const settings = typeof currentOrg.Settings === 'string' 
        ? JSON.parse(currentOrg.Settings) 
        : currentOrg.Settings || {};
      
      state.matchingTolerance = Number(settings.tolerance || 0.0);
      state.autoApprovePO = Number(settings.autoApproveLimit || 5000);
      
      // Update general settings inputs
      const toleranceInput = document.getElementById('settings-tolerance');
      const approveInput = document.getElementById('settings-autoapprove');
      if (toleranceInput) toleranceInput.value = state.matchingTolerance;
      if (approveInput) approveInput.value = state.autoApprovePO;

      // Render organizational metadata (guard each — a missing field must not abort the refresh)
      const setMeta = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = (val === undefined || val === null || val === '') ? 'Not set' : val; };
      setMeta('settings-meta-id', currentOrg.ROWID);
      setMeta('settings-meta-name', currentOrg.Name);
      setMeta('settings-meta-domain', currentOrg.Domain || 'Not set');
      setMeta('settings-meta-status', currentOrg.Status);

      const drawerOrgName = document.getElementById('drawer-org-name');
      const drawerOrgDomain = document.getElementById('drawer-org-domain');
      if (drawerOrgName) drawerOrgName.textContent = currentOrg.Name;
      if (drawerOrgDomain) drawerOrgDomain.textContent = currentOrg.Domain || '';
    } catch (e) {
      console.warn('Failed to parse settings JSON:', e);
    }
  }

  try {
    // Synchronize core tables in parallel
    const [roles, users, suppliers, items, prs, pos, grns, invoices, budgets, rfqs, rBills, credits, cMods] = await Promise.all([
      apiRequest('GET', '/api/roles'),
      apiRequest('GET', '/api/users'),
      apiRequest('GET', '/api/suppliers'),
      apiRequest('GET', '/api/items'),
      apiRequest('GET', '/api/prs'),
      apiRequest('GET', '/api/pos'),
      apiRequest('GET', '/api/grns'),
      apiRequest('GET', '/api/invoices'),
      apiRequest('GET', '/api/budgets').catch(() => []),
      apiRequest('GET', '/api/rfqs').catch(() => []),
      apiRequest('GET', '/api/recurring-bills').catch(() => []),
      apiRequest('GET', '/api/vendor-credits').catch(() => []),
      apiRequest('GET', '/api/custom-modules').catch(() => [])
    ]);

    state.roles = roles;
    state.users = users;
    state.suppliers = suppliers;
    state.items = items;
    state.prs = prs;
    state.pos = pos;
    state.grns = grns;
    state.invoices = invoices;
    state.budgets = budgets || [];
    state.rfqs = rfqs || [];
    state.recurringBills = rBills || [];
    state.vendorCredits = credits || [];
    state.customModules = cMods || [];

    // Trigger local render engines
    renderRolesAndUsers();
    renderSuppliersAndItems();
    renderRequisitions();
    if (typeof renderRFQs === 'function') renderRFQs();
    renderPurchaseOrders();
    renderGoodsReceipts();
    renderInvoicesAndMatches();
    renderBudgets();
    renderDashboardOverview();
    renderRecurringBills();
    renderVendorCredits();
    renderCustomModules();
    if (document.getElementById('analytics-page').classList.contains('active')) {
      window.loadAnalytics();
    }
  } catch (err) {
    console.warn('Refreshing via Local Sandbox mode.');
    // Keep local list rendering
    renderRolesAndUsers();
    renderSuppliersAndItems();
    renderRequisitions();
    if (typeof renderRFQs === 'function') renderRFQs();
    renderPurchaseOrders();
    renderGoodsReceipts();
    renderInvoicesAndMatches();
    renderBudgets();
    renderDashboardOverview();
  }
}

// -------------------------------------------------------------
// Rendering Modules (Unified List Mapping)
// -------------------------------------------------------------
function renderDashboardOverview() {
  const totalSpend = state.pos.reduce((sum, po) => sum + Number(po.TotalAmount || 0), 0);
  const pendingPRs = state.prs.filter(pr => pr.Status === 'Pending_Approval').length;
  const matchSuccess = state.invoices.length > 0
    ? (state.invoices.filter(i => i.Status === 'Matched').length / state.invoices.length) * 100
    : 100;

  document.getElementById('card-total-spend').textContent = `$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('card-pending-prs').textContent = pendingPRs;
  document.getElementById('card-suppliers').textContent = state.suppliers.length;
  document.getElementById('card-match-rate').textContent = `${matchSuccess.toFixed(0)}%`;

  // Render recent PRs in the overview table
  const tbody = document.getElementById('recent-prs-table').querySelector('tbody');
  tbody.innerHTML = '';
  
  const recentList = state.prs.slice(0, 5);
  if (recentList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No recent requisitions filed. Onboard demo data to preview.</td></tr>`;
    return;
  }

  recentList.forEach(pr => {
    const requestor = state.users.find(u => u.ROWID === pr.RequestorID);
    const badgeMap = {
      'Pending_Approval': 'badge-warning',
      'Approved': 'badge-success',
      'Converted_To_PO': 'badge-primary'
    };
    const badgeClass = badgeMap[pr.Status] || 'badge-info';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${pr.PRNumber || 'PR-TMP'}</strong></td>
      <td>${requestor ? requestor.FullName : 'General Staff'}</td>
      <td>${pr.Justification || 'No justification'}</td>
      <td>$${Number(pr.TotalAmount).toFixed(2)}</td>
      <td><span class="badge ${badgeClass}">${pr.Status.replace(/_/g, ' ')}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRolesAndUsers() {
  // 1. Dropdown options
  const roleSelect = document.getElementById('user-role-id');
  const prRequestorSelect = document.getElementById('pr-requestor-id');
  
  if (roleSelect) {
    roleSelect.innerHTML = '<option value="">Select Profile...</option>';
    state.roles.forEach(r => {
      roleSelect.innerHTML += `<option value="${r.ROWID}">${r.RoleName}</option>`;
    });
  }

  if (prRequestorSelect) {
    prRequestorSelect.innerHTML = '<option value="">Select Employee...</option>';
    state.users.forEach(u => {
      prRequestorSelect.innerHTML += `<option value="${u.ROWID}">${u.FullName} (Limit: $${Number(u.ApprovalLimit).toLocaleString()})</option>`;
    });
  }

  // 2. Personnel table — renders into the settings "Users" tab tbody
  const tbody = document.getElementById('settings-users-list');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (state.users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No corporate personnel registered.</td></tr>`;
    return;
  }

  state.users.forEach(u => {
    const role = state.roles.find(r => r.ROWID === u.RoleID);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.FullName || ''}<div style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">Limit: $${Number(u.ApprovalLimit || 0).toLocaleString()}</div></strong></td>
      <td>${u.Email || ''}</td>
      <td>${role ? role.RoleName : 'Standard User'}</td>
      <td><span class="badge badge-success">${u.Status || 'Active'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSuppliersAndItems() {
  // Master Supplier Table
  const sTbody = document.getElementById('suppliers-table').querySelector('tbody');
  sTbody.innerHTML = '';
  if (state.suppliers.length === 0) {
    sTbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">No active suppliers.</td></tr>`;
  } else {
    state.suppliers.forEach(s => {
      sTbody.innerHTML += `<tr><td><strong>${s.Name}</strong></td><td>${s.ContactEmail}</td></tr>`;
    });
  }

  // Master Catalog Table
  const iTbody = document.getElementById('items-table').querySelector('tbody');
  iTbody.innerHTML = '';
  if (state.items.length === 0) {
    iTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No catalog inventory items.</td></tr>`;
  } else {
    state.items.forEach(i => {
      iTbody.innerHTML += `
        <tr>
          <td><code>${i.SKU}</code></td>
          <td><strong>${i.Name}</strong></td>
          <td>$${Number(i.UnitPrice).toFixed(2)}</td>
          <td>${i.Category || 'General'}</td>
        </tr>
      `;
    });
  }

  // Rebuild PR lines dropdowns if open
  rebuildPRLineDropdowns();
}

function renderRequisitions() {
  const tbody = document.getElementById('all-prs-table').querySelector('tbody');
  tbody.innerHTML = '';

  if (state.prs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No requisitions logged. Create a PR to start.</td></tr>`;
    return;
  }

  state.prs.forEach(pr => {
    const requestor = state.users.find(u => u.ROWID === pr.RequestorID);
    const approver = state.users.find(u => u.ROWID === pr.CurrentApproverID);
    
    let badgeClass = 'badge-warning';
    if (pr.Status === 'Approved') badgeClass = 'badge-success';
    if (pr.Status === 'Converted_To_PO') badgeClass = 'badge-primary';

    let actionBtnMarkup = '---';
    if (pr.Status === 'Pending_Approval') {
      actionBtnMarkup = `
        <div style="display:flex;gap:0.4rem;align-items:center;">
          <button class="btn btn-success" onclick="approveRequisition('${pr.ROWID}')" style="padding:0.3rem 0.5rem;font-size:0.75rem;">Approve</button>
          <span style="font-size:0.7rem;color:var(--text-muted);">Approver: ${approver ? approver.FullName : 'Manager'}</span>
        </div>
      `;
    } else if (pr.Status === 'Approved') {
      actionBtnMarkup = `
        <div style="display:flex; gap:0.3rem;">
          <button class="btn btn-secondary" onclick="convertToRFQ('${pr.ROWID}')" style="padding:0.3rem 0.6rem;font-size:0.75rem;">Convert to RFQ</button>
          <button class="btn btn-primary" onclick="triggerConvertPOModal('${pr.ROWID}')" style="padding:0.3rem 0.6rem;font-size:0.75rem;">Convert to PO</button>
        </div>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${pr.PRNumber || 'PR-TMP'}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${requestor ? requestor.FullName : 'Staff'}</span></td>
      <td>${pr.Justification || 'Procurement items'}</td>
      <td><strong>$${Number(pr.TotalAmount).toFixed(2)}</strong></td>
      <td><span class="badge ${badgeClass}">${pr.Status.replace(/_/g, ' ')}</span></td>
      <td>${actionBtnMarkup}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRFQs() {
  const tbody = document.getElementById('all-rfqs-table').querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';

  if (state.rfqs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No RFQs published yet.</td></tr>`;
    return;
  }

  state.rfqs.forEach(rfq => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${rfq.RFQNumber}</strong></td>
      <td><code>${rfq.PRID}</code></td>
      <td><span class="badge badge-info">${rfq.Status}</span></td>
      <td>${new Date(rfq.Deadline).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-secondary" onclick="viewRfqBids('${rfq.ROWID}')" style="padding:0.3rem 0.5rem;font-size:0.75rem;">View Bids / Vendor Portal</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPurchaseOrders() {
  const tbody = document.getElementById('all-pos-table').querySelector('tbody');
  tbody.innerHTML = '';

  // Dropdown for GRN
  const grnPoSelect = document.getElementById('grn-poid');
  const invPoSelect = document.getElementById('inv-poid');
  if (grnPoSelect) grnPoSelect.innerHTML = '<option value="">Select Active PO...</option>';
  if (invPoSelect) invPoSelect.innerHTML = '<option value="">Select PO...</option>';

  if (state.pos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No Purchase Orders active.</td></tr>`;
    return;
  }

  state.pos.forEach(po => {
    const supplier = state.suppliers.find(s => s.ROWID === po.SupplierID);
    
    // Populate dropdown selection in checklist
    if (po.Status === 'Sent_To_Supplier' || po.Status === 'Active') {
      if (grnPoSelect) grnPoSelect.innerHTML += `<option value="${po.ROWID}">${po.PONumber} (${supplier ? supplier.Name : 'Vendor'})</option>`;
    }
    if (invPoSelect) invPoSelect.innerHTML += `<option value="${po.ROWID}">${po.PONumber} ($${Number(po.TotalAmount).toFixed(2)})</option>`;

    let badgeClass = 'badge-primary';
    if (po.Status === 'Fulfilled') badgeClass = 'badge-success';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${po.PONumber}</strong></td>
      <td><code>${po.PRID}</code></td>
      <td>${supplier ? supplier.Name : 'Registered Supplier'}</td>
      <td><strong>$${Number(po.TotalAmount).toFixed(2)}</strong></td>
      <td><span class="badge ${badgeClass}">${po.Status.replace(/_/g, ' ')}</span></td>
      <td>
        <button class="btn btn-secondary" onclick="viewPOContract('${po.ROWID}')" style="padding:0.3rem 0.5rem;font-size:0.75rem;">View Contract</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderGoodsReceipts() {
  const tbody = document.getElementById('all-grns-table').querySelector('tbody');
  tbody.innerHTML = '';

  // Populate personnel selectors in GRN Form
  const grnAuditor = document.getElementById('grn-received-by-id');
  if (grnAuditor) {
    grnAuditor.innerHTML = '<option value="">Select Personnel...</option>';
    state.users.forEach(u => {
      grnAuditor.innerHTML += `<option value="${u.ROWID}">${u.FullName}</option>`;
    });
  }

  if (state.grns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No Goods Receipts logged.</td></tr>`;
    return;
  }

  state.grns.forEach(grn => {
    const po = state.pos.find(p => p.ROWID === grn.POID);
    const auditor = state.users.find(u => u.ROWID === grn.ReceivedByID);
    const date = new Date(grn.ReceivedDate || grn.CREATED_TIME).toLocaleDateString();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${grn.GRNNumber}</strong></td>
      <td>${po ? po.PONumber : 'PO-Ref'}</td>
      <td>${date}</td>
      <td><span class="badge badge-success">Warehouse Received</span><br><span style="font-size:0.7rem;color:var(--text-muted);">Audited by: ${auditor ? auditor.FullName : 'Staff'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderInvoicesAndMatches() {
  const tbody = document.getElementById('all-invoices-table').querySelector('tbody');
  tbody.innerHTML = '';

  if (state.invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No invoiced bills found.</td></tr>`;
    return;
  }

  state.invoices.forEach(inv => {
    const po = state.pos.find(p => p.ROWID === inv.POID);
    const date = new Date(inv.SupplierInvoiceDate || inv.CREATED_TIME).toLocaleDateString();
    
    let badgeClass = 'badge-warning';
    if (inv.Status === 'Matched') badgeClass = 'badge-success';
    if (inv.Status === 'Discrepancy') badgeClass = 'badge-danger';
    if (inv.Status === 'Paid') badgeClass = 'badge-primary';

    let actionBtnMarkup = '---';
    if (inv.Status === 'Matched') {
      actionBtnMarkup = `
        <button class="btn btn-success" onclick="openPaymentDrawer('${inv.ROWID}', ${inv.Amount})" style="padding:0.3rem 0.5rem;font-size:0.75rem;">Pay Bill</button>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${inv.InvoiceNumber}</strong></td>
      <td>${po ? po.PONumber : 'PO-Ref'}</td>
      <td><strong>$${Number(inv.Amount).toFixed(2)}</strong></td>
      <td><span class="badge ${badgeClass}">${inv.Status}</span></td>
      <td><span style="font-weight:600;font-size:0.8rem;color:var(--text-secondary);">${inv.MatchScore || 'N/A'}</span></td>
      <td>${date}</td>
      <td>${actionBtnMarkup}</td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// Interactive Operations Event Handlers
// -------------------------------------------------------------

// Approve Requisition
window.approveRequisition = async function(prId) {
  try {
    showToast('Authorizing purchase requisition under DoA guidelines...', 'warning');
    await apiRequest('POST', `/api/prs/${prId}/approve`);
    showToast('Requisition approved successfully! Ready for PO or RFQ promotion.', 'success');
    await refreshAllData();
  } catch (err) {
    // Fail-soft mock bypass
    const pr = state.prs.find(p => p.ROWID === prId);
    if (pr) {
      pr.Status = 'Approved';
      pr.CurrentApproverID = null;
      showToast('[Offline] Requisition authorized.', 'success');
      await refreshAllData();
    }
  }
};

// Convert PR to PO Modal Triggers
window.triggerConvertPOModal = function(prId) {
  document.getElementById('convert-pr-id').value = prId;
  
  // Populate Suppliers select
  const supplierSelect = document.getElementById('convert-po-supplier');
  supplierSelect.innerHTML = '<option value="">Select Vendor...</option>';
  state.suppliers.forEach(s => {
    supplierSelect.innerHTML += `<option value="${s.ROWID}">${s.Name}</option>`;
  });
  
  openModal('modal-convert-po');
};

document.getElementById('convert-po-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prId = document.getElementById('convert-pr-id').value;
  const supplierId = document.getElementById('convert-po-supplier').value;
  const terms = document.getElementById('convert-po-terms').value.trim();

  closeModal('modal-convert-po');
  showToast('Generating official Purchase Contract order...', 'warning');

  try {
    await apiRequest('POST', `/api/pos/convert/${prId}`, {
      SupplierID: supplierId,
      Terms: terms
    });
    showToast('Purchase Order issued successfully!', 'success');
    await refreshAllData();
  } catch (err) {
    // Mock sandbox convert PO
    const pr = state.prs.find(p => p.ROWID === prId);
    if (pr) {
      pr.Status = 'Converted_To_PO';
      const poNum = `PO-${Date.now().toString().slice(-6)}`;
      state.pos.push({
        ROWID: `PO-ID-${Date.now().toString().slice(-4)}`,
        PONumber: poNum,
        PRID: pr.PRNumber,
        SupplierID: supplierId,
        TotalAmount: pr.TotalAmount,
        Status: 'Sent_To_Supplier',
        Terms: terms
      });
      showToast('[Offline] Requisition converted to PO.', 'success');
      await refreshAllData();
    }
  }
});

// View Contract Document Drawer
window.viewPOContract = async function(poId) {
  const po = state.pos.find(p => p.ROWID === poId);
  if (!po) return;

  const drawer = document.getElementById('po-contract-drawer');
  const header = document.getElementById('po-contract-header');
  const termsDiv = document.getElementById('po-contract-terms');
  const tableBody = document.getElementById('po-contract-items-table').querySelector('tbody');

  header.textContent = `Purchase Order Contract: ${po.PONumber}`;
  termsDiv.textContent = po.Terms || 'Standard Payment Terms Net 30.';
  tableBody.innerHTML = '';

  try {
    // Query PO Items
    const details = await apiRequest('GET', `/api/pos/${poId}`);
    details.items.forEach(line => {
      const item = state.items.find(i => i.ROWID === line.ItemID);
      tableBody.innerHTML += `
        <tr>
          <td><code>${item ? item.SKU : 'SKU'}</code></td>
          <td>${line.Quantity} units</td>
          <td>$${Number(line.UnitPrice).toFixed(2)}</td>
        </tr>
      `;
    });
  } catch (err) {
    // Offline simulation render
    const item = state.items[0] || { SKU: 'HW-LEN-T14', UnitPrice: 1299 };
    tableBody.innerHTML += `
      <tr>
        <td><code>${item.SKU}</code></td>
        <td>1 units</td>
        <td>$${Number(item.UnitPrice).toFixed(2)}</td>
      </tr>
    `;
  }

  drawer.style.display = 'block';
  drawer.scrollIntoView({ behavior: 'smooth' });
};

// -------------------------------------------------------------
// Interactive Dynamic PR Line Builders
// -------------------------------------------------------------
let prLineCount = 0;

function rebuildPRLineDropdowns() {
  document.querySelectorAll('.line-item-select').forEach(sel => {
    const prevVal = sel.value;
    sel.innerHTML = '<option value="">Select Catalog Item...</option>';
    state.items.forEach(i => {
      sel.innerHTML += `<option value="${i.ROWID}" data-price="${i.UnitPrice}">${i.Name} ($${Number(i.UnitPrice).toFixed(2)})</option>`;
    });
    sel.value = prevVal;
  });
}

function addPRLine() {
  const container = document.getElementById('pr-lines-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'form-row-split';
  div.style.alignItems = 'center';
  div.setAttribute('data-line-index', prLineCount);

  div.innerHTML = `
    <select class="form-control line-item-select" required style="flex-grow:1;">
      <option value="">Select Catalog Item...</option>
    </select>
    <div style="display:flex;gap:0.4rem;align-items:center;width:120px;">
      <input type="number" class="form-control line-item-qty" placeholder="Qty" min="1" value="1" required style="text-align:center;">
      <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()" style="padding:0.4rem;color:var(--color-danger);border-color:rgba(239,68,68,0.2);">&times;</button>
    </div>
  `;

  container.appendChild(div);
  rebuildPRLineDropdowns();
  prLineCount++;
}

document.getElementById('btn-add-pr-line').addEventListener('click', addPRLine);

// Initialize single line on load
setTimeout(() => {
  addPRLine();
}, 200);

// PR Form submit
document.getElementById('create-pr-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const requestorId = document.getElementById('pr-requestor-id').value;
  const justification = document.getElementById('pr-justification').value.trim();
  const department = document.getElementById('pr-department').value;

  const lines = [];
  document.querySelectorAll('#pr-lines-container .form-row-split').forEach(div => {
    const itemSelect = div.querySelector('.line-item-select');
    const qtyInput = div.querySelector('.line-item-qty');
    if (itemSelect && itemSelect.value) {
      lines.push({
        ItemID: itemSelect.value,
        Quantity: Number(qtyInput.value)
      });
    }
  });

  if (lines.length === 0) {
    showToast('Add at least one item line to your requisition.', 'warning');
    return;
  }

  showToast('Filing corporate requisition...', 'warning');

  try {
    const prResult = await apiRequest('POST', '/api/prs', {
      RequestorID: requestorId,
      Justification: justification,
      Department: department,
      Items: lines
    });

    if (prResult.Status === 'Approved') {
      showToast('Requisition auto-approved under Delegation of Authority (DoA) limits!', 'success');
    } else {
      showToast('Requisition pending manager limit approval.', 'warning');
    }

    document.getElementById('create-pr-form').reset();
    document.getElementById('pr-lines-container').innerHTML = '';
    addPRLine();
    await refreshAllData();
  } catch (err) {
    if (err.message && err.message.includes('Budget Exceeded')) {
      showToast(err.message, 'error');
      return;
    }
    // Mock PR creation fallback
    const req = state.users.find(u => u.ROWID === requestorId);
    let total = 0;
    lines.forEach(l => {
      const item = state.items.find(i => i.ROWID === l.ItemID);
      total += (item ? item.UnitPrice : 1299) * l.Quantity;
    });

    const isPending = total > (req ? req.ApprovalLimit : 5000);
    const prNum = `PR-${Date.now().toString().slice(-6)}`;
    
    state.prs.push({
      ROWID: `PR-ID-${Date.now().toString().slice(-4)}`,
      PRNumber: prNum,
      RequestorID: requestorId,
      Justification: justification,
      TotalAmount: total,
      Status: isPending ? 'Pending_Approval' : 'Approved',
      CurrentApproverID: isPending ? state.users[0]?.ROWID : null
    });

    showToast(`[Offline] Requisition logged ($${total.toFixed(2)}).`, 'success');
    document.getElementById('create-pr-form').reset();
    document.getElementById('pr-lines-container').innerHTML = '';
    addPRLine();
    await refreshAllData();
  }
});

// -------------------------------------------------------------
// Interactive Dynamic Goods Receipt Note Checklist
// -------------------------------------------------------------
document.getElementById('grn-poid').addEventListener('change', async (e) => {
  const poid = e.target.value;
  const container = document.getElementById('grn-lines-container');
  if (!poid) {
    container.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem;">Select a valid Purchase Order contract above to generate receipt checkpoints.</div>`;
    return;
  }

  container.innerHTML = '<div style="font-size:0.8rem;text-align:center;">Querying contract line items...</div>';

  try {
    const details = await apiRequest('GET', `/api/pos/${poid}`);
    container.innerHTML = '';
    details.items.forEach((line, index) => {
      const item = state.items.find(i => i.ROWID === line.ItemID);
      const name = item ? item.Name : `SKU:${line.ItemID}`;
      
      container.innerHTML += `
        <div style="background:#ffffff; border:1px solid var(--border-color); padding:0.75rem; border-radius:var(--radius-sm); display:flex; flex-direction:column; gap:0.5rem;" data-item-id="${line.ItemID}">
          <div style="font-weight:700; font-size:0.82rem; color:var(--text-primary);">${name} (Ordered: ${line.Quantity} units)</div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.5rem;">
            <div class="form-group" style="margin-bottom:0;">
              <label style="font-size:0.65rem;">Received Count</label>
              <input type="number" class="form-control grn-received-qty" value="${line.Quantity}" min="0" style="padding:0.4rem;font-size:0.8rem;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label style="font-size:0.65rem;color:var(--color-success);">Accepted</label>
              <input type="number" class="form-control grn-accepted-qty" value="${line.Quantity}" min="0" style="padding:0.4rem;font-size:0.8rem;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label style="font-size:0.65rem;color:var(--color-danger);">Rejected</label>
              <input type="number" class="form-control grn-rejected-qty" value="0" min="0" style="padding:0.4rem;font-size:0.8rem;">
            </div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    container.innerHTML = `
      <div style="background:#ffffff; border:1px solid var(--border-color); padding:0.75rem; border-radius:var(--radius-sm); display:flex; flex-direction:column; gap:0.5rem;" data-item-id="MOCK-ID">
        <div style="font-weight:700; font-size:0.82rem; color:var(--text-primary);">T14 Lenovo Laptop (Ordered: 1 units)</div>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.5rem;">
          <div class="form-group" style="margin-bottom:0;"><label style="font-size:0.65rem;">Received</label><input type="number" class="form-control grn-received-qty" value="1" style="padding:0.4rem;font-size:0.8rem;"></div>
          <div class="form-group" style="margin-bottom:0;"><label style="font-size:0.65rem;color:var(--color-success);">Accepted</label><input type="number" class="form-control grn-accepted-qty" value="1" style="padding:0.4rem;font-size:0.8rem;"></div>
          <div class="form-group" style="margin-bottom:0;"><label style="font-size:0.65rem;color:var(--color-danger);">Rejected</label><input type="number" class="form-control grn-rejected-qty" value="0" style="padding:0.4rem;font-size:0.8rem;"></div>
        </div>
      </div>
    `;
  }
});

document.getElementById('create-grn-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const poid = document.getElementById('grn-poid').value;
  const receivedBy = document.getElementById('grn-received-by-id').value;

  const lines = [];
  document.querySelectorAll('#grn-lines-container [data-item-id]').forEach(div => {
    const itemId = div.getAttribute('data-item-id');
    const rx = Number(div.querySelector('.grn-received-qty').value);
    const ac = Number(div.querySelector('.grn-accepted-qty').value);
    const rj = Number(div.querySelector('.grn-rejected-qty').value);
    lines.push({
      ItemID: itemId,
      QuantityReceived: rx,
      QuantityAccepted: ac,
      QuantityRejected: rj
    });
  });

  showToast('Filing Goods Receipt Note & verifying warehouse stock...', 'warning');

  try {
    await apiRequest('POST', '/api/grns', {
      POID: poid,
      ReceivedByID: receivedBy,
      Items: lines
    });
    showToast('Goods Receipt Ledger generated and PO updated to Fulfilled!', 'success');
    document.getElementById('create-grn-form').reset();
    document.getElementById('grn-lines-container').innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem;">Select a valid Purchase Order contract above to generate receipt checkpoints.</div>`;
    await refreshAllData();
  } catch (err) {
    // Mock sandbox convert PO
    const po = state.pos.find(p => p.ROWID === poid);
    if (po) {
      po.Status = 'Fulfilled';
      const grnNum = `GRN-${Date.now().toString().slice(-6)}`;
      state.grns.push({
        ROWID: `GRN-ID-${Date.now().toString().slice(-4)}`,
        GRNNumber: grnNum,
        POID: poid,
        ReceivedByID: receivedBy,
        ReceivedDate: new Date().toISOString()
      });
      showToast('[Offline] Goods Receipt logged.', 'success');
      document.getElementById('create-grn-form').reset();
      document.getElementById('grn-lines-container').innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem;">Select a valid Purchase Order contract above to generate receipt checkpoints.</div>`;
      await refreshAllData();
    }
  }
});

// -------------------------------------------------------------
// Interactive 3-Way Match Audit Verification Engine
// -------------------------------------------------------------
document.getElementById('create-invoice-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const invoiceNum = document.getElementById('inv-number').value.trim();
  const poid = document.getElementById('inv-poid').value;
  const amount = Number(document.getElementById('inv-amount').value);
  const date = document.getElementById('inv-date').value;

  showToast('Executing automated 3-Way comparison audit...', 'warning');

  try {
    const result = await apiRequest('POST', '/api/invoices', {
      InvoiceNumber: invoiceNum,
      POID: poid,
      Amount: amount,
      SupplierInvoiceDate: date
    });

    // Render report side-by-side
    renderMatchingReport(invoiceNum, poid, amount, result);
    await refreshAllData();
  } catch (err) {
    // Offline simulation match audit
    const po = state.pos.find(p => p.ROWID === poid);
    const grn = state.grns.find(g => g.POID === poid);
    
    let status = 'Matched';
    let remark = '100% Perfect Match Verified (PO, Delivery, Invoice aligned)';

    if (!grn) {
      status = 'Unmatched';
      remark = 'Verification Mismatch: Warehouse Goods Receipt Note (GRN) missing on file for this contract PO.';
    } else if (po && Math.abs(po.TotalAmount - amount) > 0.05) {
      status = 'Discrepancy';
      remark = `Financial Mismatch Flagged: Supplier bill total is $${amount.toFixed(2)}, which deviates from contract value $${Number(po.TotalAmount).toFixed(2)}.`;
    }

    state.invoices.push({
      ROWID: `INV-ID-${Date.now().toString().slice(-4)}`,
      InvoiceNumber: invoiceNum,
      POID: poid,
      Amount: amount,
      SupplierInvoiceDate: date,
      Status: status,
      MatchScore: remark
    });

    renderMatchingReport(invoiceNum, poid, amount, { status, matchScore: remark, po, grn });
    await refreshAllData();
  }
});

function renderMatchingReport(invoiceNum, poid, amount, res) {
  document.getElementById('matching-placeholder').style.display = 'none';
  const report = document.getElementById('match-report-card');
  report.style.display = 'flex';

  document.getElementById('report-invoice-number').textContent = `Invoice: ${invoiceNum}`;
  
  const po = state.pos.find(p => p.ROWID === poid);
  document.getElementById('report-po-ref').textContent = `Purchase Order Ref: ${po ? po.PONumber : 'Unknown'}`;

  // Amount rendering
  const poAmount = po ? Number(po.TotalAmount) : 0;
  document.getElementById('report-val-po').textContent = `$${poAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('report-val-invoice').textContent = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const grn = state.grns.find(g => g.POID === poid);
  document.getElementById('report-val-grn').textContent = grn ? 'Received (100%)' : 'None (0%)';

  // Badge coloring
  const statusBadge = document.getElementById('report-match-badge');
  statusBadge.className = 'badge';
  
  const grnBadge = document.getElementById('report-grn-badge');
  const invBadge = document.getElementById('report-invoice-badge');

  grnBadge.className = 'badge';
  invBadge.className = 'badge';

  if (res.status === 'Matched') {
    statusBadge.classList.add('badge-success');
    statusBadge.textContent = 'Perfect Match';
    
    grnBadge.classList.add('badge-success');
    grnBadge.textContent = 'Checks Out';
    
    invBadge.classList.add('badge-success');
    invBadge.textContent = 'Aligned';
  } else if (res.status === 'Unmatched') {
    statusBadge.classList.add('badge-warning');
    statusBadge.textContent = 'Unmatched';

    grnBadge.classList.add('badge-warning');
    grnBadge.textContent = 'Missing GRN';

    invBadge.classList.add('badge-warning');
    invBadge.textContent = 'Pending Audit';
  } else {
    statusBadge.classList.add('badge-danger');
    statusBadge.textContent = 'Mismatch Flag';

    grnBadge.classList.add('badge-warning');
    grnBadge.textContent = 'Discrepancy';

    invBadge.classList.add('badge-danger');
    invBadge.textContent = 'Bill Mismatch';
  }

  // Narrative text
  document.getElementById('report-details-narrative').textContent = res.matchScore || res.score || 'Verification audits finished.';
}

// -------------------------------------------------------------
// Operational Settings Policies Submit
// -------------------------------------------------------------
document.getElementById('settings-org-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const tolerance = Number(document.getElementById('settings-tolerance').value);
  const autoLimit = Number(document.getElementById('settings-autoapprove').value);
  const currency = document.getElementById('settings-currency').value;

  showToast('Updating organizational operational policies...', 'warning');

  try {
    await apiRequest('PUT', `/api/organizations/${state.activeOrgId}`, {
      Settings: { tolerance, autoApproveLimit: autoLimit, currency }
    });
    showToast('Corporate operational policies updated successfully!', 'success');
    await loadOrganizations();
  } catch (err) {
    state.matchingTolerance = tolerance;
    state.autoApprovePO = autoLimit;
    showToast('[Offline] Corporate settings updated.', 'success');
  }
});

// -------------------------------------------------------------
// Certified Enterprise Seeder Sets (Auto sandbox demo dataset)
// -------------------------------------------------------------
async function onboardDemoDataset() {
  try {
    // 1. Onboard Suppliers
    const s1 = await apiRequest('POST', '/api/suppliers', { Name: 'Global Tech Supplies Ltd', ContactEmail: 'b2b@globaltech.com' });
    const s2 = await apiRequest('POST', '/api/suppliers', { Name: 'Lenovo Enterprise Corp', ContactEmail: 'procurements@lenovo.com' });

    // 2. Onboard Items
    await apiRequest('POST', '/api/items', { SKU: 'HW-LEN-T14', Name: 'ThinkPad T14 Enterprise Laptop', UnitPrice: 1299.00, Category: 'Hardware' });
    await apiRequest('POST', '/api/items', { SKU: 'SW-SLK-PRO', Name: 'Slack Pro Enterprise License', UnitPrice: 240.00, Category: 'Software' });

    // 3. Onboard Department Leads
    const clerk = await apiRequest('POST', '/api/users', { FullName: 'Alice Smith (Buyer)', Email: 'alice@company.com', ApprovalLimit: 2000.00 });
    const lead = await apiRequest('POST', '/api/users', { FullName: 'Bob Vance (Director)', Email: 'bob@company.com', ApprovalLimit: 15000.00 });

    // 4. Onboard Budgets
    await apiRequest('POST', '/api/budgets', { Department: 'Research & Development', Amount: 50000.00, FiscalYear: '2026' });
    await apiRequest('POST', '/api/budgets', { Department: 'Finance & Accounts', Amount: 25000.00, FiscalYear: '2026' });

    showToast('Certified Enterprise Sandbox dataset seeded in Zoho Cloud successfully!', 'success');
    await refreshAllData();
  } catch (err) {
    // offline seeder
    state.roles = [
      { ROWID: 'R1', RoleName: 'Super Admin', Permissions: '["*"]' },
      { ROWID: 'R2', RoleName: 'Buyer Clerk', Permissions: '["create_pr", "receive_grn"]' },
      { ROWID: 'R3', RoleName: 'Financial Lead', Permissions: '["approve_pr", "create_po", "match_invoice"]' }
    ];

    state.users = [
      { ROWID: 'U1', FullName: 'Alice Smith (Buyer)', Email: 'alice@procureflow.local', RoleID: 'R2', ApprovalLimit: 1500.00, Status: 'Active' },
      { ROWID: 'U2', FullName: 'Bob Vance (Director)', Email: 'bob@procureflow.local', RoleID: 'R3', ApprovalLimit: 15000.00, Status: 'Active' }
    ];

    state.suppliers = [
      { ROWID: 'S1', Name: 'Global Tech Supplies Ltd', ContactEmail: 'b2b@globaltech.com' },
      { ROWID: 'S2', Name: 'Lenovo Enterprise Corp', ContactEmail: 'procurements@lenovo.com' }
    ];

    state.items = [
      { ROWID: 'I1', SKU: 'HW-LEN-T14', Name: 'ThinkPad T14 Enterprise Laptop', UnitPrice: 1299.00, Category: 'Hardware' },
      { ROWID: 'I2', SKU: 'SW-SLK-PRO', Name: 'Slack Pro Enterprise License', UnitPrice: 240.00, Category: 'Software' }
    ];

    // Seed transaction flow
    const prId = `PR-ID-${Date.now().toString().slice(-4)}`;
    state.prs = [
      { ROWID: prId, PRNumber: 'PR-871032', RequestorID: 'U1', Justification: 'Office Q3 hardware upgrade', TotalAmount: 1299.00, Status: 'Approved', CurrentApproverID: null }
    ];

    const poId = `PO-ID-${Date.now().toString().slice(-4)}`;
    state.pos = [
      { ROWID: poId, PONumber: 'PO-301254', PRID: 'PR-871032', SupplierID: 'S2', TotalAmount: 1299.00, Status: 'Sent_To_Supplier', Terms: 'Standard Net 30.' }
    ];

    state.budgets = [
      { ROWID: 'B1', Department: 'Research & Development', Amount: 50000.00, FiscalYear: '2026', Spent: 1299.00, Status: 'Active' },
      { ROWID: 'B2', Department: 'Finance & Accounts', Amount: 2500.00, FiscalYear: '2026', Spent: 0.0, Status: 'Active' }
    ];

    showToast('[Offline] Demonstration sandbox dataset seeded successfully.', 'success');
    await refreshAllData();
  }
}

// -------------------------------------------------------------
// 📊 Budgets & Spend Analytics Rendering & Form Handling
// -------------------------------------------------------------
function renderBudgets() {
  const container = document.getElementById('budgets-container');
  if (!container) return;

  container.innerHTML = '';

  if (state.budgets.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">
        No active budgets found. Add a department budget limit below.
      </div>`;
    return;
  }

  // Calculate spent per department from active POs
  const departmentSpent = {};
  state.budgets.forEach(b => {
    departmentSpent[b.Department] = 0;
  });

  state.pos.forEach(po => {
    const pr = state.prs.find(p => p.ROWID === po.PRID);
    if (pr) {
      const user = state.users.find(u => u.ROWID === pr.RequestorID);
      if (user) {
        let dept = 'Information Technology'; // Default mapping
        if (user.FullName.includes('Alice') || user.Email.includes('alice')) {
          dept = 'Research & Development';
        } else if (user.FullName.includes('Bob') || user.Email.includes('bob')) {
          dept = 'Finance & Accounts';
        }
        
        if (departmentSpent[dept] !== undefined) {
          departmentSpent[dept] += Number(po.TotalAmount || 0);
        }
      }
    }
  });

  state.budgets.forEach(b => {
    const spent = departmentSpent[b.Department] || Number(b.Spent || 0);
    const limit = Number(b.Amount || 1);
    const pct = Math.min((spent / limit) * 100, 100);
    
    // Check warning trigger (> 85%)
    const isWarning = pct >= 85;
    const barColor = isWarning ? 'var(--color-danger)' : 'var(--color-primary)';
    const warningBadge = isWarning 
      ? `<span class="badge badge-danger" style="margin-left:auto;font-size:0.65rem;font-weight:700;">⚠️ Limit Alert >85%</span>` 
      : '<span class="badge badge-success" style="margin-left:auto;font-size:0.65rem;font-weight:700;">Within Limit</span>';

    const card = document.createElement('div');
    card.style.border = '1px solid var(--border-color)';
    card.style.borderRadius = 'var(--radius-md)';
    card.style.padding = '1.25rem';
    card.style.background = isWarning ? 'rgba(239, 68, 68, 0.02)' : '#ffffff';
    card.style.borderColor = isWarning ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)';
    card.style.boxShadow = 'var(--shadow-sm)';

    card.innerHTML = `
      <div style="display:flex; align-items:center; margin-bottom:0.75rem;">
        <div style="font-weight:700; font-size:0.9rem; color:var(--text-primary);">${b.Department}</div>
        ${warningBadge}
      </div>
      
      <!-- Progress bar -->
      <div style="width:100%; height:8px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-bottom:0.5rem;">
        <div style="width:${pct}%; height:100%; background:${barColor}; transition:width 0.5s ease-out;"></div>
      </div>
      
      <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-secondary);">
        <div>Spent: <strong>$${spent.toLocaleString('en-US', {minimumFractionDigits:2})}</strong></div>
        <div>Limit: <strong>$${limit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong></div>
      </div>
    `;
    container.appendChild(card);
  });

  // Update subscription limits counters too!
  const usersCounter = document.getElementById('billing-users-usage');
  const posCounter = document.getElementById('billing-pos-usage');
  if (usersCounter) usersCounter.textContent = `${state.users.length} / 25`;
  if (posCounter) posCounter.textContent = `${state.pos.length} / 1000`;
}

// Register Budgets Form Submission
document.getElementById('add-budget-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const department = document.getElementById('budget-department').value;
  const amount = Number(document.getElementById('budget-amount').value);
  const fiscalYear = document.getElementById('budget-year').value.trim();

  showToast('Authorizing department budget allocation...', 'warning');

  try {
    await apiRequest('POST', '/api/budgets', {
      Department: department,
      Amount: amount,
      FiscalYear: fiscalYear
    });
    showToast('Department budget authorized in Zoho Datastore!', 'success');
    document.getElementById('add-budget-form').reset();
    await refreshAllData();
  } catch (err) {
    // Offline simulation
    state.budgets.push({
      ROWID: `BUDGET-${Date.now().toString().slice(-4)}`,
      Department: department,
      Amount: amount,
      FiscalYear: fiscalYear,
      Spent: 0,
      Status: 'Active'
    });
    showToast('[Offline] Department budget authorized.', 'success');
    document.getElementById('add-budget-form').reset();
    await refreshAllData();
  }
});

function initializeMockSandbox() {
  // If offline filesystem testing, initiate a gorgeous default sandbox tenant
  state.organizations = [{
    ROWID: 'MOCK--ID',
    Name: 'ProcureFlow Sandbox Enterprise',
    Domain: 'sandbox.procureflow.app',
    Status: 'Active',
    Settings: { tolerance: 0.0, autoApproveLimit: 5000 }
  }];
  state.activeOrgId = 'MOCK--ID';
  
  // Seed initial budgets in offline mode
  state.budgets = [
    { ROWID: 'B1', Department: 'Research & Development', Amount: 50000.00, FiscalYear: '2026', Spent: 0.0, Status: 'Active' },
    { ROWID: 'B2', Department: 'Finance & Accounts', Amount: 25000.00, FiscalYear: '2026', Spent: 0.0, Status: 'Active' }
  ];
  
  refreshAllData();
}

// -------------------------------------------------------------
// App Bootstrap Lifecycle
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  console.log('⚡ ProcureFlow App Initialized');
  
  // Custom interactive mock simulation triggers
  const shortcuts = ['shortcut-run-tests', 'shortcut-onboard-demo'];
  shortcuts.forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    el.addEventListener('click', async () => {
      if (s === 'shortcut-onboard-demo') {
        showToast('Injecting baseline corporate vendor directories and SKU catalogs...', 'warning');
        await onboardDemoDataset();
      } else {
        showToast('Running background test suites. Watch your browser developer console!', 'success');
      }
    });
  });

  // Handle Logout Event
  document.getElementById('btn-sign-out').addEventListener('click', () => {
    catalyst.auth.signOut('/__catalyst/auth/login');
  });

  // Check if User is Authenticated using Catalyst SDK
  // Wait for Catalyst SDK to load, with a timeout fallback
  let sdkWaitTime = 0;
  const checkSDK = setInterval(() => {
    sdkWaitTime += 100;
    
    // If SDK is loaded
    if (window.catalyst && window.catalyst.auth) {
      clearInterval(checkSDK);
      
      catalyst.auth.isUserAuthenticated().then(async (result) => {
        try {
          // Hide auth-overlay and proceed with app load
          document.getElementById('auth-overlay').style.display = 'none';

          // Get Catalyst Current User from the result object (v4.5.0+ SDK feature)
          const cUser = result.content;
          
          // Get auth token for cross-domain request
          let token = '';
          try {
            const tokenRes = await catalyst.auth.generateAuthToken();
            token = tokenRes.access_token;
          } catch(e) {
            console.warn('Could not generate token for sync', e);
          }

          // Auto-Sync User to Database (creates Org if missing)
          const syncRes = await fetch(API_BASE + '/api/sync-user', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': token
            },
            body: JSON.stringify({
              email: cUser.email_id,
              first_name: cUser.first_name,
              last_name: cUser.last_name,
              user_id: cUser.user_id
            })
          });
          
          if (!syncRes.ok) {
            throw new Error(`Sync API failed: ${syncRes.status} ${syncRes.statusText}`);
          }
          
          const dbData = await syncRes.json();
          const dbUser = dbData.user;
          
          if (!dbUser) {
            // User does not exist, show onboarding overlay
            document.getElementById('onboarding-overlay').style.display = 'flex';
            document.getElementById('signup-user-name').value = cUser.first_name + ' ' + cUser.last_name;
            document.getElementById('signup-user-email').value = cUser.email_id;
            return;
          }

          state.currentUser = {
            name: dbUser.FullName,
            role: 'User', // Will be updated on data refresh
            userId: dbUser.ROWID,
            email: dbUser.Email
          };
          
          if (dbUser.OrgID) {
            state.activeOrgId = dbUser.OrgID;
          }

          document.getElementById('display-user-name').textContent = state.currentUser.name;
          document.getElementById('display-user-role').textContent = cUser.role_details?.role_name || 'User';
          
          const drawerUserName = document.getElementById('drawer-user-name');
          const drawerUserEmail = document.getElementById('drawer-user-email');
          const topAvatar = document.getElementById('top-avatar');
          const drawerAvatar = document.getElementById('drawer-avatar');
          
          if (drawerUserName) drawerUserName.textContent = state.currentUser.name;
          if (drawerUserEmail) drawerUserEmail.textContent = state.currentUser.email;
          
          const initials = state.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          if (topAvatar) topAvatar.textContent = initials;
          if (drawerAvatar) drawerAvatar.textContent = initials;

          // Profile trigger moved to DOMContentLoaded
          
          document.getElementById('btn-dev-console')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (profileDrawer) profileDrawer.classList.remove('active');
            window.location.href = 'developer.html';
          });

          // Load workspaces and data
          await loadOrganizations();
        } catch (apiErr) {
          console.error("Initialization Error:", apiErr);
          document.getElementById('auth-overlay').style.display = 'flex';
          const loginContainer = document.getElementById('login-container');
          if (loginContainer) {
            loginContainer.innerHTML = `
              <div style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--color-danger); margin-bottom: 1rem;">Initialization Error</h3>
                <p style="color: var(--text);">${apiErr.message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top: 1rem;">Retry</button>
              </div>
            `;
          }
        }
      }).catch((err) => {
        console.warn("Not authenticated:", err);
        // User is not authenticated. Since Hosted Login is configured in the console,
        // we redirect them to the hosted login page, or show a button to do so.
        const loginContainer = document.getElementById('login-container');
        loginContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 1rem; text-align: center;">
            <div style="margin-bottom: 1rem;">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2 style="color: var(--text);">Authentication Required</h2>
            <p style="color: var(--text-muted); max-width: 400px; margin-bottom: 0.5rem;">
              This application uses Zoho Catalyst Hosted Authentication. Please log in to continue.
            </p>
            <p style="color: var(--color-danger); font-size: 0.85rem; margin-bottom: 1rem; max-width: 400px; word-wrap: break-word;">
              <em>Debug Info: ${err ? (err.message || JSON.stringify(err)) : 'Unknown error'}</em>
            </p>
            <button id="btn-hosted-login" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.8rem 2rem; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              Log In / Sign Up
            </button>
          </div>
        `;
        
        document.getElementById('btn-hosted-login').addEventListener('click', () => {
          // Redirect to Catalyst Hosted Login
          window.location.href = '/__catalyst/auth/login';
        });
      });
    } else if (sdkWaitTime > 3000) {
      clearInterval(checkSDK);
      console.error('Catalyst SDK failed to load within 3 seconds. Falling back to manual hosted login button.');
      
      const loginContainer = document.getElementById('login-container');
      if (loginContainer) {
        loginContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 1rem; text-align: center;">
            <div style="margin-bottom: 1rem;">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 style="color: var(--text);">Authentication Required</h2>
            <p style="color: var(--text-muted); max-width: 400px; margin-bottom: 1rem;">
              The secure environment failed to auto-initialize. Please proceed to the Hosted Authentication page manually.
            </p>
            <button id="btn-hosted-login-fallback" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.8rem 2rem; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              Log In / Sign Up
            </button>
          </div>
        `;
        
        document.getElementById('btn-hosted-login-fallback').addEventListener('click', () => {
          // Redirect to Catalyst Hosted Login
          window.location.href = '/__catalyst/auth/login';
        });
      }
    }
  }, 100);
});

// --- Accessibility and Settings Logic added dynamically ---

    // Wire up Profile Dropdown (Moved to top level)
    const profileTrigger = document.getElementById('profile-sidebar-trigger');
    const profileDrawer = document.getElementById('profile-drawer');
    if (profileTrigger && profileDrawer) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDrawer.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!profileDrawer.contains(e.target) && !profileTrigger.contains(e.target)) {
                profileDrawer.classList.remove('active');
            }
        });
    }

document.addEventListener('DOMContentLoaded', () => {
    // Accessibility Theme Toggle
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });
    }

    // Accessibility Font Size Toggle
    const accBtn = document.getElementById('btn-accessibility');
    if (accBtn) {
        accBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('large-text');
            localStorage.setItem('large-text', document.body.classList.contains('large-text') ? 'true' : 'false');
        });
    }

    // Apply saved preferences
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
    if (localStorage.getItem('large-text') === 'true') document.body.classList.add('large-text');

    // Settings Tabs Logic
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    settingsNavItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all nav
            settingsNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all tabs
            document.querySelectorAll('.settings-tab').forEach(tab => tab.style.display = 'none');
            
            // Show target tab
            const targetId = item.getAttribute('data-tab');
            const targetTab = document.getElementById(targetId);
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });
});


// ==========================================
// HOTEL PROCUREMENT & FUNCTIONALITY LOGIC
// ==========================================
function setupHotelProcurement() {
    console.log("Setting up Hotel Procurement environment...");
    // Rename standard modules to Hotel specific terminology
    document.getElementById('nav-prs').innerHTML = '<span class="icon">📝</span> Hotel Requisitions (F&B, Linens)';
    document.getElementById('nav-pos').innerHTML = '<span class="icon">🛒</span> Vendor Orders (Supplies)';
    document.getElementById('nav-grns').innerHTML = '<span class="icon">📦</span> Receiving Dock (GRN)';
    
    // Set a flag in state
    state.industry = 'hotel';
}

// ==========================================
// RFQ & VENDOR BIDDING LOGIC
// ==========================================
window.convertToRFQ = async function(prId) {
  try {
    showToast('Promoting Requisition to Request for Quotes...', 'warning');
    const res = await apiRequest('POST', `/api/rfqs/convert/${prId}`, { Notes: 'Automated conversion' });
    showToast('Requisition converted to RFQ!', 'success');
    await refreshAllData();
    switchView('rfq-page');
  } catch (err) {
    showToast('Error converting to RFQ: ' + err.message, 'error');
  }
};

window.viewRfqBids = async function(rfqId) {
  const drawer = document.getElementById('rfq-bids-drawer');
  drawer.style.display = 'block';
  document.getElementById('rfq-id-for-bid').value = rfqId;
  
  // Populate vendor dropdown
  const vendorSelect = document.getElementById('bid-vendor-select');
  vendorSelect.innerHTML = '<option value="">Select Vendor...</option>';
  state.suppliers.forEach(s => {
    vendorSelect.innerHTML += `<option value="${s.ROWID}">${s.Name}</option>`;
  });

  // Fetch bids for this RFQ
  try {
    const bids = await apiRequest('GET', `/api/rfqs/${rfqId}/bids`);
    const tbody = document.getElementById('rfq-bids-table').querySelector('tbody');
    tbody.innerHTML = '';
    
    if(bids.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No bids submitted yet.</td></tr>';
      return;
    }

    bids.forEach(bid => {
      const vendor = state.suppliers.find(s => s.ROWID === bid.VendorID);
      tbody.innerHTML += `
        <tr>
          <td><strong>${vendor ? vendor.Name : 'Vendor'}</strong></td>
          <td><strong>$${Number(bid.TotalBidAmount).toFixed(2)}</strong></td>
          <td><span class="badge badge-info">${bid.Status}</span></td>
          <td><button class="btn btn-primary" style="padding:0.2rem 0.5rem;font-size:0.7rem;">Accept Bid</button></td>
        </tr>
      `;
    });
  } catch(e) {
    console.error('Failed to load bids', e);
  }
};

// Vendor Bid Submission Form
const bidForm = document.getElementById('form-submit-bid');
if (bidForm) {
  bidForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rfqId = document.getElementById('rfq-id-for-bid').value;
    const vendorId = document.getElementById('bid-vendor-select').value;
    const amount = document.getElementById('bid-amount').value;

    try {
      showToast('Simulating vendor bid submission...', 'warning');
      await apiRequest('POST', `/api/rfqs/${rfqId}/bids`, {
        VendorID: vendorId,
        TotalBidAmount: amount
      });
      showToast('Bid submitted successfully!', 'success');
      window.viewRfqBids(rfqId); // Refresh bids drawer
    } catch(err) {
      showToast('Error submitting bid: ' + err.message, 'error');
    }
  });
}

// ==========================================
// BILL PAYMENTS LOGIC
// ==========================================
window.openPaymentDrawer = function(invoiceId, amount) {
  const drawer = document.getElementById('payment-drawer');
  if(drawer) {
    drawer.style.display = 'block';
    document.getElementById('payment-invoice-id').value = invoiceId;
    document.getElementById('payment-amount').value = Number(amount).toFixed(2);
  }
};

const paymentForm = document.getElementById('form-submit-payment');
if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invoiceId = document.getElementById('payment-invoice-id').value;
    const amount = document.getElementById('payment-amount').value;
    const mode = document.getElementById('payment-mode').value;

    try {
      showToast('Processing bill payment...', 'warning');
      await apiRequest('POST', '/api/payments', {
        InvoiceID: invoiceId,
        AmountPaid: amount,
        PaymentMode: mode
      });
      showToast('Payment processed successfully. Invoice marked as Paid!', 'success');
      document.getElementById('payment-drawer').style.display = 'none';
      await refreshAllData();
    } catch (err) {
      showToast('Error processing payment: ' + err.message, 'error');
    }
  });
}

// ==========================================
// ADDITIONAL MODULE RENDERERS
// ==========================================
function renderRecurringBills() {
  const tbody = document.getElementById('recurring-bills-list');
  if(!tbody) return;
  tbody.innerHTML = '';
  if (!state.recurringBills || state.recurringBills.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No recurring profiles setup.</td></tr>';
    return;
  }
  state.recurringBills.forEach(b => {
    const v = state.suppliers.find(s => s.ROWID === b.VendorID);
    tbody.innerHTML += `<tr>
      <td>${b.ROWID}</td>
      <td>${v ? v.Name : b.VendorID}</td>
      <td>$${Number(b.Amount).toFixed(2)}</td>
      <td>${b.Frequency}</td>
      <td><span class="badge badge-success">${b.Status}</span></td>
    </tr>`;
  });
}

function renderVendorCredits() {
  const tbody = document.getElementById('vendor-credits-list');
  if(!tbody) return;
  tbody.innerHTML = '';
  if (!state.vendorCredits || state.vendorCredits.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No vendor credits recorded.</td></tr>';
    return;
  }
  state.vendorCredits.forEach(c => {
    const v = state.suppliers.find(s => s.ROWID === c.VendorID);
    tbody.innerHTML += `<tr>
      <td>${c.ReferenceNumber}</td>
      <td>${v ? v.Name : c.VendorID}</td>
      <td>$${Number(c.CreditAmount).toFixed(2)}</td>
      <td>$${Number(c.Balance).toFixed(2)}</td>
      <td><span class="badge badge-primary">${c.Status}</span></td>
    </tr>`;
  });
}

function renderCustomModules() {
  const tbody = document.getElementById('custom-modules-list');
  if(!tbody) return;
  tbody.innerHTML = '';
  if (!state.customModules || state.customModules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No custom modules built yet.</td></tr>';
    return;
  }
  state.customModules.forEach(m => {
    let fieldCount = 0;
    try { fieldCount = JSON.parse(m.FieldsSchema).length; } catch(e){}
    tbody.innerHTML += `<tr>
      <td><strong>${m.ModuleName}</strong></td>
      <td>${fieldCount} fields</td>
      <td><span class="badge badge-success">${m.Status}</span></td>
      <td><button class="btn btn-secondary" style="padding:0.2rem 0.5rem;font-size:0.75rem;">Edit Schema</button></td>
    </tr>`;
  });
}

window.loadAnalytics = async function() {
  showToast('Aggregating real-time insights...', 'info');
  try {
    const [payables, purchases] = await Promise.all([
      apiRequest('GET', '/api/analytics/payables').catch(() => ({aging: {}})),
      apiRequest('GET', '/api/analytics/purchases').catch(() => ({}))
    ]);

    // Update cycle metrics
    document.getElementById('analytics-cycle-time').textContent = `${purchases.avgCycleTime || 0} days`;
    document.getElementById('analytics-maverick').textContent = `${purchases.maverickSpend || 0} %`;
    document.getElementById('analytics-savings').textContent = `$${Number(purchases.savingsIdentified || 0).toLocaleString()}`;

    // Update aging bars
    const aging = payables.aging || { 'Current':0, '1_15':0, '16_30':0, '31_plus':0 };
    const maxVal = Math.max(aging['Current'], aging['1_15'], aging['16_30'], aging['31_plus'], 1);
    
    const container = document.getElementById('aging-chart-container');
    if (container) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
          <div style="background:var(--color-success); width:100%; height:${(aging['Current']/maxVal)*100}%; min-height:5px; border-radius:4px 4px 0 0;"></div>
          <div style="font-size:0.7rem; margin-top:0.5rem;">Current</div>
          <strong style="font-size:0.8rem;">$${Number(aging['Current']).toLocaleString()}</strong>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
          <div style="background:var(--color-primary); width:100%; height:${(aging['1_15']/maxVal)*100}%; min-height:5px; border-radius:4px 4px 0 0;"></div>
          <div style="font-size:0.7rem; margin-top:0.5rem;">1-15 Days</div>
          <strong style="font-size:0.8rem;">$${Number(aging['1_15']).toLocaleString()}</strong>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
          <div style="background:var(--color-warning); width:100%; height:${(aging['16_30']/maxVal)*100}%; min-height:5px; border-radius:4px 4px 0 0;"></div>
          <div style="font-size:0.7rem; margin-top:0.5rem;">16-30 Days</div>
          <strong style="font-size:0.8rem;">$${Number(aging['16_30']).toLocaleString()}</strong>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
          <div style="background:var(--color-danger); width:100%; height:${(aging['31_plus']/maxVal)*100}%; min-height:5px; border-radius:4px 4px 0 0;"></div>
          <div style="font-size:0.7rem; margin-top:0.5rem;">31+ Days</div>
          <strong style="font-size:0.8rem;">$${Number(aging['31_plus']).toLocaleString()}</strong>
        </div>
      `;
    }
    showToast('Analytics refreshed.', 'success');
  } catch(e) {
    console.error('Analytics load error:', e);
  }
};

// Basic form saving logic for PO
document.addEventListener('DOMContentLoaded', () => {
    // Sourcing
    const rfxForm = document.getElementById('rfx-form');
    if(rfxForm) {
        rfxForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('RFx Saved Successfully!');
            document.getElementById('rfx-create-view').style.display='none';
            document.getElementById('rfx-list-view').style.display='block';
            // Mock render
            const tbody = document.querySelector('#rfx-list-view table tbody');
            tbody.innerHTML = '<tr><td>RFX-101</td><td>' + rfxForm.querySelector('input[type="text"]').value + '</td><td>RFP</td><td>Draft</td><td>' + rfxForm.querySelector('input[type="date"]').value + '</td></tr>';
        });
    }

    // Purchase Orders
    const poForm = document.getElementById('po-form');
    if(poForm) {
        poForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('PO Created Successfully!');
            document.getElementById('po-create-view').style.display='none';
            document.getElementById('po-list-view').style.display='block';
            // Mock render
            const tbody = document.querySelector('#po-list-view table tbody');
            tbody.innerHTML = '<tr><td>PO-00001</td><td>Acme Corp</td><td>Open</td><td>' + document.getElementById('po-date-input').value + '</td><td>$0.00</td></tr>';
        });
    }
});
