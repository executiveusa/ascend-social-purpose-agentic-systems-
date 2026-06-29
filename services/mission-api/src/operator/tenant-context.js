import { createRepositories } from '@asc3nd/db';
import { defaultTenantProfile } from '@asc3nd/core/tenant';

export function loadTenantContext(req) {
  const op = req.operator;
  if (!op) throw new Error('Operator not authenticated');
  const tenantId = op.tenantId;
  const repos = createRepositories();
  const profile = repos.tenant.readProfile(tenantId) || defaultTenantProfile({ tenantId });
  const keys = repos.tenant.readKeys(tenantId);
  return { tenantId, operator: op, profile, keys, repos };
}
