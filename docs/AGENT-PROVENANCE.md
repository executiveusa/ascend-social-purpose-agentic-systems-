# Agent Provenance — Mission OS v0.6

> Tracks which AI agent/builder worked on what, when, and with what tools.
> This file is the provenance record when Atomic or similar tools are not installed.

## Provenance format

Every work session logs:

| Field | Value |
|---|---|
| Session ID | UUID or timestamp-based |
| Date | ISO 8601 |
| Agent/Builder | Tool name (Desktop Commander, Claude Code, Codex, etc.) |
| Model | LLM used (e.g., GLM-4.6, Claude Sonnet 4.5) |
| MCPs used | jcodemunch, supabase, context7, etc. |
| Files created | List |
| Files modified | List |
| Tests written | Count + file paths |
| Tests passed | Count |
| Beads written | Count + references |
| Decisions | List of decision IDs from HANDOFF.md |

## Session log

### Session 1 — 2026-06-27

| Field | Value |
|---|---|
| Session ID | 2026-06-27-001 |
| Date | 2026-06-27T19:51:43Z |
| Agent/Builder | Desktop Commander |
| Model | (as configured by user) |
| MCPs used | jcodemunch-mcp (configured, available) |
| Files created | `docs/V0.6-REPO-INVENTORY.md`, `docs/V0.6-GAP-MAP.md`, `HANDOFF.md`, `docs/AGENT-PROVENANCE.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/proposal.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/design.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/tasks.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/managed-agents.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/operator-api.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/tenant-agent-pack.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/approval-policy.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/event-journal.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/model-gateway.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/deployment-bundle.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/dashboard-state.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/openwebui-workspace.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/observability.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/pnw-nonprofit-offer.md` |
| Files modified | None (first session on clean git init) |
| Tests written | 0 (P0 is specs/docs only) |
| Tests passed | N/A |
| Beads written | 0 (beads protocol available, will use in P0-2+) |
| Decisions | D1 (Rust deferred), D2 (OpenSpec supersedes), D3 (jcodemunch locked), D4 (Hermes managed), D5 (No client frontend) |
| Git commits | `0403de6` — v0.5 baseline git init |

### Session 2 — 2026-06-29

| Field | Value |
|---|---|
| Session ID | 2026-06-29-002 |
| Date | 2026-06-29T01:38:00Z |
| Agent/Builder | Antigravity Builder |
| Model | Gemini 3.5 Flash |
| MCPs used | jcodemunch-mcp |
| Files created | `packages/core/src/events.js`, `packages/core/src/policy.js`, `packages/core/src/approval-lifecycle.js`, `packages/core/src/artifacts.js`, `packages/core/src/managed-agents.js`, `packages/core/src/dashboard-state.js`, `packages/core/tests/events.test.js`, `packages/core/tests/approval-lifecycle.test.js`, `packages/core/tests/artifacts.test.js`, `packages/core/tests/managed-agents.test.js`, `packages/core/tests/dashboard-state.test.js`, `db/migrations/0003_v06_core_platform.sql`, `docs/dev-load-always.yaml` |
| Files modified | `.gitignore`, `missionctl/missionctl.mjs`, `missionctl/templates/managed-bundle/managed.env.example`, `missionctl/templates/hermes/docker-compose.hermes.yml`, `missionctl/templates/managed-bundle/docker-compose.managed.yml`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/tasks.md` |
| Tests written | 5 test files (`events.test.js`, `approval-lifecycle.test.js`, `artifacts.test.js`, `managed-agents.test.js`, `dashboard-state.test.js`) |
| Tests passed | 61/61 (all tests pass) |
| Decisions | D6 (Core platform state layer implemented, file-backed fallbacks + database migrations ready) |

### Session 3 — 2026-06-30 (Phase 5: Ops Dashboard UI)

| Field | Value |
|---|---|
| Session ID | 2026-06-30-003 |
| Date | 2026-06-30T18:00:00Z |
| Agent/Builder | Claude Code |
| Model | claude-sonnet-4-6 |
| MCPs used | github |
| Files created | `apps/site/lib/ops-tenant.js`, `apps/site/lib/opsApi.js`, `apps/site/app/api/ops/{dashboard-state,events,artifacts,managed-agents,managed-agents/[id],budgets,model-usage-summary,traces}/route.js`, `apps/site/components/MissionOsOverview.jsx`, `apps/site/app/ops/{agents,agents/[id],artifacts,events,budgets,health,deployments,openwebui}/page.jsx`, `apps/site/tests/{ops-routes-exist,ops-api-data,ops-no-operator-keys-in-client}.test.js`, `docs/OPS-DASHBOARD.md` |
| Files modified | `apps/site/app/ops/page.jsx`, `apps/site/components/OpsShell.jsx`, `vitest.config.js`, `missionctl/missionctl.mjs`, `HANDOFF.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/tasks.md` |
| Tests written | 53 new tests across 3 files |
| Tests passed | 189/189 (full suite) |
| Beads written | 0 |
| Decisions | Bypass both legacy session-JWT auth and Operator API key auth via a same-origin server-side `/api/ops/*` proxy layer reading `@asc3nd/core/*` directly, since the two existing auth schemes do not interoperate and exposing an operator key to client JS is explicitly forbidden; extend `/ops` additively rather than replace the pre-existing Today cockpit |

### Session 4 — 2026-07-01 (Phase 6: Managed Deployment Lifecycle)

| Field | Value |
|---|---|
| Session ID | 2026-07-01-004 |
| Date | 2026-07-01T03:00:00Z |
| Agent/Builder | Claude Code |
| Model | claude-sonnet-4-6 |
| MCPs used | github |
| Files created | `packages/core/src/deployment-releases.js`, `packages/core/src/deployment-health.js`, `packages/core/src/deployment-backup.js`, `packages/core/tests/deployment-releases.test.js`, `packages/core/tests/deployment-health.test.js`, `packages/core/tests/deployment-backup.test.js`, `packages/core/tests/fresh-tenant.test.js`, `db/migrations/0006_v06_deployment_lifecycle.sql`, `services/mission-api/src/operator/deployments.js`, `services/mission-api/src/operator/backups.js`, `apps/site/app/api/ops/deployments/route.js`, `apps/site/tests/ops-deployments.test.js`, `docs/DEPLOYMENT-LIFECYCLE.md`, `docs/BACKUP-RESTORE.md`, `docs/RELEASE-MANIFEST.md` |
| Files modified | `packages/core/src/dashboard-state.js` (ENOENT fix), `packages/core/package.json` (+3 exports), `services/mission-api/src/operator/index.js` (+deployments/backups routers), `apps/site/app/ops/deployments/page.jsx` (placeholder → real data), `missionctl/missionctl.mjs` (+5 commands, smoke extended 44→57 checks), `HANDOFF.md`, `docs/AGENT-PROVENANCE.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/tasks.md` |
| Tests written | 81 new tests across 5 files |
| Tests passed | 270/270 |
| Beads written | 0 |
| Decisions | Fixed pre-existing dashboard-state ENOENT via mkdirSync guard in core module (not test workaround); used @asc3nd/core package imports in operator routes (consistent with Phase 3/4 pattern); backup/restore is local/file-backed with tenant-mismatch and path-traversal hard blocks; /ops/deployments upgraded from static placeholder to live data showing releases, smoke history, backups |

## Rules

1. Every session must be logged here before ending.
2. If Atomic is installed, this file is supplementary (Atomic is primary).
3. If Atomic is not installed, this file is the authoritative provenance record.
4. Provenance is never deleted — append only.
5. Agent identity is the tool/builder, not a persona name.
