'use client';
import { useEffect, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { opsApi } from '../lib/opsApi';

// Phase 5: internal Mission OS operator overview, driven by the dry-run
// operator/model-gateway state from Phase 3/4 (via the local /api/ops/*
// proxy routes — see docs/OPS-DASHBOARD.md). This is additive to the
// existing "Today" outcomes cockpit above; it does not replace it.
export function MissionOsOverview() {
  const [state, setState] = useState(null);
  const [budget, setBudget] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([opsApi('/dashboard-state'), opsApi('/budgets')])
      .then(([d, b]) => { setState(d.state); setBudget(b); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <section className="section compact"><div className="notice">Mission OS overview unavailable: {error}</div></section>;
  if (!state) return <section className="section compact"><div className="card"><p>Loading Mission OS operator state…</p></div></section>;

  const { summary, agents, recentArtifacts, recentEvents, nextActions } = state;

  return (
    <section className="section compact">
      <div className="section-heading">
        <h2>Mission OS operator overview</h2>
        <p>Dry-run managed agent, model gateway, and observability state. No live execution.</p>
      </div>

      <div className="grid cols-4">
        <div className="card"><small>Pending approvals</small><div className="kpi">{summary.pendingApprovals}</div></div>
        <div className="card"><small>Active runs</small><div className="kpi">{summary.activeRuns}</div></div>
        <div className="card"><small>Recent artifacts</small><div className="kpi">{summary.recentArtifacts}</div></div>
        <div className="card"><small>Model spend (month)</small><div className="kpi">${(budget?.monthly?.totalCostUsd ?? 0).toFixed(2)}</div></div>
      </div>

      <div className="section compact split">
        <div className="card">
          <h3>Agent Room</h3>
          {agents.length === 0 ? <p>No managed agents provisioned yet. Run <code>missionctl hermes provision</code>.</p> : (
            <div className="stack">
              {agents.map((a) => (
                <a key={a.id} href={`/ops/agents/${a.agentSlug}`} className="preview-row clean">
                  <span><strong>{a.agentSlug}</strong><small>{a.agentType} · {a.runtime}</small></span>
                  <StatusBadge value={a.healthStatus === 'ok' ? 'green' : 'orange'} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Health status</h3>
          <p>Overall: <strong>{summary.healthStatus}</strong></p>
          <a href="/ops/health" className="cta ghost">View health detail</a>
        </div>
      </div>

      <div className="section compact split">
        <div className="card">
          <h3>Recent artifacts</h3>
          {recentArtifacts.length === 0 ? <p>No artifacts registered yet.</p> : (
            <div className="stack">
              {recentArtifacts.map((art) => (
                <div key={art.id} className="preview-row clean">
                  <span><strong>{art.title}</strong><small>{art.kind}</small></span>
                  <StatusBadge value={art.approvalClass} />
                </div>
              ))}
            </div>
          )}
          <a href="/ops/artifacts" className="cta ghost">View all artifacts</a>
        </div>
        <div className="card">
          <h3>Recent events</h3>
          {recentEvents.length === 0 ? <p>No events recorded yet.</p> : (
            <div className="stack">
              {recentEvents.slice(0, 5).map((ev) => (
                <div key={ev.id} className="preview-row clean">
                  <span><strong>{ev.type}</strong><small>{ev.actor} · {new Date(ev.createdAt || ev.at).toLocaleString()}</small></span>
                </div>
              ))}
            </div>
          )}
          <a href="/ops/events" className="cta ghost">View event journal</a>
        </div>
      </div>

      <div className="section compact split">
        <div className="card">
          <h3>Next actions</h3>
          {nextActions.length === 0 ? <p>Nothing needs attention right now.</p> : (
            <div className="stack">
              {nextActions.map((na, i) => <div key={i} className="preview-row clean"><span><strong>{na.type}</strong><small>{na.count} item(s)</small></span></div>)}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Integration placeholders</h3>
          <div className="stack">
            <div className="preview-row clean"><span><strong>Open WebUI</strong><small>Workspace launcher — dry-run only</small></span><a className="cta ghost" href="/ops/openwebui">Open</a></div>
            <div className="preview-row clean"><span><strong>Langfuse</strong><small>Trace links — not live</small></span><a className="cta ghost" href="/ops/budgets">View traces</a></div>
            <div className="preview-row clean"><span><strong>LiteLLM budget</strong><small>Status: {budget?.status || 'ok'}</small></span><a className="cta ghost" href="/ops/budgets">View budgets</a></div>
            <div className="preview-row clean"><span><strong>Deployments</strong><small>Release/bundle state — placeholders</small></span><a className="cta ghost" href="/ops/deployments">View deployments</a></div>
          </div>
        </div>
      </div>
    </section>
  );
}
