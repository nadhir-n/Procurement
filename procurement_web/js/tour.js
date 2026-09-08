// Product tour + setup guide.
//
// Two surfaces share one module because they answer the same question
// ("what do I do next?"): a spotlight walkthrough of the shell, and a
// persistent setup checklist that reflects real data in the workspace.

import { esc } from './ui.js?v=48';
import { state } from './api.js?v=48';

const SEEN_KEY = 'pf-tour-done';
const CHECKLIST_DISMISSED_KEY = 'pf-guide-dismissed';

/* =========================================================
   Spotlight tour
   ========================================================= */

// target: CSS selector. The step is skipped when the element is absent
// (nav differs by role/plan), so the tour never points at nothing.
const STEPS = [
  {
    target: '.sidebar-brand',
    title: 'Welcome to ProcureFlow',
    body: 'This is your procure-to-pay workspace. In about a minute we\'ll show you where everything lives — you can skip and reopen this any time from your profile menu.',
    placement: 'right'
  },
  {
    target: '[data-route="dashboard"]',
    title: 'Home',
    body: 'Your spend summary, approvals waiting on you, and anything needing attention — all on one screen.',
    placement: 'right'
  },
  {
    target: '[data-route="items"]',
    title: 'Items & Vendors',
    body: 'Set up the catalog you buy and the suppliers you buy from. Everything downstream — requests, orders, bills — pulls from here.',
    placement: 'right'
  },
  {
    target: '[data-parent="Procurement"]',
    title: 'The procurement flow',
    body: 'Purchase Request → Request for Quote → Purchase Order → Purchase Receive. Each step converts into the next, so you never re-key data.',
    placement: 'right'
  },
  {
    target: '[data-parent="Payables"]',
    title: 'Payables & 3-way matching',
    body: 'Bills are matched against the purchase order and the receipt automatically. Discrepancies get flagged before you pay.',
    placement: 'right'
  },
  {
    target: '[data-route="budgets"]',
    title: 'Budgets',
    body: 'Money is committed when a request is approved and settled when the bill arrives — so your remaining budget is always accurate.',
    placement: 'right'
  },
  {
    target: '#btn-quick-new',
    title: 'Create anything, fast',
    body: 'The + button creates a request, vendor, or item from wherever you are.',
    placement: 'bottom'
  },
  {
    target: '#btn-avatar',
    title: 'Your account',
    body: 'Switch to dark mode, restart this tour, or sign out from here.',
    placement: 'bottom'
  },
  {
    target: 'a[href="#/settings"].topbar-icon-btn',
    title: 'Settings',
    body: 'Approvals, taxes, currencies, PDF templates, the vendor portal and your Zoho Books connection all live in Settings.',
    placement: 'bottom'
  }
];

let tourState = null;

function ensureTourRoot() {
  let root = document.getElementById('tour-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'tour-root';
    document.body.appendChild(root);
  }
  return root;
}

function positionPopover(pop, rect, placement) {
  const margin = 14;
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top;
  let left;
  // Fall back to bottom placement when there is no room to the side (mobile).
  const canSide = vw > 720;
  const place = canSide ? placement : 'bottom';

  if (place === 'right') {
    left = rect.right + margin;
    top = rect.top + rect.height / 2 - ph / 2;
    if (left + pw > vw - 8) { left = rect.left - pw - margin; }
  } else {
    top = rect.bottom + margin;
    left = rect.left + rect.width / 2 - pw / 2;
    if (top + ph > vh - 8) { top = rect.top - ph - margin; }
  }

  pop.style.top = `${Math.max(8, Math.min(top, vh - ph - 8))}px`;
  pop.style.left = `${Math.max(8, Math.min(left, vw - pw - 8))}px`;
}

function renderStep() {
  const root = ensureTourRoot();
  const step = tourState.steps[tourState.index];
  const el = document.querySelector(step.target);
  if (!el) return next();

  el.scrollIntoView({ block: 'center', behavior: 'smooth' });

  const rect = el.getBoundingClientRect();
  const pad = 6;
  const isLast = tourState.index === tourState.steps.length - 1;

  root.innerHTML = `
    <div class="tour-overlay" id="tour-overlay">
      <div class="tour-spot" style="
        top:${rect.top - pad}px; left:${rect.left - pad}px;
        width:${rect.width + pad * 2}px; height:${rect.height + pad * 2}px;"></div>
    </div>
    <div class="tour-pop" id="tour-pop" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div class="tour-pop-step">Step ${tourState.index + 1} of ${tourState.steps.length}</div>
      <h3 class="tour-pop-title" id="tour-title">${esc(step.title)}</h3>
      <p class="tour-pop-body">${esc(step.body)}</p>
      <div class="tour-dots">
        ${tourState.steps.map((_, i) => `<span class="tour-dot ${i === tourState.index ? 'on' : ''}"></span>`).join('')}
      </div>
      <div class="tour-pop-actions">
        <button class="btn btn-ghost btn-sm" id="tour-skip">Skip tour</button>
        <span style="flex:1"></span>
        ${tourState.index > 0 ? '<button class="btn btn-outline btn-sm" id="tour-prev">Back</button>' : ''}
        <button class="btn btn-primary btn-sm" id="tour-next">${isLast ? 'Finish' : 'Next'}</button>
      </div>
    </div>`;

  const pop = document.getElementById('tour-pop');
  positionPopover(pop, rect, step.placement);

  document.getElementById('tour-skip').addEventListener('click', end);
  document.getElementById('tour-next').addEventListener('click', next);
  document.getElementById('tour-prev')?.addEventListener('click', prev);
  document.getElementById('tour-overlay').addEventListener('click', end);
}

