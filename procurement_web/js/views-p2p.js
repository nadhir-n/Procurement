// Dashboard + the procure-to-pay chain: PRs → RFQs → POs → GRNs → Invoices → Payments.
import { api, apiUpload, apiDownload, state, currency, fmtDate, refreshCaches, loadReference } from './api.js?v=47';
import { esc, toast, badge, openModal, closeModal, openPage, closePage, renderTable, skeletonTable, listPage, wireListPage, customFieldsHTML, collectCustomFields, customFieldValuesHTML } from './ui.js?v=47';
import { printPR, printPO, printInvoice, printPayment, printVendorCredit,
         showRecord, buildInvoiceDoc, buildPaymentDoc, buildVendorCreditDoc,
         buildGRNDoc, buildRFQDoc } from './documents.js?v=47';
import { setupGuideHTML, wireSetupGuide } from './tour.js?v=47';
import { itemTriggerHTML, wireItemPickers } from './itempicker.js?v=47';
import { openRecord, factsHTML, linesHTML, timelineHTML, emptyHTML, sectionHTML } from './recordview.js?v=47';

/* =========================================================
   ATTACHMENTS — shared panel used inside record detail modals
   ========================================================= */
export async function mountAttachments(container, recordType, recordId) {
  if (!container) return;
  const list = await api('GET', `/api/attachments?recordType=${encodeURIComponent(recordType)}&recordId=${encodeURIComponent(recordId)}`).catch(() => []);
  container.innerHTML = `
    <div class="card-title" style="margin:18px 0 8px;">Attachments <span class="cell-muted">(${list.length}/5 · max 10 MB each)</span></div>
    ${list.length === 0 ? '<div class="cell-muted" style="margin-bottom:8px;">No files attached.</div>' : ''}
    ${list.map(a => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
        <span style="flex:1;">📎 <a href="#" data-att-dl="${a.ROWID}" data-name="${esc(a.FileName)}">${esc(a.FileName)}</a>
          <span class="cell-muted">${Math.max(1, Math.round(Number(a.FileSize || 0) / 1024))} KB · ${esc(a.UploadedBy || '')}</span></span>
        <button class="btn btn-danger btn-sm" data-att-del="${a.ROWID}">Delete</button>
      </div>`).join('')}
    <div style="margin-top:10px;">
      <input type="file" class="att-file-input" style="display:none;">
      <button class="btn btn-outline btn-sm att-add-btn" ${list.length >= 5 ? 'disabled' : ''}>+ Attach file</button>
    </div>`;

  const fileInput = container.querySelector('.att-file-input');
  container.querySelector('.att-add-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast('File exceeds the 10 MB limit.', 'warning');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('recordType', recordType);
    fd.append('recordId', recordId);
    try {
      await apiUpload('/api/attachments', fd);
      toast(`"${file.name}" attached.`);
      mountAttachments(container, recordType, recordId);
    } catch (err) { toast(err.message, 'error'); }
  });
  container.querySelectorAll('[data-att-dl]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    apiDownload(`/api/attachments/${a.dataset.attDl}/download`, a.dataset.name).catch(err => toast(err.message, 'error'));
  }));
  container.querySelectorAll('[data-att-del]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api('DELETE', `/api/attachments/${b.dataset.attDel}`);
      toast('Attachment deleted.');
      mountAttachments(container, recordType, recordId);
    } catch (err) { toast(err.message, 'error'); }
  }));
}

/* Record workspaces for the downstream procure-to-pay modules.  List rows are
   intentionally terse; opening one exposes the related document, financial
   control and audit context without forcing a user into the print preview. */
async function openRFQDetail(rfq, onChanged) {
  const bids = await api('GET', `/api/rfqs/${rfq.ROWID}/bids`).catch(() => []);
  const vendors = Object.fromEntries((state.cache.suppliers || []).map(v => [v.ROWID, v]));
  const lowest = bids.reduce((best, b) => !best || Number(b.TotalBidAmount) < Number(best.TotalBidAmount) ? b : best, null);
  openRecord({
    number: rfq.RFQNumber || `RFQ-${rfq.ROWID}`,
    status: rfq.Status,
    subtitle: 'Request for quotation',
    summary: { label: 'Best bid', value: lowest ? currency(lowest.TotalBidAmount) : 'Awaiting bids' },
    actions: [
      { label: 'Print', onClick: () => showRecord(buildRFQDoc, rfq.ROWID, { subtitle: 'Request for quotation' }) },
      rfq.Status === 'Published' && { label: 'Manage bids', primary: true, onClick: ({ close }) => { close(); openBids(rfq.ROWID, rfq.RFQNumber, rfq.Status, onChanged); } }
    ],
    tabs: [
      { id: 'details', label: 'Details', render: el => {
        el.innerHTML = sectionHTML('Sourcing control', factsHTML([
          ['Bid deadline', rfq.Deadline ? fmtDate(rfq.Deadline) : 'Not set'],
          ['From request', rfq.PRID ? `#${rfq.PRID}` : ''],
          ['Created', fmtDate(rfq.CREATEDTIME)],
          ['Notes', rfq.Notes, { wide: true }]
        ]));
      } },
      { id: 'bids', label: 'Bids', count: bids.length, render: el => {
        el.innerHTML = bids.length ? linesHTML([
          { key: 'VendorID', label: 'Vendor', render: b => esc(vendors[b.VendorID]?.Name || `#${b.VendorID}`) },
          { key: 'TotalBidAmount', label: 'Bid amount', num: true, render: b => currency(b.TotalBidAmount) },
          { key: 'ProposalNotes', label: 'Commercial notes', render: b => esc(b.ProposalNotes || '—') },
          { key: 'Status', label: 'Status', render: b => badge(b.Status) }
        ], bids, [['Lowest submitted bid', lowest ? currency(lowest.TotalBidAmount) : '—', true]])
          : emptyHTML('No bids submitted yet.', 'Use Manage bids to capture supplier responses and award the best fit.');
      } },
      { id: 'files', label: 'Files', render: el => mountAttachments(el, 'RFQ', rfq.ROWID) }
    ]
  });
}

async function openGRNDetail(grnId) {
  const detail = await api('GET', `/api/grns/${grnId}`);
  const grn = detail.grn || detail;
  const lines = detail.items || [];
  const items = Object.fromEntries((state.cache.items || []).map(i => [i.ROWID, i]));
  const users = Object.fromEntries((state.cache.users || []).map(u => [u.ROWID, u]));
  const received = lines.reduce((sum, line) => sum + Number(line.QuantityReceived || 0), 0);
  const rejected = lines.reduce((sum, line) => sum + Number(line.QuantityRejected || 0), 0);
  openRecord({
    number: grn.GRNNumber || `GRN-${grnId}`,
    status: rejected ? 'Discrepancy' : 'Received',
    subtitle: 'Goods receipt',
    summary: { label: 'Units received', value: String(received) },
    actions: [{ label: 'Print', onClick: () => showRecord(buildGRNDoc, grnId, { subtitle: 'Goods receipt' }) }],
    tabs: [
      { id: 'details', label: 'Receipt details', render: el => {
        el.innerHTML = sectionHTML('Receiving control', factsHTML([
          ['Purchase order', grn.POID ? `#${grn.POID}` : ''],
          ['Received on', fmtDate(grn.ReceivedDate)],
          ['Received by', users[grn.ReceivedByID]?.FullName || users[grn.ReceivedByID]?.Email || ''],
          ['Rejected units', String(rejected)]
        ]));
      } },
      { id: 'lines', label: 'Line inspection', count: lines.length, render: el => {
        el.innerHTML = linesHTML([
          { key: 'ItemID', label: 'Item', render: l => esc(items[l.ItemID]?.Name || `#${l.ItemID}`) },
          { key: 'QuantityReceived', label: 'Received', num: true },
          { key: 'QuantityAccepted', label: 'Accepted', num: true },
          { key: 'QuantityRejected', label: 'Rejected', num: true }
        ], lines, [['Total received', String(received), true]]);
      } },
      { id: 'files', label: 'Files', render: el => mountAttachments(el, 'GRN', grnId) }
    ]
  });
}

async function openInvoiceDetail(invoice, onChanged) {
  const [poDetail, payments] = await Promise.all([
    invoice.POID ? api('GET', `/api/pos/${invoice.POID}`).catch(() => null) : Promise.resolve(null),
    api('GET', '/api/payments').catch(() => [])
  ]);
  const po = poDetail?.po || poDetail;
  const vendor = (state.cache.suppliers || []).find(v => String(v.ROWID) === String(po?.SupplierID));
  const billPayments = payments.filter(p => String(p.InvoiceID) === String(invoice.ROWID));
  const paid = billPayments.reduce((sum, p) => sum + Number(p.AmountPaid || 0), 0);
  const remaining = Math.max(0, Number(invoice.Amount || 0) - paid);
  openRecord({
    number: invoice.InvoiceNumber || `BILL-${invoice.ROWID}`,
    status: invoice.Status,
    subtitle: 'Vendor bill',
    summary: { label: 'Balance due', value: currency(remaining) },
    actions: [
      { label: 'Print', onClick: () => showRecord(buildInvoiceDoc, { ...invoice, _vendorId: po?.SupplierID }, { subtitle: 'Vendor bill' }) },
      invoice.Status !== 'Paid' && { label: 'Re-match', onClick: async ({ reload }) => {
        try { await api('POST', `/api/invoices/${invoice.ROWID}/rematch`); toast('3-way match refreshed.'); await onChanged?.(); reload(); }
        catch (err) { toast(err.message, 'error'); }
      } }
    ],
    tabs: [
      { id: 'details', label: 'Bill details', render: el => {
        el.innerHTML = sectionHTML('Matching control', factsHTML([
          ['Vendor', vendor?.Name || ''],
          ['Purchase order', po?.PONumber || (invoice.POID ? `#${invoice.POID}` : '')],
          ['Supplier invoice date', fmtDate(invoice.SupplierInvoiceDate)],
          ['Match result', invoice.MatchScore || 'Not matched'],
          ['Bill total', currency(invoice.Amount)],
          ['Paid to date', currency(paid)],
          ['Balance due', currency(remaining)]
        ]));
      } },
      { id: 'payments', label: 'Payments', count: billPayments.length, render: el => {
        el.innerHTML = billPayments.length ? linesHTML([
          { key: 'ReferenceNumber', label: 'Payment reference' },
          { key: 'PaymentDate', label: 'Date', render: p => fmtDate(p.PaymentDate) },
          { key: 'PaymentMode', label: 'Method' },
          { key: 'AmountPaid', label: 'Paid', num: true, render: p => currency(p.AmountPaid) }
        ], billPayments, [['Remaining balance', currency(remaining), true]]) : emptyHTML('No payment applied.', 'Record payment from the Bills list when this invoice is ready to settle.');
      } },
      { id: 'files', label: 'Files', render: el => mountAttachments(el, 'Invoice', invoice.ROWID) }
    ]
  });
}

