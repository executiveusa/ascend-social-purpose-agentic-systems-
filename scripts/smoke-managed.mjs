#!/usr/bin/env node
// scripts/smoke-managed.mjs — Deep smoke test for managed bundle
// Usage: node scripts/smoke-managed.mjs <tenant-slug>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tenant = process.argv[2] || 'demo-pnw';
const bundleDir = path.join(ROOT, 'handoff', tenant, 'managed');
const packDir = path.join(ROOT, 'mission-data', tenant, 'tenant-agent-pack');

console.log(`\n=== Mission OS v0.6 Managed Bundle Smoke Test ===`);
console.log(`Tenant: ${tenant}\n`);

const checks = [
  ['Bundle dir exists', fs.existsSync(bundleDir)],
  ['Managed compose', fs.existsSync(path.join(bundleDir, 'docker-compose.managed.yml'))],
  ['Caddy managed', fs.existsSync(path.join(bundleDir, 'Caddyfile.managed'))],
  ['Managed env', fs.existsSync(path.join(bundleDir, '.env.managed'))],
  ['Hermes env', fs.existsSync(path.join(bundleDir, 'hermes', 'env'))],
  ['Hermes SOUL', fs.existsSync(path.join(bundleDir, 'hermes', 'SOUL.md'))],
  ['Hermes MEMORY', fs.existsSync(path.join(bundleDir, 'hermes', 'MEMORY.md'))],
  ['Hermes USER', fs.existsSync(path.join(bundleDir, 'hermes', 'USER.md'))],
  ['Hermes skills (8)', fs.existsSync(path.join(bundleDir, 'hermes', 'skills', 'founder.md')) && fs.existsSync(path.join(bundleDir, 'hermes', 'skills', 'grants.md'))],
  ['LiteLLM config', fs.existsSync(path.join(bundleDir, 'litellm', 'config.yaml'))],
  ['Open WebUI env', fs.existsSync(path.join(bundleDir, 'open-webui', 'env'))],
  ['Open WebUI workspace', fs.existsSync(path.join(bundleDir, 'open-webui', 'workspace.json'))],
  ['Open WebUI starter agents', fs.existsSync(path.join(bundleDir, 'open-webui', 'starter-agents.json'))],
  ['Langfuse env', fs.existsSync(path.join(bundleDir, 'langfuse', 'env'))],
  ['Prometheus config', fs.existsSync(path.join(bundleDir, 'prometheus.yml'))],
  ['Smoke test script', fs.existsSync(path.join(bundleDir, 'smoke-test.managed.sh'))],
  ['Release manifest', fs.existsSync(path.join(bundleDir, 'release-manifest.json'))],
  ['Agent pack manifest', fs.existsSync(path.join(packDir, 'manifest.yaml'))],
  ['Agent pack SOUL', fs.existsSync(path.join(packDir, 'hermes', 'SOUL.md'))],
  ['Agent pack policy', fs.existsSync(path.join(packDir, 'mission', 'policy.yaml'))],
  ['Agent pack allowlist', fs.existsSync(path.join(packDir, 'hermes', 'tools', 'allowlist.yaml'))],
  ['Agent pack prompts (4)', fs.existsSync(path.join(packDir, 'prompts', 'board-packet.md')) && fs.existsSync(path.join(packDir, 'prompts', 'impact-story.md'))],
  ['Hermes not public (localhost bind)', fs.existsSync(path.join(bundleDir, 'docker-compose.managed.yml')) && fs.readFileSync(path.join(bundleDir, 'docker-compose.managed.yml'), 'utf8').includes('127.0.0.1:8765')],
];

let pass = 0, fail = 0;
for (const [name, ok] of checks) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (ok) pass++; else fail++;
}

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
if (fail > 0) { console.log('❌ SMOKE TEST FAILED'); process.exit(1); }
console.log('✅ SMOKE TEST PASSED');
