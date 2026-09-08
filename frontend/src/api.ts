// Same-origin Catalyst API client — mirrors procurement_web/js/api.js.
// Served from the same proxy origin, so no CORS. Public endpoints (health)
// need no token; authed calls attach the Catalyst token when the SDK exists.
const API_BASE = "/server/procurement_api";
const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_TIMEOUT_MS = 8000;

let authToken: string | null = null;
let tokenHung = false;

async function getAuthToken(force = false): Promise<string | null> {
  if (authToken && !force) return authToken;
  if (tokenHung && !force) return null;
  try {
    const generate = (window as unknown as { catalyst?: { auth?: { generateAuthToken?: () => Promise<unknown> } } }).catalyst?.auth?.generateAuthToken;
    if (!generate) return null;
    const res = (await Promise.race([
      generate(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("token-timeout")), TOKEN_TIMEOUT_MS)),
    ])) as { access_token?: string; content?: { access_token?: string } };
    authToken = res?.access_token || res?.content?.access_token || null;
    tokenHung = false;
  } catch (err) {
    if (err instanceof Error && err.message === "token-timeout") tokenHung = true;
    authToken = null;
  }
  return authToken;
}

export async function api<T = unknown>(method: string, path: string, body: unknown = null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getAuthToken();
  if (token) headers["Authorization"] = token;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("Backend did not respond in time.");
    throw new Error("Network request failed.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) throw new Error("Sign-in required.");
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Request failed (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface Health {
  ok: boolean;
  service?: string;
  version?: string;
  time?: string;
}

export function getHealth(): Promise<Health> {
  return api<Health>("GET", "/api/health");
}
