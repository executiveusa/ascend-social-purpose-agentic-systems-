# Proposal — Mission OS v0.6: Managed Hermes Bundle

## Summary

Extend Mission OS from v0.5 (deployment handoff) to v0.6 (managed agent runtime bundle). Add Hermes as a managed execution runtime, tenant-agent-packs, LiteLLM/Open WebUI/Langfuse bundle templates, stronger approval/policy/event/artifact/model-usage layers, and extend missionctl into a one-click flywheel.

## Motivation

v0.5 delivers repeatable deployment but has no managed agent runtime. Tenants cannot:
- Provision agent packs without manual Docker work.
- Route model calls through a centralized gateway with usage tracking.
- Observe agent traces in a unified dashboard.
- Manage agent lifecycles (start/stop/health) from missionctl.
- Boot per-tenant Open WebUI workspaces.

v0.6 closes these gaps by bundling Hermes + LiteLLM + Open WebUI + Langfuse into a managed, missionctl-driven deployment.

## Scope

### In scope

- Managed Hermes runtime (not forked, not system of record)
- Tenant-agent-pack generator
- LiteLLM model gateway sync
- Open WebUI per-tenant workspace bootstrap
- Langfuse trace linking
- Typed event journal
- Approval/policy lifecycle
- Artifact registry
- managed_agents records
- DashboardState API
- missionctl bundle commands
- Deep smoke-test skeleton
- PNW nonprofit offer spec

### Out of scope

- Rust migration (deferred to v0.7)
- Client frontend features (owned by separate repos)
- Public pages/forms (owned by client repos)
- Billing system (export only in P3)
- Forking or modifying Hermes source

## Design principles

1. **Backend stays standardized** — no per-client backend changes.
2. **Hermes is managed runtime** — Mission OS DB is system of record.
3. **Flywheel enforced** — bead/task → test → core → API → UI → docs → deployment.
4. **Approval-gated** — orange/red actions require human approval.
5. **Token-efficient** — jcodemunch-mcp for all code navigation.

## Phases

- **P0:** Foundation — specs, missionctl bundle, agent-pack generator, Hermes templates, managed compose, smoke tests, docs.
- **P1:** Core platform — event journal, approval lifecycle, artifact registry, managed_agents, DashboardState API.
- **P2:** Managed runtime — LiteLLM sync, Langfuse traces, Open WebUI bootstrap, dashboard UI.
- **P3:** Production — upgrade/rollback, billing export, hardening, live VPS test.

## Risks

| Risk | Mitigation |
|---|---|
| Hermes API changes | Pin Hermes version in compose; abstract behind adapter. |
| LiteLLM key management | Keys in Mission OS DB, injected into LiteLLM at provision time. |
| Multi-tenant isolation in Open WebUI | Per-tenant workspace IDs, no shared model endpoints. |
| Langfuse cost | Self-hosted Langfuse, not cloud. |
| Complexity creep | Each phase ships independently; P0 is specs + templates only. |
