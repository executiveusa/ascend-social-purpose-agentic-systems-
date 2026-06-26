#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cleanTenantSlug, createPublicKey, createSecretKey, defaultTenantProfile, tenantFrontendConfig } from '../packages/core/src/tenant.js';
import { ensureIcmWorkspace } from '../packages/core/src/icm.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'mission-data');
const ICM_ROOT = process.env.ICM_ROOT || path.join(ROOT, 'icm');
const args = process.argv.slice(2);

main().catch((err) => { console.error(`missionctl error: ${err.message}`); process.exit(1); });

async function main() {
  const [group, cmd, value] = args;
  if (!group || group === 'help' || group === '--help') return help();
  if (group === 'doctor') return doctor();
  if (group === 'tenant' && cmd === 'create') return tenantCreate(value || getFlag('--slug') || 'new-nonprofit');
  if (group === 'tenant' && cmd === 'keys') return tenantKeys(value || getFlag('--slug') || 'asc3nd');
  if (group === 'frontend' && cmd === 'scaffold') return frontendScaffold(value || getFlag('--slug') || 'asc3nd');
  if (group === 'hostinger' && cmd === 'handoff') return hostingerHandoff(value || getFlag('--slug') || 'asc3nd');
  if (group === 'smoke') return smoke(cmd || value || getFlag('--slug') || 'asc3nd');
  if (group === 'backup') return backup(cmd || value || getFlag('--slug') || 'asc3nd');
  if (group === 'restore') return restore(cmd || value || getFlag('--file'));
  throw new Error(`Unknown command: ${args.join(' ')}`);
}

function help() {
  console.log(`Mission OS control plane\n\nCommands:\n  missionctl doctor\n  missionctl tenant create <slug> --org "Org Name" --region "Seattle" --domain "https://client.org"\n  missionctl tenant keys <slug>\n  missionctl frontend scaffold <slug>\n  missionctl hostinger handoff <slug> --domain "client.org" --api-domain "api.client.org" --email "admin@client.org" --vps-ip "1.2.3.4"\n  missionctl smoke <slug>\n  missionctl backup <slug>\n  missionctl restore <backup-json>\n`);
}

function tenantCreate(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const orgName = getFlag('--org') || titleCase(tenantId);
  const domain = normalizeDomain(getFlag('--domain') || `https://${tenantId}.org`);
  const apiBaseUrl = normalizeDomain(getFlag('--api') || getFlag('--api-domain') || 'http://localhost:4000');
  const region = getFlag('--region') || 'Seattle / King County';
  const profile = defaultTenantProfile({ tenantId, orgName, region, niche: getFlag('--niche') || 'youth, sports, mentorship' });
  profile.publicOrigins = Array.from(new Set(['http://localhost:3000', domain].filter(Boolean)));
  profile.domain = domain;
  profile.apiBaseUrl = apiBaseUrl;
  const publicKey = createPublicKey(tenantId);
  const secretKey = createSecretKey(tenantId);
  const tenantDir = path.join(DATA_DIR, tenantId);
  fs.mkdirSync(tenantDir, { recursive: true });
  writeJson(path.join(tenantDir, 'profile.json'), profile);
  writeJson(path.join(tenantDir, 'keys.json'), { tenantId, publicKey, secretKeyHash: hash(secretKey), createdAt: new Date().toISOString(), allowedOrigins: profile.publicOrigins, apiBaseUrl });
  writeJson(path.join(tenantDir, 'contacts.json'), []);
  writeJson(path.join(tenantDir, 'interactions.json'), []);
  writeJson(path.join(tenantDir, 'pipeline-items.json'), []);
  writeJson(path.join(tenantDir, 'tasks.json'), []);
  ensureIcmWorkspace({ base: ICM_ROOT, tenantId, orgName });
  appendLog({ event: 'tenant.created', tenantId, orgName, domain, apiBaseUrl });
  console.log(JSON.stringify({ ok: true, tenantId, orgName, publicKey, secretKey, allowedOrigins: profile.publicOrigins, apiBaseUrl, next: [`missionctl frontend scaffold ${tenantId}`, `missionctl hostinger handoff ${tenantId} --domain ${domain.replace(/^https?:\/\//, '')}`] }, null, 2));
}

