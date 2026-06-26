# Hostinger VPS Handoff — Mission OS v0.5

Tenant: **asc3nd**  
Organization: **Asc3nd Collective**  
Public site: **https://asc3nd.org**  
API: **https://api.asc3nd.org**  
VPS IP: **<HOSTINGER_VPS_IP>**

## Goal

Deploy the shared Mission OS backend once, then connect this nonprofit's custom frontend through the reusable public bridge. Future client frontends only need tenant slug, public key, and API URL.

## DNS records

Create these A records in Hostinger DNS:

| Type | Host | Value |
|---|---|---|
| A | @ | <HOSTINGER_VPS_IP> |
| A | api | <HOSTINGER_VPS_IP> |
| A | www | <HOSTINGER_VPS_IP> |

## VPS bootstrap

SSH into the VPS:

```bash
ssh root@<HOSTINGER_VPS_IP>
apt update && apt upgrade -y
apt install -y git curl jq unzip rsync ca-certificates gnupg ufw
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER || true
mkdir -p /opt/mission-os
cd /opt/mission-os
```

Upload or clone this release into `/opt/mission-os`, then copy the generated files from `handoff/asc3nd/`:

```bash
cp handoff/asc3nd/.env.production .env.production
cp handoff/asc3nd/Caddyfile Caddyfile
cp handoff/asc3nd/docker-compose.production.yml docker-compose.yml
```

Before starting, edit:

```bash
nano .env.production
```

Required changes:

- Change `DEMO_ADMIN_PASSWORD`.
- Confirm `PUBLIC_SITE_URL=https://asc3nd.org`.
- Confirm `PUBLIC_API_URL=https://api.asc3nd.org`.
- Leave live adapters blank until approvals and credentials are ready.

## Deploy

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f mission-api
```

## Create or verify tenant

On the VPS:

```bash
node missionctl/missionctl.mjs doctor
node missionctl/missionctl.mjs tenant create asc3nd --org "Asc3nd Collective" --domain "https://asc3nd.org" --api "https://api.asc3nd.org"
node missionctl/missionctl.mjs frontend scaffold asc3nd
node missionctl/missionctl.mjs smoke asc3nd
```

## Custom frontend bridge env

Put this in the custom frontend:

```bash
NEXT_PUBLIC_MISSION_API_URL=https://api.asc3nd.org
NEXT_PUBLIC_MISSION_TENANT=asc3nd
NEXT_PUBLIC_MISSION_PUBLIC_KEY=pk_mission_YXNjM25kOjY0NWNlZmU3ZGU4NWNl
```

Use the SDK:

```js
import { MissionClient } from '@asc3nd/mission-sdk-js';

const mission = new MissionClient({
  apiBaseUrl: process.env.NEXT_PUBLIC_MISSION_API_URL,
  tenant: process.env.NEXT_PUBLIC_MISSION_TENANT,
  publicKey: process.env.NEXT_PUBLIC_MISSION_PUBLIC_KEY
});

await mission.volunteer.apply({ name, email, message });
```

## Smoke test

From the VPS or local machine after DNS resolves:

```bash
bash handoff/asc3nd/smoke-test.sh
```

Expected result: health returns `ok: true`; public bridge returns a receipt, contact id, and pipeline item id.

## Backup

Run before every major update:

```bash
node missionctl/missionctl.mjs backup asc3nd
```

Store backups outside the VPS as well.

## Safety gates

Keep the system in dry-run mode until these are live-tested:

- Postgres persistence/restore drill.
- Tenant isolation tests.
- Approval queue for orange/red actions.
- Postiz scheduling only after approval.
- Composio/MCP allowlist.
- Sandcastle execution isolation.

## Repeatable deployment rule

For the next client, do not fork the backend. Run:

```bash
node missionctl/missionctl.mjs tenant create client-slug --org "Client Org" --domain "https://client.org" --api "https://api.asc3nd.org"
node missionctl/missionctl.mjs frontend scaffold client-slug
node missionctl/missionctl.mjs hostinger handoff client-slug --domain "client.org" --api-domain "api.client.org" --vps-ip "<HOSTINGER_VPS_IP>"
```
