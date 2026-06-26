# Asc3nd Social Purpose OS

A repeatable, self-hostable AI operating system for Seattle nonprofits, youth programs, sports organizations, and social-purpose companies.

This is not just a website scaffold. It is a deployable product template with three separated layers:

1. **Custom public frontend** — client-specific website and AI-readable discovery layer.
2. **Reusable operations console** — onboarding, opportunities, grants, campaigns, calls, approvals, outcomes, founder second brain.
3. **Reusable backend operating system** — ICM workspaces, durable workflow seams, agent routing, safety, integrations, and audit logging.

The backend is designed to remain shared and repeatable. For each new client, customize the public site copy, theme, logo, mission files, and tenant config while keeping the backend stable.


## Hard-truth production review

Read these before using the system for paid production:

- `docs/GOLD-STANDARD-AUDIT.md` — self-review, design critique, and golden-standard backlog.
- `docs/PRODUCTION-GAPS.md` — non-negotiable production gaps.
- `npm run doctor` — checks ICM, flywheel vendor overlay, scripts, and deployment scaffolds.
- `INSTALL_ACFS=true bash scripts/bootstrap-vps.sh` — optionally installs ACFS before bootstrapping the app on a VPS.

## Local quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Open:

- Public site: http://localhost:3000
- Login: http://localhost:3000/login
- Ops cockpit: http://localhost:3000/ops
- API health: http://localhost:4000/api/health

Default demo login comes from `.env`:

```text
admin@asc3nd.local / change-this-password
```

## VPS quick start with the flywheel

On a fresh Ubuntu VPS, run ACFS first, then this repo:

```bash
# 1. Install the agentic coding flywheel on the VPS.
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/agentic_coding_flywheel_setup/main/install.sh?$(date +%s)" | bash -s -- --yes --mode vibe

# 2. Upload or git clone this repo into /data/projects.
cd /data/projects/asc3nd-social-purpose-os
cp .env.example .env
nano .env

# 3. Launch.
bash scripts/bootstrap-vps.sh
```

## What is production-ready here

- Running Next.js frontend and Node API.
- Docker Compose deployment.
- File-backed tenant store for local/demo mode.
- ICM workspace generation and stage contracts.
- Opportunity scoring engine.
- Approval queue and audit log.
- Postiz, Pi, Absurd, Sandcastle, Composio, LiteLLM, Twilio adapter seams.
- Founder Second Brain and Obsidian-compatible vault structure.
- LLM export/import normalizer for ChatGPT/Claude/generic markdown-style exports.
- AI-readable `llms.txt`, `robots.txt`, sitemap, and JSON-LD.
- TDD test scaffolds for safety, routing, ICM, and opportunities.

## What still needs keys or real services

The app runs without external keys in dry-run mode. To perform real submits, posts, calls, or agent execution, connect credentials for Postiz, Composio/MCP, Twilio, LiteLLM, Pi, Absurd, and Sandcastle. Human approval gates remain mandatory for money, youth data, legal/compliance, public publishing, and external communication.


## v0.4 Production Core

This package now includes Rust service source for the production core, Mission Connect frontend bridge, nonprofit CRM helpers, JS SDK, tenant kit, `missionctl`, Postgres migration, and repeatable tenant/front-end scaffolding. See `docs/V0.4-PRODUCTION-CORE.md`.

Quick tenant loop:

```bash
node missionctl/missionctl.mjs tenant create northwest-youth --org "Northwest Youth"
node missionctl/missionctl.mjs frontend scaffold northwest-youth
node missionctl/missionctl.mjs smoke northwest-youth
npm run verify
```

## v0.5 Production Handoff

v0.5 adds the repeatable deployment bridge needed for paid Northwest nonprofit rollouts:

- Hostinger VPS handoff generator
- Tenant-specific production env bundle
- Caddy and Docker production templates
- Frontend bridge env handoff
- Public bridge idempotency and honeypot guard
- Public submissions become CRM contacts, interactions, pipeline items, staff tasks, and audit events
- AdamsReview-lite release artifact

Generate a full Hostinger handoff for a tenant:

```bash
node missionctl/missionctl.mjs tenant create asc3nd \
  --org "Asc3nd Collective" \
  --domain "https://asc3nd.org" \
  --api "https://api.asc3nd.org"

node missionctl/missionctl.mjs frontend scaffold asc3nd

node missionctl/missionctl.mjs hostinger handoff asc3nd \
  --domain "asc3nd.org" \
  --api-domain "api.asc3nd.org" \
  --email "admin@asc3nd.org" \
  --vps-ip "<HOSTINGER_VPS_IP>"
```

Primary handoff file:

```text
HOSTINGER-VPS-HANDOFF.md
```

Tenant bundle:

```text
handoff/asc3nd/
  HOSTINGER-VPS-HANDOFF.md
  .env.production
  frontend.env
  Caddyfile
  docker-compose.production.yml
  smoke-test.sh
```
