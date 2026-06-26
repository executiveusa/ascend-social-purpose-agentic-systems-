'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../components/OpsShell';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../lib/api';

export default function OpsDashboard() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const load = () => api('/api/today').then(setData).catch((e) => setMessage(e.message));
  useEffect(load, []);
  async function start(actionId) {
    const result = await api('/api/actions/start', { method: 'POST', body: JSON.stringify({ actionId, note: 'Started from Today cockpit.' }) });
    setMessage(result.approval ? `Created approval ${result.approval.id}.` : 'Action started.');
    load();
  }
  const empty = !data;
  return (
    <OpsShell title="Today" subtitle="A plain-language mission control room for people who do not want to manage software.">
      {message && <div className="notice">{message}</div>}
      {empty ? <div className="card"><p>Loading mission state…</p></div> : <>
        <section className="today-hero card elevated">
          <div>
            <span className="badge mint">Mission readiness</span>
            <h2>{data.score}% ready to act</h2>
            <p>The system combines setup completeness, opportunity fit, outcome data, and approval risk into one practical score.</p>
          </div>
          <div className="readiness-ring" style={{background: `conic-gradient(var(--gold) 0 ${data.score}%, rgba(21,17,11,.08) ${data.score}% 100%)`}} aria-label={`Mission readiness ${data.score}%`}><span>{data.score}</span></div>
        </section>

        <section className="section compact">
          <div className="section-heading"><h2>Next best actions</h2><p>These are the only things staff need to decide today.</p></div>
          <div className="grid cols-3">
            {data.actions.map((item) => <a className="card action-card" key={item.id} href={item.href}><span className="badge gold">Open</span><h3>{item.label}</h3><p>{item.reason}</p></a>)}
          </div>
        </section>

        <section className="section compact">
          <div className="section-heading"><h2>Outcome buttons</h2><p>Start work by choosing the result, not the tool.</p></div>
          <div className="grid cols-3">
            {data.outcomeActions.map((action) => <button className="card outcome-button" key={action.id} onClick={() => start(action.id)}><strong>{action.label}</strong><small>{action.plain}</small><StatusBadge value={action.risk} /></button>)}
          </div>
        </section>

        <section className="section compact split">
          <div className="card"><h3>Available right now</h3><div className="stack">{data.opportunities.slice(0,4).map((item) => <a href="/ops/opportunities" className="preview-row clean" key={item.id}><span><strong>{item.name}</strong><small>{item.nextAction}</small></span><span className="score-chip">{item.score}</span></a>)}</div></div>
          <div className="card"><h3>Outcome progress</h3><div className="stack">{data.lanes.map((lane) => <div key={lane.id}><div className="preview-row clean"><strong>{lane.label}</strong><span>{lane.value} / {lane.target}</span></div><div className="progress"><span style={{width: `${lane.progress}%`}} /></div></div>)}</div></div>
        </section>
      </>}
    </OpsShell>
  );
}
