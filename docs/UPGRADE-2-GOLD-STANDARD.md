# Upgrade 2: Golden Standard Direction

## What changed

This pass moves Mission OS from a technical cockpit toward a staff-native nonprofit operating system.

### UX changes

- Sidebar now uses plain outcome language: Today, Get Funding, Review Actions, Founder Brain, Create Campaigns, Reports, System Health.
- The default `/ops` page is a Today cockpit with next best actions, mission readiness, and outcome buttons.
- Technical tools remain under the hood. ICM, flywheel, adapters, and model routing are still present, but they are no longer the primary mental model for staff.
- The public site now explains the actual productized offer: customized frontend + shared backend + ICM operating layer.

### Backend changes

- Added `/api/today` aggregate endpoint.
- Added `/api/readiness` nonprofit readiness engine.
- Added `/api/adapters/status` production/dry-run adapter status.
- Added `/api/actions/start` plain-language outcome action starter.
- Added `/api/reports/board` board report draft generator.
- Approval decisions now produce an approved action package in ICM stage `05_approval_gate`.
- Added `services/mission-api/src/storage.js` as the first explicit repository boundary before swapping JSON state for Postgres.

### Core package changes

- Added `@asc3nd/core/readiness`.
- Added tests for readiness, today action ranking, and mission score.
- Kept model routing cheap-by-default with critical model use reserved for red/high-complexity work.

### Data model changes

`db/schema.sql` now includes tenants, users, approvals, workflows, opportunities, campaigns, calls, vault notes, outcomes, and audit events.

## Remaining production gates

1. Replace JSON dry-run storage with a real Postgres repository implementation.
2. Add migrations and tenant-isolation tests.
3. Wire the real Pi agent runner to ICM stage execution.
4. Wire Absurd workflow records to `/api/actions/start` and `/api/workflows/run`.
5. Wire Sandcastle for browser/code execution.
6. Wire Composio/MCP only through allowlisted tools and approval classes.
7. Wire Postiz scheduling only after approved campaign review.
8. Add full role-based access control.
9. Add backup/restore and tenant export scripts.
10. Add Playwright screenshots for Apple-level visual QA.

## Design standard

The target is not a generic AI dashboard. The target is:

```text
Apple Health + Linear + Stripe Dashboard + Seattle community warmth
```

The staff interface should ask: what decision does a human need to make now?

The backend should ask: which ICM stage owns this work, what context is safe to load, what output file was created, and who approved the next step?
