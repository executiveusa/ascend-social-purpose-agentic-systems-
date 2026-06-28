# Spec: Deployment Bundle

## Purpose

A managed deployment bundle that extends v0.5's Docker Compose with Hermes, LiteLLM, Open WebUI, and Langfuse services.

## Bundle structure

```
bundles/<tenant>/
  docker-compose.managed.yml    # All services
  .env.managed                  # Environment for managed services
  litellm/
    config.yaml                 # Generated from model-policy.json
  open-webui/
    env                         # Per-tenant workspace config
  langfuse/
    env                         # Self-hosted Langfuse config
  hermes/
    env                         # Hermes runtime config
    agent-packs/
      <pack-name>.json          # Agent pack manifests
  smoke-test.sh                 # Bundle-specific smoke test
```

## Services in managed compose

```yaml
services:
  # --- v0.5 services (unchanged) ---
  postgres:     # Existing
  mission-api:  # Existing
  site:         # Existing
  caddy:        # Existing

  # --- v0.6 managed services ---
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports: ["4000:4000"]
    env_file: .env.managed
    volumes:
      - ./litellm/config.yaml:/app/config.yaml
    depends_on: [postgres]

  hermes:
    build:
      context: .
      dockerfile: deploy/hermes/Dockerfile.hermes
    env_file: hermes/env
    depends_on: [litellm, mission-api]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    env_file: open-webui/env
    depends_on: [litellm]

  langfuse:
    image: langfuse/langfuse:latest
    env_file: langfuse/env
    depends_on: [postgres]
    ports: ["3001:3000"]
```

## missionctl commands

### `missionctl bundle init <tenant>`
1. Read tenant profile + keys
2. Read agent packs for tenant
3. Generate litellm/config.yaml from model-policy.json
4. Generate open-webui/env with tenant workspace ID
5. Generate langfuse/env with self-hosted config
6. Generate hermes/env with agent pack paths
7. Generate docker-compose.managed.yml
8. Generate smoke-test.sh
9. Write everything to `bundles/<tenant>/`

### `missionctl bundle dry-run <tenant>`
1. Validate all env files have required variables
2. Validate docker-compose syntax (`docker compose config`)
3. Validate agent packs against schema
4. Validate LiteLLM config
5. Report any missing keys or invalid configs

### `missionctl bundle apply <tenant>`
1. Run dry-run validation
2. Copy bundle to VPS (or run locally)
3. `docker compose -f docker-compose.managed.yml up -d --build`
4. Wait for health checks
5. Run smoke test
6. Log `bundle.applied` event

## Rules

- Bundle is tenant-specific but uses shared images.
- Secrets are injected at apply time, not stored in the bundle directory.
- Bundle can be regenerated without data loss (idempotent).
- Rolling back = `docker compose down` + restore previous bundle.
