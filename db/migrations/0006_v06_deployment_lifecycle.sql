-- db/migrations/0006_v06_deployment_lifecycle.sql

CREATE TABLE IF NOT EXISTS deployment_releases (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  release_id text NOT NULL UNIQUE,
  version text NOT NULL,
  bundle_path text,
  manifest_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','active','failed','rolled_back','archived')),
  previous_release_id text,
  created_by text NOT NULL DEFAULT 'system',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  rolled_back_at timestamptz,
  smoke_status text,
  health_status text
);

CREATE INDEX IF NOT EXISTS deployment_releases_tenant_id_idx ON deployment_releases(tenant_id);
CREATE INDEX IF NOT EXISTS deployment_releases_status_idx ON deployment_releases(tenant_id, status);

CREATE TABLE IF NOT EXISTS deployment_health_checks (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  release_id text REFERENCES deployment_releases(id) ON DELETE SET NULL,
  check_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','warn','fail')),
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deployment_health_checks_tenant_idx ON deployment_health_checks(tenant_id, release_id);

CREATE TABLE IF NOT EXISTS deployment_smoke_results (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  release_id text REFERENCES deployment_releases(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('passed','failed')),
  total integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  checks jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deployment_smoke_results_tenant_idx ON deployment_smoke_results(tenant_id, release_id);

CREATE TABLE IF NOT EXISTS tenant_backups (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  backup_id text NOT NULL UNIQUE,
  file_count integer NOT NULL DEFAULT 0,
  checksum_sha256 text NOT NULL DEFAULT '',
  restorable boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz
);

CREATE INDEX IF NOT EXISTS tenant_backups_tenant_id_idx ON tenant_backups(tenant_id);
