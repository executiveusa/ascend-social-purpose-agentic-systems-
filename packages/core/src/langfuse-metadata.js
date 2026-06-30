const SENSITIVE_KEYS = ['prompt', 'rawPrompt', 'completion', 'rawCompletion', 'secret', 'password', 'token', 'apiKey', 'key'];

export const TRACE_TAG_FIELDS = [
  'org_id',
  'tenant_id',
  'surface',
  'workflow_kind',
  'approval_class',
  'agent_slug',
  'run_id',
  'artifact_id',
  'release_id',
  'environment'
];

export function buildLangfuseTraceMetadata({
  tenantId,
  orgId = tenantId,
  surface,
  workflowKind,
  approvalClass = 'green',
  agentSlug = null,
  runId = null,
  artifactId = null,
  releaseId = null,
  environment = process.env.NODE_ENV || 'development',
  extra = {}
}) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!surface) throw new Error('surface is required');

  const metadata = {
    org_id: orgId,
    tenant_id: tenantId,
    surface,
    workflow_kind: workflowKind || null,
    approval_class: approvalClass,
    agent_slug: agentSlug,
    run_id: runId,
    artifact_id: artifactId,
    release_id: releaseId,
    environment
  };

  const redacted = [];
  for (const [key, value] of Object.entries(extra)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s.toLowerCase()))) {
      redacted.push(key);
      continue;
    }
    metadata[key] = value;
  }

  return { metadata, redacted };
}
