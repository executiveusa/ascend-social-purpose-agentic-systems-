# Hermes — Mission OS Contract

## Rule

Hermes is a managed agent runtime. Mission OS is the system of record.

## What Mission OS owns

- Tenant records
- CRM data (contacts, interactions, pipeline)
- Approvals
- Audit events
- Artifacts
- ICM workspaces
- Model usage ledger
- Dashboard state

## What Hermes owns

- Agent execution state (ephemeral)
- Tool execution context
- Model call routing (through LiteLLM)
- Trace emission (to Langfuse)

## Data flow

```
Mission OS → projects config → Hermes
Hermes → executes agent → calls LiteLLM → emits Langfuse trace
Hermes → writes artifact → Mission OS API
Mission OS → stores artifact → Postgres
```

## What Hermes does NOT do

- Does NOT write directly to Mission OS Postgres
- Does NOT store persistent state (Mission OS DB is source of truth)
- Does NOT bypass approval policy
- Does NOT expose dashboard publicly (bound to 127.0.0.1)
- Does NOT auto-execute orange/red actions

## Provisioning

```bash
missionctl hermes provision <slug>
```

This generates:
- `handoff/<slug>/managed/hermes/env` — Hermes environment
- `handoff/<slug>/managed/hermes/SOUL.md` — Agent identity
- `handoff/<slug>/managed/hermes/MEMORY.md` — Runtime state
- `handoff/<slug>/managed/hermes/USER.md` — Staff context
- `handoff/<slug>/managed/hermes/skills/*.md` — 8 skill definitions

## Health check

```bash
missionctl hermes health <slug>
```

In dry-run: checks if Hermes config exists.
In production: would curl `http://hermes:8765/health`.

## Ops dashboard visibility

The Phase 5 ops dashboard (`/ops/agents`, `/ops/agents/[id]`, `/ops/health` in `apps/site`) displays the `managed_agents` health records this contract produces, read directly from `mission-data/<tenant>/managed-agents.json`. The dashboard never calls Hermes directly — it only reads the state Mission OS already owns, consistent with "Does NOT write directly to Mission OS Postgres" / "Mission OS DB is source of truth" above.
