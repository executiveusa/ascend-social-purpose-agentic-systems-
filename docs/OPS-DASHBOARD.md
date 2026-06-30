# Ops Dashboard — Mission OS v0.6 (Phase 5)

The Phase 5 ops dashboard is an internal Mission OS operator UI built on top of the Phase 3 Operator API state and Phase 4 model-gateway/observability state. It is UI-only: no new core logic, no live Hermes execution, no live LiteLLM/Langfuse/Open WebUI calls.

## Route map

| Route | Purpose |
|---|---|
| `/ops` | Existing "Today" outcomes cockpit (pre-Phase-5, session-JWT driven), with the Phase 5 Mission OS operator overview rendered additively below it. |
| `/ops/agents` | Agent Room — list of managed agents, health status. |
| `/ops/agents/[id]` | Agent detail — config, health, related events. |
| `/ops/artifacts` | Artifact table — kind, approval class, created date. |
| `/ops/events` | Event journal table. |
| `/ops/budgets` | Model spend, monthly budget, per-surface usage, LiteLLM budget status. |
| `/ops/health` | Overall operator health, derived from managed-agent heartbeats. |
| `/ops/deployments` | Placeholder. No release/rollback/backup commands are implemented in Phase 5. |
| `/ops/openwebui` | Placeholder workspace launcher. No live Open WebUI call. |

### Why `/ops` was extended instead of replaced

`/ops` already exists as the "Today" outcomes cockpit, driven by the legacy session-JWT API (`/api/today`). Rather than replace it (which would break an existing, working surface outside this phase's scope), the Phase 5 Mission OS operator overview (`components/MissionOsOverview.jsx`) is rendered as an additional section below the existing cockpit content. This satisfies the spec's required `/ops` widget list (pending approvals, active runs, recent artifacts, model spend, health status, agent room, recent events, next actions, integration placeholders) without touching the pre-existing Today cockpit.

## Data source strategy

The Operator API (`/api/operator/*` on `services/mission-api`) is authenticated with a separate operator API key (`ok_<tenantId>_<hex>`, validated by `operatorAuth()`). The browser session used by the rest of `apps/site` is authenticated with a completely different scheme — a session JWT (`mission_token`) issued by `/api/auth/login`. These two auth schemes do not share credentials, so a logged-in browser session cannot call the Operator API directly without exposing an operator key to client JS, which Phase 5's guardrails explicitly forbid ("Do not store operator keys in client code").

Instead, Phase 5 adds same-origin Next.js Route Handlers under `apps/site/app/api/ops/*` that import `@asc3nd/core/*` modules directly, server-side, and read the same file-backed `mission-data/<tenantId>/*` state that the Operator API reads (both `apps/site` and `services/mission-api` share the same `DATA_DIR`). The browser only ever calls these same-origin `/api/ops/*` JSON endpoints via `apps/site/lib/opsApi.js`. No operator key, tenant secret, or `validateOperatorKey` call ever reaches client code.

| New route handler | Core module |
|---|---|
| `GET /api/ops/dashboard-state` | `generateDashboardState` |
| `GET /api/ops/events` | `readEvents` |
| `GET /api/ops/artifacts` | `getArtifacts` |
| `GET /api/ops/managed-agents` | `getManagedAgents` |
| `GET /api/ops/managed-agents/[id]` | `getManagedAgents` + `readEvents` |
| `GET /api/ops/budgets` | `getModelBudget`, `evaluateBudgetStatus`, `summarizeMonthlyUsage`, `summarizeUsageBySurface` |
| `GET /api/ops/model-usage-summary` | `summarizeMonthlyUsage`, `summarizeUsageBySurface` |
| `GET /api/ops/traces` | `getTraceLinks` |

### Known limitation: tenant resolution

No per-session tenant mapping exists yet in the browser UI for the ops dashboard. `apps/site/lib/ops-tenant.js` resolves a single tenant via `process.env.OPS_TENANT_ID || 'demo-pnw'`, matching the default tenant slug used elsewhere in `missionctl`. Multi-tenant operator login for this dashboard is out of scope for Phase 5.

## Security

- No operator API key, `OPERATOR_KEY` env var, or `validateOperatorKey` reference appears in any client-side (`'use client'`) file or in `apps/site/lib/opsApi.js`. Enforced by `apps/site/tests/ops-no-operator-keys-in-client.test.js` and by `missionctl bundle smoke`'s "no operator key literal in ops client code" check.
- All `/api/ops/*` route handlers run server-side only (standard Next.js Route Handler convention — never bundled into client JS).

## What is live, dry-run, or placeholder

- **Live (reads real local file-backed state)**: agent room, artifacts, events, budgets, model usage, traces, health — all sourced from the same `mission-data/<tenantId>/*` files `missionctl` writes to.
- **Placeholder, no live call**: `/ops/deployments` (no release/rollback/backup wiring in Phase 5), `/ops/openwebui` (no live Open WebUI call), Langfuse trace links shown are locally registered trace-link records, not a live Langfuse API call.
- **Not implemented**: live Hermes execution, live LiteLLM/Langfuse/Open WebUI API calls, release/rollback/backup commands.

## Tests

- `apps/site/tests/ops-routes-exist.test.js` — every required ops page and `/api/ops/*` route handler exists; public homepage/login routes untouched.
- `apps/site/tests/ops-api-data.test.js` — exercises each `/api/ops/*` Route Handler directly (dashboard-state, agent list/detail incl. 404, artifacts incl. empty state, events, budgets, traces) against seeded and empty test tenants.
- `apps/site/tests/ops-no-operator-keys-in-client.test.js` — static scan of every client-side file for operator-key literals/env vars/validator references.

## Smoke checks

`missionctl bundle smoke <tenant> --dry-run` was extended with 9 Phase 5 checks: existence of all 8 new ops page routes, plus the "no operator key literal in ops client code" static scan.