function tenantKeys(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const file = path.join(DATA_DIR, tenantId, 'keys.json');
  if (!fs.existsSync(file)) throw new Error(`No keys found for ${tenantId}. Run tenant create first.`);
  const keys = readJson(file, {});
  console.log(JSON.stringify({ tenantId, publicKey: keys.publicKey, apiBaseUrl: keys.apiBaseUrl, allowedOrigins: keys.allowedOrigins || [], note: 'Secret keys are only printed at creation time. Rotate if lost.' }, null, 2));
}

function frontendScaffold(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const profile = readJson(path.join(DATA_DIR, tenantId, 'profile.json'), defaultTenantProfile({ tenantId }));
  const keys = readJson(path.join(DATA_DIR, tenantId, 'keys.json'), {});
  const out = path.join(ROOT, 'client-frontends', tenantId);
  fs.mkdirSync(path.join(out, 'app'), { recursive: true });
  const config = tenantFrontendConfig(profile, keys);
  writeJson(path.join(out, 'mission.config.json'), config);
  fs.writeFileSync(path.join(out, '.env.local'), `NEXT_PUBLIC_MISSION_API_URL=${config.apiBaseUrl}\nNEXT_PUBLIC_MISSION_TENANT=${tenantId}\nNEXT_PUBLIC_MISSION_PUBLIC_KEY=${keys.publicKey || ''}\n`, 'utf8');
  fs.writeFileSync(path.join(out, 'README.md'), `# ${profile.orgName} Frontend\n\nThis frontend is wired to the shared Mission OS backend via tenant \`${tenantId}\`.\n\n## Required env\n\n\`\`\`bash\nNEXT_PUBLIC_MISSION_API_URL=${config.apiBaseUrl}\nNEXT_PUBLIC_MISSION_TENANT=${tenantId}\nNEXT_PUBLIC_MISSION_PUBLIC_KEY=${keys.publicKey || 'generate with missionctl tenant keys'}\n\`\`\`\n`, 'utf8');
  fs.writeFileSync(path.join(out, 'app', 'mission-client-example.js'), `import { MissionClient } from '@asc3nd/mission-sdk-js';\n\nexport const mission = new MissionClient(${JSON.stringify({ apiBaseUrl: config.apiBaseUrl, tenant: tenantId, publicKey: config.publicApiKey }, null, 2)});\n`, 'utf8');
  fs.writeFileSync(path.join(out, 'llms.txt'), `# ${profile.orgName}\n\nMission: ${profile.mission}\n\nPrograms: ${profile.programs}\n\nThis site connects to Mission OS tenant: ${tenantId}.\n`, 'utf8');
  appendLog({ event: 'frontend.scaffolded', tenantId, out });
  console.log(JSON.stringify({ ok: true, tenantId, out, files: ['mission.config.json', '.env.local', 'app/mission-client-example.js', 'llms.txt'] }, null, 2));
}

function hostingerHandoff(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const profile = readJson(path.join(DATA_DIR, tenantId, 'profile.json'), defaultTenantProfile({ tenantId, orgName: titleCase(tenantId) }));
  const keys = readJson(path.join(DATA_DIR, tenantId, 'keys.json'), {});
  const domain = normalizeDomain(getFlag('--domain') || profile.domain || `${tenantId}.org`);
  const apiDomain = normalizeDomain(getFlag('--api-domain') || `api.${domain.replace(/^https?:\/\//, '')}`);
  const adminEmail = getFlag('--email') || 'admin@example.org';
  const vpsIp = getFlag('--vps-ip') || '<HOSTINGER_VPS_IP>';
  const appDir = getFlag('--app-dir') || `/opt/mission-os`;
  const out = path.join(ROOT, 'handoff', tenantId);
  fs.mkdirSync(out, { recursive: true });
  const env = buildEnv({ tenantId, domain, apiDomain, adminEmail, appDir });
  fs.writeFileSync(path.join(out, '.env.production'), env, 'utf8');
  fs.writeFileSync(path.join(out, 'frontend.env'), `NEXT_PUBLIC_MISSION_API_URL=${apiDomain}\nNEXT_PUBLIC_MISSION_TENANT=${tenantId}\nNEXT_PUBLIC_MISSION_PUBLIC_KEY=${keys.publicKey || '<RUN missionctl tenant create FIRST>'}\n`, 'utf8');
  fs.writeFileSync(path.join(out, 'Caddyfile'), buildCaddyfile({ domain, apiDomain, adminEmail }), 'utf8');
  fs.writeFileSync(path.join(out, 'docker-compose.production.yml'), buildCompose(), 'utf8');
  fs.writeFileSync(path.join(out, 'smoke-test.sh'), buildSmoke({ tenantId, apiDomain, publicKey: keys.publicKey || '<PUBLIC_KEY>' }), { mode: 0o755 });
  const handoff = buildHandoff({ tenantId, profile, domain, apiDomain, adminEmail, vpsIp, appDir, publicKey: keys.publicKey || '<PUBLIC_KEY>' });
  fs.writeFileSync(path.join(out, 'HOSTINGER-VPS-HANDOFF.md'), handoff, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'HOSTINGER-VPS-HANDOFF.md'), handoff, 'utf8');
  appendLog({ event: 'hostinger.handoff.generated', tenantId, out, domain, apiDomain });
  console.log(JSON.stringify({ ok: true, tenantId, out, handoff: path.join(out, 'HOSTINGER-VPS-HANDOFF.md'), copiedRootHandoff: path.join(ROOT, 'HOSTINGER-VPS-HANDOFF.md') }, null, 2));
}

