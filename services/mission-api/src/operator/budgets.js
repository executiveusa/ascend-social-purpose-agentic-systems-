import { getModelBudget } from '@asc3nd/core/model-budgets';
import { evaluateBudgetStatus } from '@asc3nd/core/model-budgets';
import { summarizeMonthlyUsage } from '@asc3nd/core/model-usage-ledger';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

export function getBudget(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const budget = getModelBudget(tenantId);
    const summary = summarizeMonthlyUsage({ tenantId });
    const status = evaluateBudgetStatus({ tenantId, monthToDateSpendUsd: summary.totalCostUsd });
    return operatorSuccess(res, { budget, monthToDateSpendUsd: summary.totalCostUsd, status: status.status, tenantId });
  } catch (e) {
    return operatorError(res, 'BUDGET_ERROR', e.message, 500);
  }
}
