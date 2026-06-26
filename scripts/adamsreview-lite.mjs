#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reviews', 'adamsreview');
const now = new Date().toISOString();
fs.mkdirSync(OUT, { recursive: true });

const findings = [];
const add = (lens, severity, title, file, detail, fix) => findings.push({
  id: `F${String(findings.length + 1).padStart(3, '0')}`,
  lens,
  severity,
  title,
  file,
  detail,
  fix,
  status: severity === 'blocker' ? 'must_fix' : severity === 'high' ? 'should_fix' : 'accepted_or_documented'
});

const read = (rel) => fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '';
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// Lens 1: repeatable deployment
if (!read('missionctl/missionctl.mjs').includes('hostingerHandoff')) add('repeatability', 'blocker', 'No Hostinger handoff generator', 'missionctl/missionctl.mjs', 'Repeatable deployments require generated env, DNS, Caddy, frontend bridge, and smoke-test docs.', 'Add missionctl hostinger handoff.');
if (!exists('HOSTINGER-VPS-HANDOFF.md')) add('repeatability', 'high', 'Root handoff file missing', 'HOSTINGER-VPS-HANDOFF.md', 'The deployer needs a single handoff file at repo root.', 'Generate with missionctl hostinger handoff asc3nd.');
if (!read('missionctl/missionctl.mjs').includes('frontend scaffold')) add('repeatability', 'high', 'Frontend scaffold command missing', 'missionctl/missionctl.mjs', 'Custom frontends should be generated without backend rework.', 'Keep frontend scaffold command.');

// Lens 2: frontend bridge correctness
const server = read('services/mission-api/server.js');
if (!server.includes('x-idempotency-key')) add('bridge', 'high', 'Public bridge has no idempotency guard', 'services/mission-api/server.js', 'Repeated form submissions can create duplicate CRM records/tasks.', 'Store and replay idempotency keys per tenant.');
if (!server.includes('allowedOrigins')) add('bridge', 'high', 'Public bridge does not enforce tenant allowed origins', 'services/mission-api/server.js', 'Custom frontends must not let arbitrary origins submit into a tenant.', 'Verify origin against tenant keys.');
if (!read('packages/mission-sdk-js/src/index.js').includes('MissionClient')) add('bridge', 'blocker', 'Frontend SDK missing', 'packages/mission-sdk-js/src/index.js', 'A repeatable frontend/backend bridge requires an SDK.', 'Add MissionClient.');

// Lens 3: security and youth safety
if (server.includes("'dev-only-secret-change-me'") && !server.includes('Production requires JWT_SECRET')) add('security', 'blocker', 'Dev JWT secret can run in production', 'services/mission-api/server.js', 'Production must hard-fail without a strong JWT_SECRET.', 'Add production env guard.');
if (!read('packages/core/src/safety.js').includes('minor')) add('safety', 'high', 'Youth safety classifier lacks minor/child terms', 'packages/core/src/safety.js', 'Youth-serving nonprofits need deterministic red-risk rules.', 'Classify youth/minor/legal/money actions as red.');
if (!server.includes('rateLimit')) add('security', 'high', 'No API rate limit', 'services/mission-api/server.js', 'Public bridge needs basic abuse controls.', 'Add per-IP rate limit.');

// Lens 4: ICM architecture
if (!exists('icm/tenant-template/CONTEXT.md')) add('icm', 'blocker', 'ICM tenant template missing', 'icm/tenant-template/CONTEXT.md', 'ICM requires workspace routing and stage contracts.', 'Restore ICM template.');
if (!read('packages/core/src/icm.js').includes('08_workspace_learning')) add('icm', 'medium', 'Workspace learning stage missing', 'packages/core/src/icm.js', 'The system should improve its own source/context files over time.', 'Add 08_workspace_learning stage.');
if (!exists('services/mission-icm-rs/src/main.rs')) add('icm', 'high', 'Rust ICM safe runner missing', 'services/mission-icm-rs/src/main.rs', 'Path-safe folder execution should live in a stricter layer.', 'Add Rust ICM loader/runner.');

// Lens 5: CRM operations
if (!read('packages/core/src/crm.js').includes('pipelineTemplates')) add('crm', 'blocker', 'CRM pipeline templates missing', 'packages/core/src/crm.js', 'Nonprofits need funding/donor/volunteer/program/sponsor pipelines.', 'Add nonprofit-native CRM pipelines.');
if (!server.includes('/api/crm/tasks')) add('crm', 'high', 'Staff tasks are not exposed', 'services/mission-api/server.js', 'Inbound bridge events should become concrete staff tasks.', 'Add task list endpoint and task creation.');

// Lens 6: production handoff
if (!exists('docs/V0.5-PRODUCTION-HANDOFF.md')) add('handoff', 'medium', 'v0.5 production handoff doc missing', 'docs/V0.5-PRODUCTION-HANDOFF.md', 'Future builders need a concise build status and next actions file.', 'Add production handoff document.');
if (!exists('docs/ADAMSREVIEW-FINAL.md')) add('review', 'medium', 'AdamsReview findings doc missing', 'docs/ADAMSREVIEW-FINAL.md', 'Review output should be committed with the release.', 'Write final review doc.');

const artifact = {
  reviewId: `mission-os-v05-${Date.now()}`,
  tool: 'adamsreview-lite',
  modeledAfter: 'adamjgmiller/adamsreview multi-lens review -> validation -> fix loop -> artifact',
  createdAt: now,
  lenses: ['repeatability', 'bridge', 'security', 'safety', 'icm', 'crm', 'handoff'],
  summary: {
    totalFindings: findings.length,
    blockers: findings.filter((f) => f.severity === 'blocker').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    verdict: findings.some((f) => f.severity === 'blocker') ? 'fix_required' : findings.some((f) => f.severity === 'high') ? 'ship_with_followups' : 'release_candidate'
  },
  findings
};
fs.writeFileSync(path.join(OUT, 'artifact.json'), JSON.stringify(artifact, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT, 'FINAL-REVIEW.md'), renderMarkdown(artifact), 'utf8');
console.log(JSON.stringify(artifact.summary, null, 2));
if (artifact.summary.blockers > 0) process.exit(1);

function renderMarkdown(a) {
  return `# AdamsReview-Lite Final Review — Mission OS v0.5\n\nGenerated: ${a.createdAt}\n\nModeled after the adamsreview pattern: multi-lens review, validation gates, persistent JSON artifact, and fix-oriented findings.\n\n## Verdict\n\n${a.summary.verdict}\n\n## Summary\n\n- Total findings: ${a.summary.totalFindings}\n- Blockers: ${a.summary.blockers}\n- High: ${a.summary.high}\n- Medium: ${a.summary.medium}\n\n## Findings\n\n${a.findings.length ? a.findings.map((f) => `### ${f.id} — ${f.title}\n\n- Lens: ${f.lens}\n- Severity: ${f.severity}\n- File: \`${f.file}\`\n- Detail: ${f.detail}\n- Fix: ${f.fix}\n- Status: ${f.status}\n`).join('\n') : 'No blocker/high findings detected by repository-level release checks.'}\n\n## Release interpretation\n\nThis review is not a replacement for a real Claude Code plugin run, Rust compilation, Docker deployment, or tenant isolation test suite. It is a committed release gate that checks the architecture we agreed on: repeatable Hostinger handoff, frontend bridge, CRM, ICM folders, safety guards, and flywheel-ready deployment.\n`;
}
