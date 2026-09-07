// Developer Portal — platform-level administration.
// Access is verified SERVER-SIDE against the Developers registry; this page
// just renders what the API allows.
import { api } from './api.js?v=34';
import { esc, toast, badge, openModal, closeModal, renderTable, skeletonTable, wireModalChrome, applyStoredTheme, watchSystemTheme } from './ui.js?v=34';
import { loadL3Overview, loadTickets, wireTicketFilters, openTenant360, setOrgs } from './l3.js?v=34';

let stats = null;
let orgs = [];
let devs = [];
let me = null; // developer row for the signed-in account

function fmtDT(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d) ? String(value).slice(0, 16) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function usd(n) {
  const v = Number(n || 0);
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------------- Boot & gate ---------------- */
// Probe the function before blaming the operator's account for a failure that is
// really the backend being down — the two need opposite responses.
async function checkBackend() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('/server/procurement_api/api/health', {
      signal: ctrl.signal, credentials: 'include', cache: 'no-store'
    });
    if (!res.ok) return { ok: false, reason: `Server responded ${res.status}.` };
    const body = await res.json();
    return { ok: !!body.ok, version: body.version };
  } catch (e) {
    return { ok: false, reason: e.name === 'AbortError' ? 'The server did not respond in time.' : 'Network request failed.' };
  } finally { clearTimeout(t); }
}

async function boot() {
  wireModalChrome();

  document.getElementById('gate-status').textContent = 'Connecting to ProcureFlow…';
  const health = await checkBackend();
  if (!health.ok) {
    return gateFail(`Can't reach the ProcureFlow backend. ${health.reason || ''} `
      + 'This is a connection problem, not your account — check your network and refresh.');
  }
  document.getElementById('gate-status').textContent = 'Verifying developer access…';

  const ok = await new Promise(resolve => {
    const started = Date.now();
    const t = setInterval(() => {
      if (window.catalyst && window.catalyst.auth) { clearInterval(t); resolve(true); }
      else if (Date.now() - started > 5000) { clearInterval(t); resolve(false); }
    }, 80);
  });
  if (!ok) return gateFail('The Catalyst SDK failed to load. Refresh and try again.');

  try {
    await window.catalyst.auth.isUserAuthenticated();
  } catch {
    window.location.href = '/__catalyst/auth/login';
    return;
  }

  try {
    stats = await api('GET', '/api/developer/stats');
    me = stats.developer;
  } catch (err) {
    return gateFail(err.message.includes('restricted')
      ? 'This account does not have developer access. Ask the portal owner to invite you.'
      : err.message);
  }

  document.getElementById('gate-screen').classList.remove('open');
  document.getElementById('portal').style.display = 'block';
  document.getElementById('dev-identity').textContent = `${me.Name} · ${me.RoleLevel === 'owner' ? 'Owner' : 'Developer'}`;

  drawStats();
  wireTabs();
  // Orgs load first: the L3 views and the ticket dialog need the tenant list.
  await loadOrgs();
  await Promise.all([loadDevs(), loadL3Overview()]);

  // Live sync: silently refresh stats + org list every 60s (skips when the tab
  // is hidden or a modal is open, so it never disturbs what you're doing).
  setInterval(async () => {
    if (document.hidden) return;
    if (document.getElementById('modal-backdrop').classList.contains('open')) return;
    await loadStats();
    orgs = await api('GET', '/api/developer/organizations').catch(() => orgs);
    drawOrgs();
    const dot = document.getElementById('live-dot');
    if (dot) { dot.classList.remove('pulse'); void dot.offsetWidth; dot.classList.add('pulse'); }
  }, 60000);
}

function gateFail(message) {
  document.getElementById('gate-spinner').style.display = 'none';
  document.getElementById('gate-status').textContent = '';
  document.getElementById('gate-error').textContent = message;
  document.getElementById('gate-actions').style.display = 'block';
}

/* ---------------- Theme ---------------- */
function applyTheme(t, persist = false) {
  document.documentElement.setAttribute('data-theme', t);
  if (persist) localStorage.setItem('pf-theme', t);
  const btn = document.getElementById('btn-theme-dev');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}

/* ---------------- Stats ---------------- */
function drawStats() {
  const tiles = [
    ['Organizations', stats.orgs, '🏢'], ['Users', stats.users, '👥'], ['Vendors', stats.suppliers, '🤝'],
    ['Requisitions', stats.prs, '📝'], ['Purchase orders', stats.pos, '📦'], ['Invoices', stats.invoices, '🧾'],
    ['Est. platform spend', usd(stats.estSpend), '💰']
  ];
  document.getElementById('dev-stats').innerHTML = tiles.map(([label, value, icon]) => `
    <div class="glass-stat">
      <div class="glass-stat-icon">${icon}</div>
      <div class="glass-stat-body">
        <div class="glass-stat-label">${esc(label)}</div>
        <div class="glass-stat-value">${typeof value === 'string' ? esc(value) : Number(value || 0).toLocaleString()}</div>
      </div>
    </div>`).join('');
}

