// Phase 5: the ops dashboard does not yet map a logged-in operator session to
// an operator-key tenant. Until that wiring exists, the ops API routes read a
// single configurable tenant, matching the missionctl CLI's own default.
// See docs/OPS-DASHBOARD.md "Data source strategy" for the full rationale.
export function getOpsTenantId() {
  return process.env.OPS_TENANT_ID || 'demo-pnw';
}
