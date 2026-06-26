'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function SecondBrainPage() {
  const [notes, setNotes] = useState([]); const [title, setTitle] = useState('Founder operating principles'); const [body, setBody] = useState('');
  const load = () => api('/api/second-brain/notes').then((d) => setNotes(d.notes)).catch(() => {});
  useEffect(load, []);
  async function save(e) { e.preventDefault(); await api('/api/second-brain/note', { method: 'POST', body: JSON.stringify({ title, body }) }); setBody(''); load(); }
  return <OpsShell title="Founder Second Brain" subtitle="Obsidian-compatible markdown vault for founder memory, decisions, contacts, and patterns.">
    <div className="split"><form className="card form" onSubmit={save}><h3>Create note</h3><label>Title<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Body<textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} /></label><button className="cta">Save note</button></form><div className="card"><h3>Vault notes</h3><div className="stack">{notes.map((n) => <div className="preview-row" key={n.file}><strong>{n.title}</strong><span className="badge">{n.file}</span></div>)}</div></div></div>
  </OpsShell>;
}
