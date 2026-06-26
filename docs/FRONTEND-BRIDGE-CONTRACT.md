# Mission Connect Frontend Bridge Contract

Every custom nonprofit frontend connects to the shared backend through the same public contract.

## Required frontend config

```json
{
  "tenant": "asc3nd",
  "apiBaseUrl": "https://api.example.org",
  "publicApiKey": "pk_mission_..."
}
```

## Public endpoints

```http
POST /api/public/:tenant/contact
POST /api/public/:tenant/volunteer
POST /api/public/:tenant/program-application
POST /api/public/:tenant/donation-intent
POST /api/public/:tenant/newsletter
POST /api/public/:tenant/event-rsvp
POST /api/public/:tenant/message
```

## Required headers

```http
x-mission-public-key: pk_mission_...
x-idempotency-key: stable-random-id
content-type: application/json
```

## Result

Each accepted request creates:

- CRM contact
- interaction record
- pipeline item
- audit event
- staff follow-up task candidate

No custom backend code should be required per client.
