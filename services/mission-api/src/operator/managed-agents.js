import { getManagedAgents, provisionManagedAgent, updateAgentHealth } from '@asc3nd/core/managed-agents';
import { emitEvent } from '@asc3nd/core/events';
import { createRepositories } from '@asc3nd/db';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

export function listManagedAgents(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const agents = getManagedAgents(tenantId);
    return operatorSuccess(res, { agents, tenantId });
  } catch (e) {
    return operatorError(res, 'AGENTS_ERROR', e.message, 500);
  }
}

export function getManagedAgent(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { id } = req.params;
    const agents = getManagedAgents(tenantId);
    const agent = agents.find(a => a.id === id || a.agentSlug === id);
    if (!agent) return operatorError(res, 'NOT_FOUND', `Agent ${id} not found`, 404);
    return operatorSuccess(res, { agent });
  } catch (e) {
    return operatorError(res, 'AGENT_ERROR', e.message, 500);
  }
}

export function provisionAgent(req, res) {
  try {
    const { tenantId, operator } = loadTenantContext(req);
    const { id } = req.params;
    const { agentType = 'hermes', runtime = 'node', profile = {}, packVersion } = req.body || {};
    const agent = provisionManagedAgent({
      tenantId,
      agentSlug: id,
      agentType,
      runtime,
      profile,
      packVersion: packVersion || '1.0.0'
    });
    emitEvent({ tenantId, type: 'OPERATOR.AGENT.PROVISIONED', actor: operator.id, subject: id, payload: { agentType } });
    return operatorSuccess(res, { agent }, 201);
  } catch (e) {
    return operatorError(res, 'PROVISION_ERROR', e.message, 500);
  }
}

export function pauseAgent(req, res) {
  try {
    const { tenantId, operator } = loadTenantContext(req);
    const { id } = req.params;
    const repos = createRepositories();
    const agents = repos.managedAgents.list(tenantId);
    const idx = agents.findIndex(a => a.id === id || a.agentSlug === id);
    if (idx < 0) return operatorError(res, 'NOT_FOUND', `Agent ${id} not found`, 404);
    agents[idx] = { ...agents[idx], status: 'paused', updatedAt: new Date().toISOString() };
    repos.managedAgents.save(tenantId, agents);
    emitEvent({ tenantId, type: 'OPERATOR.AGENT.PAUSED', actor: operator.id, subject: id, payload: {} });
    return operatorSuccess(res, { agent: agents[idx] });
  } catch (e) {
    return operatorError(res, 'PAUSE_ERROR', e.message, 500);
  }
}

export function resumeAgent(req, res) {
  try {
    const { tenantId, operator } = loadTenantContext(req);
    const { id } = req.params;
    const repos = createRepositories();
    const agents = repos.managedAgents.list(tenantId);
    const idx = agents.findIndex(a => a.id === id || a.agentSlug === id);
    if (idx < 0) return operatorError(res, 'NOT_FOUND', `Agent ${id} not found`, 404);
    agents[idx] = { ...agents[idx], status: 'active', updatedAt: new Date().toISOString() };
    repos.managedAgents.save(tenantId, agents);
    emitEvent({ tenantId, type: 'OPERATOR.AGENT.RESUMED', actor: operator.id, subject: id, payload: {} });
    return operatorSuccess(res, { agent: agents[idx] });
  } catch (e) {
    return operatorError(res, 'RESUME_ERROR', e.message, 500);
  }
}

export function getAgentHealth(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { id } = req.params;
    const agents = getManagedAgents(tenantId);
    const agent = agents.find(a => a.id === id || a.agentSlug === id);
    if (!agent) return operatorError(res, 'NOT_FOUND', `Agent ${id} not found`, 404);
    const repos = createRepositories();
    const healthLogs = repos.managedAgents ? (repos.managedAgents.listHealth ? repos.managedAgents.listHealth(tenantId) : []) : [];
    return operatorSuccess(res, {
      agent: { id: agent.id, agentSlug: agent.agentSlug, status: agent.status, healthStatus: agent.healthStatus, lastSeenAt: agent.lastSeenAt },
      healthLogs: healthLogs.filter(h => h.agentSlug === agent.agentSlug).slice(-10)
    });
  } catch (e) {
    return operatorError(res, 'HEALTH_ERROR', e.message, 500);
  }
}
