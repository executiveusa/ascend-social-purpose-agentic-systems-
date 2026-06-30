# Model Usage Ledger — Mission OS v0.6 (Phase 4)

An append-only, tenant-scoped record of model usage (tokens + cost), used to power budget status and per-surface reporting. It does not store raw prompts or completions.

## Module

`packages/core/src/model-usage-ledger.js`

- `recordModelUsage({ tenantId, surface, agentSlug, model, promptTokens, completionTokens, costUsd, traceId, approvalClass, actor })`
  - Appends one JSON line to `mission-data/<tenantId>/model-usage-ledger.jsonl`.
  - Rejects negative `costUsd`.
  - Emits `MODEL.USAGE.RECORDED`.
  - Stores only token counts, cost, model id, surface, agent slug, and a `traceId` (link to `trace-links.js`) — never the prompt or completion text.
- `getModelUsage({ tenantId, surface, limit })` — tenant-scoped read, optional surface filter.
- `summarizeMonthlyUsage({ tenantId, month })` — total cost/tokens for a calendar month (defaults to current month).
- `summarizeUsageBySurface({ tenantId, month })` — same, broken out per surface.

## Data Shape

```json
{
  "tenantId": "demo-pnw",
  "surface": "comms",
  "agentSlug": "hermes-comms",
  "model": "anthropic/claude-sonnet-4.5",
  "promptTokens": 412,
  "completionTokens": 188,
  "costUsd": 0.0091,
  "traceId": "trace_abc123",
  "approvalClass": "green",
  "actor": "hermes",
  "recordedAt": "2026-06-30T11:00:00.000Z"
}
```

## Guardrails

- No raw prompt or completion text is ever written to the ledger.
- Reads are always scoped by `tenantId`; there is no cross-tenant query path.
- The ledger is append-only — no update/delete API is exposed, matching the existing event journal pattern (`packages/core/src/events.js`).

## CLI / API

```
missionctl model usage summary <slug> [--month 2026-06]
GET /api/operator/model-usage
GET /api/operator/model-usage/summary
```

## Next Phase

A live model gateway integration would call `recordModelUsage` on every completed request. Phase 4 ships the ledger and its summaries only; nothing calls `recordModelUsage` automatically yet.
