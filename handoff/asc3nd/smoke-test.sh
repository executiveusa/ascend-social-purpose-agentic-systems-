#!/usr/bin/env bash
set -euo pipefail
API="https://api.asc3nd.org"
TENANT="asc3nd"
PUBLIC_KEY="pk_mission_YXNjM25kOjY0NWNlZmU3ZGU4NWNl"

echo "Health check"
curl -fsS "$API/api/health" | jq .

echo "Public bridge check"
curl -fsS -X POST "$API/api/public/$TENANT/volunteer" \
  -H "content-type: application/json" \
  -H "x-mission-public-key: $PUBLIC_KEY" \
  -H "x-idempotency-key: smoke-$(date +%s)" \
  -d '{"name":"Smoke Test","email":"smoke@example.org","message":"Hostinger bridge test."}' | jq .
