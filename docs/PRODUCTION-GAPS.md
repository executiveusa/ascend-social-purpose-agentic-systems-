# Production Gaps

This file is intentionally blunt. Do not sell the system as autonomous production infrastructure until these are closed.

## Current build status

- Frontend: working scaffold.
- API: working demo API.
- ICM: real folder scaffold.
- ACFS/flywheel: vendored reference + install script, not pre-installed on the host until `scripts/install-acfs.sh` runs.
- Database: Postgres container exists, but the API currently defaults to filesystem JSON state.
- Agents: adapter seams exist; real Pi/Absurd/Sandcastle execution still needs implementation.
- Postiz: payload builder exists; real scheduler adapter needs implementation.
- Voice: webhook logging exists; real Twilio/Vapi/Retell call workflow needs implementation.

## Non-negotiable production bar

1. `npm run verify` passes.
2. `npm audit --audit-level=high` returns clean or documented accepted risk.
3. A tenant cannot read or write another tenant's data.
4. Every external action creates an approval record before execution.
5. Every model/tool call has an audit event, model route, cost estimate, and redaction status.
6. Backups can be restored on a clean VPS.
7. ACFS doctor passes on the VPS.
8. Human staff can complete onboarding without a developer.
