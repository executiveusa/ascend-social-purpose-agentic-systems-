import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { emitEvent } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');
const getBackupsDir = () => process.env.BACKUPS_DIR || path.resolve(process.cwd(), 'backups');

function safeTenantSlug(slug) {
  if (!slug || typeof slug !== 'string') throw new Error('tenantId is required');
  if (/[^a-zA-Z0-9_-]/.test(slug)) throw new Error(`Invalid tenantId: ${slug}`);
  return slug;
}

function safeBackupId(id) {
  if (!id || typeof id !== 'string') throw new Error('backupId is required');
  if (/[^a-zA-Z0-9_.-]/.test(id)) throw new Error(`Invalid backupId: ${id}`);
  return id;
}

function resolveBackupDir(tenantId, backupId) {
  const dir = path.resolve(getBackupsDir(), tenantId, backupId);
  const base = path.resolve(getBackupsDir(), tenantId);
  if (!dir.startsWith(base + path.sep) && dir !== base) {
    throw new Error('Path traversal detected in backup directory resolution');
  }
  return dir;
}

function checksumDir(dir) {
  if (!fs.existsSync(dir)) return null;
  const hash = crypto.createHash('sha256');
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        hash.update(path.relative(dir, full));
        hash.update(fs.readFileSync(full));
      }
    }
  }
  walk(dir);
  return hash.digest('hex');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcFull = path.join(src, entry.name);
    const destFull = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(srcFull, destFull);
    } else {
      fs.copyFileSync(srcFull, destFull);
      count++;
    }
  }
  return count;
}

export function createBackup({ tenantId, notes = '', createdBy = 'system' }) {
  const tid = safeTenantSlug(tenantId);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = crypto.randomBytes(3).toString('hex');
  const backupId = `${tid}-${stamp}-${rand}`;
  const backupDir = resolveBackupDir(tid, backupId);
  fs.mkdirSync(backupDir, { recursive: true });

  const dataDir = getDataDir();
  const sources = {
    'mission-data': path.join(dataDir, tid)
  };

  let fileCount = 0;
  for (const [destName, srcPath] of Object.entries(sources)) {
    if (fs.existsSync(srcPath)) {
      fileCount += copyDir(srcPath, path.join(backupDir, destName));
    }
  }

  const checksum = checksumDir(backupDir) || '';

  const manifest = {
    backup_id: backupId,
    tenant_id: tid,
    created_at: new Date().toISOString(),
    created_by: createdBy,
    source_paths: Object.values(sources),
    file_count: fileCount,
    checksum_sha256: checksum,
    restorable: true,
    notes,
    format: 'mission-os-backup-v2'
  };

  fs.writeFileSync(path.join(backupDir, 'backup-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  emitEvent({
    tenantId: tid,
    type: 'BACKUP.CREATED',
    actor: createdBy,
    subject: backupId,
    payload: { backupDir, fileCount, checksum }
  });

  return manifest;
}

export function listBackups({ tenantId }) {
  const tid = safeTenantSlug(tenantId);
  const backupsBase = path.join(getBackupsDir(), tid);
  if (!fs.existsSync(backupsBase)) return [];

  const manifests = [];
  for (const entry of fs.readdirSync(backupsBase, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestFile = path.join(backupsBase, entry.name, 'backup-manifest.json');
    if (fs.existsSync(manifestFile)) {
      try {
        manifests.push(JSON.parse(fs.readFileSync(manifestFile, 'utf8')));
      } catch {
        // skip corrupt manifests
      }
    }
  }
  return manifests.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function getBackup({ tenantId, backupId }) {
  const tid = safeTenantSlug(tenantId);
  const bid = safeBackupId(backupId);
  const backupDir = resolveBackupDir(tid, bid);
  const manifestFile = path.join(backupDir, 'backup-manifest.json');
  if (!fs.existsSync(manifestFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch {
    return null;
  }
}

export function restoreBackup({ tenantId, backupId, createdBy = 'system' }) {
  const tid = safeTenantSlug(tenantId);
  const bid = safeBackupId(backupId);

  const backupDir = resolveBackupDir(tid, bid);
  if (!fs.existsSync(backupDir)) throw new Error(`Backup ${bid} not found for tenant ${tid}`);

  const manifestFile = path.join(backupDir, 'backup-manifest.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`Backup ${bid} has no manifest — cannot restore`);

  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));

  if (!manifest.restorable) throw new Error(`Backup ${bid} is marked as not restorable`);

  if (manifest.tenant_id !== tid) {
    throw new Error(`Backup tenant_id mismatch: expected ${tid}, got ${manifest.tenant_id}`);
  }

  const dataDir = getDataDir();
  const srcMissionData = path.join(backupDir, 'mission-data');
  const destMissionData = path.join(dataDir, tid);

  if (fs.existsSync(srcMissionData)) {
    fs.mkdirSync(destMissionData, { recursive: true });
    copyDir(srcMissionData, destMissionData);
  }

  emitEvent({
    tenantId: tid,
    type: 'BACKUP.RESTORED',
    actor: createdBy,
    subject: bid,
    payload: { backupDir }
  });

  return { ok: true, tenantId: tid, backupId: bid, restoredFrom: backupDir };
}
