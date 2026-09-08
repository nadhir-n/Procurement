// App bootstrap: Catalyst auth → sync → onboarding/lock gates → router.
import { api, state, refreshCaches } from './api.js?v=53';
import { toast, wireModalChrome, esc, applyStoredTheme } from './ui.js?v=53';
import { viewDashboard, viewPRs, viewRFQs, viewPOs, viewGRNs, viewInvoices, viewPayments, viewMyRequests, viewApprovals } from './views-p2p.js?v=53';
import { viewVendors, viewItems, viewBudgets, viewRecurringBills, viewVendorCredits, viewCustomModules, viewSettings } from './views-admin.js?v=53';
import { startTour, maybeAutoStartTour } from './tour.js?v=53';

// The app must be same-origin with the Catalyst functions for the session
// cookie to flow. Slate's *.onslate.com preview host is not, so bounce to the
// canonical domain. Everything else — the custom domain and the
// *.catalystserverless.com host — serves the functions from its own origin and
// is left alone, so both keep working through a domain move.
const CANONICAL_ORIGIN = 'https://procurement.cloudhub.lk';
if (window.location.hostname.endsWith('.onslate.com')) {
  window.location.replace(`${CANONICAL_ORIGIN}/app/index.html`);
}

/* ---------------- Router ---------------- */
const icons = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  prs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
  rfqs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8-8 18-2.5-7.5z"/></svg>',
  pos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/></svg>',
  grns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v4h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>',
  invoices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 .7z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  payments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  recurring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3L23 10M1 14l4.6 4a9 9 0 0 0 14.9-3"/></svg>',
  credits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>',
  vendors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>',
  items: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.6 9.2L12 14 3.4 9.2M12 3l8.6 4.8v8.4L12 21l-8.6-4.8V7.8z"/></svg>',
  budgets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10h-10z"/></svg>',
  custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/></svg>',
  approvals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
};

// Zoho-style navigation: personal views on top, then masters, then
// collapsible Procurement / Payables groups, then finance & platform.
const ROUTES = [
  { id: 'dashboard', label: 'Home', icon: 'dashboard', view: viewDashboard, title: 'Home' },
  { id: 'my-requests', label: 'My Requests', icon: 'prs', view: viewMyRequests, title: 'My Requests' },
  { id: 'approvals', label: 'Approvals', icon: 'approvals', view: viewApprovals, title: 'Approvals' },
  { id: 'items', label: 'Items', icon: 'items', view: viewItems, title: 'Items' },
  { id: 'vendors', label: 'Vendors', icon: 'vendors', view: viewVendors, title: 'Vendors' },
  { parent: 'Procurement', icon: 'pos' },
  { id: 'requisitions', label: 'Purchase Requests', icon: 'prs', view: viewPRs, title: 'Purchase Requests', in: 'Procurement' },
  { id: 'rfqs', label: 'Request for Quotes', icon: 'rfqs', view: viewRFQs, title: 'Request for Quotes', in: 'Procurement' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: 'pos', view: viewPOs, title: 'Purchase Orders', in: 'Procurement' },
  { id: 'receipts', label: 'Purchase Receives', icon: 'grns', view: viewGRNs, title: 'Purchase Receives', in: 'Procurement' },
  { parent: 'Payables', icon: 'invoices' },
  { id: 'invoices', label: 'Bills', icon: 'invoices', view: viewInvoices, title: 'Bills & Matching', in: 'Payables' },
  { id: 'recurring-bills', label: 'Recurring Bills', icon: 'recurring', view: viewRecurringBills, title: 'Recurring Bills', in: 'Payables' },
  { id: 'payments', label: 'Payments Made', icon: 'payments', view: viewPayments, title: 'Payments Made', in: 'Payables' },
  { id: 'vendor-credits', label: 'Vendor Credits', icon: 'credits', view: viewVendorCredits, title: 'Vendor Credits', in: 'Payables' },
  { id: 'budgets', label: 'Budgets', icon: 'budgets', view: viewBudgets, title: 'Budgets' },
  { id: 'custom-modules', label: 'Custom Modules', icon: 'custom', view: viewCustomModules, title: 'Custom Modules' },
  { id: 'settings', label: 'Settings', icon: 'settings', view: viewSettings, title: 'All Settings' }
];

