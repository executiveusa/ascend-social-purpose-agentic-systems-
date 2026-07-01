#!/usr/bin/env node
/**
 * secret-audit.mjs — Phase 7 secret scanning for tracked files.
 *
 * Detects raw key-like values in tracked non-example files.
 * Blocks: operator keys, session keys, provider keys, raw generated secrets.
 * Allows: placeholder examples (.env.example, *.env.example, .env.managed.example).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const BLOCKLIST_FILES = [
  /^handoff\/[^/]+\/managed\/hermes\/env$/,
  /^handoff\/[^/]+\/managed\/langfuse\/env$/,
  /^handoff\/[^/]+\/managed\/litellm\/env$/,
  /^handoff\/[^/]+\/managed\/open-webui\/env$/,
  /^handoff\/[^/]+\/managed\/release-manifest\.json$/,
  /^handoff\/[^/]+\/managed\/\.env\.managed$/,
  /^\.env$/,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /^mission-data\//,
  /^backups\//,
];

const ALLOWLIST_FILES = [
  /\.env\.example$/,
  /\.env\.managed\.example$/,
  /secret-audit\.mjs$/,
  /generated-file-audit\.mjs$/,
  /\.test\.js$/,
  /\.md$/,
];

const SECRET_PATTERNS = [
  { name: 'operator key (ok_tenant_hex)', pattern: /\bok_[a-zA-Z0-9_-]+_[a-f0-9]{20,}\b/ },
  { name: 'mission session key (sk_mission_)', pattern: /\bsk_mission_[a-zA-Z0-9]+/ },
  { name: 'mission public key (pk_mission_)', pattern: /\bpk_mission_[a-zA-Z0-9]+/ },
  { name: 'raw NEXTAUTH_SECRET', pattern: /^NEXTAUTH_SECRET=[a-f0-9]{32,}/m },
  { name: 'raw WEBUI_SECRET_KEY', pattern: /^WEBUI_SECRET_KEY=[a-f0-9]{32,}/m },
  { name: 'raw LITELLM_MASTER_KEY', pattern: /^LITELLM_MASTER_KEY=[a-f0-9]{20,}/m },
  { name: 'raw SALT (langfuse)', pattern: /^SALT=[a-f0-9]{16,}/m },
  { name: 'raw JWT_SECRET (not placeholder)', pattern: /^JWT_SECRET=(?!change[_-]|<)[a-f0-9]{32,}/m },
  { name: 'raw POSTGRES_PASSWORD (not placeholder)', pattern: /^POSTGRES_PASSWORD=(?!change[_-]|<|\*|\s*$)[A-Za-z0-9+/=_-]{10,}/m },
  { name: 'provider key (sk-)', pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'provider key (Bearer sk-)', pattern: /Bearer sk-[A-Za-z0-9]/ },
  { name: 'mission operator key hex (hex40)', pattern: /\b[a-f0-9]{48}\b/ },
];

const PLACEHOLDER_EXEMPTIONS = [
  'change_me', 'change-me', 'change-this', '<', 'CHANGE_THIS', 'changeme',
  'mission', 'example', 'placeholder', '***', 'SET_AFTER', 'your_',
];

function isPlaceholder(value) {
  return PLACEHOLDER_EXEMPTIONS.some(e => value.toLowerCase().includes(e.toLowerCase()));
}

function getTrackedFiles() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
}

function isBlocklistedFile(rel) {
  return BLOCKLIST_FILES.some(r => r.test(rel));
}

function isAllowlisted(rel) {
  return ALLOWLIST_FILES.some(r => r.test(rel));
}

const findings = [];

const trackedFiles = getTrackedFiles();

for (const rel of trackedFiles) {
  // Check file-level blocklist first
  if (isBlocklistedFile(rel)) {
    findings.push({ file: rel, issue: 'tracked runtime env/artifact file should not be committed', pattern: 'file-blocklist' });
    continue;
  }

  // Skip pattern scanning for allowlisted files
  if (isAllowlisted(rel)) continue;

  // Skip binary-likely files
  const ext = path.extname(rel).toLowerCase();
  const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.pdf', '.lock'];
  if (binaryExts.includes(ext)) continue;

  const fullPath = path.join(ROOT, rel);
  if (!fs.existsSync(fullPath)) continue;

  let content;
  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch {
    continue;
  }

  for (const { name, pattern } of SECRET_PATTERNS) {
    const match = content.match(pattern);
    if (!match) continue;

    const matchedValue = match[0];
    if (isPlaceholder(matchedValue)) continue;

    // Skip if it's clearly a test assertion or description
    const lineContext = content.split('\n').find(l => l.includes(matchedValue)) || '';
    if (lineContext.trim().startsWith('//') || lineContext.trim().startsWith('*') ||
        lineContext.includes('expect(') || lineContext.includes('describe(') ||
        lineContext.includes('it(') || lineContext.includes('test(') ||
        lineContext.includes("'pattern'") || lineContext.includes('"pattern"')) {
      continue;
    }

    findings.push({ file: rel, issue: name, match: matchedValue.substring(0, 40) + (matchedValue.length > 40 ? '…' : '') });
  }
}

const result = {
  ok: findings.length === 0,
  tool: 'secret-audit',
  trackedFilesScanned: trackedFiles.length,
  findings,
};

console.log(JSON.stringify(result, null, 2));

if (findings.length > 0) {
  console.error(`\n❌ secret-audit: ${findings.length} finding(s). Remove raw keys from tracked files.`);
  process.exit(1);
}

console.error(`✅ secret-audit: clean (${trackedFiles.length} files scanned, 0 findings)`);
