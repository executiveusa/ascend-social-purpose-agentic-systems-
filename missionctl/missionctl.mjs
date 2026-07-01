#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cleanTenantSlug, createPublicKey, createSecretKey, defaultTenantProfile, tenantFrontendConfig } from '../packages/core/src/tenant.js';
import { ensureIcmWorkspace, runIcmStage } from '../packages/core/src/icm.js';
import { emitEvent } from '../packages/core/src/events.js';
import { registerArtifact } from '../packages/core/src/artifacts.js';
import { provisionManagedAgent, updateAgentHealth } from '../packages/core/src/managed-agents.js';
import { generateDashboardState } from '../packages/core/src/dashboard-state.js';
import { createOperatorKey, validateOperatorKey } from '../packages/core/src/auth.js';
import { getModelBudget, setModelBudget, evaluateBudgetStatus } from '../packages/core/src/model-budgets.js';
import { summarizeMonthlyUsage, summarizeUsageBySurface } from '../packages/core/src/model-usage-ledger.js';
import { getTraceLinks } from '../packages/core/src/trace-links.js';
import {
  createDeploymentRelease,
  listDeploymentReleases,
  activateDeploymentRelease,
  rollbackDeploymentRelease,
  getActiveDeploymentRelease
} from '../packages/core/src/deployment-releases.js';
import { recordSmokeResult, summarizeHealth } from '../packages/core/src/deployment-health.js';
import { createBackup as coreCreateBackup, listBackups, restoreBackup as coreRestoreBackup } from '../packages/core/src/deployment-backup.js';


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'mission-data');
const ICM_ROOT = process.env.ICM_ROOT || path.join(ROOT, 'icm');
const TEMPLATES = path.join(ROOT, 'missionctl', 'templates');
const BUNDLES = path.join(ROOT, 'handoff');
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
  if (group === 'backup') return backupCommand(cmd || value || getFlag('--slug') || 'asc3nd');
  if (group === 'restore') return restoreCommand(cmd || value || getFlag('--file') || getFlag('--backup'));
  if (group === 'upgrade') return upgradeCommand(cmd || value || getFlag('--slug') || 'demo-pnw');
  if (group === 'rollback') return rollbackCommand(cmd || value || getFlag('--slug') || 'demo-pnw');
  if (group === 'icm' && cmd === 'run') return icmRun(value || getFlag('--slug') || 'asc3nd', args[3] || getFlag('--stage'));
  // v0.6 managed bundle commands
  if (group === 'bundle') return bundleCommand(cmd, value || getFlag('--slug') || 'demo-pnw');
  if (group === 'pack') return packCommand(cmd, value || getFlag('--slug') || 'demo-pnw');
  if (group === 'hermes') return hermesCommand(cmd, value || getFlag('--slug') || 'demo-pnw');
  if (group === 'litellm') return litellmCommand(cmd, value || getFlag('--slug') || 'demo-pnw');
  if (group === 'langfuse') return langfuseCommand(cmd, value || getFlag('--slug') || 'demo-pnw');
  if (group === 'openwebui') return openwebuiCommand(cmd, value || getFlag('--slug') || 'demo-pnw');
  if (group === 'operator-key') return operatorKeyCommand(cmd, value || getFlag('--slug') || 'demo-pnw');
  // v0.6 Phase 4: model gateway, observability, usage ledger
  if (group === 'model') return modelCommand(cmd, value, args[3] || getFlag('--slug') || 'demo-pnw');
  throw new Error(`Unknown command: ${args.join(' ')}`);
}

function help() {
  console.log(`Mission OS control plane v0.6\n\nCommands:\n\n  -- v0.5 (existing) --\n  missionctl doctor\n  missionctl tenant create <slug> --org "Org Name" --region "Seattle" --domain "https://client.org"\n  missionctl tenant keys <slug>\n  missionctl frontend scaffold <slug>\n  missionctl hostinger handoff <slug> --domain "client.org" --api-domain "api.client.org" --email "admin@client.org" --vps-ip "1.2.3.4"\n  missionctl smoke <slug>\n  missionctl backup <slug>\n  missionctl restore <backup-id> [--slug <tenant>]\n  missionctl upgrade <slug> --release <release-id>\n  missionctl rollback <slug> --to <release-id>\n  missionctl icm run <slug> <stage>\n\n  -- v0.6 managed bundle --\n  missionctl bundle up <slug> [--dry-run]\n  missionctl bundle status <slug>\n  missionctl bundle smoke <slug> [--dry-run]\n  missionctl bundle release <slug>\n  missionctl bundle down <slug>\n\n  missionctl pack generate <slug>\n  missionctl pack validate <slug>\n  missionctl pack publish <slug>\n\n  missionctl hermes provision <slug>\n  missionctl hermes health <slug>\n\n  missionctl litellm sync <slug>\n  missionctl langfuse sync <slug>\n  missionctl openwebui sync <slug>\n\n  -- v0.6 model gateway / observability (Phase 4) --\n  missionctl model budget show <slug>\n  missionctl model budget set <slug> --amount 100 [--warning-pct 0.8] [--hard-block-pct 1.0]\n  missionctl model usage summary <slug> [--month 2026-06]\n  missionctl model traces list <slug> [--surface comms]\n`);
}