// Route -> capability flag. A route with no entry is always available.
// Flags are resolved server-side (registry default -> industry pack ->
// per-tenant override) and shipped on the organization record.
const ROUTE_CAPABILITY = {
  rfqs: 'rfqs',
  receipts: 'receipts',
  'recurring-bills': 'recurringBills',
  'vendor-credits': 'vendorCredits',
  budgets: 'budgets',
  'custom-modules': 'customModules'
};

function routeEnabled(routeId) {
  const cap = ROUTE_CAPABILITY[routeId];
  if (!cap) return true;
  const caps = state.org?.capabilities;
  // Before capabilities are known (older backend, or load failure) show
  // everything rather than hiding the app behind a missing flag.
  if (!caps || !(cap in caps)) return true;
  return !!caps[cap];
}

function buildSidebar() {
  const nav = document.getElementById('side-nav');
  let html = '<div class="nav-group">';
  let openChildren = null;
  for (const r of ROUTES) {
    if (r.id && !routeEnabled(r.id)) continue;
    if (r.parent) {
      if (openChildren) { html += '</div>'; openChildren = null; }
      html += `<button class="nav-parent" data-parent="${r.parent}">
          ${icons[r.icon] || ''}<span>${r.parent}</span><span class="chev">▶</span>
        </button><div class="nav-children" data-children="${r.parent}">`;
      openChildren = r.parent;
    } else {
      if (!r.in && openChildren) { html += '</div>'; openChildren = null; }
      html += `<a class="nav-item" data-route="${r.id}" href="#/${r.id}">${icons[r.icon] || ''}<span>${r.label}</span></a>`;
    }
  }
  if (openChildren) html += '</div>';
  html += '</div>';
  nav.innerHTML = html;

  // Collapsible groups: remember expanded state, auto-expand the active route's group.
  const expanded = new Set(JSON.parse(localStorage.getItem('pf-nav-open') || '["Procurement"]'));
  const applyExpand = () => {
    nav.querySelectorAll('.nav-parent').forEach(btn => {
      const on = expanded.has(btn.dataset.parent);
      btn.classList.toggle('expanded', on);
      nav.querySelector(`[data-children="${btn.dataset.parent}"]`).classList.toggle('open', on);
    });
  };
  nav.querySelectorAll('.nav-parent').forEach(btn => btn.addEventListener('click', () => {
    const g = btn.dataset.parent;
    expanded.has(g) ? expanded.delete(g) : expanded.add(g);
    localStorage.setItem('pf-nav-open', JSON.stringify([...expanded]));
    applyExpand();
  }));
  applyExpand();

  // Expose so route() can auto-expand the group of the active route.
  buildSidebar.expandFor = (routeId) => {
    const r = ROUTES.find(x => x.id === routeId);
    if (r?.in && !expanded.has(r.in)) { expanded.add(r.in); applyExpand(); }
  };
}

