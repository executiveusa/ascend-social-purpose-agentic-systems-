import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  recordHealthCheck,
  listHealthChecks,
  summarizeHealth,
  recordSmokeResult,
  listSmokeResults
} from '../src/deployment-health.js';

const TEST_DIR = path.join(os.tmpdir(), `mission-test-deplhlth-${Date.now()}`);
const TENANT = 'test-deplhlth';

beforeEach(() => {
  process.env.DATA_DIR = TEST_DIR;
  const tenantDir = path.join(TEST_DIR, TENANT);
  if (fs.existsSync(tenantDir)) fs.rmSync(tenantDir, { recursive: true, force: true });
  fs.mkdirSync(tenantDir, { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe('recordHealthCheck', () => {
  it('records an ok health check', () => {
    const hc = recordHealthCheck({ tenantId: TENANT, checkName: 'api-health', status: 'ok' });
    expect(hc.id).toMatch(/^hc_/);
    expect(hc.status).toBe('ok');
    expect(hc.check_name).toBe('api-health');
    expect(hc.tenant_id).toBe(TENANT);
  });

  it('records with releaseId', () => {
    const hc = recordHealthCheck({ tenantId: TENANT, releaseId: 'rel_abc', checkName: 'db', status: 'ok' });
    expect(hc.release_id).toBe('rel_abc');
  });

  it('accepts warn and fail statuses', () => {
    const w = recordHealthCheck({ tenantId: TENANT, checkName: 'disk', status: 'warn', details: '80%' });
    expect(w.status).toBe('warn');
    const f = recordHealthCheck({ tenantId: TENANT, checkName: 'redis', status: 'fail', details: 'timeout' });
    expect(f.status).toBe('fail');
    expect(f.details).toBe('timeout');
  });

  it('throws for invalid status', () => {
    expect(() => recordHealthCheck({ tenantId: TENANT, checkName: 'x', status: 'unknown' })).toThrow();
  });

  it('persists to deployment-health.json', () => {
    recordHealthCheck({ tenantId: TENANT, checkName: 'api', status: 'ok' });
    const file = path.join(TEST_DIR, TENANT, 'deployment-health.json');
    expect(fs.existsSync(file)).toBe(true);
  });
});

describe('listHealthChecks', () => {
  it('returns empty for new tenant', () => {
    expect(listHealthChecks({ tenantId: TENANT })).toEqual([]);
  });

  it('filters by releaseId', () => {
    recordHealthCheck({ tenantId: TENANT, releaseId: 'rel_1', checkName: 'a', status: 'ok' });
    recordHealthCheck({ tenantId: TENANT, releaseId: 'rel_2', checkName: 'b', status: 'ok' });
    expect(listHealthChecks({ tenantId: TENANT, releaseId: 'rel_1' })).toHaveLength(1);
  });

  it('respects limit', () => {
    for (let i = 0; i < 5; i++) recordHealthCheck({ tenantId: TENANT, checkName: `c${i}`, status: 'ok' });
    expect(listHealthChecks({ tenantId: TENANT, limit: 2 })).toHaveLength(2);
  });
});

describe('summarizeHealth', () => {
  it('returns unknown when no checks', () => {
    const s = summarizeHealth({ tenantId: TENANT });
    expect(s.overallStatus).toBe('unknown');
    expect(s.total).toBe(0);
  });

  it('returns ok when all checks pass', () => {
    recordHealthCheck({ tenantId: TENANT, checkName: 'a', status: 'ok' });
    recordHealthCheck({ tenantId: TENANT, checkName: 'b', status: 'ok' });
    expect(summarizeHealth({ tenantId: TENANT }).overallStatus).toBe('ok');
  });

  it('returns warn when any warn (no fail)', () => {
    recordHealthCheck({ tenantId: TENANT, checkName: 'a', status: 'ok' });
    recordHealthCheck({ tenantId: TENANT, checkName: 'b', status: 'warn' });
    expect(summarizeHealth({ tenantId: TENANT }).overallStatus).toBe('warn');
  });

  it('returns fail when any fail', () => {
    recordHealthCheck({ tenantId: TENANT, checkName: 'a', status: 'ok' });
    recordHealthCheck({ tenantId: TENANT, checkName: 'b', status: 'fail' });
    expect(summarizeHealth({ tenantId: TENANT }).overallStatus).toBe('fail');
  });
});

describe('recordSmokeResult', () => {
  it('records a passed smoke result', () => {
    const checks = [{ name: 'managed compose', status: 'ok' }, { name: 'Hermes not public', status: 'ok' }];
    const r = recordSmokeResult({ tenantId: TENANT, status: 'passed', checks });
    expect(r.id).toMatch(/^smk_/);
    expect(r.status).toBe('passed');
    expect(r.total).toBe(2);
    expect(r.passed).toBe(2);
    expect(r.failed).toBe(0);
  });

  it('records a failed smoke result', () => {
    const checks = [{ name: 'managed compose', status: 'ok' }, { name: 'db migration', status: 'missing' }];
    const r = recordSmokeResult({ tenantId: TENANT, releaseId: 'rel_x', status: 'failed', checks });
    expect(r.status).toBe('failed');
    expect(r.failed).toBe(1);
    expect(r.release_id).toBe('rel_x');
  });

  it('persists to smoke-history.json', () => {
    recordSmokeResult({ tenantId: TENANT, status: 'passed', checks: [] });
    expect(fs.existsSync(path.join(TEST_DIR, TENANT, 'smoke-history.json'))).toBe(true);
  });

  it('throws for invalid status', () => {
    expect(() => recordSmokeResult({ tenantId: TENANT, status: 'partial', checks: [] })).toThrow();
  });
});

describe('listSmokeResults', () => {
  it('returns empty for new tenant', () => {
    expect(listSmokeResults({ tenantId: TENANT })).toEqual([]);
  });

  it('filters by releaseId', () => {
    recordSmokeResult({ tenantId: TENANT, releaseId: 'rel_1', status: 'passed', checks: [] });
    recordSmokeResult({ tenantId: TENANT, releaseId: 'rel_2', status: 'failed', checks: [] });
    expect(listSmokeResults({ tenantId: TENANT, releaseId: 'rel_1' })).toHaveLength(1);
  });

  it('respects limit', () => {
    for (let i = 0; i < 4; i++) recordSmokeResult({ tenantId: TENANT, status: 'passed', checks: [] });
    expect(listSmokeResults({ tenantId: TENANT, limit: 2 })).toHaveLength(2);
  });
});
