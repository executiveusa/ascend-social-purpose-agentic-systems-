# Model Gateway — Mission OS v0.6 (Phase 4)

The model gateway layer defines the configuration contracts for routing tenant traffic through LiteLLM, without calling LiteLLM directly. Phase 4 builds the config/validation modules and the budget ledger that the gateway depends on; it does not start a live LiteLLM proxy.

## Modules

- `packages/core/src/litellm-config.js`
  - `buildLiteLlmConfig({ tenantId, surfaces, monthlyBudgetUsd })` — builds a per-tenant LiteLLM virtual-key config mirroring `missionctl/templates/litellm/litellm.config.yaml` (model tiers: cheap / standard / critical, one virtual key per surface with a `max_budget`).
  - `validateLiteLlmConfig(config)` — rejects any config containing a raw provider key (regex `sk-[a-zA-Z0-9]{10,}`). Provider keys must always be referenced by env var name (`apiKeyEnvVar`), never embedded as values.
- `packages/core/src/model-budgets.js`
  - `getModelBudget(tenantId)` / `setModelBudget({...})` — per-tenant monthly budget (`monthlyBudgetUsd`, `warningThresholdPct`, `hardBlockThresholdPct`), stored at `mission-data/<tenantId>/model-budgets.json`.
  - `evaluateBudgetStatus({ tenantId, monthToDateSpendUsd })` — returns `ok` / `warning` / `hard_block` and emits `MODEL.BUDGET.WARNING` / `MODEL.BUDGET.HARD_BLOCK` events when thresholds are crossed.

## Guardrails

- No real LiteLLM process is started or called by any Phase 4 code path.
- No raw provider API keys are ever stored or returned by these modules — only env var names.
- Budgets are enforced as data (status flags + events); actual request blocking still has to be wired into a live gateway, which is explicitly out of scope for Phase 4.

## CLI

```
missionctl model budget show <slug>
missionctl model budget set <slug> --amount 100 [--warning-pct 0.8] [--hard-block-pct 1.0]
```

## Next Phase

A future phase can wire `buildLiteLlmConfig` output into an actual LiteLLM container bootstrap, and call `evaluateBudgetStatus` from a live request-time middleware. Not started here.