/* ---------------- Tabs ---------------- */
let consumptionLoaded = false;
let ticketsLoaded = false;
function wireTabs() {
  const panels = ['l3', 'orgs', 'tickets', 'consumption', 'devs'];
  document.querySelectorAll('.glass-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.glass-tab').forEach(t => t.classList.toggle('active', t === tab));
    panels.forEach(p => {
      const el = document.getElementById(`tab-${p}`);
      if (el) el.style.display = tab.dataset.tab === p ? 'block' : 'none';
    });
    if (tab.dataset.tab === 'consumption' && !consumptionLoaded) { consumptionLoaded = true; loadConsumption(); }
    if (tab.dataset.tab === 'tickets' && !ticketsLoaded) { ticketsLoaded = true; loadTickets(); }
    if (tab.dataset.tab === 'l3') loadL3Overview();
  }));
  wireTicketFilters();
}

/* ---------------- Organizations ---------------- */
async function loadOrgs() {
  document.getElementById('orgs-body').innerHTML = skeletonTable(6, 5);
  orgs = await api('GET', '/api/developer/organizations').catch(() => []);
  setOrgs(orgs);
  drawOrgs();
}

function drawOrgs() {
  const q = (document.getElementById('org-search').value || '').toLowerCase();
  const rows = q ? orgs.filter(o => `${o.Name} ${o.Domain}`.toLowerCase().includes(q)) : orgs;
  const isOwner = me?.RoleLevel === 'owner';
  document.getElementById('orgs-body').innerHTML = renderTable({
    columns: [
      { key: 'Name', label: 'Organization', render: r => `<span class="cell-strong">${esc(r.Name)}</span>` },
      { key: 'Domain', label: 'Domain', render: r => `<span class="cell-muted">${esc(r.Domain || '—')}</span>` },
      { key: 'userCount', label: 'Users', num: true },
      { key: 'CREATEDTIME', label: 'Created', render: r => fmtDT(r.CREATEDTIME) },
      { key: 'Status', label: 'Status', render: r => badge(r.Status) }
    ],
    rows,
    empty: { icon: '🏢', title: 'No organizations', sub: 'Client workspaces appear here as users sign up.' },
    rowActions: r => {
      let html = `<button class="btn btn-glass btn-sm" data-action="t360" data-id="${r.ROWID}" data-name="${esc(r.Name)}">🧰 Tenant 360</button>`;
      html += `<button class="btn btn-glass btn-sm" data-action="detail" data-id="${r.ROWID}">Inspect</button>`;
      html += `<button class="btn btn-glass btn-sm" data-action="usage" data-id="${r.ROWID}" data-name="${esc(r.Name)}">💰 Cost</button>`;
      html += `<button class="btn btn-glass btn-sm" data-action="backup" data-id="${r.ROWID}" data-name="${esc(r.Name)}">💾 Backup</button>`;
      if (r.Status === 'Pending Verification') {
        html += `<button class="btn btn-primary btn-sm" data-action="activate" data-id="${r.ROWID}">✓ Verify &amp; activate</button>`;
      } else if (r.Status === 'Suspended') {
        html += `<button class="btn btn-primary btn-sm" data-action="activate" data-id="${r.ROWID}">Re-activate</button>`;
      } else {
        html += `<button class="btn btn-warning btn-sm" data-action="suspend" data-id="${r.ROWID}" data-name="${esc(r.Name)}">Suspend</button>`;
      }
      if (isOwner) {
        html += `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${r.ROWID}" data-name="${esc(r.Name)}">🗑 Delete</button>`;
      }
      return html;
    }
  });
}

async function setOrgStatus(orgId, status) {
  await api('PUT', `/api/developer/organizations/${orgId}`, { Status: status });
  toast(`Organization ${status === 'Active' ? 'verified & activated' : 'suspended'}.`, status === 'Active' ? 'success' : 'warning');
  await loadOrgs();
  await loadStats();
}

async function loadStats() {
  try { stats = await api('GET', '/api/developer/stats'); drawStats(); } catch {}
}

async function openOrgDetail(orgId) {
  openModal({ title: 'Organization', body: skeletonTable(3, 4), wide: true });
  try {
    const { org, users, counts } = await api('GET', `/api/developer/organizations/${orgId}`);
    let settings = {};
    try { settings = JSON.parse(org.Settings || '{}'); } catch {}
    openModal({
      title: `${org.Name}`,
      wide: true,
      body: `
        <div class="form-grid" style="margin-bottom:16px;">
          <div><div class="cell-muted">Status</div>${badge(org.Status)}</div>
          <div><div class="cell-muted">Domain</div><div class="cell-strong">${esc(org.Domain || '—')}</div></div>
          <div><div class="cell-muted">Industry</div><div>${esc(settings.industry || '—')}</div></div>
          <div><div class="cell-muted">Currency</div><div>${esc(settings.currency || '—')}</div></div>
          <div><div class="cell-muted">Country</div><div>${esc(settings.country || '—')}</div></div>
          <div><div class="cell-muted">Created</div><div>${fmtDT(org.CREATEDTIME)}</div></div>
        </div>
        <div class="glass-mini-grid" style="margin-bottom:16px;">
          ${Object.entries({ Requisitions: counts.prs, POs: counts.pos, Receipts: counts.grns, Invoices: counts.invoices, Vendors: counts.suppliers, Items: counts.items, Budgets: counts.budgets })
            .map(([l, v]) => `<div class="glass-mini"><div class="glass-mini-label">${l}</div><div class="glass-mini-value">${Number(v || 0)}</div></div>`).join('')}
        </div>
        <div class="card-title" style="margin-bottom:8px;">Members</div>
        ${renderTable({
          columns: [
            { key: 'FullName', label: 'Name', render: r => `<span class="cell-strong">${esc(r.FullName)}</span>` },
            { key: 'Email', label: 'Email' },
            { key: 'Status', label: 'Status', render: r => badge(r.Status) }
          ],
          rows: users,
          empty: { title: 'No members' }
        })}`,
      footer: `<button class="btn btn-glass" data-action="usage" data-id="${orgId}" data-name="${esc(org.Name)}">💰 Cost breakdown</button>
               <button class="btn btn-glass" data-action="backup" data-id="${orgId}" data-name="${esc(org.Name)}">💾 Backup</button>
               <button class="btn btn-outline" id="m-cancel">Close</button>`,
      onOpen(body) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        body.closest('.modal').querySelector('.modal-footer').addEventListener('click', e => {
          const b = e.target.closest('button[data-action]');
          if (!b) return;
          if (b.dataset.action === 'usage') openUsage(b.dataset.id, b.dataset.name);
          if (b.dataset.action === 'backup') downloadBackup(b.dataset.id, b.dataset.name);
        });
      }
    });
  } catch (err) { toast(err.message, 'error'); closeModal(); }
}

