// services/mission-api/src/operator/events.js

import { operatorAuth } from './auth-middleware.js';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';
import { readEvents } from '../../packages/core/src/events.js';

/**
 * GET /api/operator/events
 * Returns recent events for the tenant. Supports optional `type` query param.
 */
export function getOperatorEvents(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { type, limit } = req.query;
    const events = readEvents({ tenantId, type, limit: limit ? Number(limit) : undefined });
    return operatorSuccess(res, { events });
  } catch (e) {
    return operatorError(res, 'EVENTS_ERROR', e.message, 500);
  }
}

export const router = {
  method: 'get',
  path: '/api/operator/events',
  handlers: [operatorAuth(), getOperatorEvents]
};
