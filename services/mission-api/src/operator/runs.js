import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { classifyAction } from '@asc3nd/core/safety';
import { evaluateActionPolicy } from '@asc3nd/core/policy';
import { emitEvent } from '@asc3nd/core/events';
import { createHermesRunDispatcher } from '@asc3nd/core/worker-contracts';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

const DATA_DIR = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

function runsPath(tenantId) {
  return path.join(DATA_DIR(), tenantId, 'operator-runs.json');
}

function readRuns(tenantId) {
  try { return JSON.parse(fs.readFileSync(runsPath(tenantId), 'utf8')); } catch { return []; }
}

function saveRuns(tenantId, runs) {
  const file = runsPath(tenantId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(runs, null, 2), 'utf8');
}

export function createRun(req, res) {
  try {
    const { tenantId, operator } = loadTenantContext(req);
    const { prompt = '', actionType, agentSlug, contextSize, note } = req.body || {};

    const risk = classifyAction(prompt);
    const policy = evaluateActionPolicy({ actionType: actionType || 'INTERNAL_RUN', actionPayload: req.body || {} });

    if (!policy.allowed) {
      return operatorError(res, 'POLICY_BLOCKED', policy.reason, 403);
    }

    if (risk === 'orange') {
      return operatorError(res, 'APPROVAL_REQUIRED', `Run blocked: risk level orange requires human approval. Create an approval first.`, 403);
    }
    if (risk === 'red') {
      return operatorError(res, 'APPROVAL_REQUIRED', `Run blocked: risk level red requires restricted approval. Create an approval first.`, 403);
    }

    const dispatcher = createHermesRunDispatcher();
    const dispatch = dispatcher.dispatch({ tenantId, prompt, agentSlug, risk, contextSize });

    const run = {
      id: `run_${crypto.randomBytes(8).toString('hex')}`,
      tenantId,
      prompt,
      actionType: actionType || 'INTERNAL_RUN',
      agentSlug: agentSlug || null,
      risk,
      status: dispatch.status,
      mode: dispatch.mode,
      message: dispatch.message,
      note: note || '',
      createdBy: operator.id,
      createdAt: new Date().toISOString()
    };

    const runs = readRuns(tenantId);
    runs.unshift(run);
    saveRuns(tenantId, runs);

    emitEvent({ tenantId, type: 'OPERATOR.RUN.CREATED', actor: operator.id, subject: run.id, payload: { risk, mode: run.mode } });

    return operatorSuccess(res, { run }, 201);
  } catch (e) {
    return operatorError(res, 'RUN_ERROR', e.message, 500);
  }
}

export function listRuns(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const runs = readRuns(tenantId);
    return operatorSuccess(res, { runs, tenantId });
  } catch (e) {
    return operatorError(res, 'RUNS_ERROR', e.message, 500);
  }
}

export function getRun(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { id } = req.params;
    const runs = readRuns(tenantId);
    const run = runs.find(r => r.id === id);
    if (!run) return operatorError(res, 'NOT_FOUND', `Run ${id} not found`, 404);
    return operatorSuccess(res, { run });
  } catch (e) {
    return operatorError(res, 'RUN_ERROR', e.message, 500);
  }
}
