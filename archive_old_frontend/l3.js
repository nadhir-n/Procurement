// L3 support console — tenant diagnostics, capability control, industry
// packs, impersonation and the ticket queue.
//
// Kept separate from developer.js so the billing/consumption tooling and the
// support tooling can evolve independently.

import { api } from './api.js?v=34';
import { esc, toast, badge, openModal, closeModal, renderTable, skeletonTable } from './ui.js?v=34';

let registry = null;     // { capabilities: [...], packs: [...] }
let tickets = [];
let orgsRef = [];        // shared list from developer.js
let currentTenant = null;

export function setOrgs(list) { orgsRef = list || []; }

async function ensureRegistry() {
  if (!registry) registry = await api('GET', '/api/developer/capabilities');
  return registry;
}

function fmtDT(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? String(v).slice(0, 16) : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SEVERITIES = ['S1 Critical', 'S2 High', 'S3 Normal', 'S4 Low'];
const STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];
const CATEGORIES = ['Bug', 'Configuration', 'Data', 'Feature Request', 'Question'];

const sevClass = (s) => ({
  'S1 Critical': 'badge-critical', 'S2 High': 'badge-serious',
  'S3 Normal': 'badge-info', 'S4 Low': 'badge-neutral'
}[s] || 'badge-neutral');

const statusClass = (s) => ({
  Open: 'badge-warning', 'In Progress': 'badge-info', 'Waiting on Customer': 'badge-neutral',
  Resolved: 'badge-good', Closed: 'badge-neutral'
}[s] || 'badge-neutral');

/* =========================================================
   L3 OVERVIEW DASHBOARD
   ========================================================= */
