'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { opsApi } from '../../../lib/opsApi';

function relDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function statusBadgeVariant(status) {
  if (status === 'active') return 'mint';
  if (status === 'failed' || status === 'rolled_back') return 'red';
  if (status === 'draft' || status === 'ready') return 'gold';
  return 'default';
}

export default function DeploymentsPage() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    opsApi('/deployments')
      .then(data => { setState(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <OpsShell title="Deployments"><p className="notice">Loading deployment state…</p></OpsShell>;
  if (error) return <OpsShell title="Deployments"><p className="notice">Error: {error}</p></OpsShell>;

  const { releases = [], active, health, recentSmoke = [], backups = [] } = state || {};
  const empty = releases.length === 0;

  return (
    <OpsShell title="Deployments" subtitle="Release history, health, and backup state (dry-run mode — no live deployment actions)">
      {active ? (
        <div className="grid cols-3">
          <div className="kpi">
            <span className="label">Active Release</span>
            <span className="value">{active.version}</span>
          </div>
          <div className="kpi">
            <span className="label">Activated At</span>
            <span className="value">{relDate(active.activated_at)}</span>
          </div>
          <div className="kpi">
            <span className="label">Health</span>
            <span className="value">{health?.overallStatus || 'unknown'}</span>
          </div>
        </div>
      ) : (
        <div className="notice">No active release. Run <code>missionctl bundle release &lt;tenant&gt;</code> then <code>missionctl upgrade &lt;tenant&gt; --release &lt;id&gt;</code>.</div>
      )}

      <div className="section compact">
        <h3>Release History</h3>
        {empty ? (
          <p className="notice">No releases yet. Use <code>missionctl bundle release</code> to create one.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Version</th><th>Status</th><th>Created</th><th>Activated</th></tr>
            </thead>
            <tbody>
              {[...releases].reverse().map(r => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td>{r.version}</td>
                  <td><StatusBadge value={r.status} variant={statusBadgeVariant(r.status)} /></td>
                  <td>{relDate(r.created_at)}</td>
                  <td>{relDate(r.activated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section compact">
        <h3>Recent Smoke Results</h3>
        {recentSmoke.length === 0 ? (
          <p className="notice">No smoke history. Run <code>missionctl bundle smoke</code>.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Status</th><th>Passed</th><th>Failed</th><th>Run At</th></tr>
            </thead>
            <tbody>
              {[...recentSmoke].reverse().map(s => (
                <tr key={s.id}>
                  <td><code>{s.id}</code></td>
                  <td><StatusBadge value={s.status} variant={s.status === 'passed' ? 'mint' : 'red'} /></td>
                  <td>{s.passed}</td>
                  <td>{s.failed}</td>
                  <td>{relDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section compact">
        <h3>Backups</h3>
        {backups.length === 0 ? (
          <p className="notice">No backups. Run <code>missionctl backup &lt;tenant&gt;</code>.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Backup ID</th><th>Files</th><th>Created</th><th>Restorable</th></tr>
            </thead>
            <tbody>
              {[...backups].reverse().map(b => (
                <tr key={b.backup_id}>
                  <td><code>{b.backup_id}</code></td>
                  <td>{b.file_count}</td>
                  <td>{relDate(b.created_at)}</td>
                  <td><StatusBadge value={b.restorable ? 'yes' : 'no'} variant={b.restorable ? 'mint' : 'red'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section compact">
        <div className="card">
          <h3>Upgrade / Rollback</h3>
          <p>Release, upgrade, and rollback are managed via <code>missionctl</code> on the operator's machine. No live deployment actions are available from the browser in Phase 6.</p>
          <div className="code">
            missionctl bundle release &lt;tenant&gt;<br/>
            missionctl upgrade &lt;tenant&gt; --release &lt;release-id&gt;<br/>
            missionctl rollback &lt;tenant&gt; --to &lt;release-id&gt;<br/>
            missionctl backup &lt;tenant&gt;
          </div>
        </div>
      </div>
    </OpsShell>
  );
}
