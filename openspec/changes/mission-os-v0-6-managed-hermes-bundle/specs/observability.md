# Spec: Observability

## Purpose

Unified observability for Mission OS v0.6 using Langfuse for trace-level visibility into agent runs, model calls, and workflow execution.

## Architecture

```
Mission OS API ──── trace_id ────→ Langfuse
   │                                  │
   ├── agent.run event                ├── trace detail
   ├── model.call event               ├── model usage
   ├── external.action event          ├── tool call
   └── approval.* events              └── approval context
```

## Langfuse bootstrap

During `missionctl bundle init <tenant>`:

```env
# langfuse/env
NEXTAUTH_SECRET=<generated>
SALT=<generated>
NEXTAUTH_URL=http://langfuse:3000
DATABASE_URL=postgres://mission:***@postgres:5432/langfuse
NEXT_PUBLIC_SIGN_IN_METHODS=email
```

## Trace linking

Every typed event in Mission OS carries a `trace_id`. When an agent run starts:

1. Mission OS generates a `trace_id` (UUID).
2. `trace_id` is passed to Hermes as a header/metadata.
3. Hermes passes `trace_id` to LiteLLM.
4. LiteLLM forwards `trace_id` to Langfuse.
5. Langfuse groups all calls under the same trace.

## Dashboard integration

The ops cockpit shows:
- Recent traces (from Langfuse API)
- Trace timeline (events with same correlation_id)
- Model usage breakdown (from Langfuse + Mission OS events)
- Cost tracking (from Mission OS event journal)

## Langfuse API

`packages/core/src/langfuse.js`:
- `getTraces(tenantId, limit)` — recent traces
- `getTraceDetail(traceId)` — full trace with spans
- `getUsageSummary(tenantId, dateRange)` — aggregated usage

## Self-hosted

Langfuse is self-hosted (not cloud). Benefits:
- No per-trace cost.
- Data stays in tenant's Postgres.
- No external API dependency.

## Retention

- Traces retained for 90 days by default.
- Configurable via `LANGFUSE_RETENTION_DAYS` env var.
- Old traces are purged by a scheduled job in the outbox worker.

## Rules

- Langfuse is optional — tenant can opt out in agent pack (`langfuseProject: false`).
- If Langfuse is not running, trace_id is still generated and stored in events.
- No PII in trace metadata — redaction status applies to trace payloads.
