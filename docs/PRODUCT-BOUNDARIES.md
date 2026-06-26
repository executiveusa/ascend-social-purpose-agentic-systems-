# Product Boundaries — Mission OS vs Client Frontend

This document defines the hard product boundary between the Mission OS
back-office suite and any client's public frontend website.

## Two separate products, two separate repos

### 1. Mission OS / back-office suite (this repo)

Purpose: the shared, repeatable backend product.

Owns:
- Admin login + ops cockpit (`apps/site/app/ops/*`, `apps/site/app/login`)
- Mission API (`services/mission-api`)
- Core domain logic (`packages/core`)
- Database layer (`packages/db`)
- Mission SDK (`packages/mission-sdk-js`) — published for clients to consume
- missionctl CLI (`missionctl`)
- ICM workspaces (`icm/`)
- Public bridge API (`POST /api/public/:tenant/:kind`)
- Hostinger VPS deployment (`handoff/`, `deploy/`)
- Docs and contracts (`docs/`, `docs/FRONTEND-BRIDGE-CONTRACT.md`)

Does NOT own:
- Any client's public landing page, marketing copy, or donation CTAs
- Client-specific branding, themes, or content
- Public forms pages (those live in the client frontend repo)

The root route `/` in this repo is a **product entry page** describing the
Mission OS itself — not a client website. It is the admin/ops entry point.

### 2. Client public frontend website (separate repo per client)

Example: `executiveusa/asc3nd-frontend-website-`

Purpose: the client's public-facing website.

Owns:
- Public homepage, about, programs, stories, donate, get-involved
- Public forms (volunteer, sponsor, program/parent, donor, general message)
- SEO, `llms.txt`, `robots.txt`, `sitemap.xml`, JSON-LD schema
- Client branding, theme, copy

Connects to Mission OS only through:
- `@asc3nd/mission-sdk-js` (or a copied client)
- Public env vars only: `NEXT_PUBLIC_MISSION_API_URL`,
  `NEXT_PUBLIC_MISSION_TENANT`, `NEXT_PUBLIC_MISSION_PUBLIC_KEY`
- No private backend secrets in the frontend repo.

## Architecture

```
Client Frontend Repo (per client)
  ↓ Mission SDK / public bridge
Mission OS Backend Repo (shared product)
  ↓
CRM + ICM + approvals + outbox + audit + Postgres
```

## Repeatable whitelabel rule

For each new client:
1. Create a new frontend repo from the frontend template.
2. Run `missionctl tenant create <slug>` in the backend repo.
3. Run `missionctl frontend scaffold <slug>` to generate the client config.
4. Point the frontend repo at the backend via `NEXT_PUBLIC_*` env vars.
5. Never customize backend code for a single client.

The backend repo stays shared product infrastructure. The frontend repo is
the only place client-specific branding and copy live.