function openPaymentDetail(payment) {
  openRecord({
    number: payment.ReferenceNumber || `PAY-${payment.ROWID}`,
    status: 'Paid', subtitle: 'Payment made', summary: { label: 'Amount paid', value: currency(payment.AmountPaid) },
    actions: [{ label: 'Print', onClick: () => showRecord(buildPaymentDoc, payment, { subtitle: 'Payment made' }) }],
    tabs: [
      { id: 'details', label: 'Payment details', render: el => { el.innerHTML = sectionHTML('Settlement control', factsHTML([
        ['Invoice', payment.InvoiceID ? `#${payment.InvoiceID}` : ''], ['Payment date', fmtDate(payment.PaymentDate)],
        ['Payment method', payment.PaymentMode], ['Reference', payment.ReferenceNumber], ['Amount', currency(payment.AmountPaid)]
      ])); } },
      { id: 'files', label: 'Files', render: el => mountAttachments(el, 'Payment', payment.ROWID) }
    ]
  });
}

/* =========================================================
   HOME — Zoho-style: hero, My Home / Dashboard tabs,
   Spend Summary, Attention Required, activity cards.
   ========================================================= */
export async function viewDashboard(root) {
  const first = (state.currentUser?.FullName || state.authName || 'there').split(' ')[0];
  root.innerHTML = `
    <div class="home-hero">
      <div>
        <div class="home-hello">Hello, ${esc(first)}</div>
        <div class="home-org">${esc(state.org?.Name || 'Your workspace')}</div>
      </div>
      <div><button class="btn btn-primary" id="dash-new-pr">+ New Purchase Request</button></div>
    </div>
    ${setupGuideHTML()}
    <div class="home-tabs">
      <button class="home-tab active" data-htab="home">My Home</button>
      <button class="home-tab" data-htab="dash">Dashboard</button>
    </div>
    <div id="home-zone"></div>`;

  wireSetupGuide();
  document.getElementById('dash-new-pr').addEventListener('click', () => { window.location.hash = '#/requisitions?new=1'; });
  const zone = document.getElementById('home-zone');
  root.querySelectorAll('.home-tab').forEach(t => t.addEventListener('click', () => {
    root.querySelectorAll('.home-tab').forEach(x => x.classList.toggle('active', x === t));
    t.dataset.htab === 'home' ? renderMyHome(zone) : renderConfigDashboard(zone);
  }));
  await renderMyHome(zone);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function rangeBounds(kind) {
  const now = new Date();
  const fyName = state.orgSettings.fiscalYearStart || 'January';
  const fyMonth = Math.max(0, MONTHS.findIndex(m => fyName.startsWith(m)));
  if (kind === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), now];
  if (kind === 'quarter') { const q = Math.floor(now.getMonth() / 3) * 3; return [new Date(now.getFullYear(), q, 1), now]; }
  // fiscal "This Year"
  const start = new Date(now.getFullYear() - (now.getMonth() < fyMonth ? 1 : 0), fyMonth, 1);
  return [start, new Date(start.getFullYear() + 1, start.getMonth(), 0)];
}

async function renderMyHome(zone) {
  zone.innerHTML = skeletonTable(4, 4);
  const [prs, pos, invoices, budgets] = await Promise.all([
    api('GET', '/api/prs').catch(() => []),
    api('GET', '/api/pos').catch(() => []),
    api('GET', '/api/invoices').catch(() => []),
    api('GET', '/api/budgets').catch(() => [])
  ]);

  const draw = (rangeKind) => {
    const [start, end] = rangeBounds(rangeKind);
    const inRange = r => { const d = new Date(r.CREATEDTIME); return d >= start && d <= end; };

    // Spend: PO spend = issued orders; non-PO = bills recorded without a PO.
    const poSpendRows = pos.filter(p => ['Sent_To_Supplier', 'Fulfilled'].includes(p.Status) && inRange(p));
    const nonPoRows = invoices.filter(i => !i.POID && inRange(i));
    const poSpend = poSpendRows.reduce((a, p) => a + Number(p.TotalAmount || 0), 0);
    const nonPoSpend = nonPoRows.reduce((a, i) => a + Number(i.Amount || 0), 0);

    // Monthly buckets across the range
    const months = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end && months.length < 12) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    const bucket = (rows, amtKey) => months.map(m => rows
      .filter(r => { const d = new Date(r.CREATEDTIME); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); })
      .reduce((a, r) => a + Number(r[amtKey] || 0), 0));
    const poByMonth = bucket(poSpendRows, 'TotalAmount');
    const nonPoByMonth = bucket(nonPoRows, 'Amount');
    const maxBar = Math.max(...poByMonth, ...nonPoByMonth, 1);
    const hasData = poSpend + nonPoSpend > 0;

    // Attention required
    const pendingApprovals = prs.filter(p => p.Status === 'Pending_Approval').length;
    const discrepancies = invoices.filter(i => ['Discrepancy', 'Unmatched'].includes(i.Status)).length;
    const awaitingReceipt = pos.filter(p => p.Status === 'Sent_To_Supplier').length;
    // Reminder thresholds (Settings → Reminders & Alerts)
    const rem = state.orgSettings.reminders || {};
    const warnPct = Number(rem.budgetWarnPct || 80);
    const budgetsNearLimit = budgets.filter(b => Number(b.Amount) > 0 &&
      ((Number(b.Committed || 0) + Number(b.Spent || 0)) / Number(b.Amount)) * 100 >= warnPct).length;
    const reviewBills = rem.reviewBills === false ? 0 : invoices.filter(i => i.Status === 'Review').length;
    const attn = [
      pendingApprovals && { icon: '🕒', label: 'Purchase requests awaiting approval', n: pendingApprovals, href: '#/approvals' },
      discrepancies && { icon: '⚠️', label: 'Bills with match issues', n: discrepancies, href: '#/invoices' },
      reviewBills && { icon: '🔎', label: 'Bills flagged for review', n: reviewBills, href: '#/invoices' },
      budgetsNearLimit && { icon: '💰', label: `Budgets past ${warnPct}% utilization`, n: budgetsNearLimit, href: '#/budgets' },
      awaitingReceipt && { icon: '🚚', label: 'Orders awaiting receipt', n: awaitingReceipt, href: '#/purchase-orders' }
    ].filter(Boolean);

    zone.innerHTML = `
      <div class="home-range">Date Range:
        <select id="home-range-sel">
          <option value="year" ${rangeKind === 'year' ? 'selected' : ''}>This Year</option>
          <option value="quarter" ${rangeKind === 'quarter' ? 'selected' : ''}>This Quarter</option>
          <option value="month" ${rangeKind === 'month' ? 'selected' : ''}>This Month</option>
        </select>
      </div>
      <div class="home-grid">
        <div class="card"><div class="card-header"><div class="card-title">Spend Summary</div></div>
          <div class="card-body">
            <div class="spend-figures">
              <div class="spend-fig"><div class="lbl">Total Spend</div><div class="val">${currency(poSpend + nonPoSpend)}</div></div>
              <div class="spend-fig"><div class="lbl"><span class="dot" style="background:var(--primary);"></span>PO Spend</div><div class="val">${currency(poSpend)}</div></div>
              <div class="spend-fig"><div class="lbl"><span class="dot" style="background:#f0b429;"></span>Non-PO Spend</div><div class="val">${currency(nonPoSpend)}</div></div>
            </div>
            ${hasData ? `<div class="spend-chart">${months.map((m, i) => `
              <div class="spend-col">
                <div class="bars">
                  <div class="bar po" style="height:${Math.round((poByMonth[i] / maxBar) * 100)}%" title="PO: ${currency(poByMonth[i])}"></div>
                  <div class="bar nonpo" style="height:${Math.round((nonPoByMonth[i] / maxBar) * 100)}%" title="Non-PO: ${currency(nonPoByMonth[i])}"></div>
                </div>
                <div class="mon">${MONTHS[m.getMonth()]}<br>${m.getFullYear()}</div>
              </div>`).join('')}</div>`
            : `<div class="spend-empty">No data to display</div>`}
          </div>
        </div>
        <div class="card"><div class="card-header"><div class="card-title">Attention Required</div></div>
          <div class="card-body">
            ${attn.length ? `<div class="attn-list">${attn.map(a =>
              `<a class="attn-item" href="${a.href}"><span>${a.icon}</span><span>${esc(a.label)}</span><span class="n">${a.n}</span></a>`).join('')}</div>`
            : `<div class="attn-none">ⓘ No Attention Required.</div>`}
          </div>
        </div>
      </div>
      <div class="home-cards">
        <div class="home-card"><div class="ic">📦</div><div><div class="lbl">Orders Issued</div><div class="val">${pos.filter(inRange).length}</div></div></div>
        <div class="home-card"><div class="ic">🧾</div><div><div class="lbl">Bills Processed</div><div class="val">${invoices.filter(inRange).length}</div></div></div>
        <div class="home-card"><div class="ic">🏷️</div><div><div class="lbl">New Items</div><div class="val">${state.cache.items.filter(inRange).length}</div></div></div>
        <div class="home-card"><div class="ic">🤝</div><div><div class="lbl">New Vendors</div><div class="val">${state.cache.suppliers.filter(inRange).length}</div></div></div>
      </div>`;

    zone.querySelector('#home-range-sel').addEventListener('change', e => draw(e.target.value));
  };
  draw('year');
}

