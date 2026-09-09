// ProcureFlow API client — connects to Catalyst backend
const CATALYST_BASE = '/server/procurement_api/api/v1';

let token: string | null = null;

export function setToken(t: string | null) { token = t; }
export function getToken(): string | null { return token; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${CATALYST_BASE}${path}`, { ...options, headers });
  if (res.status === 401) throw new Error('Session expired — please sign in again.');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message || (body as any).error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function healthCheck() {
  try {
    const h = await request('/health');
    return h;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email: string, password: string, orgName: string) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, orgName }),
  });
}

export async function getMe() {
  return request('/auth/me');
}

export async function getOrders() { return request('/orders'); }
export async function getApprovals() { return request('/approvals'); }
export async function getItems() { return request('/items'); }
export async function getVendors() { return request('/vendors'); }
export async function getProperties() { return request('/properties'); }