async function route() {
  const hash = window.location.hash.replace(/^#\//, '') || 'dashboard';
  const [id, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  let r = ROUTES.find(x => x.id === id) || ROUTES.find(x => x.id === 'dashboard');
  // Typing the URL of a module this tenant is not entitled to lands on Home
  // rather than rendering a page whose data the backend will refuse.
  if (r.id && !routeEnabled(r.id)) {
    toast('That module is not enabled for your organization.', 'warning');
    r = ROUTES.find(x => x.id === 'dashboard');
  }

  document.querySelectorAll('.nav-item').forEach(item =>
    item.classList.toggle('active', item.dataset.route === r.id));
  if (buildSidebar.expandFor) buildSidebar.expandFor(r.id);
  document.getElementById('page-title').textContent = r.title;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-scrim')?.classList.remove('open');

  const view = document.getElementById('view');
  view.innerHTML = '';
  // Settings renders as a full-screen workspace; every other route must not.
  // viewSettings re-adds this class itself.
  document.body.classList.remove('settings-open');
  // No skeleton is injected here on purpose. Views render their own shell
  // (listPage() already includes a skeleton in #list-body) and then fill it
  // after fetching; writing into `view` on a timer would destroy that shell
  // mid-flight and the view's follow-up write would hit a detached null.
  try {
    await r.view(view, params);
  } catch (err) {
    console.error('View error:', err);
    view.innerHTML = `<div class="card"><div class="card-body"><div class="empty">
      <div class="icon">⚠</div><div class="title">Something went wrong loading this page</div>
      <div class="sub">${esc(err.message)}</div>
      <button class="btn btn-outline" onclick="window.dispatchEvent(new Event('hashchange'))">Try again</button>
    </div></div></div>`;
  }
}

/* ---------------- Screens ---------------- */
function show(screenId) {
  ['boot-screen', 'login-screen', 'onboarding-screen', 'blocked-screen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open', id === screenId);
  });
  document.getElementById('app').classList.toggle('ready', screenId === null);
}

let loginWidgetMounted = false;

// Old login screen deleted — the React UI at / is the sole sign-in entry.
// Any unauthenticated state lands there (message preserved via sessionStorage).
function showLogin(message = '') {
  try {
    if (message) sessionStorage.setItem('pf_login_msg', message);
    else sessionStorage.removeItem('pf_login_msg');
  } catch { /* private mode */ }
  const here = new URLSearchParams(window.location.search);
  const dev = here.get('dev') === '1' ? '?dev=1' : '';
  window.location.href = `/${dev}#auth`;
}

function mountZohoLogin() {
  const container = document.getElementById('catalyst-login-container');
  const fallback = document.getElementById('btn-login');
  if (!container || !window.catalyst?.auth?.signIn) {
    if (fallback) fallback.hidden = false;
    return;
  }
  if (loginWidgetMounted) return;
  try {
    container.replaceChildren();
    const signInResult = window.catalyst.auth.signIn('catalyst-login-container', {
      login_redirect: `${window.location.origin}/app/index.html`
    });
    loginWidgetMounted = true;
    if (fallback) fallback.hidden = true;
    // Some SDK versions return a rejected promise when the remote auth panel
    // is temporarily unavailable. Handle it here so a failed identity frame
    // becomes a visible recovery option, never an unhandled browser error.
    if (signInResult && typeof signInResult.catch === 'function') {
      signInResult.catch(() => {
        // The SDK can reject after it has already mounted the cross-origin
        // identity frame. The frame is the authority here, so do not replace a
        // working sign-in form with a misleading fallback button.
      });
    }
  } catch (err) {
    if (fallback) fallback.hidden = false;
    const error = document.getElementById('login-error');
    if (error) error.textContent = 'The secure sign-in panel could not load. Please try again.';
  }
}

function showBlocked(status) {
  const suspended = status === 'Suspended';
  document.getElementById('blocked-icon').textContent = suspended ? '⛔' : '🕒';
  document.getElementById('blocked-title').textContent = suspended ? 'Access suspended' : 'Account under review';
  document.getElementById('blocked-message').textContent = suspended
    ? 'Your organization has been suspended. Please contact platform support to restore access.'
    : "Your organization has been created and is awaiting verification by our team. You'll get full access as soon as it's approved — this usually doesn't take long.";
  document.getElementById('blocked-org').innerHTML =
    `<strong>${esc(state.org?.Name || 'Your organization')}</strong><br>
     <span style="color:var(--ink-muted);">Status: ${suspended ? 'Suspended' : 'Pending verification'}</span>`;
  show('blocked-screen');
}

