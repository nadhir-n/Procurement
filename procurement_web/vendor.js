// Vendor Portal — a standalone client with its OWN auth (a vendor has no
// Catalyst user account). Every call after login carries an opaque bearer
// token that the server looks up in VendorSessions; nothing here is trusted
// client-side, it's just UI over the vendor-scoped API.
import { applyStoredTheme } from './js/ui.js?v=47';

applyStoredTheme();
const API_BASE = '/server/procurement_api';

const state = { token: localStorage.getItem('vp-token') || '', vendor: null, orgName: '', prefs: {} };

document.getElementById('vp-theme')?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('pf-theme', next);
  document.documentElement.dataset.theme = next;
});

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function currency(n) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(n || 0)); }
  catch { return `$${Number(n || 0).toFixed(2)}`; }
}
function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? String(v).slice(0, 10) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'error' ? '⚠' : '✓'}</span><span>${esc(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
function openModal({ title, body, footer, onOpen }) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer || '';
  document.getElementById('modal-backdrop').classList.add('open');
  if (onOpen) onOpen(document.getElementById('modal-body'), document.getElementById('modal-footer'));
}
function closeModal() { document.getElementById('modal-backdrop').classList.remove('open'); }
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', e => { if (e.target.id === 'modal-backdrop') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function badge(text, kind = 'neutral') { return `<span class="badge badge-${kind}">${esc(text)}</span>`; }
const RFQ_BADGE = { Published: ['info', 'Open for bids'], Closed: ['neutral', 'Closed'], Awarded: ['neutral', 'Awarded'] };
const PO_BADGE = { Sent_To_Supplier: ['info', 'Sent'], Fulfilled: ['good', 'Fulfilled'], Cancelled: ['critical', 'Cancelled'] };
const INV_BADGE = { Matched: ['good', 'Matched'], Review: ['warning', 'Review'], Discrepancy: ['serious', 'Discrepancy'], Unmatched: ['warning', 'Unmatched'], Partially_Paid: ['warning', 'Partially paid'], Paid: ['good', 'Paid'] };
// A vendor's own bid outcome on an awarded RFQ.
const BID_BADGE = { Awarded: ['good', 'You won 🎉'], Rejected: ['critical', 'Not selected'], Submitted: ['info', 'Submitted'] };

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  // Send the vendor session token in a CUSTOM header, never Authorization:Bearer
  // — the Catalyst gateway intercepts Bearer tokens and rejects our opaque
  // session token upstream (INVALID_TOKEN 401) before it reaches the function.
  if (state.token) headers['X-Vendor-Token'] = state.token;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function showScreen(id) {
  document.querySelectorAll('.vp-screen').forEach(s => s.classList.toggle('open', s.id === id));
}

/* ---------------- Invite acceptance (first-time link) ---------------- */
function initInviteFlow() {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('invite');
  const vendorId = params.get('vendor');
  if (!invite || !vendorId) return false;

  showScreen('vp-invite');
  document.getElementById('vp-invite-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('vp-invite-code').value;
    const code2 = document.getElementById('vp-invite-code2').value;
    const errEl = document.getElementById('vp-invite-error');
    errEl.textContent = '';
    if (code !== code2) { errEl.textContent = 'The two codes do not match.'; return; }
    const btn = document.getElementById('vp-invite-btn'); btn.disabled = true; btn.textContent = 'Setting up…';
    try {
      await api('POST', '/api/vendor-portal/accept-invite', { inviteToken: invite, vendorId, accessCode: code });
      toast('Access code set — sign in below.');
      window.location.href = 'vendor_portal.html';
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Set access code & continue';
    }
  });
  return true;
}

/* ---------------- Login ---------------- */
function initLoginForm() {
  document.getElementById('vp-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('vp-email').value.trim();
    const accessCode = document.getElementById('vp-code').value;
    const errEl = document.getElementById('vp-login-error');
    errEl.textContent = '';
    const btn = document.getElementById('vp-login-btn'); btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const data = await api('POST', '/api/vendor-portal/login', { email, accessCode });
      state.token = data.token;
      localStorage.setItem('vp-token', data.token);
      await bootDashboard();
    } catch (err) {
      errEl.textContent = err.message;
    }
    btn.disabled = false; btn.textContent = 'Sign in';
  });
}

document.getElementById('vp-logout').addEventListener('click', async () => {
  try { await api('POST', '/api/vendor-portal/logout'); } catch {}
  state.token = ''; localStorage.removeItem('vp-token');
  showScreen('vp-login');
});

/* ---------------- Dashboard ---------------- */
let cache = { rfqs: [], pos: [], invoices: [], payments: [] };
let activeTab = 'rfqs';

