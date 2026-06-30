# Tasks — Mission OS v0.6: Managed Hermes Bundle

## P0 — Foundation

### P0-1: Repo inventory and gap map
- [x] Create `docs/V0.6-REPO-INVENTORY.md`
- [x] Create `docs/V0.6-GAP-MAP.md`
- [x] Create `HANDOFF.md`
- [x] Create OpenSpec change folder with proposal, design, tasks, specs
- [x] Create `docs/AGENT-PROVENANCE.md`
- **Acceptance:** All files exist, committed, and accurately reflect repo state.

### P0-2: Baseline verification
- [ ] Run `npm install`
- [ ] Run `npm test` — all existing tests pass
- [ ] Run `npm run doctor` — all checks pass
- [ ] Document any failures in HANDOFF.md
- **Acceptance:** `npm test` green, `npm run doctor` green.

### P0-3: missionctl bundle commands
- [ ] Write failing tests for `bundle init`, `bundle dry-run`, `bundle apply`
- [ ] Implement `bundle init <tenant>` — creates `bundles/<tenant>/` with compose + env + agent-pack template
- [ ] Implement `bundle dry-run <tenant>` — validates bundle without deploying
- [ ] Implement `bundle apply <tenant>` — runs `docker compose up` with managed bundle
- [ ] Add `bundle` command group to missionctl help
- **Acceptance:** Tests pass. `missionctl bundle init asc3nd` creates valid bundle dir.

### P0-4: Tenant-agent-pack generator
- [ ] Write failing tests for `agent-pack create`
- [ ] Implement `missionctl agent-pack create <tenant> <pack-name>`
- [ ] Implement `missionctl agent-pack list <tenant>`
- [ ] Create default pack templates: `northwest-nonprofit-standard`, `youth-sports`, `community-arts`
- **Acceptance:** Tests pass. `missionctl agent-pack create asc3nd northwest-nonprofit-standard` generates valid pack JSON.

### P0-5: Hermes provisioner templates
- [ ] Create `deploy/hermes/Dockerfile.hermes` (pinned version)
- [ ] Create `deploy/hermes/hermes-env.template` (env vars for Mission OS integration)
- [ ] Create `packages/core/src/hermes-adapter.js` with `provisionHermes`, `checkHermesHealth`, `stopHermes`
- [ ] Write tests for hermes-adapter
- **Acceptance:** Tests pass. Template generates valid Docker config.

### P0-6: Managed Docker Compose template
- [ ] Create `deploy/docker-compose.managed.yml` with services: hermes, litellm, open-webui, langfuse
- [ ] Create `deploy/litellm/config.yaml.template` (model routing config)
- [ ] Create `deploy/open-webui/env.template` (per-tenant workspace)
- [ ] Create `deploy/langfuse/env.template` (self-hosted Langfuse)
- **Acceptance:** `docker compose -f deploy/docker-compose.managed.yml config` validates without errors.

### P0-7: Deep smoke-test skeleton
- [ ] Extend `tests/e2e/smoke.spec.js` with: API health, public bridge, ICM stage run, approval flow, dashboard state
- [ ] Add `tests/e2e/managed-bundle.spec.js` for bundle workflow
- [ ] Add `tests/integration/agent-pack.test.js`
- **Acceptance:** Smoke tests run (can be expected to fail on missing services, but test structure is valid).

### P0-8: v0.6 docs
- [ ] Create `docs/V0.6-OVERVIEW.md`
- [ ] Update `README.md` with v0.6 section
- [ ] Update `AGENTS.md` with v0.6 rules (Hermes, agent-packs)
- **Acceptance:** Docs accurately describe v0.6 architecture and workflow.

## P1 — Core Platform

### P1-1: Typed event journal
- [x] Write migration `0003_v06_core_platform.sql` with `typed_event_journal`
- [x] Write tests for typed events (`events.test.js`)
- [x] Implement `packages/core/src/events.js` — `emitEvent`, `readEvents`, `createCorrelationId`
- [/] Wire into API (to be completed in Phase 3/dashboard routes)
- **Acceptance:** Tests pass. Events have types and correlation IDs.

### P1-2: Approval/policy lifecycle
- [x] Write tests for approval state machine (`approval-lifecycle.test.js`)
- [x] Implement `packages/core/src/approval-lifecycle.js` — state transitions, validation, file storage fallback
- [x] Add approval risk classes and transition logic matching green/yellow/orange/red policy rules
- [/] Wire outbox worker to update approval state on execution result (pending worker implementation)
- **Acceptance:** Tests pass. Approval states transition correctly.

