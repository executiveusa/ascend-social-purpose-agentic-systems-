import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { emitEvent } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

const VALID_STATUSES = ['draft', 'ready', 'active', 'failed', 'rolled_back', 'archived'];

function releasesFile(tenantId) {
  return path.join(getDataDir(), tenantId, 'deployment-releases.json');
}

function loadReleases(tenantId) {
  const file = releasesFile(tenantId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveReleases(tenantId, releases) {
  const dir = path.join(getDataDir(), tenantId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(releasesFile(tenantId), JSON.stringify(releases, null, 2), 'utf8');
}

export function createDeploymentRelease({
  tenantId,
  version,
  bundlePath,
  manifestPath,
  previousReleaseId = null,
  createdBy = 'system',
  notes = ''
}) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!version) throw new Error('version is required');

  const release = {
    id: `rel_${crypto.randomBytes(12).toString('hex')}`,
    tenant_id: tenantId,
    release_id: `${tenantId}-${version}-${Date.now()}`,
    version,
    bundle_path: bundlePath || null,
    manifest_path: manifestPath || null,
    status: 'draft',
    previous_release_id: previousReleaseId,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    activated_at: null,
    rolled_back_at: null,
    smoke_status: null,
    health_status: null,
    notes
  };

  const releases = loadReleases(tenantId);
  releases.push(release);
  saveReleases(tenantId, releases);

  emitEvent({
    tenantId,
    type: 'DEPLOYMENT.RELEASE.CREATED',
    actor: createdBy,
    subject: release.id,
    payload: { version, releaseId: release.id }
  });

  return release;
}

export function listDeploymentReleases({ tenantId, limit } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  let releases = loadReleases(tenantId);
  if (limit) releases = releases.slice(-limit);
  return releases;
}

export function getDeploymentRelease({ tenantId, releaseId }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!releaseId) throw new Error('releaseId is required');
  const releases = loadReleases(tenantId);
  return releases.find(r => r.id === releaseId) || null;
}

export function activateDeploymentRelease({ tenantId, releaseId, actor = 'system' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!releaseId) throw new Error('releaseId is required');

  const releases = loadReleases(tenantId);
  const idx = releases.findIndex(r => r.id === releaseId);
  if (idx < 0) throw new Error(`Release ${releaseId} not found`);

  // Deactivate any currently active release
  for (const r of releases) {
    if (r.status === 'active') r.status = 'archived';
  }

  releases[idx].status = 'active';
  releases[idx].activated_at = new Date().toISOString();
  saveReleases(tenantId, releases);

  emitEvent({
    tenantId,
    type: 'DEPLOYMENT.RELEASE.ACTIVATED',
    actor,
    subject: releaseId,
    payload: { version: releases[idx].version }
  });

  return releases[idx];
}

export function markDeploymentReleaseFailed({ tenantId, releaseId, actor = 'system', reason = '' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!releaseId) throw new Error('releaseId is required');

  const releases = loadReleases(tenantId);
  const idx = releases.findIndex(r => r.id === releaseId);
  if (idx < 0) throw new Error(`Release ${releaseId} not found`);

  releases[idx].status = 'failed';
  releases[idx].notes = reason || releases[idx].notes;
  saveReleases(tenantId, releases);

  emitEvent({
    tenantId,
    type: 'DEPLOYMENT.RELEASE.FAILED',
    actor,
    subject: releaseId,
    payload: { reason }
  });

  return releases[idx];
}

export function rollbackDeploymentRelease({ tenantId, releaseId, targetReleaseId, actor = 'system' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!releaseId) throw new Error('releaseId is required');
  if (!targetReleaseId) throw new Error('targetReleaseId is required');

  const releases = loadReleases(tenantId);
  const currentIdx = releases.findIndex(r => r.id === releaseId);
  if (currentIdx < 0) throw new Error(`Release ${releaseId} not found`);
  const targetIdx = releases.findIndex(r => r.id === targetReleaseId);
  if (targetIdx < 0) throw new Error(`Target release ${targetReleaseId} not found`);

  releases[currentIdx].status = 'rolled_back';
  releases[currentIdx].rolled_back_at = new Date().toISOString();

  // Deactivate any other active releases
  for (const r of releases) {
    if (r.status === 'active') r.status = 'archived';
  }

  releases[targetIdx].status = 'active';
  releases[targetIdx].activated_at = new Date().toISOString();
  saveReleases(tenantId, releases);

  emitEvent({
    tenantId,
    type: 'DEPLOYMENT.RELEASE.ROLLED_BACK',
    actor,
    subject: releaseId,
    payload: { targetReleaseId }
  });

  return { current: releases[currentIdx], restored: releases[targetIdx] };
}

export function getActiveDeploymentRelease({ tenantId }) {
  if (!tenantId) throw new Error('tenantId is required');
  const releases = loadReleases(tenantId);
  return releases.find(r => r.status === 'active') || null;
}
