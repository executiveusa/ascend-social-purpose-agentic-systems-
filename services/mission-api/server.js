import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import operatorRouter from './src/operator/index.js';
import { rankedOpportunities, buildOpportunityChecklist } from '@asc3nd/core/opportunities';
import { classifyAction, redactSensitive } from '@asc3nd/core/safety';
import { routeModel } from '@asc3nd/core/model-router';
import { ensureIcmWorkspace, listIcmTree, writeStageOutput } from '@asc3nd/core/icm';
import { normalizeLlmExport } from '@asc3nd/core/llm-imports';
import { summarizeOutcomes } from '@asc3nd/core/outcomes';
import { buildReadiness, buildTodayPlan, computeMissionScore, outcomeActions } from '@asc3nd/core/readiness';
import { pipelineTemplates, movePipelineItem } from '@asc3nd/core/crm';
import { applyPublicSubmission, verifyOrigin, verifyPublicKey } from '@asc3nd/core/bridge';
import { cleanTenantSlug, createPublicKey, createSecretKey, defaultTenantProfile } from '@asc3nd/core/tenant';
import { checkIdempotency, fingerprintSubmission, recordIdempotency } from '@asc3nd/core/idempotency';
import { createRepositories, assertProductionStorage, storageMode } from '@asc3nd/db';
import { assertTenantAccess, canApproveAction, canViewLane } from '@asc3nd/core/rbac';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');
const ICM_ROOT = process.env.ICM_ROOT || path.resolve(process.cwd(), 'icm');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const demoEmail = process.env.DEMO_ADMIN_EMAIL || 'admin@asc3nd.local';
const demoPassword = process.env.DEMO_ADMIN_PASSWORD || 'change-this-password';
const allowedOrigins = String(process.env.CORS_ORIGIN || process.env.PUBLIC_SITE_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// P0-2: production refuses JSON storage. Postgres is the source of truth.
assertProductionStorage();
const repos = createRepositories({ baseDir: DATA_DIR });

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || JWT_SECRET === 'dev-only-secret-change-me' || JWT_SECRET.length < 32) {
    throw new Error('Production requires JWT_SECRET with at least 32 characters.');
  }
  if (demoPassword === 'change-this-password') {
    throw new Error('Production requires DEMO_ADMIN_PASSWORD to be changed.');
  }
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ICM_ROOT, { recursive: true });
ensureIcmWorkspace({ base: ICM_ROOT, tenantId: 'asc3nd', orgName: 'Asc3nd Collective' });

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(rateLimit);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }));