### P1-3: Artifact registry
- [x] Add `artifacts` table to migration
- [x] Write tests for artifact CRUD (`artifacts.test.js`)
- [x] Implement `packages/core/src/artifacts.js` with directory traversal guards
- [/] Add API routes: `GET /api/artifacts`, `POST /api/artifacts`, `GET /api/artifacts/:id` (pending Phase 3 dashboard API)
- **Acceptance:** Tests pass. Artifacts can be registered and retrieved.

### P1-4: managed_agents records
- [x] Add `managed_agents` table to migration
- [x] Write tests for managed agent CRUD (`managed-agents.test.js`)
- [x] Implement `packages/core/src/managed-agents.js` with provisioning and health status check
- [/] Add API routes: `GET /api/agents` etc. (pending Phase 3)
- [x] Wire hermes commands to create/update managed_agents records
- **Acceptance:** Tests pass. Agent records track Hermes instances.

### P1-5: DashboardState API
- [x] Write tests for dashboard state aggregation (`dashboard-state.test.js`)
- [x] Implement `generateDashboardState` — aggregates tenant, approvals, events, agents, artifacts, health
- [/] Wire ops cockpit to use dashboard-state endpoint (pending Phase 3 and 5)
- **Acceptance:** Tests pass. State generator compiles the unified dashboard state.

## P2 — Managed Runtime

> **Note (Architect-assigned "Phase 4 — Model Gateway, Observability, Usage Ledger"):** the config/contract and budget/usage-ledger layer underlying P2-1/P2-2/P2-3 has been built (`packages/core/src/{litellm-config,langfuse-metadata,trace-links,openwebui-bootstrap,model-budgets,model-usage-ledger}.js`, see `docs/MODEL-GATEWAY.md`, `docs/MODEL-USAGE-LEDGER.md`, `docs/OBSERVABILITY-AND-TRACES.md`, `docs/LITELLM-LANGFUSE-OPENWEBUI.md`). Per explicit phase guardrails, none of it calls a live LiteLLM, Langfuse, or Open WebUI instance — the checkboxes below describing live sync/key-injection/usage-pull/bootstrap-against-a-running-service remain unchecked and are left for a future phase.

### P2-1: LiteLLM sync
- [ ] Implement `packages/core/src/litellm-sync.js` — model list sync, key injection, usage pull
- [ ] Add `missionctl litellm sync <tenant>` command
- [ ] Write tests
- **Acceptance:** Tests pass. LiteLLM models sync from config.

### P2-2: Langfuse trace linking
- [ ] Add trace_id to typed events
- [ ] Implement Langfuse project bootstrap in bundle init
- [ ] Write tests for trace ID propagation
- **Acceptance:** Events carry trace IDs. Langfuse receives traces.

### P2-3: Open WebUI workspace bootstrap
- [ ] Implement per-tenant workspace creation in bundle apply
- [ ] Write tests for workspace config generation
- **Acceptance:** Tests pass. Each tenant gets isolated workspace.

### P2-4: Deeper dashboard UI
- [ ] Add real-time event feed to ops cockpit
- [ ] Add artifact browser
- [ ] Add agent status panel
- [ ] Add model usage chart
- **Acceptance:** UI renders dashboard-state data correctly.

## P3 — Production Hardening

### P3-1: Upgrade/rollback
- [ ] Implement `missionctl upgrade` — pulls latest, runs migrations, restarts services
- [ ] Implement `missionctl rollback` — reverts to previous migration version
- [ ] Write tests
- **Acceptance:** Tests pass. Upgrade and rollback work on clean VPS.

### P3-2: Billing export
- [ ] Implement `missionctl billing export <tenant>` — CSV/JSON of model usage + artifact counts
- [ ] Write tests
- **Acceptance:** Export contains accurate per-tenant usage data.

### P3-3: Production hardening
- [ ] Close all 8 production gaps from docs/PRODUCTION-GAPS.md
- [ ] `npm run verify` passes
- [ ] `npm audit --audit-level=high` clean or documented
- [ ] Tenant isolation tests pass against Postgres
- [ ] ACFS doctor passes on VPS
- **Acceptance:** All 8 production bars met.

### P3-4: Live VPS deployment test
- [ ] Deploy to Hostinger VPS
- [ ] DNS + TLS verification
- [ ] Postgres migration/restore drill
- [ ] Live custom frontend bridge test
- [ ] Postiz live scheduling after approval
- **Acceptance:** End-to-end deployment verified on real VPS.
