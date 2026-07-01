import { NextResponse } from 'next/server';
import { getOpsTenantId } from '../../../../lib/ops-tenant.js';
import { listDeploymentReleases, getActiveDeploymentRelease } from '@asc3nd/core/deployment-releases';
import { summarizeHealth, listSmokeResults } from '@asc3nd/core/deployment-health';
import { listBackups } from '@asc3nd/core/deployment-backup';

export async function GET() {
  const tenantId = getOpsTenantId();
  const releases = listDeploymentReleases({ tenantId, limit: 20 });
  const active = getActiveDeploymentRelease({ tenantId });
  const health = summarizeHealth({ tenantId });
  const recentSmoke = listSmokeResults({ tenantId, limit: 3 });
  const backups = listBackups({ tenantId });
  return NextResponse.json({ ok: true, tenantId, releases, active, health, recentSmoke, backups });
}
