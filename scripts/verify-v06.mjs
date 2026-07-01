#!/usr/bin/env node
/**
 * verify-v06.mjs — Phase 7 master verification orchestrator.
 *
 * Runs the full Mission OS v0.6 validation sequence:
 *   1. npm test
 *   2. npm run build
 *   3. missionctl doctor
 *   4. missionctl bundle smoke (dry-run)
 *   5. secret-audit
 *   6. generated-file-audit
 *   7. test-discovery-audit
 *   8. openspec-task-audit
 *
 * Exits 0 only if all steps pass. Each step's result is collected and
 * a summary JSON is printed at the end.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();

function run(label, cmd, opts = {}) {
  const start = Date.now();
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: opts.silent ? 'pipe' : 'inherit',
      ...opts,
    });
    return { label, ok: true, ms: Date.now() - start, output: output?.trim() };
  } catch (err) {
    return { label, ok: false, ms: Date.now() - start, error: err.message?.split('\n')[0] };
  }
}

console.log('\n═══════════════════════════════════════════');
console.log(' Mission OS v0.6 — verify-v06');
console.log('═══════════════════════════════════════════\n');

const steps = [
  () => run('npm test',         'npm test'),
  () => run('npm run build',    'npm run build'),
  () => run('missionctl doctor', 'node missionctl/missionctl.mjs doctor'),
  () => run('bundle smoke',     'node missionctl/missionctl.mjs bundle smoke demo-pnw --dry-run'),
  () => run('secret-audit',     'node scripts/secret-audit.mjs', { silent: true }),
  () => run('generated-file-audit', 'node scripts/generated-file-audit.mjs', { silent: true }),
  () => run('test-discovery-audit', 'node scripts/test-discovery-audit.mjs', { silent: true }),
  () => run('openspec-task-audit',  'node scripts/openspec-task-audit.mjs', { silent: true }),
];

const results = [];
for (const step of steps) {
  const result = step();
  results.push(result);
  const icon = result.ok ? '✅' : '❌';
  console.log(`${icon} ${result.label} (${result.ms}ms)`);
  if (!result.ok) console.error(`   → ${result.error || 'failed'}`);
}

const allOk = results.every(r => r.ok);
const summary = {
  ok: allOk,
  tool: 'verify-v06',
  steps: results.map(({ label, ok, ms }) => ({ label, ok, ms })),
  passed: results.filter(r => r.ok).length,
  failed: results.filter(r => !r.ok).length,
};

console.log('\n───────────────────────────────────────────');
console.log(JSON.stringify(summary, null, 2));

if (!allOk) {
  console.error('\n❌ verify-v06: one or more steps failed. Fix before merging.');
  process.exit(1);
}

console.log('\n✅ verify-v06: all checks passed.\n');
