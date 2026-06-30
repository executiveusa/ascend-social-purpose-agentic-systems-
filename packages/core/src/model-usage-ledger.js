import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { emitEvent } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

function ledgerFile(tenantId) {
  return path.join(getDataDir(), tenantId, 'model-usage-ledger.jsonl');
}

export function recordModelUsage({
  tenantId,
  surface,
  agentSlug,
  model,
  promptTokens = 0,
  completionTokens = 0,
  costUsd = 0,
  traceId = null,
  approvalClass = 'green',
  actor = 'system'
}) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!surface) throw new Error('surface is required');
  if (!model) throw new Error('model is required');
  if (typeof costUsd !== 'number' || costUsd < 0) throw new Error('costUsd must be a non-negative number');

  const entry = {
    id: `mul_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    surface,
    agentSlug: agentSlug || null,
    model,
    promptTokens,
    completionTokens,
    costUsd,
    traceId,
    approvalClass,
    createdAt: new Date().toISOString()
  };

  const dir = path.join(getDataDir(), tenantId);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(ledgerFile(tenantId), JSON.stringify(entry) + '\n', 'utf8');

  emitEvent({
    tenantId,
    type: 'MODEL.USAGE.RECORDED',
    actor,
    subject: entry.id,
    payload: { surface, model, costUsd, traceId }
  });

  return entry;
}

export function getModelUsage({ tenantId, surface, limit } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  const file = ledgerFile(tenantId);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let entries = lines.map((line) => JSON.parse(line));
  if (surface) entries = entries.filter((e) => e.surface === surface);
  if (limit) entries = entries.slice(-limit);
  return entries;
}

export function summarizeMonthlyUsage({ tenantId, month } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const entries = getModelUsage({ tenantId }).filter((e) => e.createdAt.slice(0, 7) === targetMonth);
  const totalCostUsd = entries.reduce((sum, e) => sum + e.costUsd, 0);
  const totalPromptTokens = entries.reduce((sum, e) => sum + e.promptTokens, 0);
  const totalCompletionTokens = entries.reduce((sum, e) => sum + e.completionTokens, 0);
  return {
    tenantId,
    month: targetMonth,
    entryCount: entries.length,
    totalCostUsd,
    totalPromptTokens,
    totalCompletionTokens
  };
}

export function summarizeUsageBySurface({ tenantId, month } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const entries = getModelUsage({ tenantId }).filter((e) => e.createdAt.slice(0, 7) === targetMonth);
  const bySurface = {};
  for (const e of entries) {
    if (!bySurface[e.surface]) {
      bySurface[e.surface] = { surface: e.surface, entryCount: 0, totalCostUsd: 0 };
    }
    bySurface[e.surface].entryCount += 1;
    bySurface[e.surface].totalCostUsd += e.costUsd;
  }
  return { tenantId, month: targetMonth, surfaces: Object.values(bySurface) };
}
