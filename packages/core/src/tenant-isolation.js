import path from 'node:path';

export function assertTenantScope({ actorTenantId, targetTenantId }) {
  if (!actorTenantId) throw new Error('Actor tenant ID is required');
  if (!targetTenantId) throw new Error('Target tenant ID is required');
  if (actorTenantId !== targetTenantId) {
    throw new Error(`Tenant boundary violation: actor tenant '${actorTenantId}' cannot access target tenant '${targetTenantId}'`);
  }
  return true;
}

export function filterTenantRecords({ tenantId, records }) {
  if (!tenantId) throw new Error('Tenant ID is required');
  if (!Array.isArray(records)) return [];
  return records.filter(r => r && r.tenantId === tenantId);
}

export function assertNoTraversal(filePath) {
  if (!filePath) throw new Error('Path is required');
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  if (normalized.includes('..') || normalized.startsWith('/') || path.isAbsolute(normalized)) {
    throw new Error('Directory traversal or absolute path violation is prohibited');
  }
}

export function safeTenantPath({ tenantId, relativePath, baseDataDir }) {
  if (!tenantId) throw new Error('Tenant ID is required');
  if (!relativePath) throw new Error('Relative path is required');

  const normalizedRel = path.normalize(relativePath).replace(/\\/g, '/');
  if (normalizedRel.includes('..') || normalizedRel.startsWith('/') || path.isAbsolute(normalizedRel)) {
    throw new Error('Directory traversal or absolute path violation is prohibited in tenant path');
  }

  const base = baseDataDir || process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');
  const tenantDir = path.join(base, tenantId);
  const fullPath = path.join(tenantDir, normalizedRel);

  const resolvedFullPath = path.resolve(fullPath);
  const resolvedTenantDir = path.resolve(tenantDir);
  if (!resolvedFullPath.startsWith(resolvedTenantDir)) {
    throw new Error('Path resolution escaped tenant boundary');
  }

  return fullPath;
}
