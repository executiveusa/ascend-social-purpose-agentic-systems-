import { getModelBudget, evaluateBudgetStatus } from '@asc3nd/core/model-budgets';
import { summarizeMonthlyUsage, summarizeUsageBySurface } from '@asc3nd/core/model-usage-ledger';
import { getOpsTenantId } from '../../../../lib/ops-tenant';

export async function GET() {
  try {
    const tenantId = getOpsTenantId();
    const budget = getModelBudget(tenantId);
    const monthly = summarizeMonthlyUsage({ tenantId });
    const bySurface = summarizeUsageBySurface({ tenantId });
    const status = evaluateBudgetStatus({ tenantId, monthToDateSpendUsd: monthly.totalCostUsd });
    return Response.json({ ok: true, budget, monthly, bySurface: bySurface.surfaces, status: status.status, tenantId });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
