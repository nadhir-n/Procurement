// ── Record view ──────────────────────────────────────────────────────────────
// A record page, not a document preview.
//
// Until now the only way to look at a requisition was the printable-paper view:
// a scaled PDF template with a side panel. That is the right surface for
// printing and the wrong one for working — you cannot see the approval trail
// next to the lines, and most modules had no detail screen at all.
//
// This is the working surface: an identity bar (number, status, actions) over a
// tabbed body. The paper view is still one click away, because printing is a
// real job and it already worked well.
import { esc, badge, openPage, closePage } from './ui.js?v=47';

/**
 * openRecord({
 *   number, status, subtitle,
 *   summary: { label, value },            // the one number that matters
 *   actions: [{ label, primary, danger, onClick({ close, reload }) }],
 *   tabs:    [{ id, label, count, render(el) }]   // render may be async
 * })
 */
export function openRecord(cfg) {
  const tabs = (cfg.tabs || []).filter(Boolean);
  const actions = (cfg.actions || []).filter(Boolean);
  let active = tabs[0]?.id;

  const actionBtns = actions.map((a, i) =>
    `<button class="btn btn-sm ${a.primary ? 'btn-primary' : a.danger ? 'btn-danger' : 'btn-outline'}"
             data-rec-action="${i}">${esc(a.label)}</button>`).join('');

  openPage({
    title: cfg.number || 'Record',
    body: `
      <div class="rv">
        <div class="rv-bar">
          <div class="rv-ident">
            <span class="rv-no">${esc(cfg.number || '')}</span>
            ${cfg.status ? badge(cfg.status) : ''}
            ${cfg.subtitle ? `<span class="rv-sub">${esc(cfg.subtitle)}</span>` : ''}
          </div>
          ${cfg.summary ? `
            <div class="rv-sum">
              <span class="rv-sum-l">${esc(cfg.summary.label)}</span>
              <span class="rv-sum-v">${esc(String(cfg.summary.value))}</span>
            </div>` : ''}
          <div class="rv-acts">${actionBtns}</div>
        </div>

        <div class="rv-body">
          <nav class="rv-rail" id="rv-rail">
            ${tabs.map(t => `
              <button type="button" class="rv-tab ${t.id === active ? 'on' : ''}" data-tab="${esc(t.id)}">
                <span>${esc(t.label)}</span>
                ${t.count !== undefined && t.count !== null ? `<em>${esc(String(t.count))}</em>` : ''}
              </button>`).join('')}
          </nav>
          <section class="rv-panel" id="rv-panel"></section>
        </div>
      </div>`,
    onOpen: (body) => {
      const panel = body.querySelector('#rv-panel');

      const draw = async (id) => {
        const tab = tabs.find(t => t.id === id);
        if (!tab) return;
        active = id;
        body.querySelectorAll('.rv-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
        panel.innerHTML = `<div class="rv-loading">Loading…</div>`;
        try {
          panel.innerHTML = '';
          await tab.render(panel);
        } catch (err) {
          panel.innerHTML = `<div class="rv-error">Could not load this tab.<span>${esc(err.message)}</span></div>`;
        }
      };

      body.querySelector('#rv-rail').addEventListener('click', (e) => {
        const b = e.target.closest('.rv-tab');
        if (b) draw(b.dataset.tab);
      });

      actions.forEach((a, i) => {
        body.querySelector(`[data-rec-action="${i}"]`)?.addEventListener('click', () =>
          a.onClick({ close: closePage, reload: () => draw(active) }));
      });

      draw(active);
    }
  });
}

/* ---------- building blocks for tab bodies ---------- */

/** A definition list. Rows with an empty value are dropped, not shown as "—". */
export function factsHTML(pairs, { title } = {}) {
  const rows = pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v, opts]) => `
      <div class="rv-fact${opts?.wide ? ' wide' : ''}">
        <dt>${esc(k)}</dt>
        <dd>${opts?.html ? v : esc(String(v))}</dd>
      </div>`).join('');
  if (!rows) return '';
  return `${title ? `<h3 class="rv-h">${esc(title)}</h3>` : ''}<dl class="rv-facts">${rows}</dl>`;
}

/** A line-items table with a totals strip. */
export function linesHTML(columns, rows, totals) {
  if (!rows.length) return emptyHTML('No line items on this record.');
  return `
    <div class="rv-table-wrap">
      <table class="rv-table">
        <thead><tr>${columns.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map(r => `<tr>${columns.map(c => `
            <td class="${c.num ? 'num' : ''}" data-label="${esc(c.label)}">${c.render ? c.render(r) : esc(String(r[c.key] ?? '—'))}</td>`).join('')}</tr>`).join('')}
        </tbody>
        ${totals?.length ? `<tfoot>${totals.map(([label, value, strong]) => `
          <tr class="${strong ? 'is-total' : ''}">
            <td colspan="${columns.length - 1}" class="num">${esc(label)}</td>
            <td class="num">${esc(String(value))}</td>
          </tr>`).join('')}</tfoot>` : ''}
      </table>
    </div>`;
}

/** A vertical timeline — approvals, status changes, anything ordered in time. */
export function timelineHTML(events) {
  if (!events.length) return emptyHTML('Nothing recorded yet.');
  return `
    <ol class="rv-timeline">
      ${events.map(e => `
        <li class="rv-ev rv-ev-${esc(e.tone || 'neutral')}">
          <span class="rv-ev-dot"></span>
          <div class="rv-ev-body">
            <div class="rv-ev-head">
              <b>${esc(e.title)}</b>
              ${e.when ? `<span class="rv-ev-when">${esc(e.when)}</span>` : ''}
            </div>
            ${e.who ? `<div class="rv-ev-who">${esc(e.who)}</div>` : ''}
            ${e.note ? `<div class="rv-ev-note">${esc(e.note)}</div>` : ''}
          </div>
        </li>`).join('')}
    </ol>`;
}

export function emptyHTML(message, hint) {
  return `<div class="rv-empty"><b>${esc(message)}</b>${hint ? `<span>${esc(hint)}</span>` : ''}</div>`;
}

export function sectionHTML(title, inner) {
  if (!inner) return '';
  return `<div class="rv-section"><h3 class="rv-h">${esc(title)}</h3>${inner}</div>`;
}