/* The configurable widget dashboard (role-scoped) lives on the second tab. */
async function renderConfigDashboard(root) {
  // The dashboard config for this user's role (or the org default) decides which widgets show.
  const config = await api('GET', '/api/dashboards/mine').catch(() => null);
  const widgets = config?.widgets?.length ? config.widgets : [
    { type: 'stat', metric: 'committed_spend' }, { type: 'stat', metric: 'pending_spend' },
    { type: 'stat', metric: 'capex_spend' }, { type: 'stat', metric: 'opex_spend' },
    { type: 'list', source: 'recent_prs' }, { type: 'list', source: 'recent_pos' }, { type: 'aging' }
  ];
  const has = (pred) => widgets.some(pred);
  const statWidgets = widgets.filter(w => w.type === 'stat');

  root.innerHTML = `
    ${config?.Name ? `<div class="cell-muted" style="margin-bottom:12px;">Dashboard: <strong>${esc(config.Name)}</strong></div>` : ''}
    <div class="stat-grid" id="stat-grid">
      ${statWidgets.map(() => `<div class="stat-tile"><div class="stat-label">…</div><div class="stat-value"><div class="skeleton-cell" style="width:80px;height:24px;"></div></div></div>`).join('')}
    </div>
    <div class="dash-grid">
      ${has(w => w.source === 'recent_prs') ? `<div class="card">
        <div class="card-header"><div class="card-title">Recent requisitions</div><a href="#/requisitions" style="font-size:12.5px;">View all</a></div>
        <div class="card-body flush" id="dash-prs">${skeletonTable(3, 4)}</div>
      </div>` : ''}
      ${has(w => w.source === 'recent_pos') ? `<div class="card">
        <div class="card-header"><div class="card-title">Recent purchase orders</div><a href="#/purchase-orders" style="font-size:12.5px;">View all</a></div>
        <div class="card-body flush" id="dash-pos">${skeletonTable(3, 4)}</div>
      </div>` : ''}
      ${has(w => w.type === 'aging') ? `<div class="card span-2">
        <div class="card-header"><div class="card-title">Payables aging (unpaid invoices)</div></div>
        <div class="card-body" id="dash-aging">${skeletonTable(2, 3)}</div>
      </div>` : ''}
    </div>
    ${state.orgSettings.multiProperty ? `
    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <div class="card-title">Group position by property</div>
        <span class="cell-muted" style="font-size:12px;">Budget against actual, and where approvals are sitting</span>
      </div>
      <div class="card-body flush" id="dash-matrix">${skeletonTable(4, 6)}</div>
    </div>` : ''}`;

  const needExpense = statWidgets.some(w => w.metric === 'capex_spend' || w.metric === 'opex_spend');
  const [summary, prs, pos, payables, expense] = await Promise.all([
    api('GET', '/api/analytics/summary').catch(() => ({})),
    api('GET', '/api/prs').catch(() => []),
    api('GET', '/api/pos').catch(() => []),
    has(w => w.type === 'aging') ? api('GET', '/api/analytics/payables').catch(() => null) : Promise.resolve(null),
    needExpense ? api('GET', '/api/analytics/expense-split').catch(() => ({})) : Promise.resolve({})
  ]);

  const metricDefs = {
    committed_spend: ['Committed spend', currency(summary.totalSpendApproved), 'POs sent or fulfilled'],
    pending_spend: ['Pending spend', currency(summary.totalSpendPending), 'awaiting approval'],
    capex_spend: ['Capital (CapEx)', currency(expense.capex), 'committed capital spend'],
    opex_spend: ['Operational (OpEx)', currency(expense.opex), 'committed operating spend'],
    pr_count: ['Requisitions', summary.prCount ?? prs.length, 'all time'],
    po_count: ['Purchase orders', summary.poCount ?? pos.length, 'all time'],
    invoice_count: ['Invoices', summary.invoiceCount ?? 0, 'received']
  };
  document.getElementById('stat-grid').innerHTML = statWidgets.map(w => {
    const [label, value, hint] = metricDefs[w.metric] || [w.metric, '—', ''];
    return `<div class="stat-tile">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${esc(String(value))}</div>
      <div class="stat-hint">${esc(hint)}</div>
    </div>`;
  }).join('');

  const dashPrs = document.getElementById('dash-prs');
  if (dashPrs) dashPrs.innerHTML = renderTable({
    columns: [
      { key: 'PRNumber', label: 'PR #', render: r => `<span class="cell-strong">${esc(r.PRNumber)}</span>` },
      { key: 'TotalAmount', label: 'Amount', num: true, render: r => currency(r.TotalAmount) },
      { key: 'Status', label: 'Status', render: r => badge(r.Status) }
    ],
    rows: prs.slice(0, 5),
    empty: { icon: '📝', title: 'No requisitions yet', sub: 'Create your first purchase requisition to get the chain moving.' }
  });

  const dashPos = document.getElementById('dash-pos');
  if (dashPos) dashPos.innerHTML = renderTable({
    columns: [
      { key: 'PONumber', label: 'PO #', render: r => `<span class="cell-strong">${esc(r.PONumber)}</span>` },
      { key: 'TotalAmount', label: 'Amount', num: true, render: r => currency(r.TotalAmount) },
      { key: 'Status', label: 'Status', render: r => badge(r.Status) }
    ],
    rows: pos.slice(0, 5),
    empty: { icon: '📦', title: 'No purchase orders yet', sub: 'Approve a requisition, then convert it into a PO.' }
  });

  // Aging: single-hue bars, direct-labeled values.
  const agingEl = document.getElementById('dash-aging');
  if (agingEl && payables && payables.aging) {
    const entries = [
      ['Current', payables.aging.Current || 0],
      ['1–15 days', payables.aging['1_15'] || 0],
      ['16–30 days', payables.aging['16_30'] || 0],
      ['31+ days', payables.aging['31_plus'] || 0]
    ];
    const max = Math.max(...entries.map(e => e[1]), 1);
    agingEl.innerHTML = entries.map(([label, val]) => `
      <div class="aging-row">
        <div class="aging-label">${esc(label)}</div>
        <div class="aging-track"><div class="aging-fill" style="width:${Math.round((val / max) * 100)}%"></div></div>
        <div class="aging-value">${currency(val)}</div>
      </div>`).join('');
  } else if (agingEl) {
    agingEl.innerHTML = `<div class="empty" style="padding:24px;"><div class="title">No unpaid invoices</div><div class="sub">Aging buckets appear once invoices are recorded.</div></div>`;
  }

  const matrixEl = document.getElementById('dash-matrix');
  if (matrixEl) renderGroupMatrix(matrixEl);
}

/**
 * The group position table: every property split by expenditure category, with
 * budget against actual and the approvals still outstanding.
 *
 * Rows are grouped by cluster and the property name is printed once per block,
 * so the eye tracks a property's four expenditure lines as one unit instead of
 * re-reading the same name four times.
 */
async function renderGroupMatrix(el) {
  const data = await api('GET', '/api/analytics/group-matrix').catch(() => null);
  if (!data || !data.rows?.length) {
    el.innerHTML = `<div class="empty" style="padding:24px;">
      <div class="title">No properties yet</div>
      <div class="sub">Add properties in Settings, then this shows each one's position against budget.</div>
    </div>`;
    return;
  }

  // Cluster → property → its expenditure rows, preserving server order.
  const byCluster = new Map();
  for (const r of data.rows) {
    if (!byCluster.has(r.cluster)) byCluster.set(r.cluster, new Map());
    const props = byCluster.get(r.cluster);
    if (!props.has(r.property)) props.set(r.property, []);
    props.get(r.property).push(r);
  }

  // A property with no requisitions and no budget is noise on a 15-property
  // group. Keep it available, but collapsed behind a toggle.
  const isQuiet = rows => rows.every(r => !r.totalPRsYTD && !r.budget && !r.actual);

  const cell = n => n ? `<b>${esc(String(n))}</b>` : `<span class="cell-muted">0</span>`;
  const rowHTML = (r, first, span) => `
    <tr${isQuiet([r]) ? ' class="gm-quiet"' : ''}>
      ${first ? `<td rowspan="${span}" class="gm-prop">
        <span class="gm-prop-name">${esc(r.property)}</span>
        <span class="gm-prop-cluster">${esc(r.cluster)}</span>
      </td>` : ''}
      <td>${esc(r.expenditureCategory)}</td>
      <td class="num">${cell(r.totalPRsYTD)}</td>
      <td class="num">${cell(r.totalPRsMonth)}</td>
      <td class="num">${cell(r.pendingFinance)}</td>
      <td class="num">${cell(r.pendingGM)}</td>
      <td class="num">${cell(r.pendingPCM)}</td>
      <td class="num">${r.budget ? currency(r.budget) : '<span class="cell-muted">—</span>'}</td>
      <td class="num">${r.actual ? currency(r.actual) : '<span class="cell-muted">—</span>'}</td>
      <td class="num ${r.budget && r.save < 0 ? 'gm-over' : ''}">${
        r.budget ? `${currency(r.save)} <small>${r.savePct}%</small>` : '<span class="cell-muted">—</span>'}</td>
    </tr>`;

  let bodyRows = '';
  let quietCount = 0;
  for (const [cluster, props] of byCluster) {
    bodyRows += `<tr class="gm-cluster"><td colspan="10">${esc(cluster)}</td></tr>`;
    for (const [, rows] of props) {
      if (isQuiet(rows)) quietCount++;
      rows.forEach((r, i) => { bodyRows += rowHTML(r, i === 0, rows.length); });
    }
  }

  const t = data.totals;
  el.innerHTML = `
    <div class="rv-table-wrap">
      <table class="rv-table gm-table">
        <thead>
          <tr>
            <th>Property</th><th>Expenditure</th>
            <th class="num">PRs YTD</th><th class="num">PRs MTD</th>
            <th class="num">Finance</th><th class="num">GM</th><th class="num">Committee</th>
            <th class="num">Budget</th><th class="num">Actual</th><th class="num">Variance</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          <tr class="is-total">
            <td colspan="2">Group total</td>
            <td class="num">${esc(String(t.totalPRsYTD))}</td>
            <td class="num">${esc(String(t.totalPRsMonth))}</td>
            <td class="num">${esc(String(t.pendingFinance))}</td>
            <td class="num">${esc(String(t.pendingGM))}</td>
            <td class="num">${esc(String(t.pendingPCM))}</td>
            <td class="num">${currency(t.budget)}</td>
            <td class="num">${currency(t.actual)}</td>
            <td class="num ${t.budget && t.save < 0 ? 'gm-over' : ''}">${currency(t.save)} <small>${t.savePct}%</small></td>
          </tr>
        </tfoot>
      </table>
    </div>
    ${quietCount ? `<div class="gm-foot">
      <button type="button" class="btn btn-outline btn-sm" id="gm-toggle">Show ${quietCount} propert${quietCount === 1 ? 'y' : 'ies'} with no activity</button>
    </div>` : ''}`;

  const toggle = el.querySelector('#gm-toggle');
  if (toggle) {
    let shown = false;
    toggle.addEventListener('click', () => {
      shown = !shown;
      el.querySelector('.gm-table').classList.toggle('gm-show-quiet', shown);
      toggle.textContent = shown
        ? `Hide ${quietCount} propert${quietCount === 1 ? 'y' : 'ies'} with no activity`
        : `Show ${quietCount} propert${quietCount === 1 ? 'y' : 'ies'} with no activity`;
    });
  }
}

/* =========================================================
   PURCHASE REQUISITIONS
   ========================================================= */
