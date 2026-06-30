// Browser-side helper for the ops dashboard. Calls same-origin Next.js route
// handlers under /api/ops/*, which hold all tenant/data-source logic
// server-side. No operator key or tenant secret ever reaches this file.
export async function opsApi(path) {
  const res = await fetch(`/api/ops${path}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw new Error(body.error?.message || `Ops API error ${res.status}`);
  return body;
}
