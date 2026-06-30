'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { opsApi } from '../../../lib/opsApi';

export default function EventsPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    opsApi('/events').then((d) => setEvents(d.events)).catch((e) => setError(e.message));
  }, []);

  return (
    <OpsShell title="Event journal" subtitle="Mission OS operator activity log. Dry-run state only.">
      {error && <div className="notice">Event journal unavailable: {error}</div>}
      {!error && !events && <div className="card"><p>Loading events…</p></div>}
      {events && events.length === 0 && (
        <div className="card"><p>No events recorded yet.</p></div>
      )}
      {events && events.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Actor</th><th>Subject</th><th>When</th></tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.type}</td>
                  <td>{ev.actor}</td>
                  <td>{ev.subject || '—'}</td>
                  <td>{new Date(ev.createdAt || ev.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OpsShell>
  );
}
