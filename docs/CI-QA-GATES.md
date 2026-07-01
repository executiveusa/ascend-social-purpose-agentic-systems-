# CI / QA Gates — Mission OS v0.6

## Gate overview

Every push to `main`, `phase/**`, `hotfix/**`, and `claude/**` branches runs the full CI gate via `.github/workflows/ci.yml`.

### CI job steps (in order)

| Step | Command | Blocks merge if failing |
|---|---|---|
| Install | `npm ci` | yes |
| Tests | `npm test` | yes |
| Build | `npm run build` | yes |
| missionctl doctor | `node missionctl/missionctl.mjs doctor` | yes |
| Secret audit | `node scripts/secret-audit.mjs` | yes |
| Generated-file audit | `node scripts/generated-file-audit.mjs` | yes |
| Test discovery audit | `node scripts/test-discovery-audit.mjs` | yes |
| OpenSpec task audit | `node scripts/openspec-task-audit.mjs` | yes |
| Bundle smoke (dry-run) | `node missionctl/missionctl.mjs bundle smoke demo-pnw --dry-run` | yes |
| AdamsReview gate | `node scripts/adamsreview-lite.mjs` | yes (blockers) |

## No external secrets required

CI runs entirely without external API keys. All checks are:
- Local filesystem only
- Dry-run (no live Docker, no live VPS, no network calls)
- Deterministic given the repo state

## Audit scripts

### `scripts/secret-audit.mjs`

Scans all tracked files for raw key-like values. Detects:
- Operator keys: `ok_<tenant>_<hex>`
- Mission session/public keys: `sk_mission_*`, `pk_mission_*`
- Langfuse secrets: `NEXTAUTH_SECRET`, `SALT`
- Open WebUI: `WEBUI_SECRET_KEY`
- LiteLLM: `LITELLM_MASTER_KEY`
- Provider keys: `sk-...`
- Tracked handoff runtime env files

Allows: `*.env.example`, `*.env.managed.example`, test files, markdown.

### `scripts/generated-file-audit.mjs`

Scans git-tracked files for runtime artifacts that should be gitignored:
- `mission-data/` — tenant runtime state
- `backups/` — backup archives
- `handoff/*/managed/hermes/env` etc. — generated env files with runtime secrets
- `handoff/*/managed/release-manifest.json` — runtime release manifest

### `scripts/test-discovery-audit.mjs`

Verifies every `.test.js` file is covered by a Vitest include glob. Catches orphan test files that would silently not run. Add intentional exclusions (e.g. Playwright e2e specs) to the `INTENTIONAL_EXCLUSIONS` map with a documented reason.

### `scripts/openspec-task-audit.mjs`

Reads `openspec/changes/mission-os-v0-6-managed-hermes-bundle/tasks.md` and reports task completion. Exits 1 only if tasks are marked `[BLOCKED]`.

### `scripts/verify-v06.mjs`

Master orchestrator. Runs all of the above in sequence plus npm test, build, and bundle smoke. Use for local full-suite validation before pushing.

## Local dev workflow

```bash
# Quick: tests + build + doctor
npm run verify

# Full Phase 7 gate (all audits)
node scripts/verify-v06.mjs

# Individual audits
npm run secret:audit
npm run generated:audit
npm run test:audit
npm run openspec:audit
```

## Bundle smoke checks

`missionctl bundle smoke <tenant> --dry-run` runs N static checks on the bundle:
- Phase 1–4: Core modules, API routes, DB migrations
- Phase 5: Ops dashboard routes, no operator key in client code
- Phase 6: Deployment lifecycle modules, upgrade/rollback/backup commands
- Phase 7: Audit scripts, CI workflow, docs, .gitignore rules

Current total: 70 checks (57 through Phase 6, +13 for Phase 7).

## Vitest configuration

`vitest.config.js` includes:

```js
include: [
  'packages/**/*.test.js',
  'packages/**/tests/**/*.js',
  'services/**/tests/**/*.test.js',
  'apps/**/tests/**/*.test.js',
]
```

All test files must match one of these patterns or be listed in `INTENTIONAL_EXCLUSIONS` in `scripts/test-discovery-audit.mjs`.

## Playwright smoke tests

End-to-end tests in `tests/e2e/` run via `npm run smoke` (Playwright, not Vitest). These require a running dev server and are excluded from CI until a VPS stage is available.
