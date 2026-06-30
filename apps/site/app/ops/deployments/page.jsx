'use client';
import { OpsShell } from '../../../components/OpsShell';

export default function DeploymentsPage() {
  return (
    <OpsShell title="Deployments" subtitle="Release and bundle state placeholder. No release, rollback, or backup commands are wired in Phase 5.">
      <div className="notice">
        Deployment/release tracking is not implemented yet. This page is a placeholder reserved for a future phase
        once <code>missionctl bundle release</code> / <code>bundle down</code> are exposed through the Operator API.
      </div>
      <div className="section compact">
        <div className="card">
          <h3>Current bundle</h3>
          <p>Bundle and release state is managed via <code>missionctl</code> on the operator's machine. There is no
          live deployment surface in this dashboard yet.</p>
        </div>
      </div>
    </OpsShell>
  );
}
