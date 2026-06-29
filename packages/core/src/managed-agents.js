import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { emitEvent } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

export function provisionManagedAgent({
  tenantId,
  agentSlug,
  agentType,
  runtime = 'node',
  profile = {},
  packVersion = '1.0.0'
}) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!agentSlug) throw new Error('agentSlug is required');

  emitEvent({
    tenantId,
    type: 'AGENT.PROVISION.REQUESTED',
    actor: 'system',
    subject: agentSlug,
    payload: { agentType, packVersion }
  });

  const agent = {
    id: `agt_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    agentSlug,
    agentType,
    status: 'active',
    runtime,
    profile,
    packVersion,
    healthStatus: 'ok',
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const dataDir = getDataDir();
  const tenantDir = path.join(dataDir, tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  const agentsFile = path.join(tenantDir, 'managed-agents.json');
  let agents = [];
  if (fs.existsSync(agentsFile)) {
    try {
      agents = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
    } catch {
      agents = [];
    }
  }

  const idx = agents.findIndex(a => a.agentSlug === agentSlug);
  if (idx >= 0) {
    agents[idx] = { ...agents[idx], ...agent, updatedAt: new Date().toISOString() };
  } else {
    agents.push(agent);
  }

  fs.writeFileSync(agentsFile, JSON.stringify(agents, null, 2), 'utf8');

  emitEvent({
    tenantId,
    type: 'AGENT.PROVISION.SUCCEEDED',
    actor: 'system',
    subject: agentSlug,
    payload: { agentId: agent.id }
  });

  return agent;
}

export function updateAgentHealth({ tenantId, agentSlug, healthStatus, checkOutput = '' }) {
  const dataDir = getDataDir();
  const tenantDir = path.join(dataDir, tenantId);
  const agentsFile = path.join(tenantDir, 'managed-agents.json');
  if (!fs.existsSync(agentsFile)) throw new Error('No managed agents found');

  let agents = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
  const idx = agents.findIndex(a => a.agentSlug === agentSlug);
  if (idx < 0) throw new Error(`Agent ${agentSlug} not found`);

  agents[idx].healthStatus = healthStatus;
  agents[idx].lastSeenAt = new Date().toISOString();
  agents[idx].updatedAt = new Date().toISOString();

  fs.writeFileSync(agentsFile, JSON.stringify(agents, null, 2), 'utf8');

  const healthRecord = {
    id: `hlh_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    agentSlug,
    healthStatus,
    checkOutput,
    timestamp: new Date().toISOString()
  };

  const healthFile = path.join(tenantDir, 'managed-agent-health.json');
  let healthLogs = [];
  if (fs.existsSync(healthFile)) {
    try {
      healthLogs = JSON.parse(fs.readFileSync(healthFile, 'utf8'));
    } catch {
      healthLogs = [];
    }
  }
  healthLogs.push(healthRecord);
  fs.writeFileSync(healthFile, JSON.stringify(healthLogs, null, 2), 'utf8');

  return agents[idx];
}

export function getManagedAgents(tenantId) {
  const dataDir = getDataDir();
  const agentsFile = path.join(dataDir, tenantId, 'managed-agents.json');
  if (!fs.existsSync(agentsFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
  } catch {
    return [];
  }
}