export async function loadL3Overview() {
  const root = document.getElementById('l3-overview');
  if (!root) return;
  root.innerHTML = skeletonTable(4, 3);

  let d;
  try { d = await api('GET', '/api/developer/l3-overview'); }
  catch (err) { root.innerHTML = `<div class="empty"><div class="title">Could not load the support overview</div><div class="sub">${esc(err.message)}</div></div>`; return; }

  const stat = (icon, label, value, tone) => `
    <div class="glass-stat">
      <div class="glass-stat-icon">${icon}</div>
      <div><div class="glass-stat-label">${esc(label)}</div>
      <div class="glass-stat-value" ${tone ? `style="color:var(--status-${tone})"` : ''}>${value}</div></div>
    </div>`;

  const sevRows = Object.entries(d.ticketsBySeverity || {}).sort();
  const industryRows = Object.entries(d.byIndustry || {}).sort((a, b) => b[1] - a[1]);
  const maxInd = Math.max(1, ...industryRows.map(r => r[1]));

  root.innerHTML = `
    <div class="dev-stat-grid">
      ${stat('🏢', 'Tenants', d.tenants)}
      ${stat('✅', 'Active', d.active, 'good')}
      ${stat('🕒', 'Pending verification', d.pendingVerification, d.pendingVerification ? 'warning' : '')}
      ${stat('⛔', 'Suspended', d.suspended, d.suspended ? 'critical' : '')}
      ${stat('🎫', 'Open tickets', d.openTickets, d.openTickets ? 'warning' : 'good')}
    </div>

    <div class="l3-cols">
      <div class="glass-card">
        <div class="card-header"><div class="card-title">Open tickets by severity</div></div>
        <div class="card-body">
          ${sevRows.length === 0
            ? '<div class="empty" style="padding:26px;"><div class="title">Queue is clear</div><div class="sub">No open support tickets.</div></div>'
            : sevRows.map(([sev, n]) => `
              <div class="l3-sev-row">
                <span class="badge ${sevClass(sev)}">${esc(sev)}</span>
                <span class="l3-sev-n">${n}</span>
              </div>`).join('')}
        </div>
      </div>

      <div class="glass-card">
        <div class="card-header"><div class="card-title">Tenants by industry</div></div>
        <div class="card-body">
          ${industryRows.length === 0 ? '<div class="cell-muted">No tenants yet.</div>' : industryRows.map(([name, n]) => `
            <div class="l3-bar-row">
              <div class="l3-bar-label">${esc(name)}</div>
              <div class="l3-bar-track"><span style="width:${Math.round((n / maxInd) * 100)}%"></span></div>
              <div class="l3-bar-val">${n}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="glass-card">
      <div class="card-header"><div class="card-title">Latest tickets</div>
        <button class="btn btn-glass btn-sm" id="l3-goto-tickets">Open queue →</button></div>
      <div class="card-body flush" id="l3-recent-tickets"></div>
    </div>`;

  document.getElementById('l3-recent-tickets').innerHTML = renderTable({
    columns: [
      { key: 'TicketNo', label: 'Ticket', render: r => `<span class="cell-strong">${esc(r.TicketNo || '—')}</span>` },
      { key: 'Subject', label: 'Subject', render: r => esc(r.Subject || '') },
      { key: 'OrgName', label: 'Tenant', render: r => esc(r.OrgName || '—') },
      { key: 'Severity', label: 'Severity', render: r => `<span class="badge ${sevClass(r.Severity)}">${esc(r.Severity || '—')}</span>` },
      { key: 'Status', label: 'Status', render: r => `<span class="badge ${statusClass(r.Status)}">${esc(r.Status || '—')}</span>` }
    ],
    rows: d.recentTickets || [],
    empty: { icon: '🎫', title: 'No tickets logged', sub: 'Raise one from a tenant’s support view.' }
  });

  document.getElementById('l3-goto-tickets')?.addEventListener('click', () => {
    document.querySelector('.glass-tab[data-tab="tickets"]')?.click();
  });
}

/* =========================================================
   TENANT 360 — the deep-dive support view
   ========================================================= */
export async function openTenant360(orgId, orgName) {
  await ensureRegistry();
  openModal({
    title: `Tenant 360 — ${orgName}`,
    wide: true,
    body: '<div id="t360-body">' + skeletonTable(4, 5) + '</div>',
    footer: '<button class="btn btn-ghost" id="t360-close">Close</button>'
  });
  document.getElementById('t360-close').addEventListener('click', closeModal);

  let d;
  try { d = await api('GET', `/api/developer/organizations/${orgId}/tenant360`); }
  catch (err) {
    document.getElementById('t360-body').innerHTML = `<div class="empty"><div class="title">Could not load tenant</div><div class="sub">${esc(err.message)}</div></div>`;
    return;
  }
  currentTenant = d;
  drawTenant360(orgId, orgName);
}

function drawTenant360(orgId, orgName) {
  const d = currentTenant;
  const body = document.getElementById('t360-body');
  const caps = registry.capabilities;
  const groups = [...new Set(caps.map(c => c.group))];

  const healthTone = d.health.score >= 80 ? 'good' : d.health.score >= 50 ? 'warning' : 'critical';

  const countTile = (label, n) => `<div class="glass-mini"><div class="glass-mini-label">${esc(label)}</div><div class="glass-mini-value">${n}</div></div>`;

  body.innerHTML = `
    <div class="t360-tabs">
      <button class="t360-tab active" data-t="overview">Overview</button>
      <button class="t360-tab" data-t="caps">Capabilities</button>
      <button class="t360-tab" data-t="repair">Repair tools</button>
      <button class="t360-tab" data-t="activity">Activity</button>
    </div>

    <div class="t360-pane" data-pane="overview">
      <div class="t360-head">
        <div>
          <div class="t360-name">${esc(d.org.Name)} ${badge(d.org.Status)}</div>
          <div class="cell-muted">${esc(d.pack.label)} · ${esc(d.settings.currency)} · ${esc(d.settings.country || 'No country set')}</div>
        </div>
        <div class="t360-health">
          <div class="t360-health-score" style="color:var(--status-${healthTone})">${d.health.score}%</div>
          <div class="cell-muted">Setup health</div>
        </div>
      </div>

      <div class="glass-mini-grid" style="margin:16px 0;">
        ${countTile('Users', d.counts.users)}${countTile('Vendors', d.counts.suppliers)}
        ${countTile('Items', d.counts.items)}${countTile('Requests', d.counts.prs)}
        ${countTile('Orders', d.counts.pos)}${countTile('Bills', d.counts.invoices)}
        ${countTile('Budgets', d.counts.budgets)}${countTile('Open tickets', d.openTickets)}
      </div>

      <div class="t360-section-title">Setup checklist</div>
      <div class="t360-checks">
        ${d.health.checks.map(c => `
          <div class="t360-check ${c.ok ? 'ok' : ''}">
            <span class="t360-check-dot">${c.ok ? '✓' : ''}</span>${esc(c.label)}
          </div>`).join('')}
      </div>

      <div class="t360-section-title">Configuration</div>
      <div class="t360-kv">
        <div><span>Industry</span><b>${esc(d.industry || '—')}</b></div>
        <div><span>Pack</span><b>${esc(d.pack.key)}</b></div>
        <div><span>Fiscal year</span><b>${esc(d.settings.fiscalYearStart || '—')}</b></div>
        <div><span>Time zone</span><b>${esc(d.settings.timezone || '—')}</b></div>
        <div><span>Departments</span><b>${d.settings.departments.length}</b></div>
        <div><span>Approval flow</span><b>${esc(d.settings.approvalRules?.PR || 'Not set')}</b></div>
        <div><span>Auto-approve limit</span><b>${d.settings.autoApproveLimit ?? '—'}</b></div>
        <div><span>Zoho Books</span><b>${d.settings.booksConnected ? 'Connected' : 'Not connected'}</b></div>
      </div>

      <div class="t360-actions">
        <button class="btn btn-outline btn-sm" id="t360-impersonate">👁 View as customer</button>
        <button class="btn btn-outline btn-sm" id="t360-ticket">🎫 Log a ticket</button>
      </div>
    </div>

    <div class="t360-pane" data-pane="caps" style="display:none;">
      <p class="cell-muted" style="margin-bottom:14px;font-size:12.5px;line-height:1.5;">
        Capabilities resolve as <b>registry default → industry pack → tenant override</b>.
        Changing the industry re-bases the defaults; a switch you set here pins the value for this tenant only.
      </p>
      <div class="t360-industry-row">
        <label>Industry pack</label>
        <select id="t360-industry">
          ${registry.packs.map(p => `<option value="${esc(p.key)}" ${p.key === d.pack.key ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm" id="t360-apply-industry">Apply pack</button>
      </div>
      ${groups.map(g => `
        <div class="t360-cap-group">
          <div class="t360-section-title">${esc(g)}</div>
          ${caps.filter(c => c.group === g).map(c => {
            const on = !!d.capabilities[c.key];
            const src = d.capabilitySources[c.key];
            return `
            <div class="t360-cap">
              <label class="pf-switch ${c.locked ? 'locked' : ''}">
                <input type="checkbox" data-cap="${esc(c.key)}" ${on ? 'checked' : ''} ${c.locked ? 'disabled' : ''}>
                <span class="pf-switch-track"></span>
              </label>
              <div class="t360-cap-text">
                <div class="t360-cap-label">${esc(c.label)}
                  <span class="t360-src t360-src-${src}">${src}</span></div>
                <div class="t360-cap-help">${esc(c.help || '')}</div>
              </div>
            </div>`;
          }).join('')}
        </div>`).join('')}
      <div class="t360-actions">
        <button class="btn btn-primary btn-sm" id="t360-save-caps">Save capabilities</button>
        <button class="btn btn-ghost btn-sm" id="t360-clear-caps">Clear overrides</button>
      </div>
    </div>

    <div class="t360-pane" data-pane="repair" style="display:none;">
      <p class="cell-muted" style="margin-bottom:14px;font-size:12.5px;line-height:1.5;">
        Repair actions write to this tenant's configuration and are recorded in their audit log.
        They never delete transactional records.
      </p>
      ${[
        ['reseed_departments', '🏛', 'Re-seed departments', 'Reset the department list to the industry pack defaults. Existing records keep their department text.'],
        ['reseed_categories', '🏷', 'Re-seed categories', 'Reset purchasing categories (and their CapEx/OpEx mapping) to the pack defaults.'],
        ['reset_approvals', '✅', 'Reset approval rules', 'Return to a single-step approval flow. Use when a tenant has locked themselves out of approvals.'],
        ['clear_capability_overrides', '🎚', 'Clear capability overrides', 'Drop every per-tenant switch so the tenant follows its industry pack again.'],
        ['disconnect_books', '🔌', 'Disconnect Zoho Books', 'Clear stored OAuth tokens. The customer must reconnect from Settings.']
      ].map(([action, icon, label, help]) => `
        <div class="t360-repair">
          <div class="t360-repair-ic">${icon}</div>
          <div class="t360-repair-text"><div class="t360-cap-label">${esc(label)}</div>
            <div class="t360-cap-help">${esc(help)}</div></div>
          <button class="btn btn-outline btn-sm" data-repair="${action}">Run</button>
        </div>`).join('')}
    </div>

    <div class="t360-pane" data-pane="activity" style="display:none;">
      <div id="t360-activity"></div>
    </div>`;

  // Tab switching
  body.querySelectorAll('.t360-tab').forEach(t => t.addEventListener('click', () => {
    body.querySelectorAll('.t360-tab').forEach(x => x.classList.toggle('active', x === t));
    body.querySelectorAll('.t360-pane').forEach(p =>
      p.style.display = p.dataset.pane === t.dataset.t ? 'block' : 'none');
  }));

  document.getElementById('t360-activity').innerHTML = renderTable({
    columns: [
      { key: 'CREATEDTIME', label: 'When', render: r => fmtDT(r.CREATEDTIME) },
      { key: 'ActorEmail', label: 'Actor', render: r => esc(r.ActorEmail || '—') },
      { key: 'Action', label: 'Action', render: r => `<span class="cell-strong">${esc(r.Action || '')}</span>` },
      { key: 'RecordType', label: 'Type', render: r => esc(r.RecordType || '—') }
    ],
    rows: d.recentActivity || [],
    empty: { icon: '📋', title: 'No recent activity', sub: 'Audit entries appear here as the tenant uses the app.' }
  });

  // ---- Capability save ----
  document.getElementById('t360-save-caps')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const payload = {};
    body.querySelectorAll('[data-cap]').forEach(input => {
      if (input.disabled) return;
      payload[input.dataset.cap] = input.checked;
    });
    try {
      const r = await api('PUT', `/api/developer/organizations/${orgId}/capabilities`, { capabilities: payload });
      currentTenant.capabilities = r.capabilities;
      toast('Capabilities updated for this tenant.');
      await openTenant360(orgId, orgName);
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
  });

  document.getElementById('t360-clear-caps')?.addEventListener('click', () => runRepair(orgId, orgName, 'clear_capability_overrides'));

  document.getElementById('t360-apply-industry')?.addEventListener('click', async (e) => {
    const industry = document.getElementById('t360-industry').value;
    const btn = e.currentTarget; btn.disabled = true;
    try {
      await api('PUT', `/api/developer/organizations/${orgId}/industry`, { industry });
      toast('Industry pack applied.');
      await openTenant360(orgId, orgName);
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
  });

  body.querySelectorAll('[data-repair]').forEach(btn =>
    btn.addEventListener('click', () => runRepair(orgId, orgName, btn.dataset.repair)));

  document.getElementById('t360-impersonate')?.addEventListener('click', () => openImpersonate(orgId, orgName));
  document.getElementById('t360-ticket')?.addEventListener('click', () => openNewTicket(orgId, orgName));
}

async function runRepair(orgId, orgName, action) {
  if (!confirm(`Run "${action.replace(/_/g, ' ')}" on ${orgName}?\n\nThis changes the tenant's configuration and is audit-logged.`)) return;
  try {
    const r = await api('POST', `/api/developer/organizations/${orgId}/repair`, { action });
    toast(r.message);
    await openTenant360(orgId, orgName);
  } catch (err) { toast(err.message, 'error'); }
}

/* =========================================================
   IMPERSONATION
   ========================================================= */
function openImpersonate(orgId, orgName) {
  openModal({
    title: 'View as customer',
    body: `
      <div class="danger-box" style="margin-bottom:16px;">
        <div style="font-size:20px;">👁</div>
        <div>
          <div style="font-weight:700;margin-bottom:4px;">This opens a read-only support session</div>
          <div style="font-size:12.5px;line-height:1.5;color:var(--ink-2);">
            You will see <b>${esc(orgName)}</b>'s workspace as their users see it. The session expires
            after 30 minutes and is recorded in the tenant's audit log with your name and the reason below.
          </div>
        </div>
      </div>
      <div class="field">
        <label>Reason for access <span class="req">*</span></label>
        <input type="text" id="imp-reason" placeholder="e.g. Ticket TKT-123 — PR totals not matching">
        <div class="help">Required. Shown to the customer in their audit log.</div>
      </div>`,
    footer: `<button class="btn btn-ghost" id="imp-cancel">Cancel</button>
             <button class="btn btn-primary" id="imp-go">Start session</button>`
  });
  document.getElementById('imp-cancel').addEventListener('click', closeModal);
  document.getElementById('imp-go').addEventListener('click', async (e) => {
    const reason = document.getElementById('imp-reason').value.trim();
    if (reason.length < 5) return toast('Please give a reason (at least 5 characters).', 'warning');
    e.currentTarget.disabled = true;
    try {
      const r = await api('POST', `/api/developer/organizations/${orgId}/impersonate`, { reason });
      closeModal();
      toast('Support session started — opening the workspace.');
      window.open(`index.html?support=${encodeURIComponent(r.token)}&org=${encodeURIComponent(orgId)}`, '_blank');
    } catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });
}

/* =========================================================
   TICKET QUEUE
   ========================================================= */
export async function loadTickets() {
  const body = document.getElementById('tickets-body');
  if (!body) return;
  body.innerHTML = skeletonTable(6, 5);
  tickets = await api('GET', '/api/developer/tickets').catch(() => []);
  drawTickets();
}

function drawTickets() {
  const body = document.getElementById('tickets-body');
  if (!body) return;
  const q = (document.getElementById('ticket-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('ticket-status')?.value || '';
  let rows = tickets;
  if (q) rows = rows.filter(t => `${t.TicketNo} ${t.Subject} ${t.OrgName}`.toLowerCase().includes(q));
  if (statusFilter) rows = rows.filter(t => t.Status === statusFilter);

  body.innerHTML = renderTable({
    columns: [
      { key: 'TicketNo', label: 'Ticket', render: r => `<span class="cell-strong">${esc(r.TicketNo || '—')}</span>` },
      { key: 'Subject', label: 'Subject', render: r => esc(r.Subject || '') },
      { key: 'OrgName', label: 'Tenant', render: r => esc(r.OrgName || '—') },
      { key: 'Severity', label: 'Severity', render: r => `<span class="badge ${sevClass(r.Severity)}">${esc(r.Severity || '—')}</span>` },
      { key: 'Status', label: 'Status', render: r => `<span class="badge ${statusClass(r.Status)}">${esc(r.Status || '—')}</span>` },
      { key: 'CREATEDTIME', label: 'Raised', render: r => fmtDT(r.CREATEDTIME) }
    ],
    rows,
    empty: { icon: '🎫', title: 'No tickets', sub: 'Log a ticket from a tenant’s Tenant 360 view.' },
    rowActions: r => `<button class="btn btn-glass btn-sm" data-ticket="${r.ROWID}">Open</button>`
  });

  body.querySelectorAll('[data-ticket]').forEach(btn =>
    btn.addEventListener('click', () => openTicket(btn.dataset.ticket)));
}

export function wireTicketFilters() {
  document.getElementById('ticket-search')?.addEventListener('input', drawTickets);
  document.getElementById('ticket-status')?.addEventListener('change', drawTickets);
  document.getElementById('ticket-refresh')?.addEventListener('click', loadTickets);
  document.getElementById('ticket-new')?.addEventListener('click', () => {
    if (orgsRef.length === 0) return toast('No tenants available.', 'warning');
    openNewTicket();
  });
}

function openNewTicket(orgId, orgName) {
  const options = orgsRef.map(o =>
    `<option value="${o.ROWID}" ${String(o.ROWID) === String(orgId) ? 'selected' : ''}>${esc(o.Name)}</option>`).join('');
  openModal({
    title: orgName ? `Log a ticket — ${orgName}` : 'Log a support ticket',
    body: `
      <div class="form-grid">
        <div class="field full"><label>Tenant <span class="req">*</span></label>
          <select id="nt-org">${options}</select></div>
        <div class="field full"><label>Subject <span class="req">*</span></label>
          <input type="text" id="nt-subject" placeholder="Short summary of the issue"></div>
        <div class="field"><label>Severity</label>
          <select id="nt-sev">${SEVERITIES.map(s => `<option ${s === 'S3 Normal' ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>Category</label>
          <select id="nt-cat">${CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field full"><label>Description</label>
          <textarea id="nt-desc" rows="5" placeholder="What happened, what was expected, and how to reproduce it."></textarea></div>
      </div>`,
    footer: `<button class="btn btn-ghost" id="nt-cancel">Cancel</button>
             <button class="btn btn-primary" id="nt-save">Create ticket</button>`
  });
  document.getElementById('nt-cancel').addEventListener('click', closeModal);
  document.getElementById('nt-save').addEventListener('click', async (e) => {
    const subject = document.getElementById('nt-subject').value.trim();
    if (!subject) return toast('Subject is required.', 'warning');
    e.currentTarget.disabled = true;
    try {
      await api('POST', '/api/developer/tickets', {
        OrgID: document.getElementById('nt-org').value,
        Subject: subject,
        Description: document.getElementById('nt-desc').value.trim(),
        Severity: document.getElementById('nt-sev').value,
        Category: document.getElementById('nt-cat').value
      });
      closeModal();
      toast('Ticket created.');
      await loadTickets();
    } catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });
}

function openTicket(id) {
  const t = tickets.find(x => String(x.ROWID) === String(id));
  if (!t) return;
  let notes = [];
  try { notes = JSON.parse(t.NotesJson || '[]'); } catch { notes = []; }

  openModal({
    title: `${t.TicketNo || 'Ticket'} — ${t.OrgName || ''}`,
    wide: true,
    body: `
      <div class="tkt-head">
        <div class="tkt-subject">${esc(t.Subject || '')}</div>
        <div class="cell-muted">Raised by ${esc(t.RaisedBy || '—')} · ${fmtDT(t.CREATEDTIME)}</div>
      </div>
      ${t.Description ? `<div class="tkt-desc">${esc(t.Description)}</div>` : ''}
      <div class="form-grid" style="margin-top:16px;">
        <div class="field"><label>Status</label>
          <select id="tk-status">${STATUSES.map(s => `<option ${s === t.Status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>Severity</label>
          <select id="tk-sev">${SEVERITIES.map(s => `<option ${s === t.Severity ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="field full"><label>Resolution</label>
          <textarea id="tk-res" rows="3" placeholder="How this was resolved">${esc(t.Resolution || '')}</textarea></div>
        <div class="field full"><label>Add a work note</label>
          <textarea id="tk-note" rows="2" placeholder="What you investigated or changed"></textarea></div>
      </div>
      <div class="t360-section-title">Work log</div>
      <div class="tkt-notes">
        ${notes.length === 0 ? '<div class="cell-muted">No notes yet.</div>' : notes.slice().reverse().map(n => `
          <div class="tkt-note">
            <div class="tkt-note-meta">${esc(n.by || '')} · ${fmtDT(n.at)}</div>
            <div>${esc(n.text || '')}</div>
          </div>`).join('')}
      </div>`,
    footer: `<button class="btn btn-ghost" id="tk-cancel">Close</button>
             <button class="btn btn-primary" id="tk-save">Save</button>`
  });
  document.getElementById('tk-cancel').addEventListener('click', closeModal);
  document.getElementById('tk-save').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      const payload = {
        Status: document.getElementById('tk-status').value,
        Severity: document.getElementById('tk-sev').value,
        Resolution: document.getElementById('tk-res').value.trim()
      };
      const note = document.getElementById('tk-note').value.trim();
      if (note) payload.note = note;
      await api('PUT', `/api/developer/tickets/${id}`, payload);
      closeModal();
      toast('Ticket updated.');
      await loadTickets();
    } catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });
}
