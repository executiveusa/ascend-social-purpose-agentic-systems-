-- db/migrations/0003_v06_core_platform.sql
-- Phase 1: Core Platform State Layer migration

CREATE TABLE IF NOT EXISTS typed_event_journal (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  version text NOT NULL DEFAULT '1',
  correlation_id text NOT NULL,
  trace_id text,
  actor text NOT NULL,
  subject text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  redacted_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_class text NOT NULL CHECK (approval_class IN ('green','yellow','orange','red')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','rejected','executed','verified','logged')),
  requester text NOT NULL,
  approver text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifacts (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id text,
  approval_id text REFERENCES approval_requests(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/json',
  storage_backend text NOT NULL DEFAULT 'file',
  storage_path text NOT NULL,
  checksum_sha256 text NOT NULL,
  approval_class text NOT NULL DEFAULT 'green',
  approval_status text NOT NULL DEFAULT 'approved',
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  trace_id text,
  model_route text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS managed_agents (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  agent_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  runtime text NOT NULL DEFAULT 'node',
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  pack_version text NOT NULL DEFAULT '1.0.0',
  health_status text NOT NULL DEFAULT 'ok',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_slug)
);

CREATE TABLE IF NOT EXISTS managed_agent_runs (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id text NOT NULL REFERENCES managed_agents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error text
);

CREATE TABLE IF NOT EXISTS managed_agent_health (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  health_status text NOT NULL,
  check_output text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_typed_event_journal_tenant_type ON typed_event_journal (tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant_status ON approval_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_artifacts_tenant_kind ON artifacts (tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_managed_agents_tenant ON managed_agents (tenant_id);
