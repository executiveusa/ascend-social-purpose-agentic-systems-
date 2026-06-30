# Observability and Traces — Mission OS v0.6 (Phase 4)

Phase 4 adds a tenant-scoped trace-link registry and a Langfuse trace-metadata builder. Neither module calls a live Langfuse instance — they define the data contract a future live integration would populate and read.

## Trace Links

`packages/core/src/trace-links.js`

- `createTraceLink({ tenantId, surface, agentSlug, runId, artifactId, langfuseTraceUrl, actor })` — stores a link record (not the trace content) at `mission-data/<tenantId>/trace-links.json`. Emits `TRACE.LINK.CREATED`.
- `getTraceLinks({ tenantId, surface, runId })` — tenant-scoped list, optionally filtered.
- `getTraceLink({ tenantId, id })` — single record fetch.

This lets the operator dashboard / API show "this run has a Langfuse trace, here's the URL" without Mission OS storing or proxying trace contents itself.

## Langfuse Trace Metadata

`packages/core/src/langfuse-metadata.js`

- `TRACE_TAG_FIELDS` — the required tag set every trace must carry if/when sent to a real Langfuse instance: `org_id, tenant_id, surface, workflow_kind, approval_class, agent_slug, run_id, artifact_id, release_id, environment`.
- `buildLangfuseTraceMetadata({ tenantId, orgId, surface, workflowKind, approvalClass, agentSlug, runId, artifactId, releaseId, environment, extra })` — builds the metadata object and **redacts** any key in `extra` matching `SENSITIVE_KEYS` (`prompt, rawPrompt, completion, rawCompletion, secret, password, token, apiKey, key`) before returning `{ metadata, redacted }`. `redacted` lists which keys were stripped, for audit purposes.

## Guardrails

- No HTTP calls to a Langfuse instance are made by these modules.
- Sensitive fields (prompts, completions, secrets, tokens) are never included in trace metadata — they are stripped even if accidentally passed in via `extra`.
- All trace-link reads are tenant-scoped; no cross-tenant trace lookup exists.

## API

```
GET /api/operator/traces?surface=comms
GET /api/operator/traces/:id
```

## Next Phase

A live Langfuse integration would call `buildLangfuseTraceMetadata` when starting a trace and `createTraceLink` when the trace completes, then surface `langfuseTraceUrl` to operators. Phase 4 ships the contract and storage only.
