import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { provisionManagedAgent } from '@asc3nd/core/managed-agents';
import { registerArtifact } from '@asc3nd/core/artifacts';
import { setModelBudget } from '@asc3nd/core/model-budgets';
import { recordModelUsage } from '@asc3nd/core/model-usage-ledger';
import { createTraceLink } from '@asc3nd/core/trace-links';

import { GET as dashboardStateGET } from '../app/api/ops/dashboard-state/route.js';
import { GET as agentsGET } from '../app/api/ops/managed-agents/route.js';
import { GET as agentDetailGET } from '../app/api/ops/managed-agents/[id]/route.js';
import { GET as artifactsGET } from '../app/api/ops/artifacts/route.js';
import { GET as eventsGET } from '../app/api/ops/events/route.js';
import { GET as budgetsGET } from '../app/api/ops/budgets/route.js';
import { GET as tracesGET } from '../app/api/ops/traces/route.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');
const populatedTenant = 'test-ops-dashboard-populated';
const emptyTenant = 'test-ops-dashboard-empty';

function wipeTenant(tenantId) {
  const dir = path.join(getDataDir(), tenantId);
  fs.rmSync(dir, { recursive: true, force: true });
}

function resetTenant(tenantId) {
  wipeTenant(tenantId);
  fs.mkdirSync(path.join(getDataDir(), tenantId), { recursive: true });
}

function request(url) {
  return new Request(url);
}

describe('Phase 5 ops API data routes (server-side, no operator key)', () => {
  beforeEach(() => {
    resetTenant(populatedTenant);
    resetTenant(emptyTenant);
  });

  afterAll(() => {
    wipeTenant(populatedTenant);
    wipeTenant(emptyTenant);
  });

  it('dashboard-state renders empty-state data for a tenant with no agents/artifacts', async () => {
    process.env.OPS_TENANT_ID = emptyTenant;
    const res = await dashboardStateGET();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.state.agents).toEqual([]);
    expect(body.state.recentArtifacts).toEqual([]);
    expect(body.state.summary.pendingApprovals).toBe(0);
  });

  it('agent list/detail routes render provisioned agent data', async () => {
    process.env.OPS_TENANT_ID = populatedTenant;
    const agent = provisionManagedAgent({ tenantId: populatedTenant, agentSlug: 'hermes-ops', agentType: 'worker' });

    const listRes = await agentsGET();
    const listBody = await listRes.json();
    expect(listBody.ok).toBe(true);
    expect(listBody.agents).toHaveLength(1);
    expect(listBody.agents[0].agentSlug).toBe('hermes-ops');

    const detailRes = await agentDetailGET(request('http://local/api/ops/managed-agents/hermes-ops'), { params: Promise.resolve({ id: 'hermes-ops' }) });
    const detailBody = await detailRes.json();
    expect(detailBody.ok).toBe(true);
    expect(detailBody.agent.id).toBe(agent.id);
  });

  it('agent detail route returns 404 for an unknown agent', async () => {
    process.env.OPS_TENANT_ID = emptyTenant;
    const res = await agentDetailGET(request('http://local/api/ops/managed-agents/missing'), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('artifact table route renders registered artifacts', async () => {
    process.env.OPS_TENANT_ID = populatedTenant;
    registerArtifact({ tenantId: populatedTenant, kind: 'report', title: 'Monthly impact report', storagePath: 'reports/monthly.json' });

    const res = await artifactsGET(request('http://local/api/ops/artifacts'));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.artifacts).toHaveLength(1);
    expect(body.artifacts[0].title).toBe('Monthly impact report');
  });

  it('artifact table route renders an empty list when none exist', async () => {
    process.env.OPS_TENANT_ID = emptyTenant;
    const res = await artifactsGET(request('http://local/api/ops/artifacts'));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.artifacts).toEqual([]);
  });

  it('event table route renders events emitted by core actions', async () => {
    process.env.OPS_TENANT_ID = populatedTenant;
    provisionManagedAgent({ tenantId: populatedTenant, agentSlug: 'hermes-events', agentType: 'worker' });

    const res = await eventsGET(request('http://local/api/ops/events'));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.events.some((e) => e.type === 'AGENT.PROVISION.SUCCEEDED')).toBe(true);
  });

  it('budget summary route renders budget, monthly spend, and per-surface usage', async () => {
    process.env.OPS_TENANT_ID = populatedTenant;
    setModelBudget({ tenantId: populatedTenant, monthlyBudgetUsd: 100 });
    recordModelUsage({ tenantId: populatedTenant, surface: 'today-cockpit', model: 'gpt-4o-mini', costUsd: 12.5 });

    const res = await budgetsGET();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.budget.monthlyBudgetUsd).toBe(100);
    expect(body.monthly.totalCostUsd).toBeCloseTo(12.5);
    expect(body.bySurface.find((s) => s.surface === 'today-cockpit').totalCostUsd).toBeCloseTo(12.5);
    expect(body.status).toBe('ok');
  });

  it('trace list route renders linked traces for a surface', async () => {
    process.env.OPS_TENANT_ID = populatedTenant;
    createTraceLink({ tenantId: populatedTenant, surface: 'today-cockpit', langfuseTraceUrl: 'https://example.invalid/trace/1' });

    const res = await tracesGET(request('http://local/api/ops/traces?surface=today-cockpit'));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.traces).toHaveLength(1);
    expect(body.traces[0].surface).toBe('today-cockpit');
  });
});
