import fs from 'node:fs';
import path from 'node:path';
import { getManagedAgents } from './managed-agents.js';
import { getArtifacts } from './artifacts.js';
import { readEvents } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

export function generateDashboardState(tenantId) {
  if (!tenantId) throw new Error('tenantId is required');

  const dataDir = getDataDir();
  const tenantDir = path.join(dataDir, tenantId);

  let approvals = [];
  const approvalsFile = path.join(tenantDir, 'approvals.json');
  if (fs.existsSync(approvalsFile)) {
    try {
      approvals = JSON.parse(fs.readFileSync(approvalsFile, 'utf8'));
    } catch {
      approvals = [];
    }
  }

  const agents = getManagedAgents(tenantId);
  const artifacts = getArtifacts({ tenantId });
  const recentEvents = readEvents({ tenantId, limit: 20 });

  const pendingApprovals = approvals.filter(a => a.status === 'draft' || a.status === 'review').length;
  const recentArtifacts = artifacts.slice(-5);

  const state = {
    version: '0.6',
    tenantId,
    summary: {
      pendingApprovals,
      activeRuns: 0,
      recentArtifacts: artifacts.length,
      modelSpendMonth: 0,
      healthStatus: agents.every(a => a.healthStatus === 'ok') ? 'ok' : 'degraded'
    },
    agents,
    approvals,
    activeRuns: [],
    recentArtifacts,
    budgets: {},
    health: agents.map(a => ({ agentSlug: a.agentSlug, healthStatus: a.healthStatus, lastSeenAt: a.lastSeenAt })),
    recentEvents,
    nextActions: pendingApprovals > 0 ? [{ type: 'REVIEW_APPROVALS', count: pendingApprovals }] : []
  };

  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }
  const dashboardStateFile = path.join(tenantDir, 'dashboard-state.json');
  fs.writeFileSync(dashboardStateFile, JSON.stringify(state, null, 2), 'utf8');

  return state;
}
