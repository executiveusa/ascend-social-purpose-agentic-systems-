'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { opsApi } from '../../../lib/opsApi';

export default function AgentsPage() {
  const [agents, setAgents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    opsApi('/managed-agents').then((d) => setAgents(d.agents)).catch((e) => setError(e.message));
  }, []);

  return (
    <OpsShell title="Agent Room" subtitle="Managed agents provisioned for this tenant. Dry-run state only — no live execution.">
      {error && <div className="notice">Agent Room unavailable: {error}</div>}
      {!error && !agents && <div className="card"><p>Loading agents…</p></div>}
      {agents && agents.length === 0 && (
        <div className="card"><p>No managed agents provisioned yet. Run <code>missionctl hermes provision</code>.</p></div>
      )}
      {agents && agents.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Agent</th><th>Type</th><th>Runtime</th><th>Health</th><th>Provisioned</th></tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td><a href={`/ops/agents/${a.agentSlug}`}>{a.agentSlug}</a></td>
                  <td>{a.agentType}</td>
                  <td>{a.runtime}</td>
                  <td><StatusBadge value={a.healthStatus === 'ok' ? 'green' : 'orange'} /></td>
                  <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OpsShell>
  );
}