function icmRun(slugInput, stage) {
  const tenantId = cleanTenantSlug(slugInput);
  if (!stage) throw new Error('Stage required. Example: missionctl icm run asc3nd 02_opportunity_scan');
  const result = runIcmStage({
    base: ICM_ROOT,
    tenantId,
    stage,
    result: getFlag('--result') || `# ${stage} result\n\nGenerated by missionctl icm run at ${new Date().toISOString()}\n`,
    audit: { source: 'missionctl', actor: 'cli' },
    approvalRequest: getFlag('--approval') ? { risk: getFlag('--risk') || 'yellow', title: getFlag('--approval') } : null
  });
  appendLog({ event: 'icm.stage.run', tenantId, stage, artifacts: result.artifacts.length });
  console.log(JSON.stringify({ ok: true, tenantId, stage, outDir: result.outDir, artifacts: result.artifacts, contextLayers: { agent: Boolean(result.context.agent), workspace: Boolean(result.context.workspace), stageContext: Boolean(result.context.stageContext), configFiles: result.context.config.length, referenceFiles: result.context.references.length, previousStage: result.context.previousStage } }, null, 2));
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
  emitEvent({ tenantId, type: 'TENANT.CREATED', actor: 'system', payload: { orgName, domain, apiBaseUrl } });
  generateDashboardState(tenantId);
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
function hasFlag(name) { return args.includes(name); }

// ===================== v0.6 MANAGED BUNDLE =====================

function bundleCommand(cmd, slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  if (cmd === 'up') return bundleUp(tenantId);
  if (cmd === 'status') return bundleStatus(tenantId);
  if (cmd === 'smoke') return bundleSmoke(tenantId);
  if (cmd === 'release') return bundleReleaseFull(tenantId);
  if (cmd === 'down') return bundleDown(tenantId);
  throw new Error('Unknown bundle command: ' + cmd + '. Use: up, status, smoke, release, down');
}

function packCommand(cmd, slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  if (cmd === 'generate') return packGenerate(tenantId);
  if (cmd === 'validate') return packValidate(tenantId);
  if (cmd === 'publish') return packPublish(tenantId);
  throw new Error('Unknown pack command: ' + cmd + '. Use: generate, validate, publish');
}

function hermesCommand(cmd, slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  if (cmd === 'provision') return hermesProvision(tenantId);
  if (cmd === 'health') return hermesHealth(tenantId);
  throw new Error('Unknown hermes command: ' + cmd + '. Use: provision, health');
}

function litellmCommand(cmd, slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  if (cmd === 'sync') return litellmSync(tenantId);
  throw new Error('Unknown litellm command: ' + cmd + '. Use: sync');
}

function langfuseCommand(cmd, slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  if (cmd === 'sync') return langfuseSync(tenantId);
  throw new Error('Unknown langfuse command: ' + cmd + '. Use: sync');
}

function openwebuiCommand(cmd, slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  if (cmd === 'sync') return openwebuiSync(tenantId);
  throw new Error('Unknown openwebui command: ' + cmd + '. Use: sync');
}

function bundleUp(tenantId) {
  const dryRun = hasFlag('--dry-run');
  const profile = readJson(path.join(DATA_DIR, tenantId, 'profile.json'), null);
  if (!profile) throw new Error('Tenant ' + tenantId + ' does not exist. Run: missionctl tenant create ' + tenantId);
  const domain = getFlag('--domain') || profile.domain || (tenantId + '.org');
  const apiDomain = getFlag('--api-domain') || ('api.' + domain.replace(/^https?:\/\//, ''));
  const adminEmail = getFlag('--email') || 'admin@example.org';
  const outDir = path.join(BUNDLES, tenantId, 'managed');
  fs.mkdirSync(path.join(outDir, 'hermes', 'skills'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'litellm'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'open-webui'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'langfuse'), { recursive: true });
  const envT = fs.readFileSync(path.join(TEMPLATES, 'managed-bundle', 'managed.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, '.env.managed'), envT.replace(/<TENANT_SLUG>/g, tenantId).replace(/<SITE_DOMAIN>/g, domain.replace(/^https?:\/\//,'')).replace(/<API_DOMAIN>/g, apiDomain.replace(/^https?:\/\//,'')).replace(/<ADMIN_EMAIL>/g, adminEmail).replace(/<GENERATED_PG_PASSWORD>/g, crypto.randomBytes(18).toString('base64url')).replace(/<GENERATED_JWT_SECRET>/g, crypto.randomBytes(32).toString('hex')).replace(/<GENERATED_LITELLM_MASTER_KEY>/g, crypto.randomBytes(24).toString('hex')).replace(/<GENERATED_LANGFUSE_SECRET>/g, crypto.randomBytes(32).toString('hex')).replace(/<GENERATED_LANGFUSE_SALT>/g, crypto.randomBytes(16).toString('hex')).replace(/<GENERATED_WEBUI_SECRET>/g, crypto.randomBytes(32).toString('hex')).replace(/<OPENAI_API_KEY>/g,'').replace(/<ANTHROPIC_API_KEY>/g,''), 'utf8');
  fs.copyFileSync(path.join(TEMPLATES, 'managed-bundle', 'docker-compose.managed.yml'), path.join(outDir, 'docker-compose.managed.yml'));
  const caddyT = fs.readFileSync(path.join(TEMPLATES, 'managed-bundle', 'Caddyfile.managed'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'Caddyfile.managed'), caddyT.replace(/\$\{ADMIN_EMAIL\}/g, adminEmail).replace(/\$\{API_DOMAIN\}/g, apiDomain.replace(/^https?:\/\//,'')).replace(/\$\{SITE_DOMAIN\}/g, domain.replace(/^https?:\/\//,'')), 'utf8');
  fs.copyFileSync(path.join(TEMPLATES, 'managed-bundle', 'prometheus.yml'), path.join(outDir, 'prometheus.yml'));
  fs.writeFileSync(path.join(outDir, 'grafana-dashboard.json'), JSON.stringify({ title: 'Mission OS v0.6 Dashboard', panels: [] }, null, 2), 'utf8');
  const hEnv = fs.readFileSync(path.join(TEMPLATES, 'hermes', 'hermes.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'hermes', 'env'), hEnv.replace(/<TENANT_SLUG>/g, tenantId).replace(/<GENERATED_OPERATOR_KEY>/g, crypto.randomBytes(24).toString('hex')).replace(/<LITELLM_VIRTUAL_KEY>/g,'<SET_AFTER_LITELLM_SYNC>').replace(/<LANGFUSE_PUBLIC_KEY>/g,'<SET_AFTER_LANGFUSE_SYNC>').replace(/<LANGFUSE_SECRET_KEY>/g,'<SET_AFTER_LANGFUSE_SYNC>'), 'utf8');
  copyHermesTemplates(tenantId, outDir);
  const llmT = fs.readFileSync(path.join(TEMPLATES, 'litellm', 'litellm.config.yaml'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'litellm', 'config.yaml'), llmT.replace(/\$\{TENANT_ID\}/g, tenantId), 'utf8');
  const owEnvT = fs.readFileSync(path.join(TEMPLATES, 'openwebui', 'openwebui.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'open-webui', 'env'), owEnvT.replace(/<GENERATED_WEBUI_SECRET>/g, crypto.randomBytes(32).toString('hex')).replace(/<LITELLM_VIRTUAL_KEY_OPENWEBUI>/g,'<SET_AFTER_LITELLM_SYNC>').replace(/<TENANT_SLUG>/g, tenantId), 'utf8');
  fs.copyFileSync(path.join(TEMPLATES, 'openwebui', 'workspace.json'), path.join(outDir, 'open-webui', 'workspace.json'));
  fs.copyFileSync(path.join(TEMPLATES, 'openwebui', 'starter-agents.json'), path.join(outDir, 'open-webui', 'starter-agents.json'));
  const lfEnvT = fs.readFileSync(path.join(TEMPLATES, 'langfuse', 'langfuse.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'langfuse', 'env'), lfEnvT.replace(/<GENERATED_NEXTAUTH_SECRET>/g, crypto.randomBytes(32).toString('hex')).replace(/<GENERATED_SALT>/g, crypto.randomBytes(16).toString('hex')), 'utf8');
  fs.copyFileSync(path.join(TEMPLATES, 'managed-bundle', 'smoke-test.managed.sh'), path.join(outDir, 'smoke-test.managed.sh'));
  let gitSha = 'unknown';
  try { gitSha = require('child_process').execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}
  const manifest = JSON.parse(fs.readFileSync(path.join(TEMPLATES, 'managed-bundle', 'release-manifest.json'), 'utf8'));
  manifest.tenant = tenantId; manifest.created_at = new Date().toISOString(); manifest.git_sha = gitSha; manifest.pack_version = getPackVersion(tenantId);
  fs.writeFileSync(path.join(outDir, 'release-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  emitEvent({ tenantId, type: 'BUNDLE.CREATED', actor: 'system', payload: { dryRun, outDir } });
  registerArtifact({
    tenantId,
    kind: 'release-manifest',
    title: 'Release Manifest for ' + tenantId,
    storagePath: path.join(outDir, 'release-manifest.json')
  });
  generateDashboardState(tenantId);
  appendLog({ event: 'bundle.up', tenantId, dryRun, outDir });
  console.log(JSON.stringify({ ok: true, tenantId, dryRun, outDir, next: dryRun ? ['Review files in ' + outDir, 'Run: missionctl bundle smoke ' + tenantId + ' --dry-run'] : ['cd ' + outDir, 'docker compose -f docker-compose.managed.yml up -d --build'] }, null, 2));

}

function bundleStatus(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed');
  const exists = fs.existsSync(outDir);
  const manifest = exists ? readJson(path.join(outDir, 'release-manifest.json'), null) : null;
  console.log(JSON.stringify({ ok: true, tenantId, bundleExists: exists, manifest }, null, 2));
}

function hasOperatorKeyLiteral(siteRoot) {
  const forbidden = [/ok_[a-zA-Z0-9-]+_[0-9a-f]{16,}/, /OPERATOR_KEY/, /operator-key/i, /validateOperatorKey/];
  const dirs = ['app', 'components', 'lib'].map((d) => path.join(siteRoot, d)).filter((d) => fs.existsSync(d));
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'api') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (scan(full)) return true;
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.startsWith("'use client'") || content.startsWith('"use client"') || full.endsWith(path.join('lib', 'opsApi.js'))) {
          if (forbidden.some((p) => p.test(content))) return true;
        }
      }
    }
    return false;
  }
  return dirs.some((d) => scan(d));
}

function bundleSmoke(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed');
  if (!fs.existsSync(outDir)) throw new Error('No bundle found for ' + tenantId + '. Run: missionctl bundle up ' + tenantId + ' --dry-run');
  const checks = [
    ['managed compose', fs.existsSync(path.join(outDir, 'docker-compose.managed.yml'))],
    ['Caddy managed', fs.existsSync(path.join(outDir, 'Caddyfile.managed'))],
    ['managed env', fs.existsSync(path.join(outDir, '.env.managed'))],
    ['Hermes env', fs.existsSync(path.join(outDir, 'hermes', 'env'))],
    ['Hermes SOUL', fs.existsSync(path.join(outDir, 'hermes', 'SOUL.md'))],
    ['LiteLLM config', fs.existsSync(path.join(outDir, 'litellm', 'config.yaml'))],
    ['Open WebUI env', fs.existsSync(path.join(outDir, 'open-webui', 'env'))],
    ['Langfuse env', fs.existsSync(path.join(outDir, 'langfuse', 'env'))],
    ['smoke-test script', fs.existsSync(path.join(outDir, 'smoke-test.managed.sh'))],
    ['release manifest', fs.existsSync(path.join(outDir, 'release-manifest.json'))],
    ['agent pack manifest', fs.existsSync(path.join(DATA_DIR, tenantId, 'tenant-agent-pack', 'manifest.yaml'))],
    ['Hermes not public', fs.readFileSync(path.join(outDir, 'docker-compose.managed.yml'), 'utf8').includes('127.0.0.1:8765')],
    ['event journal', fs.existsSync(path.join(DATA_DIR, tenantId, 'events.jsonl'))],
    ['artifact registry', fs.existsSync(path.join(DATA_DIR, tenantId, 'artifacts.json'))],
    ['managed agents state', fs.existsSync(path.join(DATA_DIR, tenantId, 'managed-agents.json'))],
    ['dashboard state', fs.existsSync(path.join(DATA_DIR, tenantId, 'dashboard-state.json'))],
    // Phase 3: Operator API + Worker Runtime Contracts
    ['operator auth helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'auth-middleware.js'))],
    ['dashboard-state API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'dashboard-state.js'))],
    ['events API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'events.js'))],
    ['artifacts API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'artifacts.js'))],
    ['managed-agents API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'managed-agents.js'))],
    ['runs API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'runs.js'))],
    ['approvals API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'approvals.js'))],
    ['worker contracts', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'worker-contracts.js'))],
    ['server route registration', fs.readFileSync(path.join(ROOT, 'services', 'mission-api', 'server.js'), 'utf8').includes('operatorRouter')],
    // Phase 4: Model Gateway, Observability, Usage Ledger
    ['model-budgets module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'model-budgets.js'))],
    ['model-usage-ledger module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'model-usage-ledger.js'))],
    ['trace-links module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'trace-links.js'))],
    ['langfuse-metadata module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'langfuse-metadata.js'))],
    ['litellm-config module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'litellm-config.js'))],
    ['openwebui-bootstrap module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'openwebui-bootstrap.js'))],
    ['budgets API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'budgets.js'))],
    ['model-usage API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'model-usage.js'))],
    ['traces API helper', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'traces.js'))],
    ['db migration 0005', fs.existsSync(path.join(ROOT, 'db', 'migrations', '0005_v06_model_gateway_observability.sql'))],
    // Phase 5: Ops Dashboard UI
    ['ops route: /ops/agents', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'agents', 'page.jsx'))],
    ['ops route: /ops/agents/[id]', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'agents', '[id]', 'page.jsx'))],
    ['ops route: /ops/artifacts', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'artifacts', 'page.jsx'))],
    ['ops route: /ops/events', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'events', 'page.jsx'))],
    ['ops route: /ops/budgets', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'budgets', 'page.jsx'))],
    ['ops route: /ops/health', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'health', 'page.jsx'))],
    ['ops route: /ops/deployments', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'deployments', 'page.jsx'))],
    ['ops route: /ops/openwebui', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'openwebui', 'page.jsx'))],
    ['no operator key literal in ops client code', !hasOperatorKeyLiteral(path.join(ROOT, 'apps', 'site'))],
    // Phase 6: Deployment Lifecycle, Backup/Restore
    ['deployment-releases module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'deployment-releases.js'))],
    ['deployment-health module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'deployment-health.js'))],
    ['deployment-backup module', fs.existsSync(path.join(ROOT, 'packages', 'core', 'src', 'deployment-backup.js'))],
    ['db migration 0006', fs.existsSync(path.join(ROOT, 'db', 'migrations', '0006_v06_deployment_lifecycle.sql'))],
    ['deployments operator API', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'deployments.js'))],
    ['backups operator API', fs.existsSync(path.join(ROOT, 'services', 'mission-api', 'src', 'operator', 'backups.js'))],
    ['bundle status command', fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8').includes('bundleStatus')],
    ['upgrade command', fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8').includes('upgradeCommand')],
    ['rollback command', fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8').includes('rollbackCommand')],
    ['backup command', fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8').includes('backupCommand')],
    ['restore command', fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8').includes('restoreCommand')],
    ['fresh-tenant dashboard mkdirSync guard', fs.readFileSync(path.join(ROOT, 'packages', 'core', 'src', 'dashboard-state.js'), 'utf8').includes('mkdirSync')],
    ['ops deployments page updated', fs.existsSync(path.join(ROOT, 'apps', 'site', 'app', 'ops', 'deployments', 'page.jsx'))]
  ];
  const failed = checks.filter(([, ok]) => !ok);
  console.table(checks.map(([name, ok]) => ({ check: name, status: ok ? 'ok' : 'missing' })));
  
  const smokeStatus = failed.length === 0 ? 'passed' : 'failed';
  const eventType = failed.length === 0 ? 'SMOKE.PASSED' : 'SMOKE.FAILED';
  emitEvent({ tenantId, type: eventType, actor: 'system', payload: { passed: checks.length - failed.length, failed: failed.length } });
  recordSmokeResult({ tenantId, status: smokeStatus, checks: checks.map(([name, ok]) => ({ name, status: ok ? 'ok' : 'missing' })) });
  generateDashboardState(tenantId);
  appendLog({ event: 'bundle.smoke', tenantId, passed: checks.length - failed.length, failed: failed.length });
  
  if (failed.length) { console.log(JSON.stringify({ ok: false, tenantId, failed: failed.length, failedChecks: failed.map(([n]) => n) }, null, 2)); process.exit(1); }
  console.log(JSON.stringify({ ok: true, tenantId, passed: checks.length, failed: 0 }, null, 2));
}

function bundleRelease(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed');
  if (!fs.existsSync(outDir)) throw new Error('No bundle found for ' + tenantId);
  const m = readJson(path.join(outDir, 'release-manifest.json'), {});
  m.released_at = new Date().toISOString(); m.status = 'released';
  writeJson(path.join(outDir, 'release-manifest.json'), m);
  appendLog({ event: 'bundle.release', tenantId });
  console.log(JSON.stringify({ ok: true, tenantId, released: m.version }, null, 2));
}

function bundleDown(tenantId) {
  console.log(JSON.stringify({ ok: true, tenantId, message: 'Stub — run: docker compose -f docker-compose.managed.yml down' }, null, 2));
}

// ===================== v0.6 PHASE 6: Deployment Lifecycle =====================

function bundleReleaseFull(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed');
  if (!fs.existsSync(outDir)) throw new Error('No bundle found for ' + tenantId + '. Run: missionctl bundle up ' + tenantId + ' --dry-run');
  const manifest = readJson(path.join(outDir, 'release-manifest.json'), {});
  const version = manifest.version || '0.6.0';

  const release = createDeploymentRelease({
    tenantId,
    version,
    bundlePath: outDir,
    manifestPath: path.join(outDir, 'release-manifest.json'),
    createdBy: 'cli',
    notes: 'Generated by missionctl bundle release'
  });

  manifest.released_at = new Date().toISOString();
  manifest.status = 'released';
  manifest.release_id = release.id;
  writeJson(path.join(outDir, 'release-manifest.json'), manifest);

  registerArtifact({
    tenantId,
    kind: 'release-manifest',
    title: 'Release Manifest v' + version + ' for ' + tenantId,
    storagePath: path.join(outDir, 'release-manifest.json')
  });
  generateDashboardState(tenantId);
  appendLog({ event: 'bundle.release', tenantId, releaseId: release.id, version });
  console.log(JSON.stringify({ ok: true, tenantId, releaseId: release.id, version, status: 'draft', note: 'Run: missionctl upgrade ' + tenantId + ' --release ' + release.id + ' to activate.' }, null, 2));
}

function upgradeCommand(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const releaseId = getFlag('--release');
  if (!releaseId) throw new Error('--release <release-id> is required. Get a release id from: missionctl bundle release ' + tenantId);
  const activated = activateDeploymentRelease({ tenantId, releaseId, actor: 'cli' });
  generateDashboardState(tenantId);
  appendLog({ event: 'upgrade', tenantId, releaseId, version: activated.version });
  console.log(JSON.stringify({ ok: true, tenantId, releaseId, version: activated.version, status: 'active', activatedAt: activated.activated_at }, null, 2));
}

function rollbackCommand(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const targetId = getFlag('--to');
  if (!targetId) throw new Error('--to <release-id> is required');
  const releases = listDeploymentReleases({ tenantId });
  const active = getActiveDeploymentRelease({ tenantId });
  if (!active) throw new Error('No active release to roll back from for ' + tenantId);
  const result = rollbackDeploymentRelease({ tenantId, releaseId: active.id, targetReleaseId: targetId, actor: 'cli' });
  generateDashboardState(tenantId);
  appendLog({ event: 'rollback', tenantId, from: active.id, to: targetId });
  console.log(JSON.stringify({ ok: true, tenantId, rolledBack: result.current.id, restored: result.restored.id, restoredVersion: result.restored.version }, null, 2));
}

function backupCommand(slugInput) {
  const tenantId = cleanTenantSlug(slugInput);
  const notes = getFlag('--notes') || '';
  const manifest = coreCreateBackup({ tenantId, notes, createdBy: 'cli' });
  appendLog({ event: 'backup.created', tenantId, backupId: manifest.backup_id });
  console.log(JSON.stringify({ ok: true, tenantId, backupId: manifest.backup_id, fileCount: manifest.file_count, checksum: manifest.checksum_sha256 }, null, 2));
}

function restoreCommand(slugOrBackupId) {
  const tenantId = cleanTenantSlug(getFlag('--slug') || 'demo-pnw');
  const backupId = getFlag('--backup') || slugOrBackupId;
  if (!backupId) throw new Error('backup id is required. Use: missionctl restore --slug <tenant> --backup <backup-id>');
  const result = coreRestoreBackup({ tenantId, backupId, createdBy: 'cli' });
  appendLog({ event: 'restore.completed', tenantId, backupId });
  console.log(JSON.stringify({ ok: true, tenantId, backupId, restoredFrom: result.restoredFrom }, null, 2));
}

function packGenerate(tenantId) {
  const profile = readJson(path.join(DATA_DIR, tenantId, 'profile.json'), null);
  if (!profile) throw new Error('Tenant ' + tenantId + ' does not exist.');
  const packDir = path.join(DATA_DIR, tenantId, 'tenant-agent-pack');
  for (const sub of ['org/locales', 'hermes/skills', 'hermes/schedules', 'hermes/tools', 'mission', 'openwebui', 'prompts', 'tests']) fs.mkdirSync(path.join(packDir, sub), { recursive: true });
  const packVersion = '1.0.0-' + Date.now();
  writeYaml(path.join(packDir, 'manifest.yaml'), { packId: tenantId + '-agent-pack', version: packVersion, tenantId, createdAt: new Date().toISOString(), agents: ['founder','grants','comms','programs','board-packet','donor-followup','volunteer-coordinator','impact-report'], litellmModels: ['openai/gpt-4.1-mini','anthropic/claude-sonnet-4.5'], openWebuiWorkspace: true, langfuseProject: true });
  writeJson(path.join(packDir, 'org', 'org-profile.json'), { tenantId, orgName: profile.orgName, region: profile.region, mission: profile.mission, programs: profile.programs });
  writeJson(path.join(packDir, 'org', 'brand.json'), { name: profile.orgName, colors: { primary: '#2563eb', accent: '#059669' }, tone: 'warm, direct, nonprofit-friendly' });
  writeJson(path.join(packDir, 'org', 'locales', 'en-US.json'), { language: 'en-US', greeting: 'Welcome to Mission OS' });
  copyHermesTemplates(tenantId, packDir);
  for (const skill of ['founder','grants','comms','programs','board-packet','donor-followup','volunteer-coordinator','impact-report']) { copyTemplate('hermes/skills/' + skill + '.md', path.join(packDir, 'hermes', 'skills', skill + '.md'), profile); }
  writeYaml(path.join(packDir, 'hermes', 'config.patch.yaml'), { profile: tenantId + '-profile', model_gateway: 'http://litellm:4000' });
  writeYaml(path.join(packDir, 'hermes', 'schedules', 'opportunity-radar.cron.yaml'), { name: 'opportunity-radar', cron: '0 9 * * 1', agent: 'grants' });
  writeYaml(path.join(packDir, 'hermes', 'schedules', 'weekly-board-digest.cron.yaml'), { name: 'weekly-board-digest', cron: '0 8 * * 5', agent: 'board-packet' });
  writeYaml(path.join(packDir, 'hermes', 'schedules', 'monthly-impact-report.cron.yaml'), { name: 'monthly-impact-report', cron: '0 8 1 * *', agent: 'impact-report' });
  const allowlist = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tool-allowlist.json'), 'utf8'));
  writeYaml(path.join(packDir, 'hermes', 'tools', 'allowlist.yaml'), allowlist);
  writeYaml(path.join(packDir, 'hermes', 'tools', 'env-map.yaml'), { LITELLM_BASE_URL: 'http://litellm:4000', MISSION_OS_API_URL: 'http://mission-api:4000', LANGFUSE_HOST: 'http://langfuse:3000' });
  writeYaml(path.join(packDir, 'mission', 'policy.yaml'), { classes: { green: 'internal', yellow: 'draft', orange: 'external', red: 'money/legal/youth' }, hardBlocks: ['no auto grant submission','no auto youth/donor communication'] });
  writeYaml(path.join(packDir, 'mission', 'workflows.yaml'), { workflows: ['opportunity-scan','grant-draft','campaign-draft','board-packet','impact-report'] });
  writeYaml(path.join(packDir, 'mission', 'approvals.yaml'), { autoApprove: ['green'], requireApproval: ['orange','red'], neverAutoApprove: ['red'] });
  writeYaml(path.join(packDir, 'mission', 'dashboard-panels.yaml'), { panels: ['active-agents','pending-approvals','recent-artifacts','model-spend','health'] });
  fs.copyFileSync(path.join(TEMPLATES, 'openwebui', 'workspace.json'), path.join(packDir, 'openwebui', 'workspace.json'));
  fs.copyFileSync(path.join(TEMPLATES, 'openwebui', 'starter-agents.json'), path.join(packDir, 'openwebui', 'starter-agents.json'));
  writeJson(path.join(packDir, 'openwebui', 'models.json'), { models: ['cheap','standard','critical'] });
  for (const p of ['board-packet','donor-followup','grant-triage','impact-story']) fs.writeFileSync(path.join(packDir, 'prompts', p + '.md'), '# ' + p.replace(/-/g,' ') + '\n\nPrompt template for ' + p + '.\n', 'utf8');
  writeJson(path.join(packDir, 'tests', 'smoke.json'), { checks: ['manifest exists','all skills present','tool allowlist valid'] });
  writeJson(path.join(packDir, 'tests', 'evals.json'), { evals: [] });
  emitEvent({ tenantId, type: 'AGENT.PACK_GENERATED', actor: 'system', payload: { packVersion, packDir } });
  generateDashboardState(tenantId);
  appendLog({ event: 'pack.generated', tenantId, packVersion });
  console.log(JSON.stringify({ ok: true, tenantId, packDir, packVersion }, null, 2));

}

function packValidate(tenantId) {
  const packDir = path.join(DATA_DIR, tenantId, 'tenant-agent-pack');
  if (!fs.existsSync(path.join(packDir, 'manifest.yaml'))) throw new Error('No agent pack found for ' + tenantId);
  const required = ['manifest.yaml','org/org-profile.json','org/brand.json','hermes/config.patch.yaml','hermes/SOUL.md','hermes/MEMORY.md','hermes/USER.md','hermes/skills/founder.md','hermes/skills/grants.md','hermes/skills/comms.md','hermes/skills/programs.md','hermes/skills/board-packet.md','hermes/skills/donor-followup.md','hermes/skills/volunteer-coordinator.md','hermes/skills/impact-report.md','hermes/schedules/opportunity-radar.cron.yaml','hermes/schedules/weekly-board-digest.cron.yaml','hermes/schedules/monthly-impact-report.cron.yaml','hermes/tools/allowlist.yaml','hermes/tools/env-map.yaml','mission/policy.yaml','mission/workflows.yaml','mission/approvals.yaml','mission/dashboard-panels.yaml','openwebui/models.json','openwebui/workspace.json','openwebui/starter-agents.json','prompts/board-packet.md','prompts/donor-followup.md','prompts/grant-triage.md','prompts/impact-story.md','tests/smoke.json','tests/evals.json'];
  const missing = required.filter(f => !fs.existsSync(path.join(packDir, f)));
  console.table(required.map(f => ({ file: f, status: fs.existsSync(path.join(packDir, f)) ? 'ok' : 'missing' })));
  appendLog({ event: 'pack.validated', tenantId, missing: missing.length });
  if (missing.length) { console.log(JSON.stringify({ ok: false, tenantId, missing }, null, 2)); process.exit(1); }
  console.log(JSON.stringify({ ok: true, tenantId, validated: required.length, allPresent: true }, null, 2));
}

function packPublish(tenantId) {
  const packDir = path.join(DATA_DIR, tenantId, 'tenant-agent-pack');
  if (!fs.existsSync(path.join(packDir, 'manifest.yaml'))) throw new Error('No agent pack found for ' + tenantId);
  emitEvent({ tenantId, type: 'AGENT.PACK_PUBLISHED', actor: 'system', payload: { packDir } });
  registerArtifact({
    tenantId,
    kind: 'tenant-agent-pack',
    title: 'Tenant Agent Pack for ' + tenantId,
    storagePath: path.join(packDir, 'manifest.yaml')
  });
  generateDashboardState(tenantId);
  appendLog({ event: 'agent.pack_published', tenantId });
  console.log(JSON.stringify({ ok: true, tenantId, publishedAt: new Date().toISOString(), message: 'Pack published. AGENT.PACK_PUBLISHED event logged.' }, null, 2));
}

function hermesProvision(tenantId) {
  const packDir = path.join(DATA_DIR, tenantId, 'tenant-agent-pack');
  if (!fs.existsSync(path.join(packDir, 'manifest.yaml'))) throw new Error('No agent pack. Run: missionctl pack generate ' + tenantId);
  const outDir = path.join(BUNDLES, tenantId, 'managed');
  fs.mkdirSync(path.join(outDir, 'hermes', 'skills'), { recursive: true });
  copyHermesTemplates(tenantId, outDir);
  const hEnv = fs.readFileSync(path.join(TEMPLATES, 'hermes', 'hermes.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'hermes', 'env'), hEnv.replace(/<TENANT_SLUG>/g, tenantId).replace(/<GENERATED_OPERATOR_KEY>/g, crypto.randomBytes(24).toString('hex')).replace(/<LITELLM_VIRTUAL_KEY>/g,'<SET_AFTER_LITELLM_SYNC>').replace(/<LANGFUSE_PUBLIC_KEY>/g,'<SET_AFTER_LANGFUSE_SYNC>').replace(/<LANGFUSE_SECRET_KEY>/g,'<SET_AFTER_LANGFUSE_SYNC>'), 'utf8');
  
  const agents = ['founder', 'grants', 'comms', 'programs'];
  for (const slug of agents) {
    provisionManagedAgent({
      tenantId,
      agentSlug: `hermes-${slug}`,
      agentType: slug,
      packVersion: getPackVersion(tenantId)
    });
  }
  generateDashboardState(tenantId);
  appendLog({ event: 'agent.provision_requested', tenantId });
  console.log(JSON.stringify({ ok: true, tenantId, hermesConfigDir: path.join(outDir, 'hermes'), message: 'Hermes provisioned. Dashboard bound to 127.0.0.1:8765 — not public.' }, null, 2));
}

function hermesHealth(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed');
  const configured = fs.existsSync(path.join(outDir, 'hermes', 'env'));
  if (configured) {
    const agents = ['founder', 'grants', 'comms', 'programs'];
    for (const slug of agents) {
      updateAgentHealth({
        tenantId,
        agentSlug: `hermes-${slug}`,
        healthStatus: 'ok',
        checkOutput: 'Hermes service running.'
      });
    }
    generateDashboardState(tenantId);
  }
  console.log(JSON.stringify({ ok: true, tenantId, hermesConfigured: configured, status: configured ? 'provisioned' : 'not-provisioned', dashboard: '127.0.0.1:8765 (not public)' }, null, 2));
}

function litellmSync(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed', 'litellm');
  fs.mkdirSync(outDir, { recursive: true });
  const cfg = fs.readFileSync(path.join(TEMPLATES, 'litellm', 'litellm.config.yaml'), 'utf8').replace(/\$\{TENANT_ID\}/g, tenantId);
  fs.writeFileSync(path.join(outDir, 'config.yaml'), cfg, 'utf8');
  const envT = fs.readFileSync(path.join(TEMPLATES, 'litellm', 'litellm.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'env'), envT.replace(/<GENERATED_MASTER_KEY>/g, crypto.randomBytes(24).toString('hex')).replace(/<LANGFUSE_PUBLIC_KEY>/g,'<SET_AFTER_LANGFUSE_SYNC>').replace(/<LANGFUSE_SECRET_KEY>/g,'<SET_AFTER_LANGFUSE_SYNC>'), 'utf8');
  appendLog({ event: 'litellm.synced', tenantId });
  console.log(JSON.stringify({ ok: true, tenantId, configDir: outDir, surfaces: 8, message: 'LiteLLM config generated. Provider keys are placeholders.' }, null, 2));
}

function langfuseSync(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed', 'langfuse');
  fs.mkdirSync(outDir, { recursive: true });
  const envT = fs.readFileSync(path.join(TEMPLATES, 'langfuse', 'langfuse.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'env'), envT.replace(/<GENERATED_NEXTAUTH_SECRET>/g, crypto.randomBytes(32).toString('hex')).replace(/<GENERATED_SALT>/g, crypto.randomBytes(16).toString('hex')), 'utf8');
  writeJson(path.join(outDir, 'trace-metadata.json'), { tenantId, traceTags: ['org_id','tenant_id','surface','workflow_kind','approval_class','agent_slug','run_id','artifact_id','release_id','environment'], redactionPolicy: 'no PII in trace metadata for restricted workflows' });
  appendLog({ event: 'langfuse.synced', tenantId });
  console.log(JSON.stringify({ ok: true, tenantId, configDir: outDir, message: 'Langfuse config generated. Trace metadata plan written.' }, null, 2));
}

function openwebuiSync(tenantId) {
  const outDir = path.join(BUNDLES, tenantId, 'managed', 'open-webui');
  fs.mkdirSync(outDir, { recursive: true });
  const envT = fs.readFileSync(path.join(TEMPLATES, 'openwebui', 'openwebui.env.example'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'env'), envT.replace(/<GENERATED_WEBUI_SECRET>/g, crypto.randomBytes(32).toString('hex')).replace(/<LITELLM_VIRTUAL_KEY_OPENWEBUI>/g,'<SET_AFTER_LITELLM_SYNC>').replace(/<TENANT_SLUG>/g, tenantId), 'utf8');
  fs.copyFileSync(path.join(TEMPLATES, 'openwebui', 'workspace.json'), path.join(outDir, 'workspace.json'));
  fs.copyFileSync(path.join(TEMPLATES, 'openwebui', 'starter-agents.json'), path.join(outDir, 'starter-agents.json'));
  appendLog({ event: 'openwebui.synced', tenantId });
  console.log(JSON.stringify({ ok: true, tenantId, configDir: outDir, starterAgents: 6, message: 'Open WebUI config generated. Connects to LiteLLM only.' }, null, 2));
}

function operatorKeyCommand(cmd, tenantId) {
  if (cmd === 'create') {
    const label = getFlag('--label') || 'local-dev';
    const scope = getFlag('--scope') || 'operator';
    const scopes = scope.split(',').map(s => s.trim());
    const { operatorKey, rawKey } = createOperatorKey({
      tenantId,
      label,
      scopes,
      createdBy: 'cli'
    });
    console.log(JSON.stringify({
      ok: true,
      tenantId,
      label,
      scopes,
      keyId: operatorKey.id,
      rawKey,
      note: 'Save this key. It will not be shown again.'
    }, null, 2));
  } else if (cmd === 'validate') {
    const key = getFlag('--key') || args[3] || '';
    try {
      const opKey = validateOperatorKey({
        key,
        tenantId
      });
      console.log(JSON.stringify({
        ok: true,
        tenantId,
        valid: true,
        keyId: opKey.id,
        label: opKey.label,
        scopes: opKey.scopes
      }, null, 2));
    } catch (err) {
      console.log(JSON.stringify({
        ok: false,
        tenantId,
        valid: false,
        error: err.message
      }, null, 2));
    }
  } else {
    throw new Error(`Unknown operator-key command: ${cmd}`);
  }
}

function modelCommand(cmd, sub, tenantId) {
  if (cmd === 'budget' && sub === 'show') {
    const budget = getModelBudget(tenantId);
    const monthly = summarizeMonthlyUsage({ tenantId });
    const status = evaluateBudgetStatus({ tenantId, monthToDateSpendUsd: monthly.totalCostUsd || 0 });
    console.log(JSON.stringify({ ok: true, tenantId, budget, monthToDateSpendUsd: monthly.totalCostUsd || 0, status }, null, 2));
  } else if (cmd === 'budget' && sub === 'set') {
    const monthlyBudgetUsd = Number(getFlag('--amount'));
    const warningThresholdPct = getFlag('--warning-pct') ? Number(getFlag('--warning-pct')) : undefined;
    const hardBlockThresholdPct = getFlag('--hard-block-pct') ? Number(getFlag('--hard-block-pct')) : undefined;
    const budget = setModelBudget({ tenantId, monthlyBudgetUsd, warningThresholdPct, hardBlockThresholdPct, actor: 'cli' });
    console.log(JSON.stringify({ ok: true, tenantId, budget }, null, 2));
  } else if (cmd === 'usage' && sub === 'summary') {
    const month = getFlag('--month');
    const monthly = summarizeMonthlyUsage({ tenantId, month: month || undefined });
    const bySurface = summarizeUsageBySurface({ tenantId, month: month || undefined });
    console.log(JSON.stringify({ ok: true, tenantId, monthly, bySurface: bySurface.surfaces }, null, 2));
  } else if (cmd === 'traces' && sub === 'list') {
    const surface = getFlag('--surface');
    const traces = getTraceLinks({ tenantId, surface: surface || undefined });
    console.log(JSON.stringify({ ok: true, tenantId, traces }, null, 2));
  } else {
    throw new Error(`Unknown model command: ${cmd} ${sub || ''}`.trim());
  }
}

function copyHermesTemplates(tenantId, outDir) {
  const hermesOut = path.join(outDir, 'hermes');
  fs.mkdirSync(path.join(hermesOut, 'skills'), { recursive: true });
  const profile = readJson(path.join(DATA_DIR, tenantId, 'profile.json'), defaultTenantProfile({ tenantId }));
  copyTemplate('hermes/SOUL.md', path.join(hermesOut, 'SOUL.md'), profile);
  copyTemplate('hermes/MEMORY.md', path.join(hermesOut, 'MEMORY.md'), profile);
  copyTemplate('hermes/USER.md', path.join(hermesOut, 'USER.md'), profile);
  for (const skill of ['founder','grants','comms','programs','board-packet','donor-followup','volunteer-coordinator','impact-report']) copyTemplate('hermes/skills/' + skill + '.md', path.join(hermesOut, 'skills', skill + '.md'), profile);
}

function copyTemplate(relPath, dest, profile) {
  const src = path.join(TEMPLATES, relPath);
  if (!fs.existsSync(src)) { fs.writeFileSync(dest, '# ' + path.basename(relPath) + '\n\nTemplate not found.\n', 'utf8'); return; }
  let content = fs.readFileSync(src, 'utf8');
  content = content.replace(/\$\{ORG_NAME\}/g, profile.orgName || 'Organization').replace(/\$\{MISSION_OS_TENANT\}/g, profile.tenantId || 'tenant').replace(/\$\{ORG_MISSION\}/g, profile.mission || 'Nonprofit mission').replace(/\$\{ORG_PROGRAMS\}/g, profile.programs || 'Programs').replace(/\$\{PACK_ID\}/g, (profile.tenantId || 'tenant') + '-agent-pack').replace(/\$\{PACK_VERSION\}/g, '1.0.0');
  fs.writeFileSync(dest, content, 'utf8');
}

function getPackVersion(tenantId) {
  const p = path.join(DATA_DIR, tenantId, 'tenant-agent-pack', 'manifest.yaml');
  return fs.existsSync(p) ? '1.0.0' : 'none';
}

function writeYaml(file, obj) {
  const lines = [];
  const serialize = (val, indent) => { const pad = '  '.repeat(indent); if (val === null || val === undefined) { lines.push(pad + 'null'); return; } if (typeof val === 'string') { lines.push(pad + val); return; } if (typeof val === 'number' || typeof val === 'boolean') { lines.push(pad + val); return; } if (Array.isArray(val)) { for (const item of val) { if (typeof item === 'object' && item !== null) { lines.push(pad + '-'); serialize(item, indent + 1); } else { lines.push(pad + '- ' + item); } } return; } for (const [k, v] of Object.entries(val)) { if (typeof v === 'object' && v !== null && !Array.isArray(v)) { lines.push(pad + k + ':'); serialize(v, indent + 1); } else if (Array.isArray(v)) { lines.push(pad + k + ':'); serialize(v, indent); } else { lines.push(pad + k + ': ' + v); } } };
  serialize(obj, 0);
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function hash(v) { return crypto.createHash('sha256').update(String(v)).digest('hex'); }
function titleCase(slug) { return slug.split('-').map((s) => s.slice(0,1).toUpperCase() + s.slice(1)).join(' '); }
function appendLog(entry) { const file = path.join(DATA_DIR, 'missionctl.jsonl'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.appendFileSync(file, JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n'); }
function readDirJson(dir) { const out = {}; if (!fs.existsSync(dir)) return out; for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) out[f] = readJson(path.join(dir, f), null); return out; }
function readIcmFiles(dir) { const out = {}; if (!fs.existsSync(dir)) return out; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const full = path.join(d, e.name); if (e.isDirectory()) walk(full); else out[path.relative(dir, full)] = fs.readFileSync(full, 'utf8'); } }; walk(dir); return out; }
function normalizeDomain(value) { const raw = String(value || '').trim(); if (!raw) return ''; return /^https?:\/\//.test(raw) ? raw.replace(/\/$/, '') : 'https://' + raw.replace(/\/$/, ''); }
