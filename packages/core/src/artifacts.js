import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { emitEvent } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

export function registerArtifact({
  tenantId,
  runId,
  approvalId,
  kind,
  title,
  mimeType = 'application/json',
  storageBackend = 'file',
  storagePath,
  checksumSha256,
  approvalClass = 'green',
  approvalStatus = 'approved',
  sourceRefs = [],
  traceId = null,
  modelRoute = null,
  createdBy = 'system'
}) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!storagePath) throw new Error('storagePath is required');

  const resolvedPath = path.normalize(storagePath).replace(/\\/g, '/');
  if (resolvedPath.includes('..')) {
    throw new Error('Directory traversal is prohibited');
  }

  const artifact = {
    id: `art_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    runId: runId || null,
    approvalId: approvalId || null,
    kind,
    title,
    mimeType,
    storageBackend,
    storagePath: resolvedPath,
    checksumSha256: checksumSha256 || crypto.createHash('sha256').update(resolvedPath).digest('hex'),
    approvalClass,
    approvalStatus,
    sourceRefs,
    traceId,
    modelRoute,
    createdBy,
    createdAt: new Date().toISOString()
  };

  const dataDir = getDataDir();
  const tenantDir = path.join(dataDir, tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  const artifactsFile = path.join(tenantDir, 'artifacts.json');
  let artifacts = [];
  if (fs.existsSync(artifactsFile)) {
    try {
      artifacts = JSON.parse(fs.readFileSync(artifactsFile, 'utf8'));
    } catch {
      artifacts = [];
    }
  }

  artifacts.push(artifact);
  fs.writeFileSync(artifactsFile, JSON.stringify(artifacts, null, 2), 'utf8');

  emitEvent({
    tenantId,
    type: 'ARTIFACT.CREATED',
    actor: createdBy,
    subject: artifact.id,
    payload: { kind, title, storagePath: resolvedPath }
  });

  return artifact;
}

export function getArtifacts({ tenantId, kind } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  const dataDir = getDataDir();
  const artifactsFile = path.join(dataDir, tenantId, 'artifacts.json');
  if (!fs.existsSync(artifactsFile)) return [];

  try {
    let artifacts = JSON.parse(fs.readFileSync(artifactsFile, 'utf8'));
    if (kind) {
      artifacts = artifacts.filter(a => a.kind === kind);
    }
    return artifacts;
  } catch {
    return [];
  }
}
