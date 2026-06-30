import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createTraceLink, getTraceLinks, getTraceLink } from '../src/trace-links.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('trace links', () => {
  const tenantId = 'test-tenant-traces';
  const otherTenantId = 'test-tenant-traces-other';

  beforeEach(() => {
    for (const t of [tenantId, otherTenantId]) {
      const file = path.join(getDataDir(), t, 'trace-links.json');
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it('creates a trace link', () => {
    const trace = createTraceLink({ tenantId, surface: 'mission-os', runId: 'run_1' });
    expect(trace.id).toBeDefined();
    expect(trace.surface).toBe('mission-os');
  });

  it('reads tenant-scoped trace links only', () => {
    createTraceLink({ tenantId, surface: 'mission-os', runId: 'run_1' });
    createTraceLink({ tenantId: otherTenantId, surface: 'mission-os', runId: 'run_2' });
    const traces = getTraceLinks({ tenantId });
    expect(traces.length).toBe(1);
    expect(traces[0].tenantId).toBe(tenantId);
  });

  it('filters by runId', () => {
    createTraceLink({ tenantId, surface: 'mission-os', runId: 'run_1' });
    createTraceLink({ tenantId, surface: 'mission-os', runId: 'run_2' });
    const traces = getTraceLinks({ tenantId, runId: 'run_2' });
    expect(traces.length).toBe(1);
  });

  it('fetches a single trace link by id', () => {
    const trace = createTraceLink({ tenantId, surface: 'mission-os' });
    const found = getTraceLink({ tenantId, id: trace.id });
    expect(found.id).toBe(trace.id);
  });
});