export async function viewPRs(root, params) {
  root.innerHTML = listPage({
    title: 'Purchase Requests',
    desc: 'Raise, approve and convert internal purchase requisitions.',
    actionsHtml: `<button class="btn btn-primary" id="btn-new-pr">+ New requisition</button>`
  });

  let rows = [];
  const usersById = () => Object.fromEntries(state.cache.users.map(u => [u.ROWID, u]));

  const load = async () => { rows = await api('GET', '/api/prs').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'PRNumber', label: 'PR #', render: r => `<span class="cell-strong">${esc(r.PRNumber)}</span>` },
        { key: 'RequestorID', label: 'Requestor', render: r => esc(usersById()[r.RequestorID]?.FullName || '—') },
        { key: 'Department', label: 'Department' },
        { key: 'TotalAmount', label: 'Amount', num: true, render: r => currency(r.TotalAmount) },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: filtered,
      empty: { icon: '📝', title: 'No requisitions yet', sub: 'Requisitions are the first step of the procure-to-pay chain.' },
      rowActions: r => {
        let html = `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>`;
        if (r.Status === 'Pending_Approval') {
          html += `<button class="btn btn-outline btn-sm" data-action="approve" data-id="${r.ROWID}">Approve</button>`;
          html += `<button class="btn btn-danger btn-sm" data-action="reject" data-id="${r.ROWID}">Reject</button>`;
          if (String(r.RequestorID) === String(state.currentUser.ROWID)) html += `<button class="btn btn-ghost btn-sm" data-action="recall" data-id="${r.ROWID}">Recall</button>`;
        }
        if (['Rejected', 'Draft'].includes(r.Status)) html += `<button class="btn btn-outline btn-sm" data-action="resubmit" data-id="${r.ROWID}">Resubmit</button>`;
        if (r.Status === 'Approved') {
          html += `<button class="btn btn-outline btn-sm" data-action="to-rfq" data-id="${r.ROWID}">→ RFQ</button>`;
          html += `<button class="btn btn-primary btn-sm" data-action="to-po" data-id="${r.ROWID}">→ PO</button>`;
        }
        return html;
      }
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['PRNumber', 'Department', 'Status', 'Justification'] });

  document.getElementById('list-body').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'view') return openPRDetail(id);
    if (action === 'approve') {
      btn.disabled = true;
      try {
        const r = await api('POST', `/api/prs/${id}/approve`);
        toast(r.message || 'Requisition approved.');
        await load(); apply();
      } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
    if (action === 'reject') return openRejectPR(id, async () => { await load(); apply(); });
    if (action === 'recall') {
      btn.disabled = true;
      try { await api('POST', `/api/prs/${id}/recall`); toast('Requisition recalled to draft.'); await load(); apply(); }
      catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
    if (action === 'resubmit') {
      btn.disabled = true;
      try { const r = await api('POST', `/api/prs/${id}/resubmit`); toast(r.message || 'Resubmitted.'); await load(); apply(); }
      catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
    if (action === 'to-po') return openConvertToPO(id, async () => { await load(); apply(); });
    if (action === 'to-rfq') return openConvertToRFQ(id, async () => { await load(); apply(); });
  });

  document.getElementById('btn-new-pr').addEventListener('click', () => openNewPR(async () => { await load(); apply(); }));

  await load(); apply();
  if (params?.get('new') === '1') openNewPR(async () => { await load(); apply(); });
}

// Shared: turn ApprovalHistory rows into timeline events.
const APPROVAL_TONE = {
  approved: 'good', rejected: 'bad', recalled: 'warn', resubmitted: 'neutral', submitted: 'neutral'
};
async function approvalEvents(type, id) {
  const history = await api('GET', `/api/approval-history/${type}/${id}`).catch(() => []);
  return history.map(h => ({
    title: String(h.Action || 'updated').replace(/^./, c => c.toUpperCase()),
    who: h.ActorEmail || 'system',
    when: fmtDate(h.CREATEDTIME),
    note: h.Reason || '',
    tone: APPROVAL_TONE[h.Action] || 'neutral'
  }));
}

/**
 * The approval ladder as a numbered route, with the current rung marked and
 * the person who holds each role named. An empty seat is called out rather
 * than left blank — a rung with nobody in it stalls the requisition, and that
 * is an administrator's problem to fix, not a mystery to debug.
 */
function approvalRouteHTML(route) {
  if (!route || !route.stages?.length) return emptyHTML('No approval route on this requisition.');
  const STATE_LABEL = { done: 'Approved', current: 'Awaiting', pending: 'Not yet reached', rejected: 'Halted' };
  return `
    ${route.description ? `<p class="rv-note">${esc(route.description)}</p>` : ''}
    <ol class="wf-route">
      ${route.stages.map(s => `
        <li class="wf-stage is-${esc(s.state)}">
          <span class="wf-seq">${esc(String(s.seq))}</span>
          <div class="wf-body">
            <div class="wf-role">${esc(s.role)}</div>
            <div class="wf-holder">${s.holder
              ? esc(s.holder)
              : `<span class="wf-vacant">No one is mapped to this role</span>`}</div>
          </div>
          <span class="wf-state">${esc(STATE_LABEL[s.state] || s.state)}</span>
        </li>`).join('')}
    </ol>`;
}

async function openPRDetail(prId, onChanged) {
  const detail = await api('GET', `/api/prs/${prId}`);
  const pr = detail.pr || detail;
  const lines = detail.items || [];
  const itemsById = Object.fromEntries((state.cache.items || []).map(i => [i.ROWID, i]));
  const propsById = Object.fromEntries((state.cache.properties || []).map(p => [p.ROWID, p]));
  const usersById = Object.fromEntries((state.cache.users || []).map(u => [u.ROWID, u]));
  // PRs carry RequestorID, not an email. Showing a raw row id would be useless.
  const requestor = usersById[pr.RequestorID];

  const lineTotal = (l) => {
    const gross = Number(l.Quantity || 0) * Number(l.EstimatedPrice || 0);
    const net = gross - gross * (Number(l.DiscountPct || 0) / 100);
    return net + net * (Number(l.TaxPct || 0) / 100);
  };
  const subtotal = lines.reduce((a, l) => a + Number(l.Quantity || 0) * Number(l.EstimatedPrice || 0), 0);
  const total = lines.reduce((a, l) => a + lineTotal(l), 0);

  openRecord({
    number: pr.PRNumber || `PR-${prId}`,
    status: pr.Status,
    subtitle: 'Purchase request',
    summary: { label: 'Total', value: currency(pr.TotalAmount || total) },
    actions: [
      { label: 'Print', onClick: () => printPR(prId) }
    ],
    tabs: [
      {
        id: 'details', label: 'Details',
        render: (el) => {
          const prop = propsById[pr.PropertyID];
          el.innerHTML =
            sectionHTML('Request', factsHTML([
              ['Requested by', requestor ? (requestor.FullName || requestor.Email) : ''],
              ['Department', pr.Department],
              ['Property', prop ? `${prop.Name}${prop.Location ? ` · ${prop.Location}` : ''}` : ''],
              ['Category', pr.Category],
              ['Expected date', pr.ExpectedDate ? fmtDate(pr.ExpectedDate) : ''],
              ['Reference', pr.ReferenceNo],
              ['Raised', fmtDate(pr.CREATEDTIME)]
            ])) +
            sectionHTML('Delivery & notes', factsHTML([
              ['Deliver to', pr.DeliveryAddress, { wide: true }],
              ['Reason', pr.Justification, { wide: true }],
              ['Notes to approver', pr.Notes, { wide: true }]
            ])) +
            sectionHTML('Custom fields', customFieldValuesHTML(pr.CustomFieldsJson)
              ? `<div class="form-grid">${customFieldValuesHTML(pr.CustomFieldsJson)}</div>` : '');
        }
      },
      {
        id: 'lines', label: 'Line items', count: lines.length,
        render: (el) => {
          el.innerHTML = linesHTML(
            [
              { key: 'ItemID', label: 'Item', render: l => {
                  const it = itemsById[l.ItemID];
                  if (!it) return esc(`#${l.ItemID}`);
                  return `<b>${esc(it.Name)}</b>${it.SKU ? `<div class="cell-muted">${esc(it.SKU)}</div>` : ''}` +
                         (it.Description ? `<div class="cell-muted">${esc(it.Description)}</div>` : '');
                } },
              { key: 'Category', label: 'Category', render: l => esc(l.Category || itemsById[l.ItemID]?.Category || '—') },
              { key: 'ExpenseType', label: 'Expense', render: l => badge(l.ExpenseType || 'OpEx') },
              { key: 'Quantity', label: 'Qty', num: true, render: l => {
                  const unit = itemsById[l.ItemID]?.Unit;
                  return `${esc(String(l.Quantity))}${unit ? ` <span class="cell-muted">${esc(unit)}</span>` : ''}`;
                } },
              { key: 'EstimatedPrice', label: 'Rate', num: true, render: l => currency(l.EstimatedPrice) },
              { key: 'DiscountPct', label: 'Disc %', num: true, render: l => `${Number(l.DiscountPct || 0)}%` },
              { key: 'TaxPct', label: 'Tax %', num: true, render: l => `${Number(l.TaxPct || 0)}%` },
              { key: '_sub', label: 'Amount', num: true, render: l => currency(lineTotal(l)) }
            ],
            lines,
            [
              ['Subtotal', currency(subtotal)],
              ['Discount', currency(pr.DiscountTotal || 0)],
              ['Tax', currency(pr.TaxTotal || 0)],
              ['Total', currency(pr.TotalAmount || total), true]
            ]
          );
        }
      },
      {
        id: 'approvals', label: 'Approvals',
        render: async (el) => {
          // Two things belong here and they answer different questions: the
          // route shows where this requisition is going, the trail shows what
          // has actually happened to it.
          const [route, events] = await Promise.all([
            api('GET', `/api/prs/${prId}/workflow`).catch(() => null),
            approvalEvents('PR', prId)
          ]);
          el.innerHTML =
            (route ? sectionHTML(`Approval route — ${route.label}`, approvalRouteHTML(route)) : '') +
            sectionHTML('History', timelineHTML(events));
        }
      },
      {
        id: 'files', label: 'Files',
        render: (el) => { mountAttachments(el, 'PR', prId); }
      }
    ]
  });
}


