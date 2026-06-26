# OpenSpec — Asc3nd Mission OS P0 Hardening

Spec-driven development (SDD) for the P0 build. Each change lives in its own
folder with proposal, specs, design, and tasks. Fluid, iterative, brownfield.

## Changes

- `p0-1-bridge-config/` — Fix production bridge configuration
- `p0-2-postgres-repos/` — Replace JSON dry-run with Postgres repositories
- `p0-3-crm-flow/` — Real CRM flow with pipeline routing
- `p0-4-approval-outbox/` — Approval-to-outbox execution
- `p0-5-icm-runner/` — ICM runner hardening
- `p0-6-rbac/` — Role-based access control

## Workflow

1. Write proposal + specs + tasks (this folder)
2. Write failing tests
3. Implement
4. Run `npm test && npm run build && npm run doctor && npm run adamsreview`
5. Commit with Bead reference
6. Archive to `archive/` when done
