# P0-1: Fix production bridge configuration

## Proposal
The frontend API client uses `NEXT_PUBLIC_API_URL` but must use
`NEXT_PUBLIC_MISSION_API_URL` consistently. Public bridge CORS must allow
custom tenant frontend origins at the public CORS layer, then enforce the
tenant origin allowlist inside the route.

## Specs
- `NEXT_PUBLIC_MISSION_API_URL` is the single source of truth for the ops API base.
- Public bridge accepts submissions from any origin in the tenant's `allowedOrigins`.
- Unknown origins are rejected with 403.
- Idempotency replay returns the original receipt with `replayed: true`.
- Duplicate fingerprint (same payload, different idempotency key) returns 409.

## Tasks
- [x] Update `apps/site/lib/api.js` to read `NEXT_PUBLIC_MISSION_API_URL`
- [x] Add tenant-origin enforcement tests in `packages/core/tests/bridge.test.js`
- [x] Verify idempotency + origin rejection in API route
