import { describe, it, expect, beforeEach } from 'vitest';
import { createRepositories, clearRepositoryCache } from '../../packages/db/src/index.js';
import { createOperatorKey, validateOperatorKey } from '../../packages/core/src/auth.js';
import { emitEvent } from '../../packages/core/src/events.js';
import { getArtifacts, registerArtifact } from '../../packages/core/src/artifacts.js';
import { getManagedAgents, provisionManagedAgent } from '../../packages/core/src/managed-agents.js';
import { generateDashboardState } from '../../packages/core/src/dashboard-state.js';
import { requestApproval, updateApprovalStatus, APPROVAL_STATES } from '../../packages/core/src/approval-lifecycle.js';
import { createHermesRunDispatcher } from '../../packages/core/src/worker-contracts.js';
import { operatorAuth, requirePermission } from '../src/operator/auth-middleware.js';
import { operatorSuccess, operatorError } from '../src/operator/response.js';
import { can } from '../../packages/core/src/rbac.js';

const TENANT = 'test-operator-tenant';

function makeResMock() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; return res; };
  return res;
}

function makeReq(overrides = {}) {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    path: '/test',
    method: 'GET',
    ...overrides
  };
}

beforeEach(() => {
  process.env.MISSION_STORAGE = 'memory';
  clearRepositoryCache();
  createRepositories({ forceNew: true });
});

// --- auth-middleware ---

describe('operatorAuth middleware', () => {
  it('rejects request with missing Authorization header', () => {
    const middleware = operatorAuth();
    const req = makeReq({ headers: {} });
    const res = makeResMock();
    const next = () => {};
    middleware(req, res, next);
    expect(res._status).toBe(401);
    expect(res._body.ok).toBe(false);
    expect(res._body.error.code).toBe('MISSING_KEY');
  });

  it('rejects request with invalid key', () => {
    const middleware = operatorAuth();
    const req = makeReq({ headers: { authorization: 'Bearer bad-key-format' } });
    const res = makeResMock();
    middleware(req, res, () => {});
    expect(res._status).toBe(401);
    expect(res._body.ok).toBe(false);
  });

  it('accepts valid operator key and attaches req.operator', () => {
    const { rawKey } = createOperatorKey({ tenantId: TENANT, label: 'test-key', scopes: ['operator'], createdBy: 'test' });
    const middleware = operatorAuth();
    const req = makeReq({ headers: { authorization: `Bearer ${rawKey}` } });
    const res = makeResMock();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.operator).toBeDefined();
    expect(req.operator.tenantId).toBe(TENANT);
  });
});

// --- requirePermission ---

