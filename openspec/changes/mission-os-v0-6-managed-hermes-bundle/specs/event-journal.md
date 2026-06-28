# Spec: Event Journal

## Purpose

Extend the existing `audit_events` table into a typed event journal with correlation, causation, model routing, cost tracking, and redaction status.

## Schema changes

```sql
ALTER TABLE audit_events ADD COLUMN event_type text;
ALTER TABLE audit_events ADD COLUMN correlation_id text;
ALTER TABLE audit_events ADD COLUMN causation_id text REFERENCES audit_events(id);
ALTER TABLE audit_events ADD COLUMN model_route text;
ALTER TABLE audit_events ADD COLUMN cost_estimate_cents numeric DEFAULT 0;
ALTER TABLE audit_events ADD COLUMN redaction_status text DEFAULT 'none'
  CHECK (redaction_status IN ('none','partial','full'));
ALTER TABLE audit_events ADD COLUMN trace_id text;

CREATE INDEX idx_audit_events_type ON audit_events (event_type);
CREATE INDEX idx_audit_events_correlation ON audit_events (correlation_id);
CREATE INDEX idx_audit_events_trace ON audit_events (trace_id);
```

## Event types

| Type | When | Example |
|---|---|---|
| `agent.run` | Agent execution starts/ends | Hermes agent runs grant-scout |
| `approval.created` | Approval record created | Draft submitted for review |
| `approval.decided` | Human approves/rejects | Director approves campaign |
| `approval.executing` | Outbox picks up approved action | Postiz schedule starts |
| `approval.completed` | Execution finishes | Campaign published |
| `approval.failed` | Execution fails | API call returns error |
| `artifact.created` | New artifact in registry | ICM stage output written |
| `model.call` | Model gateway routes a call | LiteLLM routes to gpt-4.1-mini |
| `external.action` | External system contacted | Twilio call, Composio tool |
| `system.health` | Health check result | Hermes health check |
| `bundle.applied` | Managed bundle deployed | missionctl bundle apply |
| `tenant.created` | Tenant provisioned | missionctl tenant create |

## Correlation and causation

- **correlation_id**: Links events that are part of the same workflow (e.g., one grant scout run).
- **causation_id**: Links an event to the specific event that triggered it (e.g., approval.executing is caused by approval.decided).

## Cost estimation

```js
// packages/core/src/events.js
const MODEL_COSTS = {
  'local/qwen2.5:7b': 0, // free local
  'openai/gpt-4.1-mini': 0.15, // per 1M tokens
  'anthropic/claude-sonnet-4.5': 3.00 // per 1M tokens
};

function estimateCost(modelRoute, inputTokens, outputTokens) {
  const costPerMillion = MODEL_COSTS[modelRoute] || 0;
  return Math.ceil(((inputTokens + outputTokens) / 1_000_000) * costPerMillion * 100); // cents
}
```

## Redaction

- `none`: No redaction needed (internal events).
- `partial`: Sensitive fields redacted (PII in external actions).
- `full`: Entire payload redacted (youth records, legal/financial).

Redaction status is set by the safety classifier before the event is written.

## Core package

`packages/core/src/events.js`:
- `logEvent({ tenantId, eventType, actorId, payload, correlationId, causationId, modelRoute, costCents, redactionStatus, traceId })`
- `getEventsByCorrelation(correlationId)`
- `getEventsByType(eventType, tenantId, limit)`
- `getEventTimeline(tenantId, limit)` — chronological feed for dashboard
