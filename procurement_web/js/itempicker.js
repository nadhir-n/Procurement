// ── Item picker ──────────────────────────────────────────────────────────────
// Line items used to be a bare <select> listing every catalogue entry as
// "Name (SKU)". With a hotel catalogue of several hundred supplies that is
// unusable: no search, and none of the information a requester actually needs
// to choose correctly — what the item is, how it is measured, what it costs,
// whether it is capital or operating spend, who supplies it, what the par
// level is.
//
// This replaces it with a searchable picker. The trigger is a <button> that
// carries the chosen item on its own dataset, so the surrounding form code can
// keep reading `.value` exactly as it did with the <select>.
import { state, currency } from './api.js?v=47';
import { esc, openModal, closeModal } from './ui.js?v=47';

/* ---------- reading an item ---------- */

// Custom fields are stored as one JSON blob per row; the hotel pack seeds
// "Par Level" and "Perishable" onto items, and both are worth surfacing.
function customFields(item) {
  try {
    const parsed = JSON.parse(item.CustomFieldsJson || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function fieldLike(item, needle) {
  const cf = customFields(item);
  const key = Object.keys(cf).find(k => k.toLowerCase().replace(/[^a-z]/g, '').includes(needle));
  return key ? cf[key] : undefined;
}

export function itemMeta(item) {
  if (!item) return null;
  const vendor = state.cache.suppliers?.find(s => s.ROWID === item.PreferredVendorID);
  const par = fieldLike(item, 'parlevel');
  const perishable = fieldLike(item, 'perishable');
  return {
    id: item.ROWID,
    name: item.Name || '',
    sku: item.SKU || '',
    description: item.Description || '',
    category: item.Category || '',
    unit: item.Unit || '',
    type: item.ItemType || 'Goods',
    price: Number(item.UnitPrice || 0),
    expense: item.ExpenseType || expenseForCategory(item.Category) || 'OpEx',
    vendor: vendor ? vendor.Name : '',
    parLevel: (par === '' || par === undefined || par === null) ? null : par,
    perishable: perishable === true || perishable === 'true' || perishable === 'Yes'
  };
}

// The industry pack classifies every purchasing category as CapEx or OpEx, so
// an item with no explicit expense type can still be suggested correctly.
function expenseForCategory(category) {
  if (!category) return '';
  const hit = (state.orgSettings?.categories || []).find(c => c.name === category);
  return hit ? hit.expense : '';
}

/* ---------- the trigger cell ---------- */

/**
 * The button that stands in for the old <select>.
 * Keeps class `l-item` and a real `.value`, so existing form code is unchanged.
 */
export function itemTriggerHTML(cls = 'l-item', item = null) {
  const m = item ? itemMeta(item) : null;
  return `
    <button type="button" class="itempick ${cls}" ${m ? `value="${esc(m.id)}"` : 'value=""'}
            data-price="${m ? m.price : ''}" data-expense="${m ? esc(m.expense) : ''}"
            data-cat="${m ? esc(m.category) : ''}" data-unit="${m ? esc(m.unit) : ''}">
      ${m ? itemTriggerInner(m) : `<span class="itempick-empty">Select an item…</span>`}
    </button>`;
}

function itemTriggerInner(m) {
  const bits = [m.sku, m.unit && `per ${m.unit}`, m.category].filter(Boolean);
  return `
    <span class="itempick-name">${esc(m.name)}</span>
    ${bits.length ? `<span class="itempick-sub">${esc(bits.join(' · '))}</span>` : ''}`;
}

/** Write a chosen item back onto its trigger button. */
export function setTriggerItem(btn, item) {
  const m = itemMeta(item);
  btn.value = m.id;
  btn.dataset.price = String(m.price);
  btn.dataset.expense = m.expense;
  btn.dataset.cat = m.category;
  btn.dataset.unit = m.unit;
  btn.innerHTML = itemTriggerInner(m);
  btn.classList.remove('is-empty');
}

/**
 * Delegate clicks on any `.itempick` inside `container`.
 * `onPick(button, item)` runs after the trigger has been updated, so callers
 * only have to do their own recalculation.
 */
export function wireItemPickers(container, onPick) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.itempick');
    if (!btn || !container.contains(btn)) return;
    e.preventDefault();
    openItemPicker({
      selectedId: btn.value,
      onPick: (item) => {
        setTriggerItem(btn, item);
        if (onPick) onPick(btn, item);
      }
    });
  });
}

/* ---------- the picker ---------- */

