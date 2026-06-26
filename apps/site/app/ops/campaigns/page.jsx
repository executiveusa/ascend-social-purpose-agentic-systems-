'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function CampaignsPage() {
  const [topic, setTopic] = useState('Spring youth sports sponsor drive'); const [items, setItems] = useState([]); const [msg, setMsg] = useState('');
  const load = () => api('/api/campaigns').then(setItems).catch(() => {});
  useEffect(load, []);
  async function draft(e) { e.preventDefault(); const r = await api('/api/campaigns/draft', { method: 'POST', body: JSON.stringify({ topic }) }); setMsg(`Drafted campaign and approval ${r.approval.id}`); load(); }
  return <OpsShell title="Campaigns + Postiz" subtitle="Draft campaigns here. Schedule through Postiz only after approval.">
    {msg && <div className="notice">{msg}</div>}
    <form className="card form" onSubmit={draft}><label>Campaign topic<input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} /></label><button className="cta">Draft campaign</button></form>
    <div className="grid">{items.map((c) => <div className="card" key={c.id}><div className="preview-row"><h3>{c.topic}</h3><span className="badge gold">{c.status}</span></div><div className="grid cols-3">{c.posts.map((p) => <div className="preview-row" key={p.channel}><strong>{p.channel}</strong><small>{p.copy}</small></div>)}</div><pre className="code">{JSON.stringify(c.postiz, null, 2)}</pre></div>)}</div>
  </OpsShell>;
}