async function bootDashboard() {
  try {
    const me = await api('GET', '/api/vendor-portal/me');
    state.vendor = me.vendor; state.orgName = me.orgName; state.prefs = me.prefs;
  } catch (err) {
    state.token = ''; localStorage.removeItem('vp-token');
    showScreen('vp-login');
    if (err.message && !/UNAUTHENTICATED/i.test(err.message)) toast(err.message, 'error');
    return;
  }

  document.getElementById('vp-org-name').textContent = state.orgName;
  document.getElementById('vp-vendor-name').textContent = state.vendor?.Name || '';
  const banner = document.getElementById('vp-banner');
  if (state.prefs.bannerMessage) { banner.textContent = state.prefs.bannerMessage; banner.classList.add('show'); }
  else banner.classList.remove('show');

  showScreen('vp-app');
  await loadAll();
  drawTab();
}

async function loadAll() {
  const [rfqs, pos, invoices, payments] = await Promise.all([
    api('GET', '/api/vendor-portal/rfqs').catch(() => []),
    api('GET', '/api/vendor-portal/pos').catch(() => []),
    api('GET', '/api/vendor-portal/invoices').catch(() => []),
    api('GET', '/api/vendor-portal/payments').catch(() => [])
  ]);
  cache = { rfqs, pos, invoices, payments };

  document.getElementById('vp-stat-rfqs').textContent = rfqs.filter(r => r.Status === 'Published').length;
  document.getElementById('vp-stat-pos').textContent = pos.filter(p => p.Status === 'Sent_To_Supplier').length;
  document.getElementById('vp-stat-invoices').textContent = invoices.length;
  const totalPaid = payments.reduce((a, p) => a + Number(p.AmountPaid || 0), 0);
  document.getElementById('vp-stat-paid').textContent = currency(totalPaid);
}

document.querySelectorAll('.vp-tab').forEach(t => t.addEventListener('click', () => {
  activeTab = t.dataset.vptab;
  document.querySelectorAll('.vp-tab').forEach(x => x.classList.toggle('active', x === t));
  drawTab();
}));

function emptyState(icon, title, sub) {
  return `<div class="empty"><div class="icon">${icon}</div><div class="title">${esc(title)}</div><div class="sub">${esc(sub)}</div></div>`;
}

function drawTab() {
  const body = document.getElementById('vp-tab-body');
  if (activeTab === 'rfqs') return drawRfqs(body);
  if (activeTab === 'pos') return drawPos(body);
  if (activeTab === 'invoices') return drawInvoices(body);
  if (activeTab === 'payments') return drawPayments(body);
}