/* ---------------- Cost & usage breakdown ---------------- */
async function openUsage(orgId, orgName) {
  openModal({ title: `Cost & usage — ${orgName}`, body: skeletonTable(4, 4), wide: true });
  try {
    const u = await api('GET', `/api/developer/organizations/${orgId}/usage`);
    const bars = u.lines.map(l => {
      const pct = u.total > 0 ? Math.max(3, Math.round((l.cost / u.total) * 100)) : 0;
      return `
        <div class="usage-row">
          <div class="usage-row-top">
            <span class="usage-label">${esc(l.label)}</span>
            <span class="usage-detail">${esc(l.detail)}</span>
            <span class="usage-cost">${usd(l.cost)}</span>
          </div>
          <div class="usage-bar"><span style="width:${pct}%"></span></div>
        </div>`;
    }).join('');
    const billableMoney = (() => {
      const cur = u.rateCard?.currency || 'USD';
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(Number(u.billable || 0)); }
      catch { return `${cur} ${Number(u.billable || 0).toFixed(2)}`; }
    })();
    openModal({
      title: `Cost & usage — ${orgName}`,
      wide: true,
      body: `
        <div class="usage-total-card" style="display:flex;gap:20px;flex-wrap:wrap;">
          <div>
            <div class="cell-muted">Billable — ${esc(u.period)} <span class="cell-muted" style="font-size:10.5px;">(your rate card)</span></div>
            <div class="usage-total">${billableMoney}</div>
          </div>
          <div style="border-left:1px solid var(--border);padding-left:20px;">
            <div class="cell-muted">Est. infra cost <span class="cell-muted" style="font-size:10.5px;">(indicative — see Consumption for the allocated actual)</span></div>
            <div class="usage-total" style="font-size:20px;opacity:0.8;">${usd(u.total)}</div>
          </div>
          <div class="usage-total-meta">
            <div><span class="cell-muted">Rows</span> <b>${u.totalRows.toLocaleString()}</b></div>
            <div><span class="cell-muted">API calls (metered, ${esc(u.period)})</span> <b>${u.calls.toLocaleString()}</b></div>
            <div><span class="cell-muted">Storage</span> <b>${u.storageMB.toFixed(2)} MB</b> <span class="cell-muted" style="font-size:10.5px;">(${u.storageSource === 'stratus' ? 'live from Stratus' : 'from metadata'})</span></div>
            <div><span class="cell-muted">Seats</span> <b>${u.userCount}</b></div>
          </div>
        </div>
        <div class="usage-list">${bars}</div>
        <details class="usage-details">
          <summary>Per-table row counts</summary>
          <div class="glass-mini-grid" style="margin-top:10px;">
            ${Object.entries(u.counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
              .map(([t, v]) => `<div class="glass-mini"><div class="glass-mini-label">${esc(t)}</div><div class="glass-mini-value">${v}</div></div>`).join('') || '<div class="cell-muted">No data yet.</div>'}
          </div>
        </details>
        <p class="cell-muted" style="margin-top:14px;font-size:11.5px;">${esc(u.note)}</p>`,
      footer: `<button class="btn btn-glass" id="m-export-usage">⬇ Export CSV</button><button class="btn btn-outline" id="m-cancel">Close</button>`,
      onOpen() {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-export-usage').addEventListener('click', () => {
          const rows = [
            ['Category', 'Detail', 'Cost (USD)'],
            ...u.lines.map(l => [l.label, l.detail, l.cost.toFixed(4)]),
            ['TOTAL (est. infra cost)', '', u.total.toFixed(4)],
            ['BILLABLE', `Period ${u.period}, rate card ${u.rateCard?.currency || 'USD'}`, u.billable.toFixed(2)]
          ];
          downloadCSV(rows, `${slug(orgName)}-usage.csv`);
        });
      }
    });
  } catch (err) { toast(err.message, 'error'); closeModal(); }
}

