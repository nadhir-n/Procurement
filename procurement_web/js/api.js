// Same-origin API client. The Catalyst session cookie authenticates every call.
// There is no workspace header: this installation serves exactly one hotel
// group and the server resolves it from the single Organizations row.
const API_BASE = '/server/procurement_api';

export const state = {
  currentUser: null,   // Users row for the signed-in person
  authEmail: null,     // authenticated Catalyst email
  authName: null,
  org: null,           // Organizations row
  orgSettings: {},
  cache: {
    items: [], suppliers: [], users: [], roles: [], properties: []
  }
};

// The function gateway only recognizes the user when the request carries a
// Catalyst auth token — the session cookie alone is not forwarded as a user
// credential. Cache the token and attach it to every call.
let authToken = null;

// The Catalyst SDK's generateAuthToken() can return a promise that NEVER
// settles — verified against both the project domain and the custom domain,
// where it failed to resolve or reject within 8 seconds. Awaiting it unbounded
// means api() never returns, and a caller like boot() sits on its spinner
// forever with nothing to report: the worst kind of failure, because it looks
// identical to a slow network and gives the user nothing to act on.
//
// Racing it against a timer converts that hang into an ordinary "no token"
// result, which the 401 path below already knows how to handle by returning
// the person to the embedded sign-in screen.
const TOKEN_TIMEOUT_MS = 8000;
// Generous: covers a slow report or a large list, while still guaranteeing that
// every call ends in either a result or an error the user can read.
const REQUEST_TIMEOUT_MS = 30000;
let tokenHung = false;   // remembers a timeout so we don't pay it on every call

async function getAuthToken(force = false) {
  if (authToken && !force) return authToken;
  // Once the SDK has proven unresponsive, stop blocking each subsequent call
  // on it; fail fast to the 401 path instead. A forced refresh still retries,
  // so a genuinely expired token can recover.
  if (tokenHung && !force) return null;
  try {
    const res = await Promise.race([
      window.catalyst.auth.generateAuthToken(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('token-timeout')), TOKEN_TIMEOUT_MS))
    ]);
    authToken = res?.access_token || res?.content?.access_token || null;
    tokenHung = false;
  } catch (err) {
    if (err && err.message === 'token-timeout') tokenHung = true;
    authToken = null;
  }
  return authToken;
}

export async function api(method, path, body = null, _retried = false) {
  // No X-Org-ID: one installation, one workspace. The server resolves it.
  const headers = { 'Content-Type': 'application/json' };
  const token = await getAuthToken();
  if (token) headers['Authorization'] = token;

  const options = { method, headers, credentials: 'include' };
  if (body) options.body = JSON.stringify(body);

  // Every request is bounded. A fetch with no timeout can hang indefinitely
  // behind a gateway, and the caller has no way to distinguish that from a
  // request still in flight — so it waits forever and shows nothing.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, signal: ctrl.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('The server did not respond in time. Please try again.');
    }
    throw new Error('Network request failed. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    // Token may have expired — mint a fresh one and retry once.
    if (!_retried) {
      await getAuthToken(true);
      return api(method, path, body, true);
    }
    // Keep the person inside the branded embedded sign-in flow. Redirecting to
    // the hosted page bypasses the invitation-only experience and looks like a
    // different product.
    window.dispatchEvent(new CustomEvent('procureflow:auth-required'));
    throw new Error('Your session could not be verified. Please sign in again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

// Multipart upload (attachments). Content-Type is set by the browser.
export async function apiUpload(path, formData) {
  const headers = {};
  const token = await getAuthToken();
  if (token) headers['Authorization'] = token;

  // Bounded like api(), but far more generously: this carries file bytes on
  // what may be a slow uplink, and killing a legitimate upload is worse than
  // waiting. Five files at 10 MB is the enforced ceiling.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, credentials: 'include', body: formData, signal: ctrl.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('The upload timed out. Try a smaller file or a better connection.');
    }
    throw new Error('Upload failed — the network request did not complete.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
  }
  return res.json();
}

// Fetch a protected file and hand it to the browser as a download.
export async function apiDownload(path, fileName) {
  const headers = {};
  const token = await getAuthToken();
  if (token) headers['Authorization'] = token;

  const res = await fetch(`${API_BASE}${path}`, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName || 'attachment';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function currency(amount) {
  const cur = state.orgSettings.currency || 'USD';
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Refresh the shared lookup caches used by forms (items, suppliers, users, roles).
export async function refreshCaches() {
  const multiProperty = !!state.orgSettings.multiProperty;
  const [items, suppliers, users, roles, properties] = await Promise.all([
    api('GET', '/api/items').catch(() => []),
    api('GET', '/api/suppliers').catch(() => []),
    api('GET', '/api/users').catch(() => []),
    api('GET', '/api/roles').catch(() => []),
    multiProperty ? api('GET', '/api/properties').catch(() => []) : Promise.resolve([])
  ]);
  state.cache.items = items;
  state.cache.suppliers = suppliers;
  state.cache.users = users;
  state.cache.roles = roles;
  state.cache.properties = properties;
}

// Procurement reference data: the department → category → sub-category matrix,
// the expenditure and budget classes, UOMs, tax treatments and the approval
// routes. It is fixed for the deployment, so it is fetched once and kept.
export async function loadReference() {
  if (state.reference) return state.reference;
  state.reference = await api('GET', '/api/reference').catch(() => ({}));
  return state.reference;
}

/** Sub-categories under a primary category, from the loaded matrix. */
export function subCategoriesFor(categoryName) {
  const cat = (state.reference?.categories || []).find(c => c.name === categoryName);
  return cat ? (cat.sub || []) : [];
}

/** Categories belonging to a department, from the loaded matrix. */
export function categoriesForDepartment(department) {
  return (state.reference?.categories || []).filter(c => c.department === department);
}
