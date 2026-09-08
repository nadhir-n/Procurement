// Zoho-Books-style document engine. A template is a rich config object; the SAME
// renderDocument() function powers both the live editor preview and the final
// print output, so what you design is exactly what prints.
import { api, state, currency, fmtDate } from './api.js?v=48';
import { esc, toast, badge, statusLabel, openPage, closePage } from './ui.js?v=48';

// Paper sizes in mm (width × height, portrait).
export const PAPER_SIZES = {
  A4: { label: 'A4', w: 210, h: 297 },
  Letter: { label: 'Letter', w: 216, h: 279 },
  Legal: { label: 'Legal', w: 216, h: 356 },
  A5: { label: 'A5', w: 148, h: 210 }
};

export const FONTS = {
  system: { label: 'System sans', stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  inter: { label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  georgia: { label: 'Georgia (serif)', stack: "Georgia, 'Times New Roman', serif" },
  mono: { label: 'Monospace', stack: "'Courier New', monospace" }
};

// Table visual styles the editor can pick between.
export const TABLE_STYLES = {
  bordered: { label: 'Bordered rows' },
  striped: { label: 'Striped rows' },
  minimal: { label: 'Minimal (header rule only)' }
};

// Every document type the platform can print, grouped the way the settings
// gallery groups them (mirrors Zoho Procurement's "All <Type> Templates").
export const DOC_TYPES = [
  { group: 'Purchases', items: [
    ['po', 'Purchase Orders'],
    ['pr', 'Purchase Requests'],
    ['rfq', 'Request for Quotes'],
    ['grn', 'Goods Receipts']
  ] },
  { group: 'Payables', items: [
    ['invoice', 'Bills'],
    ['payment', 'Vendor Payments'],
    ['credit', 'Vendor Credits'],
    ['statement', 'Vendor Statements']
  ] }
];
export const TPL_MODULES = DOC_TYPES.flatMap(g => g.items);
const MODULE_LABEL = Object.fromEntries(TPL_MODULES);
export const moduleLabel = (m) => MODULE_LABEL[m] || m;

// Column definitions per module (id → { label, default, num }).
export const MODULE_COLUMNS = {
  po: {
    item: { label: 'Item / Description', default: true },
    sku: { label: 'SKU', default: false },
    qty: { label: 'Qty', default: true, num: true },
    rate: { label: 'Unit price', default: true, num: true },
    tax: { label: 'Tax %', default: false, num: true },
    amount: { label: 'Amount', default: true, num: true }
  },
  pr: {
    item: { label: 'Item / Description', default: true },
    expense: { label: 'CapEx/OpEx', default: true },
    qty: { label: 'Qty', default: true, num: true },
    rate: { label: 'Est. price', default: true, num: true },
    tax: { label: 'Tax %', default: false, num: true },
    amount: { label: 'Amount', default: true, num: true }
  },
  invoice: {
    item: { label: 'Description', default: true },
    account: { label: 'Account', default: false },
    qty: { label: 'Qty', default: true, num: true },
    rate: { label: 'Rate', default: true, num: true },
    tax: { label: 'Tax %', default: false, num: true },
    amount: { label: 'Amount', default: true, num: true }
  },
  payment: {
    item: { label: 'Applied to bill', default: true },
    date: { label: 'Bill date', default: true },
    amount: { label: 'Amount applied', default: true, num: true }
  },
  credit: {
    item: { label: 'Reason', default: true },
    qty: { label: 'Qty', default: false, num: true },
    rate: { label: 'Unit price', default: false, num: true },
    amount: { label: 'Amount', default: true, num: true }
  },
  statement: {
    item: { label: 'Transaction', default: true },
    date: { label: 'Date', default: true },
    debit: { label: 'Debit', default: true, num: true },
    credit_amt: { label: 'Credit', default: true, num: true },
    amount: { label: 'Balance', default: true, num: true }
  },
  rfq: {
    item: { label: 'Item / Description', default: true },
    sku: { label: 'SKU', default: false },
    qty: { label: 'Qty required', default: true, num: true },
    rate: { label: 'Target price', default: false, num: true }
  },
  // A receipt records what physically arrived, so ordered/accepted/rejected
  // matter and money does not — there is no rate or amount column.
  grn: {
    item: { label: 'Item / Description', default: true },
    sku: { label: 'SKU', default: false },
    qty: { label: 'Ordered', default: true, num: true },
    received: { label: 'Received', default: true, num: true },
    accepted: { label: 'Accepted', default: true, num: true },
    rejected: { label: 'Rejected', default: true, num: true }
  }
};

// Built-in preset designs offered in the gallery (like Zoho's template
// gallery cards). Each is a partial config layered over defaultTemplate().
export const PRESETS = {
  standard: { label: 'Standard', desc: 'Clean rule-based header, bordered table.', patch: {} },
  modern: {
    label: 'Modern', desc: 'Bold color block header, striped rows.',
    patch: { headerStyle: 'block', tableStyle: 'striped', radius: 8 }
  },
  classic: {
    label: 'Classic', desc: 'Serif type, minimal rules — traditional paper trail.',
    patch: { font: 'georgia', headerStyle: 'rule', tableStyle: 'minimal', accent: '#3a3a3a' }
  },
  minimal: {
    label: 'Minimal', desc: 'Quiet, generous whitespace, no color block.',
    patch: { headerStyle: 'plain', tableStyle: 'minimal', accent: '#1a2333', headerBg: '#ffffff' }
  }
};

// The full default template — every knob the editor exposes.
export function defaultTemplate(module) {
  const titles = {
    po: 'PURCHASE ORDER', pr: 'PURCHASE REQUISITION', invoice: 'BILL',
    payment: 'PAYMENT REMITTANCE', credit: 'VENDOR CREDIT NOTE', statement: 'VENDOR STATEMENT',
    rfq: 'REQUEST FOR QUOTATION', grn: 'GOODS RECEIPT NOTE'
  };
  const accents = {
    po: '#2a78d6', pr: '#4a3aa7', invoice: '#0f9d58',
    payment: '#d97a1a', credit: '#c0392b', statement: '#199a8e',
    rfq: '#7b4bc9', grn: '#0d7f8c'
  };
  const cols = MODULE_COLUMNS[module] || MODULE_COLUMNS.po;
  return {
    module,
    title: titles[module] || 'DOCUMENT',
    paper: 'A4',
    orientation: 'portrait',
    margin: 16,           // mm
    font: 'system',
    accent: accents[module] || '#2a78d6',
    textColor: '#1a2333',
    headerBg: '#f4f6f9',
    headerStyle: 'rule',   // 'rule' | 'block' | 'plain'
    tableStyle: 'bordered', // 'bordered' | 'striped' | 'minimal'
    radius: 0,             // mm corner radius on the page card look (preview only)
    columns: Object.fromEntries(Object.keys(cols).map(k => [k, cols[k].default])),
    blocks: {
      logo: true,
      orgAddress: true,
      docMeta: true,
      billTo: true,
      lineTable: true,
      // A goods receipt carries no money, so a totals block would be meaningless.
      totals: module !== 'grn',
      notes: true,
      terms: true,
      // Receipts and RFQs are physically signed off far more often than the
      // financial documents, so the signature block is on by default for them.
      signature: module === 'grn' || module === 'rfq',
      bankDetails: false,
      watermark: false,
      pageNumbers: false,
      footerText: false
    },
    watermarkText: 'COPY',
    notesText: '',
    termsText: {
      po: 'Goods must be delivered by the agreed delivery date. Invoice to reference this PO number.',
      rfq: 'Quotations must remain valid for 30 days. Submit pricing inclusive of delivery to the address above.',
      grn: 'Quantities recorded above reflect goods physically received and inspected at the delivery point. Rejected items remain the supplier’s property pending collection.'
    }[module] || '',
    bankText: '',
    footerText: ''
  };
}

// Merge a preset patch over the module default.
export function presetTemplate(module, presetKey) {
  const base = defaultTemplate(module);
  const preset = PRESETS[presetKey] || PRESETS.standard;
  return { ...base, ...preset.patch };
}

async function loadTemplate(module) {
  const list = await api('GET', `/api/pdf-templates?module=${module}`).catch(() => []);
  const chosen = list.find(t => t.IsDefault === 'true') || list[0];
  const base = defaultTemplate(module);
  if (chosen) {
    try {
      const cfg = JSON.parse(chosen.ConfigJson || '{}');
      return { ...base, ...cfg, columns: { ...base.columns, ...(cfg.columns || {}) }, blocks: { ...base.blocks, ...(cfg.blocks || {}) } };
    } catch {}
  }
  return base;
}

// ---- The single render function (editor preview + print both use this) ----
// data = { title, number, meta:[{k,v}], party:{label,name,lines[]}, lines:[{item,sku,qty,rate,amount,expense,tax}], totals:[{k,v,grand}] }
export function renderDocument(tpl, data) {
  const org = state.org || {};
  const s = state.orgSettings || {};
  const paper = PAPER_SIZES[tpl.paper] || PAPER_SIZES.A4;
  const isLandscape = tpl.orientation === 'landscape';
  const pageW = isLandscape ? paper.h : paper.w;
  const pageH = isLandscape ? paper.w : paper.h;
  const font = (FONTS[tpl.font] || FONTS.system).stack;
  // A stored logo that isn't a usable image source would render as the browser's
  // broken-image glyph on the printed page, so anything unrecognised is dropped.
  const rawLogo = s.logoDataUri || '';
  const logo = /^(data:image\/|https?:\/\/)/i.test(rawLogo) ? rawLogo : '';
  const cols = MODULE_COLUMNS[tpl.module] || MODULE_COLUMNS.po;
  const activeCols = Object.keys(cols).filter(k => tpl.columns[k]);
  const headerStyle = tpl.headerStyle || 'rule';
  const tableStyle = tpl.tableStyle || 'bordered';

  const cell = (row, colId) => {
    switch (colId) {
      case 'item': return esc(row.item || '');
      case 'sku': return esc(row.sku || '');
      case 'account': return esc(row.account || '');
      case 'date': return esc(row.date || '');
      case 'expense': return `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#eef0f4;">${esc(row.expense || 'OpEx')}</span>`;
      case 'qty': return esc(String(row.qty ?? ''));
      case 'received': return esc(String(row.received ?? ''));
      case 'accepted': return esc(String(row.accepted ?? ''));
      // Rejected quantities are the exception a receiver is looking for, so a
      // non-zero value is coloured; zero stays quiet.
      case 'rejected': return Number(row.rejected || 0) > 0
        ? `<span style="color:#c0392b; font-weight:700;">${esc(String(row.rejected))}</span>`
        : esc(String(row.rejected ?? 0));
      case 'rate': return currency(row.rate || 0);
      case 'tax': return `${Number(row.tax || 0)}%`;
      case 'debit': return row.debit ? currency(row.debit) : '';
      case 'credit_amt': return row.credit_amt ? currency(row.credit_amt) : '';
      case 'amount': return currency(row.amount || 0);
      default: return '';
    }
  };

  const B = tpl.blocks;

  const rowBg = (i) => tableStyle === 'striped' && i % 2 === 1 ? 'background:#f7f8fb;' : '';
  const cellBorder = tableStyle === 'minimal' ? '' : 'border-bottom:1px solid #e3e7ee;';
  const headBorder = tableStyle === 'minimal' ? `border-bottom:2px solid ${esc(tpl.accent)};` : `border-bottom:2px solid ${esc(tpl.accent)};`;
  const headBg = tableStyle === 'bordered' ? esc(tpl.headerBg) : 'transparent';

  const headerHTML = () => {
    if (headerStyle === 'block') {
      return `
      <div style="background:${esc(tpl.accent)}; color:#fff; padding:16px 18px; border-radius:${tpl.radius || 0}px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="display:flex; gap:14px; align-items:flex-start;">
          ${B.logo && logo ? `<img src="${logo}" alt="" onerror="this.style.display=&quot;none&quot;" style="max-height:56px; max-width:140px; object-fit:contain; background:#fff; border-radius:4px; padding:2px;">` : ''}
          <div>
            <div style="font-size:16pt; font-weight:800;">${esc(org.Name || 'Organization')}</div>
            ${B.orgAddress ? `<div style="font-size:8.5pt; opacity:.9; line-height:1.5; margin-top:2px;">
              ${esc(s.address || '')}${s.phone ? '<br>' + esc(s.phone) : ''}${s.country ? '<br>' + esc(s.country) : ''}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18pt; font-weight:800; letter-spacing:1px;">${esc(tpl.title)}</div>
          ${data.number ? `<div style="font-size:9.5pt; opacity:.9; margin-top:4px;">${esc(data.number)}</div>` : ''}
        </div>
      </div>`;
    }
    if (headerStyle === 'plain') {
      return `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; margin-bottom:20px;">
        <div style="display:flex; gap:14px; align-items:flex-start;">
          ${B.logo && logo ? `<img src="${logo}" alt="" onerror="this.style.display=&quot;none&quot;" style="max-height:56px; max-width:140px; object-fit:contain;">` : ''}
          <div>
            <div style="font-size:15pt; font-weight:700; color:${esc(tpl.textColor)};">${esc(org.Name || 'Organization')}</div>
            ${B.orgAddress ? `<div style="font-size:8.5pt; color:#888; line-height:1.5; margin-top:2px;">
              ${esc(s.address || '')}${s.phone ? '<br>' + esc(s.phone) : ''}${s.country ? '<br>' + esc(s.country) : ''}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15pt; font-weight:600; letter-spacing:1.5px; color:#888; text-transform:uppercase;">${esc(tpl.title)}</div>
          ${data.number ? `<div style="font-size:9.5pt; color:#999; margin-top:4px;">${esc(data.number)}</div>` : ''}
        </div>
      </div>`;
    }
    // 'rule' — the original bordered header.
    return `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid ${esc(tpl.accent)}; padding-bottom:12px; margin-bottom:20px;">
        <div style="display:flex; gap:14px; align-items:flex-start;">
          ${B.logo && logo ? `<img src="${logo}" alt="" onerror="this.style.display=&quot;none&quot;" style="max-height:64px; max-width:160px; object-fit:contain;">` : ''}
          <div>
            <div style="font-size:17pt; font-weight:800; color:${esc(tpl.accent)};">${esc(org.Name || 'Organization')}</div>
            ${B.orgAddress ? `<div style="font-size:9pt; color:#666; line-height:1.5; margin-top:2px;">
              ${esc(s.address || '')}${s.phone ? '<br>' + esc(s.phone) : ''}${s.country ? '<br>' + esc(s.country) : ''}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20pt; font-weight:800; letter-spacing:1px; color:${esc(tpl.accent)};">${esc(tpl.title)}</div>
          ${data.number ? `<div style="font-size:10pt; color:#666; margin-top:4px;">${esc(data.number)}</div>` : ''}
        </div>
      </div>`;
  };

  return `
    <div class="pf-page" style="
      width:${pageW}mm; min-height:${pageH}mm; padding:${tpl.margin}mm;
      background:#fff; color:${esc(tpl.textColor)}; font-family:${font};
      font-size:11pt; box-sizing:border-box; margin:0 auto; position:relative; overflow:hidden;">

      ${B.watermark ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0;">
        <div style="font-size:72pt; font-weight:800; color:${esc(tpl.accent)}; opacity:0.08; transform:rotate(-30deg); white-space:nowrap;">${esc(tpl.watermarkText || 'COPY')}</div>
      </div>` : ''}

      <div style="position:relative; z-index:1;">
      ${headerHTML()}

      ${B.docMeta && data.meta?.length ? `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; margin-bottom:18px;">
        ${data.meta.map(m => `<div><div style="font-size:8pt; text-transform:uppercase; letter-spacing:.5px; color:#999;">${esc(m.k)}</div>
          <div style="font-weight:600;">${esc(m.v)}</div></div>`).join('')}
      </div>` : ''}

      ${B.billTo && data.party ? `<div style="margin-bottom:18px;">
        <div style="font-size:8pt; text-transform:uppercase; letter-spacing:.5px; color:#999;">${esc(data.party.label || 'To')}</div>
        <div style="font-weight:700; font-size:11pt;">${esc(data.party.name || '')}</div>
        ${(data.party.lines || []).map(l => `<div style="font-size:9.5pt; color:#555;">${esc(l)}</div>`).join('')}
      </div>` : ''}

      ${B.lineTable ? `<table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <thead><tr>${activeCols.map(c => `<th style="text-align:${cols[c].num ? 'right' : 'left'}; background:${headBg}; padding:7px 9px; font-size:8.5pt; text-transform:uppercase; letter-spacing:.5px; color:#555; ${headBorder}">${esc(cols[c].label)}</th>`).join('')}</tr></thead>
        <tbody>${(data.lines || []).map((row, i) => `<tr style="${rowBg(i)}">${activeCols.map(c => `<td style="text-align:${cols[c].num ? 'right' : 'left'}; padding:7px 9px; ${cellBorder} font-size:10pt;">${cell(row, c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>` : ''}

      ${B.totals && data.totals?.length ? `<div style="display:flex; justify-content:flex-end; margin-bottom:24px;">
        <table style="width:260px;">
          ${data.totals.map(t => `<tr><td style="padding:4px 9px; ${t.grand ? `font-size:12pt; font-weight:800; color:${esc(tpl.accent)}; border-top:2px solid ${esc(tpl.accent)};` : 'color:#555;'}">${esc(t.k)}</td>
            <td style="padding:4px 9px; text-align:right; font-variant-numeric:tabular-nums; ${t.grand ? `font-size:12pt; font-weight:800; color:${esc(tpl.accent)}; border-top:2px solid ${esc(tpl.accent)};` : 'font-weight:600;'}">${esc(t.v)}</td></tr>`).join('')}
        </table>
      </div>` : ''}

      ${B.notes && (tpl.notesText || data.notes) ? `<div style="margin-bottom:14px;"><div style="font-size:8pt; text-transform:uppercase; letter-spacing:.5px; color:#999;">Notes</div><div style="font-size:9.5pt; color:#555;">${esc(data.notes || tpl.notesText)}</div></div>` : ''}
      ${B.terms && tpl.termsText ? `<div style="margin-bottom:14px;"><div style="font-size:8pt; text-transform:uppercase; letter-spacing:.5px; color:#999;">Terms &amp; conditions</div><div style="font-size:9.5pt; color:#555;">${esc(tpl.termsText)}</div></div>` : ''}
      ${B.bankDetails && tpl.bankText ? `<div style="margin-bottom:14px;"><div style="font-size:8pt; text-transform:uppercase; letter-spacing:.5px; color:#999;">Bank details</div><div style="font-size:9.5pt; color:#555; white-space:pre-line;">${esc(tpl.bankText)}</div></div>` : ''}

      ${B.signature ? `<div style="display:flex; justify-content:space-between; margin-top:48px;">
        <div style="text-align:center;"><div style="border-top:1px solid #999; width:180px; padding-top:4px; font-size:9pt; color:#666;">Prepared by</div></div>
        <div style="text-align:center;"><div style="border-top:1px solid #999; width:180px; padding-top:4px; font-size:9pt; color:#666;">Authorized signature</div></div>
      </div>` : ''}

      ${B.footerText && tpl.footerText ? `<div style="position:absolute; left:0; right:0; bottom:${Math.max(2, tpl.margin - 8)}mm; text-align:center; font-size:8.5pt; color:#999; border-top:1px solid #eee; padding-top:6px;">${esc(tpl.footerText)}</div>` : ''}
      ${B.pageNumbers ? `<div style="position:absolute; right:0; bottom:${Math.max(2, tpl.margin - 8)}mm; font-size:8pt; color:#aaa;">Page 1 of 1</div>` : ''}
      </div>
    </div>`;
}

export function printDocument(tpl, data) {
  const paper = PAPER_SIZES[tpl.paper] || PAPER_SIZES.A4;
  const size = tpl.orientation === 'landscape' ? `${paper.label} landscape` : paper.label;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(data.number || tpl.title)}</title>
    <style>
      @page { size: ${size}; margin: 0; }
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#e9ecf1; }
      .pf-page { box-shadow:0 2px 12px rgba(0,0,0,.15); }
      @media print { body { background:#fff; } .pf-page { box-shadow:none; } }
    </style></head><body>
      ${renderDocument(tpl, data)}
      <script>window.onload=()=>{setTimeout(()=>window.print(),200);};<\/script>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return toast('Please allow pop-ups to open the document.', 'warning');
  w.document.write(html); w.document.close();
}

/* ---- Record → document builders ----
   Each returns { tpl, data, record, side } WITHOUT rendering, so the on-screen
   record view and the printed PDF are driven by one identical payload. If these
   ever diverge, the preview stops being a preview — hence the split. `side`
   carries the extra fields the sidebar shows but the paper deliberately omits. */

export async function buildPODoc(poId) {
  const [{ po, items }, tpl] = await Promise.all([api('GET', `/api/pos/${poId}`), loadTemplate('po')]);
  const supplier = state.cache.suppliers.find(s => s.ROWID === po.SupplierID);
  const itemsById = Object.fromEntries(state.cache.items.map(i => [i.ROWID, i]));
  const lines = items.map(l => ({
    item: itemsById[l.ItemID]?.Name || `#${l.ItemID}`, sku: itemsById[l.ItemID]?.SKU || '',
    qty: Number(l.Quantity), rate: Number(l.UnitPrice), tax: Number(l.TaxPct || 0),
    amount: Number(l.Quantity) * Number(l.UnitPrice)
  }));
  return {
    tpl, record: po, module: 'po', recordType: 'PO', id: poId,
    data: {
      title: tpl.title, number: po.PONumber,
      meta: [{ k: 'Date', v: fmtDate(po.CREATEDTIME) }, { k: 'Status', v: statusLabel(po.Status) }, { k: 'Payment terms', v: po.Terms || '—' }],
      party: { label: 'Vendor', name: supplier?.Name || '—', lines: [supplier?.ContactEmail, supplier?.Address].filter(Boolean) },
      notes: po.Notes || '',
      lines, totals: [{ k: 'Subtotal', v: currency(po.TotalAmount) }, { k: 'Total', v: currency(po.TotalAmount), grand: true }]
    },
    side: {
      status: po.Status, amount: currency(po.TotalAmount),
      facts: [
        ['Vendor', supplier?.Name || '—'],
        ['Order date', fmtDate(po.CREATEDTIME)],
        ['Expected', po.ExpectedDate ? fmtDate(po.ExpectedDate) : '—'],
        ['Delivered', po.DeliveryDate ? fmtDate(po.DeliveryDate) : '—'],
        ['Payment terms', po.Terms || '—'],
        ['Reference', po.ReferenceNo || '—'],
        ['Vendor decision', po.VendorDecision || 'Awaiting'],
        ['Line items', String(lines.length)]
      ]
    }
  };
}

export async function buildPRDoc(prId) {
  const [{ pr, items }, tpl] = await Promise.all([api('GET', `/api/prs/${prId}`), loadTemplate('pr')]);
  const itemsById = Object.fromEntries(state.cache.items.map(i => [i.ROWID, i]));
  const lines = items.map(l => ({
    item: itemsById[l.ItemID]?.Name || `#${l.ItemID}`, expense: l.ExpenseType || 'OpEx',
    qty: Number(l.Quantity), rate: Number(l.EstimatedPrice), tax: Number(l.TaxPct || 0),
    amount: Number(l.Quantity) * Number(l.EstimatedPrice)
  }));
  const requester = state.cache.users?.find(u => u.ROWID === pr.RequestorID);
  return {
    tpl, record: pr, module: 'pr', recordType: 'PR', id: prId,
    data: {
      title: tpl.title, number: pr.PRNumber,
      meta: [{ k: 'Date', v: fmtDate(pr.CREATEDTIME) }, { k: 'Status', v: statusLabel(pr.Status) }, { k: 'Department', v: pr.Department || '—' }],
      notes: pr.Justification, lines,
      totals: [{ k: 'Total', v: currency(pr.TotalAmount), grand: true }]
    },
    side: {
      status: pr.Status, amount: currency(pr.TotalAmount),
      facts: [
        ['Requested by', requester?.FullName || '—'],
        ['Raised on', fmtDate(pr.CREATEDTIME)],
        ['Department', pr.Department || '—'],
        ['Category', pr.Category || '—'],
        ['Expense type', pr.ExpenseType || '—'],
        ['Needed by', pr.ExpectedDate ? fmtDate(pr.ExpectedDate) : '—'],
        ['Approval level', pr.ApprovalLevel != null ? String(pr.ApprovalLevel) : '—'],
        ['Line items', String(lines.length)]
      ]
    }
  };
}

export async function buildInvoiceDoc(invoiceRow) {
  const tpl = await loadTemplate('invoice');
  const supplierName = state.cache.suppliers.find(s => s.ROWID === invoiceRow._vendorId)?.Name || invoiceRow._vendorName || '—';
  const lines = [{ item: `Bill ${invoiceRow.InvoiceNumber} — PO #${invoiceRow.POID}`, amount: Number(invoiceRow.Amount || 0) }];
  return {
    tpl, record: invoiceRow, module: 'invoice', recordType: 'Invoice', id: invoiceRow.ROWID,
    data: {
      title: tpl.title, number: invoiceRow.InvoiceNumber,
      meta: [{ k: 'Bill date', v: fmtDate(invoiceRow.SupplierInvoiceDate) }, { k: 'Match status', v: statusLabel(invoiceRow.Status) }, { k: 'PO reference', v: `#${invoiceRow.POID}` }],
      party: { label: 'Vendor', name: supplierName, lines: [] },
      lines, totals: [{ k: 'Total', v: currency(invoiceRow.Amount), grand: true }]
    },
    side: {
      status: invoiceRow.Status, amount: currency(invoiceRow.Amount),
      facts: [
        ['Vendor', supplierName],
        ['Bill date', fmtDate(invoiceRow.SupplierInvoiceDate)],
        ['PO reference', `#${invoiceRow.POID}`],
        ['Match score', invoiceRow.MatchScore != null ? `${invoiceRow.MatchScore}%` : '—'],
        ['Match status', statusLabel(invoiceRow.Status)]
      ]
    }
  };
}

export async function buildPaymentDoc(paymentRow) {
  const tpl = await loadTemplate('payment');
  const lines = [{ item: `Invoice #${paymentRow.InvoiceID}`, date: fmtDate(paymentRow.PaymentDate), amount: Number(paymentRow.AmountPaid || 0) }];
  return {
    tpl, record: paymentRow, module: 'payment', recordType: 'Payment', id: paymentRow.ROWID,
    data: {
      title: tpl.title, number: paymentRow.ReferenceNumber,
      meta: [{ k: 'Date', v: fmtDate(paymentRow.PaymentDate) }, { k: 'Mode', v: paymentRow.PaymentMode }, { k: 'Invoice', v: `#${paymentRow.InvoiceID}` }],
      lines, totals: [{ k: 'Amount paid', v: currency(paymentRow.AmountPaid), grand: true }]
    },
    side: {
      status: 'Paid', amount: currency(paymentRow.AmountPaid),
      facts: [
        ['Paid on', fmtDate(paymentRow.PaymentDate)],
        ['Mode', paymentRow.PaymentMode || '—'],
        ['Reference', paymentRow.ReferenceNumber || '—'],
        ['Against bill', `#${paymentRow.InvoiceID}`]
      ]
    }
  };
}

export async function buildVendorCreditDoc(creditRow) {
  const tpl = await loadTemplate('credit');
  const supplierName = state.cache.suppliers.find(s => s.ROWID === creditRow.VendorID)?.Name || '—';
  const lines = [{ item: creditRow.Reason || 'Vendor credit', amount: Number(creditRow.CreditAmount || 0) }];
  return {
    tpl, record: creditRow, module: 'credit', recordType: 'VendorCredit', id: creditRow.ROWID,
    data: {
      title: tpl.title, number: creditRow.ReferenceNumber,
      meta: [{ k: 'Status', v: statusLabel(creditRow.Status) }, { k: 'Remaining balance', v: currency(creditRow.Balance) }],
      party: { label: 'Vendor', name: supplierName, lines: [] },
      lines, totals: [{ k: 'Credit amount', v: currency(creditRow.CreditAmount), grand: true }]
    },
    side: {
      status: creditRow.Status, amount: currency(creditRow.CreditAmount),
      facts: [
        ['Vendor', supplierName],
        ['Reference', creditRow.ReferenceNumber || '—'],
        ['Reason', creditRow.Reason || '—'],
        ['Credit amount', currency(creditRow.CreditAmount)],
        ['Remaining balance', currency(creditRow.Balance)]
      ]
    }
  };
}

export async function buildGRNDoc(grnId) {
  const [{ grn, items }, tpl] = await Promise.all([api('GET', `/api/grns/${grnId}`), loadTemplate('grn')]);
  const itemsById = Object.fromEntries(state.cache.items.map(i => [i.ROWID, i]));

  // Ordered quantities live on the PO, not the receipt, but "ordered vs
  // received" is the whole point of a GRN — so pull the order for context.
  let orderedByItem = {}, poNumber = '', supplier = null;
  if (grn.POID) {
    const po = await api('GET', `/api/pos/${grn.POID}`).catch(() => null);
    if (po) {
      poNumber = po.po?.PONumber || '';
      supplier = state.cache.suppliers.find(s => s.ROWID === po.po?.SupplierID) || null;
      (po.items || []).forEach(l => { orderedByItem[String(l.ItemID)] = Number(l.Quantity); });
    }
  }

  const lines = items.map(l => ({
    item: itemsById[l.ItemID]?.Name || `#${l.ItemID}`,
    sku: itemsById[l.ItemID]?.SKU || '',
    qty: orderedByItem[String(l.ItemID)] ?? '—',
    received: Number(l.QuantityReceived || 0),
    accepted: Number(l.QuantityAccepted || 0),
    rejected: Number(l.QuantityRejected || 0)
  }));
  const totRec = lines.reduce((s, l) => s + l.received, 0);
  const totRej = lines.reduce((s, l) => s + l.rejected, 0);
  const receiver = state.cache.users?.find(u => u.ROWID === grn.ReceivedByID);

  return {
    tpl, record: grn, module: 'grn', recordType: 'GRN', id: grnId,
    data: {
      title: tpl.title, number: grn.GRNNumber,
      meta: [
        { k: 'Received date', v: fmtDate(grn.ReceivedDate) },
        { k: 'Against order', v: poNumber ? poNumber : `#${grn.POID}` },
        { k: 'Received by', v: receiver?.FullName || '—' }
      ],
      party: supplier ? { label: 'Supplier', name: supplier.Name,
        lines: [supplier.ContactEmail, supplier.Address].filter(Boolean) } : null,
      lines, totals: []
    },
    side: {
      status: totRej > 0 ? 'Discrepancy' : 'Received',
      amount: String(totRec), amountLabel: 'Units received',
      facts: [
        ['Receipt number', grn.GRNNumber],
        ['Received on', fmtDate(grn.ReceivedDate)],
        ['Against order', poNumber || `#${grn.POID}`],
        ['Supplier', supplier?.Name || '—'],
        ['Received by', receiver?.FullName || '—'],
        ['Units accepted', String(lines.reduce((s, l) => s + l.accepted, 0))],
        ['Units rejected', String(totRej)],
        ['Line items', String(lines.length)]
      ]
    }
  };
}

export async function buildRFQDoc(rfqId) {
  const [{ rfq, items, vendorIds }, tpl] = await Promise.all([
    api('GET', `/api/rfqs/${rfqId}`), loadTemplate('rfq')
  ]);
  const itemsById = Object.fromEntries(state.cache.items.map(i => [i.ROWID, i]));
  const invited = (vendorIds || [])
    .map(id => state.cache.suppliers.find(s => s.ROWID === id)?.Name)
    .filter(Boolean);

  const lines = items.map(l => ({
    item: itemsById[l.ItemID]?.Name || `#${l.ItemID}`,
    sku: itemsById[l.ItemID]?.SKU || '',
    qty: Number(l.Quantity),
    rate: Number(l.EstimatedPrice || 0)
  }));

  const past = rfq.Deadline && new Date(rfq.Deadline) < new Date();
  return {
    tpl, record: rfq, module: 'rfq', recordType: 'RFQ', id: rfqId,
    data: {
      title: tpl.title, number: rfq.RFQNumber,
      meta: [
        { k: 'Issued', v: fmtDate(rfq.CREATEDTIME) },
        { k: 'Status', v: statusLabel(rfq.Status) },
        { k: 'Responses due', v: rfq.Deadline ? fmtDate(rfq.Deadline) : 'No deadline set' }
      ],
      // The paper goes to each vendor, so it names the buyer, not the recipient.
      party: { label: 'Quotations invited from',
        name: invited.length ? `${invited.length} vendor${invited.length === 1 ? '' : 's'}` : 'No vendors invited',
        lines: invited.slice(0, 6) },
      notes: rfq.Notes || '',
      lines, totals: []
    },
    side: {
      status: rfq.Status,
      amount: String(lines.length), amountLabel: 'Items to quote',
      facts: [
        ['RFQ number', rfq.RFQNumber],
        ['Issued', fmtDate(rfq.CREATEDTIME)],
        ['Deadline', rfq.Deadline ? fmtDate(rfq.Deadline) : '—'],
        ['Deadline passed', past ? 'Yes' : 'No'],
        ['Vendors invited', String(invited.length)],
        ['From requisition', rfq.PRID ? `#${rfq.PRID}` : '—'],
        ['Line items', String(lines.length)]
      ]
    }
  };
}

// Thin print wrappers — same payload the on-screen viewer uses.
const printFrom = (builder) => async (arg) => {
  try { const { tpl, data } = await builder(arg); printDocument(tpl, data); }
  catch (err) { toast(err.message, 'error'); }
};
export const printPO = printFrom(buildPODoc);
export const printPR = printFrom(buildPRDoc);
export const printInvoice = printFrom(buildInvoiceDoc);
export const printPayment = printFrom(buildPaymentDoc);
export const printVendorCredit = printFrom(buildVendorCreditDoc);
export const printGRN = printFrom(buildGRNDoc);
export const printRFQ = printFrom(buildRFQDoc);

// Sample data for the editor preview.
export function sampleData(module) {
  if (module === 'payment') {
    return {
      number: 'TXN-004521',
      meta: [{ k: 'Date', v: 'Jul 16, 2026' }, { k: 'Mode', v: 'Bank Transfer' }, { k: 'Invoice', v: '#INV-000078' }],
      lines: [{ item: 'Bill INV-000078', date: 'Jul 10, 2026', amount: 1980 }],
      totals: [{ k: 'Amount paid', v: currency(1980), grand: true }]
    };
  }
  if (module === 'credit') {
    return {
      number: 'VC-000012',
      meta: [{ k: 'Status', v: 'Open' }, { k: 'Remaining balance', v: currency(320) }],
      party: { label: 'Vendor', name: 'Global Supplies Ltd', lines: ['b2b@globalsupplies.com'] },
      lines: [{ item: 'Damaged goods return', amount: 320 }],
      totals: [{ k: 'Credit amount', v: currency(320), grand: true }]
    };
  }
  if (module === 'statement') {
    return {
      number: 'STMT-JUL-2026',
      meta: [{ k: 'Period', v: 'Jul 1 – Jul 31, 2026' }, { k: 'Currency', v: state.orgSettings?.currency || 'USD' }],
      party: { label: 'Vendor', name: 'Global Supplies Ltd', lines: ['b2b@globalsupplies.com'] },
      lines: [
        { item: 'Bill INV-000078', date: 'Jul 10, 2026', debit: 1980, credit_amt: 0, amount: 1980 },
        { item: 'Payment TXN-004521', date: 'Jul 16, 2026', debit: 0, credit_amt: 1980, amount: 0 }
      ],
      totals: [{ k: 'Closing balance', v: currency(0), grand: true }]
    };
  }
  const common = {
    number: module === 'po' ? 'PO-000123' : module === 'pr' ? 'PR-000045' : 'INV-000078',
    meta: [{ k: 'Date', v: 'Jul 16, 2026' }, { k: 'Status', v: 'Approved' }, { k: 'Payment terms', v: 'Net 30' }],
    party: { label: module === 'invoice' ? 'Vendor' : 'Vendor', name: 'Global Supplies Ltd', lines: ['b2b@globalsupplies.com', '123 Trade Ave, Colombo'] },
    lines: [
      { item: 'Commercial Blender', sku: 'KE-001', expense: 'CapEx', qty: 2, rate: 620, tax: 5, amount: 1240 },
      { item: 'Bath Towels (dozen)', sku: 'HK-001', expense: 'OpEx', qty: 10, rate: 42, tax: 0, amount: 420 },
      { item: 'Guest Toiletry Kit', sku: 'HK-002', expense: 'OpEx', qty: 100, rate: 3.2, tax: 0, amount: 320 }
    ],
    totals: [{ k: 'Subtotal', v: currency(1980) }, { k: 'Total', v: currency(1980), grand: true }]
  };
  return common;
}

/* =============================================================
   Record viewer — the Zoho-Books-style detail screen.

   The centre panel is the REAL document produced by renderDocument(), the same
   call the PDF path makes with the same payload, so "preview" is literal: what
   is on screen is what prints. The sidebar carries workflow context (status,
   dates, attachments) that belongs to the app but not on the paper.
   ============================================================= */

// A4 at 96dpi is ~794px; the panel is usually narrower, so the page is scaled
// to fit rather than clipped or side-scrolled.
function fitPaper(scope) {
  const stage = scope.querySelector('.recview-stage');
  const scaler = scope.querySelector('.recview-scale');
  const page = scaler?.querySelector('.pf-page');
  if (!stage || !scaler || !page) return;

  // Measure at natural size, then scale.
  scaler.style.transform = 'none';
  const natural = page.getBoundingClientRect();
  const avail = stage.clientWidth - 40; // breathing room either side
  const scale = Math.min(1, avail / natural.width);

  scaler.style.transform = `scale(${scale})`;
  // A transformed element still reserves its UNSCALED box, so the wrapper is
  // pinned to the post-scale size. Using the natural width here would leave a
  // 794px box in a narrower stage, and centring would push the page off-frame.
  scaler.style.width = `${natural.width * scale}px`;
  scaler.style.height = `${natural.height * scale}px`;
  scope.style.setProperty('--doc-scale', scale.toFixed(4));
}

export function openRecordView({ doc, subtitle, actions = [], onMount }) {
  const { tpl, data, side = {}, recordType, id } = doc;

  const facts = (side.facts || [])
    .map(([k, v]) => `<div class="recfact"><dt>${esc(k)}</dt><dd>${esc(String(v ?? '—'))}</dd></div>`)
    .join('');

  const actionBtns = actions.map((a, i) =>
    `<button class="btn ${a.primary ? 'btn-primary' : 'btn-outline'} btn-sm" data-rec-action="${i}">${esc(a.label)}</button>`
  ).join('');

  openPage({
    title: data.number || tpl.title,
    body: `
      <div class="recview">
        <div class="recview-main">
          <div class="recview-bar">
            <div class="recview-ident">
              <span class="recview-no">${esc(data.number || tpl.title)}</span>
              ${side.status ? badge(side.status) : ''}
              ${subtitle ? `<span class="recview-sub">${esc(subtitle)}</span>` : ''}
            </div>
            <div class="recview-acts">
              ${actionBtns}
              <button class="btn btn-outline btn-sm" id="rec-print">Print</button>
              <button class="btn btn-primary btn-sm" id="rec-pdf">Download PDF</button>
            </div>
          </div>
          <div class="recview-stage">
            <div class="recview-scale">${renderDocument(tpl, data)}</div>
          </div>
        </div>

        <aside class="recview-side">
          ${side.amount ? `<div class="recsum">
            <div class="recsum-label">${esc(side.amountLabel || 'Total')}</div>
            <div class="recsum-value">${esc(side.amount)}</div>
          </div>` : ''}
          <div class="recside-block">
            <h4>Details</h4>
            <dl class="recfacts">${facts || '<div class="cell-muted">No details</div>'}</dl>
          </div>
          <div class="recside-block">
            <h4>Attachments</h4>
            <div id="rec-att-zone"></div>
          </div>
          <div id="rec-extra"></div>
        </aside>
      </div>`,
    onOpen: (body) => {
      const scope = body.querySelector('.recview');

      // Both buttons re-render from the same payload as the screen.
      body.querySelector('#rec-pdf')?.addEventListener('click', () => printDocument(tpl, data));
      body.querySelector('#rec-print')?.addEventListener('click', () => printDocument(tpl, data));

      actions.forEach((a, i) => {
        body.querySelector(`[data-rec-action="${i}"]`)?.addEventListener('click', () => a.onClick({ close: closePage, doc }));
      });

      fitPaper(scope);
      // Re-fit when the panel resizes (sidebar collapse, window resize, rotate).
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => fitPaper(scope));
        ro.observe(scope.querySelector('.recview-stage'));
        scope._ro = ro;
      } else {
        window.addEventListener('resize', () => fitPaper(scope));
      }

      if (onMount) onMount({ body, attachZone: body.querySelector('#rec-att-zone'),
                             extra: body.querySelector('#rec-extra'), doc, refit: () => fitPaper(scope) });
    }
  });
}

/* Convenience: fetch + open in one call, with a loading state while the
   template and record are in flight. */
export async function showRecord(builder, arg, opts = {}) {
  openPage({ title: 'Loading…', body: '<div class="recview-loading"><div class="recview-skel"></div></div>' });
  try {
    const doc = await builder(arg);
    openRecordView({ doc, ...opts });
  } catch (err) {
    toast(err.message, 'error');
    closePage();
  }
}
