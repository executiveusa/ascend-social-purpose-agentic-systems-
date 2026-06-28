# Spec: Open WebUI Workspace

## Purpose

Per-tenant Open WebUI workspace for agent interaction, chat history, and model exploration.

## Architecture

Open WebUI runs as a shared Docker service. Each tenant gets an isolated workspace via:
- Unique `WEBUI_SECRET_KEY` per tenant
- Scoped LiteLLM model endpoints
- Mission OS auth bridge (JWT → Open WebUI session)

## Workspace bootstrap

During `missionctl bundle init <tenant>`:

1. Generate workspace config:
   ```env
   # open-webui/env
   WEBUI_SECRET_KEY=<generated-per-tenant>
   LITELLM_API_BASE=http://litellm:4000
   OPENAI_API_BASE=http://litellm:4000/v1
   OPENAI_API_KEY=<litellm-master-key>
   WEBUI_NAME=Asc3nd Mission OS
   ENABLE_SIGNUP=false
   ```

2. Generate workspace ID and store in `tenants.profile.openWebuiWorkspaceId`.

3. Create default admin user mapped to tenant owner.

## Per-tenant isolation

- Open WebUI does not support multi-tenancy natively.
- **v0.6 approach:** Single Open WebUI instance per tenant (separate container, separate port).
- **v0.7 approach (future):** Reverse proxy with tenant header routing to shared instance.

## Port allocation

| Service | Default port | Per-tenant offset |
|---|---|---|
| Open WebUI (asc3nd) | 3001 | — |
| Open WebUI (tenant N) | 3001 + N | Allocated by missionctl |

Port allocation is tracked in `managed_agents.config.openWebuiPort`.

## Auth bridge

Mission OS auth → Open WebUI:
1. User logs into Mission OS (existing JWT auth).
2. Mission OS calls Open WebUI API to create/refresh session.
3. User is redirected to Open WebUI with session token.
4. No separate Open WebUI login required.

## Rules

- Open WebUI is optional — tenant can opt out in agent pack (`openWebuiWorkspace: false`).
- Chat history is stored in Open WebUI's database, not Mission OS DB.
- Mission OS is system of record for outcomes, approvals, and artifacts — not chat history.
- Open WebUI is behind Caddy auth in production.
