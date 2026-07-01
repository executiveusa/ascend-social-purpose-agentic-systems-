import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const siteRoot = path.resolve(__dirname, '..');

// ---- Deployments route existence ----
describe('Phase 6 deployments route existence', () => {
  it('ops/deployments page.jsx exists', () => {
    expect(fs.existsSync(path.join(siteRoot, 'app/ops/deployments/page.jsx'))).toBe(true);
  });
  it('api/ops/deployments/route.js exists', () => {
    expect(fs.existsSync(path.join(siteRoot, 'app/api/ops/deployments/route.js'))).toBe(true);
  });
});

// ---- Core module existence checks ----
const coreRoot = path.resolve(siteRoot, '..', '..', 'packages', 'core', 'src');

describe('Phase 6 core modules exist', () => {
  it('deployment-releases.js exists', () => {
    expect(fs.existsSync(path.join(coreRoot, 'deployment-releases.js'))).toBe(true);
  });
  it('deployment-health.js exists', () => {
    expect(fs.existsSync(path.join(coreRoot, 'deployment-health.js'))).toBe(true);
  });
  it('deployment-backup.js exists', () => {
    expect(fs.existsSync(path.join(coreRoot, 'deployment-backup.js'))).toBe(true);
  });
  it('dashboard-state.js has mkdirSync guard for fresh tenant', () => {
    const content = fs.readFileSync(path.join(coreRoot, 'dashboard-state.js'), 'utf8');
    expect(content).toContain('mkdirSync');
  });
});

// ---- DB migration ----
const migrationsRoot = path.resolve(siteRoot, '..', '..', 'db', 'migrations');

describe('Phase 6 DB migration exists', () => {
  it('0006_v06_deployment_lifecycle.sql exists', () => {
    expect(fs.existsSync(path.join(migrationsRoot, '0006_v06_deployment_lifecycle.sql'))).toBe(true);
  });
  it('migration contains deployment_releases table', () => {
    const content = fs.readFileSync(path.join(migrationsRoot, '0006_v06_deployment_lifecycle.sql'), 'utf8');
    expect(content).toContain('deployment_releases');
    expect(content).toContain('deployment_health_checks');
    expect(content).toContain('deployment_smoke_results');
    expect(content).toContain('tenant_backups');
  });
});

// ---- Operator API route files ----
const operatorRoot = path.resolve(siteRoot, '..', '..', 'services', 'mission-api', 'src', 'operator');

describe('Phase 6 operator API files exist', () => {
  it('deployments.js operator route exists', () => {
    expect(fs.existsSync(path.join(operatorRoot, 'deployments.js'))).toBe(true);
  });
  it('backups.js operator route exists', () => {
    expect(fs.existsSync(path.join(operatorRoot, 'backups.js'))).toBe(true);
  });
  it('operator index mounts deployments router', () => {
    const content = fs.readFileSync(path.join(operatorRoot, 'index.js'), 'utf8');
    expect(content).toContain('deploymentsRouter');
    expect(content).toContain('backupsRouter');
  });
});

// ---- missionctl commands ----
const missionctlPath = path.resolve(siteRoot, '..', '..', 'missionctl', 'missionctl.mjs');

describe('Phase 6 missionctl commands present', () => {
  let src;
  beforeEach(() => { src = fs.readFileSync(missionctlPath, 'utf8'); });

  it('has bundleStatus', () => { expect(src).toContain('bundleStatus'); });
  it('has upgradeCommand', () => { expect(src).toContain('upgradeCommand'); });
  it('has rollbackCommand', () => { expect(src).toContain('rollbackCommand'); });
  it('has backupCommand', () => { expect(src).toContain('backupCommand'); });
  it('has restoreCommand', () => { expect(src).toContain('restoreCommand'); });
  it('has bundleReleaseFull', () => { expect(src).toContain('bundleReleaseFull'); });
});

// ---- Deployments route handler data ----
describe('Phase 6 deployments route handler', () => {
  const TEST_DIR = path.join(os.tmpdir(), `mission-test-p6-site-${Date.now()}`);
  const TENANT = 'test-p6-deployments';

  beforeEach(() => {
    process.env.DATA_DIR = TEST_DIR;
    process.env.OPS_TENANT_ID = TENANT;
    const tenantDir = path.join(TEST_DIR, TENANT);
    if (fs.existsSync(tenantDir)) fs.rmSync(tenantDir, { recursive: true, force: true });
    fs.mkdirSync(tenantDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.DATA_DIR;
    delete process.env.OPS_TENANT_ID;
  });

  it('returns ok:true with empty releases for fresh tenant', async () => {
    const { GET } = await import('../app/api/ops/deployments/route.js');
    const res = await GET(new Request('http://local/api/ops/deployments'));
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.releases)).toBe(true);
    expect(data.releases).toHaveLength(0);
    expect(data.active).toBeNull();
    expect(Array.isArray(data.backups)).toBe(true);
  });

  it('returns active release when one exists', async () => {
    const { createDeploymentRelease, activateDeploymentRelease } = await import('@asc3nd/core/deployment-releases');
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '0.6.1' });
    activateDeploymentRelease({ tenantId: TENANT, releaseId: rel.id });

    const { GET } = await import('../app/api/ops/deployments/route.js');
    const res = await GET(new Request('http://local/api/ops/deployments'));
    const data = await res.json();
    expect(data.active).not.toBeNull();
    expect(data.active.version).toBe('0.6.1');
    expect(data.releases).toHaveLength(1);
  });
});
