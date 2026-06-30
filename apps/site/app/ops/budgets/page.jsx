'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { opsApi } from '../../../lib/opsApi';

export default function BudgetsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    opsApi('/budgets').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <OpsShell title="Model budgets" subtitle="Model spend, gateway status, and per-surface usage."><div className="notice">Budgets unavailable: {error}</div></OpsShell>;
  if (!data) return <OpsShell title="Model budgets" subtitle="Model spend, gateway status, and per-surface usage."><div className="card"><p>Loading budgets…</p></div></OpsShell>;

  const { budget, monthly, bySurface, status } = data;
  const pct = budget.monthlyBudgetUsd > 0 ? Math.min(100, Math.round((monthly.totalCostUsd / budget.monthlyBudgetUsd) * 100)) : 0;
  const badgeValue = status === 'hard-block' ? 'red' : status === 'warning' ? 'orange' : 'green';

  return (
    <OpsShell title="Model budgets" subtitle="LiteLLM gateway budget status. Dry-run usage ledger — no live model calls.">
      <div className="grid cols-4">
        <div className="card"><small>Month spend</small><div className="kpi">${monthly.totalCostUsd.toFixed(2)}</div></div>
        <div className="card"><small>Monthly budget</small><div className="kpi">${budget.monthlyBudgetUsd.toFixed(2)}</div></div>
        <div className="card"><small>Usage entries</small><div className="kpi">{monthly.entryCount}</div></div>
        <div className="card"><small>Status</small><div className="kpi"><StatusBadge value={badgeValue} /></div></div>
      </div>

      <div className="section compact">
        <div className="card">
          <h3>Month-to-date spend</h3>
          <div className="progress"><span style={{ width: `${pct}%` }} /></div>
          <p>{pct}% of ${budget.monthlyBudgetUsd.toFixed(2)} monthly budget</p>
        </div>
      </div>

      <div className="section compact">
        <div className="card">
          <h3>Spend by surface</h3>
          {bySurface.length === 0 ? <p>No usage recorded this month.</p> : (
            <table className="table">
              <thead><tr><th>Surface</th><th>Entries</th><th>Cost</th></tr></thead>
              <tbody>
                {bySurface.map((s) => (
                  <tr key={s.surface}><td>{s.surface}</td><td>{s.entryCount}</td><td>${s.totalCostUsd.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </OpsShell>
  );
}