/* ---------------- Backup ---------------- */
async function downloadBackup(orgId, orgName) {
  toast('Preparing backup…');
  try {
    const backup = await api('GET', `/api/developer/organizations/${orgId}/backup`);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `${slug(orgName)}-backup-${new Date().toISOString().slice(0, 10)}.json`);
    const total = Object.values(backup.data).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
    toast(`Backup ready — ${total.toLocaleString()} rows across ${backup.tableCount} tables.`);
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- Delete ---------------- */
function openDeleteOrg(orgId, orgName) {
  openModal({
    title: 'Delete organization',
    body: `
      <div class="danger-box">
        <div style="font-size:26px;">⚠️</div>
        <div>
          <div style="font-weight:700;margin-bottom:4px;">This permanently deletes <strong>${esc(orgName)}</strong>.</div>
          <div class="cell-muted">All requisitions, orders, invoices, vendors, users and settings for this organization will be erased. This cannot be undone. Consider taking a backup first.</div>
        </div>
      </div>
      <div class="field" style="margin-top:14px;">
        <label>Type the organization name to confirm</label>
        <input type="text" id="del-confirm" class="glass-input" placeholder="${esc(orgName)}" autocomplete="off">
      </div>`,
    footer: `<button class="btn btn-glass" id="m-backup-first">💾 Backup first</button><span class="spacer"></span><button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-danger" id="m-confirm" disabled>Delete permanently</button>`,
    onOpen(body) {
      const input = body.querySelector('#del-confirm');
      const confirmBtn = document.getElementById('m-confirm');
      input.addEventListener('input', () => { confirmBtn.disabled = input.value.trim() !== orgName; });
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-backup-first').addEventListener('click', () => downloadBackup(orgId, orgName));
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true; confirmBtn.textContent = 'Deleting…';
        try {
          const res = await api('DELETE', `/api/developer/organizations/${orgId}`, { confirmName: input.value.trim() });
          closeModal();
          toast(res.message || 'Organization deleted.', 'warning');
          await loadOrgs(); await loadStats();
        } catch (err) { toast(err.message, 'error'); confirmBtn.disabled = false; confirmBtn.textContent = 'Delete permanently'; }
      });
    }
  });
}

/* ---------------- Export / print helpers ---------------- */
function slug(s) { return String(s || 'org').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'org'; }
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');
  triggerDownload(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}
