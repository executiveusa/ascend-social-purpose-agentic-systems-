'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { opsApi } from '../../../lib/opsApi';

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    opsApi('/artifacts').then((d) => setArtifacts(d.artifacts)).catch((e) => setError(e.message));
  }, []);

  return (
    <OpsShell title="Artifacts" subtitle="Outputs registered by managed agents and pipelines. No live execution.">
      {error && <div className="notice">Artifacts unavailable: {error}</div>}
      {!error && !artifacts && <div className="card"><p>Loading artifacts…</p></div>}
      {artifacts && artifacts.length === 0 && (
        <div className="card"><p>No artifacts registered yet.</p></div>
      )}
      {artifacts && artifacts.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Kind</th><th>Approval class</th><th>Created</th></tr>
            </thead>
            <tbody>
              {artifacts.map((art) => (
                <tr key={art.id}>
                  <td>{art.title}</td>
                  <td>{art.kind}</td>
                  <td><StatusBadge value={art.approvalClass} /></td>
                  <td>{art.createdAt ? new Date(art.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OpsShell>
  );
}
