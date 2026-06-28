# Spec: Managed Agents

## Purpose

Track Hermes-managed agent instances per tenant. Mission OS DB is the system of record; Hermes is the execution runtime.

## Schema

```sql
CREATE TABLE managed_agents (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  pack_id text NOT NULL,
  hermes_instance_id text,
  status text NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning','active','stopped','error')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_health_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_managed_agents_tenant ON managed_agents (tenant_id, status);
```

## API

- `GET /api/agents?tenant=<slug>` — list agents for tenant
- `POST /api/agents` — create/provision a new managed agent
- `GET /api/agents/:id` — get agent details + health
- `PATCH /api/agents/:id` — update status, config, or stop/start
- `DELETE /api/agents/:id` — deprovision agent

## Core package

`packages/core/src/managed-agents.js`:
- `createManagedAgent({ tenantId, agentName, packId, config })`
- `getManagedAgent(id)`
- `listManagedAgents(tenantId)`
- `updateAgentStatus(id, status, healthInfo)`
- `deprovisionAgent(id)`

## Rules

- Hermes instance ID is set after provisioning, not at creation.
- Health check updates `last_health_at` and `status`.
- Agent config includes model tier, tools, and approval policy from the agent pack.
- Deleting a managed agent sends a stop signal to Hermes before removing the record.