export function openItemPicker({ onPick, selectedId = '' } = {}) {
  const all = (state.cache.items || []).map(itemMeta);
  const categories = [...new Set(all.map(i => i.category).filter(Boolean))].sort();
  let activeCat = '';
  let cursor = 0;
  let shown = all;

  openModal({
    title: 'Choose an item',
    wide: true,
    body: `
      <div class="ip-search">
        <input type="search" id="ip-q" autocomplete="off" spellcheck="false"
               placeholder="Search by name, code, category or description…">
      </div>
      ${categories.length ? `
        <div class="ip-cats" id="ip-cats">
          <button type="button" class="ip-cat on" data-cat="">All</button>
          ${categories.map(c => `<button type="button" class="ip-cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>` : ''}
      <div class="ip-list" id="ip-list"></div>
      <div class="ip-foot">
        <span id="ip-count"></span>
        <span class="ip-keys">↑↓ to move · <b>Enter</b> to choose · <b>Esc</b> to close</span>
      </div>`,
    footer: `<button class="btn btn-outline" data-close>Cancel</button>`,
    onOpen: (body) => {
      const q = body.querySelector('#ip-q');
      const list = body.querySelector('#ip-list');
      const count = body.querySelector('#ip-count');

      const render = () => {
        const term = q.value.trim().toLowerCase();
        shown = all.filter(i => {
          if (activeCat && i.category !== activeCat) return false;
          if (!term) return true;
          return `${i.name} ${i.sku} ${i.category} ${i.description} ${i.vendor}`.toLowerCase().includes(term);
        });
        if (cursor >= shown.length) cursor = Math.max(0, shown.length - 1);

        count.textContent = shown.length === all.length
          ? `${all.length} item${all.length === 1 ? '' : 's'}`
          : `${shown.length} of ${all.length}`;

        if (!shown.length) {
          list.innerHTML = `<div class="ip-empty">
            <b>Nothing matches “${esc(q.value.trim())}”.</b>
            <span>Try a shorter search, or clear the category filter.</span>
          </div>`;
          return;
        }

        list.innerHTML = shown.map((i, idx) => `
          <button type="button" class="ip-row ${idx === cursor ? 'on' : ''} ${i.id === selectedId ? 'is-current' : ''}"
                  data-id="${esc(i.id)}" data-idx="${idx}">
            <span class="ip-main">
              <span class="ip-title">
                ${esc(i.name)}
                ${i.sku ? `<code class="ip-sku">${esc(i.sku)}</code>` : ''}
                ${i.perishable ? `<span class="ip-flag ip-flag-warn" title="Perishable">Perishable</span>` : ''}
                ${i.type === 'Service' ? `<span class="ip-flag">Service</span>` : ''}
              </span>
              ${i.description ? `<span class="ip-desc">${esc(i.description)}</span>` : ''}
              <span class="ip-tags">
                ${i.category ? `<span class="ip-tag">${esc(i.category)}</span>` : ''}
                <span class="ip-tag ip-tag-${i.expense === 'CapEx' ? 'capex' : 'opex'}">${esc(i.expense)}</span>
                ${i.vendor ? `<span class="ip-tag">${esc(i.vendor)}</span>` : ''}
                ${i.parLevel !== null ? `<span class="ip-tag">Par ${esc(String(i.parLevel))}</span>` : ''}
              </span>
            </span>
            <span class="ip-price">
              <b>${currency(i.price)}</b>
              ${i.unit ? `<small>per ${esc(i.unit)}</small>` : ''}
            </span>
          </button>`).join('');

        list.querySelector('.ip-row.on')?.scrollIntoView({ block: 'nearest' });
      };

      const choose = (idx) => {
        const picked = shown[idx];
        if (!picked) return;
        const full = (state.cache.items || []).find(i => i.ROWID === picked.id);
        closeModal();
        if (full && onPick) onPick(full);
      };

      q.addEventListener('input', () => { cursor = 0; render(); });
      q.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, shown.length - 1); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, 0); render(); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(cursor); }
      });

      list.addEventListener('click', (e) => {
        const row = e.target.closest('.ip-row');
        if (row) choose(Number(row.dataset.idx));
      });

      body.querySelector('#ip-cats')?.addEventListener('click', (e) => {
        const b = e.target.closest('.ip-cat');
        if (!b) return;
        activeCat = b.dataset.cat;
        body.querySelectorAll('.ip-cat').forEach(x => x.classList.toggle('on', x === b));
        cursor = 0;
        render();
      });

      // Start on the item already chosen, so re-opening a line lands on it.
      if (selectedId) {
        const at = all.findIndex(i => i.id === selectedId);
        if (at >= 0) cursor = at;
      }
      render();
      q.focus();
    }
  });
}
