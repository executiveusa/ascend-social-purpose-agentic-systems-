# Implementation Next: Production Sprint

## P0: Postgres and tenant security

- Implement `PostgresTenantStore` matching the `JsonTenantStore` interface.
- Add `DATABASE_URL` support behind `STORAGE_MODE=postgres`.
- Add migration runner using plain SQL first.
- Add tests proving tenant A cannot read or write tenant B files, DB rows, vault notes, or approval records.

## P0: ICM execution bridge

- Build `runIcmStage({ tenantId, stage, task })`.
- It should read AGENT.md, workspace CONTEXT.md, stage CONTEXT.md, scoped Layer 3 references, and Layer 4 prior outputs.
- It should write `output/result.md`, `output/audit.json`, and optional `approval-request.json`.
- It should never load the whole workspace.

## P0: Flywheel enforcement

- Keep ACFS as host bootstrap and task discipline.
- Every task should create or update a bead.
- Every change runs `npm test`, `npm run build`, and `npm run doctor` before release.
- Tenant-specific changes must stay in `apps/site/tenant.config.js`, public assets, and `icm/tenants/<tenant>/_config`.

## P1: Adapter hardening

- Pi: command adapter with timeout, cwd restriction, and output capture.
- Absurd: durable queue for scans, report generation, and campaign drafting.
- Sandcastle: sandbox executor for browser tasks and untrusted code.
- Composio/MCP: tenant-scoped allowlist, read/write split, tool-prompt injection checks.
- Postiz: schedule only approved campaign IDs.
- Voice: log calls automatically; require approval for outbound calls.

## P1: Staff product polish

- Add first-run wizard with checklist cards.
- Add role views: founder, program director, volunteer coordinator, board member.
- Add Evidence Room uploads.
- Add sponsor pipeline.
- Add report export to markdown/PDF later.
