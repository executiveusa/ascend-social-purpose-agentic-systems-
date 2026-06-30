import { generateDashboardState } from '@asc3nd/core/dashboard-state';
import { getOpsTenantId } from '../../../../lib/ops-tenant';

export async function GET() {
  try {
    const tenantId = getOpsTenantId();
    const state = generateDashboardState(tenantId);
    return Response.json({ ok: true, state });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
