# Spec: PNW Nonprofit Offer

## Purpose

Define the product offer for Pacific Northwest nonprofits that v0.6 enables.

## Offer

**Mission OS v0.6 — Managed Agent Bundle for PNW Nonprofits**

A self-hosted AI operating system that gives your nonprofit:
- Grant opportunity scanning (automated, approval-gated)
- Social media campaign drafting (Postiz integration, approval-gated)
- Outcome tracking and reporting
- Founder Second Brain (Obsidian-compatible knowledge vault)
- Per-tenant agent pack (3 agents included)
- LiteLLM model gateway (cost-controlled routing)
- Open WebUI workspace (chat with your agents)
- Langfuse observability (see every agent action)
- One-command deployment via missionctl

## Pricing model (v0.6 target)

| Tier | Price/mo | Includes |
|---|---|---|
| Starter | $99 | 1 tenant, 3 agents, standard model tier, community support |
| Growth | $299 | 3 tenants, 10 agents, critical model tier, priority support |
| Impact | Custom | Unlimited tenants, custom agent packs, dedicated VPS, SLA |

**Cost structure:** Mission OS is self-hosted. Pricing covers the managed bundle (setup, updates, monitoring) + model usage passthrough (at cost via LiteLLM).

## Target customers

1. **Seattle/King County youth organizations** — grant scouting + outcome tracking
2. **Pacific Northwest sports programs** — scheduling + campaign drafting
3. **Community arts organizations** — event promotion + impact storytelling
4. **Social purpose corporations** — compliance reporting + donor management

## What makes this different

- **Not a chatbot** — full operating system with ICM, approvals, audit trail.
- **Not autonomous** — human approval gates on all orange/red actions.
- **Not SaaS** — self-hosted on your VPS, you own the data.
- **Not per-seat** — priced per tenant (organization), not per user.
- **Not model-locked** — LiteLLM routes to any provider; switch models without code changes.

## Deployment promise

From zero to running in 4 steps:
```bash
missionctl tenant create your-org --org "Your Org" --domain "https://yourorg.org"
missionctl agent-pack create your-org northwest-nonprofit-standard
missionctl bundle init your-org
missionctl bundle apply your-org
```

## Safety promise

- No automated grant submission without human approval.
- No outbound communication (email, social, calls) without human approval.
- No youth/family/donor data exposure without explicit approval.
- Every action has an audit trail with model route and cost estimate.

## v0.6 readiness bar

This offer is live when:
1. `npm run verify` passes.
2. A tenant can be created, agent-pack generated, bundle deployed in under 30 minutes.
3. Smoke tests pass on a live Hostinger VPS.
4. All 8 production gaps from PRODUCTION-GAPS.md are closed.
5. At least one PNW nonprofit has completed onboarding.
