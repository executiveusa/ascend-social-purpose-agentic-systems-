import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

// P0-5: ICM runner hardening.
// Validates tenant paths, reads Layer 0-4 context, refuses path traversal,
// writes result.md / audit.json / approval-request.json, indexes artifact
// metadata, never loads unrelated tenant files.

export function validateStageName(stage) {
  if (!/^[a-z0-9][a-z0-9_]*$/.test(stage)) {
    throw new Error(`Invalid stage name: ${stage}. Use lowercase letters, numbers, and underscores.`);
  }
  return stage;
}

export function safeStagePath(base, tenantId, stage, filename = '') {
  assertTenantBoundary(tenantId, `${stage}/${filename}`);
  validateStageName(stage);
  const root = tenantRoot(base, tenantId);
  const target = path.join(root, 'stages', stage, 'output');
  const resolved = filename ? path.resolve(target, filename) : target;
  // Ensure the resolved path is inside the stage output dir (refuse traversal).
  if (!resolved.startsWith(path.resolve(target)) && resolved !== path.resolve(target)) {
    throw new Error('Path traversal refused. Stage output cannot escape the stage output directory.');
  }
  return resolved;
}

export function readStageContext({ base, tenantId, stage }) {
  assertTenantBoundary(tenantId, stage);
  validateStageName(stage);
  const root = tenantRoot(base, tenantId);
  const stageDir = path.join(root, 'stages', stage);
  if (!fs.existsSync(stageDir)) throw new Error(`Stage not found: ${stage}`);

  // Layer 0: AGENT.md
  const agent = readText(path.join(root, 'AGENT.md'));
  // Layer 1: CONTEXT.md
  const workspace = readText(path.join(root, 'CONTEXT.md'));
  // Layer 2: stage CONTEXT.md
  const stageContext = readText(path.join(stageDir, 'CONTEXT.md'));
  // Layer 3: _config/*.md
  const configDir = path.join(root, '_config');
  const config = fs.existsSync(configDir)
    ? fs.readdirSync(configDir).filter((f) => f.endsWith('.md')).map((f) => ({ file: f, content: readText(path.join(configDir, f)) }))
    : [];
  // Layer 3b: stage references/*.md
  const refsDir = path.join(stageDir, 'references');
  const references = fs.existsSync(refsDir)
    ? fs.readdirSync(refsDir).filter((f) => f.endsWith('.md')).map((f) => ({ file: f, content: readText(path.join(refsDir, f)) }))
    : [];
  // Layer 4: previous stage output (best effort)
  const previousStage = stageDefinitions[stageDefinitions.findIndex(([s]) => s === stage) - 1];
  const previousOutput = previousStage ? readPreviousOutput(base, tenantId, previousStage[0]) : null;

  return { agent, workspace, stageContext, config, references, previousStage: previousStage?.[0] || null, previousOutput };
}

function readPreviousOutput(base, tenantId, stage) {
  const dir = path.join(tenantRoot(base, tenantId), 'stages', stage, 'output');
  if (!fs.existsSync(dir)) return null;
  const result = path.join(dir, 'result.md');
  return fs.existsSync(result) ? readText(result) : null;
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

export function runIcmStage({ base = 'icm', tenantId = 'asc3nd', stage, result = '', audit = {}, approvalRequest = null, onArtifact } = {}) {
  assertTenantBoundary(tenantId, stage);
  validateStageName(stage);
  const context = readStageContext({ base, tenantId, stage });
  const outDir = safeStagePath(base, tenantId, stage);
  fs.mkdirSync(outDir, { recursive: true });

  const now = new Date().toISOString();
  const artifacts = [];

  // result.md
  const resultPath = path.join(outDir, 'result.md');
  fs.writeFileSync(resultPath, result || `# ${stage} result\n\nGenerated ${now}\n`, 'utf8');
  artifacts.push({ stage, filename: 'result.md', path: resultPath, createdAt: now });

  // audit.json
  const auditPath = path.join(outDir, 'audit.json');
  const auditBody = { stage, tenantId, ranAt: now, contextLayers: { agent: Boolean(context.agent), workspace: Boolean(context.workspace), stageContext: Boolean(context.stageContext), configFiles: context.config.length, referenceFiles: context.references.length, previousStage: context.previousStage }, ...audit };
  fs.writeFileSync(auditPath, JSON.stringify(auditBody, null, 2), 'utf8');
  artifacts.push({ stage, filename: 'audit.json', path: auditPath, createdAt: now });

  // approval-request.json (only when needed)
  if (approvalRequest) {
    const apPath = path.join(outDir, 'approval-request.json');
    fs.writeFileSync(apPath, JSON.stringify({ stage, tenantId, createdAt: now, ...approvalRequest }, null, 2), 'utf8');
    artifacts.push({ stage, filename: 'approval-request.json', path: apPath, createdAt: now });
  }

  // Index artifact metadata via callback (wired to the DB repo in the API).
  if (typeof onArtifact === 'function') {
    for (const a of artifacts) {
      onArtifact({ id: `icm_${crypto.randomBytes(4).toString('hex')}`, tenantId, ...a });
    }
  }

  return { stage, tenantId, outDir, artifacts, context };
}
