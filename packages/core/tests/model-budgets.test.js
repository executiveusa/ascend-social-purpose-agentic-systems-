import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getModelBudget, setModelBudget, evaluateBudgetStatus, DEFAULT_MONTHLY_BUDGET_USD } from '../src/model-budgets.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('model budgets', () => {
  const tenantId = 'test-tenant-budgets';

  beforeEach(() => {
    const file = path.join(getDataDir(), tenantId, 'model-budgets.json');
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });

  it('returns default budget when none set', () => {
    const budget = getModelBudget(tenantId);
    expect(budget.monthlyBudgetUsd).toBe(DEFAULT_MONTHLY_BUDGET_USD);
  });

  it('sets and persists a custom budget', () => {
    const budget = setModelBudget({ tenantId, monthlyBudgetUsd: 100 });
    expect(budget.monthlyBudgetUsd).toBe(100);
    expect(getModelBudget(tenantId).monthlyBudgetUsd).toBe(100);
  });

  it('rejects invalid budget amounts', () => {
    expect(() => setModelBudget({ tenantId, monthlyBudgetUsd: -5 })).toThrow();
    expect(() => setModelBudget({ tenantId, monthlyBudgetUsd: 'abc' })).toThrow();
  });

  it('evaluates ok status below warning threshold', () => {
    setModelBudget({ tenantId, monthlyBudgetUsd: 100 });
    const result = evaluateBudgetStatus({ tenantId, monthToDateSpendUsd: 10 });
    expect(result.status).toBe('ok');
  });

  it('evaluates warning status at warning threshold', () => {
    setModelBudget({ tenantId, monthlyBudgetUsd: 100 });
    const result = evaluateBudgetStatus({ tenantId, monthToDateSpendUsd: 85 });
    expect(result.status).toBe('warning');
  });

  it('evaluates hard-block status at/above hard block threshold', () => {
    setModelBudget({ tenantId, monthlyBudgetUsd: 100 });
    const result = evaluateBudgetStatus({ tenantId, monthToDateSpendUsd: 105 });
    expect(result.status).toBe('hard-block');
  });
});
