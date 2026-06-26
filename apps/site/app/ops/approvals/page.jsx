'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { api } from '../../../lib/api';

export default function ApprovalsPage() {
  const [items, setItems] = useState([]);
  const load = () => api('/api/approvals').then(setItems).catch(() => {});
  useEffect(load, []);
  async function decide(id, decision) { await api(`/api/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision }) }); load(); }
  return <OpsShell title="Approval queue" subtitle="Humans stay in command for youth, money, legal, public, and external actions.">
    <div className="grid">{items.length === 0 && <div className="card"><h3>No approvals yet</h3><p>Start an opportunity or campaign to create a review item.</p></div>}
    {items.map((item) => <div className="card" key={item.id}><div className="preview-row"><div><h3>{item.title}</h3><p>{item.summary}</p></div><StatusBadge value={item.risk} /></div><p>Status: {item.status}</p>{item.status === 'pending' && <div className="hero-actions"><button className="cta" onClick={() => decide(item.id, 'approve')}>Approve</button><button className="cta dark" onClick={() => decide(item.id, 'reject')}>Reject</button></div>}</div>)}</div>
  </OpsShell>;
}
