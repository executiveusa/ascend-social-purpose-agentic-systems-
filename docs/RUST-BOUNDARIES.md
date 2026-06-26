# Rust Boundaries

Rust is used where failure is expensive:

| Service | Why Rust |
|---|---|
| `mission-core-rs` | authoritative tenancy, CRM, approvals, audit writes |
| `mission-connect-rs` | public bridge, key verification, tenant boundary, high request volume |
| `mission-worker-rs` | outbox retries, scheduled work, durable background processing |
| `mission-policy-rs` | deterministic safety classification before LLM/tool calls |
| `mission-icm-rs` | path traversal protection and filesystem-safe ICM execution |

Do not rewrite UI in Rust. Keep fast UX iteration in React/Next.js.
