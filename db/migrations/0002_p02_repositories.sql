-- P0-2: Postgres repository layer tables.
-- Adds the CRM/outbox/tenant-key tables that the JSON store previously owned.

CREATE TABLE IF NOT EXISTS contacts (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'community',
  organization text,
  tags text[] NOT NULL DEFAULT '{}',
  consent jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts (tenant_id, email);

CREATE TABLE IF NOT EXISTS interactions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id text REFERENCES contacts(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'web',
  direction text NOT NULL DEFAULT 'inbound',
  subject text,
  body text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interactions_tenant ON interactions (tenant_id, at DESC);

CREATE TABLE IF NOT EXISTS pipeline_items (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline text NOT NULL,
  stage text NOT NULL,
  title text NOT NULL,
  contact_id text REFERENCES contacts(id) ON DELETE SET NULL,
  organization_id text,
  value numeric,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_tenant ON pipeline_items (tenant_id, pipeline, created_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  contact_id text REFERENCES contacts(id) ON DELETE CASCADE,
  pipeline_item_id text REFERENCES pipeline_items(id) ON DELETE CASCADE,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  adapter text,
  approval_id text REFERENCES approvals(id) ON DELETE SET NULL,
  risk text NOT NULL DEFAULT 'yellow',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_approval',
  attempts integer NOT NULL DEFAULT 0,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbox_tenant_status ON outbox_events (tenant_id, status);

CREATE TABLE IF NOT EXISTS tenant_keys (
  tenant_id text PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  public_key text NOT NULL,
  secret_key_hash text NOT NULL,
  allowed_origins text[] NOT NULL DEFAULT '{}',
  api_base_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RBAC roles (P0-6): widen the users role CHECK to the full role set.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'owner','executive_director','program_director','staff','board_member',
  'volunteer_manager','finance','read_only','director','staff','board','volunteer'
));
