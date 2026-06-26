const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('mission_token') || '';
}
export function setToken(token) {
  if (typeof window !== 'undefined') localStorage.setItem('mission_token', token);
}
export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('mission_token');
}
export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API error ${res.status}`);
  return body;
}
export async function login(email, password) {
  const body = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(body.token);
  return body;
}
