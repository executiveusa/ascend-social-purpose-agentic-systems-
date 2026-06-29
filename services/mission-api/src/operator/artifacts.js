import { getArtifacts } from '@asc3nd/core/artifacts';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

export function listArtifacts(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { kind } = req.query;
    const artifacts = getArtifacts({ tenantId, kind: kind || undefined });
    return operatorSuccess(res, { artifacts, tenantId });
  } catch (e) {
    return operatorError(res, 'ARTIFACTS_ERROR', e.message, 500);
  }
}

export function getArtifact(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { id } = req.params;
    const artifacts = getArtifacts({ tenantId });
    const artifact = artifacts.find(a => a.id === id);
    if (!artifact) return operatorError(res, 'NOT_FOUND', `Artifact ${id} not found`, 404);
    return operatorSuccess(res, { artifact });
  } catch (e) {
    return operatorError(res, 'ARTIFACT_ERROR', e.message, 500);
  }
}
