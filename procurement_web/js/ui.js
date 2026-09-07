// Small DOM + component helpers shared by every view.

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'error' ? '⚠' : type === 'warning' ? '⚠' : '✓';
  el.innerHTML = `<span>${icon}</span><span>${esc(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ---- Status badges: one map for the whole app ----
const STATUS_MAP = {
  // PRs
  Pending_Approval: ['warning', 'Pending approval'],
  Approved: ['good', 'Approved'],
  Rejected: ['critical', 'Rejected'],
  Converted_To_PO: ['info', 'Converted to PO'],
  Converted_To_RFQ: ['info', 'Converted to RFQ'],
  // POs
  Sent_To_Supplier: ['info', 'Sent to supplier'],
  Fulfilled: ['good', 'Fulfilled'],
  Cancelled: ['critical', 'Cancelled'],
  // Invoices
  Matched: ['good', 'Matched'],
  Unmatched: ['warning', 'Unmatched'],
  Review: ['warning', 'Review (within tolerance)'],
  Discrepancy: ['serious', 'Discrepancy'],
  Draft_Asset: ['neutral', 'Draft'],
  Partially_Paid: ['warning', 'Partially paid'],
  Paid: ['good', 'Paid'],
  // Generic
  Draft: ['neutral', 'Draft'],
  Invited: ['info', 'Invitation sent'],
  Active: ['good', 'Active'],
  Open: ['info', 'Open'],
  Closed: ['neutral', 'Closed'],
  Published: ['info', 'Published'],
  Submitted: ['info', 'Submitted'],
  Awarded: ['good', 'Awarded'],
  'Pending Validation': ['warning', 'Pending validation'],
  'Pending Verification': ['warning', 'Pending verification'],
  Suspended: ['critical', 'Suspended'],
  Inactive: ['neutral', 'Inactive'],
  CapEx: ['info', 'CapEx'],
  OpEx: ['neutral', 'OpEx']
};

export function badge(status) {
  const [kind, label] = STATUS_MAP[status] || ['neutral', String(status || '—').replace(/_/g, ' ')];
  return `<span class="badge badge-${kind}">${esc(label)}</span>`;
}

/* Human-readable status text without the badge chrome. Printed documents need
   the words, not the raw enum — "Sent_To_Supplier" must never reach paper. */
export function statusLabel(status) {
  const hit = STATUS_MAP[status];
  return hit ? hit[1] : String(status || '—').replace(/_/g, ' ');
}

// ---- Modal ----
const backdrop = () => document.getElementById('modal-backdrop');

export function openModal({ title, body, footer, wide = false, onOpen }) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer || '';
  document.getElementById('modal').classList.toggle('wide', wide);
  backdrop().classList.add('open');
  if (onOpen) onOpen(document.getElementById('modal-body'), document.getElementById('modal-footer'));
}

export function closeModal() {
  backdrop().classList.remove('open');
}

export function wireModalChrome() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  backdrop().addEventListener('click', e => { if (e.target === backdrop()) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ---- Full-page form overlay (Zoho-style: forms open as full screens) ----
export function openPage({ title, body, footer, onOpen }) {
  const root = document.getElementById('page-root');
  if (!root) return openModal({ title, body, footer, wide: true, onOpen });
  root.innerHTML = `
    <div class="fullpage">
      <header class="fullpage-header">
        <div class="fullpage-title">${esc(title)}</div>
        <button class="fullpage-close" id="fullpage-close" aria-label="Close">×</button>
      </header>
      <div class="fullpage-body" id="fullpage-body">${body}</div>
      ${footer ? `<footer class="fullpage-footer" id="fullpage-footer">${footer}</footer>` : ''}
    </div>`;
  root.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('fullpage-close').addEventListener('click', closePage);
  if (onOpen) onOpen(document.getElementById('fullpage-body'), document.getElementById('fullpage-footer'));
}

export function closePage() {
  const root = document.getElementById('page-root');
  if (!root) return closeModal();
  root.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 250);
}

// ---- Table renderer ----
// columns: [{ key, label, num?, render?(row) }]
export function renderTable({ columns, rows, empty, rowActions }) {
  if (!rows || rows.length === 0) {
    return `<div class="empty">
      <div class="icon">${empty?.icon || '📄'}</div>
      <div class="title">${esc(empty?.title || 'Nothing here yet')}</div>
      <div class="sub">${esc(empty?.sub || '')}</div>
      ${empty?.actionHtml || ''}
    </div>`;
  }
  const head = columns.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')
    + (rowActions ? '<th class="num"></th>' : '');
  const body = rows.map(row => {
    // data-label drives the responsive card layout on phones (see CSS).
    const cells = columns.map(c => {
      const val = c.render ? c.render(row) : esc(row[c.key] ?? '—');
      return `<td class="${c.num ? 'num' : ''}" data-label="${esc(c.label)}">${val}</td>`;
    }).join('');
    const actions = rowActions ? `<td class="num" data-label="Actions"><div class="row-actions">${rowActions(row)}</div></td>` : '';
    return `<tr>${cells}${actions}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function skeletonTable(cols = 4, rowsCount = 5) {
  let html = '';
  for (let i = 0; i < rowsCount; i++) {
    html += `<div class="skeleton-row">${Array.from({ length: cols }, (_, j) =>
      `<div class="skeleton-cell" style="flex:${j === 0 ? 2 : 1};"></div>`).join('')}</div>`;
  }
  return html;
}

