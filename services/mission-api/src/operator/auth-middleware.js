import { validateOperatorKey } from '@asc3nd/core/auth';
import { emitEvent } from '@asc3nd/core/events';
import { can } from '@asc3nd/core/rbac';
import { operatorError } from './response.js';

function extractTenantId(key) {
  if (!key || !key.startsWith('ok_')) return null;
  const parts = key.split('_');
  return parts.length >= 3 ? parts[1] : null;
}

export function operatorAuth() {
  return (req, res, next) => {
    try {
      const header = req.headers['authorization'] || '';
      const match = /^Bearer\s+(.+)$/i.exec(header);
      if (!match) {
        return operatorError(res, 'MISSING_KEY', 'Authorization header with Bearer key required', 401);
      }
      const rawKey = match[1];
      const tenantId = req.headers['x-tenant-id'] || extractTenantId(rawKey);
      if (!tenantId) {
        return operatorError(res, 'INVALID_KEY', 'Cannot determine tenant from operator key', 401);
      }
      const opKey = validateOperatorKey({ key: rawKey, tenantId });
      req.operator = { ...opKey, tenantId };
      emitEvent({
        tenantId,
        type: 'OPERATOR.API.REQUEST',
        actor: opKey.id,
        subject: opKey.id,
        payload: { label: opKey.label, path: req.path, method: req.method }
      });
      next();
    } catch {
      return operatorError(res, 'FORBIDDEN', 'Invalid or missing operator key', 401);
    }
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const op = req.operator;
    if (!op) return operatorError(res, 'UNAUTHORIZED', 'Operator not authenticated', 401);
    const primaryRole = op.scopes?.[0] || 'operator';
    if (!can({ role: primaryRole, tenantId: op.tenantId }, permission)) {
      return operatorError(res, 'FORBIDDEN', `Permission denied: ${permission}`, 403);
    }
    next();
  };
}
