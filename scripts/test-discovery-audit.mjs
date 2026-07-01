#!/usr/bin/env node
/**
 * test-discovery-audit.mjs — Phase 7 test discovery gate.
 *
 * Verifies that every .test.js file in the repo is covered by the Vitest
 * include patterns in vitest.config.js. Orphan test files (discovered but
 * not included) are a finding. Intentional exclusions must be documented here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

// Must match vitest.config.js include patterns
const VITEST_INCLUDE_GLOBS = [
  /^packages\/.*\.test\.js$/,
  /^packages\/.*\/tests\/.*\.js$/,
  /^services\/.*\/tests\/.*\.test\.js$/,
  /^apps\/.*\/tests\/.*\.test\.js$/,
];

// Intentionally excluded test files (e.g. playwright e2e, manual fixtures)
// Document the reason for each exclusion here.
const INTENTIONAL_EXCLUSIONS = {
  // e.g. 'tests/e2e/smoke.spec.js': 'playwright e2e — run via npm run smoke, not vitest'
};

function findTestFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
      findTestFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      results.push(rel);
    }
  }
  return results;
}

function isCoveredByVitest(rel) {
  return VITEST_INCLUDE_GLOBS.some(g => g.test(rel));
}

const allTestFiles = findTestFiles(ROOT);
const orphans = [];
const covered = [];
const excluded = [];

for (const rel of allTestFiles) {
  const normalized = rel.replace(/\\/g, '/');
  if (INTENTIONAL_EXCLUSIONS[normalized]) {
    excluded.push({ file: normalized, reason: INTENTIONAL_EXCLUSIONS[normalized] });
  } else if (isCoveredByVitest(normalized)) {
    covered.push(normalized);
  } else {
    orphans.push(normalized);
  }
}

const result = {
  ok: orphans.length === 0,
  tool: 'test-discovery-audit',
  totalFound: allTestFiles.length,
  coveredByVitest: covered.length,
  intentionallyExcluded: excluded.length,
  orphans,
  excluded,
};

console.log(JSON.stringify(result, null, 2));

if (orphans.length > 0) {
  console.error(`\n❌ test-discovery-audit: ${orphans.length} orphan test file(s) not covered by Vitest.`);
  console.error('Either add them to vitest.config.js include patterns or add to INTENTIONAL_EXCLUSIONS with a reason.');
  process.exit(1);
}

console.error(`✅ test-discovery-audit: all ${covered.length} test file(s) covered by Vitest (${excluded.length} intentionally excluded)`);
