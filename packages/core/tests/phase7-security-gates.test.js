import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());

// ── Helpers ──────────────────────────────────────────────────────────────────

function scriptExists(name) {
  return fs.existsSync(path.join(ROOT, 'scripts', name));
}

function scriptContent(name) {
  const p = path.join(ROOT, 'scripts', name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function trackedFiles() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}

// ── secret-audit.mjs ─────────────────────────────────────────────────────────

describe('secret-audit script', () => {
  it('exists', () => {
    expect(scriptExists('secret-audit.mjs')).toBe(true);
  });

  it('blocks operator key pattern ok_<tenant>_<hex>', () => {
    const content = scriptContent('secret-audit.mjs');
    expect(content).toContain('ok_');
  });

  it('blocks NEXTAUTH_SECRET pattern', () => {
    const content = scriptContent('secret-audit.mjs');
    expect(content).toContain('NEXTAUTH_SECRET');
  });

  it('blocks WEBUI_SECRET_KEY pattern', () => {
    const content = scriptContent('secret-audit.mjs');
    expect(content).toContain('WEBUI_SECRET_KEY');
  });

  it('blocks LITELLM_MASTER_KEY pattern', () => {
    const content = scriptContent('secret-audit.mjs');
    expect(content).toContain('LITELLM_MASTER_KEY');
  });

  it('blocks handoff runtime env file patterns', () => {
    const content = scriptContent('secret-audit.mjs');
    expect(content).toContain('BLOCKLIST_FILES');
    expect(content).toContain('hermes');
    expect(content).toContain('langfuse');
  });

  it('allows .env.example files (safe list)', () => {
    const content = scriptContent('secret-audit.mjs');
    expect(content).toContain('.env.example');
  });

  it('passes clean on current tracked files', () => {
    const result = execSync('node scripts/secret-audit.mjs', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const parsed = JSON.parse(result);
    expect(parsed.ok).toBe(true);
    expect(parsed.findings).toHaveLength(0);
  });
});

// ── generated-file-audit.mjs ─────────────────────────────────────────────────

describe('generated-file-audit script', () => {
  it('exists', () => {
    expect(scriptExists('generated-file-audit.mjs')).toBe(true);
  });

  it('detects mission-data/ pattern', () => {
    const content = scriptContent('generated-file-audit.mjs');
    expect(content).toContain('mission-data/');
  });

  it('detects backups/ pattern', () => {
    const content = scriptContent('generated-file-audit.mjs');
    expect(content).toContain('backups/');
  });

  it('detects handoff hermes/env pattern', () => {
    const content = scriptContent('generated-file-audit.mjs');
    expect(content).toContain('hermes');
    expect(content).toContain('RUNTIME_ARTIFACT_PATTERNS');
  });

  it('detects release-manifest.json pattern', () => {
    const content = scriptContent('generated-file-audit.mjs');
    expect(content).toContain('release-manifest.json');
  });

  it('allows .env.managed.example (safe)', () => {
    const content = scriptContent('generated-file-audit.mjs');
    expect(content).toContain('.env.managed.example');
  });

  it('passes clean on current tracked files', () => {
    const result = execSync('node scripts/generated-file-audit.mjs', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const parsed = JSON.parse(result);
    expect(parsed.ok).toBe(true);
    expect(parsed.findings).toHaveLength(0);
  });

  it('Phase 6 hotfix: handoff env files are not tracked', () => {
    const tracked = trackedFiles();
    expect(tracked).not.toContain('handoff/demo-pnw/managed/hermes/env');
    expect(tracked).not.toContain('handoff/demo-pnw/managed/langfuse/env');
    expect(tracked).not.toContain('handoff/demo-pnw/managed/litellm/env');
    expect(tracked).not.toContain('handoff/demo-pnw/managed/open-webui/env');
    expect(tracked).not.toContain('handoff/demo-pnw/managed/release-manifest.json');
    expect(tracked).not.toContain('handoff/demo-pnw/managed/.env.managed');
  });
});

// ── test-discovery-audit.mjs ─────────────────────────────────────────────────

describe('test-discovery-audit script', () => {
  it('exists', () => {
    expect(scriptExists('test-discovery-audit.mjs')).toBe(true);
  });

  it('includes vitest glob patterns matching the repo layout', () => {
    const content = scriptContent('test-discovery-audit.mjs');
    expect(content).toContain('packages');
    expect(content).toContain('services');
    expect(content).toContain('apps');
    expect(content).toContain('VITEST_INCLUDE_GLOBS');
  });

  it('passes with no orphans on current repo', () => {
    const result = execSync('node scripts/test-discovery-audit.mjs', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const parsed = JSON.parse(result);
    expect(parsed.ok).toBe(true);
    expect(parsed.orphans).toHaveLength(0);
  });

  it('all test files are covered (none silently skipped)', () => {
    const result = execSync('node scripts/test-discovery-audit.mjs', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const parsed = JSON.parse(result);
    expect(parsed.coveredByVitest).toBeGreaterThan(30);
  });
});

// ── openspec-task-audit.mjs ──────────────────────────────────────────────────

describe('openspec-task-audit script', () => {
  it('exists', () => {
    expect(scriptExists('openspec-task-audit.mjs')).toBe(true);
  });

  it('reads tasks.md and reports completion counts', () => {
    const result = execSync('node scripts/openspec-task-audit.mjs', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const parsed = JSON.parse(result);
    expect(parsed.total).toBeGreaterThan(0);
    expect(parsed.complete).toBeGreaterThan(0);
  });

  it('exits 0 (no blocked tasks)', () => {
    expect(() =>
      execSync('node scripts/openspec-task-audit.mjs', { cwd: ROOT, stdio: 'pipe' })
    ).not.toThrow();
  });
});

// ── verify-v06.mjs ───────────────────────────────────────────────────────────

describe('verify-v06 script', () => {
  it('exists', () => {
    expect(scriptExists('verify-v06.mjs')).toBe(true);
  });

  it('references npm test', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('npm test');
  });

  it('references npm run build', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('npm run build');
  });

  it('references missionctl doctor', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('missionctl.mjs doctor');
  });

  it('references bundle smoke', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('bundle smoke');
  });

  it('references secret-audit', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('secret-audit');
  });

  it('references generated-file-audit', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('generated-file-audit');
  });

  it('references test-discovery-audit', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('test-discovery-audit');
  });

  it('references openspec-task-audit', () => {
    const content = scriptContent('verify-v06.mjs');
    expect(content).toContain('openspec-task-audit');
  });
});