app.post('/api/public/:tenantId/:kind', (req, res) => {
  const tenantId = cleanTenantSlug(req.params.tenantId);
  const kind = String(req.params.kind || 'contact').toLowerCase();
  const keys = readJson(keysPath(tenantId), null);
  if (!keys || !verifyPublicKey(req.headers['x-mission-public-key'], keys)) return res.status(401).json({ error: 'Invalid public key' });
  const origin = normalizeOrigin(req.headers.origin || req.headers.referer || '');
  if (origin && keys.allowedOrigins?.length && !verifyOrigin(origin, keys.allowedOrigins)) return res.status(403).json({ error: 'Origin not allowed' });

  const idempotencyKey = req.headers['x-idempotency-key'];
  const fingerprint = fingerprintSubmission({ tenantId, kind, payload: req.body || {} });
  const idemFile = idempotencyPath(tenantId);
  const idemRecords = readJson(idemFile, []);
  const idem = checkIdempotency({ records: idemRecords, key: idempotencyKey, fingerprint });
  if (!idem.ok) return res.status(idem.status || 409).json(idem.response || { error: 'Idempotency conflict' });
  if (idem.replay) return res.status(idem.status || 200).json({ ...idem.response, replayed: true });

  const state = {
    contacts: readJson(contactsPath(tenantId), []),
    interactions: readJson(interactionsPath(tenantId), []),
    pipelineItems: readJson(pipelineItemsPath(tenantId), [])
  };
  const result = applyPublicSubmission({ kind, payload: req.body || {}, meta: { referer: req.headers.referer, userAgent: req.headers['user-agent'], ip: req.ip }, state });
  if (!result.ok) return res.status(result.status || 400).json({ error: result.errors?.join(' ') || 'Submission rejected', errors: result.errors || [] });
  writeJson(contactsPath(tenantId), result.state.contacts);
  writeJson(interactionsPath(tenantId), result.state.interactions);
  writeJson(pipelineItemsPath(tenantId), result.state.pipelineItems);
  createTask(tenantId, {
    title: result.pipelineItem.title,
    type: `public-${kind}`,
    contactId: result.contact.id,
    pipelineItemId: result.pipelineItem.id,
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: 'open'
  });
  const response = { ok: true, receipt: result.receipt, contactId: result.contact.id, pipelineItemId: result.pipelineItem.id };
  writeJson(idemFile, recordIdempotency({ records: idem.records, key: idempotencyKey, fingerprint, status: result.status, response }));
  audit(tenantId, 'public.submission.accepted', { kind, contactId: result.contact.id, pipelineItemId: result.pipelineItem.id });
  res.status(result.status).json(response);
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'mission-api', version: '0.5.0', dataDir: DATA_DIR, icmRoot: ICM_ROOT, time: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (email === demoEmail && password === demoPassword) {
    const token = signToken({ sub: 'admin', email, role: 'owner', tenantId: 'asc3nd' });
    return res.json({ token, user: { email, role: 'owner', tenantId: 'asc3nd' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));


app.post('/api/tenant/provision', requireAuth, (req, res) => {
  if (!['owner', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Owner/admin required' });
  const tenantId = cleanTenantSlug(req.body.tenantId || req.body.slug || 'new-nonprofit');
  const profile = defaultTenantProfile({ tenantId, orgName: req.body.orgName || 'New Mission Organization', region: req.body.region || 'Seattle / King County', niche: req.body.niche || 'youth, sports, mentorship' });
  const publicKey = createPublicKey(tenantId);
  const secretKey = createSecretKey(tenantId);
  writeJson(profilePath(tenantId), profile);
  writeJson(keysPath(tenantId), { tenantId, publicKey, secretKeyHash: crypto.createHash('sha256').update(secretKey).digest('hex'), allowedOrigins: profile.publicOrigins, apiBaseUrl: process.env.PUBLIC_API_URL || `http://localhost:${PORT}`, createdAt: new Date().toISOString() });
  ensureIcmWorkspace({ base: ICM_ROOT, tenantId, orgName: profile.orgName });
  audit(tenantId, 'tenant.provisioned', { orgName: profile.orgName, createdBy: req.user.email });
  res.json({ ok: true, tenantId, profile, publicKey, secretKey, next: [`missionctl frontend scaffold ${tenantId}`, `missionctl smoke ${tenantId}`] });
});

app.get('/api/tenant/keys', requireAuth, (req, res) => {
  const keys = readJson(keysPath(req.user.tenantId), null);
  if (!keys) return res.status(404).json({ error: 'No public bridge keys found' });
  res.json({ tenantId: req.user.tenantId, publicKey: keys.publicKey, allowedOrigins: keys.allowedOrigins || [], apiBaseUrl: keys.apiBaseUrl });
});

app.post('/api/tenant/bootstrap', requireAuth, (req, res) => {
  const tenantId = cleanTenant(req.body.tenantId || req.user.tenantId || 'asc3nd');
  const orgName = req.body.orgName || 'New Mission Organization';
  const root = ensureIcmWorkspace({ base: ICM_ROOT, tenantId, orgName });
  audit(tenantId, 'tenant.bootstrap', { orgName, root });
  res.json({ ok: true, tenantId, root });
});

app.get('/api/onboarding', requireAuth, (req, res) => {
  res.json(readJson(profilePath(req.user.tenantId), defaultProfile()));
});

app.post('/api/onboarding', requireAuth, (req, res) => {
  const tenantId = req.user.tenantId;
  const profile = { ...defaultProfile(), ...req.body, updatedAt: new Date().toISOString() };
  writeJson(profilePath(tenantId), profile);
  ensureIcmWorkspace({ base: ICM_ROOT, tenantId, orgName: profile.orgName || 'Mission Organization' });
  const configDir = path.join(ICM_ROOT, 'tenants', tenantId, '_config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'mission.md'), `# Mission\n\n${profile.mission || ''}\n\n## Programs\n\n${profile.programs || ''}\n`, 'utf8');
  fs.writeFileSync(path.join(configDir, 'founder-profile.md'), `# Founder Profile\n\nFounder: ${profile.founderName || ''}\n\nPriorities: ${profile.priorities || ''}\n`, 'utf8');
  audit(tenantId, 'onboarding.saved', { orgName: profile.orgName, region: profile.region });
  res.json({ ok: true, profile });
});

app.get('/api/today', requireAuth, (req, res) => {
  const tenantId = req.user.tenantId;
  const profile = readJson(profilePath(tenantId), defaultProfile());
  const opportunities = rankedOpportunities(profile).map((item) => ({ ...item, checklist: buildOpportunityChecklist(item) }));
  const approvals = readJson(approvalsPath(tenantId), []);
  const outcomes = readJson(outcomesPath(tenantId), []);
  const readiness = buildReadiness(profile);
  const adapters = adapterStatus();
  const actions = buildTodayPlan({ profile, opportunities, approvals, outcomes, adapters });
  const score = computeMissionScore({ readiness, approvals, outcomes, opportunities });
  res.json({ profile, score, actions, readiness, opportunities: opportunities.slice(0, 5), approvals: approvals.slice(0, 5), lanes: summarizeOutcomes(outcomes), adapters, outcomeActions });
});

app.get('/api/readiness', requireAuth, (req, res) => {
  const profile = readJson(profilePath(req.user.tenantId), defaultProfile());
  res.json({ readiness: buildReadiness(profile), outcomeActions });
});

app.get('/api/adapters/status', requireAuth, (_req, res) => {
  res.json({ adapters: adapterStatus() });
});

app.get('/api/opportunities', requireAuth, (req, res) => {
  const profile = readJson(profilePath(req.user.tenantId), defaultProfile());
  const opportunities = rankedOpportunities(profile).map((item) => ({ ...item, checklist: buildOpportunityChecklist(item) }));
  res.json({ profile, opportunities });
});

app.post('/api/opportunities/:id/start', requireAuth, (req, res) => {
  const profile = readJson(profilePath(req.user.tenantId), defaultProfile());
  const opportunity = rankedOpportunities(profile).find((item) => item.id === req.params.id);
  if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
  const risk = classifyAction(`prepare ${opportunity.name} application`);
  const approval = createApproval(req.user.tenantId, {
    title: `Review ${opportunity.name} workflow`,
    risk,
    summary: `AI prepared a workflow plan for ${opportunity.name}. Human must verify eligibility and approve next external action.`,
    payload: opportunity
  });
  const result = `# ${opportunity.name} Workflow\n\nScore: ${opportunity.score}\n\nNext action: ${opportunity.nextAction}\n\nRisk: ${risk}\n\nChecklist:\n${buildOpportunityChecklist(opportunity).map((x) => `- ${x}`).join('\n')}\n`;
  const file = writeStageOutput({ base: ICM_ROOT, tenantId: req.user.tenantId, stage: '02_opportunity_scan', filename: `${opportunity.id}.md`, content: result });
  audit(req.user.tenantId, 'opportunity.started', { opportunityId: opportunity.id, risk, file });
  res.json({ ok: true, opportunity, approval, file });
});

app.get('/api/approvals', requireAuth, (req, res) => {
  res.json(readJson(approvalsPath(req.user.tenantId), []));
});

app.post('/api/approvals/:id/decision', requireAuth, (req, res) => {
  const approvals = readJson(approvalsPath(req.user.tenantId), []);
  const idx = approvals.findIndex((item) => item.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Approval not found' });
  const approved = req.body.decision === 'approve';
  // P0-6: enforce RBAC on approval decisions.
  if (approved && !canApproveAction(req.user, approvals[idx].risk)) {
    audit(req.user.tenantId, 'approval.denied', { approvalId: req.params.id, reason: `Role ${req.user.role} cannot approve ${approvals[idx].risk} actions` });
    return res.status(403).json({ error: `Role '${req.user.role}' cannot approve ${approvals[idx].risk} actions.` });
  }
  const nextStatus = approved ? 'approved_ready_for_execution' : 'rejected';
  approvals[idx] = {
    ...approvals[idx],
    status: nextStatus,
    decidedAt: new Date().toISOString(),
    decidedBy: req.user.email,
    note: req.body.note || '',
    executionPolicy: approved ? buildExecutionPolicy(approvals[idx]) : undefined
  };
  writeJson(approvalsPath(req.user.tenantId), approvals);
  if (approved) {
    const content = `# Approved Action Package\n\nApproval: ${approvals[idx].id}\nTitle: ${approvals[idx].title}\nRisk: ${approvals[idx].risk}\n\nHuman approved. Execute only through the configured adapter and preserve audit logs.\n\n## Summary\n\n${approvals[idx].summary || ''}\n`;
    writeStageOutput({ base: ICM_ROOT, tenantId: req.user.tenantId, stage: '05_approval_gate', filename: `${approvals[idx].id}-approved.md`, content });
  }
  audit(req.user.tenantId, 'approval.decision', { approvalId: req.params.id, status: approvals[idx].status });
  res.json({ ok: true, approval: approvals[idx] });
});


app.get('/api/crm/contacts', requireAuth, (req, res) => {
  res.json({ contacts: readJson(contactsPath(req.user.tenantId), []) });
});

app.get('/api/crm/pipelines', requireAuth, (req, res) => {
  res.json({ templates: pipelineTemplates, items: readJson(pipelineItemsPath(req.user.tenantId), []) });
});

app.post('/api/crm/pipelines/:itemId/move', requireAuth, (req, res) => {
  const current = readJson(pipelineItemsPath(req.user.tenantId), []);
  const { items, item } = movePipelineItem(current, req.params.itemId, req.body.stage);
  if (!item) return res.status(404).json({ error: 'Pipeline item not found' });
  writeJson(pipelineItemsPath(req.user.tenantId), items);
  audit(req.user.tenantId, 'crm.pipeline.moved', { itemId: item.id, stage: item.stage });
  res.json({ ok: true, item });
});

app.get('/api/crm/interactions', requireAuth, (req, res) => {
  res.json({ interactions: readJson(interactionsPath(req.user.tenantId), []) });
});

app.get('/api/crm/tasks', requireAuth, (req, res) => {
  res.json({ tasks: readJson(tasksPath(req.user.tenantId), []) });
});

app.post('/api/crm/tasks/:id/complete', requireAuth, (req, res) => {
  const tasks = readJson(tasksPath(req.user.tenantId), []);
  const idx = tasks.findIndex((task) => task.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Task not found' });
  tasks[idx] = { ...tasks[idx], status: 'completed', completedAt: new Date().toISOString(), completedBy: req.user.email };
  writeJson(tasksPath(req.user.tenantId), tasks);
  audit(req.user.tenantId, 'crm.task.completed', { taskId: req.params.id });
  res.json({ ok: true, task: tasks[idx] });
});

app.get('/api/second-brain/notes', requireAuth, (req, res) => {
  const vault = vaultDir(req.user.tenantId);
  fs.mkdirSync(vault, { recursive: true });
  const notes = fs.readdirSync(vault).filter((f) => f.endsWith('.md')).map((file) => ({ file, title: file.replace(/\.md$/, '').replace(/-/g, ' '), body: fs.readFileSync(path.join(vault, file), 'utf8') }));
  res.json({ notes });
});

app.post('/api/second-brain/note', requireAuth, (req, res) => {
  const vault = vaultDir(req.user.tenantId);
  fs.mkdirSync(vault, { recursive: true });
  const title = String(req.body.title || 'Untitled note').slice(0, 100);
  const file = `${slug(title)}.md`;
  const body = `# ${title}\n\n${req.body.body || ''}\n\n---\nCreated: ${new Date().toISOString()}\n`;
  fs.writeFileSync(path.join(vault, file), body, 'utf8');
  audit(req.user.tenantId, 'second-brain.note.created', { file });
  res.json({ ok: true, file, body });
});

app.post('/api/imports/llm', requireAuth, (req, res) => {
  const sourceType = req.body.sourceType || 'generic';
  const notes = normalizeLlmExport(sourceType, req.body.payload || '');
  const dir = path.join(vaultDir(req.user.tenantId), 'llm-imports');
  fs.mkdirSync(dir, { recursive: true });
  for (const note of notes) fs.writeFileSync(path.join(dir, note.filename), note.body, 'utf8');
  audit(req.user.tenantId, 'llm.import', { sourceType, count: notes.length });
  res.json({ ok: true, imported: notes.map(({ title, filename }) => ({ title, filename })) });
});

app.get('/api/campaigns', requireAuth, (req, res) => res.json(readJson(campaignsPath(req.user.tenantId), [])));

app.post('/api/campaigns/draft', requireAuth, async (req, res) => {
  const profile = readJson(profilePath(req.user.tenantId), defaultProfile());
  const topic = req.body.topic || 'Youth program update';
  const campaign = {
    id: id('camp'),
    topic,
    status: 'draft',
    createdAt: new Date().toISOString(),
    approvalClass: 'orange',
    posts: [
      { channel: 'LinkedIn', copy: `${profile.orgName || 'Our team'} is building measurable outcomes for Seattle youth. ${topic}.`, status: 'needs_review' },
      { channel: 'Instagram', copy: `Seattle youth deserve consistent support. ${topic}.`, status: 'needs_review' },
      { channel: 'Email', copy: `Subject: ${topic}\n\nHere is the latest program update and next action for supporters.`, status: 'needs_review' }
    ],
    postiz: buildPostizPayload(topic)
  };
  const campaigns = readJson(campaignsPath(req.user.tenantId), []);
  campaigns.unshift(campaign);
  writeJson(campaignsPath(req.user.tenantId), campaigns);
  const approval = createApproval(req.user.tenantId, { title: `Approve campaign: ${topic}`, risk: 'orange', summary: 'Review all copy before Postiz scheduling or external publishing.', payload: campaign });
  audit(req.user.tenantId, 'campaign.drafted', { campaignId: campaign.id });
  res.json({ ok: true, campaign, approval });
});

app.post('/api/voice/webhook', (req, res) => {
  const tenantId = cleanTenant(req.query.tenantId || req.body.tenantId || 'asc3nd');
  const call = { id: id('call'), at: new Date().toISOString(), from: req.body.From || req.body.from || 'unknown', transcript: redactSensitive(req.body.TranscriptionText || req.body.transcript || ''), status: 'logged' };
  const calls = readJson(callsPath(tenantId), []);
  calls.unshift(call);
  writeJson(callsPath(tenantId), calls);
  audit(tenantId, 'voice.call.logged', { callId: call.id, from: call.from });
  res.json({ ok: true, call });
});

app.get('/api/voice/calls', requireAuth, (req, res) => res.json(readJson(callsPath(req.user.tenantId), [])));

app.post('/api/agent/run', requireAuth, async (req, res) => {
  const risk = classifyAction(req.body.prompt || '');
  const route = routeModel({ prompt: req.body.prompt, risk, contextSize: Number(req.body.contextSize || 0) });
  const result = {
    id: id('run'),
    status: process.env.LITELLM_API_KEY ? 'queued' : 'dry_run',
    risk,
    route,
    message: process.env.LITELLM_API_KEY ? 'Ready to call LiteLLM/Pi adapter.' : 'Dry-run mode: no model key configured.',
    approvalRequired: risk !== 'green'
  };
  if (result.approvalRequired) createApproval(req.user.tenantId, { title: 'Approve agent action', risk, summary: req.body.prompt || '', payload: result });
  audit(req.user.tenantId, 'agent.run.requested', result);
  res.json(result);
});

app.post('/api/actions/start', requireAuth, (req, res) => {
  const action = outcomeActions.find((item) => item.id === req.body.actionId) || outcomeActions[0];
  const risk = classifyAction(`${action.label} ${action.plain} ${action.risk}`);
  const approval = risk === 'green' ? null : createApproval(req.user.tenantId, {
    title: `Approve outcome: ${action.label}`,
    risk: action.risk || risk,
    summary: action.plain,
    payload: { action, input: req.body }
  });
  const content = `# Outcome Action: ${action.label}\n\nPlain-language task: ${action.plain}\nStage: ${action.stage}\nRisk: ${action.risk || risk}\nApproval: ${approval ? approval.id : 'not required'}\n\n## Staff input\n\n${req.body.note || 'No additional note.'}\n`;
  const file = writeStageOutput({ base: ICM_ROOT, tenantId: req.user.tenantId, stage: action.stage, filename: `${id('action')}.md`, content });
  audit(req.user.tenantId, 'outcome.action.started', { actionId: action.id, approvalId: approval?.id, file });
  res.json({ ok: true, action, approval, file });
});

app.post('/api/reports/board', requireAuth, (req, res) => {
  const tenantId = req.user.tenantId;
  const profile = readJson(profilePath(tenantId), defaultProfile());
  const outcomes = readJson(outcomesPath(tenantId), []);
  const lanes = summarizeOutcomes(outcomes);
  const approvals = readJson(approvalsPath(tenantId), []);
  const opportunities = rankedOpportunities(profile).slice(0, 5);
  const report = `# Board Update - ${profile.orgName || 'Mission Organization'}\n\nGenerated: ${new Date().toISOString()}\n\n## Plain-language summary\n\nThis draft turns current outcomes, opportunity fit, and approval status into a board-ready update. Human review required before sharing.\n\n## Outcome lanes\n\n${lanes.map((lane) => `- ${lane.label}: ${lane.value} / ${lane.target} ${lane.unit || ''} (${lane.progress}%)`).join('\n')}\n\n## Top opportunities\n\n${opportunities.map((item) => `- ${item.name}: score ${item.score}; next action: ${item.nextAction}`).join('\n')}\n\n## Pending approvals\n\n${approvals.filter((item) => item.status === 'pending').map((item) => `- ${item.title} (${item.risk})`).join('\n') || '- None'}\n`;
  const file = writeStageOutput({ base: ICM_ROOT, tenantId, stage: '07_outcome_logging', filename: `board-report-${Date.now()}.md`, content: report });
  const approval = createApproval(tenantId, { title: 'Review board report draft', risk: 'yellow', summary: 'Board report draft generated. Review before sharing.', payload: { file } });
  audit(tenantId, 'report.board.generated', { file, approvalId: approval.id });
  res.json({ ok: true, report, file, approval });
});

app.post('/api/workflows/run', requireAuth, (req, res) => {
  const workflow = {
    id: id('wf'),
    stage: req.body.stage || '02_opportunity_scan',
    status: process.env.ABSURD_ENABLED === 'true' ? 'queued' : 'dry_run_completed',
    createdAt: new Date().toISOString(),
    input: req.body
  };
  const content = `# Workflow ${workflow.id}\n\nStage: ${workflow.stage}\nStatus: ${workflow.status}\n\nInput:\n\n\`\`\`json\n${JSON.stringify(req.body, null, 2)}\n\`\`\`\n`;
  const file = writeStageOutput({ base: ICM_ROOT, tenantId: req.user.tenantId, stage: workflow.stage, filename: `${workflow.id}.md`, content });
  audit(req.user.tenantId, 'workflow.run', { workflow, file });
  res.json({ ok: true, workflow, file });
});

app.get('/api/icm/tree', requireAuth, (req, res) => res.json({ tree: listIcmTree({ base: ICM_ROOT, tenantId: req.user.tenantId }) }));

app.get('/api/outcomes', requireAuth, (req, res) => {
  const events = readJson(outcomesPath(req.user.tenantId), []);
  res.json({ lanes: summarizeOutcomes(events), events });
});

app.post('/api/outcomes', requireAuth, (req, res) => {
  const events = readJson(outcomesPath(req.user.tenantId), []);
  const event = { id: id('out'), at: new Date().toISOString(), lane: req.body.lane, value: Number(req.body.value || 0), note: req.body.note || '' };
  events.unshift(event);
  writeJson(outcomesPath(req.user.tenantId), events);
  audit(req.user.tenantId, 'outcome.logged', event);
  res.json({ ok: true, event, lanes: summarizeOutcomes(events) });
});

app.get('/api/audit', requireAuth, (req, res) => res.json(readJson(auditPath(req.user.tenantId), [])));

// Phase 3: Operator API
app.use('/api/operator', operatorRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', detail: process.env.NODE_ENV === 'production' ? undefined : err.message });
});

app.listen(PORT, () => console.log(`Mission API running on :${PORT}`));


const requestBuckets = new Map();
function rateLimit(req, res, next) {
  const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = Number(process.env.RATE_LIMIT_MAX || 240);
  const bucket = requestBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (bucket.resetAt < now) { bucket.count = 0; bucket.resetAt = now + windowMs; }
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count > max) return res.status(429).json({ error: 'Too many requests' });
  next();
}
function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(token) {
  try {
    if (!token || !token.includes('.')) return null;
    const [body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig || '');
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
function defaultProfile() {
  return { tenantId: 'asc3nd', orgName: 'Asc3nd Collective', founderName: '', legalStatus: '501c3 or fiscal sponsor pending', region: 'Seattle / King County', audience: 'youth, sports, mentorship, community', mission: 'Help Seattle youth ascend through sports, mentorship, and community opportunity.', programs: 'Youth sports, mentorship, leadership, school/community partnerships.', priorities: 'funding, volunteers, sponsors, safer operations, program outcomes' };
}
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function id(prefix) { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'item'; }
function cleanTenant(v) { return String(v || 'asc3nd').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'asc3nd'; }
function profilePath(t) { return path.join(DATA_DIR, t, 'profile.json'); }
function keysPath(t) { return path.join(DATA_DIR, t, 'keys.json'); }
function contactsPath(t) { return path.join(DATA_DIR, t, 'contacts.json'); }
function interactionsPath(t) { return path.join(DATA_DIR, t, 'interactions.json'); }
function pipelineItemsPath(t) { return path.join(DATA_DIR, t, 'pipeline-items.json'); }
function approvalsPath(t) { return path.join(DATA_DIR, t, 'approvals.json'); }
function campaignsPath(t) { return path.join(DATA_DIR, t, 'campaigns.json'); }
function callsPath(t) { return path.join(DATA_DIR, t, 'calls.json'); }
function outcomesPath(t) { return path.join(DATA_DIR, t, 'outcomes.json'); }
function auditPath(t) { return path.join(DATA_DIR, t, 'audit.json'); }
function tasksPath(t) { return path.join(DATA_DIR, t, 'tasks.json'); }
function idempotencyPath(t) { return path.join(DATA_DIR, t, 'idempotency.json'); }
function vaultDir(t) { return path.join(DATA_DIR, t, 'obsidian-vault'); }
function normalizeOrigin(value = '') {
  try { return value ? new URL(String(value)).origin : ''; } catch { return String(value).replace(/\/$/, ''); }
}
function createTask(tenantId, data = {}) {
  const tasks = readJson(tasksPath(tenantId), []);
  const task = { id: id('task'), createdAt: new Date().toISOString(), priority: data.priority || 'normal', ...data };
  tasks.unshift(task);
  writeJson(tasksPath(tenantId), tasks);
  return task;
}
function audit(t, event, payload) {
  const file = auditPath(t);
  const entries = readJson(file, []);
  entries.unshift({ id: id('audit'), at: new Date().toISOString(), event, payload: JSON.parse(JSON.stringify(payload || {})) });
  writeJson(file, entries.slice(0, 1000));
}
function createApproval(tenantId, data) {
  const approvals = readJson(approvalsPath(tenantId), []);
  const approval = { id: id('appr'), status: 'pending', createdAt: new Date().toISOString(), ...data };
  approvals.unshift(approval);
  writeJson(approvalsPath(tenantId), approvals);
  return approval;
}
function buildPostizPayload(topic) {
  return { dryRun: !process.env.POSTIZ_API_KEY, topic, note: 'Postiz adapter payload. Configure POSTIZ_API_URL and POSTIZ_API_KEY before scheduling.' };
}
function adapterStatus() {
  const checks = [
    ['LiteLLM model router', 'LITELLM_API_KEY', true],
    ['Pi agent harness', 'PI_AGENT_COMMAND', true],
    ['Absurd durable workflows', 'ABSURD_ENABLED', true, (v) => v === 'true'],
    ['Sandcastle sandbox', 'SANDCASTLE_ENABLED', true, (v) => v === 'true'],
    ['Composio/MCP tools', 'COMPOSIO_API_KEY', true],
    ['Postiz social scheduler', 'POSTIZ_API_KEY', false],
    ['Twilio/voice lane', 'TWILIO_AUTH_TOKEN', false],
    ['ACFS flywheel host', 'ACFS_HOME', true]
  ];
  return checks.map(([name, key, requiredForProduction, predicate]) => {
    const value = process.env[key];
    const configured = predicate ? predicate(value) : Boolean(value);
    return { name, key, requiredForProduction, status: configured ? 'configured' : 'dry-run', visibleToStaff: ['Postiz social scheduler', 'Twilio/voice lane'].includes(name) };
  });
}
function buildExecutionPolicy(approval) {
  const risk = String(approval.risk || 'yellow').toLowerCase();
  return {
    canExecuteAutomatically: risk === 'green',
    requiresSecondHuman: risk === 'red',
    allowedAdapters: risk === 'red' ? ['human-export-only'] : ['pi', 'absurd', 'sandcastle', 'postiz', 'composio'],
    note: risk === 'red' ? 'Red actions stay human-export-only until an authorized signer performs the final external step.' : 'Approved action can move to the configured dry-run or live adapter.'
  };
}
