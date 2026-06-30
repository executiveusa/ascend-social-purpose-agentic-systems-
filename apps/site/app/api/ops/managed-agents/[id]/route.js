import { getManagedAgents } from '@asc3nd/core/managed-agents';
import { readEvents } from '@asc3nd/core/events';
import { getOpsTenantId } from '../../../../../lib/ops-tenant';

export async function GET(_request, { params }) {
  try {
    const tenantId = getOpsTenantId();
    const { id } = await params;
    const agents = getManagedAgents(tenantId);
    const agent = agents.find((a) => a.id === id || a.agentSlug === id);
    if (!agent) return Response.json({ ok: false, error: { message: `Agent ${id} not found` } }, { status: 404 });
    const events = readEvents({ tenantId, limit: 200 }).filter((e) => e.subject === agent.agentSlug || e.subject === agent.id).slice(0, 20);
    return Response.json({ ok: true, agent, events });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
