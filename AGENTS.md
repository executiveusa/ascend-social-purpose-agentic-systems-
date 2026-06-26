# AGENTS.md — Asc3nd Social Purpose OS

## Product architecture rule

The backend is reusable product infrastructure. Do not customize backend code for a single client unless the change improves the shared product.

Customize tenants through:

- public frontend copy/theme/assets
- `llms.txt`
- onboarding profile
- ICM `_config` files
- ICM stage references

## ICM rule

Do not replace ICM with a hidden swarm. The operating system is the folder structure:

- `AGENT.md`
- `CONTEXT.md`
- numbered `stages/*/CONTEXT.md`
- `_config` reference files
- `output` working artifacts

## Safety rule

No automated red/orange action without human approval. Youth, grant submissions, public claims, donor outreach, legal/financial work, outbound calls, and browser applications are approval-gated.

## Coding loop

1. Read docs and existing conventions.
2. Add or update a failing test.
3. Implement in `packages/core` first when possible.
4. Wire API in `services/mission-api`.
5. Wire UI in `apps/site`.
6. Run `npm test` and smoke tests.
7. Update docs and ICM template.
