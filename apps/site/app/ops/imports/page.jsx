'use client';
import { useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function ImportsPage() {
  const [sourceType, setSourceType] = useState('chatgpt'); const [payload, setPayload] = useState(''); const [result, setResult] = useState(null);
  async function submit(e) { e.preventDefault(); setResult(await api('/api/imports/llm', { method: 'POST', body: JSON.stringify({ sourceType, payload }) })); }
  return <OpsShell title="LLM export importer" subtitle="Paste exports from ChatGPT, Claude, or generic markdown. The system normalizes them into the founder vault.">
    <form className="card form" onSubmit={submit}><label>Source<select className="select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}><option value="chatgpt">ChatGPT JSON</option><option value="claude">Claude JSON/Markdown</option><option value="generic">Generic text/markdown</option></select></label><label>Export payload<textarea className="textarea" style={{minHeight: 260}} value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="Paste export JSON or markdown here." /></label><button className="cta">Import into Second Brain</button></form>
    {result && <div className="card"><h3>Imported {result.imported.length} notes</h3><pre className="code">{JSON.stringify(result.imported, null, 2)}</pre></div>}
  </OpsShell>;
}
