import fs from 'node:fs';
import path from 'node:path';
import { emitEvent } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

export const DEFAULT_MONTHLY_BUDGET_USD = 50;
export const WARNING_THRESHOLD_PCT = 0.8;
export const HARD_BLOCK_THRESHOLD_PCT = 1.0;

function budgetFile(tenantId) {
  return path.join(getDataDir(), tenantId, 'model-budgets.json');
}

function readBudget(tenantId) {
  const file = budgetFile(tenantId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeBudget(tenantId, budget) {
  const dir = path.join(getDataDir(), tenantId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(budgetFile(tenantId), JSON.stringify(budget, null, 2), 'utf8');
}

export function getModelBudget(tenantId) {
  if (!tenantId) throw new Error('tenantId is required');
  const existing = readBudget(tenantId);
  if (existing) return existing;
  return {
    tenantId,
    monthlyBudgetUsd: DEFAULT_MONTHLY_BUDGET_USD,
    warningThresholdPct: WARNING_THRESHOLD_PCT,
    hardBlockThresholdPct: HARD_BLOCK_THRESHOLD_PCT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function setModelBudget({ tenantId, monthlyBudgetUsd, warningThresholdPct, hardBlockThresholdPct, actor = 'system' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (typeof monthlyBudgetUsd !== 'number' || monthlyBudgetUsd <= 0) {
    throw new Error('monthlyBudgetUsd must be a positive number');
  }
  const current = getModelBudget(tenantId);
  const budget = {
    ...current,
    tenantId,
    monthlyBudgetUsd,
    warningThresholdPct: warningThresholdPct ?? current.warningThresholdPct,
    hardBlockThresholdPct: hardBlockThresholdPct ?? current.hardBlockThresholdPct,
    updatedAt: new Date().toISOString()
  };
  writeBudget(tenantId, budget);
  emitEvent({
    tenantId,
    type: 'MODEL.BUDGET.UPDATED',
    actor,
    payload: { monthlyBudgetUsd, warningThresholdPct: budget.warningThresholdPct, hardBlockThresholdPct: budget.hardBlockThresholdPct }
  });
  return budget;
}

export function evaluateBudgetStatus({ tenantId, monthToDateSpendUsd }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (typeof monthToDateSpendUsd !== 'number') throw new Error('monthToDateSpendUsd must be a number');
  const budget = getModelBudget(tenantId);
  const ratio = budget.monthlyBudgetUsd > 0 ? monthToDateSpendUsd / budget.monthlyBudgetUsd : 0;
  const status = ratio >= budget.hardBlockThresholdPct
    ? 'hard-block'
    : ratio >= budget.warningThresholdPct
      ? 'warning'
      : 'ok';

  if (status !== 'ok') {
    emitEvent({
      tenantId,
      type: status === 'hard-block' ? 'MODEL.BUDGET.HARD_BLOCK' : 'MODEL.BUDGET.WARNING',
      actor: 'system',
      payload: { monthToDateSpendUsd, monthlyBudgetUsd: budget.monthlyBudgetUsd, ratio }
    });
  }

  return { status, ratio, budget, monthToDateSpendUsd };
}
