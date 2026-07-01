import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

function healthFile(tenantId) {
  return path.join(getDataDir(), tenantId, 'deployment-health.json');
}

function smokeFile(tenantId) {
  return path.join(getDataDir(), tenantId, 'smoke-history.json');
}

function loadJson(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function saveJson(file, data) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function recordHealthCheck({ tenantId, releaseId, checkName, status, details = '' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!checkName) throw new Error('checkName is required');
  if (!['ok', 'warn', 'fail'].includes(status)) throw new Error('status must be ok, warn, or fail');

  const record = {
    id: `hc_${crypto.randomBytes(10).toString('hex')}`,
    tenant_id: tenantId,
    release_id: releaseId || null,
    check_name: checkName,
    status,
    details,
    created_at: new Date().toISOString()
  };

  const file = healthFile(tenantId);
  const records = loadJson(file);
  records.push(record);
  saveJson(file, records);

  return record;
}

export function listHealthChecks({ tenantId, releaseId, limit } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  let records = loadJson(healthFile(tenantId));
  if (releaseId) records = records.filter(r => r.release_id === releaseId);
  if (limit) records = records.slice(-limit);
  return records;
}

export function summarizeHealth({ tenantId, releaseId }) {
  if (!tenantId) throw new Error('tenantId is required');
  const records = listHealthChecks({ tenantId, releaseId });
  const counts = { ok: 0, warn: 0, fail: 0 };
  for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;
  const overallStatus = counts.fail > 0 ? 'fail' : counts.warn > 0 ? 'warn' : records.length > 0 ? 'ok' : 'unknown';
  return { tenantId, releaseId: releaseId || null, total: records.length, counts, overallStatus };
}

export function recordSmokeResult({ tenantId, releaseId, status, checks }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!['passed', 'failed'].includes(status)) throw new Error('status must be passed or failed');

  const record = {
    id: `smk_${crypto.randomBytes(10).toString('hex')}`,
    tenant_id: tenantId,
    release_id: releaseId || null,
    status,
    checks: Array.isArray(checks) ? checks : [],
    total: Array.isArray(checks) ? checks.length : 0,
    passed: Array.isArray(checks) ? checks.filter(c => c.status === 'ok').length : 0,
    failed: Array.isArray(checks) ? checks.filter(c => c.status !== 'ok').length : 0,
    created_at: new Date().toISOString()
  };

  const file = smokeFile(tenantId);
  const records = loadJson(file);
  records.push(record);
  saveJson(file, records);

  return record;
}

export function listSmokeResults({ tenantId, releaseId, limit } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  let records = loadJson(smokeFile(tenantId));
  if (releaseId) records = records.filter(r => r.release_id === releaseId);
  if (limit) records = records.slice(-limit);
  return records;
}
