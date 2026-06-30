'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { opsApi } from '../../../lib/opsApi';

export default function HealthPage() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    opsApi('/dashboard-state').then((d) => setState(d.state)).catch((e) => setError(e.message));
  }, []);

  if (error) return <OpsShell title="Health" subtitle="Mission OS operator health summary."><div className="notice">Health unavailable: {error}</div></OpsShell>;
  if (!state) return <OpsShell title="Health" subtitle="Mission OS operator health summary."><div className="card"><p>Loading health…</p></div></OpsShell>;

  const { summary, health } = state;

  return (
    <OpsShell title="Health" subtitle="Overall Mission OS operator health, derived from managed-agent heartbeats. Dry-run only.">
      <div className="grid cols-4">
        <div className="card"><small>Overall status</small><div className="kpi"><StatusBadge value={summary.healthStatus === 'ok' ? 'green' : 'orange'} /></div></div>
        <div className="card"><small>Agents tracked</small><div className="kpi">{health.length}</div></div>
        <div className="card"><small>Pending approvals</small><div className="kpi">{summary.pendingApprovals}</div></div>
        <div className="card"><small>Active runs</small><div className="kpi">{summary.activeRuns}</div></div>
      </div>

      <div className="section compact">
        <div className="card">
          <h3>Agent health</h3>
          {health.length === 0 ? <p>No managed agents to report health for yet.</p> : (
            <table className="table">
              <thead><tr><th>Agent</th><th>Status</th><th>Last seen</th></tr></thead>
              <tbody>
                {health.map((h) => (
                  <tr key={h.agentSlug}>
                    <td>{h.agentSlug}</td>
                    <td><StatusBadge value={h.healthStatus === 'ok' ? 'green' : 'orange'} /></td>
                    <td>{h.lastSeenAt ? new Date(h.lastSeenAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </OpsShell>
  );
}
