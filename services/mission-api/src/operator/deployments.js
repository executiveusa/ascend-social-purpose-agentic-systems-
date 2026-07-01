import { Router } from 'express';
import { operatorAuth, requirePermission } from './auth-middleware.js';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';
import {
  listDeploymentReleases,
  getDeploymentRelease,
  getActiveDeploymentRelease
} from '@asc3nd/core/deployment-releases';
import { summarizeHealth, listSmokeResults } from '@asc3nd/core/deployment-health';

const router = Router();

// GET /api/operator/deployments
router.get('/', operatorAuth(), requirePermission('agents.read'), async (req, res) => {
  try {
    const ctx = await loadTenantContext(req);
    const releases = listDeploymentReleases({ tenantId: ctx.tenantId, limit: 20 });
    const active = getActiveDeploymentRelease({ tenantId: ctx.tenantId });
    return operatorSuccess(res, { releases, active });
  } catch (err) {
    return operatorError(res, 'DEPLOYMENTS_ERROR', err.message, 500);
  }
});

// GET /api/operator/deployments/health
router.get('/health', operatorAuth(), requirePermission('agents.read'), async (req, res) => {
  try {
    const ctx = await loadTenantContext(req);
    const summary = summarizeHealth({ tenantId: ctx.tenantId });
    const smoke = listSmokeResults({ tenantId: ctx.tenantId, limit: 5 });
    return operatorSuccess(res, { health: summary, recentSmoke: smoke });
  } catch (err) {
    return operatorError(res, 'HEALTH_ERROR', err.message, 500);
  }
});

// GET /api/operator/deployments/:id
router.get('/:id', operatorAuth(), requirePermission('agents.read'), async (req, res) => {
  try {
    const ctx = await loadTenantContext(req);
    const release = getDeploymentRelease({ tenantId: ctx.tenantId, releaseId: req.params.id });
    if (!release) return operatorError(res, 'NOT_FOUND', `Release ${req.params.id} not found`, 404);
    return operatorSuccess(res, { release });
  } catch (err) {
    return operatorError(res, 'DEPLOYMENT_ERROR', err.message, 500);
  }
});

export default router;
