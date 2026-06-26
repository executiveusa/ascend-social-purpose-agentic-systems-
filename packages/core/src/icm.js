import fs from 'node:fs';
import path from 'node:path';
import { assertTenantBoundary } from './safety.js';

export const stageDefinitions = [
  ['01_onboarding', 'Collect the organization profile and write stable Layer 3 configuration.'],
  ['02_opportunity_scan', 'Find grants, credits, sponsors, and local Seattle resources.'],
  ['03_grant_application', 'Prepare grant/app draft materials. Human approval required before submission.'],
  ['04_campaign_creation', 'Create donor, volunteer, and social campaign drafts.'],
  ['05_approval_gate', 'Review risk, source claims, and approval requirements.'],
  ['06_publish_or_submit', 'Prepare final send/post/submit package after approval.'],
  ['07_outcome_logging', 'Log outputs, program outcomes, metrics, and donor/staff feedback.'],
  ['08_workspace_learning', 'Convert repeated human edits into source-level improvements.']
];

export function tenantRoot(base, tenantId) {
  assertTenantBoundary(tenantId);
  return path.join(base, 'tenants', tenantId);
}

export function ensureIcmWorkspace({ base = 'icm', tenantId = 'asc3nd', orgName = 'Asc3nd Collective' } = {}) {
  const root = tenantRoot(base, tenantId);
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(path.join(root, '_config'), { recursive: true });
  fs.mkdirSync(path.join(root, 'memory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'audit_log'), { recursive: true });

  writeIfMissing(path.join(root, 'AGENT.md'), `# ${orgName} Mission Agent\n\nYou are the primary Pi-compatible mission operations agent for ${orgName}. Use ICM folders as the control surface. Never skip approval gates.\n`);
  writeIfMissing(path.join(root, 'CONTEXT.md'), `# Workspace Routing\n\nTenant: ${tenantId}\nOrganization: ${orgName}\n\nRead AGENT.md first, then select the numbered stage that matches the requested outcome. Load only the files listed by that stage contract.\n`);

  const config = {
    'mission.md': `# Mission\n\n${orgName} exists to create measurable community outcomes. Replace this with the final client mission during onboarding.\n`,
    'brand.md': `# Brand\n\nVoice: clear, warm, direct, Seattle-native, youth-safe, outcome-focused.\n`,
    'safety-policy.md': `# Safety Policy\n\nRed actions require authorized human approval: youth records, money, legal/compliance, grant submissions, donor commitments, public claims.\n`,
    'model-routing.md': `# Model Routing\n\nCheap models handle extraction and formatting. Standard models handle drafting and comparison. Critical models handle high-risk reasoning.\n`,
    'seattle-resources.md': `# Seattle Resource Layer\n\nTrack Seattle, King County, Washington State, tech, foundation, sponsor, and youth/sports opportunities. Verify all open dates and eligibility before acting.\n`
  };
  for (const [file, body] of Object.entries(config)) writeIfMissing(path.join(root, '_config', file), body);

  for (const [stage, description] of stageDefinitions) {
    const dir = path.join(root, 'stages', stage);
    fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'output'), { recursive: true });
    writeIfMissing(path.join(dir, 'CONTEXT.md'), stageContext(stage, description));
  }
  return root;
}

export function stageContext(stage, description) {
  return `# ${stage}\n\n${description}\n\n## Inputs\n\n- Layer 0: ../../AGENT.md\n- Layer 1: ../../CONTEXT.md\n- Layer 2: this CONTEXT.md\n- Layer 3: ../../_config/*.md and references/*.md\n- Layer 4: previous stage output/ as applicable\n\n## Process\n\n1. Load only relevant context.\n2. Produce a concrete artifact, not vague advice.\n3. Classify the action risk as green, yellow, orange, or red.\n4. Write outputs to this stage's output folder.\n5. If approval is needed, create an approval request.\n\n## Outputs\n\n- output/result.md\n- output/audit.json\n- optional output/approval-request.json\n\n## Verify\n\n- Output matches mission and safety policy.\n- Claims have source notes or are marked for verification.\n- No red/orange action is performed without approval.\n`;
}

export function writeStageOutput({ base = 'icm', tenantId = 'asc3nd', stage = '02_opportunity_scan', filename = 'result.md', content = '' }) {
  assertTenantBoundary(tenantId, `${stage}/${filename}`);
  const root = tenantRoot(base, tenantId);
  const out = path.join(root, 'stages', stage, 'output');
  fs.mkdirSync(out, { recursive: true });
  const target = path.join(out, filename);
  fs.writeFileSync(target, content, 'utf8');
  return target;
}

export function listIcmTree({ base = 'icm', tenantId = 'asc3nd' } = {}) {
  const root = tenantRoot(base, tenantId);
  if (!fs.existsSync(root)) return [];
  const results = [];
  walk(root, root, results);
  return results;
}

function walk(root, current, results) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(current, entry.name);
    const rel = path.relative(root, full);
    results.push({ path: rel, type: entry.isDirectory() ? 'dir' : 'file' });
    if (entry.isDirectory()) walk(root, full, results);
  }
}

function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, 'utf8');
}
