// services/mission-api/src/operator/dashboard-state.js

import { operatorAuth } from './auth-middleware.js';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';
import { buildReadiness, buildTodayPlan, computeMissionScore, outcomeActions } from '@asc3nd/core/readiness';
import { rankedOpportunities, buildOpportunityChecklist } from '@asc3nd/core/opportunities';
import { readJson } from '@asc3nd/core/bridge.js';
import { defaultTenantProfile } from '@asc3nd/core/tenant.js';

/**
 * GET /api/operator/dashboard-state
 * Returns a compact tenant‑scoped dashboard payload.
 */
export function getDashboardState(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const profile = readJson(`mission-data/tenants/${tenantId}/profile.json`, defaultTenantProfile({ tenantId }));
    const opportunities = rankedOpportunities(profile).map((i) => ({ ...i, checklist: buildOpportunityChecklist(i) }));
    const readiness = buildReadiness(profile);
    const actions = buildTodayPlan({ profile, opportunities, approvals: [], outcomes: [], adapters: [] });
    const score = computeMissionScore({ readiness, approvals: [], outcomes: [], opportunities });
    return operatorSuccess(res, { profile, readiness, score, actions, outcomeActions });
  } catch (e) {
    return operatorError(res, 'DASHBOARD_ERROR', e.message, 500);
  }
}
