import { summarizeMonthlyUsage, summarizeUsageBySurface } from '@asc3nd/core/model-usage-ledger';
import { getOpsTenantId } from '../../../../lib/ops-tenant';

export async function GET(request) {
  try {
    const tenantId = getOpsTenantId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;
    const monthly = summarizeMonthlyUsage({ tenantId, month });
    const bySurface = summarizeUsageBySurface({ tenantId, month });
    return Response.json({ ok: true, monthly, bySurface: bySurface.surfaces, tenantId });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