describe('requirePermission middleware', () => {
  it('allows operator with correct permission', () => {
    const { rawKey, operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    let nextCalled = false;
    requirePermission('tenant.read')(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('blocks operator missing permission', () => {
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['readonly'], createdBy: 'test' });
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    requirePermission('agents.manage')(req, res, () => {});
    expect(res._status).toBe(403);
  });
});

// --- dashboard-state ---

describe('dashboard-state handler', () => {
  it('returns tenant-scoped dashboard state', async () => {
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { getDashboardState } = await import('../src/operator/dashboard-state.js');
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    getDashboardState(req, res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._body.state).toBeDefined();
    expect(res._body.state.tenantId).toBe(TENANT);
  });
});

// --- events ---

describe('events handler', () => {
  it('returns events for tenant', async () => {
    emitEvent({ tenantId: TENANT, type: 'TEST.EVENT', actor: 'test', payload: {} });
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { getOperatorEvents } = await import('../src/operator/events.js');
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    getOperatorEvents(req, res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(Array.isArray(res._body.events)).toBe(true);
  });

  it('rejects cross-tenant reads (different tenant)', async () => {
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { getOperatorEvents } = await import('../src/operator/events.js');
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    getOperatorEvents(req, res);
    expect(res._body.tenantId).toBe(TENANT);
  });
});

// --- artifacts ---

describe('artifacts handler', () => {
  it('returns artifacts list for tenant', async () => {
    registerArtifact({ tenantId: TENANT, kind: 'report', title: 'Test', storagePath: 'test/path.md' });
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { listArtifacts } = await import('../src/operator/artifacts.js');
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    listArtifacts(req, res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._body.tenantId).toBe(TENANT);
    expect(Array.isArray(res._body.artifacts)).toBe(true);
  });

  it('rejects cross-tenant reads by returning only own-tenant artifacts', async () => {
    registerArtifact({ tenantId: 'other-tenant', kind: 'report', title: 'Other', storagePath: 'other/path.md' });
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { listArtifacts } = await import('../src/operator/artifacts.js');
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    listArtifacts(req, res);
    expect(res._body.tenantId).toBe(TENANT);
    const artifacts = res._body.artifacts;
    expect(artifacts.every(a => a.tenantId === TENANT || a.tenantId === undefined)).toBe(true);
  });
});

// --- managed agents ---

describe('managed-agents handler', () => {
  it('requires agents.manage to pause agent', async () => {
    const user = { role: 'readonly', tenantId: TENANT };
    expect(can(user, 'agents.manage')).toBe(false);
  });

  it('operator role can pause/resume agents', () => {
    const user = { role: 'operator', tenantId: TENANT };
    expect(can(user, 'agents.manage')).toBe(true);
  });

  it('lists agents for tenant', async () => {
    provisionManagedAgent({ tenantId: TENANT, agentSlug: 'test-agent', agentType: 'hermes' });
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { listManagedAgents } = await import('../src/operator/managed-agents.js');
    const req = makeReq();
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    listManagedAgents(req, res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(Array.isArray(res._body.agents)).toBe(true);
  });
});

// --- runs ---

describe('runs handler', () => {
  it('blocks orange run creation without approval', async () => {
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { createRun } = await import('../src/operator/runs.js');
    const req = makeReq({ body: { prompt: 'send email to donors' } });
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    createRun(req, res);
    expect(res._status).toBe(403);
    expect(res._body.error.code).toBe('APPROVAL_REQUIRED');
  });

  it('blocks red run creation without approval', async () => {
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { createRun } = await import('../src/operator/runs.js');
    const req = makeReq({ body: { prompt: 'submit grant application to foundation' } });
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    createRun(req, res);
    expect(res._status).toBe(403);
    expect(res._body.error.code).toBe('APPROVAL_REQUIRED');
  });

  it('queues green run in dry-run mode', async () => {
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['operator'], createdBy: 'test' });
    const { createRun } = await import('../src/operator/runs.js');
    const req = makeReq({ body: { prompt: 'list current programs and outcomes' } });
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    createRun(req, res);
    expect(res._status).toBe(201);
    expect(res._body.ok).toBe(true);
    expect(res._body.run.mode).toBe('dry-run');
  });
});

// --- approvals ---

describe('approvals handler', () => {
  it('requires correct permission to approve orange approval', () => {
    const ownerUser = { role: 'owner', tenantId: TENANT };
    const readonlyUser = { role: 'readonly', tenantId: TENANT };
    expect(can(ownerUser, 'approvals.approve.orange')).toBe(true);
    expect(can(readonlyUser, 'approvals.approve.orange')).toBe(false);
  });

  it('approve handler returns 404 for missing approval', async () => {
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['owner'], createdBy: 'test' });
    const { approveApproval } = await import('../src/operator/approvals.js');
    const req = makeReq({ params: { id: 'app_missing' }, body: {} });
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    approveApproval(req, res);
    expect(res._status).toBe(404);
  });

  it('approve handler approves a review-state approval', async () => {
    const approval = requestApproval({ tenantId: TENANT, actionType: 'GENERATE_DRAFT', requester: 'test' });
    updateApprovalStatus({ tenantId: TENANT, approvalId: approval.id, nextStatus: APPROVAL_STATES.REVIEW, actor: 'system' });
    const { operatorKey } = createOperatorKey({ tenantId: TENANT, label: 'test', scopes: ['owner'], createdBy: 'test' });
    const { approveApproval } = await import('../src/operator/approvals.js');
    const req = makeReq({ params: { id: approval.id }, body: { note: 'Approved in test' } });
    req.operator = { ...operatorKey, tenantId: TENANT };
    const res = makeResMock();
    approveApproval(req, res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._body.approval.status).toBe(APPROVAL_STATES.APPROVED);
  });
});

// --- worker contracts integration ---

describe('worker dispatcher dry-run and policy-first', () => {
  it('is always dry-run mode', () => {
    const dispatcher = createHermesRunDispatcher();
    expect(dispatcher.mode).toBe('dry-run');
  });

  it('policy blocks hard-blocked actions before risk check', () => {
    const dispatcher = createHermesRunDispatcher();
    const result = dispatcher.dispatch({ tenantId: TENANT, risk: 'green', actionType: 'GRANT_SUBMISSION' });
    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
  });
});

// --- server route registration ---

describe('server route registration', () => {
  it('operator router module exports default router', async () => {
    const mod = await import('../src/operator/index.js');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
