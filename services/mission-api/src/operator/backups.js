import { Router } from 'express';
import { operatorAuth, requirePermission } from './auth-middleware.js';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';
import { listBackups, getBackup } from '@asc3nd/core/deployment-backup';

const router = Router();

// GET /api/operator/backups
router.get('/', operatorAuth(), requirePermission('agents.read'), async (req, res) => {
  try {
    const ctx = await loadTenantContext(req);
    const backups = listBackups({ tenantId: ctx.tenantId });
    return operatorSuccess(res, { backups });
  } catch (err) {
    return operatorError(res, 'BACKUPS_ERROR', err.message, 500);
  }
});

// GET /api/operator/backups/:id
router.get('/:id', operatorAuth(), requirePermission('agents.read'), async (req, res) => {
  try {
    const ctx = await loadTenantContext(req);
    const backup = getBackup({ tenantId: ctx.tenantId, backupId: req.params.id });
    if (!backup) return operatorError(res, 'NOT_FOUND', `Backup ${req.params.id} not found`, 404);
    return operatorSuccess(res, { backup });
  } catch (err) {
    return operatorError(res, 'BACKUP_ERROR', err.message, 500);
  }
});

export default router;