function exportOrgsCSV() {
  if (!orgs.length) return toast('No organizations to export.', 'warning');
  const rows = [['Organization', 'Domain', 'Users', 'Status', 'Created'],
    ...orgs.map(o => [o.Name, o.Domain || '', o.userCount || 0, o.Status || '', fmtDT(o.CREATEDTIME)])];
  downloadCSV(rows, 'organizations.csv');
  toast('Exported organizations to CSV.');
}
function printOrgs() {
  const rows = orgs.map(o => `<tr><td>${esc(o.Name)}</td><td>${esc(o.Domain || '—')}</td><td>${o.userCount || 0}</td><td>${esc(o.Status || '')}</td><td>${fmtDT(o.CREATEDTIME)}</td></tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Client organizations</title>
    <style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}th{background:#f4f6f8}small{color:#666}</style>
    </head><body><h1>ProcureFlow — Client organizations</h1>
    <small>Generated ${new Date().toLocaleString()} · ${orgs.length} organizations</small>
    <table><thead><tr><th>Organization</th><th>Domain</th><th>Users</th><th>Status</th><th>Created</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 300);
}

/* ---------------- Developer team ---------------- */
async function loadDevs() {
  document.getElementById('devs-body').innerHTML = skeletonTable(4, 3);
  devs = await api('GET', '/api/developer/developers').catch(() => []);

  // Only the super admin sees the membership controls. Everyone else gets a
  // read-only roster plus a line explaining who to ask.
  const canManage = !!me?.isSuperAdmin;
  const inviteBtn = document.getElementById('btn-invite-dev');
  if (inviteBtn) inviteBtn.style.display = canManage ? '' : 'none';

  const note = document.getElementById('devs-note');
  if (note) {
    note.style.display = 'block';
    note.innerHTML = canManage
      ? `<strong>You are the platform super admin.</strong> Only you can invite, re-assign or
         remove portal users — including owners. Portal owners can run the platform, but cannot
         change who has access to it.`
      : `<strong>This list is read-only for you.</strong> Portal access is managed by the platform
         super admin. Contact them to invite a colleague or change an assignment.`;
  }

  drawDevs();
}

function drawDevs() {
  // Managing WHO has portal access is narrower than being a portal owner —
  // it's restricted to the platform super admin (server-enforced regardless
  // of what this renders; see requireSuperAdmin() in the backend).
  const canManage = !!me?.isSuperAdmin;
  document.getElementById('devs-body').innerHTML = renderTable({
    columns: [
      { key: 'Name', label: 'Name', render: r => `<span class="cell-strong">${esc(r.Name)}</span>${r.RoleLevel === 'owner' ? ' <span class="badge badge-info">Owner</span>' : ''}` },
      { key: 'Email', label: 'Email' },
      { key: 'InvitedBy', label: 'Invited by', render: r => `<span class="cell-muted">${esc(r.InvitedBy || '—')}</span>` },
      { key: 'Status', label: 'Status', render: r => badge(r.Status) }
    ],
    rows: devs,
    empty: { icon: '🧑‍💻', title: 'No developers', sub: 'Invite teammates to help run the platform.' },
    rowActions: r => {
      if (!canManage) return '';
      const resend = `<button class="btn btn-glass btn-sm" data-action="resend-dev" data-id="${r.ROWID}" data-email="${esc(r.Email)}" title="Re-send the invitation and portal documentation">✉ Resend invite</button>`;
      if (r.RoleLevel === 'owner') {
        return `${resend}<span class="cell-muted" style="align-self:center;">All organizations</span>`;
      }
      let assigned = [];
      try { assigned = JSON.parse(r.AssignedOrgs || '[]'); } catch {}
      return `${resend}
              <button class="btn btn-glass btn-sm" data-action="assign-dev" data-id="${r.ROWID}" data-name="${esc(r.Name)}">Assign orgs (${assigned.length})</button>
              <button class="btn btn-danger btn-sm" data-action="remove-dev" data-id="${r.ROWID}" data-name="${esc(r.Name)}">Remove</button>`;
    }
  });
}

function openAssignOrgs(devId, devName) {
  const dev = devs.find(d => d.ROWID === devId);
  let assigned = [];
  try { assigned = JSON.parse(dev.AssignedOrgs || '[]').map(String); } catch {}
  openModal({
    title: `Assign organizations — ${devName}`,
    wide: true,
    body: `
      <p class="cell-muted" style="margin-bottom:12px;">This developer will only see and manage the organizations you check here — for scoped, client-specific development and support.</p>
      <div style="max-height:340px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:12px;">
        ${orgs.length === 0 ? '<div class="cell-muted">No organizations yet.</div>' :
          orgs.map(o => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-weight:400;">
            <input type="checkbox" class="assign-cb" value="${o.ROWID}" ${assigned.includes(String(o.ROWID)) ? 'checked' : ''} style="width:auto;">
            <span class="cell-strong">${esc(o.Name)}</span> <span class="cell-muted">· ${esc(o.Domain || '—')}</span></label>`).join('')}
      </div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save assignments</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const AssignedOrgs = [...body.querySelectorAll('.assign-cb:checked')].map(cb => cb.value);
        const btn = document.getElementById('m-save'); btn.disabled = true;
        try {
          await api('PUT', `/api/developer/developers/${devId}`, { AssignedOrgs });
          toast('Assignments saved.');
          closeModal(); await loadDevs();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

function openInviteDev() {
  openModal({
    title: 'Invite to the Developer Portal',
    wide: true,
    body: `
      <p class="cell-muted" style="margin-bottom:14px;line-height:1.55;">
        The invitee signs in with Catalyst using this email and gets portal access immediately.
        They receive an email containing full documentation of the portal — what it does, their access
        level, how per-customer requests are handled, and the safety rules around real customer data.
      </p>
      <div class="form-grid">
        <div class="field"><label>Name</label>
          <input type="text" id="dv-name" class="glass-input" placeholder="Full name"></div>
        <div class="field"><label>Email <span class="req">*</span></label>
          <input type="email" id="dv-email" class="glass-input" placeholder="name@company.com"></div>
        <div class="field full"><label>Access level</label>
          <select id="dv-role" class="glass-input">
            <option value="developer">Developer — only the client organizations you assign</option>
            <option value="owner">Portal Owner — full access to every client, can invite others (for a CEO / executive)</option>
          </select>
          <div class="help">Owners can see and act on every tenant, and can invite or remove portal users.</div>
        </div>
        <div class="field full"><label>Personal message <span class="cell-muted">(optional)</span></label>
          <textarea id="dv-message" class="glass-input" rows="3"
            placeholder="A short note shown at the top of the invitation email."></textarea></div>
        <div class="field full">
          <label style="display:flex;align-items:center;gap:8px;font-weight:400;">
            <input type="checkbox" id="dv-send" checked style="width:auto;">
            Send the invitation email now
          </label>
        </div>
      </div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button>
             <button class="btn btn-primary" id="m-save">Grant access &amp; send invitation</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const Email = body.querySelector('#dv-email').value.trim();
        if (!Email) return toast('Email is required.', 'warning');
        const RoleLevel = body.querySelector('#dv-role').value;
        if (RoleLevel === 'owner' &&
            !confirm(`Grant FULL owner access to ${Email}?\n\nThey will see every client organization and be able to invite or remove portal users.`)) {
          return;
        }
        const btn = document.getElementById('m-save'); btn.disabled = true;
        try {
          const r = await api('POST', '/api/developer/developers', {
            Email,
            Name: body.querySelector('#dv-name').value.trim(),
            RoleLevel,
            message: body.querySelector('#dv-message').value.trim(),
            sendEmail: body.querySelector('#dv-send').checked
          });
          closeModal();
          // Access is granted even when the mail fails — say which happened.
          if (r.emailed) toast(`${Email} now has access. Invitation email sent.`);
          else if (r.emailError) toast(`Access granted, but the email failed: ${r.emailError}`, 'warning');
          else toast(`${Email} now has access. No email was sent.`);
          await loadDevs();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

async function resendInvite(id, email) {
  if (!confirm(`Re-send the portal invitation and documentation to ${email}?`)) return;
  try {
    const r = await api('POST', `/api/developer/developers/${id}/resend-invite`, {});
    toast(r.message);
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- Consumption & billing dashboard ---------------- */
let consumption = { rows: [], totals: {}, rateCard: null, period: '', periods: [] };

// Money in the rate card's currency (billable figures). usd() stays for the
// infra-cost estimate, which is always USD.
function money(n) {
  const cur = consumption.rateCard?.currency || 'USD';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(Number(n || 0)); }
  catch { return `${cur} ${Number(n || 0).toFixed(2)}`; }
}

async function loadConsumption(period) {
  document.getElementById('consumption-body').innerHTML = skeletonTable(6, 6);
  try {
    consumption = await api('GET', `/api/developer/consumption${period ? `?period=${encodeURIComponent(period)}` : ''}`);
  } catch (err) { toast(err.message, 'error'); return; }
  drawPeriodOptions();
  drawConsumptionTotals();
  drawConsumption();
}

function drawPeriodOptions() {
  const sel = document.getElementById('cons-period');
  sel.innerHTML = (consumption.periods || []).map(p =>
    `<option value="${p}" ${p === consumption.period ? 'selected' : ''}>Month: ${p}</option>`).join('');
}

function drawConsumptionTotals() {
  const t = consumption.totals || {};
  const actual = consumption.costBasis === 'actual';
  const margin = Number(t.margin || 0);
  const tiles = [
    [`Billable — ${consumption.period}`, money(t.billable), '🧾'],
    // Says which kind of number it is. An unlabelled "cost" that is really a
    // guess is how you end up quoting a client a margin that does not exist.
    [actual ? `Actual platform cost — ${consumption.period}` : 'Est. infra cost (no bill recorded)', usd(t.cost), actual ? '💰' : '❓'],
    [actual ? 'Gross margin' : 'Margin (vs estimate)', usd(margin), margin < 0 ? '⚠️' : '📈'],
    ['Data rows', Number(t.rows || 0).toLocaleString(), '🗄️'],
    [`Metered calls — ${consumption.period}`, Number(t.calls || 0).toLocaleString(), '⚡'],
    ['Active seats', Number(t.seats || 0).toLocaleString(), '👥']
  ];
  document.getElementById('consumption-totals').innerHTML = tiles.map(([label, value, icon]) => `
    <div class="glass-stat"><div class="glass-stat-icon">${icon}</div>
      <div class="glass-stat-body"><div class="glass-stat-label">${esc(label)}</div>
        <div class="glass-stat-value">${esc(value)}</div></div></div>`).join('');
}

function filteredConsumptionRows() {
  const q = (document.getElementById('cons-search').value || '').toLowerCase();
  const status = document.getElementById('cons-status').value;
  const sort = document.getElementById('cons-sort').value;
  let rows = consumption.rows.slice();
  if (q) rows = rows.filter(r => `${r.name} ${r.domain} ${r.industry}`.toLowerCase().includes(q));
  if (status) rows = rows.filter(r => r.status === status);
  rows.sort((a, b) => sort === 'name' ? String(a.name).localeCompare(b.name) : Number(b[sort] || 0) - Number(a[sort] || 0));
  return rows;
}

function drawConsumption() {
  const rows = filteredConsumptionRows();
  document.getElementById('consumption-body').innerHTML = renderTable({
    columns: [
      { key: 'name', label: 'Organization', render: r => `<span class="cell-strong">${esc(r.name)}</span>${r.domain ? `<div class="cell-muted" style="font-size:11px;">${esc(r.domain)}</div>` : ''}` },
      { key: 'status', label: 'Status', render: r => badge(r.status) },
      { key: 'totalRows', label: 'Rows', num: true, render: r => Number(r.totalRows).toLocaleString() },
      { key: 'calls', label: 'Calls (metered)', num: true, render: r => Number(r.calls).toLocaleString() },
      { key: 'storageMB', label: 'Storage', num: true, render: r => `${Number(r.storageMB).toFixed(2)} MB` },
      { key: 'seats', label: 'Seats', num: true },
      {
        key: 'usageShare', label: 'Share', num: true,
        render: r => `<span class="cell-muted">${(Number(r.usageShare || 0) * 100).toFixed(1)}%</span>`
      },
      { key: 'billable', label: 'Billable', num: true, render: r => `<span class="cell-strong">${money(r.billable)}</span>` },
      {
        // Labelled by what it actually is. With a recorded invoice this is a
        // share of real money; without one it is an indicative estimate, and
        // the header says which rather than letting the reader assume.
        key: 'cost',
        label: consumption.costBasis === 'actual' ? 'Actual cost (allocated)' : 'Est. cost',
        num: true,
        render: r => `<span class="cell-muted" title="${consumption.costBasis === 'actual'
          ? `${(Number(r.usageShare || 0) * 100).toFixed(1)}% of the ${consumption.period} platform invoice`
          : 'Indicative estimate — record the month\'s actual bill for a real figure'}">${usd(r.cost)}</span>`
      },
      {
        key: 'margin', label: 'Margin', num: true,
        render: r => {
          const m = Number(r.margin || 0);
          return `<span class="cell-strong" style="color:${m < 0 ? '#c0392b' : '#1e8e50'}">${usd(m)}</span>`;
        }
      }
    ],
    rows,
    empty: { icon: '💰', title: 'No consumption data', sub: 'Organizations appear here as they accrue usage.' },
    rowActions: r => `<button class="btn btn-glass btn-sm" data-action="usage" data-id="${r.orgId}" data-name="${esc(r.name)}">Breakdown</button>`
  });
}

function exportConsumptionCSV() {
  const rows = filteredConsumptionRows();
  if (!rows.length) return toast('Nothing to export.', 'warning');
  const rc = consumption.rateCard || {};
  const t = consumption.totals || {};
  // The cost column is headed by its basis, so an exported sheet cannot be
  // read months later as an invoice when it was only ever an estimate.
  const actual = consumption.costBasis === 'actual';
  const costHeader = actual
    ? `Allocated actual cost (${consumption.costCurrency || 'USD'})`
    : 'Est. infra cost (USD) — NO ACTUAL BILL RECORDED';
  const data = [
    [`Billing period: ${consumption.period}`, `Rate card (${rc.currency || 'USD'})`, `seat ${rc.perSeat}`, `GB ${rc.perGB}`, `1k calls ${rc.per1000Calls}`, `10k rows ${rc.per10kRows}`, '', '', '', '', ''],
    [actual ? `Actual platform invoice: ${consumption.actualBill} ${consumption.costCurrency || 'USD'}` : 'Actual platform invoice: not recorded',
      consumption.costNote || '', '', '', '', '', '', '', '', '', ''],
    ['Organization', 'Domain', 'Status', 'Industry', 'Rows', `Metered calls (${consumption.period})`, 'Storage (MB)', 'Seats', 'Usage share %', `Billable (${rc.currency || 'USD'})`, costHeader],
    ...rows.map(r => [r.name, r.domain, r.status, r.industry, r.totalRows, r.calls, r.storageMB.toFixed(2), r.seats,
      (Number(r.usageShare || 0) * 100).toFixed(2), r.billable.toFixed(2), r.cost.toFixed(4)]),
    ['TOTAL', '', '', '', t.rows, t.calls, Number(t.storageMB).toFixed(2), t.seats, '100.00', Number(t.billable).toFixed(2), Number(t.cost).toFixed(4)]
  ];
  downloadCSV(data, `billing-${consumption.period}.csv`);
  toast('Billing export downloaded.');
}

// Actual platform cost recorder.
//
// Catalyst bills consolidated across all projects and knows nothing about our
// tenants, so no API can tell us what one customer cost. The only real number
// available is the invoice itself — so the owner types it in here, and each
// tenant is charged the share of it their measured usage represents.
async function openPlatformCost() {
  let costs;
  try { costs = await api('GET', '/api/developer/platform-costs'); }
  catch (err) { return toast(err.message, 'error'); }
  const isOwner = me?.RoleLevel === 'owner';
  const period = consumption.period || new Date().toISOString().slice(0, 7);
  const existing = costs.periods?.[period] || {};
  const known = Object.keys(costs.periods || {}).sort().reverse().slice(0, 6);

  openModal({
    title: `Actual platform cost — ${period}`,
    body: `
      <p class="cell-muted" style="margin-bottom:14px;font-size:12.5px;">
        Enter the <strong>real Catalyst invoice</strong> for this month. Each organization is
        then charged the share of it their measured usage represents, so the cost column
        becomes an allocation of real money instead of an estimate.
        ${isOwner ? '' : ' <strong>Only the platform owner can record this.</strong>'}
      </p>
      <div class="form-grid">
        <div class="field"><label>Billing month</label>
          <input type="text" id="pc-period" value="${esc(period)}" placeholder="YYYY-MM" pattern="\\d{4}-\\d{2}"></div>
        <div class="field"><label>Currency (ISO code)</label>
          <input type="text" id="pc-currency" maxlength="3" value="${esc(costs.currency || 'USD')}" style="text-transform:uppercase;"></div>
        <div class="field" style="grid-column:1/-1;"><label>Invoice amount (leave blank to clear this month)</label>
          <input type="number" id="pc-amount" min="0" step="0.01" value="${existing.amount ?? ''}"></div>
        <div class="field" style="grid-column:1/-1;"><label>Note (optional)</label>
          <input type="text" id="pc-note" maxlength="300" value="${esc(existing.note || '')}" placeholder="e.g. includes one-off Stratus egress"></div>
      </div>
      ${known.length ? `<p class="cell-muted" style="margin-top:12px;font-size:12px;">Recorded months:
        ${known.map(p => `<strong>${esc(p)}</strong> ${usd(costs.periods[p].amount)}`).join(' · ')}</p>` : ''}`,
    footer: `<button class="btn btn-outline" id="m-cancel">Close</button>
             ${isOwner ? '<button class="btn btn-primary" id="pc-save">Save actual cost</button>' : ''}`,
    onOpen(mb) {
      if (!isOwner) mb.querySelectorAll('input').forEach(i => { i.disabled = true; });
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      const save = document.getElementById('pc-save');
      if (save) save.addEventListener('click', async () => {
        const raw = mb.querySelector('#pc-amount').value.trim();
        save.disabled = true;
        try {
          await api('PUT', '/api/developer/platform-costs', {
            period: mb.querySelector('#pc-period').value.trim(),
            currency: mb.querySelector('#pc-currency').value.trim().toUpperCase(),
            amount: raw === '' ? null : Number(raw),
            note: mb.querySelector('#pc-note').value.trim()
          });
          toast(raw === '' ? 'Actual cost cleared for that month.' : 'Actual cost recorded — costs are now allocated from the real invoice.');
          closeModal();
          loadConsumption(consumption.period);
        } catch (err) { toast(err.message, 'error'); save.disabled = false; }
      });
    }
  });
}

// Rate card editor: the platform owner's client-facing prices.
async function openRateCard() {
  let rates;
  try { rates = await api('GET', '/api/developer/billing-rates'); }
  catch (err) { return toast(err.message, 'error'); }
  const isOwner = me?.RoleLevel === 'owner';

  openModal({
    title: 'Billing rate card',
    body: `
      <p class="cell-muted" style="margin-bottom:14px;font-size:12.5px;">
        These are <strong>your prices to clients</strong> — set them with your margin included.
        Every "Billable" figure is measured usage × this card. It is separate from the
        indicative infra-cost estimate.${isOwner ? '' : ' <strong>Only the platform owner can edit these.</strong>'}
      </p>
      <div class="form-grid">
        <div class="field"><label>Currency (ISO code)</label>
          <input type="text" id="rc-currency" maxlength="3" value="${esc(rates.currency || 'USD')}" style="text-transform:uppercase;"></div>
        <div class="field"><label>Per seat / month</label>
          <input type="number" id="rc-seat" min="0" step="0.01" value="${Number(rates.perSeat)}"></div>
        <div class="field"><label>Per GB storage / month</label>
          <input type="number" id="rc-gb" min="0" step="0.01" value="${Number(rates.perGB)}"></div>
        <div class="field"><label>Per 1,000 API calls</label>
          <input type="number" id="rc-calls" min="0" step="0.01" value="${Number(rates.per1000Calls)}"></div>
        <div class="field"><label>Per 10,000 data rows / month</label>
          <input type="number" id="rc-rows" min="0" step="0.01" value="${Number(rates.per10kRows)}"></div>
      </div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Close</button>
             ${isOwner ? '<button class="btn btn-primary" id="rc-save">Save rates</button>' : ''}`,
    onOpen(mb) {
      if (!isOwner) mb.querySelectorAll('input').forEach(i => { i.disabled = true; });
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      const save = document.getElementById('rc-save');
      if (save) save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          await api('PUT', '/api/developer/billing-rates', {
            currency: mb.querySelector('#rc-currency').value.trim().toUpperCase(),
            perSeat: Number(mb.querySelector('#rc-seat').value || 0),
            perGB: Number(mb.querySelector('#rc-gb').value || 0),
            per1000Calls: Number(mb.querySelector('#rc-calls').value || 0),
            per10kRows: Number(mb.querySelector('#rc-rows').value || 0)
          });
          toast('Rate card saved — billable amounts updated.');
          closeModal();
          loadConsumption(consumption.period);
        } catch (err) { toast(err.message, 'error'); save.disabled = false; }
      });
    }
  });
}

/* ---------------- Wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(applyStoredTheme());
  watchSystemTheme(applyTheme);
  boot();

  // Clicking the toggle is an explicit choice, so it persists.
  document.getElementById('btn-theme-dev').addEventListener('click', () =>
    applyTheme((document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark', true));
  document.getElementById('org-search').addEventListener('input', drawOrgs);
  document.getElementById('org-refresh').addEventListener('click', loadOrgs);
  document.getElementById('org-export-all').addEventListener('click', exportOrgsCSV);
  document.getElementById('org-print').addEventListener('click', printOrgs);
  document.getElementById('btn-invite-dev')?.addEventListener('click', openInviteDev);

  // Consumption tab
  ['cons-search', 'cons-status', 'cons-sort'].forEach(id =>
    document.getElementById(id).addEventListener('input', drawConsumption));
  document.getElementById('cons-period').addEventListener('change', e => loadConsumption(e.target.value));
  document.getElementById('cons-rates').addEventListener('click', openRateCard);
  document.getElementById('cons-actual').addEventListener('click', openPlatformCost);
  document.getElementById('cons-refresh').addEventListener('click', () => loadConsumption(consumption.period));
  document.getElementById('cons-export').addEventListener('click', exportConsumptionCSV);
  document.getElementById('consumption-body').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action="usage"]');
    if (btn) openUsage(btn.dataset.id, btn.dataset.name);
  });

  document.getElementById('orgs-body').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, name } = btn.dataset;
    if (action === 't360') return openTenant360(id, name);
    if (action === 'detail') return openOrgDetail(id);
    if (action === 'usage') return openUsage(id, name);
    if (action === 'backup') return downloadBackup(id, name);
    if (action === 'delete') return openDeleteOrg(id, name);
    if (action === 'activate') { btn.disabled = true; await setOrgStatus(id, 'Active').catch(err => { toast(err.message, 'error'); btn.disabled = false; }); }
    if (action === 'suspend') {
      openModal({
        title: 'Suspend organization',
        body: `<p>Suspend <strong>${esc(name)}</strong>? Its members will lose access to every module until re-activated. Their data is kept.</p>`,
        footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-danger" id="m-confirm">Suspend</button>`,
        onOpen() {
          document.getElementById('m-cancel').addEventListener('click', closeModal);
          document.getElementById('m-confirm').addEventListener('click', async () => {
            closeModal();
            await setOrgStatus(id, 'Suspended').catch(err => toast(err.message, 'error'));
          });
        }
      });
    }
  });

  document.getElementById('devs-body').addEventListener('click', async e => {
    const resendBtn = e.target.closest('button[data-action="resend-dev"]');
    if (resendBtn) return resendInvite(resendBtn.dataset.id, resendBtn.dataset.email);
    const assignBtn = e.target.closest('button[data-action="assign-dev"]');
    if (assignBtn) return openAssignOrgs(assignBtn.dataset.id, assignBtn.dataset.name);
    const btn = e.target.closest('button[data-action="remove-dev"]');
    if (!btn) return;
    openModal({
      title: 'Remove developer',
      body: `<p>Remove <strong>${esc(btn.dataset.name)}</strong> from the developer portal?</p>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-danger" id="m-confirm">Remove</button>`,
      onOpen() {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-confirm').addEventListener('click', async () => {
          closeModal();
          try {
            await api('DELETE', `/api/developer/developers/${btn.dataset.id}`);
            toast('Developer removed.');
            await loadDevs();
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    });
  });
});
