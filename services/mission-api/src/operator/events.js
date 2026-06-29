import { readEvents } from '@asc3nd/core/events';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

export function getOperatorEvents(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { type, limit } = req.query;
    const events = readEvents({ tenantId, type: type || undefined, limit: limit ? Number(limit) : 50 });
    return operatorSuccess(res, { events, tenantId });
  } catch (e) {
    return operatorError(res, 'EVENTS_ERROR', e.message, 500);
  }
}
