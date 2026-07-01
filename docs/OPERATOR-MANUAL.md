# Operator Manual — Mission OS v0.6

## Overview

This manual covers day-to-day operation of Mission OS for tenant administrators and system operators. For deployment setup, see `docs/DEPLOY-HOSTINGER-VPS.md`. For security procedures, see `docs/SECURITY-CHECKLIST.md`.

## Prerequisites

- Node.js >= 20.11.0
- `missionctl` CLI: `node missionctl/missionctl.mjs <command>`
- Tenant provisioned via `missionctl tenant create <slug>`

## Tenant management

### Create a tenant

```bash
node missionctl/missionctl.mjs tenant create <slug>
```

Slug must match `[a-zA-Z0-9_-]`. Creates `mission-data/<slug>/` directory with initial state.

### List tenants

```bash
node missionctl/missionctl.mjs tenant list
```

### Generate operator keys

```bash
node missionctl/missionctl.mjs operator-key create --tenant <slug> --label <name>
```

Keys are prefixed `ok_<slug>_` and stored as SHA-256 hashes. Never store raw keys in tracked files.

## Bundle lifecycle

### Build and deploy bundle (dry-run)

```bash
node missionctl/missionctl.mjs bundle up <slug> --dry-run
```

Generates `handoff/<slug>/managed/` env files and release manifest. Files are gitignored.

### Smoke-check bundle

```bash
node missionctl/missionctl.mjs bundle smoke <slug> --dry-run
```

Runs 72 static checks across all Phase 1–7 gates. Must pass before any handoff.

### Upgrade bundle

```bash
node missionctl/missionctl.mjs bundle upgrade <slug> --dry-run
```

Applies migrations, restarts services, validates post-upgrade state.

### Rollback bundle

```bash
node missionctl/missionctl.mjs bundle rollback <slug> --dry-run
```

Restores from latest backup and re-runs validation.

## Backup and restore

### Create backup

```bash
node missionctl/missionctl.mjs backup create <slug>
```

Archives `mission-data/<slug>/` to `backups/<slug>-<timestamp>-<rand>.tar.gz`. Backups directory is gitignored.

### List backups

```bash
node missionctl/missionctl.mjs backup list <slug>
```

### Restore backup

```bash
node missionctl/missionctl.mjs backup restore <slug> <backup-id>
```

Validates path (no traversal), extracts to `mission-data/<slug>/`.

## Model gateway

### Set model budget

```bash
node missionctl/missionctl.mjs model budget set <slug> --monthly-usd <amount>
```

Default: $50/month, 80% warning threshold, 100% hard-block threshold.

### View usage

```bash
node missionctl/missionctl.mjs model usage <slug>
```

### Export billing data

```bash
node missionctl/missionctl.mjs billing export <slug>
node missionctl/missionctl.mjs billing export <slug> --format csv
```

Outputs tenant-scoped model usage and artifact counts. No raw secrets in output.

## Agent management

### Provision managed agent

```bash
node missionctl/missionctl.mjs agent provision <slug> --agent-id <id>
```

### List agents

```bash
node missionctl/missionctl.mjs agent list <slug>
```

## Observability

### View events

```bash
node missionctl/missionctl.mjs events list <slug>
```

### Sync Langfuse metadata

```bash
node missionctl/missionctl.mjs langfuse sync <slug>
```

Generates trace metadata. Live Langfuse sync requires running Langfuse instance.

## Health and diagnostics

### System doctor

```bash
node missionctl/missionctl.mjs doctor
```

Checks all system components. Must pass before any production handoff.

### Full verification suite

```bash
node scripts/verify-v06.mjs
```

Runs npm test, build, doctor, bundle smoke, secret audit, generated-file audit, test discovery audit, and OpenSpec audit.

## Security gates

Run before every commit to main:

```bash
node scripts/secret-audit.mjs        # blocks raw secrets in tracked files
node scripts/generated-file-audit.mjs # blocks runtime artifacts in git
node scripts/test-discovery-audit.mjs  # verifies all test files are covered
```

See `docs/SECURITY-CHECKLIST.md` for the complete pre-release checklist.

## Hostinger VPS handoff

```bash
node missionctl/missionctl.mjs hostinger handoff <slug> --vps-ip <ip>
```

Generates deployment package for Hostinger VPS. Requires: VPS IP, DNS configured, TLS via Caddy.

## npm scripts reference

| Script | Command |
|--------|---------|
| `npm test` | Run all tests (vitest) |
| `npm run build` | Build Next.js site |
| `npm run verify` | Tests + build + doctor + AdamsReview + missionctl doctor |
| `npm run verify:v06` | Full Phase 7 gate (all audits) |
| `npm run secret:audit` | Secret scan tracked files |
| `npm run generated:audit` | Detect runtime artifacts in git |
| `npm run test:audit` | Verify test file coverage |
| `npm run openspec:audit` | Report task completion |
| `npm run audit:deps` | npm audit --audit-level=high |

## Approval gates

The following actions require human approval before execution:

- Public social media publishing (Postiz)
- Donor/youth outreach (Twilio, email)
- Financial submissions (grants, invoices)
- Browser automation on external portals
- Red or orange risk-class agent actions

Approval records are written to `mission-data/<slug>/approvals/` before any external action executes.

## What is deferred to Phase 8

- Live VPS deployment and DNS/TLS provisioning
- Postgres migration and row-level tenant isolation
- Live Hermes agent execution, LiteLLM routing, Langfuse sync
- Postiz live scheduling
- Open WebUI live workspace

All Phase 7 commands run in dry-run mode against file-backed state.