function doctor() {
  const checks = [
    ['package.json', fs.existsSync(path.join(ROOT, 'package.json'))],
    ['ICM template', fs.existsSync(path.join(ROOT, 'icm', 'tenant-template', 'CONTEXT.md'))],
    ['missionctl', fs.existsSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'))],
    ['Rust mission core source', fs.existsSync(path.join(ROOT, 'services', 'mission-core-rs', 'Cargo.toml'))],
    ['Mission SDK', fs.existsSync(path.join(ROOT, 'packages', 'mission-sdk-js', 'src', 'index.js'))],
    ['ACFS vendor notes', fs.existsSync(path.join(ROOT, 'vendor', 'acfs', 'README.md'))],
    ['Hostinger handoff command', fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8').includes('hostingerHandoff')],
    ['AdamsReview-lite script', fs.existsSync(path.join(ROOT, 'scripts', 'adamsreview-lite.mjs'))]
  ];
  const failed = checks.filter(([, ok]) => !ok);
  console.table(checks.map(([name, ok]) => ({ check: name, status: ok ? 'ok' : 'missing' })));
  if (failed.length) process.exit(1);
}

async function smoke(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const keys = readJson(path.join(DATA_DIR, tenantId, 'keys.json'), null);
  if (!keys) throw new Error(`Tenant ${tenantId} does not exist.`);
  const workspace = path.join(ICM_ROOT, 'tenants', tenantId);
  console.log(JSON.stringify({ ok: true, tenantId, checks: ['tenant exists', 'keys exist', fs.existsSync(workspace) ? 'ICM workspace exists' : 'ICM workspace missing'], publicKey: keys.publicKey, allowedOrigins: keys.allowedOrigins || [] }, null, 2));
}

function backup(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(ROOT, 'backups', `${tenantId}-${stamp}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeJson(out, { tenantId, data: readDirJson(path.join(DATA_DIR, tenantId)), icm: readIcmFiles(path.join(ICM_ROOT, 'tenants', tenantId)), at: new Date().toISOString(), format: 'mission-os-backup-v1' });
  console.log(JSON.stringify({ ok: true, tenantId, backup: out }, null, 2));
}

function restore(file) {
  if (!file) throw new Error('restore requires a backup JSON file');
  const backup = readJson(path.resolve(file), null);
  if (!backup?.tenantId) throw new Error('Invalid backup file');
  const tenantId = cleanTenantSlug(backup.tenantId);
  for (const [name, value] of Object.entries(backup.data || {})) writeJson(path.join(DATA_DIR, tenantId, name), value);
  for (const [rel, body] of Object.entries(backup.icm || {})) {
    const safeRel = rel.split(/[\\/]+/).filter((part) => part && part !== '..').join(path.sep);
    const target = path.join(ICM_ROOT, 'tenants', tenantId, safeRel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body, 'utf8');
  }
  appendLog({ event: 'tenant.restored', tenantId, file });
  console.log(JSON.stringify({ ok: true, tenantId, restoredFrom: file }, null, 2));
}

function buildEnv({ tenantId, domain, apiDomain, adminEmail, appDir }) {
  const jwt = crypto.randomBytes(32).toString('hex');
  const pgPassword = crypto.randomBytes(18).toString('base64url');
  return `NODE_ENV=production\nPORT=4000\nPUBLIC_SITE_URL=${domain}\nPUBLIC_API_URL=${apiDomain}\nCORS_ORIGIN=${domain},${apiDomain}\nDATA_DIR=${appDir}/mission-data\nICM_ROOT=${appDir}/icm\nJWT_SECRET=${jwt}\nDEMO_ADMIN_EMAIL=${adminEmail}\nDEMO_ADMIN_PASSWORD=CHANGE_THIS_ADMIN_PASSWORD_BEFORE_START\nPOSTGRES_DB=mission_os\nPOSTGRES_USER=mission\nPOSTGRES_PASSWORD=${pgPassword}\nDATABASE_URL=postgres://mission:${pgPassword}@postgres:5432/mission_os\nRATE_LIMIT_MAX=240\nJSON_LIMIT=10mb\nDEFAULT_TENANT=${tenantId}\n# Optional live adapters. Leave blank to stay in approval-gated dry-run mode.\nLITELLM_API_KEY=\nPI_AGENT_COMMAND=\nABSURD_ENABLED=false\nSANDCASTLE_ENABLED=false\nCOMPOSIO_API_KEY=\nPOSTIZ_API_URL=\nPOSTIZ_API_KEY=\nTWILIO_ACCOUNT_SID=\nTWILIO_AUTH_TOKEN=\nACFS_HOME=/opt/acfs\n`;
}

function buildCaddyfile({ domain, apiDomain, adminEmail }) {
  return `{
  email ${adminEmail}
}

${apiDomain.replace(/^https?:\/\//, '')} {
  encode gzip zstd
  reverse_proxy mission-api:4000
}

${domain.replace(/^https?:\/\//, '')} {
  encode gzip zstd
  reverse_proxy site:3000
}
`;
}

function buildCompose() {
  return `services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: .env.production
    volumes:
      - mission-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5
  mission-api:
    build:
      context: .
      dockerfile: deploy/Dockerfile.api
    restart: unless-stopped
    env_file: .env.production
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./mission-data:/app/mission-data
      - ./icm:/app/icm
  site:
    build:
      context: .
      dockerfile: deploy/Dockerfile.web
    restart: unless-stopped
    env_file: .env.production
    depends_on:
      - mission-api
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - site
      - mission-api
volumes:
  mission-postgres:
  caddy-data:
  caddy-config:
`;
}

function buildSmoke({ tenantId, apiDomain, publicKey }) {
  return `#!/usr/bin/env bash
set -euo pipefail
API="${apiDomain}"
TENANT="${tenantId}"
PUBLIC_KEY="${publicKey}"

echo "Health check"
curl -fsS "$API/api/health" | jq .

echo "Public bridge check"
curl -fsS -X POST "$API/api/public/$TENANT/volunteer" \\
  -H "content-type: application/json" \\
  -H "x-mission-public-key: $PUBLIC_KEY" \\
  -H "x-idempotency-key: smoke-$(date +%s)" \\
  -d '{"name":"Smoke Test","email":"smoke@example.org","message":"Hostinger bridge test."}' | jq .
`;
}

function buildHandoff({ tenantId, profile, domain, apiDomain, adminEmail, vpsIp, appDir, publicKey }) {
  return `# Hostinger VPS Handoff — Mission OS v0.5

Tenant: **${tenantId}**  
Organization: **${profile.orgName || titleCase(tenantId)}**  
Public site: **${domain}**  
API: **${apiDomain}**  
VPS IP: **${vpsIp}**

## Goal

Deploy the shared Mission OS backend once, then connect this nonprofit's custom frontend through the reusable public bridge. Future client frontends only need tenant slug, public key, and API URL.

## DNS records

Create these A records in Hostinger DNS:

| Type | Host | Value |
|---|---|---|
| A | @ | ${vpsIp} |
| A | api | ${vpsIp} |
| A | www | ${vpsIp} |

## VPS bootstrap

SSH into the VPS:

\`\`\`bash
ssh root@${vpsIp}
apt update && apt upgrade -y
apt install -y git curl jq unzip rsync ca-certificates gnupg ufw
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER || true
mkdir -p ${appDir}
cd ${appDir}
\`\`\`

Upload or clone this release into \`${appDir}\`, then copy the generated files from \`handoff/${tenantId}/\`:

\`\`\`bash
cp handoff/${tenantId}/.env.production .env.production
cp handoff/${tenantId}/Caddyfile Caddyfile
cp handoff/${tenantId}/docker-compose.production.yml docker-compose.yml
\`\`\`

Before starting, edit:

\`\`\`bash
nano .env.production
\`\`\`

Required changes:

- Change \`DEMO_ADMIN_PASSWORD\`.
- Confirm \`PUBLIC_SITE_URL=${domain}\`.
- Confirm \`PUBLIC_API_URL=${apiDomain}\`.
- Leave live adapters blank until approvals and credentials are ready.

## Deploy

\`\`\`bash
docker compose up -d --build
docker compose ps
docker compose logs -f mission-api
\`\`\`

## Create or verify tenant

On the VPS:

\`\`\`bash
node missionctl/missionctl.mjs doctor
node missionctl/missionctl.mjs tenant create ${tenantId} --org "${profile.orgName || titleCase(tenantId)}" --domain "${domain}" --api "${apiDomain}"
node missionctl/missionctl.mjs frontend scaffold ${tenantId}
node missionctl/missionctl.mjs smoke ${tenantId}
\`\`\`

## Custom frontend bridge env

Put this in the custom frontend:

\`\`\`bash
NEXT_PUBLIC_MISSION_API_URL=${apiDomain}
NEXT_PUBLIC_MISSION_TENANT=${tenantId}
NEXT_PUBLIC_MISSION_PUBLIC_KEY=${publicKey}
\`\`\`

Use the SDK:

\`\`\`js
import { MissionClient } from '@asc3nd/mission-sdk-js';

const mission = new MissionClient({
  apiBaseUrl: process.env.NEXT_PUBLIC_MISSION_API_URL,
  tenant: process.env.NEXT_PUBLIC_MISSION_TENANT,
  publicKey: process.env.NEXT_PUBLIC_MISSION_PUBLIC_KEY
});

await mission.volunteer.apply({ name, email, message });
\`\`\`

## Smoke test

From the VPS or local machine after DNS resolves:

\`\`\`bash
bash handoff/${tenantId}/smoke-test.sh
\`\`\`

Expected result: health returns \`ok: true\`; public bridge returns a receipt, contact id, and pipeline item id.

## Backup

Run before every major update:

\`\`\`bash
node missionctl/missionctl.mjs backup ${tenantId}
\`\`\`

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

\`\`\`bash
node missionctl/missionctl.mjs tenant create client-slug --org "Client Org" --domain "https://client.org" --api "${apiDomain}"
node missionctl/missionctl.mjs frontend scaffold client-slug
node missionctl/missionctl.mjs hostinger handoff client-slug --domain "client.org" --api-domain "api.client.org" --vps-ip "${vpsIp}"
\`\`\`
`;
}

function getFlag(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function hash(v) { return crypto.createHash('sha256').update(String(v)).digest('hex'); }
function titleCase(slug) { return slug.split('-').map((s) => s.slice(0,1).toUpperCase() + s.slice(1)).join(' '); }
function appendLog(entry) { const file = path.join(DATA_DIR, 'missionctl.jsonl'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.appendFileSync(file, JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n'); }
function readDirJson(dir) { const out = {}; if (!fs.existsSync(dir)) return out; for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) out[f] = readJson(path.join(dir, f), null); return out; }
function readIcmFiles(dir) { const out = {}; if (!fs.existsSync(dir)) return out; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const full = path.join(d, e.name); if (e.isDirectory()) walk(full); else out[path.relative(dir, full)] = fs.readFileSync(full, 'utf8'); } }; walk(dir); return out; }
function normalizeDomain(value = '') { const raw = String(value || '').trim(); if (!raw) return ''; return /^https?:\/\//.test(raw) ? raw.replace(/\/$/, '') : `https://${raw.replace(/\/$/, '')}`; }
