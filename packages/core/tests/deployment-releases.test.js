import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createDeploymentRelease,
  listDeploymentReleases,
  getDeploymentRelease,
  activateDeploymentRelease,
  markDeploymentReleaseFailed,
  rollbackDeploymentRelease,
  getActiveDeploymentRelease
} from '../src/deployment-releases.js';

const TEST_DIR = path.join(os.tmpdir(), `mission-test-deplrel-${Date.now()}`);
const TENANT = 'test-deplrel';

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

describe('createDeploymentRelease', () => {
  it('creates a release with draft status', () => {
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '0.6.1' });
    expect(rel.status).toBe('draft');
    expect(rel.version).toBe('0.6.1');
    expect(rel.id).toMatch(/^rel_/);
    expect(rel.tenant_id).toBe(TENANT);
    expect(rel.created_at).toBeTruthy();
    expect(rel.activated_at).toBeNull();
  });

  it('persists release to disk', () => {
    createDeploymentRelease({ tenantId: TENANT, version: '0.6.1' });
    const file = path.join(TEST_DIR, TENANT, 'deployment-releases.json');
    expect(fs.existsSync(file)).toBe(true);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(data).toHaveLength(1);
  });

  it('accepts optional fields', () => {
    const rel = createDeploymentRelease({
      tenantId: TENANT,
      version: '0.6.2',
      bundlePath: '/handoff/test/managed',
      manifestPath: '/handoff/test/managed/release-manifest.json',
      createdBy: 'operator',
      notes: 'initial release',
      previousReleaseId: 'rel_abc'
    });
    expect(rel.bundle_path).toBe('/handoff/test/managed');
    expect(rel.previous_release_id).toBe('rel_abc');
    expect(rel.notes).toBe('initial release');
  });

  it('throws without tenantId', () => {
    expect(() => createDeploymentRelease({ version: '1.0' })).toThrow('tenantId is required');
  });

  it('throws without version', () => {
    expect(() => createDeploymentRelease({ tenantId: TENANT })).toThrow('version is required');
  });

  it('emits DEPLOYMENT.RELEASE.CREATED event', () => {
    createDeploymentRelease({ tenantId: TENANT, version: '0.6.1' });
    const eventsFile = path.join(TEST_DIR, TENANT, 'events.jsonl');
    expect(fs.existsSync(eventsFile)).toBe(true);
    const lines = fs.readFileSync(eventsFile, 'utf8').split('\n').filter(Boolean);
    const events = lines.map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'DEPLOYMENT.RELEASE.CREATED')).toBe(true);
  });
});

describe('listDeploymentReleases', () => {
  it('returns empty array for new tenant', () => {
    expect(listDeploymentReleases({ tenantId: TENANT })).toEqual([]);
  });

  it('returns all releases', () => {
    createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    createDeploymentRelease({ tenantId: TENANT, version: '1.1' });
    expect(listDeploymentReleases({ tenantId: TENANT })).toHaveLength(2);
  });

  it('respects limit', () => {
    for (let i = 0; i < 5; i++) createDeploymentRelease({ tenantId: TENANT, version: `1.${i}` });
    expect(listDeploymentReleases({ tenantId: TENANT, limit: 3 })).toHaveLength(3);
  });
});

describe('getDeploymentRelease', () => {
  it('returns release by id', () => {
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    const found = getDeploymentRelease({ tenantId: TENANT, releaseId: rel.id });
    expect(found).not.toBeNull();
    expect(found.id).toBe(rel.id);
  });

  it('returns null for unknown id', () => {
    expect(getDeploymentRelease({ tenantId: TENANT, releaseId: 'rel_unknown' })).toBeNull();
  });
});

describe('activateDeploymentRelease', () => {
  it('activates a release', () => {
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    const activated = activateDeploymentRelease({ tenantId: TENANT, releaseId: rel.id });
    expect(activated.status).toBe('active');
    expect(activated.activated_at).toBeTruthy();
  });

  it('archives previously active release when new one is activated', () => {
    const r1 = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    activateDeploymentRelease({ tenantId: TENANT, releaseId: r1.id });
    const r2 = createDeploymentRelease({ tenantId: TENANT, version: '1.1' });
    activateDeploymentRelease({ tenantId: TENANT, releaseId: r2.id });
    const prev = getDeploymentRelease({ tenantId: TENANT, releaseId: r1.id });
    expect(prev.status).toBe('archived');
  });

  it('emits DEPLOYMENT.RELEASE.ACTIVATED event', () => {
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    activateDeploymentRelease({ tenantId: TENANT, releaseId: rel.id, actor: 'cli' });
    const events = fs.readFileSync(path.join(TEST_DIR, TENANT, 'events.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'DEPLOYMENT.RELEASE.ACTIVATED')).toBe(true);
  });

  it('throws for unknown release', () => {
    expect(() => activateDeploymentRelease({ tenantId: TENANT, releaseId: 'rel_nope' })).toThrow('not found');
  });
});

describe('markDeploymentReleaseFailed', () => {
  it('marks release as failed', () => {
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    const failed = markDeploymentReleaseFailed({ tenantId: TENANT, releaseId: rel.id, reason: 'smoke failed' });
    expect(failed.status).toBe('failed');
  });

  it('emits DEPLOYMENT.RELEASE.FAILED event', () => {
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    markDeploymentReleaseFailed({ tenantId: TENANT, releaseId: rel.id });
    const events = fs.readFileSync(path.join(TEST_DIR, TENANT, 'events.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'DEPLOYMENT.RELEASE.FAILED')).toBe(true);
  });
});

describe('rollbackDeploymentRelease', () => {
  it('rolls back to target release', () => {
    const r1 = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    activateDeploymentRelease({ tenantId: TENANT, releaseId: r1.id });
    const r2 = createDeploymentRelease({ tenantId: TENANT, version: '1.1', previousReleaseId: r1.id });
    activateDeploymentRelease({ tenantId: TENANT, releaseId: r2.id });

    const result = rollbackDeploymentRelease({ tenantId: TENANT, releaseId: r2.id, targetReleaseId: r1.id });
    expect(result.current.status).toBe('rolled_back');
    expect(result.current.rolled_back_at).toBeTruthy();
    expect(result.restored.status).toBe('active');
    expect(result.restored.id).toBe(r1.id);
  });

  it('emits DEPLOYMENT.RELEASE.ROLLED_BACK event', () => {
    const r1 = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    const r2 = createDeploymentRelease({ tenantId: TENANT, version: '1.1' });
    rollbackDeploymentRelease({ tenantId: TENANT, releaseId: r2.id, targetReleaseId: r1.id });
    const events = fs.readFileSync(path.join(TEST_DIR, TENANT, 'events.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'DEPLOYMENT.RELEASE.ROLLED_BACK')).toBe(true);
  });
});

describe('getActiveDeploymentRelease', () => {
  it('returns null when no active release', () => {
    expect(getActiveDeploymentRelease({ tenantId: TENANT })).toBeNull();
  });

  it('returns the active release', () => {
    const rel = createDeploymentRelease({ tenantId: TENANT, version: '1.0' });
    activateDeploymentRelease({ tenantId: TENANT, releaseId: rel.id });
    const active = getActiveDeploymentRelease({ tenantId: TENANT });
    expect(active).not.toBeNull();
    expect(active.id).toBe(rel.id);
    expect(active.status).toBe('active');
  });
});
