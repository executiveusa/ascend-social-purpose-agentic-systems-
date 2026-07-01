#!/usr/bin/env node
/**
 * generated-file-audit.mjs — Phase 7 runtime artifact detection.
 *
 * Detects tracked files that are generated at runtime and should never be committed.
 * Blocks: mission-data/, backups/, handoff runtime env files, release-manifest.json.
 * Allows: .env.example, .env.managed.example, docker-compose templates, Caddyfiles.
 */
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

const RUNTIME_ARTIFACT_PATTERNS = [
  { pattern: /^mission-data\//, reason: 'runtime tenant data directory' },
  { pattern: /^backups\//, reason: 'runtime backup directory' },
  { pattern: /^handoff\/[^/]+\/managed\/\.env\.managed$/, reason: 'generated managed bundle env (use .env.managed.example)' },
  { pattern: /^handoff\/[^/]+\/managed\/hermes\/env$/, reason: 'generated Hermes env with runtime secrets' },
  { pattern: /^handoff\/[^/]+\/managed\/langfuse\/env$/, reason: 'generated Langfuse env with runtime secrets' },
  { pattern: /^handoff\/[^/]+\/managed\/litellm\/env$/, reason: 'generated LiteLLM env with runtime secrets' },
  { pattern: /^handoff\/[^/]+\/managed\/open-webui\/env$/, reason: 'generated Open WebUI env with runtime secrets' },
  { pattern: /^handoff\/[^/]+\/managed\/release-manifest\.json$/, reason: 'generated release manifest (runtime timestamps + IDs)' },
  { pattern: /^tmp\//, reason: 'temporary directory' },
  { pattern: /\.env\.managed$/, reason: 'generated managed env file (not .example)' },
];

const ALLOWED_EXCEPTIONS = [
  /\.env\.example$/,
  /\.env\.managed\.example$/,
  /smoke-test\.managed\.sh$/,
  /docker-compose\.managed\.yml$/,
  /Caddyfile\.managed$/,
  /generated-file-audit\.mjs$/,
];

function getTrackedFiles() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
}

function isAllowed(rel) {
  return ALLOWED_EXCEPTIONS.some(r => r.test(rel));
}

const findings = [];
const trackedFiles = getTrackedFiles();

for (const rel of trackedFiles) {
  if (isAllowed(rel)) continue;

  for (const { pattern, reason } of RUNTIME_ARTIFACT_PATTERNS) {
    if (pattern.test(rel)) {
      findings.push({ file: rel, reason });
      break;
    }
  }
}

const result = {
  ok: findings.length === 0,
  tool: 'generated-file-audit',
  trackedFilesScanned: trackedFiles.length,
  findings,
};

console.log(JSON.stringify(result, null, 2));

if (findings.length > 0) {
  console.error(`\n❌ generated-file-audit: ${findings.length} runtime artifact(s) tracked in git.`);
  console.error('Run: git rm --cached <file> and add to .gitignore');
  process.exit(1);
}

console.error(`✅ generated-file-audit: clean (${trackedFiles.length} files scanned, 0 findings)`);
