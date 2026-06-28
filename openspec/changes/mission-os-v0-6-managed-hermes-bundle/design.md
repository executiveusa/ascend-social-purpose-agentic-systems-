# Design — Mission OS v0.6: Managed Hermes Bundle

## Architecture overview

```
                    missionctl (one-click flywheel)
                         |
          +--------------+--------------+
          |              |              |
    Mission OS API   Hermes Runtime   Managed Bundle
    (system of       (managed agent    (LiteLLM + Open WebUI
     record)          execution)        + Langfuse)
          |              |              |
          v              v              v
    Postgres DB     Agent Packs      Model Gateway
    (tenants,       (per-tenant      (routing + usage
     approvals,      agent configs)    + traces)
     events,
     artifacts,
     managed_agents)
```

## Component design

### 1. Managed Hermes Runtime

Hermes runs as a Docker service managed by Mission OS. Mission OS:
- Provisions a Hermes instance per tenant (or shared with tenant-scoped agents).
- Injects agent-pack configs at startup.
- Monitors health via `/health` endpoint.
- Does NOT store Hermes state — Mission OS DB is system of record.

**Hermes adapter contract:**
```js
// packages/core/src/hermes-adapter.js
export function provisionHermes({ tenantId, agentPack, litellmUrl }) { ... }
export function checkHermesHealth({ instanceId }) { ... }
export function stopHermes({ instanceId }) { ... }
```

### 2. Tenant-Agent-Pack

A tenant-agent-pack is a JSON manifest describing which agents a tenant gets:
```json
{
  "packId": "northwest-nonprofit-standard",
  "tenantId": "asc3nd",
  "agents": [
    { "name": "grant-scout", "model": "standard", "tools": ["drive.read", "calendar.read"] },
    { "name": "campaign-drafter", "model": "cheap", "tools": ["postiz.schedule"] },
    { "name": "outcome-tracker", "model": "cheap", "tools": [] }
  ],
  "litellmModels": ["openai/gpt-4.1-mini", "anthropic/claude-sonnet-4.5"],
  "openWebuiWorkspace": true,
  "langfuseProject": "asc3nd"
}
```

### 3. Managed Docker Compose

Extends v0.5 compose with:
- `hermes` service (pinned version, env from Mission OS)
- `litellm` service (model proxy, config from Mission OS)
- `open-webui` service (per-tenant workspace bootstrap)
- `langfuse` service (self-hosted trace observability)

### 4. Typed Event Journal

Extends `audit_events` table with:
- `event_type` (enum: agent.run, approval.created, approval.decided, artifact.created, model.call, external.action, system.health)
- `correlation_id` (links related events)
- `causation_id` (links to triggering event)
- `model_route` (which model tier was used)
- `cost_estimate` (estimated cost in cents)
- `redaction_status` (none/partial/full)

### 5. Approval/Policy Lifecycle

Extends `approvals` table state machine:
```
draft → pending → approved → executing → completed
                 ↓          ↓
               rejected   failed
```

### 6. Artifact Registry

New `artifacts` table:
- `id`, `tenant_id`, `type` (icm-output, report, draft, export), `title`, `path`, `version`, `metadata jsonb`, `created_at`

### 7. managed_agents Table

New table tracking Hermes-managed agents:
- `id`, `tenant_id`, `agent_name`, `pack_id`, `hermes_instance_id`, `status` (provisioning/active/stopped/error), `config jsonb`, `last_health_at`, `created_at`

### 8. DashboardState API

Single endpoint `GET /api/dashboard-state` returning:
```json
{
  "tenant": { ... },
  "pendingApprovals": [...],
  "recentEvents": [...],
  "activeAgents": [...],
  "recentArtifacts": [...],
  "modelUsage": { ... },
  "systemHealth": { ... }
}
```

## missionctl extension

New commands:
```
missionctl bundle init <tenant>           # Generate managed bundle dir
missionctl bundle dry-run <tenant>        # Validate without deploying
missionctl bundle apply <tenant>          # Deploy managed bundle
missionctl agent-pack create <tenant> <pack-name>  # Generate agent pack
missionctl agent-pack list <tenant>       # List agent packs
missionctl hermes status <tenant>         # Check Hermes health
missionctl hermes stop <tenant>           # Stop Hermes instance
```

## Data model changes

New tables:
- `managed_agents`
- `artifacts`
- `event_types` (enum extension on audit_events)

Migration: `db/migrations/0003_v06_managed_hermes.sql`

## Testing strategy

- Unit tests for every new core package function.
- Integration tests for missionctl bundle/agent-pack commands.
- E2E smoke test: tenant create → agent-pack create → bundle init → bundle dry-run → verify.
- No fake green tests — every test must assert real behavior.

## jcodemunch usage

All code navigation during implementation uses jcodemunch-mcp:
- `plan_turn` at start of each task.
- `search_symbols` / `get_symbol_source` for code lookup.
- `get_file_outline` before opening files.
- `find_importers` / `get_blast_radius` before changes.
