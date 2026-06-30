import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { recordModelUsage, getModelUsage, summarizeMonthlyUsage, summarizeUsageBySurface } from '../src/model-usage-ledger.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('model usage ledger', () => {
  const tenantId = 'test-tenant-usage';

  beforeEach(() => {
    const file = path.join(getDataDir(), tenantId, 'model-usage-ledger.jsonl');
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });

  it('records usage entries append-only', () => {
    recordModelUsage({ tenantId, surface: 'mission-os', model: 'standard', costUsd: 1.5 });
    recordModelUsage({ tenantId, surface: 'openwebui', model: 'cheap', costUsd: 0.2 });
    const entries = getModelUsage({ tenantId });
    expect(entries.length).toBe(2);
  });

  it('filters by surface', () => {
    recordModelUsage({ tenantId, surface: 'mission-os', model: 'standard', costUsd: 1 });
    recordModelUsage({ tenantId, surface: 'openwebui', model: 'cheap', costUsd: 0.5 });
    const entries = getModelUsage({ tenantId, surface: 'openwebui' });
    expect(entries.length).toBe(1);
    expect(entries[0].surface).toBe('openwebui');
  });

  it('rejects negative cost', () => {
    expect(() => recordModelUsage({ tenantId, surface: 'mission-os', model: 'standard', costUsd: -1 })).toThrow();
  });

  it('summarizes monthly usage totals', () => {
    recordModelUsage({ tenantId, surface: 'mission-os', model: 'standard', costUsd: 2 });
    recordModelUsage({ tenantId, surface: 'mission-os', model: 'standard', costUsd: 3 });
    const summary = summarizeMonthlyUsage({ tenantId });
    expect(summary.totalCostUsd).toBe(5);
    expect(summary.entryCount).toBe(2);
  });

  it('summarizes usage by surface', () => {
    recordModelUsage({ tenantId, surface: 'mission-os', model: 'standard', costUsd: 2 });
    recordModelUsage({ tenantId, surface: 'openwebui', model: 'cheap', costUsd: 1 });
    const summary = summarizeUsageBySurface({ tenantId });
    expect(summary.surfaces.length).toBe(2);
  });
});
