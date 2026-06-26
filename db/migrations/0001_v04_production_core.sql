create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
  org_name text not null,
  region text not null default 'Seattle / King County',
  niche text not null default 'youth, sports, mentorship',
  status text not null default 'active',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  email citext unique not null,
  display_name text not null,
  role text not null check (role in ('owner','admin','staff','board','volunteer','viewer')),
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public_api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  public_key text unique not null,
  allowed_origins text[] not null default '{}',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  display_name text not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  organization text,
  role text,
  source text,
  tags text[] not null default '{}',
  consent jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contacts_tenant_email_idx on contacts(tenant_id, lower(email));

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null,
  kind text not null default 'community',
  website text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete set null,
  channel text not null,
  direction text not null,
  subject text,
  body text,
  metadata jsonb not null default '{}',
  at timestamptz not null default now()
);

create table if not exists pipeline_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  pipeline text not null,
  stage text not null,
  title text not null,
  contact_id uuid references contacts(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  value numeric,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pipeline_items_tenant_pipeline_idx on pipeline_items(tenant_id, pipeline, stage);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  title text not null,
  risk text not null check (risk in ('green','yellow','orange','red')),
  status text not null default 'pending',
  payload jsonb not null default '{}',
  decided_by uuid references users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists outbox_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  event_type text not null,
  adapter text not null,
  approval_id uuid references approvals(id) on delete set null,
  risk text not null default 'yellow',
  status text not null default 'pending_approval',
  attempts int not null default 0,
  payload jsonb not null default '{}',
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists icm_artifacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  stage text not null,
  path text not null,
  artifact_type text not null,
  risk text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists vault_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  title text not null,
  path text,
  body text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  actor_id uuid references users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_events_tenant_created_idx on audit_events(tenant_id, created_at desc);
