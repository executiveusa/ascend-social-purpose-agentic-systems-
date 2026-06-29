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

Orange approvals additionally require `approvals.approve.orange`.
Red approvals additionally require `approvals.approve.red` (owner only).

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

- Operator API is in dry-run mode for Phase 3. No live Hermes execution.
- Orange/red runs are blocked at the API level. Approval workflow is separate.
- Runs storage uses tenant-local JSON (`operator-runs.json`). Phase 4 will migrate to the DB layer.
- No pagination on list endpoints. Phase 5 will add cursor-based pagination.
