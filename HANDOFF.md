# HANDOFF.md — Mission OS v0.6 Build

> Living document. Updated after every work session.

## Current state

**Version:** v0.6 (Managed Hermes Bundle) — Vertical Slice 1 complete
**Date:** 2026-06-27
**Repo:** `https://github.com/executiveusa/ascend-social-purpose-agentic-systems-.git`
**Branch:** `main`

## Goal

Extend Mission OS from v0.5 (deployment handoff) to v0.6 (managed agent runtime bundle) with Hermes, LiteLLM, Open WebUI, Langfuse, tenant-agent-packs, and extended missionctl.

## Completed

### P0-1: Repo inventory and spec package ✅
- `docs/V0.6-REPO-INVENTORY.md` — verified file-by-file inventory
- `docs/V0.6-GAP-MAP.md` — gap analysis v0.5 → v0.6
- `HANDOFF.md` — this file
- `docs/AGENT-PROVENANCE.md` — session provenance
- `openspec/changes/mission-os-v0-6-managed-hermes-bundle/` — 14 spec files (proposal, design, tasks, 11 specs)

### P0-2: Baseline verification ⚠️
- npm install completed
- Existing tests not yet run (npm run verify) — deferred to next session

### P0-3: missionctl bundle commands ✅
- `bundle up <slug> [--dry-run]` — generates complete managed bundle
- `bundle status <slug>` — shows bundle status
- `bundle smoke <slug> [--dry-run]` — 12-check verification
- `bundle release <slug>` — marks bundle as released
- `bundle down <slug>` — stub for teardown
- All existing v0.5 commands preserved

### P0-4: Tenant-agent-pack generator ✅
- `pack generate <slug>` — creates 33-file deterministic pack
- `pack validate <slug>` — verifies all 33 files exist
- `pack publish <slug>` — logs publish event
- Pack structure: manifest, org, hermes (8 skills, 3 schedules, tools), mission (policy, workflows, approvals, dashboard), openwebui, prompts (4), tests

### P0-5: Hermes provisioner templates ✅
- `missionctl/templates/hermes/` — env, docker-compose, profile config, SOUL, MEMORY, USER, 8 skills
- `hermes provision <slug>` — generates tenant-specific Hermes config
- `hermes health <slug>` — checks config status
- Hermes dashboard bound to 127.0.0.1:8765 (NOT public)
- Risky toolsets disabled by default

### P0-6: Managed Docker Compose template ✅
- `docker-compose.managed.yml` — 12 services (postgres, redis, mission-api, site, caddy, litellm, hermes, open-webui, langfuse, prometheus, grafana)
- `Caddyfile.managed` — routes for API, site, workspace, observability
- `prometheus.yml` — metrics scraping config
- `grafana-dashboard.json` — placeholder
- `managed.env.example` — all env vars with generated secrets
- `smoke-test.managed.sh` — bash smoke test
- `release-manifest.json` — release metadata template

### P0-7: LiteLLM, Langfuse, Open WebUI sync ✅
- `litellm sync` — generates config.yaml with 8 virtual key surfaces + env
- `langfuse sync` — generates env + trace-metadata.json
- `openwebui sync` — generates env + workspace.json + 6 starter agents
- No provider master keys committed
- All placeholders clearly marked

### P0-8: Deep smoke-test skeleton ✅
- `scripts/smoke-managed.mjs` — 23-check Node.js smoke test
- `handoff/templates/smoke-test.managed.sh` — bash smoke test in bundle
- `missionctl bundle smoke` — 12-check inline verification
- All checks pass on demo-pnw

### P0-9: v0.6 docs ✅
- `docs/V0.6-MANAGED-HERMES-BUNDLE.md`
- `docs/TENANT-AGENT-PACK.md`
- `docs/HERMES-MISSION-OS-CONTRACT.md`
- `docs/ONE-CLICK-BUNDLE-FLYWHEEL.md`
- `docs/OPENWEBUI-WORKSPACE.md`
- `docs/LITELLM-GATEWAY.md`
- `docs/LANGFUSE-OBSERVABILITY.md`

## Not yet done

- P1: Typed event journal (DB migration + event helper)
- P1: Approval/policy lifecycle (state machine)
- P1: Artifact registry (table + API + repo)
- P1: managed_agents records (table + API)
- P1: DashboardState API endpoint
- P2: Real LiteLLM sync (live API calls)
- P2: Langfuse trace linking (real trace IDs)
- P2: Open WebUI workspace bootstrap (real workspace creation)
- P2: Deeper dashboard UI
- P3: Upgrade/rollback, billing export, production hardening, live VPS test

## Failed approaches

- **PowerShell `&&` syntax** — PowerShell doesn't support `&&` as a statement separator. Use `;` or `cmd /c`.
- **`read_multiple_files` with parentheses in path** — Batch reads fail when paths contain `(`. Read files individually instead.
- **`const TEMPLATES` temporal dead zone** — Declaring `const` after `main()` call causes "Cannot access before initialization". Fixed by moving to top of file.
- **`copyHermesTemplates` object argument** — Passed `{ hermes: path }` instead of string. Fixed to pass `packDir` directly.

## Key decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Rust services deferred to v0.7 | JS layer works and is tested. v0.6 is productization. |
| D2 | OpenSpec v0.6 supersedes p0-2 through p0-6 | Absorbed into v0.6 specs. |
| D3 | jcodemunch-mcp locked for code navigation | Already configured, saves tokens. |
| D4 | Hermes is managed runtime, not system of record | Mission OS DB owns state. |
| D5 | No client frontend features in this repo | Product boundary enforced. |
| D6 | Dry-run only for v0.6 vertical slice 1 | No live Docker deployment needed to validate flywheel. |
| D7 | Simple YAML writer (no external deps) | Avoids adding js-yaml dependency. |

## Commands run (validation suite)

```bash
missionctl help                                    # ✅ All v0.6 commands listed
missionctl tenant create demo-pnw --org "Demo PNW Nonprofit"  # ✅
missionctl pack generate demo-pnw                  # ✅ 33 files generated
missionctl pack validate demo-pnw                  # ✅ All 33 files present
missionctl hermes provision demo-pnw               # ✅ Hermes config generated
missionctl litellm sync demo-pnw                   # ✅ LiteLLM config generated
missionctl langfuse sync demo-pnw                  # ✅ Langfuse config generated
missionctl openwebui sync demo-pnw                 # ✅ Open WebUI config generated
missionctl bundle up demo-pnw --dry-run            # ✅ Bundle generated
missionctl bundle smoke demo-pnw --dry-run         # ✅ 12/12 checks passed
```

## Resume instructions

1. `cd` to repo root.
2. Read this file first.
3. Read `docs/V0.6-GAP-MAP.md` for what's next.
4. Next implementation: P1 (typed event journal, approval lifecycle, artifact registry, managed_agents, DashboardState API).
5. Use jcodemunch-mcp for code navigation.
6. Follow the flywheel: bead/task → test → core → API → UI → docs → deployment.

## Warnings

- `npm run verify` not yet run (may have test failures from missing node_modules).
- No live Docker deployment tested.
- All provider API keys are placeholders.
- Hermes/LiteLLM/Langfuse/Open WebUI containers not tested — config generation only.

## Next exact steps

1. Run `npm install` and `npm run verify` to check baseline.
2. Start P1-1: Typed event journal migration (`db/migrations/0003_v06_managed_hermes.sql`).
3. Start P1-2: Approval/policy lifecycle state machine.
4. Start P1-3: Artifact registry table + API.
5. Start P1-4: managed_agents table + API.
6. Start P1-5: DashboardState API endpoint.