async function openNewPR(onDone) {
  if (state.cache.items.length === 0) {
    toast('Add at least one catalog item first (Items module).', 'warning');
    window.location.hash = '#/items';
    return;
  }
  const cfFields = await api('GET', '/api/custom-fields?module=prs').catch(() => []);
  // Classification, expenditure classes, budget classes and the approval routes.
  // Cached on `state` so re-opening the form does not re-fetch it.
  const ref = await loadReference();
  // Category → default expense type, from the org's industry pack.
  const catExpense = {};
  (state.orgSettings.categories || []).forEach(c => { catExpense[c.name] = c.expense; });

  // Default tax rate from Settings → Taxes (pre-fills each new line; editable).
  const defaultTax = Number(((state.orgSettings.taxes || []).find(t => t.isDefault) || {}).rate || 0);

  const lineRow = () => `
    <tr>
      <td style="width:30%;">${itemTriggerHTML()}</td>
      <td style="width:9%;"><input type="number" class="l-qty" value="1" min="1"></td>
      <td style="width:14%;"><input type="number" class="l-price" step="0.01" min="0"></td>
      <td style="width:9%;"><input type="number" class="l-disc" value="0" min="0" max="100" title="Discount %"></td>
      <td style="width:9%;"><input type="number" class="l-tax" value="${defaultTax}" min="0" title="Tax %"></td>
      <td style="width:11%;"><select class="l-expense" title="Expense type">
        <option value="OpEx">OpEx</option><option value="CapEx">CapEx</option></select></td>
      <td style="width:13%;" class="num l-sub">—</td>
      <td><button type="button" class="line-remove" title="Remove">×</button></td>
    </tr>`;

  openPage({
    title: '🔒 New Purchase Request',
    body: `
      <div class="form-narrow">
        <div class="zrow">
          <label class="req-label">Expected Date <span class="req">*</span></label>
          <div><input type="date" id="pr-expected"></div>
        </div>
        ${state.orgSettings.multiProperty && state.cache.properties.length ? `
        <div class="zrow">
          <label>Property</label>
          <div>
            <select id="pr-property"><option value="">— Select property —</option>
              ${state.cache.properties.map(p => `<option value="${p.ROWID}">${esc(p.Name)}${p.Location ? ` · ${esc(p.Location)}` : ''}</option>`).join('')}</select>
            <div class="help">Which property is this requisition for? Budgets and reporting are tracked per property.</div>
          </div>
        </div>` : ''}
        <div class="zrow">
          <label>Department</label>
          <div>
            ${(state.orgSettings.departments || []).length > 0
              ? `<select id="pr-dept"><option value="">— Select department —</option>
                   ${state.orgSettings.departments.map(d => `<option>${esc(d)}</option>`).join('')}</select>`
              : `<input type="text" id="pr-dept" placeholder="e.g. Housekeeping &amp; Rooms">`}
            <div class="help">If a budget exists for this department, the total is checked against it.</div>
          </div>
        </div>
        <div class="zrow">
          <label class="req-label">Expenditure Category <span class="req">*</span></label>
          <div>
            <select id="pr-expcat">
              ${(ref.expenditureCategories || []).map(c => `<option>${esc(c)}</option>`).join('')}
            </select>
            <div class="help">Capital spend, running costs, a repair, or an annual maintenance contract. Reporting is grouped by this.</div>
          </div>
        </div>
        <div class="zrow">
          <label class="req-label">Budget Status <span class="req">*</span></label>
          <div>
            <select id="pr-budgetclass">
              ${(ref.budgetClasses || []).map(b => `<option value="${esc(b.key)}">${esc(b.label)}</option>`).join('')}
            </select>
            <div class="help" id="pr-route-help">This decides who has to approve the requisition.</div>
          </div>
        </div>
        <div class="zrow">
          <label>Delivery Address</label>
          <div><input type="text" id="pr-address" placeholder="Where should this be delivered?"></div>
        </div>
        <div class="zrow">
          <label>Reference#</label>
          <div><input type="text" id="pr-ref" placeholder="Optional external reference"></div>
        </div>
        <div class="zrow">
          <label>Reason</label>
          <div><input type="text" id="pr-just" placeholder="Why is this purchase needed?"></div>
        </div>
        <div class="zrow">
          <label>Notes to Approver</label>
          <div><textarea id="pr-notes" rows="3" placeholder="Anything the approver should know"></textarea></div>
        </div>
        ${cfFields.length ? `<div class="form-grid" style="max-width:640px;margin-bottom:8px;">${customFieldsHTML(cfFields)}</div>` : ''}
      </div>
      <table class="lines-table" style="margin-top:18px;">
        <thead><tr><th>Item Name</th><th>Quantity</th><th>Estimated Rate</th><th>Discount %</th><th>Tax %</th><th>Expense</th><th class="num">Estimated Amount</th><th></th></tr></thead>
        <tbody id="pr-lines">${lineRow()}</tbody>
      </table>
      <div class="help" style="margin-top:6px;">💡 <strong>CapEx</strong> = capital assets (equipment, furniture, renovations). <strong>OpEx</strong> = day-to-day operating supplies. Amount = (rate × qty − discount) + tax.</div>
      <div style="margin-top:10px;"><button type="button" class="btn btn-outline btn-sm" id="pr-add-line">+ Add New Row</button></div>
      <div style="display:flex;justify-content:flex-end;gap:24px;margin-top:12px;font-size:13px;">
        <div style="text-align:right;color:var(--ink-2);">
          <div>Discount: <span id="pr-disc-total">${currency(0)}</span></div>
          <div>Tax: <span id="pr-tax-total">${currency(0)}</span></div>
        </div>
      </div>
      <div class="lines-total" id="pr-total">Total: ${currency(0)}</div>`,
    footer: `
      <button class="btn btn-primary" id="m-save">Save &amp; Submit</button>
      <button class="btn btn-outline" id="m-cancel">Cancel</button>`,
    onOpen(body) {
      const linesEl = body.querySelector('#pr-lines');

      const recalc = () => {
        let total = 0, taxSum = 0, discSum = 0;
        linesEl.querySelectorAll('tr').forEach(tr => {
          const sel = tr.querySelector('.l-item');
          const priceInput = tr.querySelector('.l-price');
          if (!priceInput.value) priceInput.value = sel.dataset.price || 0;
          const gross = Number(tr.querySelector('.l-qty').value || 0) * Number(priceInput.value || 0);
          const disc = gross * (Number(tr.querySelector('.l-disc').value || 0) / 100);
          const net = gross - disc;
          const tax = net * (Number(tr.querySelector('.l-tax').value || 0) / 100);
          const sub = net + tax;
          tr.querySelector('.l-sub').textContent = currency(sub);
          total += sub; taxSum += tax; discSum += disc;
        });
        body.querySelector('#pr-total').textContent = `Total: ${currency(total)}`;
        body.querySelector('#pr-tax-total').textContent = currency(taxSum);
        body.querySelector('#pr-disc-total').textContent = currency(discSum);
      };

      // Auto-fill price + expense type when an item is chosen. Blank the price
      // first so a previously picked item's rate never sticks to a new one.
      const applyItemDefaults = (tr) => {
        const btn = tr.querySelector('.l-item');
        if (!btn || !btn.value) return;
        tr.querySelector('.l-price').value = btn.dataset.price || 0;
        tr.querySelector('.l-expense').value = btn.dataset.expense || 'OpEx';
      };

      wireItemPickers(linesEl, (btn) => {
        applyItemDefaults(btn.closest('tr'));
        recalc();
      });

      linesEl.addEventListener('input', recalc);
      linesEl.addEventListener('change', recalc);
      linesEl.addEventListener('click', e => {
        if (e.target.classList.contains('line-remove') && linesEl.children.length > 1) {
          e.target.closest('tr').remove(); recalc();
        }
      });
      body.querySelector('#pr-add-line').addEventListener('click', () => {
        linesEl.insertAdjacentHTML('beforeend', lineRow()); recalc();
      });

      // Name the approval route as soon as the budget status is chosen. Who has
      // to sign this off is the single thing a requester most wants to know
      // before submitting, and it should not be a surprise afterwards.
      const budgetSel = body.querySelector('#pr-budgetclass');
      const routeHelp = body.querySelector('#pr-route-help');
      const showRoute = () => {
        const wf = (ref.workflows || {})[budgetSel.value];
        if (!wf) { routeHelp.textContent = 'This decides who has to approve the requisition.'; return; }
        const approvers = wf.stages.filter(s => s.action === 'approve').map(s => s.role);
        routeHelp.innerHTML = `<strong>${esc(wf.label)}</strong> — approval route: ${esc(approvers.join(' → '))}`;
      };
      budgetSel.addEventListener('change', showRoute);
      showRoute();

      recalc();

      document.getElementById('m-cancel').addEventListener('click', closePage);
      document.getElementById('m-save').addEventListener('click', async () => {
        const items = [...linesEl.querySelectorAll('tr')].map(tr => ({
          ItemID: tr.querySelector('.l-item').value,
          Quantity: Number(tr.querySelector('.l-qty').value || 0),
          EstimatedPrice: Number(tr.querySelector('.l-price').value || 0),
          DiscountPct: Number(tr.querySelector('.l-disc').value || 0),
          TaxPct: Number(tr.querySelector('.l-tax').value || 0),
          ExpenseType: tr.querySelector('.l-expense').value,
          Category: tr.querySelector('.l-item').dataset.cat || ''
        })).filter(l => l.ItemID && l.Quantity > 0);
        if (items.length === 0) return toast('Pick at least one item and give it a quantity.', 'warning');

        // Module preferences (Settings → Module Settings → Purchase Requests)
        const prPrefs = (state.orgSettings.modulePrefs || {}).requisitions || {};
        if (prPrefs.requireDepartment && !body.querySelector('#pr-dept').value.trim())
          return toast('Department is mandatory for purchase requests.', 'warning');
        if (prPrefs.requireExpectedDate && !body.querySelector('#pr-expected').value)
          return toast('Expected date is mandatory for purchase requests.', 'warning');
        if (prPrefs.requireReason && !body.querySelector('#pr-just').value.trim())
          return toast('A reason is mandatory for purchase requests.', 'warning');

        const btn = document.getElementById('m-save');
        btn.disabled = true; btn.textContent = 'Submitting…';
        try {
          const result = await api('POST', '/api/prs', {
            RequestorID: state.currentUser.ROWID,
            Department: body.querySelector('#pr-dept').value.trim(),
            PropertyID: body.querySelector('#pr-property')?.value || '',
            Justification: body.querySelector('#pr-just').value.trim(),
            ExpectedDate: body.querySelector('#pr-expected').value,
            ReferenceNo: body.querySelector('#pr-ref').value.trim(),
            DeliveryAddress: body.querySelector('#pr-address').value.trim(),
            Notes: body.querySelector('#pr-notes').value.trim(),
            BudgetClass: body.querySelector('#pr-budgetclass').value,
            Items: items,
            CustomFields: {
              ...collectCustomFields(body),
              expenditureCategory: body.querySelector('#pr-expcat').value
            }
          });
          toast(`${result.PRNumber} submitted — ${result.Status === 'Approved' ? 'auto-approved' : 'routed for approval'}.`);
          closePage(); onDone && onDone();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false; btn.textContent = 'Save & Submit';
        }
      });
    }
  });
}

