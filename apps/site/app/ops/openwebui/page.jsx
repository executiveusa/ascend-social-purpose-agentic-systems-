'use client';
import { OpsShell } from '../../../components/OpsShell';

export default function OpenWebUiPage() {
  return (
    <OpsShell title="Open WebUI" subtitle="Workspace launcher placeholder. Dry-run only — no live Open WebUI instance is called.">
      <div className="notice">
        Open WebUI is not wired live in Phase 5. This page is a placeholder for the future launcher described in
        docs/LITELLM-LANGFUSE-OPENWEBUI.md.
      </div>
      <div className="section compact">
        <div className="card">
          <h3>Workspace launcher</h3>
          <p>Once Open WebUI bootstrap is connected, an authenticated workspace link will appear here per agent.
          For now, see <code>missionctl hermes provision</code> output for any locally configured workspace URLs.</p>
        </div>
      </div>
    </OpsShell>
  );
}
