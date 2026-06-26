'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function VoicePage() {
  const [calls, setCalls] = useState([]);
  useEffect(() => { api('/api/voice/calls').then(setCalls).catch(() => {}); }, []);
  return <OpsShell title="Voice agent lane" subtitle="Inbound/outbound voice hooks log calls, transcripts, and follow-up tasks. External calls require approval.">
    <div className="card"><h3>Webhook</h3><p>Point Twilio/Vapi/Retell-style call events to:</p><pre className="code">POST /api/voice/webhook?tenantId=asc3nd</pre></div>
    <div className="grid">{calls.length === 0 && <div className="card"><p>No calls logged yet.</p></div>}{calls.map((call) => <div className="card" key={call.id}><div className="preview-row"><strong>{call.from}</strong><span className="badge">{call.at}</span></div><p>{call.transcript || 'No transcript'}</p></div>)}</div>
  </OpsShell>;
}
