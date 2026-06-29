// services/mission-api/src/operator/auth-middleware.js

import { validateOperatorKey } from '../../packages/core/src/auth.js';
import { emitEvent } from '../../packages/core/src/events.js';
import { operatorError } from './response.js';

/**
 * Express middleware to validate an operator key.
 * Expects header "Authorization: Bearer <key>".
 * Attaches req.operator = { id, tenantId, scopes, ... } on success.
 */
export function operatorAuth(requiredScope) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) throw new Error('Missing Authorization header');
      const rawKey = match[1];
      const tenantId = req.headers['x-tenant-id']; // optional explicit header
      const opKey = validateOperatorKey({ key: rawKey, tenantId, requiredScope });
      req.operator = opKey;
      // Emit audit event (non‑sensitive)
      emitEvent({
        tenantId: opKey.tenantId,
        type: 'OPERATOR.KEY.VALIDATED',
        actor: opKey.id,
        subject: opKey.id,
        payload: { label: opKey.label, scopes: opKey.scopes }
      });
      next();
    } catch (e) {
      // Consistent error shape, no raw key leakage
      operatorError(res, 'FORBIDDEN', e.message);
    }
  };
}
