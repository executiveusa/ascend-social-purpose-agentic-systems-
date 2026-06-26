'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function OnboardingPage() {
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { api('/api/onboarding').then(setForm).catch(() => {}); }, []);
  async function save(e) { e.preventDefault(); const result = await api('/api/onboarding', { method: 'POST', body: JSON.stringify(form) }); setForm(result.profile); setSaved(true); }
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <OpsShell title="Tenant onboarding" subtitle="Collect the data that turns a generic backend into a mission-specific operating system.">
      <form className="grid" onSubmit={save}>
        {saved && <div className="notice">Saved. ICM Layer 3 mission and founder profile files were updated.</div>}
        <div className="split">
          <label>Organization name<input className="input" value={form.orgName || ''} onChange={set('orgName')} /></label>
          <label>Founder / executive lead<input className="input" value={form.founderName || ''} onChange={set('founderName')} /></label>
        </div>
        <div className="split">
          <label>Legal status<input className="input" value={form.legalStatus || ''} onChange={set('legalStatus')} /></label>
          <label>Region<input className="input" value={form.region || ''} onChange={set('region')} /></label>
        </div>
        <label>Audience<input className="input" value={form.audience || ''} onChange={set('audience')} /></label>
        <label>Mission<textarea className="textarea" value={form.mission || ''} onChange={set('mission')} /></label>
        <label>Programs<textarea className="textarea" value={form.programs || ''} onChange={set('programs')} /></label>
        <label>Priorities<textarea className="textarea" value={form.priorities || ''} onChange={set('priorities')} /></label>
        <button className="cta">Save and rebuild ICM workspace</button>
      </form>
    </OpsShell>
  );
}
