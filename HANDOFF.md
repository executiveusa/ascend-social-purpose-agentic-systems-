# HANDOFF.md — Mission OS v0.6 Build

> Living document. Updated after every work session.
> Pattern: claude-handoff (progress, failures, decisions, resume instructions).

## Current state

**Version:** v0.5 → v0.6 (Managed Hermes Bundle)
**Date:** 2026-06-27
**Repo:** `https://github.com/executiveusa/ascend-social-purpose-agentic-systems-.git`
**Branch:** `main`
**Last commit:** `0403de6` — v0.5 baseline — initialize git from zip extraction

## What was done this session

1. ✅ Verified working directory is the correct repo root.
2. ✅ Initialized git from zip extraction (no `.git` existed).
3. ✅ Connected remote: `origin → https://github.com/executiveusa/ascend-social-purpose-agentic-systems-.git`.
4. ✅ Committed v0.5 baseline.
5. ✅ Deep repo discovery — read all key files (README, AGENTS, SKILLS, package.json, Cargo.toml, missionctl, all docs, schema, config, openspec, services, packages, icm, db).
6. ✅ Created `docs/V0.6-REPO-INVENTORY.md` — verified file-by-file inventory.
7. ✅ Created `docs/V0.6-GAP-MAP.md` — gap analysis v0.5 → v0.6.
8. ✅ Created `HANDOFF.md` (this file).
9. ✅ Created OpenSpec change folder: `openspec/changes/mission-os-v0-6-managed-hermes-bundle/`
10. ✅ Created 14 spec files (proposal, design, tasks, 11 specs).
11. ✅ Created `docs/AGENT-PROVENANCE.md`.

## Decisions made

| # | Decision | Rationale |
|---|---|---|
| D1 | Rust services deferred to v0.7 | JS layer is working and tested. v0.6 is productization, not migration. |
| D2 | OpenSpec v0.6 change supersedes p0-2 through p0-6 | Those P0 items are absorbed into v0.6 specs. |
| D3 | jcodemunch-mcp locked in for all code navigation | Already configured, reduces token usage. |
| D4 | Hermes is managed runtime, not system of record | Mission OS DB owns state; Hermes executes agent work. |
| D5 | No client frontend features in this repo | Product boundary enforced per docs/PRODUCT-BOUNDARIES.md. |

## Failures / blockers

- **No git history before this session** — repo was a zip extraction. Fixed by `git init` + `git add -A` + `git commit`.
- **npm install not yet run** — need to run `npm install` before `npm test` / `npm run verify`.
- **Rust crates are scaffolds only** — not a blocker for v0.6 (deferred to v0.7).

## Resume instructions

When picking up this work:

1. `cd` to the repo root (the `ascend-social-purpose-agentic-systems--main` folder inside `ascend-social-purpose-agentic-systems--main(1)`).
2. Read this file first.
3. Read `docs/V0.6-GAP-MAP.md` for what's next.
4. Read the OpenSpec change at `openspec/changes/mission-os-v0-6-managed-hermes-bundle/tasks.md`.
5. Use jcodemunch-mcp for code navigation (per AGENTS.md).
6. Follow the flywheel: bead/task → failing test → core package → API → UI → docs → deployment.
7. Write a Bead for every significant action.

## Next steps (P0 remaining)

- [ ] Run `npm install` and `npm test` to verify baseline passes.
- [ ] Implement `missionctl bundle init/dry-run/apply` commands.
- [ ] Implement `missionctl agent-pack create` command.
- [ ] Create Hermes provisioner Docker Compose template.
- [ ] Create managed Docker Compose template (Hermes + LiteLLM + Open WebUI + Langfuse).
- [ ] Write deep smoke-test skeleton (Playwright + API + bridge + ICM + approval).
- [ ] Create `docs/V0.6-OVERVIEW.md`.

## Next steps (P1)

- [ ] Typed event journal (extend audit_events + add event types).
- [ ] Approval/policy lifecycle (extend approvals table + state machine).
- [ ] Artifact registry (new table + API + repo).
- [ ] managed_agents table + API.
- [ ] DashboardState API endpoint.
