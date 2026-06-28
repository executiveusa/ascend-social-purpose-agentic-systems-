# Agent Provenance — Mission OS v0.6

> Tracks which AI agent/builder worked on what, when, and with what tools.
> This file is the provenance record when Atomic or similar tools are not installed.

## Provenance format

Every work session logs:

| Field | Value |
|---|---|
| Session ID | UUID or timestamp-based |
| Date | ISO 8601 |
| Agent/Builder | Tool name (Desktop Commander, Claude Code, Codex, etc.) |
| Model | LLM used (e.g., GLM-4.6, Claude Sonnet 4.5) |
| MCPs used | jcodemunch, supabase, context7, etc. |
| Files created | List |
| Files modified | List |
| Tests written | Count + file paths |
| Tests passed | Count |
| Beads written | Count + references |
| Decisions | List of decision IDs from HANDOFF.md |

## Session log

### Session 1 — 2026-06-27

| Field | Value |
|---|---|
| Session ID | 2026-06-27-001 |
| Date | 2026-06-27T19:51:43Z |
| Agent/Builder | Desktop Commander |
| Model | (as configured by user) |
| MCPs used | jcodemunch-mcp (configured, available) |
| Files created | `docs/V0.6-REPO-INVENTORY.md`, `docs/V0.6-GAP-MAP.md`, `HANDOFF.md`, `docs/AGENT-PROVENANCE.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/proposal.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/design.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/tasks.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/managed-agents.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/operator-api.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/tenant-agent-pack.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/approval-policy.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/event-journal.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/model-gateway.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/deployment-bundle.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/dashboard-state.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/openwebui-workspace.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/observability.md`, `openspec/changes/mission-os-v0-6-managed-hermes-bundle/specs/pnw-nonprofit-offer.md` |
| Files modified | None (first session on clean git init) |
| Tests written | 0 (P0 is specs/docs only) |
| Tests passed | N/A |
| Beads written | 0 (beads protocol available, will use in P0-2+) |
| Decisions | D1 (Rust deferred), D2 (OpenSpec supersedes), D3 (jcodemunch locked), D4 (Hermes managed), D5 (No client frontend) |
| Git commits | `0403de6` — v0.5 baseline git init |

## Rules

1. Every session must be logged here before ending.
2. If Atomic is installed, this file is supplementary (Atomic is primary).
3. If Atomic is not installed, this file is the authoritative provenance record.
4. Provenance is never deleted — append only.
5. Agent identity is the tool/builder, not a persona name.
