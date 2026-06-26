'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function ReportsPage() {
  const [outcomes, setOutcomes] = useState({ lanes: [], events: [] });
  const [form, setForm] = useState({ lane: 'youth-served', value: 10, note: 'Weekly youth program attendance.' });
  const [report, setReport] = useState('');
  const load = () => api('/api/outcomes').then(setOutcomes).catch(() => {});
  useEffect(load, []);
  async function log(e) { e.preventDefault(); await api('/api/outcomes', { method: 'POST', body: JSON.stringify(form) }); load(); }
  async function generate() { const r = await api('/api/reports/board', { method: 'POST', body: '{}' }); setReport(r.report); }
  return <OpsShell title="Reports" subtitle="Turn weekly work into board, donor, funder, and sponsor-ready updates.">
    <div className="split">
      <form className="card form" onSubmit={log}><h3>Log an outcome</h3><label>Lane<select className="select" value={form.lane} onChange={(e) => setForm({...form, lane: e.target.value})}>{outcomes.lanes.map((lane) => <option value={lane.id} key={lane.id}>{lane.label}</option>)}</select></label><label>Value<input className="input" type="number" value={form.value} onChange={(e) => setForm({...form, value: e.target.value})} /></label><label>Note<textarea className="textarea" value={form.note} onChange={(e) => setForm({...form, note: e.target.value})} /></label><button className="cta">Log outcome</button></form>
      <div className="card"><h3>Current progress</h3><div className="stack">{outcomes.lanes.map((lane) => <div key={lane.id}><div className="preview-row clean"><strong>{lane.label}</strong><span>{lane.value} / {lane.target}</span></div><div className="progress"><span style={{width: `${lane.progress}%`}} /></div></div>)}</div></div>
    </div>
    <div className="card elevated"><div className="preview-row clean"><div><h3>Board update generator</h3><p>Creates a markdown report inside the ICM outcome stage and sends it to review.</p></div><button className="cta" onClick={generate}>Generate board draft</button></div>{report && <pre className="code">{report}</pre>}</div>
  </OpsShell>;
}
