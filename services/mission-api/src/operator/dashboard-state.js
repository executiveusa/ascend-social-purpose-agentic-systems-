import { generateDashboardState } from '@asc3nd/core/dashboard-state';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

export function getDashboardState(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const state = generateDashboardState(tenantId);
    return operatorSuccess(res, { state });
  } catch (e) {
    return operatorError(res, 'DASHBOARD_ERROR', e.message, 500);
  }
}
