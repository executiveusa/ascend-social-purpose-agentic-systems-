'use client';
import { useState } from 'react';
import { MissionClient } from '@asc3nd/mission-sdk-js';
import { tenantSite } from '../../tenant.config';

const API_URL = process.env.NEXT_PUBLIC_MISSION_API_URL || 'http://localhost:4000';
const TENANT = 'asc3nd';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_MISSION_PUBLIC_KEY || 'pk_mission_YXNjM25kOjY0NWNlZmU3ZGU4NWNl';

const client = new MissionClient({ apiBaseUrl: API_URL, tenant: TENANT, publicKey: PUBLIC_KEY });

const forms = [
  { id: 'volunteer', label: 'Volunteer', kind: 'volunteer', fields: ['name', 'email', 'phone', 'message'], cta: 'Apply to volunteer' },
  { id: 'sponsor', label: 'Sponsor inquiry', kind: 'impact-story', fields: ['name', 'email', 'organization', 'message'], cta: 'Send sponsor inquiry' },
  { id: 'program', label: 'Program / parent inquiry', kind: 'program-application', fields: ['name', 'email', 'phone', 'message'], cta: 'Submit inquiry', consent: true },
  { id: 'donor', label: 'Donor conversation', kind: 'donation-intent', fields: ['name', 'email', 'message'], cta: 'Start donor conversation' },
  { id: 'general', label: 'General message', kind: 'contact', fields: ['name', 'email', 'message'], cta: 'Send message' }
];

function MissionForm({ form }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    if (form.consent) payload.consent = fd.get('consent') === 'on';
    try {
      const res = await client.submit(form.kind, payload, { idempotencyKey: `web-${form.kind}-${Date.now()}` });
      setReceipt(res.receipt);
      setStatus('done');
      e.target.reset();
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'done' && receipt) {
    return (
      <div className="card success-card">
        <h3>Received.</h3>
        <p>{receipt.message || 'A staff member will review this in Mission OS.'}</p>
        <button className="cta ghost" onClick={() => { setStatus('idle'); setReceipt(null); }}>Submit another</button>
      </div>
    );
  }

  return (
    <form className="mission-form" onSubmit={handleSubmit}>
      {form.fields.map((f) => (
        <div className="field" key={f}>
          <label htmlFor={`${form.id}-${f}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
          {f === 'message'
            ? <textarea id={`${form.id}-${f}`} name={f} rows={4} required placeholder={`Tell us about your ${form.label.toLowerCase()}...`} />
            : <input id={`${form.id}-${f}`} name={f} type={f === 'email' ? 'email' : 'text'} required={f === 'name' || f === 'email'} />}
        </div>
      ))}
      {form.consent && (
        <div className="field consent">
          <label><input type="checkbox" name="consent" required /> I acknowledge this is a program/parent inquiry involving youth participation.</label>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="cta" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : form.cta}
      </button>
    </form>
  );
}

export default function GetInvolvedPage() {
  const [active, setActive] = useState('volunteer');
  const form = forms.find((f) => f.id === active);
  return (
    <>
      <main>
        <section className="hero refined">
          <div className="container">
            <span className="eyebrow">{tenantSite.region}</span>
            <h1>Get involved with {tenantSite.orgName}.</h1>
            <p className="lead">Volunteer, sponsor, donate, or ask about programs. Every submission goes through our public bridge into Mission OS — contact, interaction, pipeline, task, and audit event, with human approval before any external action.</p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <div className="form-tabs" role="tablist">
              {forms.map((f) => (
                <button key={f.id} role="tab" aria-selected={active === f.id} className={`tab ${active === f.id ? 'active' : ''}`} onClick={() => setActive(f.id)}>{f.label}</button>
              ))}
            </div>
            <div className="form-panel">
              <MissionForm form={form} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
