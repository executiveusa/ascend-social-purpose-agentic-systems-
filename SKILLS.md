# SKILLS.md — Asc3nd Social Purpose OS External Skill Registry

Source: `REQUIRED EXTERNAL REPO SKILLS.txt` (sections 4 & 5).
Rule: do not blindly install every repo. Classify by purpose, implement only
the useful parts or create stubs/adapters, and report usage status.

Status legend:
- **direct** — used directly in this build (installed / wired)
- **conceptual** — pattern adopted without the repo itself
- **stub** — adapter seam present, real integration deferred
- **deferred** — not yet relevant; reason recorded

---

## 1. Agent orchestration / execution

| Repo | Status | Use in this build |
|---|---|---|
| `jgravelle/jcodemunch-mcp` | **direct** | MCP server registered in `.vscode/mcp.json`; project config in `.jcodemunch.jsonc`. Symbol-level code retrieval to cut token usage during P0 work. |
| `ast-grep/ast-grep-mcp` | **stub** | Structural search adapter seam. Defer until Rust core lands; `search_ast` from jcodemunch covers near-term need. |
| `paperclipai/paperclip` | **conceptual** | Multi-agent orchestration pattern. We keep ICM as the single-primary-agent model; Paperclip's `.mcp.json` auto-detect pattern is adopted for `.vscode/mcp.json`. |
| `revfactory/claude-code-harness` | **deferred** | Claude Code-specific harness; not the host here. Revisit if Claude Code becomes the builder shell. |
| `HKUDS/OpenHarness` | **deferred** | General agent benchmark harness; no benchmark lane in v0.5. Revisit for regression gate. |
| `browser-use/browser-harness` | **stub** | Browser automation seam maps to the agent-browser skill already available. Use for E2E smoke of public bridge forms. |
| `skrun-dev/skrun` | **deferred** | Sandcastle-style execution isolation is already a named adapter seam (`SANDCASTLE_ENABLED`); skrun not wired. |
| `knowsuchagency/mcp2cli` | **deferred** | CLI-from-MCP bridge; missionctl already owns the CLI surface. |
| `modelcontextprotocol/ext-apps` | **conceptual** | External-app MCP pattern informs how Postiz/Composio adapters expose tools. |

## 2. Review / quality / merge discipline

| Repo | Status | Use in this build |
|---|---|---|
| `adamjgmiller/adamsreview` | **direct** | `scripts/adamsreview-lite.mjs` is the release gate (`npm run adamsreview`). Multi-lens review loop is the review standard in the architect prompt. |
| `jonwiggins/optio` | **conceptual** | Option/decision-tracking pattern adopted into the Beads `decisions/` ledger. |
| `ReviewStage/stage-cli` | **deferred** | Staged review CLI; AdamsReview-lite covers the gate. Revisit for PR-stage enforcement. |
| `realrossmanngroup/no_ai_slop_writing_rules` | **direct** | Copy-clarity rule: no vague AI copy (architect non-negotiable). Enforced in UX hardening tasks. |
| `pbakaus/impeccable` | **conceptual** | Design quality gate (clarity ≥ 8.5, hierarchy ≥ 8.5, WCAG AA) adopted into design audit requirements. |
| `gsd-build/get-shit-done` | **conceptual** | Task-discipline pattern; maps to the P0 task list with acceptance criteria. |
| `stateright/stateright` | **deferred** | State-machine formal verification; overkill for v0.5. Revisit for approval/outbox state machine. |

## 3. Knowledge ingestion / transformation

| Repo | Status | Use in this build |
|---|---|---|
| `safishamsi/graphify` | **conceptual** | Knowledge-graph pattern informs ICM artifact indexing into the DB (P0-5). |
| `mattpocock/skills` | **conceptual** | Skill-file format informs this registry and `.vscode/mcp.json` structure. |
| `mattpocock/dictionary-of-ai-coding` | **deferred** | Glossary; not needed for nonprofit UX. |
| `mattpocock/agent-rules-books` | **conceptual** | Rules-book pattern adopted into `AGENTS.md` product/safety/ICM rules. |
| `zarazhangrui/codebase-to-course` | **deferred** | Onboarding course generation; revisit for tenant onboarding. |
| `virgiliojr94/book-to-skill` | **deferred** | Book-to-skill; no content pipeline yet. |
| `Lum1104/Understand-Anything` | **deferred** | Repo understanding; jcodemunch covers this. |
| `zakirullin/files.md` | **deferred** | File-structure convention; ICM already owns structure. |

