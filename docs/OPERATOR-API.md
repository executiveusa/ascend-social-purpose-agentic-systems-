# Operator API — Mission OS v0.6

The Operator API provides machine-to-machine access to tenant-scoped Mission OS state. All routes are under `/api/operator` and require a valid operator key.

## Auth Flow

1. Create an operator key with `missionctl operator-key create <tenant> --label <label>`
2. Pass the raw key in the `Authorization: Bearer <key>` header.
3. The middleware extracts the tenant from the key prefix (`ok_<tenantId>_<hex>`).
4. The key is validated via hash lookup in the operator-keys store.
5. An audit event (`OPERATOR.API.REQUEST`) is emitted on each valid request.

**No raw keys are logged. No raw secrets are emitted in responses.**

## Tenant Context Flow

- All operator routes derive `tenantId` from the validated operator key.
- There are no route-level tenant parameters that could allow cross-tenant reads.
- Every handler calls `loadTenantContext(req)`, which resolves data only for `req.operator.tenantId`.

## RBAC Per Route

Each route requires a specific permission. The operator key's primary scope maps to an RBAC role.

| Route | Method | Required Permission |
|-------|--------|-------------------|
| `/api/operator/dashboard-state` | GET | `tenant.read` |
| `/api/operator/events` | GET | `events.read` |
| `/api/operator/artifacts` | GET | `artifacts.read` |
| `/api/operator/artifacts/:id` | GET | `artifacts.read` |
| `/api/operator/managed-agents` | GET | `agents.read` |
| `/api/operator/managed-agents/:id` | GET | `agents.read` |
| `/api/operator/managed-agents/:id/provision` | POST | `agents.manage` |
| `/api/operator/managed-agents/:id/pause` | POST | `agents.manage` |
| `/api/operator/managed-agents/:id/resume` | POST | `agents.manage` |
| `/api/operator/managed-agents/:id/health` | GET | `agents.read` |
| `/api/operator/runs` | POST | `runs.create` |
| `/api/operator/runs` | GET | `runs.read` |
| `/api/operator/runs/:id` | GET | `runs.read` |
| `/api/operator/approvals/:id/approve` | POST | `approvals.review` + class check |
| `/api/operator/approvals/:id/reject` | POST | `approvals.review` |
| `/api/operator/budgets` | GET | `budgets.read` |
| `/api/operator/model-usage` | GET | `budgets.read` |
| `/api/operator/model-usage/summary` | GET | `budgets.read` |
| `/api/operator/traces` | GET | `events.read` |
| `/api/operator/traces/:id` | GET | `events.read` |

Orange approvals additionally require `approvals.approve.orange`.
Red approvals additionally require `approvals.approve.red` (owner only).

### Phase 4 additions (Model Gateway, Observability, Usage Ledger)

All five new routes are read-only and tenant-scoped via the same `loadTenantContext` flow as every other route — no new cross-tenant surface is introduced. See `docs/MODEL-GATEWAY.md`, `docs/MODEL-USAGE-LEDGER.md`, and `docs/OBSERVABILITY-AND-TRACES.md` for the underlying data model.

#### GET /api/operator/budgets

Returns the tenant's configured monthly budget, month-to-date spend, and warning/hard-block status.

```json
{
  "ok": true,
  "budget": { "tenantId": "demo-pnw", "monthlyBudgetUsd": 50, "warningThresholdPct": 0.8, "hardBlockThresholdPct": 1 },
  "monthly": { "month": "2026-06", "totalCostUsd": 12.4, "entryCount": 38 },
  "status": { "status": "ok", "ratio": 0.248 },
  "tenantId": "demo-pnw"
}
```

#### GET /api/operator/model-usage?surface=comms

Returns raw model usage ledger entries (append-only), optionally filtered by surface. Entries never contain raw prompts or completions — only token counts, cost, model id, and a `traceId` link.

#### GET /api/operator/model-usage/summary?month=2026-06

Returns a monthly summary plus a per-surface breakdown.

#### GET /api/operator/traces and GET /api/operator/traces/:id

Returns Langfuse trace links (`traceId` → `langfuseTraceUrl` + tenant/surface/run metadata), not the trace content itself. Optionally filtered by `surface` or `runId`.

## Request / Response Examples

### GET /api/operator/dashboard-state

```
Authorization: Bearer ok_demo-pnw_<hex>
```

Response:
```json
{
  "ok": true,
  "state": {
    "version": "0.6",
    "tenantId": "demo-pnw",
    "summary": { "pendingApprovals": 2, "activeRuns": 0, "recentArtifacts": 5, "healthStatus": "ok" },
    "agents": [...],
    "approvals": [...],
    "recentEvents": [...],
    "nextActions": [{ "type": "REVIEW_APPROVALS", "count": 2 }]
  }
}
```

### POST /api/operator/runs

```json
{ "prompt": "summarize current program outcomes", "agentSlug": "hermes-programs" }
```

Response (dry-run):
```json
{
  "ok": true,
  "run": {
    "id": "run_abc123",
    "risk": "green",
    "status": "queued",
    "mode": "dry-run",
    "message": "Hermes dispatch contract validated; live execution disabled."
  }
}
```

Orange/red runs return 403:
```json
{
  "ok": false,
  "error": { "code": "APPROVAL_REQUIRED", "message": "Run blocked: risk level orange requires human approval." }
}
```

### POST /api/operator/approvals/:id/approve

```json
{ "note": "Reviewed and approved by program director." }
```

### POST /api/operator/managed-agents/:id/pause

```json
{}
```

## Error Shape

All errors follow:

```json
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

Common codes: `MISSING_KEY`, `FORBIDDEN`, `NOT_FOUND`, `APPROVAL_REQUIRED`, `POLICY_BLOCKED`.

## Known Limitations

- Operator API is in dry-run mode for Phase 3/4. No live Hermes execution, no live LiteLLM/Langfuse/Open WebUI calls.
- Orange/red runs are blocked at the API level. Approval workflow is separate.
- Runs, budgets, usage ledger, and trace links storage all use tenant-local JSON/JSONL files (`packages/core/src/*.js` + `mission-data/<tenantId>/*.json[l]`). A Postgres migration (`db/migrations/0005_v06_model_gateway_observability.sql`) exists for schema parity but is not wired up yet.
- No pagination on list endpoints. Phase 5 will add cursor-based pagination.
- Budget/usage/trace routes are read-only in Phase 4. Write paths (`recordModelUsage`, `setModelBudget`, `createTraceLink`) exist as core functions only and are intended to be called by the (future, real) model gateway integration, not directly by operators.
