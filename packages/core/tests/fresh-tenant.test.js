import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateDashboardState } from '../src/dashboard-state.js';

const TEST_DIR = path.join(os.tmpdir(), `mission-test-fresh-${Date.now()}`);
const TENANT = 'test-fresh-tenant';

beforeEach(() => {
  process.env.DATA_DIR = TEST_DIR;
  const tenantDir = path.join(TEST_DIR, TENANT);
  if (fs.existsSync(tenantDir)) fs.rmSync(tenantDir, { recursive: true, force: true });
  // Do NOT pre-create the tenant dir — this tests the fresh-tenant case
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe('fresh-tenant dashboard state (ENOENT hardening)', () => {
  it('generateDashboardState succeeds on a brand-new tenant with zero files', () => {
    expect(() => generateDashboardState(TENANT)).not.toThrow();
  });

  it('returns a valid state object with empty collections', () => {
    const state = generateDashboardState(TENANT);
    expect(state.tenantId).toBe(TENANT);
    expect(state.version).toBe('0.6');
    expect(state.agents).toEqual([]);
    expect(state.approvals).toEqual([]);
    expect(state.recentEvents).toEqual([]);
    expect(state.recentArtifacts).toEqual([]);
    expect(state.summary.pendingApprovals).toBe(0);
    expect(state.summary.activeRuns).toBe(0);
  });

  it('creates dashboard-state.json and the tenant directory', () => {
    generateDashboardState(TENANT);
    const file = path.join(TEST_DIR, TENANT, 'dashboard-state.json');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('written state file is valid JSON', () => {
    generateDashboardState(TENANT);
    const raw = fs.readFileSync(path.join(TEST_DIR, TENANT, 'dashboard-state.json'), 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('healthStatus is ok when there are no agents', () => {
    const state = generateDashboardState(TENANT);
    expect(state.summary.healthStatus).toBe('ok');
  });
});
