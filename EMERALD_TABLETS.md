# Emerald Tablets™ — Repo Constitution

This repo is governed by the **Emerald Tablets™** prime-directive governance layer
for the `executiveusa` org. The full skill lives outside the repo in the
read-only MASTER SKILLS BUNDLE (`emerald-tablets-SKILL.md`); this file is the
enforcement pointer every agent and human checks before code is written, before
a commit, and before a merge.

## What the Emerald Tablets govern (non-negotiable)

- **Quality gates.** Output is gated, not averaged. Nothing ships below the
  **8.5 / 10 quality floor** without explicit, documented human authorization
  in the commit message.
- **Ralphy Loop™.** Every change runs `write → test → fix → verify → report`,
  in that order, with a machine-readable `ops/reports/` artifact as the final
  stage. "Done" with no report entry is a failed REPORT stage.
- **Anti-vibe-code standards.** No marketing/hype language in code, comments,
  commit messages, docs, or UI copy — every claim must be measurable or named.
  Banned words (e.g. "seamless", "robust", "innovative") auto-fail review.
- **Architecture discipline.** Single responsibility per agent/module
  (no god classes, blast radius ≤ 3 services per automated action).

## Three-tier cascade

Tiers gate in order — a failure at an earlier tier halts evaluation of later ones:

1. **Tier 1 (language + quality):** Tablet I anti-hype law, Tablet II 8.5 floor.
2. **Tier 2 (architecture):** Tablet III taste, Tablet IV single responsibility,
   Tablet VI repo-as-product.
3. **Tier 3 (execution + culture):** Tablet V Ralphy Loop, Tablet VII market scope.

## For this repo specifically

- Quality floor: **8.5**. Phase gates enforced via `npm run verify:v06`.
- Secret Safety sub-floor: **≥ 8.0** — enforced by `scripts/secret-audit.mjs`.
- Generated-file hygiene: enforced by `scripts/generated-file-audit.mjs`
  (tracked runtime env / release-manifest artifacts are forbidden).
- No agent merges code that fails any tier. Fix in order.

When a more specific skill conflicts with a tablet, **the tablet wins**.
