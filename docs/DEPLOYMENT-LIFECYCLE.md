# Deployment Lifecycle — Mission OS v0.6

## Overview

Mission OS v0.6 introduces a local/dry-run deployment lifecycle for tenant bundles. All commands operate on files in `handoff/<tenant>/managed/` and `mission-data/<tenant>/` — no live Docker deployment or remote VPS operations are performed unless explicitly stated.

## Release flow

```
missionctl bundle up <tenant> --dry-run          # Generate managed bundle
missionctl bundle smoke <tenant> --dry-run       # Verify 57 checks pass
missionctl bundle release <tenant>               # Create deployment release record
missionctl upgrade <tenant> --release <id>       # Activate the release
missionctl backup <tenant>                       # Snapshot state before deploy
```

## Rollback flow

```
missionctl rollback <tenant> --to <release-id>   # Re-activate a prior release
```

## States

| Status | Meaning |
|---|---|
| `draft` | Release record created, not yet activated |
| `ready` | Validated and ready to activate (reserved for future use) |
| `active` | Currently running release |
| `failed` | Activation or health check failed |
| `rolled_back` | Superseded by a rollback |
| `archived` | Replaced by a newer active release |

## Release record fields

Stored in `mission-data/<tenant>/deployment-releases.json`:

| Field | Description |
|---|---|
| `id` | `rel_<hex>` unique identifier |
| `tenant_id` | Tenant slug |
| `release_id` | Human-readable `<tenant>-<version>-<timestamp>` |
| `version` | Semver string from release manifest |
| `bundle_path` | Path to generated bundle directory |
| `manifest_path` | Path to release manifest JSON |
| `status` | Current state (see above) |
| `previous_release_id` | Pointer to prior release for rollback chains |
| `created_by` | `cli`, `system`, or operator ID |
| `created_at` / `activated_at` / `rolled_back_at` | ISO timestamps |
| `smoke_status` | `passed` or `failed` from last smoke run |
| `health_status` | `ok`, `warn`, or `fail` from last health check |

## missionctl commands

```bash
missionctl bundle status <tenant>                # Current bundle and active release
missionctl bundle release <tenant>               # Create release record (draft)
missionctl upgrade <tenant> --release <id>       # Activate release
missionctl rollback <tenant> --to <id>           # Roll back to prior release
missionctl backup <tenant> [--notes "reason"]    # Create backup
missionctl restore --slug <tenant> --backup <id> # Restore from backup
```

## What is dry-run / local only

- All releases are file-backed; no Docker container is started or stopped.
- `missionctl upgrade` activates a release record, not a live service.
- `missionctl rollback` updates the release record; does not restart containers.
- Live deployment to a running VPS is still a manual step: copy bundle files, `docker compose up -d`.

## Postgres parity

`db/migrations/0006_v06_deployment_lifecycle.sql` adds tables:
- `deployment_releases`
- `deployment_health_checks`
- `deployment_smoke_results`
- `tenant_backups`

File-backed JSON is the runtime store; Postgres tables provide schema parity for production.