function openConvertToPO(prId, onDone) {
  if (state.cache.suppliers.length === 0) {
    toast('Add a vendor first (Vendors module).', 'warning');
    window.location.hash = '#/vendors';
    return;
  }
  openModal({
    title: 'Convert to purchase order',
    body: `
      <div class="field" style="margin-bottom:14px;">
        <label>Vendor <span class="req">*</span></label>
        <select id="cv-supplier">${state.cache.suppliers.map(s => `<option value="${s.ROWID}">${esc(s.Name)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>Payment terms</label>
        ${(state.orgSettings.paymentTerms || []).length > 0
          ? `<select id="cv-terms">
               ${state.orgSettings.paymentTerms.map(t => `<option value="${esc(t.name)} — payment due within ${Number(t.days)} days.">${esc(t.name)} (${Number(t.days)} days)</option>`).join('')}
             </select>
             <div class="help">Manage terms in Settings → Payment terms.</div>`
          : `<input type="text" id="cv-terms" value="${esc(((state.orgSettings.modulePrefs || {})['purchase-orders'] || {}).defaultTermsNote || 'Standard Net 30 payment terms.')}">`}
      </div>`,
    footer: `
      <button class="btn btn-outline" id="m-cancel">Cancel</button>
      <button class="btn btn-primary" id="m-save">Create PO</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const btn = document.getElementById('m-save');
        btn.disabled = true;
        try {
          const result = await api('POST', `/api/pos/convert/${prId}`, {
            SupplierID: body.querySelector('#cv-supplier').value,
            Terms: body.querySelector('#cv-terms').value
          });
          toast(`${result.PONumber} created and sent to the vendor.`);
          closeModal(); onDone && onDone();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

function openConvertToRFQ(prId, onDone) {
  const bidDays = Number(((state.orgSettings.modulePrefs || {}).rfqs || {}).defaultBidDays) || 7;
  const inWeek = new Date(Date.now() + bidDays * 86400000).toISOString().slice(0, 10);
  const vendors = state.cache.suppliers || [];
  openModal({
    title: 'Convert to RFQ',
    body: `
      <div class="field" style="margin-bottom:14px;">
        <label>Bid deadline</label>
        <input type="date" id="rfq-deadline" value="${inWeek}">
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>Invite vendors to bid <span class="req">*</span></label>
        <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px 12px;">
          ${vendors.length === 0 ? '<div class="cell-muted">No vendors yet — add vendors first.</div>' :
            vendors.map(v => `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-weight:400;">
              <input type="checkbox" class="rfq-vendor" value="${v.ROWID}" style="width:auto;">
              <span class="cell-strong">${esc(v.Name)}</span> <span class="cell-muted" style="font-size:12px;">${esc(v.ContactEmail || '')}</span></label>`).join('')}
        </div>
        <div class="help">Only invited vendors see this RFQ in the vendor portal and can bid on it.</div>
      </div>
      <div class="field">
        <label>Notes to vendors</label>
        <textarea id="rfq-notes" placeholder="Scope, delivery expectations, evaluation criteria…"></textarea>
      </div>`,
    footer: `
      <button class="btn btn-outline" id="m-cancel">Cancel</button>
      <button class="btn btn-primary" id="m-save">Publish RFQ</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const VendorIDs = [...body.querySelectorAll('.rfq-vendor:checked')].map(cb => cb.value);
        if (vendors.length > 0 && VendorIDs.length === 0) return toast('Select at least one vendor to invite.', 'warning');
        const btn = document.getElementById('m-save');
        btn.disabled = true;
        try {
          const result = await api('POST', `/api/rfqs/convert/${prId}`, {
            Deadline: body.querySelector('#rfq-deadline').value,
            Notes: body.querySelector('#rfq-notes').value,
            VendorIDs
          });
          toast(`${result.RFQNumber} published for bidding.`);
          closeModal(); onDone && onDone();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

/* =========================================================
   RFQs & BIDS
   ========================================================= */
export async function viewRFQs(root) {
  root.innerHTML = listPage({
    title: 'Request for Quotes',
    desc: 'Published RFQs and the vendor bids received against them.'
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/rfqs').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'RFQNumber', label: 'RFQ #', render: r => `<span class="cell-strong">${esc(r.RFQNumber)}</span>` },
        { key: 'Deadline', label: 'Bid deadline', render: r => fmtDate(r.Deadline) },
        { key: 'Notes', label: 'Notes', render: r => `<span class="cell-muted">${esc((r.Notes || '').slice(0, 60))}</span>` },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: filtered,
      empty: { icon: '📣', title: 'No RFQs yet', sub: 'Approve a requisition and convert it to an RFQ to start collecting bids.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>
        <button class="btn btn-ghost btn-sm" data-action="bids" data-id="${r.ROWID}" data-num="${esc(r.RFQNumber)}" data-status="${esc(r.Status)}">View bids</button>
        ${r.Status === 'Published' ? `<button class="btn btn-outline btn-sm" data-action="add-bid" data-id="${r.ROWID}" data-num="${esc(r.RFQNumber)}">Record bid</button>` : ''}`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['RFQNumber', 'Status', 'Notes'] });

  document.getElementById('list-body').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'view') {
      const row = rows.find(r => String(r.ROWID) === String(btn.dataset.id));
      if (row) openRFQDetail(row, async () => { await load(); apply(); });
      return;
    }
    if (btn.dataset.action === 'bids') openBids(btn.dataset.id, btn.dataset.num, btn.dataset.status, async () => { await load(); apply(); });
    if (btn.dataset.action === 'add-bid') openRecordBid(btn.dataset.id, btn.dataset.num);
  });

  await load(); apply();
}

async function openBids(rfqId, rfqNum, rfqStatus, onAwarded) {
  openModal({ title: `Bids — ${rfqNum}`, body: skeletonTable(3, 3), wide: true });
  // Self-heal the suppliers cache so vendor names resolve even when RFQs is the
  // first page opened this session.
  if (!state.cache.suppliers || state.cache.suppliers.length === 0) {
    state.cache.suppliers = await api('GET', '/api/suppliers').catch(() => []);
  }
  const bids = await api('GET', `/api/rfqs/${rfqId}/bids`).catch(() => []);
  const suppliersById = Object.fromEntries(state.cache.suppliers.map(s => [s.ROWID, s]));
  const canAward = rfqStatus === 'Published';
  // Cheapest submitted bid = the recommended award.
  const lowest = bids.filter(b => b.Status === 'Submitted').reduce((lo, b) =>
    (lo === null || Number(b.TotalBidAmount) < Number(lo.TotalBidAmount)) ? b : lo, null);

  const columns = [
    { key: 'VendorID', label: 'Vendor', render: r => `<span class="cell-strong">${esc(suppliersById[r.VendorID]?.Name || `#${r.VendorID}`)}</span>${lowest && String(r.ROWID) === String(lowest.ROWID) ? ' <span class="badge badge-good">Lowest</span>' : ''}` },
    { key: 'TotalBidAmount', label: 'Bid amount', num: true, render: r => currency(r.TotalBidAmount) },
    { key: 'ProposalNotes', label: 'Notes', render: r => `<span class="cell-muted">${esc((r.ProposalNotes || '').slice(0, 80))}</span>` },
    { key: 'Status', label: 'Status', render: r => badge(r.Status) }
  ];
  if (canAward) {
    columns.push({ key: '_award', label: '', render: r => r.Status === 'Submitted'
      ? `<button class="btn btn-primary btn-sm" data-award="${r.ROWID}">Award</button>` : '' });
  }

  openModal({
    title: `Bids — ${rfqNum}`,
    wide: true,
    body: renderTable({
      columns,
      rows: bids,
      empty: { icon: '🪙', title: 'No bids yet', sub: 'Bids appear here as vendors respond, or record one on their behalf.' }
    }),
    footer: `<button class="btn btn-outline" id="m-cancel">Close</button>`,
    onOpen(body) {
      body.addEventListener('click', async e => {
        const awardBtn = e.target.closest('button[data-award]');
        if (!awardBtn) return;
        const bid = bids.find(b => String(b.ROWID) === awardBtn.dataset.award);
        const vendorName = suppliersById[bid?.VendorID]?.Name || 'this vendor';
        if (!confirm(`Award ${rfqNum} to ${vendorName} for ${currency(bid?.TotalBidAmount)}? This creates a purchase order and closes the RFQ.`)) return;
        awardBtn.disabled = true; awardBtn.textContent = 'Awarding…';
        try {
          const res = await api('POST', `/api/rfqs/${rfqId}/award`, { BidID: awardBtn.dataset.award });
          toast(`Awarded — ${res.PONumber} created.`);
          closeModal();
          if (onAwarded) await onAwarded();
        } catch (err) { toast(err.message, 'error'); awardBtn.disabled = false; awardBtn.textContent = 'Award'; }
      });
    }
  });
  document.getElementById('m-cancel').addEventListener('click', closeModal);
}

function openRecordBid(rfqId, rfqNum) {
  if (state.cache.suppliers.length === 0) return toast('Add a vendor first.', 'warning');
  openModal({
    title: `Record bid — ${rfqNum}`,
    body: `
      <div class="form-grid">
        <div class="field full">
          <label>Vendor <span class="req">*</span></label>
          <select id="bid-vendor">${state.cache.suppliers.map(s => `<option value="${s.ROWID}">${esc(s.Name)}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Total bid amount <span class="req">*</span></label>
          <input type="number" id="bid-amount" min="0" step="0.01">
        </div>
        <div class="field full">
          <label>Proposal notes</label>
          <textarea id="bid-notes" placeholder="Delivery time, warranty, terms…"></textarea>
        </div>
      </div>`,
    footer: `
      <button class="btn btn-outline" id="m-cancel">Cancel</button>
      <button class="btn btn-primary" id="m-save">Submit bid</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const amount = Number(body.querySelector('#bid-amount').value || 0);
        if (amount <= 0) return toast('Enter a bid amount.', 'warning');
        const btn = document.getElementById('m-save');
        btn.disabled = true;
        try {
          await api('POST', `/api/rfqs/${rfqId}/bids`, {
            VendorID: body.querySelector('#bid-vendor').value,
            TotalBidAmount: amount,
            ProposalNotes: body.querySelector('#bid-notes').value
          });
          toast('Bid recorded.');
          closeModal();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

/* =========================================================
   PURCHASE ORDERS
   ========================================================= */
export async function viewPOs(root) {
  root.innerHTML = listPage({
    title: 'Purchase Orders',
    desc: 'Orders issued to vendors, their fulfilment and billing state.'
  });

  let rows = [];
  const suppliersById = () => Object.fromEntries(state.cache.suppliers.map(s => [s.ROWID, s]));
  const load = async () => { rows = await api('GET', '/api/pos').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'PONumber', label: 'PO #', render: r => `<span class="cell-strong">${esc(r.PONumber)}</span>` },
        { key: 'SupplierID', label: 'Vendor', render: r => esc(suppliersById()[r.SupplierID]?.Name || '—') },
        { key: 'TotalAmount', label: 'Amount', num: true, render: r => currency(r.TotalAmount) },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) },
        {
          key: 'VendorDecision', label: 'Vendor response', render: r => {
            if (!r.VendorDecision) return '<span class="cell-muted">—</span>';
            const kind = r.VendorDecision === 'Accepted' ? 'good' : 'critical';
            const note = r.VendorNote ? ` title="${esc(r.VendorNote)}"` : '';
            return `<span class="badge badge-${kind}"${note}>${esc(r.VendorDecision)}</span>`;
          }
        }
      ],
      rows: filtered,
      empty: { icon: '📦', title: 'No purchase orders yet', sub: 'Convert an approved requisition into a PO to see it here.' },
      rowActions: r => {
        let html = `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>`;
        if (r.Status === 'Sent_To_Supplier') html += `<button class="btn btn-outline btn-sm" data-action="receive" data-id="${r.ROWID}" data-num="${esc(r.PONumber)}">Receive</button>`;
        html += `<button class="btn btn-outline btn-sm" data-action="invoice" data-id="${r.ROWID}" data-num="${esc(r.PONumber)}" data-amount="${Number(r.TotalAmount || 0)}">Bill</button>`;
        return html;
      }
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['PONumber', 'Status'] });

  document.getElementById('list-body').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, num, amount } = btn.dataset;
    if (action === 'view') openPODetail(id);
    if (action === 'receive') openReceivePO(id, num, async () => { await load(); apply(); });
    if (action === 'invoice') openCreateInvoice(id, num, amount);
  });

  await load(); apply();
}