function bootStatus(message) {
  const el = document.getElementById('boot-status');
  if (el) el.textContent = message;
}

/* Boot progress. The four dots mirror the procure-to-pay chain and are driven by
   the actual stage we reached, so a stall is visible instead of being masked by
   an animation that loops forever. */
const BOOT_STAGES = [
  { pct: 12, label: 'Connecting to ProcureFlow…' },
  { pct: 38, label: 'Verifying your session…' },
  { pct: 64, label: 'Loading your workspace…' },
  { pct: 88, label: 'Loading data…' }
];

function bootStage(index) {
  const wrap = document.querySelector('.loader-wrap');
  const stage = BOOT_STAGES[index];
  if (!wrap || !stage) return;
  wrap.classList.add('is-staged');
  wrap.style.setProperty('--boot-progress', stage.pct + '%');
  // Ring circumference is 2πr with r=44 → 276.5. Offset shrinks as we advance.
  wrap.style.setProperty('--ring-dash', (276.5 * (1 - stage.pct / 100)).toFixed(1));
  bootStatus(stage.label);

  document.querySelectorAll('#boot-flow .flow-node').forEach((n, i) => {
    n.classList.toggle('is-done', i < index);
    n.classList.toggle('is-active', i === index);
  });
  document.querySelectorAll('#boot-flow .flow-link').forEach((l, i) => {
    l.classList.toggle('is-done', i < index);
  });
}

function bootDone() {
  const wrap = document.querySelector('.loader-wrap');
  if (!wrap) return;
  wrap.style.setProperty('--boot-progress', '100%');
  wrap.style.setProperty('--ring-dash', '0');
  document.querySelectorAll('#boot-flow .flow-node').forEach(n => {
    n.classList.add('is-done'); n.classList.remove('is-active');
  });
  document.querySelectorAll('#boot-flow .flow-link').forEach(l => l.classList.add('is-done'));
}

/* A failed boot must say which of the two very different things went wrong:
   the server is unreachable, or the session is not valid. */
function bootFail(title, message, onRetry, retryLabel) {
  const wrap = document.querySelector('.loader-wrap');
  const box = document.getElementById('boot-fail');
  if (!wrap || !box) return;
  wrap.classList.add('is-failed');
  document.getElementById('boot-fail-title').textContent = title;
  document.getElementById('boot-fail-msg').textContent = message;
  box.hidden = false;
  const btn = document.getElementById('boot-retry');
  if (btn) {
    btn.onclick = onRetry || (() => window.location.reload());
    if (retryLabel) btn.textContent = retryLabel;
  }
}

/* Cheap unauthenticated probe: confirms the function is deployed and reachable
   before we blame the user's session for a failure that is really network. */
async function checkBackend() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('/server/procurement_api/api/health', {
      signal: ctrl.signal, credentials: 'include', cache: 'no-store'
    });
    if (!res.ok) return { ok: false, reason: `Server responded ${res.status}.` };
    const body = await res.json();
    return { ok: !!body.ok, version: body.version, reason: '' };
  } catch (e) {
    return { ok: false, reason: e.name === 'AbortError' ? 'The server did not respond in time.' : 'Network request failed.' };
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- Auth bootstrap ---------------- */
function waitForCatalystSDK(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const t = setInterval(() => {
      if (window.catalyst && window.catalyst.auth) { clearInterval(t); resolve(); }
      else if (Date.now() - started > timeoutMs) { clearInterval(t); reject(new Error('Catalyst SDK failed to load')); }
    }, 80);
  });
}

/**
 * Shown once to somebody who has just been provisioned on first sign-in.
 *
 * Without it a new arrival sees an app where most actions are missing and has
 * no way to tell whether that is intentional, a bug, or a permissions problem.
 * Saying so directly — and naming who can change it — is the difference between
 * a confusing first impression and a clear one.
 */