// ── CI workflow ───────────────────────────────────────────────────────────────

describe('CI workflow', () => {
  const CI_FILE = path.join(ROOT, '.github', 'workflows', 'ci.yml');

  it('ci.yml exists', () => {
    expect(fs.existsSync(CI_FILE)).toBe(true);
  });

  it('runs npm test', () => {
    const content = fs.readFileSync(CI_FILE, 'utf8');
    expect(content).toContain('npm test');
  });

  it('runs npm run build', () => {
    const content = fs.readFileSync(CI_FILE, 'utf8');
    expect(content).toContain('npm run build');
  });

  it('runs secret audit', () => {
    const content = fs.readFileSync(CI_FILE, 'utf8');
    expect(content).toContain('secret-audit');
  });

  it('runs generated-file audit', () => {
    const content = fs.readFileSync(CI_FILE, 'utf8');
    expect(content).toContain('generated-file-audit');
  });

  it('runs bundle smoke dry-run', () => {
    const content = fs.readFileSync(CI_FILE, 'utf8');
    expect(content).toContain('bundle smoke');
  });

  it('does not require external secrets', () => {
    const content = fs.readFileSync(CI_FILE, 'utf8');
    expect(content).not.toContain('OPENAI_API_KEY:');
    expect(content).not.toContain('ANTHROPIC_API_KEY:');
    expect(content).not.toContain('secrets.OPENAI');
    expect(content).not.toContain('secrets.ANTHROPIC');
  });
});

// ── billing export ────────────────────────────────────────────────────────────

describe('billing export command', () => {
  it('billingExportCommand exists in missionctl', () => {
    const content = fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8');
    expect(content).toContain('billingExportCommand');
  });

  it('billing export command is routed in main()', () => {
    const content = fs.readFileSync(path.join(ROOT, 'missionctl', 'missionctl.mjs'), 'utf8');
    expect(content).toContain("group === 'billing'");
    expect(content).toContain("cmd === 'export'");
  });

  it('billing export runs and returns tenant-scoped JSON', () => {
    const result = execSync(
      'node missionctl/missionctl.mjs billing export demo-pnw',
      { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, DATA_DIR: `/tmp/test-billing-${Date.now()}` } }
    );
    const parsed = JSON.parse(result);
    expect(parsed.ok).toBe(true);
    expect(parsed.tenant_id).toBe('demo-pnw');
    expect(parsed.model_usage).toBeDefined();
    expect(parsed.artifact_counts).toBeDefined();
  });

  it('billing export contains no raw secrets', () => {
    const result = execSync(
      'node missionctl/missionctl.mjs billing export demo-pnw',
      { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, DATA_DIR: `/tmp/test-billing-${Date.now()}` } }
    );
    expect(result).not.toMatch(/sk-[A-Za-z0-9]{20}/);
    expect(result).not.toMatch(/ok_[a-zA-Z0-9_-]+_[a-f0-9]{20}/);
    expect(result).not.toMatch(/NEXTAUTH_SECRET/);
  });
});

// ── Phase 6 hotfix regression guard ──────────────────────────────────────────

describe('Phase 6 hotfix regression guard', () => {
  it('.gitignore blocks handoff hermes/env', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(gitignore).toContain('handoff/*/managed/hermes/env');
  });

  it('.gitignore blocks handoff langfuse/env', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(gitignore).toContain('handoff/*/managed/langfuse/env');
  });

  it('.gitignore blocks handoff litellm/env', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(gitignore).toContain('handoff/*/managed/litellm/env');
  });

  it('.gitignore blocks handoff open-webui/env', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(gitignore).toContain('handoff/*/managed/open-webui/env');
  });

  it('.gitignore blocks handoff release-manifest.json', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(gitignore).toContain('handoff/*/managed/release-manifest.json');
  });

  it('.env.managed.example is still tracked (safe template)', () => {
    const tracked = trackedFiles();
    expect(tracked).toContain('handoff/demo-pnw/managed/.env.managed.example');
  });
});