async function openPODetail(poId) {
  const detail = await api('GET', `/api/pos/${poId}`);
  const po = detail.po || detail;
  const lines = detail.items || [];
  const itemsById = Object.fromEntries((state.cache.items || []).map(i => [i.ROWID, i]));
  const vendor = (state.cache.suppliers || []).find(v => v.ROWID === po.SupplierID);
  const prop = (state.cache.properties || []).find(x => x.ROWID === po.PropertyID);

  // POItems stores quantity and unit price only — no per-line tax or discount.
  // Those live on the PO header (TaxTotal / DiscountTotal).
  const lineTotal = (l) => Number(l.Quantity || 0) * Number(l.UnitPrice || 0);
  const subtotal = lines.reduce((a, l) => a + lineTotal(l), 0);

  // Receipts and bills raised against this order — the two questions anyone
  // opening a PO actually has: has it arrived, and has it been billed.
  const [grns, invoices] = await Promise.all([
    api('GET', '/api/grns').catch(() => []),
    api('GET', '/api/invoices').catch(() => [])
  ]);
  const myGrns = grns.filter(g => String(g.POID) === String(poId));
  const myBills = invoices.filter(i => String(i.POID) === String(poId));

  openRecord({
    number: po.PONumber || `PO-${poId}`,
    status: po.Status,
    subtitle: 'Purchase order',
    summary: { label: 'Order value', value: currency(po.TotalAmount || subtotal) },
    actions: [{ label: 'Print', onClick: () => printPO(poId) }],
    tabs: [
      {
        id: 'details', label: 'Details',
        render: (el) => {
          el.innerHTML =
            sectionHTML('Order', factsHTML([
              ['Vendor', vendor ? vendor.Name : po.SupplierID],
              ['Property', prop ? `${prop.Name}${prop.Location ? ` · ${prop.Location}` : ''}` : ''],
              ['Raised', fmtDate(po.CREATEDTIME)],
              ['Expected', po.ExpectedDate ? fmtDate(po.ExpectedDate) : ''],
              ['Reference', po.ReferenceNo],
              ['From requisition', po.PRID ? `#${po.PRID}` : '']
            ])) +
            sectionHTML('Vendor response', factsHTML([
              ['Decision', po.VendorDecision || 'No response yet'],
              ['Vendor note', po.VendorNote, { wide: true }]
            ])) +
            sectionHTML('Terms & delivery', factsHTML([
              ['Deliver to', po.DeliveryAddress, { wide: true }],
              ['Terms', po.Terms, { wide: true }],
              ['Notes', po.Notes, { wide: true }]
            ]));
        }
      },
      {
        id: 'lines', label: 'Line items', count: lines.length,
        render: (el) => {
          el.innerHTML = linesHTML(
            [
              { key: 'ItemID', label: 'Item', render: l => {
                  const it = itemsById[l.ItemID];
                  if (!it) return esc(`#${l.ItemID}`);
                  return `<b>${esc(it.Name)}</b>${it.SKU ? `<div class="cell-muted">${esc(it.SKU)}</div>` : ''}` +
                         (it.Description ? `<div class="cell-muted">${esc(it.Description)}</div>` : '');
                } },
              { key: 'ExpenseType', label: 'Expense', render: l => badge(itemsById[l.ItemID]?.ExpenseType || 'OpEx') },
              { key: 'Quantity', label: 'Qty', num: true, render: l => {
                  const unit = itemsById[l.ItemID]?.Unit;
                  return `${esc(String(l.Quantity))}${unit ? ` <span class="cell-muted">${esc(unit)}</span>` : ''}`;
                } },
              { key: 'UnitPrice', label: 'Rate', num: true, render: l => currency(l.UnitPrice) },
              { key: '_sub', label: 'Amount', num: true, render: l => currency(lineTotal(l)) }
            ],
            lines,
            [
              ['Subtotal', currency(subtotal)],
              ...(Number(po.DiscountTotal || 0) ? [['Discount', currency(po.DiscountTotal)]] : []),
              ...(Number(po.TaxTotal || 0) ? [['Tax', currency(po.TaxTotal)]] : []),
              ['Total', currency(po.TotalAmount || subtotal), true]
            ]
          );
        }
      },
      {
        id: 'receipts', label: 'Receipts', count: myGrns.length,
        render: (el) => {
          el.innerHTML = myGrns.length
            ? linesHTML([
                { key: 'GRNNumber', label: 'Receipt' },
                { key: 'ReceivedDate', label: 'Received', render: g => fmtDate(g.ReceivedDate) },
                { key: 'ReceivedByID', label: 'By', render: g => {
                    const u = (state.cache.users || []).find(x => x.ROWID === g.ReceivedByID);
                    return esc(u ? (u.FullName || u.Email) : '—');
                  } }
              ], myGrns)
            : emptyHTML('Nothing received yet.', 'Goods receipts raised against this order will appear here.');
        }
      },
      {
        id: 'bills', label: 'Bills', count: myBills.length,
        render: (el) => {
          el.innerHTML = myBills.length
            ? linesHTML([
                { key: 'InvoiceNumber', label: 'Bill #' },
                { key: 'SupplierInvoiceDate', label: 'Dated', render: i => fmtDate(i.SupplierInvoiceDate) },
                { key: 'MatchScore', label: '3-way match', render: i => badge(i.MatchScore || 'Unmatched') },
                { key: 'Status', label: 'Status', render: i => badge(i.Status || 'Pending') },
                { key: 'Amount', label: 'Amount', num: true, render: i => currency(i.Amount) }
              ], myBills)
            : emptyHTML('No bills yet.', 'Vendor invoices matched to this order will appear here.');
        }
      },
      {
        id: 'files', label: 'Files',
        render: (el) => { mountAttachments(el, 'PO', poId); }
      }
    ]
  });
}

async function openReceivePO(poId, poNum, onDone) {
  openModal({ title: `Receive goods — ${poNum}`, body: skeletonTable(3, 3), wide: true });
  try {
    const { items } = await api('GET', `/api/pos/${poId}`);
    const itemsById = Object.fromEntries(state.cache.items.map(i => [i.ROWID, i]));
    openModal({
      title: `Receive goods — ${poNum}`,
      wide: true,
      body: `
        <p class="cell-muted" style="margin-bottom:12px;">Record what physically arrived. Accepted quantities feed the 3-way match when the vendor's invoice comes in.</p>
        <table class="lines-table">
          <thead><tr><th>Item</th><th>Ordered</th><th>Received</th><th>Accepted</th><th>Rejected</th></tr></thead>
          <tbody id="grn-lines">
            ${items.map(l => `
              <tr data-item="${l.ItemID}">
                <td>${esc(itemsById[l.ItemID]?.Name || `#${l.ItemID}`)}</td>
                <td class="num">${Number(l.Quantity)}</td>
                <td><input type="number" class="g-recv" value="${Number(l.Quantity)}" min="0"></td>
                <td><input type="number" class="g-acc" value="${Number(l.Quantity)}" min="0"></td>
                <td><input type="number" class="g-rej" value="0" min="0"></td>
              </tr>`).join('')}
          </tbody>
        </table>`,
      footer: `
        <button class="btn btn-outline" id="m-cancel">Cancel</button>
        <button class="btn btn-primary" id="m-save">Log receipt</button>`,
      onOpen(body) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const lines = [...body.querySelectorAll('#grn-lines tr')].map(tr => ({
            ItemID: tr.dataset.item,
            QuantityReceived: Number(tr.querySelector('.g-recv').value || 0),
            QuantityAccepted: Number(tr.querySelector('.g-acc').value || 0),
            QuantityRejected: Number(tr.querySelector('.g-rej').value || 0)
          }));
          const btn = document.getElementById('m-save');
          btn.disabled = true;
          try {
            const result = await api('POST', '/api/grns', {
              POID: poId,
              ReceivedByID: state.currentUser.ROWID,
              Items: lines
            });
            toast(`${result.GRNNumber} logged — PO marked fulfilled.`);
            closeModal(); onDone && onDone();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  } catch (err) { toast(err.message, 'error'); closeModal(); }
}

function openCreateInvoice(poId, poNum, poAmount) {
  openModal({
    title: `Record vendor invoice — ${poNum}`,
    body: `
      <p class="cell-muted" style="margin-bottom:12px;">The invoice is 3-way matched against the PO and goods receipts automatically on save.</p>
      <div class="form-grid">
        <div class="field">
          <label>Invoice number <span class="req">*</span></label>
          <input type="text" id="inv-number" placeholder="Vendor's invoice #">
        </div>
        <div class="field">
          <label>Invoice date</label>
          <input type="date" id="inv-date" value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="field full">
          <label>Invoice amount <span class="req">*</span></label>
          <input type="number" id="inv-amount" step="0.01" min="0" value="${Number(poAmount || 0)}">
        </div>
      </div>`,
    footer: `
      <button class="btn btn-outline" id="m-cancel">Cancel</button>
      <button class="btn btn-primary" id="m-save">Save &amp; match</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const number = body.querySelector('#inv-number').value.trim();
        const amount = Number(body.querySelector('#inv-amount').value || 0);
        if (!number || amount <= 0) return toast('Invoice number and amount are required.', 'warning');
        const btn = document.getElementById('m-save');
        btn.disabled = true;
        try {
          const result = await api('POST', '/api/invoices', {
            InvoiceNumber: number,
            POID: poId,
            SupplierInvoiceDate: body.querySelector('#inv-date').value,
            Amount: amount
          });
          const match = result.match || {};
          toast(`Invoice saved — match result: ${match.status || 'processed'}.`, match.status === 'Discrepancy' ? 'warning' : 'success');
          closeModal();
          if (window.location.hash.startsWith('#/invoices')) window.dispatchEvent(new Event('hashchange'));
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

/* =========================================================
   GOODS RECEIPTS
   ========================================================= */
export async function viewGRNs(root) {
  root.innerHTML = listPage({
    title: 'Goods Receipts',
    desc: 'Delivery records logged against purchase orders.'
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/grns').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'GRNNumber', label: 'GRN #', render: r => `<span class="cell-strong">${esc(r.GRNNumber)}</span>` },
        { key: 'POID', label: 'PO', render: r => `<span class="cell-muted">#${esc(r.POID)}</span>` },
        { key: 'ReceivedDate', label: 'Received', render: r => fmtDate(r.ReceivedDate) }
      ],
      rows: filtered,
      empty: { icon: '🚚', title: 'No receipts yet', sub: 'Use “Receive” on a purchase order when goods arrive.' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['GRNNumber', 'POID'] });
  document.getElementById('list-body').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action="view"]');
    if (btn) openGRNDetail(btn.dataset.id);
  });
  await load(); apply();
}

