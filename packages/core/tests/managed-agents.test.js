import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { provisionManagedAgent, updateAgentHealth, getManagedAgents } from '../src/managed-agents.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('managed agents state', () => {
  const tenantId = 'test-tenant-agents';

  beforeEach(() => {
    const dataDir = getDataDir();
    const files = [
      path.join(dataDir, tenantId, 'managed-agents.json'),
      path.join(dataDir, tenantId, 'managed-agent-health.json')
    ];
    for (const file of files) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  });

  it('provisions agents and updates health status', () => {
    const agent = provisionManagedAgent({
      tenantId,
      agentSlug: 'hermes-grants',
      agentType: 'grants',
      packVersion: '1.2.0'
    });

    expect(agent.id).toBeDefined();
    expect(agent.agentSlug).toBe('hermes-grants');
    expect(agent.healthStatus).toBe('ok');

    const updated = updateAgentHealth({
      tenantId,
      agentSlug: 'hermes-grants',
      healthStatus: 'degraded',
      checkOutput: 'High latency detected'
    });

    expect(updated.healthStatus).toBe('degraded');

    const agents = getManagedAgents(tenantId);
    expect(agents.length).toBe(1);
    expect(agents[0].healthStatus).toBe('degraded');
  });
});