// ---- Custom fields (org-defined fields on native modules) ----
export function customFieldsHTML(fields) {
  if (!fields || fields.length === 0) return '';
  return fields.map(f => {
    let input;
    if (f.FieldType === 'select') {
      let opts = [];
      try { opts = JSON.parse(f.Options || '[]'); } catch {}
      input = `<select class="cf-input" data-cf-name="${esc(f.FieldName)}"><option value="">—</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    } else if (f.FieldType === 'boolean') {
      input = `<label style="display:flex;align-items:center;gap:8px;font-weight:400;padding:8px 0;">
        <input class="cf-input" type="checkbox" data-cf-name="${esc(f.FieldName)}" style="width:auto;"> Yes</label>`;
    } else {
      const type = f.FieldType === 'number' ? 'number' : f.FieldType === 'date' ? 'date' : 'text';
      input = `<input class="cf-input" type="${type}" data-cf-name="${esc(f.FieldName)}">`;
    }
    return `<div class="field"><label>${esc(f.FieldName)}</label>${input}</div>`;
  }).join('');
}

export function collectCustomFields(root) {
  const out = {};
  root.querySelectorAll('.cf-input').forEach(el => {
    const value = el.type === 'checkbox' ? el.checked : el.value;
    if (value !== '' && value !== undefined) out[el.dataset.cfName] = value;
  });
  return Object.keys(out).length ? out : null;
}

export function customFieldValuesHTML(json) {
  if (!json) return '';
  let values = {};
  try { values = JSON.parse(json); } catch { return ''; }
  const entries = Object.entries(values);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) =>
    `<div><div class="cell-muted">${esc(k)}</div><div>${v === true ? 'Yes' : v === false ? 'No' : esc(String(v))}</div></div>`).join('');
}

// Standard list-page scaffold: header + card with toolbar + table body zone.
export function listPage({ title, desc, actionsHtml, toolbarHtml }) {
  return `
    <div class="page-head">
      <div><h2>${esc(title)}</h2>${desc ? `<div class="desc">${esc(desc)}</div>` : ''}</div>
      <div class="page-actions">${actionsHtml || ''}</div>
    </div>
    <div class="card">
      ${toolbarHtml !== undefined ? toolbarHtml : `
        <div class="toolbar">
          <input class="search" id="list-search" type="search" placeholder="Search…">
          <span class="spacer"></span>
          <span class="count-chip" id="list-count"></span>
          <button class="btn btn-ghost btn-sm" id="list-refresh">⟳ Refresh</button>
        </div>`}
      <div class="card-body flush" id="list-body">${skeletonTable()}</div>
    </div>`;
}

// Wire search + refresh on a list page. getRows() returns current dataset,
// draw(filteredRows) re-renders, load() refetches.
export function wireListPage({ getRows, draw, load, searchKeys }) {
  const search = document.getElementById('list-search');
  const count = document.getElementById('list-count');
  const refresh = document.getElementById('list-refresh');

  const apply = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let rows = getRows();
    if (q) {
      rows = rows.filter(r => searchKeys.some(k => String(r[k] ?? '').toLowerCase().includes(q)));
    }
    if (count) count.textContent = `${rows.length} record${rows.length === 1 ? '' : 's'}`;
    draw(rows);
  };

  search?.addEventListener('input', apply);
  refresh?.addEventListener('click', async () => {
    document.getElementById('list-body').innerHTML = skeletonTable();
    await load();
    apply();
  });
  return apply;
}

/* ---------------- Theme ----------------
   A stored 'pf-theme' is an explicit user choice and always wins. Procurement
   workstations begin in light mode so tables and printed-document previews are
   predictable; dark mode remains an opt-in preference. */
export function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyStoredTheme() {
  const stored = localStorage.getItem('pf-theme');
  const theme = stored === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  return theme;
}

/* Re-apply when the OS flips, but only while the user is on "match system". */
export function watchSystemTheme(onChange) {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (localStorage.getItem('pf-theme')) return; // explicit choice — leave alone
    const t = applyStoredTheme();
    if (onChange) onChange(t);
  };
  mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
}