function showFirstRunNotice(message) {
  const existing = document.getElementById('first-run-notice');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.id = 'first-run-notice';
  bar.setAttribute('role', 'status');
  bar.style.cssText =
    'position:fixed;left:50%;transform:translateX(-50%);bottom:20px;z-index:400;' +
    'max-width:min(560px,calc(100vw - 32px));display:flex;gap:12px;align-items:flex-start;' +
    'padding:12px 14px;border-radius:8px;background:#1a5fb4;color:#fff;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.25);font-size:13px;line-height:1.45;';

  const text = document.createElement('div');
  text.style.flex = '1';
  // textContent, not innerHTML: this string travels from the server and must
  // never be able to inject markup.
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Dismiss');
  close.style.cssText =
    'background:transparent;border:0;color:#fff;cursor:pointer;font-size:14px;' +
    'padding:0 2px;line-height:1.4;';
  close.addEventListener('click', () => bar.remove());

  bar.append(text, close);
  document.body.appendChild(bar);

  // Long enough to read twice; this is not a transient confirmation.
  setTimeout(() => bar.remove(), 20000);
}

async function enterApp() {
  bootStage(2);
  const orgs = await api('GET', '/api/organizations');
  state.org = orgs[0] || null;
  try { state.orgSettings = JSON.parse(state.org?.Settings || '{}'); } catch { state.orgSettings = {}; }

  // Show the build the backend actually reports, rather than a number typed
  // into the HTML that silently goes stale. When support asks "which version
  // are you on?", the answer is on screen and it is true.
  const verEl = document.getElementById('build-version');
  if (verEl) verEl.textContent = state.backendVersion || 'unknown build';

  // Verification / suspension gate
  if (state.org && (state.org.Status === 'Pending Verification' || state.org.Status === 'Suspended')) {
    showBlocked(state.org.Status);
    return;
  }

  bootStage(3);
  await refreshCaches();

  // Topbar identity
  document.getElementById('org-chip-name').textContent = state.org?.Name || 'Workspace';
  // Uploaded org logo replaces the PF brand mark in the sidebar. A stored value
  // that no longer decodes must fall back to the ProcureFlow mark — otherwise the
  // sidebar shows the browser's broken-image glyph, which looks like a dead app.
  if (state.orgSettings.logoDataUri) {
    const mark = document.querySelector('.sidebar-brand .brand-mark');
    if (mark) {
      const fallback = mark.innerHTML;
      const img = new Image();
      img.alt = 'Organization logo';
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:7px;background:#fff;';
      img.onload = () => { mark.innerHTML = ''; mark.appendChild(img); };
      img.onerror = () => { mark.innerHTML = fallback; };
      img.src = state.orgSettings.logoDataUri;
    }
  }
  document.getElementById('pm-name').textContent = state.currentUser?.FullName || state.authName || '—';
  document.getElementById('pm-email').textContent = state.authEmail || '';
  const initials = (state.currentUser?.FullName || state.authName || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('btn-avatar').textContent = initials;

  bootDone();
  show(null);
  buildSidebar();
  await route();
  maybeAutoStartTour();
}

async function boot() {
  wireChrome();

  // ---- DEV BYPASS: ?dev=1 enters without Zoho (view structure) ----
  if (new URLSearchParams(window.location.search).get('dev') === '1') {
    bootStage(0);
    bootStatus('Dev mode — skipping health check…');
    state.backendVersion = '4.1.2-dev';
    // Mock Catalyst — window.catalyst.auth has only a getter, so don't assign directly
    const mockAuth = {
      isUserAuthenticated: async () => ({ content: { email_id: 'test@procureflow.local', first_name: 'Nadhir', last_name: 'Noori' } }),
      generateAuthToken: async () => ({ access_token: 'dev-bypass' }),
      signIn: () => {},
      signOut: () => window.location.href = window.location.pathname
    };
    try {
      if (window.catalyst && window.catalyst.auth) {
        // auth is getter-only — patch methods individually
        Object.defineProperties(window.catalyst.auth, {
          isUserAuthenticated: { value: mockAuth.isUserAuthenticated, writable: true, configurable: true },
          generateAuthToken: { value: mockAuth.generateAuthToken, writable: true, configurable: true }
        });
      } else {
        Object.defineProperty(window, 'catalyst', { value: { auth: mockAuth }, writable: true, configurable: true });
      }
    } catch (e) {
      // Fallback: global mock that api.js will use if catalyst missing
      window._devMockAuth = mockAuth;
      // Patch getAuthToken path in api.js via window override
      window.catalyst = { auth: mockAuth };
    }
    state.authEmail = 'test@procureflow.local';
    state.authName = 'Nadhir Noori (Dev)';
    try {
      // Use dev proxy endpoints - don't await health, go straight to sync
      const sync = await api('POST', '/api/sync-user?dev=1', {});
      if (sync.user) {
        state.currentUser = sync.user;
        await enterApp();
        if (sync.notice) showFirstRunNotice(sync.notice);
        return;
      }
    } catch (e) {
      console.warn('dev bypass fallthrough', e);
      bootFail('Dev bypass failed', e.message, () => window.location.reload());
      return;
    }
  }

  // 1. Is the backend actually there? Answering this first means a network
  //    outage never gets reported to the user as a sign-in problem.
  bootStage(0);
  const health = await checkBackend();
  if (!health.ok) {
    bootFail(
      "Can't reach ProcureFlow",
      `${health.reason} This is a connection problem, not your account. Check your network and try again.`,
      () => window.location.reload()
    );
    return;
  }
  state.backendVersion = health.version || '';

  bootStage(1);
  try {
    await waitForCatalystSDK();
  } catch {
    bootFail(
      'Sign-in service unavailable',
      'The Catalyst authentication SDK failed to load. This is usually a temporary network issue.',
      () => window.location.reload()
    );
    return;
  }

  let authResult;
  try {
    authResult = await window.catalyst.auth.isUserAuthenticated();
  } catch {
    showLogin();
    return;
  }

  try {
    const cUser = authResult.content || {};
    state.authEmail = String(cUser.email_id || '').toLowerCase();
    state.authName = `${cUser.first_name || ''} ${cUser.last_name || ''}`.trim();

    bootStage(2);

    const sync = await api('POST', '/api/sync-user', {});

    // Three possible states, and they are not the same thing:
    //   setupRequired  — nobody has configured this installation yet
    //   no user        — configured, but this account was never invited
    //   user           — in
    if (sync.setupRequired) {
      show('onboarding-screen');
      const nameInput = document.getElementById('ob-admin-name');
      if (nameInput && !nameInput.value) nameInput.value = state.authName;
      return;
    }
    if (!sync.user) return showLogin('This Zoho Account has not been invited to this Procurement workspace.');
    state.currentUser = sync.user;
    await enterApp();

    // Somebody arriving for the first time from a console invitation. Tell them
    // why the app looks read-only, once, rather than letting them conclude it is
    // broken when buttons do nothing.
    if (sync.notice) {
      showFirstRunNotice(sync.notice);
    }
  } catch (err) {
    console.error('Boot error:', err);
    // The backend already answered /api/health, so this is not connectivity.
    // An auth failure means "sign in"; anything else is a real server error and
    // should say so rather than sending the user to a login button that won't help.
    const msg = String(err.message || '');
    if (/401|unauthor|session|sign in/i.test(msg)) {
      showLogin('Your session has expired. Please sign in again.');
    } else if (/NOT_A_MEMBER|access to this workspace/i.test(msg)) {
      showLogin('This Zoho Account is not an invited Procurement user. Ask an administrator to add you.');
    } else {
      bootFail('Something went wrong starting up', msg || 'Unexpected error while loading your workspace.',
        () => window.location.reload());
    }
  }
}

/* ---------------- Chrome wiring ---------------- */
function wireChrome() {
  wireModalChrome();

  // The reference interface makes search a first-class command.  This search
  // intentionally navigates to actual ProcureFlow workspaces (rather than
  // pretending to search records that have not been fetched yet).
  const globalSearch = document.getElementById('global-search');
  const globalSearchResults = document.getElementById('global-search-results');
  const closeGlobalSearch = () => {
    globalSearchResults.hidden = true;
    globalSearchResults.innerHTML = '';
  };
  const showGlobalSearch = () => {
    const q = globalSearch.value.trim().toLowerCase();
    if (!q) return closeGlobalSearch();
    const matches = ROUTES.filter(r => r.id && routeEnabled(r.id) &&
      `${r.label} ${r.title} ${r.in || ''}`.toLowerCase().includes(q)).slice(0, 6);
    globalSearchResults.innerHTML = matches.length
      ? matches.map(r => `<button type="button" data-route="${esc(r.id)}"><span>${esc(r.label)}</span><small>${esc(r.in || 'Workspace')}</small></button>`).join('')
      : '<button type="button" disabled>No matching workspace</button>';
    globalSearchResults.hidden = false;
  };
  globalSearch.addEventListener('input', showGlobalSearch);
  globalSearch.addEventListener('focus', showGlobalSearch);
  globalSearchResults.addEventListener('click', e => {
    const item = e.target.closest('[data-route]');
    if (!item) return;
    window.location.hash = `#/${item.dataset.route}`;
    globalSearch.value = '';
    closeGlobalSearch();
  });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); globalSearch.focus();
    }
    if (e.key === 'Escape') closeGlobalSearch();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.global-search')) closeGlobalSearch();
  });
  document.getElementById('btn-notifications').addEventListener('click', () =>
    toast('You are up to date. New approvals and exceptions will appear here.'));

  // Theme. Light is the first-visit default; the toggle persists either choice.
  const label = () => document.getElementById('theme-label');
  const syncLabel = (theme) => {
    const el = label();
    if (el) el.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  };
  syncLabel(applyStoredTheme());
  document.getElementById('btn-theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('pf-theme', next);
    document.documentElement.dataset.theme = next;
    syncLabel(next);
  });

  // Layout density (set in Settings → Workspace tools)
  document.documentElement.dataset.density = localStorage.getItem('pf-density') || 'comfortable';

  // Embedded Zoho Account sign-in. There is deliberately no public signup
  // route: membership is created only by an administrator invitation.
  document.getElementById('btn-login')?.addEventListener('click', () => {
    loginWidgetMounted = false;
    mountZohoLogin();
  });
  // Demo login — local preview without Zoho invite (direct mock, no network hang)
  document.getElementById('btn-demo-login')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-demo-login');
    btn.disabled = true; btn.textContent = 'Entering demo…';
    // Hide the pie/graphic above the button
    document.getElementById('catalyst-login-container')?.style.setProperty('display','none','important');
    // Direct mock — don't call api/sync-user which can hang on getter-only catalyst
    state.authEmail = 'demo@procureflow.local';
    state.authName = 'Demo Account';
    state.currentUser = { ROWID: 'dev-user-1', FullName: 'Demo Account', Email: 'demo@procureflow.local', Role: 'Admin', Status: 'Active' };
    state.org = { ROWID: 'dev-org-1', Name: 'Galle Face Hotel Group (LOCAL DEV)', Status: 'Active', Settings: JSON.stringify({ currency: 'LKR', multiProperty: true, capabilities: { rfqs:true, receipts:true, recurringBills:true, vendorCredits:true, budgets:true, customModules:true } }), capabilities: { rfqs:true, receipts:true, recurringBills:true, vendorCredits:true, budgets:true, customModules:true } };
    try { state.orgSettings = JSON.parse(state.org.Settings); } catch { state.orgSettings = {}; }
    state.backendVersion = '4.1.2-demo';
    try {
      await enterApp();
      showFirstRunNotice('DEMO MODE — browsing original layout with mock data. No Zoho invite needed.');
    } catch (e) {
      btn.disabled = false; btn.textContent = '▶ Enter Demo Account — view inside without Zoho invite';
      document.getElementById('login-error').textContent = e.message;
    }
  });
  document.getElementById('btn-use-different-account')?.addEventListener('click', signOut);
  window.addEventListener('procureflow:auth-required', () => {
    loginWidgetMounted = false;
    showLogin('Your session has expired. Please sign in again.');
  });

  // First-run setup. No industry question: this is the Hotel Management
  // edition, so the hotel pack is applied unconditionally by the server.
  document.getElementById('onboarding-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Setting up…';
    try {
      // Properties are entered one per line. A hotel group is defined by them,
      // so seeding them now is what makes budgets and requisitions meaningful
      // on day one rather than after a second configuration pass.
      // "Name | Location | Cluster" — the cluster is what the group dashboard
      // rolls up by, so it has to survive the parse. Only "|" separates fields:
      // commas and dashes appear inside real property names ("EKHO Lake, Polonnaruwa").
      const properties = (document.getElementById('ob-properties')?.value || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [Name, Location, Cluster] = line.split('|');
          return {
            Name: (Name || '').trim(),
            Location: (Location || '').trim(),
            Cluster: (Cluster || '').trim()
          };
        })
        .filter(p => p.Name);

      await api('POST', '/api/setup', {
        orgName: document.getElementById('ob-org-name').value.trim(),
        currency: document.getElementById('ob-currency').value,
        country: document.getElementById('ob-country').value,
        address: document.getElementById('ob-address').value.trim(),
        phone: document.getElementById('ob-phone').value.trim(),
        fiscalYearStart: document.getElementById('ob-fiscal').value,
        timezone: document.getElementById('ob-timezone').value || Intl.DateTimeFormat().resolvedOptions().timeZone,
        adminName: document.getElementById('ob-admin-name').value.trim(),
        adminApprovalLimit: Number(document.getElementById('ob-approval-limit').value || 0),
        domain: (state.authEmail || '').split('@')[1] || '',
        properties
      });
      toast('Workspace ready.');
      window.location.reload();
    } catch (err) {
      document.getElementById('ob-error').textContent = err.message;
      btn.disabled = false; btn.textContent = 'Create workspace';
    }
  });


  // Blocked screen
  document.getElementById('btn-blocked-refresh').addEventListener('click', () => window.location.reload());
  document.getElementById('btn-blocked-signout').addEventListener('click', signOut);

  // Quick-create (+) menu
  const qnMenu = document.getElementById('quick-new-menu');
  document.getElementById('btn-quick-new').addEventListener('click', e => {
    e.stopPropagation();
    qnMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => qnMenu.classList.remove('open'));
  qnMenu.addEventListener('click', () => qnMenu.classList.remove('open'));

  // Profile menu
  const menu = document.getElementById('profile-menu');
  document.getElementById('btn-avatar').addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!menu.contains(e.target)) menu.classList.remove('open');
  });
  document.getElementById('btn-tour').addEventListener('click', () => {
    menu.classList.remove('open');
    startTour();
  });
  document.getElementById('btn-signout').addEventListener('click', signOut);

  // Mobile sidebar
  // Mobile sidebar with scrim: toggle both, tap scrim or a nav item to close.
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebar-scrim');
  const setSidebar = (open) => {
    sidebar.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
  };
  document.getElementById('btn-hamburger').addEventListener('click', () =>
    setSidebar(!sidebar.classList.contains('open')));
  scrim.addEventListener('click', () => setSidebar(false));
  sidebar.addEventListener('click', e => { if (e.target.closest('.nav-item')) setSidebar(false); });

  window.addEventListener('hashchange', route);
}

function signOut() {
  try {
    window.catalyst.auth.signOut(`${window.location.origin}/app/index.html`);
  } catch {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', boot);
