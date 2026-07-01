# Backup and Restore — Mission OS v0.6

## Overview

`missionctl backup` snapshots a tenant's live data into a versioned, checksum-verified backup directory. `missionctl restore` replays a backup back into the tenant's data directory.

## What is backed up

| Source | Destination in backup |
|---|---|
| `mission-data/<tenant>/` | `backups/<tenant>/<backup-id>/mission-data/` |

The backup captures all file-backed state: profile, contacts, events, artifacts, approvals, agent health, dashboard state, deployment releases, smoke history, and operator keys.

## Backup manifest

Every backup writes `backup-manifest.json` into the backup directory:

```json
{
  "backup_id": "demo-pnw-2026-07-01T...",
  "tenant_id": "demo-pnw",
  "created_at": "2026-07-01T...",
  "created_by": "cli",
  "source_paths": ["/.../mission-data/demo-pnw"],
  "file_count": 14,
  "checksum_sha256": "abc123...",
  "restorable": true,
  "notes": "pre-upgrade",
  "format": "mission-os-backup-v2"
}
```

## Commands

```bash
# Create a backup
missionctl backup demo-pnw

# List backups
# (inspect backups/demo-pnw/ directory)

# Restore a backup
missionctl restore --slug demo-pnw --backup demo-pnw-2026-07-01T...
```

## Safety rules

- **Same-tenant restore only**: `restoreBackup` validates that `manifest.tenant_id === tenantId`. Mismatches throw an error.
- **Path traversal blocked**: `backupId` and `tenantId` are validated against `[a-zA-Z0-9_.-]` allowlists; any traversal attempt throws.
- **`restorable` flag**: Backups where `restorable: false` cannot be restored.
- **No cross-tenant restore**: There is no flag to restore one tenant's backup into another tenant's directory.
- **Backups are gitignored**: `backups/` is excluded from git; generated backups are never committed.

## Events emitted

- `BACKUP.CREATED` — logged to the tenant's event journal when a backup is created.
- `BACKUP.RESTORED` — logged when a restore completes.
