import { getArtifacts } from '@asc3nd/core/artifacts';
import { getOpsTenantId } from '../../../../lib/ops-tenant';

export async function GET(request) {
  try {
    const tenantId = getOpsTenantId();
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') || undefined;
    const artifacts = getArtifacts({ tenantId, kind });
    return Response.json({ ok: true, artifacts, tenantId });
  } catch (e) {
    return Response.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