/* =========================================================
   INVOICES (3-way matching)
   ========================================================= */
export async function viewInvoices(root) {
  root.innerHTML = listPage({
    title: 'Invoices',
    desc: 'Vendor invoices with automatic 3-way matching against POs and goods receipts.'
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/invoices').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'InvoiceNumber', label: 'Invoice #', render: r => `<span class="cell-strong">${esc(r.InvoiceNumber)}</span>` },
        { key: 'POID', label: 'PO', render: r => `<span class="cell-muted">#${esc(r.POID)}</span>` },
        { key: 'SupplierInvoiceDate', label: 'Date', render: r => fmtDate(r.SupplierInvoiceDate) },
        { key: 'Amount', label: 'Amount', num: true, render: r => currency(r.Amount) },
        { key: 'Status', label: 'Match status', render: r => badge(r.Status) },
        { key: 'MatchScore', label: 'Match detail', render: r => `<span class="cell-muted">${esc((r.MatchScore || '').slice(0, 70))}</span>` }
      ],
      rows: filtered,
      empty: { icon: '🧾', title: 'No invoices yet', sub: 'Use “Bill” on a purchase order to record a vendor invoice.' },
      rowActions: r => {
        let html = `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>`;
        if (r.Status !== 'Paid') {
          html += `<button class="btn btn-ghost btn-sm" data-action="rematch" data-id="${r.ROWID}">Re-match</button>`;
          html += `<button class="btn btn-primary btn-sm" data-action="pay" data-id="${r.ROWID}" data-num="${esc(r.InvoiceNumber)}" data-amount="${Number(r.Amount || 0)}">Pay</button>`;
        }
        return html;
      }
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['InvoiceNumber', 'Status', 'POID'] });

  document.getElementById('list-body').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, num, amount } = btn.dataset;
    if (action === 'view') {
      const row = rows.find(r => r.ROWID === id);
      if (row) await openInvoiceDetail(row, async () => { await load(); apply(); });
    }
    if (action === 'rematch') {
      btn.disabled = true;
      try {
        const result = await api('POST', `/api/invoices/${id}/rematch`);
        toast(`Re-matched: ${result.status || 'done'}.`);
        await load(); apply();
      } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
    if (action === 'pay') openRecordPayment(id, num, amount, async () => { await load(); apply(); });
  });

  await load(); apply();
}

function openRecordPayment(invoiceId, invNum, amount, onDone) {
  openModal({
    title: `Record payment — ${invNum}`,
    body: `
      <div class="form-grid">
        <div class="field">
          <label>Amount <span class="req">*</span></label>
          <input type="number" id="pay-amount" step="0.01" min="0" value="${Number(amount || 0)}">
        </div>
        <div class="field">
          <label>Payment mode</label>
          <select id="pay-mode">
            <option>Bank Transfer</option>
            <option>Check</option>
            <option>Credit Card</option>
            <option>Cash</option>
          </select>
        </div>
        <div class="field full">
          <label>Reference number</label>
          <input type="text" id="pay-ref" placeholder="Transaction / check reference (optional)">
        </div>
      </div>`,
    footer: `
      <button class="btn btn-outline" id="m-cancel">Cancel</button>
      <button class="btn btn-primary" id="m-save">Record payment</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const btn = document.getElementById('m-save');
        btn.disabled = true;
        try {
          await api('POST', '/api/payments', {
            InvoiceID: invoiceId,
            AmountPaid: Number(body.querySelector('#pay-amount').value || 0),
            PaymentMode: body.querySelector('#pay-mode').value,
            ReferenceNumber: body.querySelector('#pay-ref').value.trim() || undefined
          });
          toast('Payment recorded — invoice marked paid.');
          closeModal(); onDone && onDone();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

/* =========================================================
   PAYMENTS
   ========================================================= */
export async function viewPayments(root) {
  root.innerHTML = listPage({
    title: 'Payments Made',
    desc: 'Outbound payments recorded against vendor invoices.'
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/payments').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'ReferenceNumber', label: 'Reference', render: r => `<span class="cell-strong">${esc(r.ReferenceNumber)}</span>` },
        { key: 'InvoiceID', label: 'Invoice', render: r => `<span class="cell-muted">#${esc(r.InvoiceID)}</span>` },
        { key: 'PaymentDate', label: 'Date', render: r => fmtDate(r.PaymentDate) },
        { key: 'PaymentMode', label: 'Mode' },
        { key: 'AmountPaid', label: 'Amount', num: true, render: r => currency(r.AmountPaid) }
      ],
      rows: filtered,
      empty: { icon: '💸', title: 'No payments yet', sub: 'Record a payment from the Invoices module.' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['ReferenceNumber', 'PaymentMode', 'InvoiceID'] });
  document.getElementById('list-body').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action="view"]');
    if (btn) openPaymentDetail(rows.find(r => r.ROWID === btn.dataset.id));
  });
  await load(); apply();
}

/* =========================================================
   MY REQUESTS — the signed-in user's own purchase requests
   ========================================================= */
export async function viewMyRequests(root) {
  root.innerHTML = listPage({
    title: 'My Requests',
    desc: 'Purchase requests you have raised, and where they are in approval.',
    actionsHtml: `<button class="btn btn-primary" id="btn-new-pr">+ New Purchase Request</button>`
  });

  let rows = [];
  const load = async () => {
    const all = await api('GET', '/api/prs').catch(() => []);
    rows = all.filter(r => String(r.RequestorID) === String(state.currentUser.ROWID));
  };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'PRNumber', label: 'Request #', render: r => `<span class="cell-strong">${esc(r.PRNumber)}</span>` },
        { key: 'CREATEDTIME', label: 'Raised', render: r => fmtDate(r.CREATEDTIME) },
        { key: 'Department', label: 'Department' },
        { key: 'TotalAmount', label: 'Amount', num: true, render: r => currency(r.TotalAmount) },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: filtered,
      empty: {
        icon: '📝', title: 'You have not raised any requests yet',
        sub: 'Raise a purchase request and track its approval here.',
        actionHtml: `<button class="btn btn-primary" id="empty-new-pr" style="margin-top:12px;">+ New Purchase Request</button>`
      },
      rowActions: r => {
        let html = `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>`;
        if (r.Status === 'Pending_Approval') html += `<button class="btn btn-outline btn-sm" data-action="recall" data-id="${r.ROWID}">Recall</button>`;
        if (['Rejected', 'Draft'].includes(r.Status)) html += `<button class="btn btn-outline btn-sm" data-action="resubmit" data-id="${r.ROWID}">Resubmit</button>`;
        return html;
      }
    });
    const emptyBtn = document.getElementById('empty-new-pr');
    if (emptyBtn) emptyBtn.addEventListener('click', () => openNewPR(async () => { await load(); apply(); }));
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['PRNumber', 'Department', 'Status'] });

  document.getElementById('btn-new-pr').addEventListener('click', () => openNewPR(async () => { await load(); apply(); }));
  document.getElementById('list-body').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'view') return openPRDetail(id);
    if (action === 'recall') {
      btn.disabled = true;
      try { await api('POST', `/api/prs/${id}/recall`); toast('Request recalled to draft.'); await load(); apply(); }
      catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
    if (action === 'resubmit') {
      btn.disabled = true;
      try { const r = await api('POST', `/api/prs/${id}/resubmit`); toast(r.message || 'Resubmitted.'); await load(); apply(); }
      catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
  });

  await load(); apply();
}

/* =========================================================
   APPROVALS — requests waiting on the signed-in approver
   ========================================================= */
export async function viewApprovals(root) {
  root.innerHTML = listPage({
    title: 'Approvals',
    desc: 'Purchase requests awaiting an approval decision.'
  });

  let rows = [];
  const usersById = () => Object.fromEntries(state.cache.users.map(u => [u.ROWID, u]));
  const load = async () => {
    const all = await api('GET', '/api/prs').catch(() => []);
    rows = all.filter(r => r.Status === 'Pending_Approval');
  };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'PRNumber', label: 'Request #', render: r => `<span class="cell-strong">${esc(r.PRNumber)}</span>` },
        { key: 'RequestorID', label: 'Requested by', render: r => esc(usersById()[r.RequestorID]?.FullName || '—') },
        { key: 'CREATEDTIME', label: 'Raised', render: r => fmtDate(r.CREATEDTIME) },
        { key: 'Department', label: 'Department' },
        { key: 'TotalAmount', label: 'Amount', num: true, render: r => currency(r.TotalAmount) }
      ],
      rows: filtered,
      empty: { icon: '✅', title: 'Nothing waiting on you', sub: 'Requests routed for approval will appear here.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">Review</button>
        <button class="btn btn-primary btn-sm" data-action="approve" data-id="${r.ROWID}">✓ Approve</button>
        <button class="btn btn-danger btn-sm" data-action="reject" data-id="${r.ROWID}">Reject</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['PRNumber', 'Department'] });

  document.getElementById('list-body').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'view') return openPRDetail(id);
    if (action === 'approve') {
      btn.disabled = true;
      try { const r = await api('POST', `/api/prs/${id}/approve`); toast(r.message || 'Request approved.'); await load(); apply(); }
      catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
    if (action === 'reject') return openRejectPR(id, async () => { await load(); apply(); });
  });

  await load(); apply();
}
