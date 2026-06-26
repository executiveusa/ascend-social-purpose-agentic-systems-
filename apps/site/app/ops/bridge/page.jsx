'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function BridgePage() {
  const [keys, setKeys] = useState(null);
  useEffect(() => { api('/api/tenant/keys').then(setKeys).catch(() => setKeys(null)); }, []);
  const endpoint = `${process.env.NEXT_PUBLIC_MISSION_API_URL || 'http://localhost:4000'}/api/public/${keys?.tenantId || 'asc3nd'}/volunteer`;
  return <OpsShell title="Frontend bridge" subtitle="Wire any custom nonprofit website into the shared Mission OS backend without custom backend work.">
    <div className="grid cols-4">
      <div className="card"><span className="badge mint">Public key</span><h3>{keys?.publicKey ? 'Configured' : 'Not generated'}</h3><p>Use missionctl tenant create or /api/tenant/provision to generate bridge keys.</p></div>
      <div className="card"><span className="badge gold">One SDK</span><h3>Reusable forms</h3><p>Contact, volunteer, program application, donation intent, newsletter, event RSVP, messages, and impact stories.</p></div>
      <div className="card"><span className="badge">CRM</span><h3>Auto-routed</h3><p>Submissions become contacts, interactions, pipeline items, staff tasks, and audit events.</p></div>
      <div className="card"><span className="badge red">Protected</span><h3>Guarded bridge</h3><p>Origin allowlist, public key, idempotency key, rate limit, and honeypot rejection are built in.</p></div>
    </div>
    <div className="card elevated section compact"><h3>Example endpoint</h3><pre className="code">POST {endpoint}{`\n`}x-mission-public-key: {keys?.publicKey || 'pk_mission_...'}{`\n`}x-idempotency-key: unique-form-submit-id</pre></div>
    <div className="card"><h3>Frontend env</h3><pre className="code">NEXT_PUBLIC_MISSION_API_URL={keys?.apiBaseUrl || 'https://api.client.org'}{`\n`}NEXT_PUBLIC_MISSION_TENANT={keys?.tenantId || 'client-slug'}{`\n`}NEXT_PUBLIC_MISSION_PUBLIC_KEY={keys?.publicKey || 'pk_mission_...'}</pre></div>
  </OpsShell>;
}
