-- db/migrations/0005_v06_model_gateway_observability.sql

CREATE TABLE IF NOT EXISTS model_budgets (
  tenant_id text PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  monthly_budget_usd numeric NOT NULL DEFAULT 50,
  warning_threshold_pct numeric NOT NULL DEFAULT 0.8,
  hard_block_threshold_pct numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_usage_ledger (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  surface text NOT NULL,
  agent_slug text,
  model text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  trace_id text,
  approval_class text NOT NULL DEFAULT 'green',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_links (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  surface text NOT NULL,
  agent_slug text,
  run_id text,
  artifact_id text,
  langfuse_trace_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_configs (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, integration)
);

CREATE INDEX IF NOT EXISTS idx_model_usage_ledger_tenant ON model_usage_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_ledger_surface ON model_usage_ledger(tenant_id, surface);
CREATE INDEX IF NOT EXISTS idx_trace_links_tenant ON trace_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trace_links_run ON trace_links(tenant_id, run_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_tenant ON integration_configs(tenant_id);
