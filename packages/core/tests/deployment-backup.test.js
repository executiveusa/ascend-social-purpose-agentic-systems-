import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createBackup, listBackups, getBackup, restoreBackup } from '../src/deployment-backup.js';

const TEST_DIR = path.join(os.tmpdir(), `mission-test-backup-${Date.now()}`);
const BACKUPS_DIR = path.join(TEST_DIR, 'backups');
const TENANT = 'test-backup';

beforeEach(() => {
  process.env.DATA_DIR = TEST_DIR;
  process.env.BACKUPS_DIR = BACKUPS_DIR;
  const tenantDir = path.join(TEST_DIR, TENANT);
  if (fs.existsSync(tenantDir)) fs.rmSync(tenantDir, { recursive: true, force: true });
  fs.mkdirSync(tenantDir, { recursive: true });
  fs.writeFileSync(path.join(tenantDir, 'profile.json'), JSON.stringify({ tenantId: TENANT, orgName: 'Test' }));
  if (fs.existsSync(BACKUPS_DIR)) fs.rmSync(BACKUPS_DIR, { recursive: true, force: true });
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.DATA_DIR;
  delete process.env.BACKUPS_DIR;
});

describe('createBackup', () => {
  it('creates a backup manifest', () => {
    const manifest = createBackup({ tenantId: TENANT });
    expect(manifest.tenant_id).toBe(TENANT);
    expect(manifest.backup_id).toContain(TENANT);
    expect(manifest.restorable).toBe(true);
    expect(manifest.file_count).toBeGreaterThan(0);
    expect(manifest.checksum_sha256).toBeTruthy();
    expect(manifest.format).toBe('mission-os-backup-v2');
  });

  it('writes backup-manifest.json into backup directory', () => {
    const manifest = createBackup({ tenantId: TENANT });
    const backupDir = path.join(BACKUPS_DIR, TENANT, manifest.backup_id);
    expect(fs.existsSync(path.join(backupDir, 'backup-manifest.json'))).toBe(true);
  });

  it('copies mission-data files into backup', () => {
    const manifest = createBackup({ tenantId: TENANT });
    const backupDir = path.join(BACKUPS_DIR, TENANT, manifest.backup_id);
    expect(fs.existsSync(path.join(backupDir, 'mission-data', 'profile.json'))).toBe(true);
  });

  it('emits BACKUP.CREATED event', () => {
    createBackup({ tenantId: TENANT });
    const eventsFile = path.join(TEST_DIR, TENANT, 'events.jsonl');
    expect(fs.existsSync(eventsFile)).toBe(true);
    const events = fs.readFileSync(eventsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'BACKUP.CREATED')).toBe(true);
  });

  it('accepts notes and createdBy', () => {
    const m = createBackup({ tenantId: TENANT, notes: 'pre-upgrade', createdBy: 'cli' });
    expect(m.notes).toBe('pre-upgrade');
    expect(m.created_by).toBe('cli');
  });

  it('throws for invalid tenantId with path traversal characters', () => {
    expect(() => createBackup({ tenantId: '../etc' })).toThrow();
  });
});

describe('listBackups', () => {
  it('returns empty array when no backups exist', () => {
    expect(listBackups({ tenantId: TENANT })).toEqual([]);
  });

  it('returns all backup manifests', () => {
    createBackup({ tenantId: TENANT });
    createBackup({ tenantId: TENANT });
    const list = listBackups({ tenantId: TENANT });
    expect(list).toHaveLength(2);
  });
});

describe('getBackup', () => {
  it('returns backup manifest by id', () => {
    const m = createBackup({ tenantId: TENANT });
    const found = getBackup({ tenantId: TENANT, backupId: m.backup_id });
    expect(found).not.toBeNull();
    expect(found.backup_id).toBe(m.backup_id);
  });

  it('returns null for unknown backupId', () => {
    expect(getBackup({ tenantId: TENANT, backupId: 'unknown-backup-id' })).toBeNull();
  });

  it('throws for path traversal in backupId', () => {
    expect(() => getBackup({ tenantId: TENANT, backupId: '../../../etc/passwd' })).toThrow();
  });
});

describe('restoreBackup', () => {
  it('restores files from backup', () => {
    const m = createBackup({ tenantId: TENANT });
    // Remove the original file to simulate restore
    const origFile = path.join(TEST_DIR, TENANT, 'profile.json');
    fs.unlinkSync(origFile);
    expect(fs.existsSync(origFile)).toBe(false);

    restoreBackup({ tenantId: TENANT, backupId: m.backup_id });
    expect(fs.existsSync(origFile)).toBe(true);
  });

  it('emits BACKUP.RESTORED event', () => {
    const m = createBackup({ tenantId: TENANT });
    restoreBackup({ tenantId: TENANT, backupId: m.backup_id });
    const events = fs.readFileSync(path.join(TEST_DIR, TENANT, 'events.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'BACKUP.RESTORED')).toBe(true);
  });

  it('throws for non-existent backup', () => {
    expect(() => restoreBackup({ tenantId: TENANT, backupId: 'nope-backup-id' })).toThrow('not found');
  });

  it('throws for path traversal in backupId', () => {
    expect(() => restoreBackup({ tenantId: TENANT, backupId: '../../../etc/passwd' })).toThrow();
  });

  it('throws for tenant_id mismatch', () => {
    const m = createBackup({ tenantId: TENANT });
    const backupDir = path.join(BACKUPS_DIR, TENANT, m.backup_id);
    const manifestFile = path.join(backupDir, 'backup-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.tenant_id = 'other-tenant';
    fs.writeFileSync(manifestFile, JSON.stringify(manifest), 'utf8');
    expect(() => restoreBackup({ tenantId: TENANT, backupId: m.backup_id })).toThrow('mismatch');
  });

  it('backup for a fresh tenant (zero files) succeeds', () => {
    const freshTenant = 'test-backup-fresh';
    const freshDir = path.join(TEST_DIR, freshTenant);
    fs.mkdirSync(freshDir, { recursive: true });
    const m = createBackup({ tenantId: freshTenant });
    expect(m.restorable).toBe(true);
  });
});
