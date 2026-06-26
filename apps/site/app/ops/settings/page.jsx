'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function SettingsPage() {
  const [adapters, setAdapters] = useState([]);
  useEffect(() => { api('/api/adapters/status').then((d) => setAdapters(d.adapters)).catch(() => {}); }, []);
  return <OpsShell title="System Health" subtitle="A staff-safe view of what is live and what is still in dry-run mode.">
    <div className="grid cols-3">
      {adapters.map((adapter) => <div className="card" key={adapter.key}>
        <span className={adapter.status === 'configured' ? 'badge mint' : 'badge gold'}>{adapter.status}</span>
        <h3>{adapter.name}</h3>
        <p>{adapter.requiredForProduction ? 'Required before production hosting.' : 'Optional but useful.'}</p>
        <small>{adapter.key}</small>
      </div>)}
    </div>
    <div className="card elevated section compact"><h3>Production rule</h3><p>Live external actions stay off until the adapter is configured, scoped to the tenant, and routed through the approval queue. Dry-run mode is intentional for safe demos.</p></div>
  </OpsShell>;
}