function next() {
  if (!tourState) return;
  tourState.index++;
  if (tourState.index >= tourState.steps.length) return end(true);
  renderStep();
}

function prev() {
  if (!tourState || tourState.index === 0) return;
  tourState.index--;
  renderStep();
}

function end(completed = false) {
  const root = document.getElementById('tour-root');
  if (root) root.innerHTML = '';
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', onResize);
  tourState = null;
  localStorage.setItem(SEEN_KEY, '1');
  if (completed) renderSetupGuide();
}

function onKey(e) {
  if (!tourState) return;
  if (e.key === 'Escape') end();
  else if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
}

function onResize() { if (tourState) renderStep(); }

export function startTour() {
  // Only keep steps whose target exists right now.
  const steps = STEPS.filter(s => document.querySelector(s.target));
  if (steps.length === 0) return;
  tourState = { steps, index: 0 };
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  renderStep();
}

export function hasSeenTour() {
  return localStorage.getItem(SEEN_KEY) === '1';
}

/* =========================================================
   Setup guide — a checklist driven by real workspace data
   ========================================================= */

function guideTasks() {
  const c = state.cache || {};
  const s = state.orgSettings || {};
  const count = (k) => (Array.isArray(c[k]) ? c[k].length : 0);

  return [
    {
      id: 'org',
      label: 'Complete your organization profile',
      hint: 'Logo and address — these appear on every PDF you send.',
      href: '#/settings?tab=org',
      done: !!(s.address && s.logoDataUri)
    },
    {
      id: 'departments',
      label: 'Add departments',
      hint: 'Requests and budgets are tracked per department.',
      href: '#/settings?tab=departments',
      done: (s.departments || []).length > 0
    },
    {
      id: 'vendors',
      label: 'Add your first vendor',
      hint: 'Suppliers you raise orders against.',
      href: '#/vendors?new=1',
      done: count('suppliers') > 0
    },
    {
      id: 'items',
      label: 'Add items to your catalog',
      hint: 'Goods and services your team can request.',
      href: '#/items?new=1',
      done: count('items') > 0
    },
    {
      id: 'approvals',
      label: 'Configure approval rules',
      hint: 'Decide which requests need a second pair of eyes.',
      href: '#/settings?tab=approvals',
      done: !!(s.approvalRules?.PR)
    },
    {
      id: 'team',
      label: 'Invite your team',
      hint: 'Requesters, approvers and finance users each get their own view.',
      href: '#/settings?tab=users',
      done: count('users') > 1
    }
  ];
}

// Rendered into the Home view by views-p2p. Returns '' when there is
// nothing useful to show (all done, or the user dismissed it).
export function setupGuideHTML() {
  if (localStorage.getItem(CHECKLIST_DISMISSED_KEY) === '1') return '';
  const tasks = guideTasks();
  const done = tasks.filter(t => t.done).length;
  if (done === tasks.length) return '';
  const pct = Math.round((done / tasks.length) * 100);

  return `
    <section class="guide-card" id="setup-guide">
      <header class="guide-head">
        <div>
          <h3>Finish setting up ProcureFlow</h3>
          <p>${done} of ${tasks.length} done — each step unlocks the next part of the flow.</p>
        </div>
        <div class="guide-actions">
          <button class="btn btn-outline btn-sm" id="guide-tour">▶ Replay tour</button>
          <button class="btn btn-ghost btn-sm" id="guide-dismiss" title="Hide this checklist">✕</button>
        </div>
      </header>
      <div class="guide-progress"><span style="width:${pct}%"></span></div>
      <ol class="guide-list">
        ${tasks.map(t => `
          <li class="guide-item ${t.done ? 'done' : ''}">
            <span class="guide-check">${t.done ? '✓' : ''}</span>
            <div class="guide-item-text">
              <span class="guide-label">${esc(t.label)}</span>
              <span class="guide-hint">${esc(t.hint)}</span>
            </div>
            ${t.done ? '' : `<a class="btn btn-outline btn-sm" href="${t.href}">Set up</a>`}
          </li>`).join('')}
      </ol>
    </section>`;
}

// Wire the buttons inside a rendered guide. Safe to call when absent.
export function wireSetupGuide(onDismiss) {
  document.getElementById('guide-tour')?.addEventListener('click', startTour);
  document.getElementById('guide-dismiss')?.addEventListener('click', () => {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, '1');
    document.getElementById('setup-guide')?.remove();
    onDismiss?.();
  });
}

// Re-render the guide in place after data changes (called on tour finish).
function renderSetupGuide() {
  const existing = document.getElementById('setup-guide');
  if (!existing) return;
  const html = setupGuideHTML();
  if (!html) return existing.remove();
  existing.outerHTML = html;
  wireSetupGuide();
}

/* =========================================================
   First-run trigger
   ========================================================= */
export function maybeAutoStartTour() {
  if (hasSeenTour()) return;
  // Let the shell settle (sidebar built, first view rendered) before measuring.
  setTimeout(() => { if (!hasSeenTour()) startTour(); }, 700);
}
