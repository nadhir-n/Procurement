// Master data (vendors, items, budgets), payables extras, custom modules, settings.
import { api, state, currency, fmtDate, refreshCaches, loadReference } from './api.js?v=48';
import { esc, toast, badge, openModal, closeModal, openPage, closePage, renderTable, listPage, wireListPage, customFieldsHTML, collectCustomFields, applyStoredTheme } from './ui.js?v=48';
import * as docs from './documents.js?v=48';
import { startTour } from './tour.js?v=48';
import { openRecord, factsHTML, linesHTML, emptyHTML, sectionHTML } from './recordview.js?v=48';
import { itemMeta } from './itempicker.js?v=48';

/* =========================================================
   VENDORS (Suppliers)
   ========================================================= */
export async function viewVendors(root, params) {
  root.innerHTML = listPage({
    title: 'Vendors',
    desc: 'The supplier directory used across RFQs, purchase orders and billing.',
    actionsHtml: `<button class="btn btn-outline" id="btn-merge">Merge vendors</button><button class="btn btn-primary" id="btn-new">+ New vendor</button>`
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/suppliers').catch(() => []); state.cache.suppliers = rows; };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'Name', label: 'Vendor', render: r => `<span class="cell-strong">${esc(r.Name)}</span>` },
        { key: 'ContactEmail', label: 'Email' },
        { key: 'Phone', label: 'Phone', render: r => esc(r.Phone || '—') },
        { key: 'Rating', label: 'Rating', num: true, render: r => `${Number(r.Rating || 0).toFixed(1)} ★` },
        { key: 'Status', label: 'Status', render: r => badge(r.Status || 'Active') }
      ],
      rows: filtered,
      empty: { icon: '🏭', title: 'No vendors yet', sub: 'Add the suppliers you buy from — they power RFQs, POs and invoices.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-open="${r.ROWID}">Open</button>
        <button class="btn btn-ghost btn-sm" data-manage="${r.ROWID}">Manage</button>
        <button class="btn btn-ghost btn-sm" data-portal="${r.ROWID}" title="Invite to the vendor portal">Portal</button>
        <button class="btn btn-ghost btn-sm" data-edit="${r.ROWID}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${r.ROWID}" data-name="${esc(r.Name)}">Delete</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['Name', 'ContactEmail', 'Phone'] });

  // Full-page Zoho-style vendor form with tabbed sections:
  // Other Details / Address / Contact Persons / Bank Details / Custom Fields.
  const openVendorModal = async (vendor) => {
    const cfFields = await api('GET', '/api/custom-fields?module=vendors').catch(() => []);
    // Contact / bank rows are edited in-memory and synced on save.
    let contacts = [], banks = [];
    const removedContacts = [], removedBanks = [];
    if (vendor) {
      [contacts, banks] = await Promise.all([
        api('GET', `/api/suppliers/${vendor.ROWID}/contacts`).catch(() => []),
        api('GET', `/api/suppliers/${vendor.ROWID}/bank`).catch(() => [])
      ]);
    }

    const contactRows = () => contacts.length === 0
      ? '<tr><td colspan="5" class="cell-muted" style="padding:14px;">No contact persons yet.</td></tr>'
      : contacts.map((c, i) => `<tr>
          <td>${esc(c.Name)}</td><td>${esc(c.Designation || '—')}</td>
          <td>${esc(c.Email || '—')}</td><td>${esc(c.Phone || '—')}</td>
          <td class="num"><button type="button" class="btn btn-danger btn-sm" data-rm-contact="${i}">Remove</button></td></tr>`).join('');
    const bankRows = () => banks.length === 0
      ? '<tr><td colspan="5" class="cell-muted" style="padding:14px;">No bank accounts yet.</td></tr>'
      : banks.map((b, i) => `<tr>
          <td>${esc(b.BankName)}</td><td>${esc(b.AccountName || '—')}</td>
          <td>${esc(b.AccountNumber || '—')}</td><td>${esc(b.RoutingInfo || '—')}</td>
          <td class="num"><button type="button" class="btn btn-danger btn-sm" data-rm-bank="${i}">Remove</button></td></tr>`).join('');

    openPage({
      title: vendor ? `Edit Vendor — ${vendor.Name}` : 'New Vendor',
      body: `
        <div class="form-narrow">
          <div class="zrow">
            <label class="req-label">Display Name <span class="req">*</span></label>
            <div><input type="text" id="v-name" value="${esc(vendor?.Name || '')}" placeholder="Vendor / company name"></div>
          </div>
          <div class="zrow">
            <label class="req-label">Email Address <span class="req">*</span></label>
            <div><input type="email" id="v-email" value="${esc(vendor?.ContactEmail || '')}" placeholder="vendor@company.com"></div>
          </div>
          <div class="zrow">
            <label>Phone</label>
            <div><input type="text" id="v-phone" value="${esc(vendor?.Phone || '')}" placeholder="Work phone"></div>
          </div>

          <div class="form-tabs" id="v-tabs">
            <button type="button" class="form-tab active" data-vtab="other">Other Details</button>
            <button type="button" class="form-tab" data-vtab="address">Address</button>
            <button type="button" class="form-tab" data-vtab="contacts">Contact Persons</button>
            <button type="button" class="form-tab" data-vtab="bank">Bank Details</button>
            ${cfFields.length ? '<button type="button" class="form-tab" data-vtab="custom">Custom Fields</button>' : ''}
          </div>

          <div data-vpanel="other">
            <div class="zrow"><label>Rating (1–5)</label>
              <div><input type="number" id="v-rating" min="1" max="5" step="0.5" value="${vendor?.Rating ?? 5}"></div></div>
            <div class="zrow"><label>Status</label>
              <div><select id="v-status"><option ${vendor?.Status !== 'Inactive' ? 'selected' : ''}>Active</option><option ${vendor?.Status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div></div>
            ${state.orgSettings.multiProperty !== false ? `
            <div class="zrow"><label>Vendor scope</label>
              <div>
                <select id="v-scope">
                  <option value="group" ${vendor?.Scope !== 'property' ? 'selected' : ''}>Group — visible to all properties</option>
                  <option value="property" ${vendor?.Scope === 'property' ? 'selected' : ''}>Property — a single property's local vendor</option>
                </select>
                <div class="help">Group vendors (linens, F&amp;B distributors) serve every property; property vendors are local to one.</div>
              </div></div>
            <div class="zrow" id="v-property-row" style="${vendor?.Scope === 'property' ? '' : 'display:none;'}"><label>Property</label>
              <div><select id="v-property"><option value="">— Select —</option>
                ${state.cache.properties.map(p => `<option value="${p.ROWID}" ${vendor?.PropertyID === p.ROWID ? 'selected' : ''}>${esc(p.Name)}</option>`).join('')}</select></div></div>
            ` : ''}
          </div>

          <div data-vpanel="address" style="display:none;">
            <div class="zrow wide"><label>Business Address</label>
              <div><textarea id="v-address" rows="3" placeholder="Street, city, postal code">${esc(vendor?.Address || '')}</textarea></div></div>
          </div>

          <div data-vpanel="contacts" style="display:none;">
            <table class="lines-table"><thead><tr><th>Name</th><th>Designation</th><th>Email</th><th>Phone</th><th></th></tr></thead>
              <tbody id="v-contact-rows">${contactRows()}</tbody></table>
            <div class="form-grid" style="margin-top:12px;max-width:760px;">
              <div class="field"><label>Name</label><input type="text" id="vc-name"></div>
              <div class="field"><label>Designation</label><input type="text" id="vc-desig" placeholder="e.g. Account Manager"></div>
              <div class="field"><label>Email</label><input type="email" id="vc-email"></div>
              <div class="field"><label>Phone</label><input type="text" id="vc-phone"></div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="vc-add" style="margin-top:6px;">+ Add Contact Person</button>
          </div>

          <div data-vpanel="bank" style="display:none;">
            <table class="lines-table"><thead><tr><th>Bank</th><th>Account Name</th><th>Account #</th><th>Routing / IFSC / SWIFT</th><th></th></tr></thead>
              <tbody id="v-bank-rows">${bankRows()}</tbody></table>
            <div class="form-grid" style="margin-top:12px;max-width:760px;">
              <div class="field"><label>Bank name</label><input type="text" id="vb-name"></div>
              <div class="field"><label>Account name</label><input type="text" id="vb-accname"></div>
              <div class="field"><label>Account number</label><input type="text" id="vb-accno"></div>
              <div class="field"><label>Routing / IFSC / SWIFT</label><input type="text" id="vb-routing"></div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="vb-add" style="margin-top:6px;">+ Add Bank Account</button>
          </div>

          ${cfFields.length ? `<div data-vpanel="custom" style="display:none;">
            <div class="form-grid" style="max-width:760px;">${customFieldsHTML(cfFields, vendor?.CustomFieldsJson)}</div>
          </div>` : ''}
        </div>`,
      footer: `<button class="btn btn-primary" id="m-save">${vendor ? 'Save' : 'Save Vendor'}</button>
               <button class="btn btn-outline" id="m-cancel">Cancel</button>`,
      onOpen(body) {
        // Tabs
        body.querySelectorAll('.form-tab').forEach(t => t.addEventListener('click', () => {
          body.querySelectorAll('.form-tab').forEach(x => x.classList.toggle('active', x === t));
          body.querySelectorAll('[data-vpanel]').forEach(p =>
            p.style.display = p.dataset.vpanel === t.dataset.vtab ? 'block' : 'none');
        }));

        // Vendor scope: reveal the property picker only for property-scoped vendors
        const scopeSel = body.querySelector('#v-scope');
        if (scopeSel) scopeSel.addEventListener('change', () => {
          body.querySelector('#v-property-row').style.display = scopeSel.value === 'property' ? '' : 'none';
        });

        // In-memory contact / bank editing
        const redraw = () => {
          body.querySelector('#v-contact-rows').innerHTML = contactRows();
          body.querySelector('#v-bank-rows').innerHTML = bankRows();
        };
        body.addEventListener('click', e => {
          const rc = e.target.closest('[data-rm-contact]');
          if (rc) { const c = contacts.splice(Number(rc.dataset.rmContact), 1)[0]; if (c?.ROWID) removedContacts.push(c.ROWID); redraw(); }
          const rb = e.target.closest('[data-rm-bank]');
          if (rb) { const b = banks.splice(Number(rb.dataset.rmBank), 1)[0]; if (b?.ROWID) removedBanks.push(b.ROWID); redraw(); }
        });
        body.querySelector('#vc-add').addEventListener('click', () => {
          const Name = body.querySelector('#vc-name').value.trim();
          if (!Name) return toast('Contact name is required.', 'warning');
          contacts.push({ Name, Designation: body.querySelector('#vc-desig').value.trim(),
            Email: body.querySelector('#vc-email').value.trim(), Phone: body.querySelector('#vc-phone').value.trim() });
          ['#vc-name', '#vc-desig', '#vc-email', '#vc-phone'].forEach(s => body.querySelector(s).value = '');
          redraw();
        });
        body.querySelector('#vb-add').addEventListener('click', () => {
          const BankName = body.querySelector('#vb-name').value.trim();
          const AccountNumber = body.querySelector('#vb-accno').value.trim();
          if (!BankName || !AccountNumber) return toast('Bank name and account number are required.', 'warning');
          banks.push({ BankName, AccountNumber, AccountName: body.querySelector('#vb-accname').value.trim(),
            RoutingInfo: body.querySelector('#vb-routing').value.trim() });
          ['#vb-name', '#vb-accname', '#vb-accno', '#vb-routing'].forEach(s => body.querySelector(s).value = '');
          redraw();
        });

        document.getElementById('m-cancel').addEventListener('click', closePage);
        document.getElementById('m-save').addEventListener('click', async () => {
          const Name = body.querySelector('#v-name').value.trim();
          const ContactEmail = body.querySelector('#v-email').value.trim();
          if (!Name || !ContactEmail) return toast('Display name and email are required.', 'warning');

          // Module preferences (Settings → Module Settings → Vendors)
          const vPrefs = (state.orgSettings.modulePrefs || {}).vendors || {};
          if (!vPrefs.allowDuplicateNames) {
            const dup = state.cache.suppliers.find(s => s.Name.toLowerCase() === Name.toLowerCase() && s.ROWID !== vendor?.ROWID);
            if (dup) return toast(`A vendor named "${Name}" already exists. Enable duplicates in Settings → Vendors, or pick another name.`, 'warning');
          }
          if (vPrefs.requirePhone && !body.querySelector('#v-phone').value.trim())
            return toast('Phone is mandatory for vendors (Settings → Vendors).', 'warning');
          const payload = {
            Name, ContactEmail,
            Phone: body.querySelector('#v-phone').value.trim(),
            Address: body.querySelector('#v-address').value.trim(),
            Rating: Number(body.querySelector('#v-rating').value || 5),
            Status: body.querySelector('#v-status').value,
            Scope: body.querySelector('#v-scope')?.value || 'group',
            PropertyID: body.querySelector('#v-scope')?.value === 'property' ? (body.querySelector('#v-property')?.value || '') : '',
            CustomFields: collectCustomFields(body)
          };
          const btn = document.getElementById('m-save'); btn.disabled = true; btn.textContent = 'Saving…';
          try {
            let vendorId = vendor?.ROWID;
            if (vendor) await api('PUT', `/api/suppliers/${vendor.ROWID}`, payload);
            else { const created = await api('POST', '/api/suppliers', payload); vendorId = created.ROWID || created.id || created?.supplier?.ROWID; }
            // Sync contact persons + bank accounts
            if (vendorId) {
              for (const c of contacts.filter(x => !x.ROWID)) await api('POST', `/api/suppliers/${vendorId}/contacts`, c).catch(() => {});
              for (const b of banks.filter(x => !x.ROWID)) await api('POST', `/api/suppliers/${vendorId}/bank`, b).catch(() => {});
              for (const id of removedContacts) await api('DELETE', `/api/suppliers/${vendorId}/contacts/${id}`).catch(() => {});
              for (const id of removedBanks) await api('DELETE', `/api/suppliers/${vendorId}/bank/${id}`).catch(() => {});
            }
            toast(vendor ? 'Vendor updated.' : `Vendor "${Name}" added.`);
            closePage(); await load(); apply();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = vendor ? 'Save' : 'Save Vendor'; }
        });
      }
    });
  };

  document.getElementById('btn-new').addEventListener('click', () => openVendorModal(null));
  document.getElementById('btn-merge').addEventListener('click', () => openMergeVendors(rows, async () => { await load(); apply(); }));
  document.getElementById('list-body').addEventListener('click', async e => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) return openVendorRecord(openBtn.dataset.open, (v) => openVendorModal(v));
    const manageBtn = e.target.closest('[data-manage]');
    if (manageBtn) return openVendorManage(rows.find(r => r.ROWID === manageBtn.dataset.manage));
    const portalBtn = e.target.closest('[data-portal]');
    if (portalBtn) return inviteVendor(portalBtn.dataset.portal, () => {});
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) return openVendorModal(rows.find(r => r.ROWID === editBtn.dataset.edit));
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) return confirmDelete('vendor', delBtn.dataset.name, `/api/suppliers/${delBtn.dataset.del}`, async () => { await load(); apply(); });
  });

  await load(); apply();
  if (params?.get('new') === '1') openVendorModal(null);
}

