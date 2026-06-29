// services/mission-api/src/operator/tenant-context.js

import { readJson } from '../../packages/core/src/bridge.js'; // assuming readJson utility exists
import { assertTenantAccess } from '../../packages/core/src/rbac.js';
import { defaultTenantProfile } from '../../packages/core/src/tenant.js';

/**
 * Load tenant‑scoped resources and enforce access.
 * Returns an object { tenantId, profile, keys, ... }.
 * Throws on unauthorized access.
 */
export function loadTenantContext(req) {
  const operator = req.operator;
  if (!operator) throw new Error('Operator not authenticated');
  const tenantId = operator.tenantId;
  // Verify operator has read access to the tenant
  assertTenantAccess({ operator, tenantId, action: 'read' });
  const profile = readJson(`mission-data/tenants/${tenantId}/profile.json`, defaultTenantProfile({ tenantId }));
  const keys = readJson(`mission-data/tenants/${tenantId}/keys.json`, null);
  return { tenantId, operator, profile, keys };
}
