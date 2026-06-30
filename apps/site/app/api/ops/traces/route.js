import { getTraceLinks } from '@asc3nd/core/trace-links';
import { getOpsTenantId } from '../../../../lib/ops-tenant';

export async function GET(request) {
  try {
    const tenantId = getOpsTenantId();
    const { searchParams } = new URL(request.url);
    const surface = searchParams.get('surface') || undefined;
    const runId = searchParams.get('runId') || undefined;
    const traces = getTraceLinks({ tenantId, surface, runId });
    return Response.json({ ok: true, traces, tenantId });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
