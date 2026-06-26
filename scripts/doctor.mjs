import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'AGENTS.md',
  'README.md',
  'docs/FLYWHEEL.md',
  'vendor/acfs/README.md',
  'vendor/acfs/acfs.manifest.yaml',
  'icm/tenant-template/AGENT.md',
  'icm/tenant-template/CONTEXT.md',
  'apps/site/public/llms.txt',
  'deploy/docker-compose.yml',
  'services/mission-api/src/storage.js',
  'services/mission-core-rs/Cargo.toml',
  'services/mission-connect-rs/Cargo.toml',
  'services/mission-worker-rs/Cargo.toml',
  'services/mission-policy-rs/Cargo.toml',
  'services/mission-icm-rs/Cargo.toml',
  'packages/mission-sdk-js/src/index.js',
  'packages/tenant-kit/src/index.js',
  'missionctl/missionctl.mjs',
  'db/migrations/0001_v04_production_core.sql',
  'docs/FRONTEND-BRIDGE-CONTRACT.md'
];
const stages = [
  '01_onboarding',
  '02_opportunity_scan',
  '03_grant_application',
  '04_campaign_creation',
  '05_approval_gate',
  '06_publish_or_submit',
  '07_outcome_logging',
  '08_workspace_learning'
];
const failures = [];
const warnings = [];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}
for (const stage of stages) {
  const context = path.join(root, 'icm/tenant-template/stages', stage, 'CONTEXT.md');
  if (!fs.existsSync(context)) failures.push(`Missing ICM stage contract: ${stage}`);
  const text = fs.existsSync(context) ? fs.readFileSync(context, 'utf8') : '';
  for (const heading of ['## Inputs', '## Process', '## Outputs']) {
    if (!text.includes(heading)) failures.push(`${stage} CONTEXT.md missing ${heading}`);
  }
}

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const key of ['JWT_SECRET', 'CORS_ORIGIN', 'DATA_DIR', 'ICM_ROOT', 'POSTIZ_API_KEY', 'COMPOSIO_API_KEY', 'ACFS_HOME', 'STORAGE_MODE']) {
  if (!envExample.includes(key)) warnings.push(`.env.example does not document ${key}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['test', 'build', 'doctor', 'zip', 'missionctl', 'verify']) {
  if (!pkg.scripts?.[script]) failures.push(`Missing npm script: ${script}`);
}

const acfsReadme = fs.readFileSync(path.join(root, 'vendor/acfs/README.md'), 'utf8');
if (!acfsReadme.includes('Agentic Coding Flywheel Setup')) warnings.push('ACFS vendor reference did not match expected README marker.');

const docker = fs.readFileSync(path.join(root, 'deploy/docker-compose.yml'), 'utf8');
for (const service of ['api:', 'web:', 'postgres:']) {
  if (!docker.includes(service)) failures.push(`docker-compose missing service ${service}`);
}

if (warnings.length) {
  console.log('Mission OS doctor warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (failures.length) {
  console.error('Mission OS doctor failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Mission OS doctor passed. ICM, Rust production-core source, frontend bridge, SDK, flywheel overlay, and deployment scaffolds are present.');
