import { getManagedAgents } from '@asc3nd/core/managed-agents';
import { getOpsTenantId } from '../../../../lib/ops-tenant';

export async function GET() {
  try {
    const tenantId = getOpsTenantId();
    const agents = getManagedAgents(tenantId);
    return Response.json({ ok: true, agents, tenantId });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
