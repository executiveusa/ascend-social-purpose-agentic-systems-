# Spec: Operator API

## Purpose

The operator API is the internal API surface for missionctl and the ops cockpit. It extends the existing mission-api with managed bundle, agent-pack, and Hermes control endpoints.

## New endpoints

### Bundle management
- `POST /api/operator/bundle/init` — generate managed bundle directory
- `POST /api/operator/bundle/dry-run` — validate bundle config
- `POST /api/operator/bundle/apply` — deploy managed bundle (triggers docker compose)

### Agent-pack management
- `GET /api/operator/agent-packs/:tenant` — list packs
- `POST /api/operator/agent-packs` — create pack
- `GET /api/operator/agent-packs/:tenant/:packId` — get pack detail

### Hermes control
- `GET /api/operator/hermes/:tenant/status` — check Hermes instance health
- `POST /api/operator/hermes/:tenant/stop` — stop Hermes instance
- `POST /api/operator/hermes/:tenant/start` — start Hermes instance

### Dashboard state
- `GET /api/dashboard-state?tenant=<slug>` — aggregated dashboard data

## Auth

All operator API endpoints require:
- JWT auth (existing demo auth extended)
- Role check: `owner`, `director`, or `staff` only
- Tenant scoping: operator can only manage their own tenant (except superadmin)

## Error format

```json
{
  "ok": false,
  "error": "bundle.dry-run.failed",
  "details": "Missing LITELLM_API_KEY in bundle env",
  "tenant": "asc3nd"
}
```

## Rate limiting

- Bundle apply: 1 per minute per tenant
- Hermes start/stop: 1 per 30 seconds per tenant
- Dashboard state: 60 per minute per tenant
