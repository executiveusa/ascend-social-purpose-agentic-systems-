# Golden Standard Audit — Seattle Social Purpose OS

Date: 2026-06-26
Status: working scaffold, not full production automation yet

## Verdict

The system has the right architecture direction: ICM as the operating layer, shared backend, customizable frontend, and a VPS/flywheel path. It is not yet the golden standard. The current build is a strong MVP scaffold that needs security hardening, real adapters, deeper product UX, and operational telemetry before being sold as managed infrastructure for youth-serving nonprofits.

## What is strong

- ICM is present as a real folder system with tenant template, AGENT.md, CONTEXT.md, 8 numbered stages, reference folders, and output folders.
- ACFS flywheel reference is vendored under `vendor/acfs` and Mission OS docs include the maintenance loop.
- The public site includes AI-discovery basics: `llms.txt`, sitemap, robots, and JSON-LD.
- The cockpit is organized by nonprofit outcomes rather than technical tools.
- Approval gates exist for opportunity workflows, campaigns, and agent actions.
- The app builds and the core tests pass after `npm ci`.
- There is now a `npm run doctor` check for ICM/flywheel/deployment structure.

## What is not yet golden standard

### 1. Product UX

Current cockpit pages are functional but too dashboard-like. Nontechnical staff need a guided daily workspace:

- Today view with three buttons max.
- Linear onboarding wizard with progress, save/resume, and plain-language questions.
- Role-based views: founder, program director, volunteer coordinator, board member, communications lead.
- Plain-language safety labels: `Safe to run`, `Needs review`, `Needs signer`.
- Empty states that explain exactly what to do next.
- Mobile-first staff flows.

### 2. Apple-level/native design

Current design is good-looking but not Apple-level yet. It needs:

- Less visual noise and fewer glowing panels.
- Stronger whitespace rhythm.
- More native-feeling controls.
- Better form design and validation messages.
- Light mode and high-contrast mode.
- Real Seattle visual language: civic, athletic, community, water/cedar/field textures, not generic SaaS.
- Motion with purpose only: reveal progress, confirm completion, or reduce anxiety.

### 3. Backend reality

The current backend uses filesystem JSON for most state. That is acceptable for local demo mode, but production needs:

- Postgres storage for users, tenants, approvals, audit events, opportunity scans, outcomes, campaigns, calls, and jobs.
- Append-only audit events with immutable IDs.
- Database migrations.
- Row-level tenant isolation.
- Object storage for uploaded files and founder second-brain imports.
- Backup and restore scripts.

### 4. Agent execution

The current Pi/Absurd/Sandcastle/Composio/Postiz integrations are adapter seams. Production needs real adapters:

- Pi adapter that reads a stage `CONTEXT.md`, scopes Layer 3/Layer 4 files, and writes outputs.
- Absurd workflow definitions for each ICM stage.
- Sandcastle execution for browser/code/file tasks.
- Composio/MCP tool allowlist with tenant-scoped OAuth.
- Postiz scheduling adapter that only runs after approval.
- Browser automation adapter for grant portals, with human-in-the-loop stop points.

### 5. Approval/execution lifecycle

Approvals currently mark status only. Golden standard needs:

- `draft -> review -> approved -> executed -> verified -> logged` state machine.
- Separate approval roles for public content, finances, youth data, and legal filings.
- Evidence bundles for each approval.
- Rollback/cancel path.
- Output provenance: which source files/instructions created the artifact.

### 6. Safety for youth-serving nonprofits

Needed before real youth operations:

- Youth data minimization.
- No raw sensitive youth notes sent to external LLMs by default.
- PII/PHI/financial redaction before model calls.
- Consent and media-release tracking.
- Mandatory human review for external parent/youth communications.
- Safeguarding policy templates per tenant.

### 7. Repeatable deployment

The system is repeatable at repo level, but needs managed-release discipline:

- `scripts/install-acfs.sh` for VPS flywheel setup.
- `npm run doctor` before every deployment.
- Tenant config snapshot before update.
- Database migration checks.
- Smoke tests with Playwright browsers installed.
- Release notes and changelog.
- One-command tenant creation that provisions DB rows, ICM folders, domain config, theme, and admin account.

## Severity-ranked backlog

### P0 — Must fix before paid production

1. Replace file JSON state with Postgres repository layer.
2. Add real auth: hashed passwords, invite flow, reset flow, RBAC, session cookies or hardened token storage.
3. Implement real Pi + Absurd + ICM runner.
4. Implement approval execution lifecycle.
5. Add tenant isolation tests.
6. Add backups and restore.
7. Pin and audit dependencies.
8. Install Playwright browsers in CI/smoke environment.

### P1 — Needed for golden standard

1. Redesign cockpit into Today-first guided UX.
2. Add role-based navigation.
3. Add Seattle nonprofit opportunity knowledge base refresh workflow.
4. Add Postiz adapter with approval-gated scheduling.
5. Add founder second-brain search and Obsidian sync.
6. Add LLM import normalizers with file upload instead of paste-only.
7. Add audit/provenance viewer.
8. Add model-cost ledger.

### P2 — Product moat

1. Seattle sponsor/partner graph.
2. Youth/sports outcome templates.
3. Board report generator.
4. Funder-ready impact evidence room.
5. AI-readable public profile for each nonprofit.
6. Opportunity matching score explanations.
7. Multi-tenant admin console for Kupuri/Asc3nd support.

## Golden-standard product shape

The user should not see tools. The user should see outcomes:

- Get Funding
- Grow Donors
- Coordinate Volunteers
- Report Impact
- Publish Stories
- Prepare Board Meeting
- Protect Youth Data
- Improve My Organization

Under the hood each button becomes an ICM run:

`button -> Absurd workflow -> Pi reads stage context -> Sandcastle/MCP tools -> output file -> approval -> execution -> outcome log -> learning note`

