'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { api } from '../../../lib/api';

export default function OpportunitiesPage() {
  const [items, setItems] = useState([]); const [message, setMessage] = useState('');
  useEffect(() => { api('/api/opportunities').then((d) => setItems(d.opportunities)).catch((e) => setMessage(e.message)); }, []);
  async function start(id) { const r = await api(`/api/opportunities/${id}/start`, { method: 'POST', body: '{}' }); setMessage(`Workflow created. Approval ${r.approval.id} is waiting.`); }
  return (
    <OpsShell title="Opportunity engine" subtitle="Shows what is available immediately, then turns each opportunity into an ICM workflow.">
      {message && <div className="notice">{message}</div>}
      <div className="grid">
        {items.map((item) => <div className="card" key={item.id}>
          <div className="preview-row"><div><h3>{item.name}</h3><p>{item.region} · {item.type}</p></div><div><div className="kpi">{item.score}</div><StatusBadge value={item.approvalClass} /></div></div>
          <p>{item.nextAction}</p>
          <div className="split"><div><strong>Fit signals</strong><ul>{item.fitSignals.map((x) => <li key={x}>{x}</li>)}</ul></div><div><strong>Checklist</strong><ul>{item.checklist.map((x) => <li key={x}>{x}</li>)}</ul></div></div>
          <button className="cta" onClick={() => start(item.id)}>Start ICM workflow</button>
        </div>)}
      </div>
    </OpsShell>
  );
}
