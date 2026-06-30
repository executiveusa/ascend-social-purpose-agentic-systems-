# Security and Approvals — Mission OS v0.6

This document details the security model, roles, permission matrix, tenant isolation controls, and approval lifecycle for Mission OS.

## 1. Authentication Model

Mission OS uses a multi-layered authentication framework designed for secure, multi-tenant agent operations:
- **User Sessions**: End-users authenticate to generate a unique session token hash stored in the database. Raw session tokens are never stored, only their SHA-256 hashes. Sessions expire after a configurable TTL.
- **Operator Keys**: Managed runtimes and operators access the system using API keys prefixed with `ok_<tenantId>_`. Raw keys are displayed once at creation time, and only their SHA-256 hashes are persisted in the database.
- **Tenant Scope Enforcement**: Every session, user, and operator key is strictly bound to a single `tenant_id`.

## 2. Roles and Permissions Matrix

Roles define user capability boundaries. Permissions map directly to actions:

| Role | Permissions |
|---|---|
| **owner** | All permissions (tenant manage, users manage, agent manage, red/orange approvals, budgets, deployment) |
| **operator** | Most operational permissions (agent manage, orange approvals, budgets read, deploy read) — NO red approval by default |
| **grants** | Grant draft workflows, pipeline management, orange approval review (requesting, not final approval) |
| **comms** | Comms/donor workflows, draft generation only |
| **programs** | Program/volunteer management, draft workflows |
| **board** | Read-only access to dashboard, reports, artifacts, events |
| **reviewer** | Approvals review, orange approvals approval |
| **readonly** | Read-only dashboards and artifacts |

## 3. Operator Keys

Operator keys are used by services (such as Hermes) to authenticate API requests.
- Created via: `node missionctl/missionctl.mjs operator-key create <tenant>`
- Verified via: `node missionctl/missionctl.mjs operator-key validate <tenant> --key <key>`
- Every operator key lists specific scopes (e.g. `['operator']`) and is auditable via the append-only event journal.

## 4. Tenant Isolation Rules

To prevent cross-tenant reads or writes in a shared multi-tenant environment:
- **No Cross-Tenant Queries**: Every query must include a `tenant_id` filter. Cross-tenant reads/writes are hard blocked.
- **Path Traversal Protection**: Filesystem access uses `safeTenantPath()` which normalizes paths and throws errors if traversal patterns (`..`) are found or if the resolved path escapes the tenant directory.
- **Isolated Artifacts & Events**: Events and artifacts are strictly partitioned by tenant ID in both file-backed and DB repositories.

## 5. Approval & Policy Matrix

Actions are classified into risk classes evaluated by the policy engine (`policy.js`):

- **Green**: No approval needed. Logged to the audit events table.
- **Yellow**: Allowed as draft/artifact only (no external execution/delivery).
- **Orange**: Requires human approval (`approvals.approve.orange` permission).
- **Red**: Requires restricted human approval (`approvals.approve.red` permission).

### Hard Blocks (RED / ORANGE risk)
1. **No Automatic Grant Submission**: Prohibited (Class: RED).
2. **No Automatic Legal or Financial Filing**: Prohibited (Class: RED).
3. **No Automatic Outbound Messages**: Prohibited without approval (Class: ORANGE).
4. **No Public Publishing**: Prohibited without approval (Class: ORANGE).
5. **No Unrestricted Execution**: No raw shell, browser, or tool execution (Class: RED).
6. **No Cross-Tenant File Access**: Prohibited (Class: RED).

## 6. Persistence & Fallback Path

Mission OS supports two repository backends:
- **Postgres (Production)**: Stores structured tables with appropriate indexes for production scaling.
- **File-Backed / JSON (Local/Demo)**: Falls back to storing JSON files and `events.jsonl` under `mission-data/<tenant>/` to run locally without a Postgres instance.

## 7. Secret Handling Rules

- Raw session tokens and operator keys must never be stored in plaintext.
- Generated `.env` and `.env.managed` files must never be committed to git.
- Mock/test credentials are used for dry-runs; no live provider master keys may be configured.
- Operator API keys must never reach client-side (browser-bundled) JavaScript. The Phase 5 ops dashboard (`apps/site/app/ops/*`) enforces this by reading tenant state through same-origin server-side route handlers (`apps/site/app/api/ops/*`) that import core modules directly, instead of having the browser call the Operator API with a key — see `docs/OPS-DASHBOARD.md`. Enforced by `apps/site/tests/ops-no-operator-keys-in-client.test.js` and the `missionctl bundle smoke` "no operator key literal in ops client code" check.
