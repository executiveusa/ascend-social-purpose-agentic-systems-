# Repeatable Deployment Contract

## Product rule

Mission OS has one shared backend and many custom frontends.

```text
shared backend: Mission API, CRM, ICM, approvals, outbox, adapters
custom frontend: brand, copy, pages, forms, campaign surface, llms.txt
```

## Backend should not be forked per nonprofit

Per-client differences belong in:

- tenant profile
- allowed origins
- public API keys
- ICM `_config/`
- frontend brand tokens
- frontend routes/copy
- opportunities configuration

## Public bridge contract

All custom frontends talk to:

```http
POST /api/public/:tenant/:kind
```

Required headers:

```http
content-type: application/json
x-mission-public-key: pk_mission_...
x-idempotency-key: unique-client-side-key
```

Supported kinds:

- contact
- message
- volunteer
- program-application
- newsletter
- event-rsvp
- donation-intent
- impact-story

Every accepted submission creates:

- CRM contact
- interaction
- pipeline item
- staff task
- audit event
- public receipt

## Tenant factory acceptance criteria

A tenant is not ready until these pass:

```bash
node missionctl/missionctl.mjs doctor
node missionctl/missionctl.mjs tenant create demo --org "Demo Org" --domain "https://demo.org"
node missionctl/missionctl.mjs frontend scaffold demo
node missionctl/missionctl.mjs hostinger handoff demo --domain "demo.org" --api-domain "api.demo.org"
node missionctl/missionctl.mjs smoke demo
npm run verify
```