function drawRfqs(body) {
  if (cache.rfqs.length === 0) {
    body.innerHTML = `<div class="card"><div class="card-body">${emptyState('📣', 'No RFQs yet', 'Requests for quotes your buyer invites you to bid on will appear here.')}</div></div>`;
    return;
  }
  body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data">
    <thead><tr><th>RFQ</th><th>Deadline</th><th>Status</th><th>Your bid</th><th class="num"></th></tr></thead>
    <tbody>${cache.rfqs.map(r => {
      const [kind, label] = RFQ_BADGE[r.Status] || ['neutral', r.Status];
      const canBid = state.prefs.allowBidding && r.Status === 'Published' && (!r.Deadline || new Date(r.Deadline) >= new Date());
      return `<tr data-label="RFQ">
        <td data-label="RFQ"><span class="cell-strong">${esc(r.RFQNumber)}</span></td>
        <td data-label="Deadline">${fmtDate(r.Deadline)}</td>
        <td data-label="Status">${badge(label, kind)}</td>
        <td data-label="Your bid">${r.myBid
          ? `${currency(r.myBid.TotalBidAmount)}${r.myBid.Status && BID_BADGE[r.myBid.Status] ? ' ' + badge(BID_BADGE[r.myBid.Status][1], BID_BADGE[r.myBid.Status][0]) : ''}`
          : '<span class="cell-muted">Not submitted</span>'}</td>
        <td class="num" data-label="Actions">${canBid ? `<button class="btn btn-primary btn-sm" data-bid="${r.ROWID}">${r.myBid ? 'Update bid' : 'Submit bid'}</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;

  body.querySelectorAll('[data-bid]').forEach(btn => btn.addEventListener('click', () => openBidModal(cache.rfqs.find(r => r.ROWID === btn.dataset.bid))));
}

function openBidModal(rfq) {
  openModal({
    title: `Bid — ${rfq.RFQNumber}`,
    body: `
      <div class="field"><label>Total bid amount <span class="req">*</span></label>
        <input type="number" id="bid-amount" min="0" step="0.01" value="${rfq.myBid?.TotalBidAmount ?? ''}"></div>
      <div class="field"><label>Notes</label>
        <textarea id="bid-notes" rows="3" placeholder="Delivery timeline, terms, anything the buyer should know…">${esc(rfq.myBid?.ProposalNotes || '')}</textarea></div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${rfq.myBid ? 'Update bid' : 'Submit bid'}</button>`,
    onOpen(mb) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const amt = Number(mb.querySelector('#bid-amount').value || 0);
        if (amt <= 0) return toast('Enter a positive bid amount.', 'error');
        const btn = document.getElementById('m-save'); btn.disabled = true;
        try {
          await api('POST', `/api/vendor-portal/rfqs/${rfq.ROWID}/bid`, { TotalBidAmount: amt, ProposalNotes: mb.querySelector('#bid-notes').value.trim() });
          toast('Bid submitted.'); closeModal(); await loadAll(); drawTab();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

function drawPos(body) {
  if (cache.pos.length === 0) {
    body.innerHTML = `<div class="card"><div class="card-body">${emptyState('📦', 'No purchase orders yet', 'Orders sent to you will appear here.')}</div></div>`;
    return;
  }
  body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data">
    <thead><tr><th>PO</th><th>Date</th><th>Amount</th><th>Status</th><th>Your response</th><th class="num"></th></tr></thead>
    <tbody>${cache.pos.map(p => {
      const [kind, label] = PO_BADGE[p.Status] || ['neutral', p.Status];
      const canDecide = state.prefs.allowPOAcceptReject && !p.VendorDecision;
      return `<tr>
        <td data-label="PO"><span class="cell-strong">${esc(p.PONumber)}</span></td>
        <td data-label="Date">${fmtDate(p.CREATEDTIME)}</td>
        <td data-label="Amount">${currency(p.TotalAmount)}</td>
        <td data-label="Status">${badge(label, kind)}</td>
        <td data-label="Your response">${p.VendorDecision ? badge(p.VendorDecision, p.VendorDecision === 'Accepted' ? 'good' : 'critical') : '<span class="cell-muted">Pending</span>'}</td>
        <td class="num" data-label="Actions">${canDecide ? `
          <button class="btn btn-primary btn-sm" data-decide="${p.ROWID}" data-decision="Accepted">Accept</button>
          <button class="btn btn-danger btn-sm" data-decide="${p.ROWID}" data-decision="Rejected">Reject</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;

  body.querySelectorAll('[data-decide]').forEach(btn => btn.addEventListener('click', () => {
    const decision = btn.dataset.decision;
    if (decision === 'Rejected') return openRejectModal(btn.dataset.decide);
    decidePo(btn.dataset.decide, 'Accepted', '');
  }));
}

function openRejectModal(poId) {
  openModal({
    title: 'Reject this order',
    body: `<div class="field"><label>Reason (optional, shared with your buyer)</label><textarea id="reject-note" rows="3"></textarea></div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-danger" id="m-save">Reject order</button>`,
    onOpen(mb) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        closeModal();
        await decidePo(poId, 'Rejected', mb.querySelector('#reject-note').value.trim());
      });
    }
  });
}

async function decidePo(poId, decision, note) {
  try {
    await api('POST', `/api/vendor-portal/pos/${poId}/decision`, { Decision: decision, Note: note });
    toast(`Order marked ${decision.toLowerCase()}.`);
    await loadAll(); drawTab();
  } catch (err) { toast(err.message, 'error'); }
}

function drawInvoices(body) {
  if (cache.invoices.length === 0) {
    body.innerHTML = `<div class="card"><div class="card-body">${emptyState('🧾', 'No bills yet', 'Bills your buyer records against your orders will appear here.')}</div></div>`;
    return;
  }
  body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data">
    <thead><tr><th>Bill #</th><th>Date</th><th>Amount</th><th>Match status</th></tr></thead>
    <tbody>${cache.invoices.map(i => {
      const [kind, label] = INV_BADGE[i.Status] || ['neutral', i.Status];
      return `<tr>
        <td data-label="Bill #"><span class="cell-strong">${esc(i.InvoiceNumber)}</span></td>
        <td data-label="Date">${fmtDate(i.SupplierInvoiceDate)}</td>
        <td data-label="Amount">${currency(i.Amount)}</td>
        <td data-label="Status">${badge(label, kind)}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;
}

function drawPayments(body) {
  if (cache.payments.length === 0) {
    body.innerHTML = `<div class="card"><div class="card-body">${emptyState('💸', 'No payments yet', 'Payments made against your bills will appear here.')}</div></div>`;
    return;
  }
  body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data">
    <thead><tr><th>Reference</th><th>Date</th><th>Mode</th><th>Amount</th></tr></thead>
    <tbody>${cache.payments.map(p => `<tr>
        <td data-label="Reference"><span class="cell-strong">${esc(p.ReferenceNumber)}</span></td>
        <td data-label="Date">${fmtDate(p.PaymentDate)}</td>
        <td data-label="Mode">${esc(p.PaymentMode)}</td>
        <td data-label="Amount">${currency(p.AmountPaid)}</td>
      </tr>`).join('')}</tbody>
  </table></div></div>`;
}

/* ---------------- Boot ---------------- */
(async function boot() {
  if (initInviteFlow()) return;
  initLoginForm();
  if (state.token) await bootDashboard();
  else showScreen('vp-login');
})();