## 4. UI / content / app generation

| Repo | Status | Use in this build |
|---|---|---|
| `sabertazimi/blog` | **conceptual** | Blog template reference for public-site content sections (donor/volunteer/sponsor pathways). |
| `darula-hpp/uigen` | **deferred** | UI generation; Next.js cockpit already exists. Revisit for tenant frontend scaffolding. |
| `dolanmiu/docx` | **stub** | Document export seam for board updates / grant packages. Defer until report lane lands. |
| `agent0ai/space-agent` | **deferred** | Agent UI; not the UX model (outcome language, not agent jargon). |
| `kanwas-ai/kanwas` | **deferred** | UI gen; deferred. |
| `html-in-canvas.dev` | **deferred** | Canvas UI; not relevant. |
| `yui540/comimi` | **deferred** | UI; deferred. |
| `robonuggets/hyperframes-helper` | **deferred** | Animation; deferred. |

## 5. Social publishing / distribution

| Repo | Status | Use in this build |
|---|---|---|
| `gitroomhq/postiz-app` | **stub** | Postiz is a named adapter seam (`POSTIZ_API_URL`, `POSTIZ_API_KEY`). Approval-gated; no live integration until credentials approved. |

## 6. Backend / DB / auth / infra

| Repo | Status | Use in this build |
|---|---|---|
| `supabase-community/supabase-mcp` | **direct** | Supabase is the Postgres provider (project `kbphngxqozmpfrbdzgca`). MCP available for schema/migration work during P0-2. |
| `earendil-works/absurd` | **stub** | Absurd is a named adapter seam (`ABSURD_ENABLED`). Deferred until execution-isolation design lands. |
| `upstash/context7` | **direct** | Context7 MCP available for library docs lookups during P0 implementation. |
| `perplexityai/modelcontextprotocol` | **deferred** | Perplexity MCP; not wired. |
| `vercel-labs/opensrc` | **conceptual** | Open-source contribution pattern; informs repo structure and `AGENTS.md`. |
| `InsForge/InsForge` | **deferred** | Backend scaffold; we already have the Mission OS backend. |

## 7. AI model routing / cost reduction

| Repo | Status | Use in this build |
|---|---|---|
| `executiveusa/pauli-Uncodixfy` | **conceptual** | Model-routing/cost pattern informs `packages/core/src/model-router.js` and `config/model-policy.json`. |
| `mnfst/awesome-free-llm-apis` | **deferred** | Free-LLM catalog; revisit when LiteLLM routing goes live. |
| `Andyyyy64/whichllm` | **deferred** | Model selector; model-router covers this. |
| `Alishahryar1/free-claude-code` | **deferred** | Free Claude access; not the builder model here (GLM is). |
| `rtk-ai/rtk` | **deferred** | Routing toolkit; deferred. |

## 8. Visual / interaction / future interface

| Repo | Status | Use in this build |
|---|---|---|
| `executiveusa/VisionClaw` | **deferred** | Vision interface; not in v0.5 scope. |
| `human-avatar/skills-for-humanity` | **deferred** | Avatar UX; not for nonprofit operators. |
| `disler/poc-realtime-ai-assistant` | **deferred** | Realtime assistant; deferred. |
| `disler/claude-code-hooks-multi-agent-observability` | **conceptual** | Hook-based observability pattern informs the audit log + outbox design (P0-4). |
| `yetone/native-feel-skill` | **deferred** | Native-feel UX; deferred. |

---

## Summary report

- **Used directly (4):** jcodemunch-mcp, adamsreview, supabase-mcp, context7.
- **Used conceptually (11):** paperclip, ext-apps, optio, no_ai_slop_writing_rules, impeccable, get-shit-done, graphify, mattpocock/skills, agent-rules-books, sabertazimi/blog, pauli-Uncodixfy, opensrc, claude-code-hooks-multi-agent-observability.
- **Stub adapters (5):** ast-grep-mcp, browser-harness, postiz-app, absurd, docx.
- **Deferred (24):** remainder — each deferred because a covering mechanism already exists in the Mission OS, the scope is out of v0.5, or the host/builder mismatch makes it irrelevant.

## Beads protocol

All major actions write a Bead in `beads/`. See `beads/BEADS_PROTOCOL.md`.
No "done" claim without a Bead.
