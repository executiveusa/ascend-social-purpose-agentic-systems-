import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generateDashboardState } from '../src/dashboard-state.js';
import { provisionManagedAgent } from '../src/managed-agents.js';
import { registerArtifact } from '../src/artifacts.js';
import { requestApproval } from '../src/approval-lifecycle.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('dashboard state generator', () => {
  const tenantId = 'test-tenant-dashboard';

  beforeEach(() => {
    const dataDir = getDataDir();
    const files = [
      path.join(dataDir, tenantId, 'managed-agents.json'),
      path.join(dataDir, tenantId, 'artifacts.json'),
      path.join(dataDir, tenantId, 'approvals.json'),
      path.join(dataDir, tenantId, 'events.jsonl'),
      path.join(dataDir, tenantId, 'dashboard-state.json')
    ];
    for (const file of files) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  });

  it('generates unified dashboard state successfully', () => {
    // Provision an agent
    provisionManagedAgent({
      tenantId,
      agentSlug: 'hermes-comms',
      agentType: 'comms'
    });

    // Create approval request (yellow, starts as draft/pending)
    requestApproval({
      tenantId,
      actionType: 'GENERATE_DRAFT',
      requester: 'alice'
    });

    // Register an artifact
    registerArtifact({
      tenantId,
      kind: 'tenant-agent-pack',
      title: 'Demo Pack',
      storagePath: 'packs/demo-pnw.zip'
    });

    const state = generateDashboardState(tenantId);

    expect(state.version).toBe('0.6');
    expect(state.tenantId).toBe(tenantId);
    expect(state.summary.pendingApprovals).toBe(1);
    expect(state.summary.recentArtifacts).toBe(1);
    expect(state.agents.length).toBe(1);
    expect(state.agents[0].agentSlug).toBe('hermes-comms');
    expect(state.recentArtifacts.length).toBe(1);
    expect(state.recentEvents.length).toBeGreaterThan(0);
  });
});
