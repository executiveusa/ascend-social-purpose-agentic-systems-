'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OpsShell } from '../../../../components/OpsShell';
import { StatusBadge } from '../../../../components/StatusBadge';
import { opsApi } from '../../../../lib/opsApi';

export default function AgentDetailPage() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    opsApi(`/managed-agents/${id}`)
      .then((d) => { setAgent(d.agent); setEvents(d.events || []); })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <OpsShell title="Agent" subtitle="Managed agent detail."><div className="notice">{error}</div></OpsShell>;
  if (!agent) return <OpsShell title="Agent" subtitle="Managed agent detail."><div className="card"><p>Loading agent…</p></div></OpsShell>;

  return (
    <OpsShell title={agent.agentSlug} subtitle={`${agent.agentType} · ${agent.runtime} — dry-run state only.`}>
      <div className="section compact split">
        <div className="card">
          <h3>Status</h3>
          <p>Health: <StatusBadge value={agent.healthStatus === 'ok' ? 'green' : 'orange'} /></p>
          <p>Runtime: <strong>{agent.runtime}</strong></p>
          <p>Provisioned: <strong>{agent.createdAt ? new Date(agent.createdAt).toLocaleString() : '—'}</strong></p>
        </div>
        <div className="card">
          <h3>Configuration</h3>
          <pre className="code">{JSON.stringify(agent.config || {}, null, 2)}</pre>
        </div>
      </div>
      <div className="section compact">
        <div className="card">
          <h3>Related events</h3>
          {events.length === 0 ? <p>No events recorded for this agent yet.</p> : (
            <div className="stack">
              {events.map((ev) => (
                <div key={ev.id} className="preview-row clean">
                  <span><strong>{ev.type}</strong><small>{ev.actor} · {new Date(ev.createdAt || ev.at).toLocaleString()}</small></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OpsShell>
  );
}
