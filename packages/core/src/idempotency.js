import crypto from 'node:crypto';

export function normalizeIdempotencyKey(value = '') {
  return String(value || '').trim().slice(0, 160);
}

export function fingerprintSubmission({ tenantId, kind, payload }) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ tenantId, kind, payload: stablePayload(payload) }))
    .digest('hex');
}

export function checkIdempotency({ records = [], key, fingerprint, ttlMs = 1000 * 60 * 60 * 24 }) {
  const cleanKey = normalizeIdempotencyKey(key);
  if (!cleanKey) return { ok: true, duplicate: false, records };
  const now = Date.now();
  const fresh = records.filter((record) => !record.createdAtMs || now - record.createdAtMs < ttlMs);
  const existing = fresh.find((record) => record.key === cleanKey);
  if (!existing) return { ok: true, duplicate: false, records: fresh };
  if (existing.fingerprint !== fingerprint) {
    return { ok: false, duplicate: true, conflict: true, status: 409, response: { error: 'Idempotency key was already used for a different request.' }, records: fresh };
  }
  return { ok: true, duplicate: true, replay: true, status: existing.status || 200, response: existing.response, records: fresh };
}

export function recordIdempotency({ records = [], key, fingerprint, status, response }) {
  const cleanKey = normalizeIdempotencyKey(key);
  if (!cleanKey) return records;
  return [{ key: cleanKey, fingerprint, status, response, createdAt: new Date().toISOString(), createdAtMs: Date.now() }, ...records].slice(0, 2000);
}

function stablePayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  return Object.keys(payload).sort().reduce((acc, key) => {
    acc[key] = payload[key];
    return acc;
  }, {});
}
