# Worker Runtime Contracts — Mission OS v0.6

The worker contracts module (`packages/core/src/worker-contracts.js`) defines the interface between Mission OS and the Hermes managed agent runtime. Phase 3 implements dry-run only — no Docker execution, no live network calls.

## Design Principles

- **Policy-first**: Every dispatch call evaluates `evaluateActionPolicy` before checking risk level.
- **Dry-run**: All four contracts return structured result objects. No external calls are made.
- **Event-linked**: Each contract emits a typed event to the tenant's event journal where practical.
- **Extension points**: Each factory returns an object with a named method. Phase 4 replaces the method body with live execution without changing the calling interface.

## Exports

### `createHermesConnector()`

Creates a connector that validates the Hermes connection contract.

```js
const connector = createHermesConnector();
const result = connector.connect({ tenantId: 'demo-pnw' });
// { ok: true, mode: 'dry-run', tenantId: 'demo-pnw', ... }
```

### `createHermesProvisioner()`

Creates a provisioner that validates agent provisioning contracts.

```js
const provisioner = createHermesProvisioner();
const result = provisioner.provision({ tenantId, agentSlug, agentType, packVersion });
// { ok: true, mode: 'dry-run', status: 'queued', provisionId: 'prov_...', ... }
```

### `createHermesHealthChecker()`

Creates a health checker that validates health check contracts.

```js
const checker = createHermesHealthChecker();
const result = checker.check({ tenantId, agentSlug });
// { ok: true, mode: 'dry-run', healthStatus: 'dry-run', checkedAt: '...' }
```

### `createHermesRunDispatcher()`

Creates a dispatcher that validates run dispatch contracts. This is the most policy-sensitive contract.

```js
const dispatcher = createHermesRunDispatcher();
const result = dispatcher.dispatch({ tenantId, prompt, agentSlug, risk, actionType, actionPayload });
```

## Dispatch Policy Rules

The dispatcher applies policy in this order:

1. **Hard block (policy layer)**: `evaluateActionPolicy` runs first. Grant submission, legal filing, outbound messages, public publishing, unrestricted execution, and cross-tenant access are always blocked.

2. **Risk gate**: Orange and red risk levels are blocked. Green and yellow proceed.

3. **Dry-run execution**: All passing dispatches return `status: 'queued'` with `mode: 'dry-run'`.

### Run Creation Policy (via `/api/operator/runs`)

| Risk Level | Behavior |
|-----------|----------|
| green | Queued as dry-run |
| yellow | Queued as dry-run (draft/artifact mode) |
| orange | Blocked — 403, approval required |
| red | Blocked — 403, restricted approval required |

### Hard Blocks (always blocked regardless of risk)

- `GRANT_SUBMISSION` — No automatic grant submission
- `LEGAL_FINANCIAL_FILING` — No automatic legal/financial filing
- `OUTBOUND_MESSAGE` — No automatic donor/youth/family outbound messages
- `PUBLIC_PUBLISHING` — No public publishing without approval
- `UNRESTRICTED_EXECUTION` — No unrestricted shell/browser/tool execution
- Cross-tenant payload (`crossTenant: true`) — No cross-tenant file access

## Example Dispatch Results

**Green run (success)**:
```json
{
  "ok": true,
  "mode": "dry-run",
  "status": "queued",
  "dispatchId": "dsp_a1b2c3d4",
  "tenantId": "demo-pnw",
  "risk": "green",
  "message": "Hermes dispatch contract validated; live execution disabled.",
  "note": "Live Hermes execution deferred to Phase 4."
}
```

**Orange run (blocked)**:
```json
{
  "ok": false,
  "mode": "dry-run",
  "status": "blocked",
  "blocked": true,
  "reason": "Risk level orange requires approval before dispatch.",
  "approvalClass": "orange",
  "message": "Dispatch blocked: orange risk requires human approval."
}
```

**Hard block**:
```json
{
  "ok": false,
  "mode": "dry-run",
  "status": "blocked",
  "blocked": true,
  "reason": "Hard block: Automatic grant submission is prohibited.",
  "approvalClass": "red"
}
```

## Deferred Live Execution

Phase 4 will replace the dry-run body of each factory method with:
- Docker container provisioning for Hermes agents
- Live Hermes API calls for health and run dispatch
- LiteLLM model routing with budget enforcement
- Langfuse trace linking per run

The calling interface (factory → method → result shape) is stable and will not change.

## Known Limitations

- No actual Docker or Hermes network calls in Phase 3.
- Events are emitted best-effort; failures are silently ignored.
- `createHermesHealthChecker` always returns `healthStatus: 'dry-run'`. Real health polling deferred to Phase 4.
