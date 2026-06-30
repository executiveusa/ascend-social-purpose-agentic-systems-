import { getModelUsage, summarizeMonthlyUsage, summarizeUsageBySurface } from '@asc3nd/core/model-usage-ledger';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

export function listModelUsage(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { surface } = req.query;
    const entries = getModelUsage({ tenantId, surface: surface || undefined });
    return operatorSuccess(res, { entries, tenantId });
  } catch (e) {
    return operatorError(res, 'MODEL_USAGE_ERROR', e.message, 500);
  }
}

export function getModelUsageSummary(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { month } = req.query;
    const monthly = summarizeMonthlyUsage({ tenantId, month: month || undefined });
    const bySurface = summarizeUsageBySurface({ tenantId, month: month || undefined });
    return operatorSuccess(res, { monthly, bySurface: bySurface.surfaces, tenantId });
  } catch (e) {
    return operatorError(res, 'MODEL_USAGE_SUMMARY_ERROR', e.message, 500);
  }
}
