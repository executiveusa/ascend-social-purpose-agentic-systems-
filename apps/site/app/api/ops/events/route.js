import { readEvents } from '@asc3nd/core/events';
import { getOpsTenantId } from '../../../../lib/ops-tenant';

export async function GET(request) {
  try {
    const tenantId = getOpsTenantId();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const events = readEvents({ tenantId, type, limit });
    return Response.json({ ok: true, events, tenantId });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
