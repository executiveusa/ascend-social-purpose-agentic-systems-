# Spec: Dashboard State

## Purpose

Single API endpoint that aggregates all data needed to hydrate the ops cockpit dashboard in one request.

## Endpoint

```
GET /api/dashboard-state?tenant=<slug>
```

## Response

```json
{
  "ok": true,
  "tenant": {
    "id": "asc3nd",
    "orgName": "Asc3nd Collective",
    "status": "active"
  },
  "pendingApprovals": [
    {
      "id": "apr_001",
      "title": "Publish campaign: Spring Fundraiser",
      "risk": "orange",
      "createdAt": "2026-06-27T10:00:00Z"
    }
  ],
  "recentEvents": [
    {
      "id": "evt_001",
      "eventType": "agent.run",
      "correlationId": "corr_001",
      "modelRoute": "standard",
      "costCents": 2,
      "createdAt": "2026-06-27T12:00:00Z"
    }
  ],
  "activeAgents": [
    {
      "id": "ag_001",
      "agentName": "grant-scout",
      "status": "active",
      "lastHealthAt": "2026-06-27T12:05:00Z"
    }
  ],
  "recentArtifacts": [
    {
      "id": "art_001",
      "type": "icm-output",
      "title": "Opportunity scan result",
      "version": 1,
      "createdAt": "2026-06-27T11:00:00Z"
    }
  ],
  "modelUsage": {
    "today": { "cheap": 0, "standard": 145, "critical": 0 },
    "month": { "cheap": 12, "standard": 3200, "critical": 450 }
  },
  "systemHealth": {
    "api": "ok",
    "hermes": "active",
    "litellm": "ok",
    "langfuse": "ok",
    "openWebui": "ok"
  },
  "stats": {
    "totalContacts": 42,
    "totalOpportunities": 7,
    "totalCampaigns": 3,
    "totalOutcomes": 15
  }
}
```

## Implementation

`packages/core/src/dashboard-state.js`:
- `getDashboardState(tenantId)` — aggregates from all repos
- Caches for 15 seconds (short TTL to stay fresh)
- Falls back gracefully if managed services are not running (health = "not provisioned")

## UI

The ops cockpit (`apps/site/app/ops/page.jsx`) calls this endpoint on mount and polls every 30 seconds. Individual pages (approvals, CRM, etc.) continue to have their own endpoints for detailed views.
