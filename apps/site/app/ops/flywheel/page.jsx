import { OpsShell } from '../../../components/OpsShell';

export default function FlywheelPage() {
  return <OpsShell title="Agentic coding flywheel" subtitle="Use ACFS to maintain the shared backend and push improvements to every deployment.">
    <div className="grid">
      <div className="card"><h3>VPS bootstrap</h3><pre className="code">curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/agentic_coding_flywheel_setup/main/install.sh?$(date +%s)" | bash -s -- --yes --mode vibe</pre></div>
      <div className="card"><h3>Mission OS loop</h3><pre className="code">1. Open a bead/task
2. Run tests first
3. Code inside small ICM stage
4. Run npm test + smoke
5. Ship core backend update
6. Customize only frontend/tenant config</pre></div>
      <div className="card"><h3>Repo rule</h3><p>The backend is product code. Tenant-specific work belongs in public frontend theme files and ICM _config files.</p></div>
    </div>
  </OpsShell>;
}