// Vendor detail: contacts + bank accounts in one modal.
async function openVendorManage(vendor) {
  openModal({ title: `${vendor.Name}`, body: skeletonRows(3), wide: true });
  const renderBody = async () => {
    const [contacts, banks] = await Promise.all([
      api('GET', `/api/suppliers/${vendor.ROWID}/contacts`).catch(() => []),
      api('GET', `/api/suppliers/${vendor.ROWID}/bank`).catch(() => [])
    ]);
    openModal({
      title: `${vendor.Name}`,
      wide: true,
      body: `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="card-title">Contact persons</div>
          <button class="btn btn-ghost btn-sm" id="vm-add-contact">+ Add contact</button>
        </div>
        ${renderTable({
          columns: [
            { key: 'Name', label: 'Name', render: r => `<span class="cell-strong">${esc(r.Name)}</span>` },
            { key: 'Designation', label: 'Role', render: r => esc(r.Designation || '—') },
            { key: 'Email', label: 'Email', render: r => esc(r.Email || '—') },
            { key: 'Phone', label: 'Phone', render: r => esc(r.Phone || '—') }
          ],
          rows: contacts,
          empty: { title: 'No contacts', sub: 'Add the people you deal with at this vendor.' },
          rowActions: r => `<button class="btn btn-danger btn-sm" data-del-contact="${r.ROWID}">Remove</button>`
        })}
        <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px;">
          <div class="card-title">Bank accounts</div>
          <button class="btn btn-ghost btn-sm" id="vm-add-bank">+ Add bank account</button>
        </div>
        ${renderTable({
          columns: [
            { key: 'BankName', label: 'Bank', render: r => `<span class="cell-strong">${esc(r.BankName)}</span>` },
            { key: 'AccountName', label: 'Account name', render: r => esc(r.AccountName || '—') },
            { key: 'AccountNumber', label: 'Account #', render: r => esc(r.AccountNumber || '—') },
            { key: 'RoutingInfo', label: 'Routing / IFSC', render: r => esc(r.RoutingInfo || '—') }
          ],
          rows: banks,
          empty: { title: 'No bank accounts', sub: 'Add payment details for this vendor.' },
          rowActions: r => `<button class="btn btn-danger btn-sm" data-del-bank="${r.ROWID}">Remove</button>`
        })}`,
      footer: `<button class="btn btn-outline" id="m-cancel">Close</button>`
    });
    document.getElementById('m-cancel').addEventListener('click', closeModal);

    document.getElementById('vm-add-contact').addEventListener('click', () => openModal({
      title: 'Add contact',
      body: `<div class="form-grid">
        <div class="field"><label>Name <span class="req">*</span></label><input type="text" id="c-name"></div>
        <div class="field"><label>Designation</label><input type="text" id="c-desig" placeholder="e.g. Account Manager"></div>
        <div class="field"><label>Email</label><input type="email" id="c-email"></div>
        <div class="field"><label>Phone</label><input type="text" id="c-phone"></div></div>`,
      footer: `<button class="btn btn-outline" id="m-cancel2">Cancel</button><button class="btn btn-primary" id="m-save2">Add</button>`,
      onOpen(b) {
        document.getElementById('m-cancel2').addEventListener('click', renderBody);
        document.getElementById('m-save2').addEventListener('click', async () => {
          const Name = b.querySelector('#c-name').value.trim();
          if (!Name) return toast('Name is required.', 'warning');
          try {
            await api('POST', `/api/suppliers/${vendor.ROWID}/contacts`, {
              Name, Designation: b.querySelector('#c-desig').value.trim(),
              Email: b.querySelector('#c-email').value.trim(), Phone: b.querySelector('#c-phone').value.trim()
            });
            toast('Contact added.'); await renderBody();
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    }));

    document.getElementById('vm-add-bank').addEventListener('click', () => openModal({
      title: 'Add bank account',
      body: `<div class="form-grid">
        <div class="field"><label>Bank name <span class="req">*</span></label><input type="text" id="bk-name"></div>
        <div class="field"><label>Account name</label><input type="text" id="bk-accname"></div>
        <div class="field"><label>Account number <span class="req">*</span></label><input type="text" id="bk-accno"></div>
        <div class="field"><label>Routing / IFSC / SWIFT</label><input type="text" id="bk-routing"></div></div>`,
      footer: `<button class="btn btn-outline" id="m-cancel3">Cancel</button><button class="btn btn-primary" id="m-save3">Add</button>`,
      onOpen(b) {
        document.getElementById('m-cancel3').addEventListener('click', renderBody);
        document.getElementById('m-save3').addEventListener('click', async () => {
          const BankName = b.querySelector('#bk-name').value.trim();
          const AccountNumber = b.querySelector('#bk-accno').value.trim();
          if (!BankName || !AccountNumber) return toast('Bank name and account number are required.', 'warning');
          try {
            await api('POST', `/api/suppliers/${vendor.ROWID}/bank`, {
              BankName, AccountNumber, AccountName: b.querySelector('#bk-accname').value.trim(), RoutingInfo: b.querySelector('#bk-routing').value.trim()
            });
            toast('Bank account added.'); await renderBody();
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    }));

    document.querySelectorAll('[data-del-contact]').forEach(b => b.addEventListener('click', async () => {
      try { await api('DELETE', `/api/suppliers/${vendor.ROWID}/contacts/${b.dataset.delContact}`); toast('Contact removed.'); await renderBody(); }
      catch (err) { toast(err.message, 'error'); }
    }));
    document.querySelectorAll('[data-del-bank]').forEach(b => b.addEventListener('click', async () => {
      try { await api('DELETE', `/api/suppliers/${vendor.ROWID}/bank/${b.dataset.delBank}`); toast('Bank account removed.'); await renderBody(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  };
  await renderBody();
}

function openMergeVendors(vendors, onDone) {
  if (vendors.length < 2) return toast('You need at least two vendors to merge.', 'warning');
  const opts = vendors.map(v => `<option value="${v.ROWID}">${esc(v.Name)}</option>`).join('');
  openModal({
    title: 'Merge vendors',
    body: `
      <p class="cell-muted" style="margin-bottom:12px;">The loser's purchase orders, contacts and bank accounts move to the winner, then the loser is deleted. This cannot be undone.</p>
      <div class="form-grid">
        <div class="field"><label>Keep (winner)</label><select id="mg-winner">${opts}</select></div>
        <div class="field"><label>Merge &amp; delete (loser)</label><select id="mg-loser">${opts}</select></div>
      </div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-danger" id="m-merge">Merge</button>`,
    onOpen(body) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-merge').addEventListener('click', async () => {
        const WinnerID = body.querySelector('#mg-winner').value;
        const LoserID = body.querySelector('#mg-loser').value;
        if (WinnerID === LoserID) return toast('Pick two different vendors.', 'warning');
        const btn = document.getElementById('m-merge'); btn.disabled = true;
        try { const r = await api('POST', '/api/suppliers/merge', { WinnerID, LoserID }); toast(r.message || 'Merged.'); closeModal(); onDone && onDone(); }
        catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

// Shared delete confirmation modal.
function confirmDelete(kind, name, endpoint, onDone) {
  openModal({
    title: `Delete ${kind}`,
    body: `<p>Are you sure you want to delete <strong>${esc(name)}</strong>? This cannot be undone.</p>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-danger" id="m-del">Delete</button>`,
    onOpen() {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-del').addEventListener('click', async () => {
        const btn = document.getElementById('m-del'); btn.disabled = true;
        try { await api('DELETE', endpoint); toast(`${kind[0].toUpperCase() + kind.slice(1)} deleted.`); closeModal(); onDone && onDone(); }
        catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

/* =========================================================
   ITEMS
   ========================================================= */
export async function viewItems(root, params) {
  root.innerHTML = listPage({
    title: 'Items',
    desc: 'Your purchasable catalog — requisition lines are picked from here.',
    actionsHtml: `<button class="btn btn-primary" id="btn-new">+ New item</button>`
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/items').catch(() => []); state.cache.items = rows; };
  const expenseCats = () => (state.orgSettings.categories || []);
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'SKU', label: 'SKU', render: r => `<span class="cell-strong">${esc(r.SKU || '—')}</span>` },
        { key: 'Name', label: 'Item', render: r =>
            `<span class="cell-strong">${esc(r.Name)}</span>` +
            (r.Description ? `<div class="cell-muted cell-clamp">${esc(r.Description)}</div>` : '') },
        { key: 'Category', label: 'Category', render: r => esc(r.Category || '—') },
        { key: 'ExpenseType', label: 'Expense', render: r => badge(r.ExpenseType || 'OpEx') },
        { key: 'UnitPrice', label: 'Unit price', num: true, render: r => currency(r.UnitPrice) }
      ],
      rows: filtered,
      empty: { icon: '📦', title: 'No items yet', sub: 'Add catalog items so teams can raise requisitions against them.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-open="${r.ROWID}">Open</button>
        <button class="btn btn-ghost btn-sm" data-edit="${r.ROWID}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${r.ROWID}" data-name="${esc(r.Name)}">Delete</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['SKU', 'Name', 'Category'] });

  // Full-page Zoho-style item form: Name*, Goods/Service, Unit, cost price
  // with currency prefix, category, expense type, preferred vendor.
  const openItemModal = async (item) => {
    const cfFields = await api('GET', '/api/custom-fields?module=items').catch(() => []);
    const ref = await loadReference();
    const cats = expenseCats();
    const cur = state.orgSettings.currency || 'USD';
    // Fields the item master needs but the Items table has no column for live
    // in the per-row custom-field blob.
    let custom = {};
    try { custom = JSON.parse(item?.CustomFieldsJson || '{}') || {}; } catch { custom = {}; }
    // Checkbox values survive a round-trip as either booleans or strings.
    const isTrue = v => v === true || v === 'true' || v === 'Yes' || v === 1;
    // Module preferences (Settings → Module Settings → Items): defaults for new items.
    const iPrefs = (state.orgSettings.modulePrefs || {}).items || {};
    const defUnit = item ? (item.Unit || '') : (iPrefs.defaultUnit || '');
    const defExpense = item ? (item.ExpenseType || 'OpEx') : (iPrefs.defaultExpenseType || 'OpEx');
    const catOptions = cats.length
      ? `<select id="i-cat"><option value="">— none —</option>${cats.map(c => `<option ${item?.Category === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`
      : `<input type="text" id="i-cat" value="${esc(item?.Category || '')}" placeholder="e.g. Linen &amp; Soft Furnishings">`;
    const vendorOptions = `<option value="">— none —</option>` + state.cache.suppliers
      .map(s => `<option value="${s.ROWID}" ${item?.PreferredVendorID === s.ROWID ? 'selected' : ''}>${esc(s.Name)}</option>`).join('');
    // Base units of measure come from the deployment's own list.
    const units = (ref.baseUoms || []).length ? ref.baseUoms
      : ['pcs', 'box', 'kg', 'g', 'litre', 'metre', 'pack', 'set', 'hour', 'day', 'unit'];

    openPage({
      title: item ? `Edit Item — ${item.Name}` : 'New Item',
      body: `
        <div class="form-narrow">
          <div class="zrow">
            <label class="req-label">Name <span class="req">*</span></label>
            <div><input type="text" id="i-name" value="${esc(item?.Name || '')}"></div>
          </div>
          <div class="zrow">
            <label>Type</label>
            <div class="radio-row">
              <label><input type="radio" name="i-type" value="Goods" ${item?.ItemType !== 'Service' ? 'checked' : ''}> Goods</label>
              <label><input type="radio" name="i-type" value="Service" ${item?.ItemType === 'Service' ? 'checked' : ''}> Service</label>
            </div>
          </div>
          <div class="zrow">
            <label>Unit</label>
            <div>
              <input type="text" id="i-unit" list="i-unit-list" value="${esc(defUnit)}" placeholder="Select or type to add">
              <datalist id="i-unit-list">${units.map(u => `<option value="${u}">`).join('')}</datalist>
              <div class="help">The unit this item is measured in (pcs, kg, box…).</div>
            </div>
          </div>
          <div class="zrow">
            <label class="req-label">SKU <span class="req">*</span></label>
            <div><input type="text" id="i-sku" value="${esc(item?.SKU || '')}" placeholder="e.g. HK-LIN-001"></div>
          </div>
          <div class="zrow">
            <label class="req-label">Cost Price <span class="req">*</span></label>
            <div>
              <div class="input-prefix"><span>${esc(cur)}</span><input type="number" id="i-price" min="0" step="0.01" value="${item?.UnitPrice ?? ''}"></div>
            </div>
          </div>
          <div class="zrow">
            <label>Department</label>
            <div>
              <select id="i-dept"><option value="">— none —</option>
                ${(ref.departments || []).map(d => `<option ${custom['Department'] === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}
              </select>
              <div class="help">Filing an item under a department narrows the categories below and drives budget roll-up.</div>
            </div>
          </div>
          <div class="zrow">
            <label>Category</label>
            <div>${catOptions}</div>
          </div>
          <div class="zrow">
            <label>Sub Category</label>
            <div>
              <select id="i-subcat"><option value="">— none —</option></select>
            </div>
          </div>
          <div class="zrow">
            <label>Expense Type</label>
            <div><select id="i-expense"><option value="OpEx" ${defExpense !== 'CapEx' ? 'selected' : ''}>OpEx (operational)</option><option value="CapEx" ${defExpense === 'CapEx' ? 'selected' : ''}>CapEx (capital)</option></select></div>
          </div>
          <div class="zrow">
            <label>Preferred Vendor</label>
            <div><select id="i-vendor">${vendorOptions}</select></div>
          </div>
          <div class="zrow">
            <label>Short Description</label>
            <div><textarea id="i-desc" rows="3">${esc(item?.Description || '')}</textarea></div>
          </div>
          <div class="zrow">
            <label>Detailed Specification</label>
            <div>
              <textarea id="i-spec" rows="4" placeholder="Full technical specification — what a supplier needs to quote against.">${esc(custom['Detailed Specification'] || '')}</textarea>
              <div class="help">Shown to suppliers on RFQs and to requesters in the item picker.</div>
            </div>
          </div>

          <div class="section-head">Purchasing</div>
          <div class="zrow">
            <label>Brand Name</label>
            <div><input type="text" id="i-brand" value="${esc(custom['Brand Name'] || '')}"></div>
          </div>
          <div class="zrow">
            <label>Purchasing UOM</label>
            <div>
              <select id="i-puom"><option value="">— same as base unit —</option>
                ${(ref.purchasingUoms || []).map(u => `<option ${custom['Purchasing UOM'] === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
              </select>
              <div class="help">How this is bought, when that differs from how it is issued.</div>
            </div>
          </div>
          <div class="zrow">
            <label>UOM Conversion Factor</label>
            <div>
              <input type="number" id="i-uomfactor" min="0" step="any" value="${esc(String(custom['UOM Conversion Factor'] ?? ''))}" placeholder="e.g. 24">
              <div class="help">Base units per purchasing unit — a case of 24 bottles is 24.</div>
            </div>
          </div>
          <div class="zrow">
            <label>Expected Lead Time</label>
            <div>
              <div class="input-suffix"><input type="number" id="i-leadtime" min="0" step="1" value="${esc(String(custom['Expected Supplier Lead Time (days)'] ?? ''))}"><span>days</span></div>
            </div>
          </div>
          <div class="zrow">
            <label>Applicable Tax</label>
            <div>
              <select id="i-tax"><option value="">— not set —</option>
                ${(ref.taxTreatments || []).map(t => `<option ${custom['Applicable Tax'] === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="zrow">
            <label>Supplier Approval Status</label>
            <div>
              <select id="i-appstatus">
                ${(ref.supplierApprovalStatuses || []).map(s => `<option ${(custom['Supplier Approval Status'] || 'Draft') === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
              </select>
              <div class="help">An item is only orderable once it reaches Active.</div>
            </div>
          </div>

          <div class="section-head">Stock &amp; service</div>
          <div class="zrow">
            <label>Par Level</label>
            <div>
              <input type="number" id="i-par" min="0" step="any" value="${esc(String(custom['Par Level'] ?? ''))}">
              <div class="help">The stock level this item should be kept at.</div>
            </div>
          </div>
          <div class="zrow">
            <label>Warranty Period</label>
            <div><input type="text" id="i-warranty" value="${esc(custom['Warranty Period'] || '')}" placeholder="e.g. 12 months"></div>
          </div>
          <div class="zrow">
            <label>Flags</label>
            <div class="check-col">
              <label><input type="checkbox" id="i-perishable" ${isTrue(custom['Perishable']) ? 'checked' : ''}> Perishable — has a shelf life and needs batch/expiry tracking</label>
              <label><input type="checkbox" id="i-amc" ${isTrue(custom['Maintenance Contract Eligibility']) ? 'checked' : ''}> Eligible for an annual maintenance contract</label>
            </div>
          </div>
          <div class="zrow">
            <label>Status</label>
            <div>
              <select id="i-status">
                ${(ref.itemStatuses || ['Active']).map(s => `<option ${(custom['Status'] || 'Active') === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
              </select>
            </div>
          </div>
          ${cfFields.length ? `<div class="form-grid" style="max-width:640px;">${customFieldsHTML(cfFields)}</div>` : ''}
        </div>`,
      footer: `<button class="btn btn-primary" id="m-save">${item ? 'Save' : 'Save Item'}</button>
               <button class="btn btn-outline" id="m-cancel">Cancel</button>`,
      onOpen(body) {
        const deptEl = body.querySelector('#i-dept');
        const catEl = body.querySelector('#i-cat');
        const subEl = body.querySelector('#i-subcat');

        // Department → Category → Sub Category cascade. Picking a department
        // narrows the categories to that department's own; picking a category
        // fills the sub-categories underneath it. Choosing "none" at any level
        // widens the level below rather than emptying it, so an item can still
        // be filed loosely.
        const fillSubs = (keep) => {
          const subs = (ref.categories || []).find(c => c.name === catEl.value)?.sub || [];
          subEl.innerHTML = `<option value="">— none —</option>` +
            subs.map(s => `<option ${keep === s ? 'selected' : ''}>${esc(s)}</option>`).join('');
          subEl.disabled = subs.length === 0;
        };
        const fillCats = (keepCat, keepSub) => {
          if (!catEl || catEl.tagName !== 'SELECT') return;
          const pool = deptEl.value
            ? (ref.categories || []).filter(c => c.department === deptEl.value)
            : (ref.categories || []);
          catEl.innerHTML = `<option value="">— none —</option>` +
            pool.map(c => `<option ${keepCat === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
          fillSubs(keepSub);
        };

        if (catEl && catEl.tagName === 'SELECT') {
          fillCats(item?.Category || '', custom['Sub Category'] || '');
          deptEl.addEventListener('change', () => fillCats(catEl.value, ''));
          catEl.addEventListener('change', () => {
            // Auto-suggest the expense type from the pack's classification.
            const match = (ref.categories || []).find(c => c.name === catEl.value)
                       || cats.find(c => c.name === catEl.value);
            if (match) body.querySelector('#i-expense').value = match.expense;
            fillSubs('');
          });
        }

        document.getElementById('m-cancel').addEventListener('click', closePage);
        document.getElementById('m-save').addEventListener('click', async () => {
          const SKU = body.querySelector('#i-sku').value.trim();
          const Name = body.querySelector('#i-name').value.trim();
          const UnitPrice = Number(body.querySelector('#i-price').value || 0);
          if (!SKU || !Name || UnitPrice <= 0) return toast('Name, SKU and a positive cost price are required.', 'warning');
          const num = id => {
            const v = body.querySelector(id).value.trim();
            return v === '' ? '' : Number(v);
          };
          const payload = {
            SKU, Name, UnitPrice,
            ItemType: body.querySelector('input[name=i-type]:checked')?.value || 'Goods',
            Unit: body.querySelector('#i-unit').value.trim(),
            Category: body.querySelector('#i-cat').value.trim(),
            ExpenseType: body.querySelector('#i-expense').value,
            PreferredVendorID: body.querySelector('#i-vendor').value,
            Description: body.querySelector('#i-desc').value.trim(),
            CustomFields: {
              ...collectCustomFields(body),
              'Department': deptEl.value,
              'Sub Category': subEl.value,
              'Detailed Specification': body.querySelector('#i-spec').value.trim(),
              'Brand Name': body.querySelector('#i-brand').value.trim(),
              'Purchasing UOM': body.querySelector('#i-puom').value,
              'UOM Conversion Factor': num('#i-uomfactor'),
              'Expected Supplier Lead Time (days)': num('#i-leadtime'),
              'Applicable Tax': body.querySelector('#i-tax').value,
              'Supplier Approval Status': body.querySelector('#i-appstatus').value,
              'Par Level': num('#i-par'),
              'Warranty Period': body.querySelector('#i-warranty').value.trim(),
              'Perishable': body.querySelector('#i-perishable').checked,
              'Maintenance Contract Eligibility': body.querySelector('#i-amc').checked,
              'Status': body.querySelector('#i-status').value
            }
          };
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try {
            if (item) await api('PUT', `/api/items/${item.ROWID}`, payload);
            else await api('POST', '/api/items', payload);
            toast(item ? 'Item updated.' : `Item "${Name}" added.`);
            closePage(); await load(); apply();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  };

  document.getElementById('btn-new').addEventListener('click', () => openItemModal(null));
  document.getElementById('list-body').addEventListener('click', e => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) return openItemRecord(openBtn.dataset.open, (item) => openItemModal(item));
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) return openItemModal(rows.find(r => r.ROWID === editBtn.dataset.edit));
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) return confirmDelete('item', delBtn.dataset.name, `/api/items/${delBtn.dataset.del}`, async () => { await load(); apply(); });
  });

  await load(); apply();
  if (params?.get('new') === '1') openItemModal(null);
}

/* =========================================================
   BUDGETS
   ========================================================= */
async function openBudgetRecord(budget) {
  const periods = await api('GET', `/api/budgets/${budget.ROWID}/periods`).catch(() => []);
  const amount = Number(budget.Amount || 0);
  const spent = Number(budget.Spent || 0);
  const committed = Number(budget.Committed || 0);
  const available = Math.max(0, amount - spent - committed);
  openRecord({
    number: `${budget.Department} budget`, status: budget.Status, subtitle: budget.FiscalYear ? `Fiscal year ${budget.FiscalYear}` : 'Department budget',
    summary: { label: 'Available', value: currency(available) },
    actions: [{ label: 'Manage periods', primary: true, onClick: ({ close }) => { close(); openBudgetPeriods(budget.ROWID, budget.Department); } }],
    tabs: [
      { id: 'details', label: 'Budget control', render: el => { el.innerHTML = sectionHTML('Commitment summary', factsHTML([
        ['Department', budget.Department], ['Fiscal year', budget.FiscalYear], ['Approved budget', currency(amount)],
        ['Spent', currency(spent)], ['Committed', currency(committed)], ['Available', currency(available)],
        ['Utilization', amount ? `${Math.round(((spent + committed) / amount) * 100)}%` : '—']
      ])); } },
      { id: 'periods', label: 'Periods', count: periods.length, render: el => { el.innerHTML = periods.length ? linesHTML([
        { key: 'PeriodLabel', label: 'Period' }, { key: 'BudgetedAmount', label: 'Budgeted', num: true, render: p => currency(p.BudgetedAmount) },
        { key: 'SpentAmount', label: 'Spent', num: true, render: p => currency(p.SpentAmount || 0) }
      ], periods) : emptyHTML('No budget periods have been set.', 'Manage periods to allocate this budget monthly, quarterly or annually.'); } }
    ]
  });
}

function openRecurringBillRecord(bill) {
  const vendor = (state.cache.suppliers || []).find(s => String(s.ROWID) === String(bill.VendorID));
  openRecord({
    number: `Recurring bill · ${vendor?.Name || `#${bill.VendorID}`}`, status: bill.Status, subtitle: 'Scheduled payable',
    summary: { label: 'Each occurrence', value: currency(bill.Amount) },
    tabs: [
      { id: 'details', label: 'Schedule', render: el => { el.innerHTML = sectionHTML('Billing control', factsHTML([
        ['Vendor', vendor?.Name || ''], ['Frequency', bill.Frequency], ['Amount per occurrence', currency(bill.Amount)],
        ['Starts', fmtDate(bill.StartDate)], ['Ends', bill.EndDate ? fmtDate(bill.EndDate) : 'No end date'],
        ['Status', bill.Status]
      ])); } },
      { id: 'controls', label: 'Controls', render: el => { el.innerHTML = sectionHTML('Operational guidance', factsHTML([
        ['Automation', 'A bill is created on each scheduled occurrence'],
        ['Changes', 'Use the recurring-bills settings to update or stop future occurrences', { wide: true }]
      ])); } }
    ]
  });
}

function openVendorCreditRecord(credit) {
  const vendor = (state.cache.suppliers || []).find(s => String(s.ROWID) === String(credit.VendorID));
  openRecord({
    number: credit.ReferenceNumber || `CREDIT-${credit.ROWID}`, status: credit.Status, subtitle: 'Vendor credit note',
    summary: { label: 'Balance remaining', value: currency(credit.Balance) },
    actions: [{ label: 'Print', onClick: () => docs.showRecord(docs.buildVendorCreditDoc, credit, { subtitle: 'Vendor credit note' }) }],
    tabs: [
      { id: 'details', label: 'Credit details', render: el => { el.innerHTML = sectionHTML('Credit control', factsHTML([
        ['Vendor', vendor?.Name || ''], ['Credit amount', currency(credit.CreditAmount)], ['Balance available', currency(credit.Balance)],
        ['Reason', credit.Reason, { wide: true }], ['Status', credit.Status], ['Created', fmtDate(credit.CREATEDTIME)]
      ])); } },
      { id: 'controls', label: 'Controls', render: el => { el.innerHTML = sectionHTML('Application', factsHTML([
        ['Application status', Number(credit.Balance || 0) > 0 ? 'Available to offset a future vendor bill' : 'Fully applied'],
        ['Control', 'Keep the reference number and reason attached to the source credit note.', { wide: true }]
      ])); } }
    ]
  });
}

function openCustomModuleRecord(module) {
  let fields = [];
  try { fields = JSON.parse(module.FieldsSchema || '{}').fields || []; } catch { /* handled below */ }
  openRecord({
    number: module.ModuleName, status: module.Status, subtitle: 'Custom module definition',
    summary: { label: 'Fields', value: String(fields.length) },
    tabs: [
      { id: 'definition', label: 'Definition', render: el => { el.innerHTML = sectionHTML('Module control', factsHTML([
        ['Status', module.Status], ['Created', fmtDate(module.CREATEDTIME)],
        ['Purpose', 'A configurable record type for procurement operations.', { wide: true }]
      ])); } },
      { id: 'fields', label: 'Fields', count: fields.length, render: el => { el.innerHTML = fields.length ? linesHTML([
        { key: 'name', label: 'Field name' }, { key: 'type', label: 'Data type' },
        { key: 'required', label: 'Required', render: f => f.required ? 'Yes' : 'No' }
      ], fields) : emptyHTML('No fields defined.', 'Add fields to make this module ready for records.'); } }
    ]
  });
}

export async function viewBudgets(root) {
  root.innerHTML = listPage({
    title: 'Budgets',
    desc: 'Department budgets — requisitions are blocked when they would exceed the available amount.',
    actionsHtml: `<button class="btn btn-primary" id="btn-new">+ New budget</button>`
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/budgets').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'Department', label: 'Department', render: r => `<span class="cell-strong">${esc(r.Department)}</span>` },
        { key: 'FiscalYear', label: 'Fiscal year' },
        { key: 'Amount', label: 'Budget', num: true, render: r => currency(r.Amount) },
        { key: 'Spent', label: 'Spent', num: true, render: r => currency(r.Spent) },
        {
          key: 'util', label: 'Utilization', render: r => {
            const pct = Number(r.Amount) > 0 ? Math.min(150, (Number(r.Spent || 0) / Number(r.Amount)) * 100) : 0;
            const cls = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : '';
            return `<div class="util"><div class="util-track"><div class="util-fill ${cls}" style="width:${Math.min(pct, 100)}%"></div></div><div class="util-pct">${Math.round(pct)}%</div></div>`;
          }
        },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: filtered,
      empty: { icon: '🎯', title: 'No budgets yet', sub: 'Set a department budget to enforce spend control at requisition time.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-open="${r.ROWID}">Open</button>
        <button class="btn btn-ghost btn-sm" data-periods="${r.ROWID}" data-name="${esc(r.Department)}">Periods</button>
        <button class="btn btn-danger btn-sm" data-del="${r.ROWID}" data-name="${esc(r.Department)}">Delete</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['Department', 'FiscalYear'] });

  document.getElementById('list-body').addEventListener('click', e => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) return openBudgetRecord(rows.find(r => r.ROWID === openBtn.dataset.open));
    const periodsBtn = e.target.closest('[data-periods]');
    if (periodsBtn) return openBudgetPeriods(periodsBtn.dataset.periods, periodsBtn.dataset.name);
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) confirmDelete('budget', delBtn.dataset.name, `/api/budgets/${delBtn.dataset.del}`, async () => { await load(); apply(); });
  });

  document.getElementById('btn-new').addEventListener('click', () => {
    openModal({
      title: 'New department budget',
      body: `
        <div class="form-grid">
          <div class="field full"><label>Department <span class="req">*</span></label><input type="text" id="b-dept" placeholder="Must match the department used on requisitions"></div>
          <div class="field"><label>Amount <span class="req">*</span></label><input type="number" id="b-amount" min="0" step="100"></div>
          <div class="field"><label>Fiscal year</label><input type="text" id="b-year" value="${new Date().getFullYear()}"></div>
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Create budget</button>`,
      onOpen(body) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const Department = body.querySelector('#b-dept').value.trim();
          const Amount = Number(body.querySelector('#b-amount').value || 0);
          if (!Department || Amount <= 0) return toast('Department and a positive amount are required.', 'warning');
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try {
            await api('POST', '/api/budgets', { Department, Amount, FiscalYear: body.querySelector('#b-year').value.trim() });
            toast(`Budget for ${Department} created.`);
            closeModal(); await load(); apply();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  });

  await load(); apply();
}

// Split a budget into periods (monthly / quarterly / half-yearly / annual).
async function openBudgetPeriods(budgetId, deptName) {
  openModal({ title: `Periods — ${deptName}`, body: skeletonRows(3), wide: true });
  const existing = await api('GET', `/api/budgets/${budgetId}/periods`).catch(() => []);
  const presets = {
    Monthly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    Quarterly: ['Q1', 'Q2', 'Q3', 'Q4'],
    'Half-Yearly': ['H1', 'H2'],
    Annual: ['Full year']
  };
  let labels = existing.length ? existing.map(p => p.PeriodLabel) : presets.Quarterly;
  let amounts = Object.fromEntries((existing.length ? existing : []).map(p => [p.PeriodLabel, Number(p.BudgetedAmount || 0)]));

  const render = () => {
    openModal({
      title: `Periods — ${deptName}`,
      wide: true,
      body: `
        <div class="field" style="margin-bottom:14px;"><label>Split into</label>
          <select id="bp-preset">${Object.keys(presets).map(k => `<option ${JSON.stringify(presets[k]) === JSON.stringify(labels) ? 'selected' : ''}>${k}</option>`).join('')}</select>
          <div class="help">Choose a cadence, then set the amount for each period.</div></div>
        <table class="lines-table"><thead><tr><th>Period</th><th>Budgeted amount</th></tr></thead>
          <tbody>${labels.map(l => `<tr><td class="cell-strong">${esc(l)}</td>
            <td><input type="number" class="bp-amt" data-label="${esc(l)}" min="0" step="10" value="${amounts[l] || 0}"></td></tr>`).join('')}</tbody></table>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save periods</button>`,
      onOpen(body) {
        body.querySelector('#bp-preset').addEventListener('change', e => {
          // Capture current amounts before switching.
          body.querySelectorAll('.bp-amt').forEach(i => { amounts[i.dataset.label] = Number(i.value || 0); });
          labels = presets[e.target.value];
          render();
        });
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const Periods = [...body.querySelectorAll('.bp-amt')].map(i => ({ PeriodLabel: i.dataset.label, BudgetedAmount: Number(i.value || 0) }));
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try { await api('POST', `/api/budgets/${budgetId}/periods`, { Periods }); toast('Periods saved.'); closeModal(); }
          catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  };
  render();
}

/* =========================================================
   RECURRING BILLS
   ========================================================= */
export async function viewRecurringBills(root) {
  root.innerHTML = listPage({
    title: 'Recurring Bills',
    desc: 'Repeating vendor charges — rent, subscriptions, service contracts.',
    actionsHtml: `<button class="btn btn-primary" id="btn-new">+ New recurring bill</button>`
  });

  let rows = [];
  const suppliersById = () => Object.fromEntries(state.cache.suppliers.map(s => [s.ROWID, s]));
  const load = async () => { rows = await api('GET', '/api/recurring-bills').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'VendorID', label: 'Vendor', render: r => `<span class="cell-strong">${esc(suppliersById()[r.VendorID]?.Name || `#${r.VendorID || '—'}`)}</span>` },
        { key: 'Amount', label: 'Amount', num: true, render: r => currency(r.Amount) },
        { key: 'Frequency', label: 'Frequency' },
        { key: 'StartDate', label: 'Starts', render: r => fmtDate(r.StartDate) },
        { key: 'EndDate', label: 'Ends', render: r => fmtDate(r.EndDate) },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: filtered,
      empty: { icon: '🔁', title: 'No recurring bills', sub: 'Set up repeating charges so they are never missed.' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-open="${r.ROWID}">Open</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['Frequency', 'Status'] });

  document.getElementById('list-body').addEventListener('click', e => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) openRecurringBillRecord(rows.find(r => r.ROWID === openBtn.dataset.open));
  });

  document.getElementById('btn-new').addEventListener('click', () => {
    if (state.cache.suppliers.length === 0) return toast('Add a vendor first.', 'warning');
    openModal({
      title: 'New recurring bill',
      body: `
        <div class="form-grid">
          <div class="field full"><label>Vendor <span class="req">*</span></label>
            <select id="rb-vendor">${state.cache.suppliers.map(s => `<option value="${s.ROWID}">${esc(s.Name)}</option>`).join('')}</select></div>
          <div class="field"><label>Amount <span class="req">*</span></label><input type="number" id="rb-amount" min="0" step="0.01"></div>
          <div class="field"><label>Frequency</label>
            <select id="rb-freq"><option>Monthly</option><option>Quarterly</option><option>Half-Yearly</option><option>Annually</option><option>Weekly</option></select></div>
          <div class="field"><label>Start date</label><input type="date" id="rb-start" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field"><label>End date</label><input type="date" id="rb-end"></div>
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Create</button>`,
      onOpen(body) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const Amount = Number(body.querySelector('#rb-amount').value || 0);
          if (Amount <= 0) return toast('Enter a positive amount.', 'warning');
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try {
            await api('POST', '/api/recurring-bills', {
              VendorID: body.querySelector('#rb-vendor').value,
              Amount,
              Frequency: body.querySelector('#rb-freq').value,
              StartDate: body.querySelector('#rb-start').value,
              EndDate: body.querySelector('#rb-end').value
            });
            toast('Recurring bill created.');
            closeModal(); await load(); apply();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  });

  await load(); apply();
}

/* =========================================================
   VENDOR CREDITS
   ========================================================= */
export async function viewVendorCredits(root) {
  root.innerHTML = listPage({
    title: 'Vendor Credits',
    desc: 'Credit notes from vendors — returns, overcharges and goodwill credits that reduce what you owe.',
    actionsHtml: `<button class="btn btn-primary" id="btn-new">+ New credit</button>`
  });

  let rows = [];
  const suppliersById = () => Object.fromEntries(state.cache.suppliers.map(s => [s.ROWID, s]));
  const load = async () => { rows = await api('GET', '/api/vendor-credits').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'ReferenceNumber', label: 'Credit #', render: r => `<span class="cell-strong">${esc(r.ReferenceNumber)}</span>` },
        { key: 'VendorID', label: 'Vendor', render: r => esc(suppliersById()[r.VendorID]?.Name || `#${r.VendorID || '—'}`) },
        { key: 'CreditAmount', label: 'Credit', num: true, render: r => currency(r.CreditAmount) },
        { key: 'Balance', label: 'Balance', num: true, render: r => currency(r.Balance) },
        { key: 'Reason', label: 'Reason', render: r => `<span class="cell-muted">${esc((r.Reason || '').slice(0, 50))}</span>` },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: filtered,
      empty: { icon: '🪙', title: 'No vendor credits', sub: 'Record credit notes to offset future vendor bills.' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${r.ROWID}">View</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['ReferenceNumber', 'Reason', 'Status'] });
  document.getElementById('list-body').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action="view"]');
    if (btn) openVendorCreditRecord(rows.find(r => r.ROWID === btn.dataset.id));
  });

  document.getElementById('btn-new').addEventListener('click', () => {
    if (state.cache.suppliers.length === 0) return toast('Add a vendor first.', 'warning');
    openModal({
      title: 'New vendor credit',
      body: `
        <div class="form-grid">
          <div class="field full"><label>Vendor <span class="req">*</span></label>
            <select id="vc-vendor">${state.cache.suppliers.map(s => `<option value="${s.ROWID}">${esc(s.Name)}</option>`).join('')}</select></div>
          <div class="field"><label>Credit amount <span class="req">*</span></label><input type="number" id="vc-amount" min="0" step="0.01"></div>
          <div class="field"><label>Reference #</label><input type="text" id="vc-ref" placeholder="Auto-generated if empty"></div>
          <div class="field full"><label>Reason</label><textarea id="vc-reason" placeholder="Return, overcharge, goodwill…"></textarea></div>
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Record credit</button>`,
      onOpen(body) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const CreditAmount = Number(body.querySelector('#vc-amount').value || 0);
          if (CreditAmount <= 0) return toast('Enter a positive amount.', 'warning');
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try {
            await api('POST', '/api/vendor-credits', {
              VendorID: body.querySelector('#vc-vendor').value,
              CreditAmount,
              ReferenceNumber: body.querySelector('#vc-ref').value.trim() || undefined,
              Reason: body.querySelector('#vc-reason').value.trim()
            });
            toast('Vendor credit recorded.');
            closeModal(); await load(); apply();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  });

  await load(); apply();
}

/* =========================================================
   CUSTOM MODULES
   ========================================================= */
export async function viewCustomModules(root) {
  root.innerHTML = listPage({
    title: 'Custom Modules',
    desc: 'Schema-driven modules you define — fields stored as JSON and validated on write.',
    actionsHtml: `<button class="btn btn-primary" id="btn-new">+ New module</button>`
  });

  let rows = [];
  const load = async () => { rows = await api('GET', '/api/custom-modules').catch(() => []); };
  const draw = (filtered) => {
    document.getElementById('list-body').innerHTML = renderTable({
      columns: [
        { key: 'ModuleName', label: 'Module', render: r => `<span class="cell-strong">${esc(r.ModuleName)}</span>` },
        {
          key: 'FieldsSchema', label: 'Fields', render: r => {
            try {
              const schema = JSON.parse(r.FieldsSchema || '{}');
              const fields = schema.fields || [];
              return `<span class="cell-muted">${fields.map(f => esc(f.name)).join(', ') || '—'}</span>`;
            } catch { return '<span class="cell-muted">—</span>'; }
          }
        },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: filtered,
      empty: { icon: '🧩', title: 'No custom modules', sub: 'Define your own record types — asset registers, contracts, anything.' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-open="${r.ROWID}">Open</button>`
    });
  };
  const apply = wireListPage({ getRows: () => rows, draw, load, searchKeys: ['ModuleName'] });

  document.getElementById('list-body').addEventListener('click', e => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) openCustomModuleRecord(rows.find(r => r.ROWID === openBtn.dataset.open));
  });

  document.getElementById('btn-new').addEventListener('click', () => {
    openModal({
      title: 'New custom module',
      body: `
        <div class="field" style="margin-bottom:14px;">
          <label>Module name <span class="req">*</span></label>
          <input type="text" id="cm-name" placeholder="e.g. Asset Register">
        </div>
        <div class="field">
          <label>Fields (one per line: <code>name:type</code>)</label>
          <textarea id="cm-fields" rows="5" placeholder="serial_number:text
purchase_date:date
value:number"></textarea>
          <div class="help">Types: text, number, date, boolean.</div>
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Create module</button>`,
      onOpen(body) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const ModuleName = body.querySelector('#cm-name').value.trim();
          if (!ModuleName) return toast('Module name is required.', 'warning');
          const fields = body.querySelector('#cm-fields').value.split('\n')
            .map(l => l.trim()).filter(Boolean)
            .map(l => { const [name, type] = l.split(':').map(s => s.trim()); return { name, type: type || 'text' }; });
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try {
            await api('POST', '/api/custom-modules', { ModuleName, FieldsSchema: { fields } });
            toast(`Module "${ModuleName}" created.`);
            closeModal(); await load(); apply();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  });

  await load(); apply();
}

/* =========================================================
   SETTINGS (Organization / Users / Roles)
   ========================================================= */
// Modules × actions for the profile permission matrix (Zoho-style).
const PERM_MODULES = [
  ['prs', 'Purchase Requests'],
  ['rfqs', 'RFQs & Bids'],
  ['pos', 'Purchase Orders'],
  ['grns', 'Goods Receipts'],
  ['invoices', 'Invoices'],
  ['payments', 'Payments'],
  ['vendors', 'Vendors'],
  ['items', 'Items'],
  ['budgets', 'Budgets']
];
const PERM_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

/* =========================================================
   ALL SETTINGS — Zoho-style: left rail + content.
   #/settings                     → landing
   #/settings?tab=<x>             → an organization-level page
   #/settings?module=<m>&mtab=<t> → a module's own settings
   ========================================================= */

// Per-module preferences. Values live in orgSettings.modulePrefs[moduleKey].
// `locked: true` marks platform-enforced invariants (shown, not editable).
const MODULE_SETTINGS_DEFS = {
  vendors: {
    label: 'Vendors', icon: '🤝', cf: 'vendors',
    prefs: [
      { key: 'allowDuplicateNames', type: 'toggle', label: 'Allow duplicates for vendor display name', help: 'When off, two vendors cannot share the same display name.' },
      { key: 'requirePhone', type: 'toggle', label: 'Phone is mandatory', help: 'New vendors must have a phone number.' }
    ]
  },
  items: {
    label: 'Items', icon: '🏷️', cf: 'items',
    prefs: [
      { key: 'defaultUnit', type: 'text', label: 'Default unit', help: 'Pre-filled on the New Item form.', placeholder: 'e.g. pcs' },
      { key: 'defaultExpenseType', type: 'select', options: ['OpEx', 'CapEx'], label: 'Default expense type', help: 'Used when an item has no category mapping.' }
    ]
  },
  budgets: {
    label: 'Budgets', icon: '💰',
    prefs: [
      { key: 'blockOverBudget', type: 'toggle', locked: true, value: true, label: 'Block requests that exceed the department budget', help: 'Enforced by the platform on every submission.' }
    ]
  },
  requisitions: {
    label: 'Purchase Requests', icon: '📝', cf: 'prs',
    prefs: [
      { key: 'requireDepartment', type: 'toggle', label: 'Department is mandatory', help: 'Requests cannot be submitted without a department.' },
      { key: 'requireExpectedDate', type: 'toggle', label: 'Expected date is mandatory' },
      { key: 'requireReason', type: 'toggle', label: 'Reason is mandatory', help: 'Requesters must say why the purchase is needed.' }
    ]
  },
  rfqs: {
    label: 'Request for Quotes', icon: '📣',
    prefs: [
      { key: 'defaultBidDays', type: 'number', label: 'Default bid window (days)', help: 'Pre-fills the bid deadline when publishing an RFQ.', placeholder: '7' }
    ]
  },
  'purchase-orders': {
    label: 'Purchase Orders', icon: '📦',
    prefs: [
      { key: 'defaultTermsNote', type: 'text', label: 'Default terms note', help: 'Pre-filled when converting an approved request into a PO.' }
    ]
  },
  receipts: {
    label: 'Purchase Receives', icon: '🚚',
    prefs: [
      { key: 'blockOverReceipt', type: 'toggle', locked: true, value: true, label: 'Block receiving more than was ordered', help: 'Cumulative received quantity can never exceed the ordered quantity — enforced by the platform.' }
    ]
  },
  invoices: {
    label: 'Bills', icon: '🧾',
    prefs: [
      { key: 'blockDuplicateNumbers', type: 'toggle', locked: true, value: true, label: 'Block duplicate bill numbers', help: 'Enforced by the platform per vendor organization.' },
      { key: 'threeWayMatch', type: 'toggle', locked: true, value: true, label: '3-way match bills against PO and receipts', help: 'Every bill is automatically matched on save.' },
      { key: 'matchTolerancePct', type: 'number', label: 'Match tolerance (%)', placeholder: '2', help: 'Amount variances within this % are flagged for Review instead of blocked — useful for delivery breakage / short-supply. Default 2%.' }
    ]
  },
  'recurring-bills': { label: 'Recurring Bills', icon: '🔁', prefs: [] },
  payments: {
    label: 'Payments Made', icon: '💳',
    prefs: [
      { key: 'blockOverpayment', type: 'toggle', locked: true, value: true, label: 'Block payments above the bill balance', help: 'Enforced by the platform.' }
    ]
  },
  'vendor-credits': { label: 'Vendor Credits', icon: '🪙', prefs: [] }
};

export function modulePref(moduleKey, prefKey) {
  return (state.orgSettings.modulePrefs || {})[moduleKey]?.[prefKey];
}

/* =========================================================
   ALL SETTINGS HUB — Zoho-style landing: header with centered
   search, then "Organization Settings" and "Module Settings"
   panels holding card columns (tinted icon + link list).
   ========================================================= */
function renderSettingsHub(root) {
  const s = state.orgSettings || {};
  const multiProperty = s.multiProperty !== false;   // hotel edition: on unless explicitly disabled
  const T = (id, label) => ({ href: `#/settings?tab=${id}`, label });
  const M = (m) => ({ href: `#/settings?module=${m}`, label: MODULE_SETTINGS_DEFS[m].label });

  const ORG_CARDS = [
    { icon: '🏢', tint: 'green', title: 'Organization', links: [T('org', 'Profile'), ...(multiProperty ? [T('properties', 'Properties')] : []), T('departments', 'Departments')] },
    { icon: '👥', tint: 'pink', title: 'Users & Roles', links: [T('users', 'Users'), T('roles', 'Roles'), T('profiles', 'Profiles')] },
    { icon: '🧾', tint: 'blue', title: 'Taxes & Compliance', links: [T('taxes', 'Taxes')] },
    { icon: '🎛️', tint: 'orange', title: 'Setup & Configurations', links: [T('currencies', 'Currencies'), T('terms', 'Payment Terms'), T('approvals', 'Approvals'), T('reminders', 'Reminders & Alerts'), T('vendorportal', 'Vendor Portal'), ...(multiProperty ? [T('assets', 'Asset Register')] : [])] },
    { icon: '🎨', tint: 'red', title: 'Customization', links: [T('templates', 'PDF Templates'), T('customfields', 'Custom Fields'), T('dashboards', 'Dashboards')] },
    { icon: '⚡', tint: 'purple', title: 'Automation', links: [T('webhooks', 'Workflow Webhooks'), T('audit', 'Audit Log')] },
    { icon: '🔌', tint: 'teal', title: 'Integrations', links: [T('integrations', 'Zoho Books')] }
  ];
  const MODULE_CARDS = [
    { icon: '🗂️', tint: 'green', title: 'General', links: [M('vendors'), M('items'), M('budgets')] },
    { icon: '🛒', tint: 'blue', title: 'Purchases', links: [M('requisitions'), M('rfqs'), M('purchase-orders'), M('receipts')] },
    { icon: '💳', tint: 'orange', title: 'Payables', links: [M('invoices'), M('recurring-bills'), M('payments'), M('vendor-credits')] },
    { icon: '🧩', tint: 'purple', title: 'Custom Modules', links: [{ href: '#/custom-modules', label: 'Overview' }] }
  ];

  const card = (c) => `
    <div class="shub-card" data-shub-card>
      <div class="shub-card-head tint-${c.tint}"><span class="shub-ic">${c.icon}</span>${esc(c.title)}</div>
      ${c.links.map(l => `<a class="shub-link" href="${l.href}" data-q="${esc((c.title + ' ' + l.label).toLowerCase())}">${esc(l.label)}</a>`).join('')}
    </div>`;
  const panel = (title, cards) => `
    <section class="shub-panel" data-shub-panel>
      <h3>${title}</h3>
      <div class="shub-grid">${cards.map(card).join('')}</div>
    </section>`;

  const logo = s.logoDataUri
    ? `<img src="${s.logoDataUri}" alt="">`
    : `<img src="img/logo.svg" alt="" style="width:100%;height:100%;object-fit:contain;">`;

  root.innerHTML = `
    <div class="shub">
      <header class="shub-head">
        <div class="shub-brand">
          <div class="shub-logo">${logo}</div>
          <div><h2>All Settings</h2><div class="desc">${esc(state.org?.Name || '')}</div></div>
        </div>
        <input class="shub-search" id="shub-search" type="search" placeholder="Search settings ( / )">
        <a class="btn btn-outline btn-sm" href="#/dashboard">Close Settings ×</a>
      </header>
      ${panel('Organization Settings', ORG_CARDS)}
      ${panel('Module Settings', MODULE_CARDS)}
      <section class="shub-panel">
        <h3>Workspace tools</h3>
        <div class="stool-grid">
          <div class="stool stool-wide">
            <div class="stool-ic">🎨</div>
            <div class="stool-text">
              <div class="stool-label">Appearance</div>
              <div class="stool-help">Theme and layout density for this browser.</div>
            </div>
            <div class="stool-control">
              <select id="stool-theme">
                <option value="auto">Match system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <select id="stool-density">
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>
          </div>
          <div class="stool">
            <div class="stool-ic">🧭</div>
            <div class="stool-text">
              <div class="stool-label">Product tour</div>
              <div class="stool-help">Replay the guided walkthrough of the app.</div>
            </div>
            <div class="stool-control"><button class="btn btn-outline btn-sm" id="stool-tour">Start tour</button></div>
          </div>
          <div class="stool">
            <div class="stool-ic">⬇</div>
            <div class="stool-text">
              <div class="stool-label">Export configuration</div>
              <div class="stool-help">Download this workspace's settings as JSON for backup or review.</div>
            </div>
            <div class="stool-control"><button class="btn btn-outline btn-sm" id="stool-export">Export JSON</button></div>
          </div>
          <div class="stool">
            <div class="stool-ic">🔄</div>
            <div class="stool-text">
              <div class="stool-label">Reload workspace data</div>
              <div class="stool-help">Refetch items, vendors, users and roles from the server.</div>
            </div>
            <div class="stool-control"><button class="btn btn-outline btn-sm" id="stool-reload">Reload</button></div>
          </div>
        </div>
      </section>
    </div>`;

  document.body.classList.add('settings-open');

  // Live search: filter links, hide empty cards/panels.
  const search = document.getElementById('shub-search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    root.querySelectorAll('[data-shub-card]').forEach(cardEl => {
      let any = false;
      cardEl.querySelectorAll('.shub-link').forEach(a => {
        const hit = !q || a.dataset.q.includes(q);
        a.style.display = hit ? '' : 'none';
        if (hit) any = true;
      });
      cardEl.style.display = any ? '' : 'none';
    });
    root.querySelectorAll('[data-shub-panel]').forEach(p => {
      const any = [...p.querySelectorAll('[data-shub-card]')].some(c => c.style.display !== 'none');
      p.style.display = any ? '' : 'none';
    });
  });

  // "/" focuses the search (registered once; no-ops when the hub is closed).
  if (!window.__shubKeyBound) {
    window.__shubKeyBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.getElementById('shub-search');
      const active = document.activeElement;
      if (el && active !== el && !/^(INPUT|TEXTAREA|SELECT)$/.test(active?.tagName || '')) {
        e.preventDefault();
        el.focus();
      }
    });
  }

  wireWorkspaceTools();
}

/* Workspace tools on the settings hub. These are browser-local preferences
   and read-only exports — nothing here mutates server state. */
function wireWorkspaceTools() {
  const themeSel = document.getElementById('stool-theme');
  const densitySel = document.getElementById('stool-density');
  if (themeSel) {
    // 'auto' is stored as the absence of a preference, so the OS can keep
    // driving the theme after the user picks it back.
    themeSel.value = localStorage.getItem('pf-theme') || 'auto';
    themeSel.addEventListener('change', () => {
      const v = themeSel.value;
      if (v === 'auto') localStorage.removeItem('pf-theme');
      else localStorage.setItem('pf-theme', v);
      applyStoredTheme();
    });
  }
  if (densitySel) {
    densitySel.value = localStorage.getItem('pf-density') || 'comfortable';
    document.documentElement.setAttribute('data-density', densitySel.value);
    densitySel.addEventListener('change', () => {
      document.documentElement.setAttribute('data-density', densitySel.value);
      localStorage.setItem('pf-density', densitySel.value);
      toast(`Layout set to ${densitySel.value}.`);
    });
  }

  document.getElementById('stool-tour')?.addEventListener('click', () => {
    window.location.hash = '#/dashboard';
    setTimeout(() => startTour(), 400);
  });

  document.getElementById('stool-export')?.addEventListener('click', () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      organization: { name: state.org?.Name || '', status: state.org?.Status || '' },
      settings: state.orgSettings || {}
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (state.org?.Name || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `procureflow-settings-${slug}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Configuration exported.');
  });

  document.getElementById('stool-reload')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try { await refreshCaches(); toast('Workspace data reloaded.'); }
    catch (err) { toast(err.message, 'error'); }
    btn.disabled = false;
  });
}

/* Command-palette search over every settings destination.
   "/" focuses it; ↑/↓ move the cursor; Enter navigates; Esc closes. */
function wireSettingsSearch(index) {
  const input = document.getElementById('swork-search');
  const panel = document.getElementById('swork-results');
  if (!input || !panel) return;
  let cursor = 0;
  let hits = [];

  const close = () => { panel.classList.remove('open'); cursor = 0; };

  const draw = () => {
    if (hits.length === 0) {
      panel.innerHTML = '<div class="swork-noresult">No settings match that search.</div>';
    } else {
      panel.innerHTML = hits.map((h, i) =>
        `<a class="swork-result ${i === cursor ? 'cursor' : ''}" href="${h.href}" data-i="${i}">
           <span>${esc(h.label)}</span><span class="grp">${esc(h.group)}</span>
         </a>`).join('');
    }
    panel.classList.add('open');
  };

  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return close();
    hits = index
      .filter(l => (l.group + ' ' + l.label).toLowerCase().includes(q))
      .slice(0, 12);
    cursor = 0;
    draw();
  };

  input.addEventListener('input', run);
  input.addEventListener('focus', () => { if (input.value.trim()) run(); });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; close(); input.blur(); return; }
    if (!panel.classList.contains('open') || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = (cursor + 1) % hits.length; draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = (cursor - 1 + hits.length) % hits.length; draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); window.location.hash = hits[cursor].href.replace(/^#/, ''); close(); input.blur(); }
  });

  document.addEventListener('click', (e) => { if (!panel.contains(e.target) && e.target !== input) close(); });

  // "/" anywhere in the settings workspace focuses search.
  if (!window.__sworkKeyBound) {
    window.__sworkKeyBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.getElementById('swork-search');
      const active = document.activeElement;
      if (el && active !== el && !/^(INPUT|TEXTAREA|SELECT)$/.test(active?.tagName || '')) {
        e.preventDefault();
        el.focus();
      }
    });
  }
}

export async function viewSettings(root, params) {
  const tab = params?.get('tab');
  const moduleKey = params?.get('module');
  const mtab = params?.get('mtab') || 'prefs';

  // Landing: the Zoho-style "All Settings" hub (card grid). Detail pages
  // (?tab= / ?module=) keep the left-rail layout below.
  if (!tab && !moduleKey) return renderSettingsHub(root);
  const tabTitles = {
    org: 'Organization Profile', prefs: 'Approvals', departments: 'Departments',
    currencies: 'Currencies', taxes: 'Taxes', approvals: 'Approvals',
    reminders: 'Reminders & Alerts', webhooks: 'Workflow Webhooks', integrations: 'Integrations',
    terms: 'Payment Terms', customfields: 'Custom Fields', templates: 'PDF Templates',
    dashboards: 'Dashboards', users: 'Users', roles: 'Roles', profiles: 'Profiles', audit: 'Audit Log',
    properties: 'Properties', assets: 'Asset Register', vendorportal: 'Vendor Portal'
  };
  const multiProperty = state.orgSettings.multiProperty !== false;

  const T = (id, label) => ({ href: `#/settings?tab=${id}`, label, active: tab === id });
  const M = (m) => ({ href: `#/settings?module=${m}`, label: MODULE_SETTINGS_DEFS[m].label, active: moduleKey === m });
  const RAIL = [
    ['ORGANIZATION SETTINGS', [
      ['Organization', [T('org', 'Profile'), ...(multiProperty ? [T('properties', 'Properties')] : [])]],
      ['Users & Roles', [T('users', 'Users'), T('roles', 'Roles'), T('profiles', 'Profiles'), T('departments', 'Departments')]],
      ['Taxes & Compliance', [T('taxes', 'Taxes')]],
      ['Setup & Configurations', [T('currencies', 'Currencies'), T('terms', 'Payment Terms'), T('approvals', 'Approvals'), T('reminders', 'Reminders & Alerts'), T('vendorportal', 'Vendor Portal'), ...(multiProperty ? [T('assets', 'Asset Register')] : [])]],
      ['Customization', [T('templates', 'PDF Templates'), T('customfields', 'All Custom Fields'), T('dashboards', 'Dashboards')]],
      ['Automation', [T('webhooks', 'Workflow Webhooks'), T('audit', 'Audit Log')]],
      ['Integrations', [T('integrations', 'Zoho Books & More')]]
    ]],
    ['MODULE SETTINGS', [
      ['General', [M('vendors'), M('items'), M('budgets')]],
      ['Purchases', [M('requisitions'), M('rfqs'), M('purchase-orders'), M('receipts'), M('invoices'), M('recurring-bills'), M('payments'), M('vendor-credits')]],
      ['Custom Modules', [{ href: '#/custom-modules', label: 'Overview', active: false }]]
    ]]
  ];

  // Flat index of every destination — powers the command-palette search.
  const INDEX = RAIL.flatMap(([section, groups]) =>
    groups.flatMap(([g, links]) => links.map(l => ({ ...l, group: g, section }))));

  const activeEntry = INDEX.find(l => l.active);
  const currentTitle = moduleKey
    ? (MODULE_SETTINGS_DEFS[moduleKey]?.label || 'Module settings')
    : (tabTitles[tab] || 'Settings');

  root.innerHTML = `
    <div class="swork">
      <header class="swork-head">
        <button class="btn btn-ghost btn-sm swork-rail-toggle" id="swork-rail-btn" aria-label="Settings menu">☰</button>
        <div class="swork-head-brand">
          <div><h2>Settings</h2><div class="desc">${esc(state.org?.Name || '')}</div></div>
        </div>
        <div class="swork-search-wrap">
          <span class="swork-search-ic">🔍</span>
          <input class="swork-search" id="swork-search" type="search"
                 placeholder="Search settings, modules and tools…" autocomplete="off">
          <span class="swork-kbd">/</span>
          <div class="swork-results" id="swork-results"></div>
        </div>
        <div class="swork-head-actions">
          <a class="btn btn-outline btn-sm" href="#/dashboard">Close ×</a>
        </div>
      </header>

      <aside class="swork-rail srail" id="srail">
        ${RAIL.map(([section, groups]) => `
          <div class="srail-label">${section}</div>
          ${groups.map(([g, links]) => {
            const open = links.some(l => l.active);
            return `
            <div class="srail-group ${open ? 'open' : ''}">
              <button class="srail-group-btn"><span class="chev">▶</span>${g}</button>
              <div class="srail-links">
                ${links.map(l => `<a class="srail-link ${l.active ? 'active' : ''}" href="${l.href}" data-q="${esc((g + ' ' + l.label).toLowerCase())}">${esc(l.label)}</a>`).join('')}
              </div>
            </div>`;
          }).join('')}`).join('')}
      </aside>

      <div class="swork-body" id="swork-body">
        <div class="swork-body-inner">
          <div class="swork-crumb">
            <a href="#/settings">Settings</a>
            ${activeEntry ? `<span>›</span><span>${esc(activeEntry.group)}</span>` : ''}
            <span>›</span><span>${esc(currentTitle)}</span>
          </div>
          <div id="settings-body"></div>
        </div>
      </div>
    </div>`;

  document.body.classList.add('settings-open');

  // Collapsible rail groups
  root.querySelectorAll('.srail-group-btn').forEach(btn =>
    btn.addEventListener('click', () => btn.closest('.srail-group').classList.toggle('open')));

  // Mobile rail drawer
  const rail = document.getElementById('srail');
  document.getElementById('swork-rail-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    rail.classList.toggle('open');
  });
  rail.addEventListener('click', e => { if (e.target.closest('.srail-link')) rail.classList.remove('open'); });

  wireSettingsSearch(INDEX);

  const body = document.getElementById('settings-body');

  // ---- Module settings page ----
  if (moduleKey && MODULE_SETTINGS_DEFS[moduleKey]) {
    return renderModuleSettings(body, moduleKey, mtab);
  }

  body.innerHTML = `<div class="swork-title-row"><div><h2>${esc(tabTitles[tab] || 'Settings')}</h2></div></div><div id="settings-tab-body"></div>`;
  const tb = document.getElementById('settings-tab-body');
  if (tab === 'org') renderOrgTab(tb);
  if (tab === 'prefs' || tab === 'approvals') renderApprovalsTab(tb);
  if (tab === 'currencies') renderCurrenciesTab(tb);
  if (tab === 'taxes') renderTaxesTab(tb);
  if (tab === 'reminders') renderRemindersTab(tb);
  if (tab === 'vendorportal') await renderVendorPortalTab(tb);
  if (tab === 'webhooks') renderWebhooksTab(tb);
  if (tab === 'integrations') await renderIntegrationsTab(tb);
  if (tab === 'departments') renderDepartmentsTab(tb);
  if (tab === 'terms') renderTermsTab(tb);
  if (tab === 'customfields') await renderCustomFieldsTab(tb);
  if (tab === 'templates') await renderTemplatesTab(tb);
  if (tab === 'dashboards') await renderDashboardsTab(tb);
  if (tab === 'users') await renderUsersTab(tb);
  if (tab === 'roles') await renderRolesTab(tb);
  if (tab === 'profiles') await renderProfilesTab(tb);
  if (tab === 'audit') await renderAuditTab(tb);
  if (tab === 'properties') await renderPropertiesTab(tb);
  if (tab === 'assets') await renderAssetsTab(tb);
}

/* =========================================================
   PROPERTIES (multi-property / Hotel Management)
   ========================================================= */
async function renderPropertiesTab(body) {
  const draw = async () => {
    const rows = await api('GET', '/api/properties').catch(() => []);
    state.cache.properties = rows;
    body.innerHTML = `
      <div class="card" style="max-width:900px;">
        <div class="card-header">
          <div class="card-title">Properties <span class="cell-muted">(${rows.length})</span></div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm" id="prop-import">⬆ Import CSV</button>
            <button class="btn btn-primary btn-sm" id="prop-add">+ Add property</button>
          </div>
        </div>
        <div class="card-body flush" id="prop-body"></div>
      </div>
      <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">Each property has its own budgets, requisitions and reporting. Assign users to properties in Settings → Users (property-level users only see their own properties; users with no assignment see the whole group).</p>`;

    body.querySelector('#prop-body').innerHTML = renderTable({
      columns: [
        { key: 'Name', label: 'Property', render: r => `<span class="cell-strong">${esc(r.Name)}</span>` },
        { key: 'Location', label: 'Location', render: r => esc(r.Location || '—') },
        { key: 'Cluster', label: 'Cluster', render: r => esc(r.Cluster || '—') },
        { key: 'Currency', label: 'Currency', render: r => esc(r.Currency || '—') },
        { key: 'Status', label: 'Status', render: r => badge(r.Status || 'Active') }
      ],
      rows,
      empty: { icon: '🏨', title: 'No properties yet', sub: 'Add your properties (hotels/sites). You can bulk-import via CSV.' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-edit="${r.ROWID}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${r.ROWID}" data-name="${esc(r.Name)}">Delete</button>`
    });

    const openForm = (prop) => openModal({
      title: prop ? `Edit property — ${prop.Name}` : 'Add property',
      body: `<div class="form-grid">
        <div class="field full"><label>Property name <span class="req">*</span></label><input type="text" id="p-name" value="${esc(prop?.Name || '')}"></div>
        <div class="field"><label>Location</label><input type="text" id="p-loc" value="${esc(prop?.Location || '')}" placeholder="City"></div>
        <div class="field"><label>Cluster / region</label><input type="text" id="p-cluster" value="${esc(prop?.Cluster || '')}" placeholder="e.g. City Hotels"></div>
        <div class="field"><label>Currency</label><input type="text" id="p-cur" value="${esc(prop?.Currency || state.orgSettings.currency || '')}" placeholder="LKR"></div>
        <div class="field"><label>Fiscal year start</label><input type="text" id="p-fy" value="${esc(prop?.FiscalYearStart || state.orgSettings.fiscalYearStart || '')}" placeholder="January"></div>
      </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${prop ? 'Save' : 'Add'}</button>`,
      onOpen(mb) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const Name = mb.querySelector('#p-name').value.trim();
          if (!Name) return toast('Property name is required.', 'warning');
          const payload = { Name, Location: mb.querySelector('#p-loc').value.trim(), Cluster: mb.querySelector('#p-cluster').value.trim(), Currency: mb.querySelector('#p-cur').value.trim(), FiscalYearStart: mb.querySelector('#p-fy').value.trim() };
          try {
            if (prop) await api('PUT', `/api/properties/${prop.ROWID}`, payload);
            else await api('POST', '/api/properties', payload);
            toast(prop ? 'Property updated.' : `Property "${Name}" added.`); closeModal(); await draw();
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    });

    body.querySelector('#prop-add').addEventListener('click', () => openForm(null));
    body.querySelector('#prop-import').addEventListener('click', () => openPropertyImport(draw));
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(rows.find(r => r.ROWID === b.dataset.edit))));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmDelete('property', b.dataset.name, `/api/properties/${b.dataset.del}`, draw)));
  };
  await draw();
}

// CSV bulk import: columns name, location, cluster, currency, fiscal_year_start
function openPropertyImport(onDone) {
  openModal({
    title: 'Import properties (CSV)',
    body: `
      <p class="cell-muted" style="margin-bottom:10px;">Paste CSV with a header row. Columns: <code>name, location, cluster, currency, fiscal_year_start</code>. Only <strong>name</strong> is required.</p>
      <textarea id="csv-in" rows="8" placeholder="name,location,cluster,currency,fiscal_year_start
Galle Face Hotel,Colombo,City,LKR,January
Kandy Resort,Kandy,Resort,LKR,January"></textarea>
      <div id="csv-preview" class="cell-muted" style="margin-top:8px;font-size:12px;"></div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Import</button>`,
    onOpen(mb) {
      const parse = () => {
        const lines = mb.querySelector('#csv-in').value.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const idx = (name) => headers.indexOf(name);
        return lines.slice(1).map(line => {
          const cells = line.split(',').map(c => c.trim());
          return {
            Name: cells[idx('name')] || '',
            Location: idx('location') > -1 ? cells[idx('location')] : '',
            Cluster: idx('cluster') > -1 ? cells[idx('cluster')] : '',
            Currency: idx('currency') > -1 ? cells[idx('currency')] : '',
            FiscalYearStart: idx('fiscal_year_start') > -1 ? cells[idx('fiscal_year_start')] : ''
          };
        }).filter(p => p.Name);
      };
      mb.querySelector('#csv-in').addEventListener('input', () => {
        const n = parse().length;
        mb.querySelector('#csv-preview').textContent = n ? `${n} propert${n === 1 ? 'y' : 'ies'} ready to import.` : 'Add a header row and at least one property.';
      });
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      document.getElementById('m-save').addEventListener('click', async () => {
        const properties = parse();
        if (!properties.length) return toast('Nothing to import.', 'warning');
        const btn = document.getElementById('m-save'); btn.disabled = true;
        try {
          const r = await api('POST', '/api/properties/bulk', { properties });
          toast(`${r.created} properties imported.`); closeModal(); onDone && onDone();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    }
  });
}

/* =========================================================
   ASSET REGISTER (CapEx approvals seed draft assets)
   ========================================================= */
async function renderAssetsTab(body) {
  const propsById = Object.fromEntries((state.cache.properties || []).map(p => [p.ROWID, p.Name]));
  const rows = await api('GET', '/api/assets').catch(() => []);
  body.innerHTML = `
    <div class="card" style="max-width:960px;">
      <div class="card-header"><div class="card-title">Capital assets <span class="cell-muted">(${rows.length})</span></div></div>
      <div class="card-body flush" id="asset-body"></div>
    </div>
    <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">CapEx requisition lines automatically create <strong>Draft</strong> asset records here. Finance completes the acquisition date and value, then marks them Active for the depreciation schedule.</p>`;

  body.querySelector('#asset-body').innerHTML = renderTable({
    columns: [
      { key: 'Name', label: 'Asset', render: r => `<span class="cell-strong">${esc(r.Name)}</span>` },
      ...(state.orgSettings.multiProperty !== false ? [{ key: 'PropertyID', label: 'Property', render: r => esc(propsById[r.PropertyID] || '—') }] : []),
      { key: 'Category', label: 'Category', render: r => esc(r.Category || '—') },
      { key: 'Value', label: 'Value', num: true, render: r => currency(r.Value) },
      { key: 'AcquisitionDate', label: 'Acquired', render: r => r.AcquisitionDate ? fmtDate(r.AcquisitionDate) : '—' },
      { key: 'Status', label: 'Status', render: r => badge(r.Status || 'Draft') }
    ],
    rows,
    empty: { icon: '🏛️', title: 'No assets yet', sub: 'Approve a CapEx requisition and a draft asset appears here.' },
    rowActions: r => `<button class="btn btn-ghost btn-sm" data-asset="${r.ROWID}">Complete</button>`
  });

  body.querySelectorAll('[data-asset]').forEach(b => b.addEventListener('click', () => {
    const a = rows.find(r => r.ROWID === b.dataset.asset);
    openModal({
      title: `Asset — ${a.Name}`,
      body: `<div class="form-grid">
        <div class="field full"><label>Asset name</label><input type="text" id="a-name" value="${esc(a.Name || '')}"></div>
        <div class="field"><label>Value</label><input type="number" id="a-value" step="0.01" value="${a.Value ?? ''}"></div>
        <div class="field"><label>Acquisition date</label><input type="date" id="a-date" value="${a.AcquisitionDate ? String(a.AcquisitionDate).slice(0,10) : ''}"></div>
        <div class="field"><label>Category</label><input type="text" id="a-cat" value="${esc(a.Category || '')}"></div>
        <div class="field"><label>Status</label><select id="a-status">
          <option ${a.Status === 'Draft' ? 'selected' : ''}>Draft</option>
          <option ${a.Status === 'Active' ? 'selected' : ''}>Active</option>
          <option ${a.Status === 'Disposed' ? 'selected' : ''}>Disposed</option></select></div>
      </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save</button>`,
      onOpen(mb) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          try {
            await api('PUT', `/api/assets/${a.ROWID}`, {
              Name: mb.querySelector('#a-name').value.trim(),
              Value: Number(mb.querySelector('#a-value').value || 0),
              AcquisitionDate: mb.querySelector('#a-date').value,
              Category: mb.querySelector('#a-cat').value.trim(),
              Status: mb.querySelector('#a-status').value
            });
            toast('Asset updated.'); closeModal(); await renderAssetsTab(body);
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    });
  }));
}

// One module's settings: Preferences tab (toggles/options) + Fields tab
// (custom fields scoped to this module only) — like Zoho's module settings.
async function renderModuleSettings(body, moduleKey, mtab) {
  const def = MODULE_SETTINGS_DEFS[moduleKey];
  const prefs = (state.orgSettings.modulePrefs || {})[moduleKey] || {};

  body.innerHTML = `
    <div class="page-head" style="margin-bottom:6px;"><div><h2>${def.icon} ${esc(def.label)}</h2></div></div>
    <div class="form-tabs" style="margin-top:4px;">
      <a class="form-tab ${mtab === 'prefs' ? 'active' : ''}" href="#/settings?module=${moduleKey}&mtab=prefs">Preferences</a>
      ${def.cf ? `<a class="form-tab ${mtab === 'fields' ? 'active' : ''}" href="#/settings?module=${moduleKey}&mtab=fields">Fields</a>` : ''}
    </div>
    <div id="mset-body"></div>`;

  const mbody = document.getElementById('mset-body');

  if (mtab === 'fields' && def.cf) {
    return renderCustomFieldsTab(mbody, def.cf);
  }

  // Preferences tab
  if (!def.prefs.length) {
    mbody.innerHTML = `<div class="card" style="max-width:760px;"><div class="card-body"><div class="empty" style="padding:30px;">
      <div class="icon">⚙️</div><div class="title">No configurable preferences yet</div>
      <div class="sub">This module works out of the box. Options will appear here as they're added.</div></div></div></div>`;
    return;
  }

  mbody.innerHTML = `
    <div class="card" style="max-width:760px;">
      <div class="card-body">
        ${def.prefs.map(p => {
          const val = p.locked ? p.value : (prefs[p.key] ?? (p.type === 'toggle' ? false : ''));
          let control;
          if (p.type === 'toggle') {
            control = `<label class="pf-switch ${p.locked ? 'locked' : ''}">
              <input type="checkbox" data-pref="${p.key}" ${val ? 'checked' : ''} ${p.locked ? 'disabled' : ''}>
              <span class="pf-switch-track"></span></label>`;
          } else if (p.type === 'select') {
            control = `<select data-pref="${p.key}" style="max-width:220px;">${p.options.map(o => `<option ${val === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
          } else {
            control = `<input type="${p.type === 'number' ? 'number' : 'text'}" data-pref="${p.key}" value="${esc(String(val))}" placeholder="${esc(p.placeholder || '')}" style="max-width:280px;">`;
          }
          return `
          <div class="pref-row">
            <div class="pref-info">
              <div class="pref-label">${esc(p.label)} ${p.locked ? '<span class="badge badge-info" style="margin-left:6px;">Platform enforced</span>' : ''}</div>
              ${p.help ? `<div class="pref-help">${esc(p.help)}</div>` : ''}
            </div>
            <div class="pref-control">${control}</div>
          </div>`;
        }).join('')}
        <div style="margin-top:18px;"><button class="btn btn-primary" id="mset-save">Save</button></div>
      </div>
    </div>`;

  document.getElementById('mset-save').addEventListener('click', async () => {
    const btn = document.getElementById('mset-save'); btn.disabled = true;
    const patch = {};
    mbody.querySelectorAll('[data-pref]').forEach(el => {
      if (el.disabled) return;
      patch[el.dataset.pref] = el.type === 'checkbox' ? el.checked
        : el.type === 'number' ? Number(el.value || 0) : el.value.trim();
    });
    try {
      const modulePrefs = { ...(state.orgSettings.modulePrefs || {}), [moduleKey]: patch };
      await saveOrg({ settingsPatch: { modulePrefs } });
      toast(`${def.label} preferences saved.`);
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false;
  });
}

async function renderAuditTab(body) {
  body.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Activity audit log</div>
        <button class="btn btn-ghost btn-sm" id="audit-refresh">⟳ Refresh</button></div>
      <div class="card-body flush" id="audit-body">${skeletonRows(5)}</div>
    </div>
    <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">The last 200 recorded actions — who did what, and when. Requisition, approval, PO, receipt, invoice and payment events are tracked.</p>`;

  const load = async () => {
    const rows = await api('GET', '/api/audit-log').catch(() => []);
    document.getElementById('audit-body').innerHTML = renderTable({
      columns: [
        { key: 'CREATEDTIME', label: 'When', render: r => fmtDateTime(r.CREATEDTIME) },
        { key: 'ActorEmail', label: 'Who', render: r => `<span class="cell-strong">${esc(r.ActorEmail || 'system')}</span>` },
        { key: 'Action', label: 'Action', render: r => `<span class="badge badge-neutral">${esc(r.Action)}</span>` },
        { key: 'RecordType', label: 'Record', render: r => `${esc(r.RecordType || '')} ${r.RecordID ? `<span class="cell-muted">#${esc(r.RecordID)}</span>` : ''}` },
        { key: 'Detail', label: 'Detail', render: r => `<span class="cell-muted">${esc((r.Detail || '').slice(0, 80))}</span>` }
      ],
      rows,
      empty: { icon: '🧾', title: 'No activity yet', sub: 'Actions across the app will be recorded here.' }
    });
  };
  document.getElementById('audit-refresh').addEventListener('click', load);
  await load();
}

function skeletonRows(n) {
  return Array.from({ length: n }, () => `<div style="display:flex;gap:14px;padding:12px 16px;border-bottom:1px solid var(--border);">
    ${[2, 2, 1, 1, 3].map(f => `<div class="skeleton-cell" style="flex:${f};height:13px;"></div>`).join('')}</div>`).join('');
}

function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value); if (isNaN(d)) return String(value);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Persist a partial settings patch (and optionally the org name) to the server
// and keep the in-memory copies in sync.
async function saveOrg({ settingsPatch = {}, name } = {}) {
  const newSettings = { ...state.orgSettings, ...settingsPatch };
  const payload = { Settings: newSettings };
  if (name !== undefined) payload.Name = name;
  await api('PUT', `/api/organizations/${state.org.ROWID}`, payload);
  state.orgSettings = newSettings;
  if (name) {
    state.org.Name = name;
    document.getElementById('org-chip-name').textContent = name;
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function renderOrgTab(body) {
  const org = state.org || {};
  const s = state.orgSettings || {};
  const initials = esc((org.Name || 'PF').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase());
  body.innerHTML = `
    <div class="org-profile-hero">
      <div class="org-logo-preview" id="org-logo-preview">
        ${s.logoDataUri ? `<img src="${s.logoDataUri}" alt="Logo">` : `<span>${initials}</span>`}
      </div>
      <div class="org-profile-hero-meta">
        <div class="name">${esc(org.Name || 'Your organization')}</div>
        <div class="sub">
          ${badge(org.Status || '—')}
          <span>Hotel Management</span>
          ${s.country ? `<span>· ${esc(s.country)}</span>` : ''}
        </div>
      </div>
      <div>
        <input type="file" id="org-logo-file" accept="image/*" style="display:none;">
        <button class="btn btn-outline btn-sm" id="org-logo-upload">⬆ ${s.logoDataUri ? 'Change' : 'Upload'} logo</button>
        ${s.logoDataUri ? '<button class="btn btn-danger btn-sm" id="org-logo-remove">Remove</button>' : ''}
      </div>
    </div>
    <div class="card" style="max-width:720px;">
      <div class="card-header"><div class="card-title">Organization details</div></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field full"><label>Organization name <span class="req">*</span></label>
            <input type="text" id="org-name" value="${esc(org.Name || '')}"></div>
          <div class="field"><label>Edition</label>
            <input type="text" value="Hotel Management &amp; Property" disabled
                   title="This deployment is the Hotel Management edition. Departments, categories and custom fields follow it.">
            <div class="help">Fixed for this deployment — departments, purchasing categories and hotel fields follow it.</div></div>
          <div class="field"><label>Company phone</label>
            <input type="tel" id="org-phone" value="${esc(s.phone || '')}"></div>
          <div class="field full"><label>Business address</label>
            <input type="text" id="org-address" value="${esc(s.address || '')}"></div>
          <div class="field"><label>Country</label>
            <input type="text" id="org-country" value="${esc(s.country || '')}"></div>
          <div class="field"><label>Time zone</label>
            <input type="text" id="org-timezone" value="${esc(s.timezone || '')}" placeholder="e.g. Asia/Colombo"></div>
          <div class="field"><label>Fiscal year starts in</label>
            <select id="org-fiscal">${MONTHS.map(m => `<option ${s.fiscalYearStart === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        </div>
        <div style="margin-top:16px;"><button class="btn btn-primary" id="org-save">Save changes</button></div>
      </div>
    </div>`;

  // Logo upload: resize client-side to ≤240px and store as data URI in settings.
  const fileInput = document.getElementById('org-logo-file');
  document.getElementById('org-logo-upload').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = async () => {
      const scale = Math.min(1, 240 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/png');
      if (dataUri.length > 60000) return toast('Logo is too complex — use a simpler/smaller image.', 'warning');
      try {
        await saveOrg({ settingsPatch: { logoDataUri: dataUri } });
        toast('Logo uploaded.');
        renderOrgTab(body);
      } catch (err) { toast(err.message, 'error'); }
    };
    img.onerror = () => toast('Could not read that image.', 'error');
    img.src = URL.createObjectURL(file);
  });
  const removeBtn = document.getElementById('org-logo-remove');
  if (removeBtn) removeBtn.addEventListener('click', async () => {
    try { await saveOrg({ settingsPatch: { logoDataUri: '' } }); toast('Logo removed.'); renderOrgTab(body); }
    catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('org-save').addEventListener('click', async () => {
    const btn = document.getElementById('org-save'); btn.disabled = true;
    try {
      const name = document.getElementById('org-name').value.trim();
      if (!name) { toast('Organization name is required.', 'warning'); btn.disabled = false; return; }
      await saveOrg({
        name,
        settingsPatch: {
          phone: document.getElementById('org-phone').value.trim(),
          address: document.getElementById('org-address').value.trim(),
          country: document.getElementById('org-country').value.trim(),
          timezone: document.getElementById('org-timezone').value.trim(),
          fiscalYearStart: document.getElementById('org-fiscal').value
        }
      });
      toast('Organization profile saved.');
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false;
  });
}

/* =========================================================
   APPROVALS — flow mode + limits (Setup & Configurations)
   ========================================================= */
function renderApprovalsTab(body) {
  const s = state.orgSettings || {};
  const prMode = s.approvalRules?.PR || 'Simple';
  body.innerHTML = `
    <div class="card" style="max-width:720px;">
      <div class="card-header"><div class="card-title">Requisition approvals</div></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field full"><label>Approval flow</label>
            <select id="ap-pr-mode">
              <option value="Simple" ${prMode === 'Simple' ? 'selected' : ''}>Simple — one approval, from the requestor's approver</option>
              <option value="Multi-Level" ${prMode === 'Multi-Level' ? 'selected' : ''}>Multi-Level — two sequential approvals for large requests</option>
            </select>
            <div class="help">Multi-Level routes a second approval to the user with the highest approval limit.</div></div>
          <div class="field"><label>Auto-approve limit (${esc(s.currency || 'USD')})</label>
            <input type="number" id="ap-auto-limit" min="0" step="100" value="${Number(s.autoApproveLimit || 0)}">
            <div class="help">Requisitions at or below this total skip approval entirely. 0 = every request needs approval.</div></div>
        </div>
        <div style="margin-top:16px;"><button class="btn btn-primary" id="ap-save">Save</button></div>
      </div>
    </div>
    <div class="card" style="max-width:720px;margin-top:14px;">
      <div class="card-body">
        <div class="pref-row" style="border:none;padding:0;">
          <div class="pref-info">
            <div class="pref-label">Per-approver limits</div>
            <div class="pref-help">Each user has their own approval limit — requests above it escalate up the role hierarchy. Manage limits per user.</div>
          </div>
          <div class="pref-control"><a class="btn btn-outline btn-sm" href="#/settings?tab=users">Open Users →</a></div>
        </div>
      </div>
    </div>`;

  document.getElementById('ap-save').addEventListener('click', async () => {
    const btn = document.getElementById('ap-save'); btn.disabled = true;
    try {
      await saveOrg({
        settingsPatch: {
          autoApproveLimit: Number(document.getElementById('ap-auto-limit').value || 0),
          approvalRules: { ...(s.approvalRules || {}), PR: document.getElementById('ap-pr-mode').value }
        }
      });
      toast('Approval settings saved.');
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false;
  });
}

/* =========================================================
   CURRENCIES — base currency + additional currencies w/ rates
   ========================================================= */
const COMMON_CURRENCIES = ['USD', 'LKR', 'INR', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'CNY', 'MYR', 'THB', 'SAR', 'QAR'];

function renderCurrenciesTab(body) {
  const draw = () => {
    const s = state.orgSettings || {};
    const list = s.currencies || [];
    body.innerHTML = `
      <div class="card" style="max-width:760px;">
        <div class="card-header"><div class="card-title">Base currency</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>Base currency</label>
              <select id="cur-base">${COMMON_CURRENCIES.map(c => `<option ${s.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
              <div class="help">All amounts across the app display in this currency. Budgets and approval limits are in base currency.</div></div>
          </div>
          <div style="margin-top:12px;"><button class="btn btn-primary" id="cur-base-save">Save</button></div>
        </div>
      </div>
      <div class="card" style="max-width:760px;margin-top:14px;">
        <div class="card-header">
          <div class="card-title">Additional currencies <span class="cell-muted">(${list.length})</span></div>
          <button class="btn btn-primary btn-sm" id="cur-add">+ Add currency</button>
        </div>
        <div class="card-body flush" id="cur-body"></div>
      </div>
      <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">Add the currencies your properties or vendors bill in, with an indicative exchange rate to base. Rates are reference values — update them as needed.</p>`;

    body.querySelector('#cur-body').innerHTML = renderTable({
      columns: [
        { key: 'code', label: 'Currency', render: r => `<span class="cell-strong">${esc(r.code)}</span>` },
        { key: 'symbol', label: 'Symbol', render: r => esc(r.symbol || '—') },
        { key: 'rate', label: `1 ${esc(s.currency || 'USD')} =`, num: true, render: r => `${Number(r.rate || 0)} ${esc(r.code)}` }
      ],
      rows: list,
      empty: { icon: '💱', title: 'Single-currency workspace', sub: 'Add currencies to record what foreign vendors and properties bill in.' },
      rowActions: r => `<button class="btn btn-danger btn-sm" data-cur-del="${esc(r.code)}">Remove</button>`
    });

    body.querySelector('#cur-base-save').addEventListener('click', async () => {
      try {
        await saveOrg({ settingsPatch: { currency: body.querySelector('#cur-base').value } });
        toast('Base currency saved.');
      } catch (err) { toast(err.message, 'error'); }
    });

    body.querySelector('#cur-add').addEventListener('click', () => openModal({
      title: 'Add currency',
      body: `<div class="form-grid">
        <div class="field"><label>Currency code <span class="req">*</span></label><input type="text" id="c-code" maxlength="3" placeholder="e.g. EUR" style="text-transform:uppercase;"></div>
        <div class="field"><label>Symbol</label><input type="text" id="c-symbol" maxlength="4" placeholder="€"></div>
        <div class="field full"><label>Exchange rate (1 ${esc(s.currency || 'USD')} = ? )</label><input type="number" id="c-rate" min="0" step="0.0001" placeholder="e.g. 0.92"></div>
      </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Add</button>`,
      onOpen(mb) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const code = mb.querySelector('#c-code').value.trim().toUpperCase();
          const rate = Number(mb.querySelector('#c-rate').value || 0);
          if (!/^[A-Z]{3}$/.test(code)) return toast('Enter a 3-letter currency code (e.g. EUR).', 'warning');
          if (code === (s.currency || 'USD')) return toast('That is already your base currency.', 'warning');
          if (list.some(c => c.code === code)) return toast(`${code} is already added.`, 'warning');
          try {
            await saveOrg({ settingsPatch: { currencies: [...list, { code, symbol: mb.querySelector('#c-symbol').value.trim(), rate }] } });
            toast(`${code} added.`); closeModal(); draw();
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    }));

    body.querySelectorAll('[data-cur-del]').forEach(b => b.addEventListener('click', async () => {
      try {
        await saveOrg({ settingsPatch: { currencies: list.filter(c => c.code !== b.dataset.curDel) } });
        toast('Currency removed.'); draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
  };
  draw();
}

/* =========================================================
   TAXES — rates offered on requisition/PO lines
   ========================================================= */
function renderTaxesTab(body) {
  const draw = () => {
    const s = state.orgSettings || {};
    const taxes = s.taxes || [];
    body.innerHTML = `
      <div class="card" style="max-width:760px;">
        <div class="card-header">
          <div class="card-title">Tax rates <span class="cell-muted">(${taxes.length})</span></div>
          <button class="btn btn-primary btn-sm" id="tax-add">+ New tax</button>
        </div>
        <div class="card-body flush" id="tax-body"></div>
      </div>
      <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">The <strong>default</strong> tax pre-fills the Tax % on every new requisition line (editable per line). Define VAT, GST, sales tax or any levy you charge.</p>`;

    body.querySelector('#tax-body').innerHTML = renderTable({
      columns: [
        { key: 'name', label: 'Tax', render: r => `<span class="cell-strong">${esc(r.name)}</span>${r.isDefault ? ' <span class="badge badge-info">Default</span>' : ''}` },
        { key: 'rate', label: 'Rate', num: true, render: r => `${Number(r.rate || 0)}%` }
      ],
      rows: taxes,
      empty: { icon: '🧮', title: 'No taxes defined', sub: 'Add VAT / GST / sales-tax rates to pre-fill line taxes on requisitions.' },
      rowActions: r => `${r.isDefault ? '' : `<button class="btn btn-ghost btn-sm" data-tax-def="${esc(r.name)}">Set default</button>`}
        <button class="btn btn-danger btn-sm" data-tax-del="${esc(r.name)}">Remove</button>`
    });

    body.querySelector('#tax-add').addEventListener('click', () => openModal({
      title: 'New tax',
      body: `<div class="form-grid">
        <div class="field"><label>Tax name <span class="req">*</span></label><input type="text" id="t-name" placeholder="e.g. VAT 18%"></div>
        <div class="field"><label>Rate (%) <span class="req">*</span></label><input type="number" id="t-rate" min="0" max="100" step="0.01"></div>
        <div class="field full"><label style="display:flex;align-items:center;gap:8px;font-weight:400;">
          <input type="checkbox" id="t-default" style="width:auto;"> Make this the default tax</label></div>
      </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Add tax</button>`,
      onOpen(mb) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const name = mb.querySelector('#t-name').value.trim();
          const rate = Number(mb.querySelector('#t-rate').value);
          if (!name || isNaN(rate) || rate < 0) return toast('Name and a valid rate are required.', 'warning');
          if (taxes.some(t => t.name.toLowerCase() === name.toLowerCase())) return toast('That tax already exists.', 'warning');
          const isDefault = mb.querySelector('#t-default').checked;
          const next = taxes.map(t => isDefault ? { ...t, isDefault: false } : t);
          next.push({ name, rate, isDefault: isDefault || taxes.length === 0 });
          try {
            await saveOrg({ settingsPatch: { taxes: next } });
            toast(`Tax "${name}" added.`); closeModal(); draw();
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    }));

    body.querySelectorAll('[data-tax-def]').forEach(b => b.addEventListener('click', async () => {
      try {
        await saveOrg({ settingsPatch: { taxes: taxes.map(t => ({ ...t, isDefault: t.name === b.dataset.taxDef })) } });
        toast('Default tax updated.'); draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
    body.querySelectorAll('[data-tax-del]').forEach(b => b.addEventListener('click', async () => {
      try {
        await saveOrg({ settingsPatch: { taxes: taxes.filter(t => t.name !== b.dataset.taxDel) } });
        toast('Tax removed.'); draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
  };
  draw();
}

/* =========================================================
   REMINDERS & ALERTS — drives Home → Attention Required
   ========================================================= */
function renderRemindersTab(body) {
  const s = state.orgSettings || {};
  const rem = s.reminders || {};
  const reviewOn = rem.reviewBills !== false;
  body.innerHTML = `
    <div class="card" style="max-width:760px;">
      <div class="card-header"><div class="card-title">Attention Required alerts</div></div>
      <div class="card-body">
        <div class="pref-row">
          <div class="pref-info">
            <div class="pref-label">Budget utilization warning (%)</div>
            <div class="pref-help">Budgets whose committed + spent reaches this % of the allocation appear on the Home page under Attention Required.</div>
          </div>
          <div class="pref-control"><input type="number" id="rem-budget" min="1" max="100" value="${Number(rem.budgetWarnPct || 80)}" style="max-width:110px;"></div>
        </div>
        <div class="pref-row">
          <div class="pref-info">
            <div class="pref-label">Alert on bills flagged for review</div>
            <div class="pref-help">Bills whose 3-way match landed within tolerance ("Review" status) show on the Home page until resolved.</div>
          </div>
          <div class="pref-control"><label class="pf-switch"><input type="checkbox" id="rem-review" ${reviewOn ? 'checked' : ''}><span class="pf-switch-track"></span></label></div>
        </div>
        <div style="margin-top:16px;"><button class="btn btn-primary" id="rem-save">Save</button></div>
      </div>
    </div>
    <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">Pending approvals, match discrepancies and orders awaiting receipt are always alerted — these controls tune the optional alerts.</p>`;

  document.getElementById('rem-save').addEventListener('click', async () => {
    const btn = document.getElementById('rem-save'); btn.disabled = true;
    try {
      await saveOrg({
        settingsPatch: {
          reminders: {
            ...(s.reminders || {}),
            budgetWarnPct: Math.min(100, Math.max(1, Number(document.getElementById('rem-budget').value || 80))),
            reviewBills: document.getElementById('rem-review').checked
          }
        }
      });
      toast('Reminder settings saved.');
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false;
  });
}

/* =========================================================
   VENDOR PORTAL — Zoho-style: portal URL header, login/access
   info, permission toggles, banner message, and the vendor
   access list (invite / revoke / resend).
   ========================================================= */
// key, label, help, defaultOn — mirrors the backend's vendorPortalPrefs() defaults.
const VP_TOGGLES = [
  ['allowBidding', 'Allow vendors to submit bids on RFQs', 'Vendors invited to an RFQ can enter and update a bid until the deadline.', true],
  ['allowPOAcceptReject', 'Allow vendors to accept/reject purchase orders', 'The orders you send them become visible in the portal, where they can accept or reject with a reason.', true],
  ['allowContactUpdate', 'Allow vendors to update their contact details in the portal', 'Vendors can propose changes to their own email/phone/address for you to review.', false],
  ['allowInvoiceUpload', 'Allow vendors to upload supporting documents for their bills', 'Vendors can attach invoice copies that support purchases you make from them.', false]
];

async function renderVendorPortalTab(body) {
  const draw = async () => {
    const s = state.orgSettings || {};
    const vp = s.vendorPortal || {};
    const enabled = vp.enabled !== false;
    // Resolve next to the current page so the link is right wherever the app is hosted.
    const portalUrl = new URL('vendor_portal.html', window.location.href).toString();

    let access = [];
    try { access = await api('GET', '/api/vendor-portal/access'); } catch {}
    const accessByVendor = Object.fromEntries(access.map(a => [String(a.VendorID), a]));

    // The access table lists every vendor — make sure the cache is warm even if
    // the user landed here before ever opening the Vendors module.
    if (!(state.cache.suppliers || []).length) {
      state.cache.suppliers = await api('GET', '/api/suppliers').catch(() => []);
    }

    body.innerHTML = `
      <div class="card" style="max-width:820px;">
        <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
          <div>
            <div class="cell-muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;">Portal URL</div>
            <div style="margin-top:4px;"><a href="${esc(portalUrl)}" target="_blank" rel="noopener" style="font-weight:600;">${esc(portalUrl)}</a>
              <button class="btn btn-ghost btn-sm" id="vp-copy-url" title="Copy">⧉ Copy</button></div>
          </div>
          <label class="pf-switch"><input type="checkbox" id="vp-enabled" ${enabled ? 'checked' : ''}><span class="pf-switch-track"></span></label>
        </div>
      </div>

      <div class="card" style="max-width:820px;margin-top:14px;">
        <div class="card-header"><div class="card-title">Vendor permissions</div></div>
        <div class="card-body">
          ${VP_TOGGLES.map(([key, label, help, defaultOn]) => {
            const checked = vp[key] === undefined ? defaultOn : !!vp[key];
            return `
            <div class="pref-row">
              <div class="pref-info"><div class="pref-label">${esc(label)}</div><div class="pref-help">${esc(help)}</div></div>
              <div class="pref-control"><label class="pf-switch"><input type="checkbox" class="vp-toggle" data-k="${key}" ${checked ? 'checked' : ''}><span class="pf-switch-track"></span></label></div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card" style="max-width:820px;margin-top:14px;">
        <div class="card-header"><div class="card-title">Banner message</div></div>
        <div class="card-body">
          <div class="field full"><label>Shown at the top of the vendor's Home page</label>
            <textarea id="vp-banner" rows="2" placeholder="e.g. Holiday office closure Dec 24–26 — bill submissions will be processed when we return.">${esc(vp.bannerMessage || '')}</textarea></div>
          <div style="margin-top:12px;"><button class="btn btn-primary" id="vp-save">Save vendor portal settings</button></div>
        </div>
      </div>

      <div class="card" style="max-width:820px;margin-top:14px;">
        <div class="card-header"><div class="card-title">Vendor access</div></div>
        <div class="card-body flush" id="vp-access-body"></div>
      </div>
      <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">Invite a vendor from here, or from the ⋯ menu on a vendor's row in the Vendors module. They set their own access code from a one-time link — you never see or choose their code.</p>`;

    body.querySelector('#vp-access-body').innerHTML = renderTable({
      columns: [
        { key: 'Name', label: 'Vendor', render: r => `<span class="cell-strong">${esc(r.Name)}</span>` },
        { key: 'ContactEmail', label: 'Email' },
        {
          key: 'access', label: 'Portal access', render: r => {
            const a = accessByVendor[r.ROWID];
            if (!a) return '<span class="badge badge-neutral">Not invited</span>';
            if (a.Status === 'Active') return '<span class="badge badge-good">Active</span>';
            if (a.Status === 'Invited') return '<span class="badge badge-warning">Invited — pending</span>';
            return '<span class="badge badge-neutral">Revoked</span>';
          }
        },
        { key: 'LastLoginAt', label: 'Last sign-in', render: r => { const a = accessByVendor[r.ROWID]; return a?.LastLoginAt ? fmtDateTime(a.LastLoginAt) : '—'; } }
      ],
      rows: state.cache.suppliers || [],
      empty: { icon: '🤝', title: 'No vendors yet', sub: 'Add vendors in the Vendors module first, then invite them here.' },
      rowActions: r => {
        const a = accessByVendor[r.ROWID];
        if (!a || a.Status === 'Revoked') return `<button class="btn btn-outline btn-sm" data-vp-invite="${r.ROWID}">${a ? 'Re-invite' : 'Invite'}</button>`;
        if (a.Status === 'Invited') return `<button class="btn btn-outline btn-sm" data-vp-invite="${r.ROWID}">Resend invite</button>
          <button class="btn btn-danger btn-sm" data-vp-revoke="${r.ROWID}">Revoke</button>`;
        return `<button class="btn btn-danger btn-sm" data-vp-revoke="${r.ROWID}">Revoke access</button>`;
      }
    });

    body.querySelectorAll('[data-vp-invite]').forEach(btn => btn.addEventListener('click', () => inviteVendor(btn.dataset.vpInvite, draw)));
    body.querySelectorAll('[data-vp-revoke]').forEach(btn => btn.addEventListener('click', async () => {
      const vendor = (state.cache.suppliers || []).find(x => x.ROWID === btn.dataset.vpRevoke);
      if (!confirm(`Revoke portal access for ${vendor?.Name || 'this vendor'}? They will be signed out immediately.`)) return;
      try { await api('POST', '/api/vendor-portal/revoke', { VendorID: btn.dataset.vpRevoke }); toast('Access revoked.'); await draw(); }
      catch (err) { toast(err.message, 'error'); }
    }));

    body.querySelector('#vp-copy-url').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(portalUrl); toast('Portal URL copied.'); }
      catch { toast('Could not copy — select and copy the URL manually.', 'warning'); }
    });

    body.querySelector('#vp-save').addEventListener('click', async () => {
      const btn = body.querySelector('#vp-save'); btn.disabled = true;
      try {
        const patch = { enabled: body.querySelector('#vp-enabled').checked, bannerMessage: body.querySelector('#vp-banner').value.trim() };
        body.querySelectorAll('.vp-toggle').forEach(cb => { patch[cb.dataset.k] = cb.checked; });
        await saveOrg({ settingsPatch: { vendorPortal: { ...vp, ...patch } } });
        toast('Vendor portal settings saved.');
      } catch (err) { toast(err.message, 'error'); }
      btn.disabled = false;
    });
  };
  await draw();
}

async function inviteVendor(vendorId, onDone) {
  try {
    const r = await api('POST', '/api/vendor-portal/invite', { VendorID: vendorId });
    // Compose the link client-side: vendor_portal.html lives next to index.html,
    // so resolving relative to the current page gives the correct origin + path
    // regardless of where the app is hosted.
    const link = new URL('vendor_portal.html', window.location.href);
    link.search = `?invite=${encodeURIComponent(r.inviteToken)}&vendor=${encodeURIComponent(r.vendorId)}`;
    const inviteUrl = link.toString();
    openModal({
      title: 'Invite created',
      body: `
        <p style="margin-bottom:10px;">${esc(r.message)}</p>
        <div class="field"><label>Invite link</label><input type="text" readonly value="${esc(inviteUrl)}" onclick="this.select()"></div>
        <p class="cell-muted" style="font-size:12px;margin-top:8px;">This link expires in 7 days and works once — the vendor sets their own access code when they open it.</p>`,
      footer: `<button class="btn btn-outline" id="vp-inv-copy">⧉ Copy link</button><button class="btn btn-primary" id="m-cancel">Done</button>`,
      onOpen(mb) {
        document.getElementById('m-cancel').addEventListener('click', () => { closeModal(); onDone && onDone(); });
        document.getElementById('vp-inv-copy').addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(inviteUrl); toast('Invite link copied.'); }
          catch { mb.querySelector('input').select(); }
        });
      }
    });
  } catch (err) { toast(err.message, 'error'); }
}

/* =========================================================
   WORKFLOW WEBHOOKS — POST business events to your endpoints
   ========================================================= */
const WEBHOOK_EVENTS = [
  ['pr.created', 'Requisition created'],
  ['pr.approved', 'Requisition approved'],
  ['pr.rejected', 'Requisition rejected'],
  ['po.created', 'Purchase order created'],
  ['grn.created', 'Goods receipt logged'],
  ['invoice.created', 'Bill recorded'],
  ['payment.created', 'Payment made']
];

function renderWebhooksTab(body) {
  const draw = () => {
    const s = state.orgSettings || {};
    const hooks = s.webhooks || [];
    const evLabel = Object.fromEntries(WEBHOOK_EVENTS);
    body.innerHTML = `
      <div class="card" style="max-width:860px;">
        <div class="card-header">
          <div class="card-title">Webhooks <span class="cell-muted">(${hooks.length})</span></div>
          <button class="btn btn-primary btn-sm" id="wh-add">+ New webhook</button>
        </div>
        <div class="card-body flush" id="wh-body"></div>
      </div>
      <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">When an event fires (requisition approved, bill recorded…), we POST a JSON payload to your URL with an <code>X-Webhook-Secret</code> header if a secret is set. Connect Zoho Flow, Slack (via a relay), or your own systems.</p>`;

    body.querySelector('#wh-body').innerHTML = renderTable({
      columns: [
        { key: 'name', label: 'Webhook', render: r => `<span class="cell-strong">${esc(r.name || 'Webhook')}</span>` },
        { key: 'url', label: 'URL', render: r => `<span class="cell-muted" style="word-break:break-all;">${esc((r.url || '').slice(0, 60))}</span>` },
        { key: 'events', label: 'Events', render: r => (!r.events || r.events.length === 0) ? '<span class="badge badge-info">All events</span>' : `<span class="cell-muted">${r.events.map(e => esc(evLabel[e] || e)).join(' · ')}</span>` },
        { key: 'active', label: 'Status', render: r => badge(r.active === false ? 'Inactive' : 'Active') }
      ],
      rows: hooks,
      empty: { icon: '🪝', title: 'No webhooks yet', sub: 'Push procurement events to Zoho Flow, your ERP, or any HTTPS endpoint in real time.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-wh-test="${hooks.indexOf(r)}">Test</button>
        <button class="btn btn-ghost btn-sm" data-wh-edit="${hooks.indexOf(r)}">Edit</button>
        <button class="btn btn-danger btn-sm" data-wh-del="${hooks.indexOf(r)}">Remove</button>`
    });

    const openForm = (hook, idx) => openModal({
      title: hook ? 'Edit webhook' : 'New webhook',
      body: `
        <div class="form-grid">
          <div class="field"><label>Name</label><input type="text" id="w-name" value="${esc(hook?.name || '')}" placeholder="e.g. ERP sync"></div>
          <div class="field"><label>Secret (optional)</label><input type="text" id="w-secret" value="${esc(hook?.secret || '')}" placeholder="Sent as X-Webhook-Secret"></div>
          <div class="field full"><label>Endpoint URL <span class="req">*</span></label><input type="url" id="w-url" value="${esc(hook?.url || '')}" placeholder="https://example.com/hooks/procurement"></div>
          <div class="field full"><label>Events <span class="cell-muted">(none checked = all events)</span></label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid var(--border);border-radius:8px;padding:12px;">
              ${WEBHOOK_EVENTS.map(([v, l]) => `<label style="display:flex;align-items:center;gap:8px;font-weight:400;">
                <input type="checkbox" class="w-ev" value="${v}" ${hook?.events?.includes(v) ? 'checked' : ''} style="width:auto;"> ${l}</label>`).join('')}
            </div></div>
          <div class="field full"><label style="display:flex;align-items:center;gap:8px;font-weight:400;">
            <input type="checkbox" id="w-active" ${hook?.active === false ? '' : 'checked'} style="width:auto;"> Active</label></div>
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${hook ? 'Save' : 'Create webhook'}</button>`,
      onOpen(mb) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const url = mb.querySelector('#w-url').value.trim();
          if (!/^https?:\/\//i.test(url)) return toast('Enter a valid http(s) URL.', 'warning');
          const entry = {
            name: mb.querySelector('#w-name').value.trim() || 'Webhook',
            url,
            secret: mb.querySelector('#w-secret').value.trim(),
            events: [...mb.querySelectorAll('.w-ev:checked')].map(cb => cb.value),
            active: mb.querySelector('#w-active').checked
          };
          const next = [...hooks];
          if (hook) next[idx] = entry; else next.push(entry);
          try {
            await saveOrg({ settingsPatch: { webhooks: next } });
            toast(hook ? 'Webhook updated.' : 'Webhook created.'); closeModal(); draw();
          } catch (err) { toast(err.message, 'error'); }
        });
      }
    });

    body.querySelector('#wh-add').addEventListener('click', () => openForm(null));
    body.querySelectorAll('[data-wh-edit]').forEach(b => b.addEventListener('click', () => openForm(hooks[Number(b.dataset.whEdit)], Number(b.dataset.whEdit))));
    body.querySelectorAll('[data-wh-del]').forEach(b => b.addEventListener('click', async () => {
      try {
        await saveOrg({ settingsPatch: { webhooks: hooks.filter((_, i) => i !== Number(b.dataset.whDel)) } });
        toast('Webhook removed.'); draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
    body.querySelectorAll('[data-wh-test]').forEach(b => b.addEventListener('click', async () => {
      const h = hooks[Number(b.dataset.whTest)];
      b.disabled = true; b.textContent = 'Testing…';
      try {
        const r = await api('POST', '/api/integrations/webhooks/test', { url: h.url, secret: h.secret });
        toast(r.ok ? `Endpoint answered ${r.statusCode} in ${r.ms} ms.` : `Endpoint reachable but returned HTTP ${r.statusCode}.`, r.ok ? 'success' : 'warning');
      } catch (err) { toast(err.message, 'error'); }
      b.disabled = false; b.textContent = 'Test';
    }));
  };
  draw();
}

/* =========================================================
   INTEGRATIONS — Zoho Books sync (vendors / items / bills)
   ========================================================= */
const BOOKS_DCS = [
  ['com', 'zoho.com (US)'], ['in', 'zoho.in (India)'], ['eu', 'zoho.eu (Europe)'],
  ['com.au', 'zoho.com.au (Australia)'], ['jp', 'zoho.jp (Japan)'], ['sa', 'zoho.sa (Saudi Arabia)'], ['ca', 'zohocloud.ca (Canada)']
];

async function renderIntegrationsTab(body) {
  body.innerHTML = skeletonRows(4);
  // Surface the ?books=connected|error&msg=… that the OAuth callback bounced us
  // back with, then strip it from the URL so a refresh doesn't re-toast.
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('books')) {
      toast(sp.get('msg') || (sp.get('books') === 'connected' ? 'Connected to Zoho Books.' : 'Connection failed.'),
        sp.get('books') === 'connected' ? 'success' : 'error');
      sp.delete('books'); sp.delete('msg');
      const clean = window.location.pathname + (sp.toString() ? '?' + sp : '') + window.location.hash;
      window.history.replaceState({}, '', clean);
    }
  } catch {}

  const info = await api('GET', '/api/integrations/books').catch(() => null);
  const cfg = info?.config || {};
  const connected = !!cfg.connected;
  const sync = { vendors: true, items: true, bills: false, ...(cfg.sync || {}) };
  const log = info?.log || null;

  const statusBadge = connected ? badge('Connected')
    : '<span class="badge badge-neutral">Not connected</span>';

  body.innerHTML = `
    <div class="card" style="max-width:860px;">
      <div class="card-body" style="display:flex;gap:16px;align-items:center;">
        <div style="font-size:34px;width:60px;height:60px;display:grid;place-items:center;border-radius:14px;background:var(--surface-2);border:1px solid var(--border);flex:none;">📘</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:15px;">Zoho Books ${statusBadge}</div>
          <div class="cell-muted" style="font-size:12.5px;margin-top:3px;">Push vendors as Books contacts, catalog items as Books items, and matched bills as Books bills — accounting stays in sync without re-keying.${info?.lastSyncAt ? ` Last sync: ${esc(new Date(info.lastSyncAt).toLocaleString())}.` : ''}</div>
        </div>
      </div>
    </div>

    <div class="card" style="max-width:860px;margin-top:14px;">
      <div class="card-header"><div class="card-title">Connection</div></div>
      <div class="card-body">
        ${connected ? `
          <div class="pref-row">
            <div class="pref-info">
              <div class="pref-label">Your Zoho Books account is connected ✓</div>
              <div class="pref-help">${cfg.booksOrgName ? `Syncing into <strong>${esc(cfg.booksOrgName)}</strong>` : 'Choose which Books organization to sync into below.'} · ${BOOKS_DCS.find(d => d[0] === cfg.dc)?.[1] || cfg.dc}</div>
            </div>
            <div class="pref-control"><button class="btn btn-outline btn-sm" id="bk-disconnect">Disconnect</button></div>
          </div>
          <div class="form-grid" style="margin-top:12px;">
            <div class="field full"><label>Zoho Books organization</label>
              <select id="bk-orgsel"><option value="${esc(cfg.booksOrgId || '')}">${cfg.booksOrgName ? esc(cfg.booksOrgName) : (cfg.booksOrgId ? esc(cfg.booksOrgId) : 'Loading organizations…')}</option></select>
              <div class="help">Which Books org receives the synced vendors, items and bills.</div></div>
          </div>
        ` : `
          <p class="cell-muted" style="font-size:13px;margin:0 0 14px;">Connect your own Zoho Books account in one click — sign in with Zoho and approve access. No API keys or tokens to copy.</p>
          <div class="form-grid">
            <div class="field"><label>Data center</label>
              <select id="bk-dc">${BOOKS_DCS.map(([v, l]) => `<option value="${v}" ${cfg.dc === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
              <div class="help">Pick the Zoho region where your Books account lives.</div></div>
          </div>
          <div style="margin-top:16px;">
            <button class="btn btn-primary" id="bk-connect">🔗 Connect to Zoho Books</button>
          </div>
        `}

        <div class="card-title" style="margin:22px 0 4px;">What to sync</div>
        ${[['vendors', 'Vendors → Books contacts', 'Every vendor becomes a Books vendor contact.'],
           ['items', 'Items → Books items', 'Catalog items with price, SKU and goods/service type.'],
           ['bills', 'Bills → Books bills', 'Matched supplier bills post to Books against the synced vendor (needs an expense account in Books).']]
          .map(([k, l, h]) => `
          <div class="pref-row">
            <div class="pref-info"><div class="pref-label">${l}</div><div class="pref-help">${h}</div></div>
            <div class="pref-control"><label class="pf-switch"><input type="checkbox" class="bk-sync" data-k="${k}" ${sync[k] ? 'checked' : ''}><span class="pf-switch-track"></span></label></div>
          </div>`).join('')}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
          <button class="btn btn-outline" id="bk-save">Save sync options</button>
          ${connected ? '<button class="btn btn-primary" id="bk-sync-now">⟳ Sync now</button>' : ''}
        </div>
      </div>
    </div>

    <div id="bk-log-zone" style="max-width:860px;margin-top:14px;">${booksLogHTML(log)}</div>`;

  const collect = () => ({
    dc: cfg.dc || 'com',
    booksOrgId: body.querySelector('#bk-orgsel')?.value || cfg.booksOrgId || '',
    booksOrgName: body.querySelector('#bk-orgsel')?.selectedOptions?.[0]?.textContent || cfg.booksOrgName || '',
    sync: Object.fromEntries([...body.querySelectorAll('.bk-sync')].map(cb => [cb.dataset.k, cb.checked]))
  });

  // Not connected → kick off OAuth (full redirect to Zoho consent).
  const connectBtn = body.querySelector('#bk-connect');
  if (connectBtn) connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true; connectBtn.textContent = 'Opening Zoho…';
    try {
      const dc = body.querySelector('#bk-dc').value;
      const r = await api('GET', `/api/integrations/books/connect?dc=${encodeURIComponent(dc)}`);
      window.location.href = r.authUrl; // Zoho consent → callback → back here
    } catch (err) { toast(err.message, 'error'); connectBtn.disabled = false; connectBtn.textContent = '🔗 Connect to Zoho Books'; }
  });

  // Connected → load their org list into the picker.
  const orgSel = body.querySelector('#bk-orgsel');
  if (orgSel) {
    api('POST', '/api/integrations/books/test').then(r => {
      const orgs = r.organizations || [];
      if (orgs.length) {
        orgSel.innerHTML = orgs.map(o => `<option value="${esc(o.id)}" ${String(o.id) === String(cfg.booksOrgId) ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
      }
    }).catch(() => {});
  }

  const disc = body.querySelector('#bk-disconnect');
  if (disc) disc.addEventListener('click', async () => {
    if (!confirm('Disconnect Zoho Books? You can reconnect anytime.')) return;
    disc.disabled = true;
    try { await api('POST', '/api/integrations/books/disconnect'); toast('Disconnected.'); await renderIntegrationsTab(body); }
    catch (err) { toast(err.message, 'error'); disc.disabled = false; }
  });

  body.querySelector('#bk-save').addEventListener('click', async () => {
    const b = body.querySelector('#bk-save'); b.disabled = true;
    try { await api('PUT', '/api/integrations/books', collect()); toast('Zoho Books settings saved.'); }
    catch (err) { toast(err.message, 'error'); }
    b.disabled = false;
  });

  const syncBtn = body.querySelector('#bk-sync-now');
  if (syncBtn) syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true; syncBtn.textContent = 'Syncing…';
    try {
      await api('PUT', '/api/integrations/books', collect());
      const r = await api('POST', '/api/integrations/books/sync');
      const s = r.summary || {};
      toast(`Sync finished — vendors ${s.vendors?.created || 0} new, items ${s.items?.created || 0} new, bills ${s.bills?.created || 0} new.`);
      document.getElementById('bk-log-zone').innerHTML = booksLogHTML(s);
    } catch (err) { toast(err.message, 'error'); }
    syncBtn.disabled = false; syncBtn.textContent = '⟳ Sync now';
  });
}

function booksLogHTML(log) {
  if (!log) return '';
  const row = (label, s = {}) => `<tr><td class="cell-strong">${label}</td>
    <td class="num">${Number(s.created || 0)}</td><td class="num">${Number(s.skipped || 0)}</td>
    <td class="num">${Number(s.failed || 0) ? `<span class="badge badge-critical">${s.failed}</span>` : '0'}</td></tr>`;
  return `
    <div class="card">
      <div class="card-header"><div class="card-title">Last sync</div>
        ${log.finishedAt ? `<span class="cell-muted" style="font-size:12px;">${esc(new Date(log.finishedAt).toLocaleString())}</span>` : ''}</div>
      <div class="card-body flush">
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Record type</th><th class="num">Created</th><th class="num">Already synced</th><th class="num">Failed</th></tr></thead>
          <tbody>${row('Vendors', log.vendors)}${row('Items', log.items)}${row('Bills', log.bills)}</tbody>
        </table></div>
        ${(log.errors && log.errors.length) ? `
          <div style="padding:12px 16px;border-top:1px solid var(--border);">
            <div class="card-title" style="margin-bottom:8px;">Errors</div>
            ${log.errors.map(e => `<div class="cell-muted" style="font-size:12.5px;padding:3px 0;"><span class="badge badge-warning">${esc(e.kind)}</span> <strong>${esc(e.name || '')}</strong> — ${esc(e.error)}</div>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
}

function renderDepartmentsTab(body) {
  const draw = () => {
    const departments = state.orgSettings.departments || [];
    body.innerHTML = `
      <div class="card" style="max-width:720px;">
        <div class="card-header">
          <div class="card-title">Departments</div>
          <button class="btn btn-primary btn-sm" id="dept-add-btn">+ Add department</button>
        </div>
        <div class="card-body flush">
          ${departments.length === 0
            ? `<div class="empty"><div class="icon">🏷️</div><div class="title">No departments yet</div>
               <div class="sub">Departments drive budget control and appear as a dropdown on requisitions.</div></div>`
            : `<div class="table-wrap"><table class="data"><thead><tr><th>Department</th><th class="num"></th></tr></thead><tbody>
                ${departments.map((d, i) => `<tr><td class="cell-strong">${esc(d)}</td>
                  <td class="num"><button class="btn btn-danger btn-sm" data-remove="${i}">Remove</button></td></tr>`).join('')}
               </tbody></table></div>`}
        </div>
      </div>`;

    body.querySelector('#dept-add-btn').addEventListener('click', () => {
      openModal({
        title: 'Add department',
        body: `<div class="field"><label>Department name <span class="req">*</span></label>
               <input type="text" id="dept-name" placeholder="e.g. Housekeeping &amp; Rooms"></div>`,
        footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Add</button>`,
        onOpen(mbody) {
          document.getElementById('m-cancel').addEventListener('click', closeModal);
          document.getElementById('m-save').addEventListener('click', async () => {
            const name = mbody.querySelector('#dept-name').value.trim();
            if (!name) return toast('Enter a department name.', 'warning');
            if (departments.some(d => d.toLowerCase() === name.toLowerCase())) return toast('That department already exists.', 'warning');
            try {
              await saveOrg({ settingsPatch: { departments: [...departments, name] } });
              toast(`Department "${name}" added.`);
              closeModal(); draw();
            } catch (err) { toast(err.message, 'error'); }
          });
        }
      });
    });

    body.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.remove);
      const next = departments.filter((_, i) => i !== idx);
      try {
        await saveOrg({ settingsPatch: { departments: next } });
        toast('Department removed.');
        draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
  };
  draw();
}

function renderTermsTab(body) {
  const draw = () => {
    const terms = state.orgSettings.paymentTerms || [];
    body.innerHTML = `
      <div class="card" style="max-width:720px;">
        <div class="card-header">
          <div class="card-title">Payment terms</div>
          <button class="btn btn-primary btn-sm" id="term-add-btn">+ Add term</button>
        </div>
        <div class="card-body flush">
          ${terms.length === 0
            ? `<div class="empty"><div class="icon">📆</div><div class="title">No payment terms yet</div>
               <div class="sub">Payment terms are offered when converting requisitions into purchase orders.</div></div>`
            : `<div class="table-wrap"><table class="data"><thead><tr><th>Term</th><th class="num">Days</th><th class="num"></th></tr></thead><tbody>
                ${terms.map((t, i) => `<tr><td class="cell-strong">${esc(t.name)}</td><td class="num">${Number(t.days)}</td>
                  <td class="num"><button class="btn btn-danger btn-sm" data-remove="${i}">Remove</button></td></tr>`).join('')}
               </tbody></table></div>`}
        </div>
      </div>`;

    body.querySelector('#term-add-btn').addEventListener('click', () => {
      openModal({
        title: 'Add payment term',
        body: `
          <div class="form-grid">
            <div class="field"><label>Term name <span class="req">*</span></label><input type="text" id="term-name" placeholder="e.g. Net 45"></div>
            <div class="field"><label>Number of days <span class="req">*</span></label><input type="number" id="term-days" min="0" step="1"></div>
          </div>`,
        footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Add</button>`,
        onOpen(mbody) {
          document.getElementById('m-cancel').addEventListener('click', closeModal);
          document.getElementById('m-save').addEventListener('click', async () => {
            const name = mbody.querySelector('#term-name').value.trim();
            const days = Number(mbody.querySelector('#term-days').value);
            if (!name || isNaN(days)) return toast('Name and days are required.', 'warning');
            try {
              await saveOrg({ settingsPatch: { paymentTerms: [...terms, { name, days }] } });
              toast(`Payment term "${name}" added.`);
              closeModal(); draw();
            } catch (err) { toast(err.message, 'error'); }
          });
        }
      });
    });

    body.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.remove);
      try {
        await saveOrg({ settingsPatch: { paymentTerms: terms.filter((_, i) => i !== idx) } });
        toast('Payment term removed.');
        draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
  };
  draw();
}


/* =========================================================
   CUSTOM FIELDS (Settings tab)
   ========================================================= */
const CF_MODULES = [
  ['prs', 'Purchase Requests'],
  ['vendors', 'Vendors'],
  ['items', 'Items']
];
const CF_TYPES = [['text', 'Text'], ['number', 'Number'], ['date', 'Date'], ['select', 'Dropdown'], ['boolean', 'Checkbox']];

// When `onlyModule` is set (per-module settings page), the list is filtered
// to that module and new fields are locked to it.
async function renderCustomFieldsTab(body, onlyModule) {
  const draw = async () => {
    let fields = await api('GET', '/api/custom-fields').catch(() => []);
    if (onlyModule) fields = fields.filter(f => f.Module === onlyModule);
    const moduleLabel = Object.fromEntries(CF_MODULES);
    body.innerHTML = `
      <div class="card" style="max-width:820px;">
        <div class="card-header">
          <div class="card-title">${onlyModule ? `Custom fields — ${esc(moduleLabel[onlyModule] || onlyModule)}` : 'Custom fields on native modules'}</div>
          <button class="btn btn-primary btn-sm" id="cf-add-btn">+ New custom field</button>
        </div>
        <div class="card-body flush" id="cf-body"></div>
      </div>`;

    body.querySelector('#cf-body').innerHTML = renderTable({
      columns: [
        { key: 'FieldName', label: 'Field', render: r => `<span class="cell-strong">${esc(r.FieldName)}</span>` },
        ...(onlyModule ? [] : [{ key: 'Module', label: 'Module', render: r => esc(moduleLabel[r.Module] || r.Module) }]),
        { key: 'FieldType', label: 'Type' },
        { key: 'Options', label: 'Options', render: r => `<span class="cell-muted">${esc((r.Options || '').slice(0, 50))}</span>` }
      ],
      rows: fields,
      empty: { icon: '🧷', title: 'No custom fields yet', sub: 'Add fields to requisition, vendor and item forms — they appear instantly.' },
      rowActions: r => `<button class="btn btn-danger btn-sm" data-cf-del="${r.ROWID}">Remove</button>`
    });

    document.getElementById('cf-add-btn').addEventListener('click', () => {
      openModal({
        title: 'New custom field',
        body: `
          <div class="form-grid">
            <div class="field"><label>Module <span class="req">*</span></label>
              <select id="cf-module" ${onlyModule ? 'disabled' : ''}>${CF_MODULES.map(([v, l]) => `<option value="${v}" ${onlyModule === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label>Field type</label>
              <select id="cf-type">${CF_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
            <div class="field full"><label>Field name <span class="req">*</span></label>
              <input type="text" id="cf-name" placeholder="e.g. Cost Center, Warranty Until"></div>
            <div class="field full" id="cf-options-wrap" style="display:none;"><label>Dropdown options (one per line)</label>
              <textarea id="cf-options" rows="3"></textarea></div>
          </div>`,
        footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Create field</button>`,
        onOpen(mbody) {
          mbody.querySelector('#cf-type').addEventListener('change', e => {
            mbody.querySelector('#cf-options-wrap').style.display = e.target.value === 'select' ? 'block' : 'none';
          });
          document.getElementById('m-cancel').addEventListener('click', closeModal);
          document.getElementById('m-save').addEventListener('click', async () => {
            const FieldName = mbody.querySelector('#cf-name').value.trim();
            if (!FieldName) return toast('Field name is required.', 'warning');
            const FieldType = mbody.querySelector('#cf-type').value;
            const Options = FieldType === 'select'
              ? mbody.querySelector('#cf-options').value.split('\n').map(s => s.trim()).filter(Boolean)
              : undefined;
            try {
              await api('POST', '/api/custom-fields', { Module: onlyModule || mbody.querySelector('#cf-module').value, FieldName, FieldType, Options });
              toast(`Custom field "${FieldName}" created.`);
              closeModal(); await draw();
            } catch (err) { toast(err.message, 'error'); }
          });
        }
      });
    });

    body.querySelectorAll('[data-cf-del]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        await api('DELETE', `/api/custom-fields/${btn.dataset.cfDel}`);
        toast('Custom field removed (existing records keep their values).');
        await draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
  };
  await draw();
}

/* =========================================================
   USERS (role = hierarchy, profile = permissions)
   ========================================================= */
async function renderUsersTab(body) {
  // Read this from the authenticated admin-only readiness endpoint. An older
  // API returns 404, which intentionally leaves the existing server guard in
  // place until that deployment is upgraded.
  const invitationStatus = await api('GET', '/api/users/invitation-status').catch(() => null);
  const invitationsUnavailable = invitationStatus?.configured === false;
  body.innerHTML = `
    ${invitationsUnavailable ? `<div class="config-notice" role="status">
      <span class="config-notice-icon" aria-hidden="true">!</span>
      <div><strong>User invitations are not ready on this deployment.</strong><br>
      Set <code>PROCUREFLOW_AUTH_ZAID</code> in the <em>procurement_api</em> Catalyst function environment, then deploy the function. Existing users are unaffected.</div>
    </div>` : ''}
    <div class="card">
      <div class="card-header">
        <div class="card-title">Workspace users</div>
        <button class="btn btn-primary btn-sm" id="btn-new-user" ${invitationsUnavailable ? 'disabled title="User invitations are not configured"' : ''}>+ Invite user</button>
      </div>
      <div class="card-body flush" id="users-body"></div>
    </div>`;

  let users = [], roles = [], profiles = [];

  const load = async () => {
    [users, roles, profiles] = await Promise.all([
      api('GET', '/api/users').catch(() => []),
      api('GET', '/api/roles').catch(() => []),
      api('GET', '/api/profiles').catch(() => [])
    ]);
    state.cache.users = users; state.cache.roles = roles;
  };

  const draw = () => {
    const rolesById = Object.fromEntries(roles.map(r => [r.ROWID, r]));
    const profilesById = Object.fromEntries(profiles.map(p => [p.ROWID, p]));
    document.getElementById('users-body').innerHTML = renderTable({
      columns: [
        { key: 'FullName', label: 'Name', render: r => `<span class="cell-strong">${esc(r.FullName)}</span>${r.Email === state.authEmail ? ' <span class="badge badge-info">You</span>' : ''}` },
        { key: 'Email', label: 'Email' },
        { key: 'RoleID', label: 'Role (hierarchy)', render: r => esc(rolesById[r.RoleID]?.RoleName || '—') },
        { key: 'ProfileID', label: 'Profile (permissions)', render: r => esc(profilesById[r.ProfileID]?.ProfileName || '—') },
        { key: 'ApprovalLimit', label: 'Approval limit', num: true, render: r => currency(r.ApprovalLimit) },
        { key: 'Status', label: 'Status', render: r => badge(r.Status) }
      ],
      rows: users,
      empty: { icon: '👥', title: 'No users', sub: 'Invite teammates so they can raise and approve requisitions.' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-user-edit="${r.ROWID}">Edit</button>${state.orgSettings.multiProperty !== false ? `<button class="btn btn-ghost btn-sm" data-user-props="${r.ROWID}" data-name="${esc(r.FullName)}">Properties</button>` : ''}`
    });

    document.getElementById('users-body').querySelectorAll('[data-user-edit]').forEach(btn =>
      btn.addEventListener('click', () => openUserModal(users.find(u => u.ROWID === btn.dataset.userEdit))));
    document.getElementById('users-body').querySelectorAll('[data-user-props]').forEach(btn =>
      btn.addEventListener('click', () => openPropertyAssign(btn.dataset.userProps, btn.dataset.name)));
  };

  // Assign a user to properties (empty = group-level, sees all properties).
  const openPropertyAssign = async (userId, name) => {
    openModal({ title: `Property access — ${name}`, body: skeletonRows(3) });
    const [props, assigned] = await Promise.all([
      api('GET', '/api/properties').catch(() => []),
      api('GET', `/api/properties/assignments/${userId}`).catch(() => [])
    ]);
    const set = new Set(assigned.map(String));
    openModal({
      title: `Property access — ${name}`,
      body: `
        <p class="cell-muted" style="margin-bottom:12px;">Check the properties this user can access. <strong>Leave all unchecked</strong> to make them a group-level user who sees every property.</p>
        <div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:12px;">
          ${props.length === 0 ? '<div class="cell-muted">No properties yet — add some first.</div>' :
            props.map(p => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-weight:400;">
              <input type="checkbox" class="pa-cb" value="${p.ROWID}" ${set.has(String(p.ROWID)) ? 'checked' : ''} style="width:auto;">
              <span class="cell-strong">${esc(p.Name)}</span> <span class="cell-muted">${p.Location ? '· ' + esc(p.Location) : ''}</span></label>`).join('')}
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save access</button>`,
      onOpen(mb) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const PropertyIDs = [...mb.querySelectorAll('.pa-cb:checked')].map(cb => cb.value);
          try { await api('PUT', `/api/properties/assignments/${userId}`, { PropertyIDs }); toast('Property access updated.'); closeModal(); }
          catch (err) { toast(err.message, 'error'); }
        });
      }
    });
  };

  const openUserModal = (user = null) => {
    const roleOptions = (sel) => `<option value="" disabled ${sel ? '' : 'selected'}>Select a role</option>` + roles.map(r =>
      `<option value="${r.ROWID}" ${sel === r.ROWID ? 'selected' : ''}>${esc(r.RoleName)}</option>`).join('');
    const profileOptions = (sel) => `<option value="" disabled ${sel ? '' : 'selected'}>Select a profile</option>` + profiles.map(p =>
      `<option value="${p.ROWID}" ${sel === p.ROWID ? 'selected' : ''}>${esc(p.ProfileName)}</option>`).join('');

    openModal({
      title: user ? `Edit user — ${user.FullName}` : 'Invite user',
      body: `
        <div class="form-grid">
          <div class="field"><label>Full name <span class="req">*</span></label><input type="text" id="u-name" value="${esc(user?.FullName || '')}"></div>
          <div class="field"><label>Email <span class="req">*</span></label><input type="email" id="u-email" value="${esc(user?.Email || '')}" ${user ? 'disabled' : ''}>
            ${user ? '' : '<div class="help">Catalyst will email this address a secure invitation. Access activates after their first authenticated sign-in.</div>'}</div>
          <div class="field"><label>Role (position in hierarchy)</label><select id="u-role">${roleOptions(user?.RoleID)}</select></div>
          <div class="field"><label>Profile (what they can do)</label><select id="u-profile">${profileOptions(user?.ProfileID)}</select></div>
          <div class="field"><label>Approval limit</label><input type="number" id="u-limit" min="0" step="100" value="${Number(user?.ApprovalLimit ?? 1000)}"></div>
          ${user ? `<div class="field"><label>Status</label>
            <select id="u-status">${user.Status === 'Invited'
              ? '<option value="Invited" selected>Invitation sent</option><option value="Inactive">Deactivate invitation</option>'
              : `<option ${user.Status === 'Active' ? 'selected' : ''}>Active</option><option ${user.Status === 'Inactive' ? 'selected' : ''}>Inactive</option>`}</select></div>` : ''}
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${user ? 'Save changes' : 'Send invitation'}</button>`,
      onOpen(mbody) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const FullName = mbody.querySelector('#u-name').value.trim();
          const Email = mbody.querySelector('#u-email').value.trim();
          if (!FullName || !Email) return toast('Name and email are required.', 'warning');
          if (!mbody.querySelector('#u-role').value || !mbody.querySelector('#u-profile').value) {
            return toast('Select both a role and a permission profile.', 'warning');
          }
          const btn = document.getElementById('m-save'); btn.disabled = true;
          btn.setAttribute('aria-busy', 'true');
          if (!user) btn.textContent = 'Sending invitation…';
          const payload = {
            FullName,
            RoleID: mbody.querySelector('#u-role').value || null,
            ProfileID: mbody.querySelector('#u-profile').value || null,
            ApprovalLimit: Number(mbody.querySelector('#u-limit').value || 0)
          };
          try {
            if (user) {
              payload.Status = mbody.querySelector('#u-status').value;
              await api('PUT', `/api/users/${user.ROWID}`, payload);
              toast('User updated.');
            } else {
              const result = await api('POST', '/api/users', { ...payload, Email });
              toast(result.linkedExisting
                ? `${FullName}'s existing Catalyst account is now linked.`
                : `Invitation sent to ${Email}.`);
            }
            closeModal(); await load(); draw();
          } catch (err) {
            toast(err.message, 'error');
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            btn.textContent = user ? 'Save changes' : 'Send invitation';
          }
        });
      }
    });
  };

  document.getElementById('btn-new-user').addEventListener('click', () => openUserModal(null));
  await load(); draw();
}

/* =========================================================
   ROLES — reporting hierarchy (Zoho-style)
   ========================================================= */
async function renderRolesTab(body) {
  body.innerHTML = `
    <div class="card" style="max-width:820px;">
      <div class="card-header">
        <div class="card-title">Role hierarchy</div>
        <button class="btn btn-primary btn-sm" id="btn-new-role">+ New role</button>
      </div>
      <div class="card-body flush" id="roles-body"></div>
    </div>`;

  let roles = [];
  const load = async () => { roles = await api('GET', '/api/roles').catch(() => []); state.cache.roles = roles; };

  // Flatten the hierarchy into indented rows (roots first, children beneath).
  const hierarchyRows = () => {
    const children = {};
    const roots = [];
    roles.forEach(r => {
      if (r.ReportsToRoleID && roles.some(x => x.ROWID === r.ReportsToRoleID)) {
        (children[r.ReportsToRoleID] = children[r.ReportsToRoleID] || []).push(r);
      } else roots.push(r);
    });
    const out = [];
    const visit = (role, depth) => {
      out.push({ ...role, _depth: depth });
      (children[role.ROWID] || []).forEach(c => visit(c, depth + 1));
    };
    roots.forEach(r => visit(r, 0));
    return out;
  };

  const draw = () => {
    const rows = hierarchyRows();
    document.getElementById('roles-body').innerHTML = renderTable({
      columns: [
        {
          key: 'RoleName', label: 'Role', render: r =>
            `<span style="padding-left:${r._depth * 22}px;">${r._depth > 0 ? '<span class="cell-muted">└─ </span>' : ''}<span class="cell-strong">${esc(r.RoleName)}</span></span>`
        },
        { key: 'Description', label: 'Description', render: r => `<span class="cell-muted">${esc((r.Description || '').slice(0, 60))}</span>` },
        {
          key: 'ReportsToRoleID', label: 'Reports to', render: r =>
            esc(roles.find(x => x.ROWID === r.ReportsToRoleID)?.RoleName || '—')
        }
      ],
      rows,
      empty: { icon: '🛡️', title: 'No roles', sub: 'Build your reporting hierarchy: CEO → Manager → Buyer…' },
      rowActions: r => `<button class="btn btn-ghost btn-sm" data-role-edit="${r.ROWID}">Edit</button>`
    });
    document.getElementById('roles-body').querySelectorAll('[data-role-edit]').forEach(btn =>
      btn.addEventListener('click', () => openRoleModal(roles.find(x => x.ROWID === btn.dataset.roleEdit))));
  };

  const openRoleModal = (role = null) => {
    const parentOptions = `<option value="">— None (top of hierarchy) —</option>` +
      roles.filter(r => !role || r.ROWID !== role.ROWID).map(r =>
        `<option value="${r.ROWID}" ${role?.ReportsToRoleID === r.ROWID ? 'selected' : ''}>${esc(r.RoleName)}</option>`).join('');

    openModal({
      title: role ? `Edit role — ${role.RoleName}` : 'New role',
      body: `
        <div class="form-grid">
          <div class="field full"><label>Role name <span class="req">*</span></label>
            <input type="text" id="r-name" value="${esc(role?.RoleName || '')}" placeholder="e.g. Procurement Manager"></div>
          <div class="field full"><label>Reports to</label><select id="r-parent">${parentOptions}</select>
            <div class="help">Approvals can escalate up this chain.</div></div>
          <div class="field full"><label>Description</label>
            <input type="text" id="r-desc" value="${esc(role?.Description || '')}"></div>
        </div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${role ? 'Save changes' : 'Create role'}</button>`,
      onOpen(mbody) {
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const RoleName = mbody.querySelector('#r-name').value.trim();
          if (!RoleName) return toast('Role name is required.', 'warning');
          const payload = {
            RoleName,
            ReportsToRoleID: mbody.querySelector('#r-parent').value || null,
            Description: mbody.querySelector('#r-desc').value.trim()
          };
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try {
            if (role) { await api('PUT', `/api/roles/${role.ROWID}`, payload); toast('Role updated.'); }
            else { await api('POST', '/api/roles', payload); toast(`Role "${RoleName}" created.`); }
            closeModal(); await load(); draw();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  };

  document.getElementById('btn-new-role').addEventListener('click', () => openRoleModal(null));
  await load(); draw();
}

/* =========================================================
   PROFILES — module × action permission matrix (Zoho-style)
   ========================================================= */
async function renderProfilesTab(body) {
  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Permission profiles</div>
        <button class="btn btn-primary btn-sm" id="btn-new-profile">+ New profile</button>
      </div>
      <div class="card-body flush" id="profiles-body"></div>
    </div>`;

  let profiles = [];
  const load = async () => { profiles = await api('GET', '/api/profiles').catch(() => []); };

  const summarize = (permJson) => {
    let m = {};
    try { m = JSON.parse(permJson || '{}'); } catch {}
    if (m['*'] === true) return `<span class="badge badge-info">Full access</span>`;
    const granted = PERM_MODULES.filter(([key]) => Object.values(m[key] || {}).some(Boolean)).map(([, label]) => label);
    return `<span class="cell-muted">${granted.length ? granted.join(' · ') : 'No access'}</span>`;
  };

  const draw = () => {
    document.getElementById('profiles-body').innerHTML = renderTable({
      columns: [
        { key: 'ProfileName', label: 'Profile', render: r => `<span class="cell-strong">${esc(r.ProfileName)}</span>` },
        { key: 'Description', label: 'Description', render: r => `<span class="cell-muted">${esc((r.Description || '').slice(0, 50))}</span>` },
        { key: 'Permissions', label: 'Access summary', render: r => summarize(r.Permissions) }
      ],
      rows: profiles,
      empty: { icon: '🗝️', title: 'No profiles', sub: 'Profiles define exactly what users can see and do in each module.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-profile-edit="${r.ROWID}">Edit</button>
        <button class="btn btn-danger btn-sm" data-profile-del="${r.ROWID}">Delete</button>`
    });
    const bodyEl = document.getElementById('profiles-body');
    bodyEl.querySelectorAll('[data-profile-edit]').forEach(btn =>
      btn.addEventListener('click', () => openProfileModal(profiles.find(p => p.ROWID === btn.dataset.profileEdit))));
    bodyEl.querySelectorAll('[data-profile-del]').forEach(btn =>
      btn.addEventListener('click', async () => {
        try {
          await api('DELETE', `/api/profiles/${btn.dataset.profileDel}`);
          toast('Profile deleted.');
          await load(); draw();
        } catch (err) { toast(err.message, 'error'); }
      }));
  };

  const openProfileModal = (profile = null) => {
    let matrix = {};
    try { matrix = JSON.parse(profile?.Permissions || '{}'); } catch {}
    const fullAccess = matrix['*'] === true;

    const matrixTable = `
      <div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;">
        <table class="data" id="perm-matrix">
          <thead><tr><th>Module</th>${PERM_ACTIONS.map(a => `<th style="text-transform:capitalize;text-align:center;">${a}</th>`).join('')}</tr></thead>
          <tbody>
            ${PERM_MODULES.map(([key, label]) => `
              <tr>
                <td class="cell-strong">${label}</td>
                ${PERM_ACTIONS.map(a => `
                  <td style="text-align:center;">
                    <input type="checkbox" class="pm-cb" data-module="${key}" data-action="${a}"
                      ${matrix[key] && matrix[key][a] === true ? 'checked' : ''} style="width:auto;cursor:pointer;">
                  </td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    openModal({
      title: profile ? `Edit profile — ${profile.ProfileName}` : 'New profile',
      wide: true,
      body: `
        <div class="form-grid" style="margin-bottom:14px;">
          <div class="field"><label>Profile name <span class="req">*</span></label>
            <input type="text" id="p-name" value="${esc(profile?.ProfileName || '')}" placeholder="e.g. Buyer, Approver, Finance"></div>
          <div class="field"><label>Description</label>
            <input type="text" id="p-desc" value="${esc(profile?.Description || '')}"></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:600;">
          <input type="checkbox" id="p-full" ${fullAccess ? 'checked' : ''} style="width:auto;"> Full access (administrator — every module, every action)
        </label>
        <div id="matrix-wrap" style="${fullAccess ? 'opacity:0.4;pointer-events:none;' : ''}">${matrixTable}</div>`,
      footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${profile ? 'Save changes' : 'Create profile'}</button>`,
      onOpen(mbody) {
        mbody.querySelector('#p-full').addEventListener('change', e => {
          const wrap = mbody.querySelector('#matrix-wrap');
          wrap.style.opacity = e.target.checked ? '0.4' : '1';
          wrap.style.pointerEvents = e.target.checked ? 'none' : 'auto';
        });
        document.getElementById('m-cancel').addEventListener('click', closeModal);
        document.getElementById('m-save').addEventListener('click', async () => {
          const ProfileName = mbody.querySelector('#p-name').value.trim();
          if (!ProfileName) return toast('Profile name is required.', 'warning');

          let Permissions;
          if (mbody.querySelector('#p-full').checked) {
            Permissions = { '*': true };
          } else {
            Permissions = {};
            mbody.querySelectorAll('.pm-cb:checked').forEach(cb => {
              (Permissions[cb.dataset.module] = Permissions[cb.dataset.module] || {})[cb.dataset.action] = true;
            });
          }

          const payload = { ProfileName, Description: mbody.querySelector('#p-desc').value.trim(), Permissions };
          const btn = document.getElementById('m-save'); btn.disabled = true;
          try {
            if (profile) { await api('PUT', `/api/profiles/${profile.ROWID}`, payload); toast('Profile updated.'); }
            else { await api('POST', '/api/profiles', payload); toast(`Profile "${ProfileName}" created.`); }
            closeModal(); await load(); draw();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      }
    });
  };

  document.getElementById('btn-new-profile').addEventListener('click', () => openProfileModal(null));
  await load(); draw();
}

/* =========================================================
   PDF TEMPLATES — Zoho-style gallery: a left rail of document
   types (Purchase Orders, Purchase Requests, Bills, Vendor
   Payments, Vendor Credits, Vendor Statements), each showing a
   thumbnail card per saved template plus a "+ New" gallery card
   that offers the built-in preset designs.
   ========================================================= */
let tplActiveModule = 'po';

async function renderTemplatesTab(body) {
  const draw = async () => {
    const allTemplates = await api('GET', '/api/pdf-templates').catch(() => []);
    const templates = allTemplates.filter(t => t.Module === tplActiveModule);

    body.innerHTML = `
      <div class="tpl-shell">
        <aside class="tpl-rail">
          <div class="tpl-rail-label">Templates</div>
          ${docs.DOC_TYPES.map(g => `
            <div class="tpl-rail-group">${esc(g.group)}</div>
            ${g.items.map(([key, label]) => `
              <button class="tpl-rail-item ${key === tplActiveModule ? 'active' : ''}" data-tpl-mod="${key}">${esc(label)}</button>`).join('')}
          `).join('')}
        </aside>
        <div class="tpl-main">
          <div class="tpl-main-head">
            <h2>All ${esc(docs.moduleLabel(tplActiveModule))} Templates</h2>
            <button class="btn btn-primary" id="tpl-add-btn">+ New</button>
          </div>
          <div class="tpl-gallery" id="tpl-gallery"></div>
        </div>
      </div>`;

    body.querySelectorAll('[data-tpl-mod]').forEach(b => b.addEventListener('click', () => {
      tplActiveModule = b.dataset.tplMod; draw();
    }));

    const gallery = document.getElementById('tpl-gallery');
    gallery.innerHTML = templates.map(t => tplCardHTML(t)).join('') + tplNewCardHTML();

    gallery.querySelectorAll('[data-tpl-edit]').forEach(el => el.addEventListener('click', () =>
      openTemplateEditor(templates.find(t => t.ROWID === el.dataset.tplEdit), draw)));
    gallery.querySelectorAll('[data-tpl-del]').forEach(el => el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const t = templates.find(x => x.ROWID === el.dataset.tplDel);
      if (t?.IsDefault === 'true') return toast('Make another template default first — the default template cannot be deleted.', 'warning');
      try { await api('DELETE', `/api/pdf-templates/${el.dataset.tplDel}`); toast('Template deleted.'); await draw(); }
      catch (err) { toast(err.message, 'error'); }
    }));
    gallery.querySelectorAll('[data-tpl-makedefault]').forEach(el => el.addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await api('PUT', `/api/pdf-templates/${el.dataset.tplMakedefault}`, { IsDefault: true }); toast('Set as default.'); await draw(); }
      catch (err) { toast(err.message, 'error'); }
    }));
    const newCard = document.getElementById('tpl-new-card');
    if (newCard) newCard.addEventListener('click', () => openTemplateGalleryPicker(tplActiveModule, draw));
    document.getElementById('tpl-add-btn').addEventListener('click', () => openTemplateGalleryPicker(tplActiveModule, draw));
  };
  await draw();
}

function tplThumbnailHTML(module, cfg) {
  // A miniature, non-interactive preview rendered at a fixed scale.
  const tpl = { ...docs.defaultTemplate(module), ...cfg, columns: { ...docs.defaultTemplate(module).columns, ...(cfg.columns || {}) }, blocks: { ...docs.defaultTemplate(module).blocks, ...(cfg.blocks || {}) } };
  return `<div class="tpl-thumb-frame"><div class="tpl-thumb-scale">${docs.renderDocument(tpl, docs.sampleData(module))}</div></div>`;
}

function tplCardHTML(t) {
  let cfg = {}; try { cfg = JSON.parse(t.ConfigJson || '{}'); } catch {}
  const isDefault = t.IsDefault === 'true';
  return `
    <div class="tpl-card" data-tpl-edit="${t.ROWID}">
      ${tplThumbnailHTML(t.Module, cfg)}
      ${isDefault ? '<div class="tpl-default-chip">★ DEFAULT</div>' : ''}
      <div class="tpl-card-foot">
        <div class="tpl-card-name">${esc(t.TemplateName)}</div>
        <div class="tpl-card-actions">
          ${!isDefault ? `<button class="btn btn-ghost btn-sm" data-tpl-makedefault="${t.ROWID}" title="Make default">★</button>` : ''}
          <button class="btn btn-danger btn-sm" data-tpl-del="${t.ROWID}" title="Delete">🗑</button>
        </div>
      </div>
    </div>`;
}

function tplNewCardHTML() {
  return `
    <div class="tpl-card tpl-new-card" id="tpl-new-card">
      <div class="tpl-new-icon">+</div>
      <div class="tpl-new-title">New Template</div>
      <div class="tpl-new-sub">Start from a preset design, or build one from scratch. Fully customizable after.</div>
    </div>`;
}

// Gallery picker: choose a starting preset before opening the full editor —
// mirrors Zoho's "click to add a template from our gallery" flow.
function openTemplateGalleryPicker(module, onDone) {
  openModal({
    title: `New ${docs.moduleLabel(module)} template`,
    wide: true,
    body: `
      <p class="cell-muted" style="margin-bottom:14px;">Pick a starting design — every color, font, column and block stays fully editable afterwards.</p>
      <div class="tpl-preset-grid">
        ${Object.entries(docs.PRESETS).map(([key, p]) => `
          <div class="tpl-preset-card" data-preset="${key}">
            ${tplThumbnailHTML(module, p.patch)}
            <div class="tpl-preset-foot">
              <div class="tpl-preset-name">${esc(p.label)}</div>
              <div class="tpl-preset-desc">${esc(p.desc)}</div>
            </div>
          </div>`).join('')}
      </div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button>`,
    onOpen(mb) {
      document.getElementById('m-cancel').addEventListener('click', closeModal);
      mb.querySelectorAll('[data-preset]').forEach(el => el.addEventListener('click', () => {
        closeModal();
        openTemplateEditor(null, onDone, { module, presetKey: el.dataset.preset });
      }));
    }
  });
}

// Advanced template editor: tabbed control rail (Page & Type / Branding /
// Columns & Blocks / Text) + live preview, opened as a full page (not a
// modal) so there's real room to work — same pattern as the vendor/item forms.
const TPL_HEADER_STYLES = [['rule', 'Rule — accent line under header'], ['block', 'Block — solid color band'], ['plain', 'Plain — no color, quiet type']];
const TPL_BLOCK_DEFS = [
  ['logo', 'Company logo'], ['orgAddress', 'Company address'], ['docMeta', 'Document details'],
  ['billTo', 'Vendor / bill-to block'], ['totals', 'Totals'], ['notes', 'Notes'],
  ['terms', 'Terms & conditions'], ['bankDetails', 'Bank details'], ['signature', 'Signature lines'],
  ['watermark', 'Watermark'], ['footerText', 'Footer text'], ['pageNumbers', 'Page numbers']
];

function openTemplateEditor(existing, onDone, opts = {}) {
  const module = existing?.Module || opts.module || 'po';
  let tpl = opts.presetKey ? docs.presetTemplate(module, opts.presetKey) : docs.defaultTemplate(module);
  if (existing) {
    try { const c = JSON.parse(existing.ConfigJson || '{}'); tpl = { ...tpl, ...c, columns: { ...tpl.columns, ...(c.columns || {}) }, blocks: { ...tpl.blocks, ...(c.blocks || {}) } }; } catch {}
  }
  let templateName = existing?.TemplateName || `${docs.moduleLabel(module)} — ${opts.presetKey ? docs.PRESETS[opts.presetKey].label : 'Custom'}`;
  let isDefault = existing?.IsDefault === 'true';
  const cols = docs.MODULE_COLUMNS[module];
  let etab = 'page';

  const tabsHTML = () => `
    <div class="form-tabs" id="te-tabs">
      <button type="button" class="form-tab ${etab === 'page' ? 'active' : ''}" data-etab="page">Page &amp; Type</button>
      <button type="button" class="form-tab ${etab === 'brand' ? 'active' : ''}" data-etab="brand">Branding</button>
      <button type="button" class="form-tab ${etab === 'content' ? 'active' : ''}" data-etab="content">Columns &amp; Blocks</button>
      <button type="button" class="form-tab ${etab === 'text' ? 'active' : ''}" data-etab="text">Footer &amp; Text</button>
    </div>`;

  const panelPage = () => `
    <div class="field"><label>Template name <span class="req">*</span></label><input type="text" id="te-name" value="${esc(templateName)}" placeholder="e.g. Standard PO"></div>
    <div class="form-grid">
      <div class="field"><label>Paper size</label><select id="te-paper">${Object.keys(docs.PAPER_SIZES).map(k => `<option value="${k}" ${tpl.paper === k ? 'selected' : ''}>${docs.PAPER_SIZES[k].label}</option>`).join('')}</select></div>
      <div class="field"><label>Orientation</label><select id="te-orient"><option value="portrait" ${tpl.orientation === 'portrait' ? 'selected' : ''}>Portrait</option><option value="landscape" ${tpl.orientation === 'landscape' ? 'selected' : ''}>Landscape</option></select></div>
      <div class="field"><label>Margin (mm)</label><input type="number" id="te-margin" min="0" max="40" value="${tpl.margin}"></div>
      <div class="field"><label>Font</label><select id="te-font">${Object.keys(docs.FONTS).map(k => `<option value="${k}" ${tpl.font === k ? 'selected' : ''}>${docs.FONTS[k].label}</option>`).join('')}</select></div>
      <div class="field"><label>Header style</label><select id="te-headerstyle">${TPL_HEADER_STYLES.map(([v, l]) => `<option value="${v}" ${tpl.headerStyle === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Table style</label><select id="te-tablestyle">${Object.entries(docs.TABLE_STYLES).map(([v, o]) => `<option value="${v}" ${tpl.tableStyle === v ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-top:6px;"><input type="checkbox" id="te-default" ${isDefault ? 'checked' : ''} style="width:auto;"> Set as default for this document type</label>`;

  const panelBrand = () => `
    <div class="form-grid">
      <div class="field"><label>Accent color</label><input type="color" id="te-accent" value="${esc(tpl.accent)}" style="height:38px;padding:3px;"></div>
      <div class="field"><label>Text color</label><input type="color" id="te-text" value="${esc(tpl.textColor)}" style="height:38px;padding:3px;"></div>
      <div class="field"><label>Table header bg</label><input type="color" id="te-headerbg" value="${esc(tpl.headerBg)}" style="height:38px;padding:3px;"></div>
      <div class="field"><label>Document title</label><input type="text" id="te-title" value="${esc(tpl.title)}"></div>
    </div>
    <div class="field full"><label>Company logo</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="file" id="te-logo" accept="image/*" style="flex:1;">
        ${state.orgSettings.logoDataUri ? '<button type="button" class="btn btn-ghost btn-sm" id="te-logo-clear">Remove</button>' : ''}
      </div>
      <div class="help">Stored on your organization; appears on all documents (and in the sidebar). Keep under ~400 KB.</div></div>`;

  const panelContent = () => `
    <div class="nav-group-label" style="color:var(--ink-muted);padding:0 0 6px;">Line-item columns</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
      ${Object.keys(cols).map(k => `<label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:13px;"><input type="checkbox" class="te-col" data-k="${k}" ${tpl.columns[k] ? 'checked' : ''} style="width:auto;"> ${esc(cols[k].label)}</label>`).join('')}
    </div>
    <div class="nav-group-label" style="color:var(--ink-muted);padding:0 0 6px;">Blocks</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;">
      ${TPL_BLOCK_DEFS.map(([k, l]) => `<label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:13px;"><input type="checkbox" class="te-block" data-k="${k}" ${tpl.blocks[k] ? 'checked' : ''} style="width:auto;"> ${esc(l)}</label>`).join('')}
    </div>
    <div class="field" style="margin-top:14px;"><label>Watermark text</label><input type="text" id="te-watermark" value="${esc(tpl.watermarkText || '')}" placeholder="e.g. COPY, DRAFT, VOID"></div>`;

  const panelText = () => `
    <div class="field"><label>Notes</label><textarea id="te-notes" rows="2">${esc(tpl.notesText || '')}</textarea></div>
    <div class="field"><label>Terms &amp; conditions text</label><textarea id="te-terms" rows="2">${esc(tpl.termsText || '')}</textarea></div>
    <div class="field"><label>Bank details text</label><textarea id="te-bank" rows="3" placeholder="Bank name, account number, routing/IFSC/SWIFT">${esc(tpl.bankText || '')}</textarea></div>
    <div class="field"><label>Footer text</label><input type="text" id="te-footer" value="${esc(tpl.footerText || '')}" placeholder="e.g. Thank you for your business — generated by ProcureFlow"></div>`;

  const panels = { page: panelPage, brand: panelBrand, content: panelContent, text: panelText };

  openPage({
    title: existing ? `Edit template — ${existing.TemplateName}` : `New ${docs.moduleLabel(module)} template`,
    body: `
      <div class="tpl-editor">
        <div class="tpl-editor-controls">
          ${tabsHTML()}
          <div id="te-panel">${panels[etab]()}</div>
        </div>
        <div class="tpl-editor-preview">
          <div class="tpl-editor-preview-inner" id="te-preview"></div>
        </div>
      </div>`,
    footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${existing ? 'Save template' : 'Create template'}</button>`,
    onOpen(mbody) {
      const preview = mbody.querySelector('#te-preview');
      const renderPreview = () => { preview.innerHTML = docs.renderDocument(tpl, docs.sampleData(module)); };
      renderPreview();

      const wirePanel = () => {
        const p = mbody.querySelector('#te-panel');
        const bind = (id, prop, transform = v => v) => {
          const el = p.querySelector(id);
          if (el) el.addEventListener('input', () => { tpl[prop] = transform(el.value); renderPreview(); });
        };
        // Page & Type
        bind('#te-paper', 'paper'); bind('#te-orient', 'orientation'); bind('#te-margin', 'margin', Number);
        bind('#te-font', 'font'); bind('#te-headerstyle', 'headerStyle'); bind('#te-tablestyle', 'tableStyle');
        const nameEl = p.querySelector('#te-name'); if (nameEl) nameEl.addEventListener('input', e => { templateName = e.target.value; });
        const defEl = p.querySelector('#te-default'); if (defEl) defEl.addEventListener('change', e => { isDefault = e.target.checked; });
        // Branding
        bind('#te-accent', 'accent'); bind('#te-text', 'textColor'); bind('#te-headerbg', 'headerBg'); bind('#te-title', 'title');
        const logoInput = p.querySelector('#te-logo');
        if (logoInput) logoInput.addEventListener('change', () => {
          const file = logoInput.files[0]; if (!file) return;
          if (file.size > 400 * 1024) return toast('Logo too large — keep under 400 KB.', 'warning');
          const reader = new FileReader();
          reader.onload = () => { state.orgSettings.logoDataUri = reader.result; renderPreview(); toast('Logo set — save the template to keep it.'); };
          reader.readAsDataURL(file);
        });
        const logoClear = p.querySelector('#te-logo-clear');
        if (logoClear) logoClear.addEventListener('click', () => { state.orgSettings.logoDataUri = ''; renderPreview(); });
        // Columns & Blocks
        p.querySelectorAll('.te-col').forEach(cb => cb.addEventListener('change', () => { tpl.columns[cb.dataset.k] = cb.checked; renderPreview(); }));
        p.querySelectorAll('.te-block').forEach(cb => cb.addEventListener('change', () => { tpl.blocks[cb.dataset.k] = cb.checked; renderPreview(); }));
        bind('#te-watermark', 'watermarkText');
        // Footer & Text
        bind('#te-notes', 'notesText'); bind('#te-terms', 'termsText'); bind('#te-bank', 'bankText'); bind('#te-footer', 'footerText');
      };
      wirePanel();

      mbody.querySelectorAll('[data-etab]').forEach(t => t.addEventListener('click', () => {
        etab = t.dataset.etab;
        mbody.querySelectorAll('[data-etab]').forEach(x => x.classList.toggle('active', x === t));
        mbody.querySelector('#te-panel').innerHTML = panels[etab]();
        wirePanel();
      }));

      document.getElementById('m-cancel').addEventListener('click', closePage);
      document.getElementById('m-save').addEventListener('click', async () => {
        if (!templateName.trim()) return toast('Template name is required.', 'warning');
        const btn = document.getElementById('m-save'); btn.disabled = true; btn.textContent = 'Saving…';
        try {
          await api('PUT', `/api/organizations/${state.org.ROWID}`, { Settings: state.orgSettings });
          const payload = { Module: module, TemplateName: templateName.trim(), Config: tpl, IsDefault: isDefault };
          if (existing && existing.ROWID) await api('PUT', `/api/pdf-templates/${existing.ROWID}`, payload);
          else await api('POST', '/api/pdf-templates', payload);
          toast('Template saved.');
          closePage(); onDone && onDone();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = existing ? 'Save template' : 'Create template'; }
      });
    }
  });
}

/* =========================================================
   DASHBOARDS (customizable, per role)
   ========================================================= */
const DASH_WIDGETS = [
  { id: 'stat:committed_spend', label: 'Stat — Committed spend' },
  { id: 'stat:pending_spend', label: 'Stat — Pending spend' },
  { id: 'stat:capex_spend', label: 'Stat — Capital (CapEx)' },
  { id: 'stat:opex_spend', label: 'Stat — Operational (OpEx)' },
  { id: 'stat:pr_count', label: 'Stat — Requisition count' },
  { id: 'stat:po_count', label: 'Stat — Purchase order count' },
  { id: 'stat:invoice_count', label: 'Stat — Invoice count' },
  { id: 'list:recent_prs', label: 'List — Recent requisitions' },
  { id: 'list:recent_pos', label: 'List — Recent purchase orders' },
  { id: 'aging:', label: 'Chart — Payables aging' }
];

function widgetsToIds(widgets) {
  return (widgets || []).map(w => `${w.type}:${w.metric || w.source || ''}`);
}
function idsToWidgets(ids) {
  return ids.map(id => {
    const [type, rest] = id.split(':');
    if (type === 'stat') return { type: 'stat', metric: rest };
    if (type === 'list') return { type: 'list', source: rest };
    return { type: 'aging' };
  });
}

async function renderDashboardsTab(body) {
  const draw = async () => {
    const [dashboards, roles] = await Promise.all([
      api('GET', '/api/dashboards').catch(() => []),
      api('GET', '/api/roles').catch(() => [])
    ]);
    const rolesById = Object.fromEntries(roles.map(r => [r.ROWID, r]));
    body.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Dashboards</div>
          <button class="btn btn-primary btn-sm" id="dash-add-btn">+ New dashboard</button>
        </div>
        <div class="card-body flush" id="dash-list"></div>
      </div>
      <p class="cell-muted" style="margin-top:10px;font-size:12.5px;">Assign a dashboard to a role and its members see it on the home page. The "Default" dashboard is shown to everyone without a role-specific one.</p>`;

    document.getElementById('dash-list').innerHTML = renderTable({
      columns: [
        { key: 'Name', label: 'Dashboard', render: r => `<span class="cell-strong">${esc(r.Name)}</span>${r.IsDefault === 'true' ? ' <span class="badge badge-info">Default</span>' : ''}` },
        { key: 'RoleID', label: 'For role', render: r => r.RoleID ? esc(rolesById[r.RoleID]?.RoleName || '—') : '<span class="cell-muted">Everyone</span>' },
        { key: 'WidgetsJson', label: 'Widgets', render: r => { try { return `<span class="cell-muted">${JSON.parse(r.WidgetsJson || '[]').length} widget(s)</span>`; } catch { return '—'; } } }
      ],
      rows: dashboards,
      empty: { icon: '📐', title: 'No dashboards', sub: 'Build a dashboard and assign it to a role.' },
      rowActions: r => `
        <button class="btn btn-ghost btn-sm" data-dash-edit="${r.ROWID}">Edit</button>
        <button class="btn btn-danger btn-sm" data-dash-del="${r.ROWID}">Delete</button>`
    });

    const openDashModal = (dash = null) => {
      const selectedIds = dash ? widgetsToIds((() => { try { return JSON.parse(dash.WidgetsJson || '[]'); } catch { return []; } })()) : ['stat:committed_spend', 'stat:pending_spend', 'list:recent_prs', 'aging:'];
      const roleOptions = `<option value="">Everyone (default)</option>` + roles.map(r =>
        `<option value="${r.ROWID}" ${dash?.RoleID === r.ROWID ? 'selected' : ''}>${esc(r.RoleName)}</option>`).join('');

      openModal({
        title: dash ? `Edit dashboard — ${dash.Name}` : 'New dashboard',
        wide: true,
        body: `
          <div class="form-grid" style="margin-bottom:14px;">
            <div class="field"><label>Dashboard name <span class="req">*</span></label><input type="text" id="d-name" value="${esc(dash?.Name || '')}" placeholder="e.g. Finance overview"></div>
            <div class="field"><label>Show to role</label><select id="d-role">${roleOptions}</select></div>
          </div>
          <div class="field"><label>Widgets (choose what appears)</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid var(--border);border-radius:8px;padding:12px;">
              ${DASH_WIDGETS.map(w => `<label style="display:flex;align-items:center;gap:8px;font-weight:400;">
                <input type="checkbox" class="dash-w" value="${w.id}" ${selectedIds.includes(w.id) ? 'checked' : ''} style="width:auto;"> ${esc(w.label)}</label>`).join('')}
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-weight:400;">
            <input type="checkbox" id="d-default" ${dash?.IsDefault === 'true' ? 'checked' : ''} style="width:auto;"> Make this the default dashboard</label>`,
        footer: `<button class="btn btn-outline" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">${dash ? 'Save' : 'Create'}</button>`,
        onOpen(mbody) {
          document.getElementById('m-cancel').addEventListener('click', closeModal);
          document.getElementById('m-save').addEventListener('click', async () => {
            const Name = mbody.querySelector('#d-name').value.trim();
            if (!Name) return toast('Dashboard name is required.', 'warning');
            const ids = [...mbody.querySelectorAll('.dash-w:checked')].map(cb => cb.value);
            const payload = {
              Name, RoleID: mbody.querySelector('#d-role').value || null,
              Widgets: idsToWidgets(ids), IsDefault: mbody.querySelector('#d-default').checked
            };
            const btn = document.getElementById('m-save'); btn.disabled = true;
            try {
              if (dash) await api('PUT', `/api/dashboards/${dash.ROWID}`, payload);
              else await api('POST', '/api/dashboards', payload);
              toast('Dashboard saved.');
              closeModal(); await draw();
            } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
          });
        }
      });
    };

    document.getElementById('dash-add-btn').addEventListener('click', () => openDashModal(null));
    const listEl = document.getElementById('dash-list');
    listEl.querySelectorAll('[data-dash-edit]').forEach(b => b.addEventListener('click', () => openDashModal(dashboards.find(d => d.ROWID === b.dataset.dashEdit))));
    listEl.querySelectorAll('[data-dash-del]').forEach(b => b.addEventListener('click', async () => {
      try { await api('DELETE', `/api/dashboards/${b.dataset.dashDel}`); toast('Dashboard deleted.'); await draw(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  };
  await draw();
}


/* =========================================================
   RECORD VIEWS — masters
   A row in a list is a summary. Opening it should show everything
   the record knows, not a form pre-filled for editing.
   ========================================================= */

export async function openItemRecord(itemId, onChanged) {
  const item = (state.cache.items || []).find(i => i.ROWID === itemId)
    || (await api('GET', '/api/items').catch(() => [])).find(i => i.ROWID === itemId);
  if (!item) return toast('That item no longer exists.', 'error');
  const m = itemMeta(item);


  openRecord({
    number: m.name,
    status: m.expense,
    subtitle: m.sku ? `Item · ${m.sku}` : 'Item',
    summary: { label: m.unit ? `Rate per ${m.unit}` : 'Rate', value: currency(m.price) },
    actions: [{ label: 'Edit', primary: true, onClick: ({ close }) => { close(); if (onChanged) onChanged(item); } }],
    tabs: [
      {
        id: 'details', label: 'Details',
        render: (el) => {
          el.innerHTML =
            sectionHTML('About', factsHTML([
              ['Description', m.description, { wide: true }],
              ['Code / SKU', m.sku],
              ['Type', m.type],
              ['Unit of measure', m.unit],
              ['Category', m.category],
              ['Expense type', m.expense],
              ['Preferred vendor', m.vendor],
              ['Par level', m.parLevel !== null ? String(m.parLevel) : ''],
              ['Perishable', m.perishable ? 'Yes' : ''],
              ['Added', fmtDate(item.CREATEDTIME)]
            ])) +
            (m.description ? '' : sectionHTML('', emptyHTML(
              'No description on this item.',
              'A description is what tells a requester whether this is the right thing to order.')));
        }
      },
      {
        id: 'usage', label: 'Where it is used',
        render: async (el) => {
          // Answered by the line tables, not by guessing at a parent record.
          const usage = await api('GET', `/api/items/${itemId}/usage`).catch(() => null);
          if (!usage) { el.innerHTML = emptyHTML('Usage could not be loaded.'); return; }

          el.innerHTML =
            (usage.orders.length ? `<dl class="rv-facts">
                <div class="rv-fact"><dt>Ordered to date</dt><dd>${esc(String(usage.totalOrdered))}${m.unit ? ` ${esc(m.unit)}` : ''}</dd></div>
                <div class="rv-fact"><dt>Spend to date</dt><dd>${esc(currency(usage.totalSpend))}</dd></div>
              </dl>` : '') +
            sectionHTML('Requisitions',
              usage.requisitions.length
                ? linesHTML([
                    { key: 'PRNumber', label: 'Requisition' },
                    { key: 'Department', label: 'Department', render: r => esc(r.Department || '—') },
                    { key: 'Status', label: 'Status', render: r => badge(r.Status) },
                    { key: '_qty', label: 'Qty', num: true, render: r => esc(String(r._qty)) }
                  ], usage.requisitions.slice(0, 25))
                : emptyHTML('Not requested yet.')) +
            sectionHTML('Purchase orders',
              usage.orders.length
                ? linesHTML([
                    { key: 'PONumber', label: 'Order' },
                    { key: 'Status', label: 'Status', render: r => badge(r.Status) },
                    { key: '_qty', label: 'Qty', num: true, render: r => esc(String(r._qty)) },
                    { key: 'TotalAmount', label: 'Order value', num: true, render: r => currency(r.TotalAmount) }
                  ], usage.orders.slice(0, 25))
                : emptyHTML('Never ordered.'));
        }
      }
    ]
  });
}

export async function openVendorRecord(vendorId, onEdit) {
  const vendor = (state.cache.suppliers || []).find(v => v.ROWID === vendorId);
  if (!vendor) return toast('That vendor no longer exists.', 'error');

  const [contacts, banks, pos] = await Promise.all([
    api('GET', `/api/suppliers/${vendorId}/contacts`).catch(() => []),
    api('GET', `/api/suppliers/${vendorId}/bank`).catch(() => []),
    api('GET', '/api/pos').catch(() => [])
  ]);
  const myPos = pos.filter(p => String(p.SupplierID) === String(vendorId));
  const spend = myPos.reduce((a, p) => a + Number(p.TotalAmount || 0), 0);

  openRecord({
    number: vendor.Name,
    status: vendor.Status || 'Active',
    subtitle: 'Vendor',
    summary: { label: 'Ordered to date', value: currency(spend) },
    actions: [{ label: 'Edit', primary: true, onClick: ({ close }) => { close(); if (onEdit) onEdit(vendor); } }],
    tabs: [
      {
        id: 'details', label: 'Details',
        render: (el) => {
          el.innerHTML =
            sectionHTML('Contact', factsHTML([
              ['Email', vendor.ContactEmail],
              ['Phone', vendor.Phone],
              ['Address', vendor.Address, { wide: true }],
              ['Rating', vendor.Rating ? `${vendor.Rating} / 5` : ''],
              ['Scope', vendor.Scope === 'property' ? 'Single property' : 'Group-wide'],
              ['Added', fmtDate(vendor.CREATEDTIME)]
            ]));
        }
      },
      {
        id: 'people', label: 'Contacts', count: contacts.length,
        render: (el) => {
          el.innerHTML = contacts.length
            ? linesHTML([
                { key: 'Name', label: 'Name' },
                { key: 'Designation', label: 'Role', render: c => esc(c.Designation || '—') },
                { key: 'Email', label: 'Email', render: c => esc(c.Email || '—') },
                { key: 'Phone', label: 'Phone', render: c => esc(c.Phone || '—') }
              ], contacts)
            : emptyHTML('No named contacts.', 'Add the people you actually deal with under Manage.');
        }
      },
      {
        id: 'bank', label: 'Bank', count: banks.length,
        render: (el) => {
          el.innerHTML = banks.length
            ? linesHTML([
                { key: 'BankName', label: 'Bank' },
                { key: 'AccountName', label: 'Account name', render: b => esc(b.AccountName || '—') },
                { key: 'AccountNumber', label: 'Account #', render: b => esc(b.AccountNumber || '—') },
                { key: 'RoutingCode', label: 'Routing / SWIFT', render: b => esc(b.RoutingCode || '—') }
              ], banks)
            : emptyHTML('No bank details recorded.', 'Needed before payments can be made to this vendor.');
        }
      },
      {
        id: 'orders', label: 'Orders', count: myPos.length,
        render: (el) => {
          el.innerHTML = myPos.length
            ? linesHTML([
                { key: 'PONumber', label: 'Order' },
                { key: 'CREATEDTIME', label: 'Raised', render: p => fmtDate(p.CREATEDTIME) },
                { key: 'Status', label: 'Status', render: p => badge(p.Status) },
                { key: 'VendorDecision', label: 'Response', render: p => p.VendorDecision ? badge(p.VendorDecision) : '<span class="cell-muted">—</span>' },
                { key: 'TotalAmount', label: 'Value', num: true, render: p => currency(p.TotalAmount) }
              ], myPos, [['Total ordered', currency(spend), true]])
            : emptyHTML('No orders placed with this vendor yet.');
        }
      }
    ]
  });
}
