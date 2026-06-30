# LiteLLM / Langfuse / Open WebUI Integration Contracts — Mission OS v0.6 (Phase 4)

Phase 4 ships config-builder and validator modules for all three third-party services Mission OS plans to integrate with. None of these modules call the live services — they generate and validate configuration data that a future bundle/bootstrap step would hand to the real services.

## LiteLLM

See `docs/MODEL-GATEWAY.md`. Module: `packages/core/src/litellm-config.js`.

## Langfuse

See `docs/OBSERVABILITY-AND-TRACES.md`. Module: `packages/core/src/langfuse-metadata.js` (trace metadata/tagging contract) + `packages/core/src/trace-links.js` (trace link registry).

## Open WebUI

`packages/core/src/openwebui-bootstrap.js`

- `buildOpenWebuiBootstrap({ tenantId, litellmApiBase, starterAgents })` — builds a per-tenant Open WebUI bootstrap config (workspace name, model base URL, starter agent list), mirroring `missionctl/templates/openwebui/openwebui.env.example`.
- `validateOpenWebuiBootstrap(bootstrap)` — enforces two hard rules:
  - `enableSignup` must be `false` (no public self-signup on a tenant's Open WebUI instance).
  - `litellmApiBase` must not point at a third-party provider directly (rejects any URL matching `/openai\.com|anthropic\.com/i`) — Open WebUI must always route through the tenant's own LiteLLM gateway, never call a provider API directly.

## Guardrails (all three)

- No real LiteLLM, Langfuse, or Open WebUI process is started or called.
- No raw provider API keys are generated or stored by any of these modules — only env var name references.
- Validation functions exist specifically to catch config mistakes (raw keys, public signup, direct provider calls) before any future bundle step would apply them to a live service.

## Existing Related Docs

- `docs/LITELLM-GATEWAY.md` — Phase 2/3 LiteLLM template docs.
- `docs/LANGFUSE-OBSERVABILITY.md` — Phase 2/3 Langfuse template docs.
- `docs/OPENWEBUI-WORKSPACE.md` — Phase 2/3 Open WebUI template docs.

Phase 4 adds the typed config-builder/validator layer on top of those existing templates; it does not replace them.

## Next Phase

Wiring these builder/validator modules into `missionctl bundle up` so generated bundles use validated, per-tenant config instead of the static templates is left to a future phase.
