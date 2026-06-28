# One-Click Bundle Flywheel

## Concept

The missionctl one-click bundle flywheel generates a complete deployable managed bundle from a single command:

```bash
missionctl bundle up demo-pnw --dry-run
```

## Bundle contents

```
handoff/<tenant>/managed/
  .env.managed                    # All environment variables
  docker-compose.managed.yml      # 12 services
  Caddyfile.managed               # Reverse proxy routes
  prometheus.yml                  # Metrics scraping
  grafana-dashboard.json          # Dashboard placeholder
  hermes/                         # Hermes runtime config
    env, SOUL.md, MEMORY.md, USER.md, skills/
  litellm/                        # Model gateway config
    config.yaml, env
  open-webui/                     # Staff AI workspace
    env, workspace.json, starter-agents.json
  langfuse/                       # Trace observability
    env, trace-metadata.json
  smoke-test.managed.sh           # Bundle smoke test
  release-manifest.json           # Release metadata
```

## Services in managed bundle

| Service | Image | Public? | Purpose |
|---|---|---|---|
| postgres | postgres:16-alpine | No | Database |
| redis | redis:7-alpine | No | Cache/queue |
| mission-api | Built from repo | Via Caddy | API server |
| site | Built from repo | Via Caddy | Ops console |
| litellm | ghcr.io/berriai/litellm | No | Model gateway |
| hermes | nousresearch/hermes-agent | No (localhost:8765) | Agent runtime |
| open-webui | ghcr.io/open-webui/open-webui | Via Caddy /workspace/* | Staff AI workspace |
| langfuse-web | langfuse/langfuse | Via Caddy /observability/* | Trace observability |
| prometheus | prom/prometheus | No (localhost:9090) | Metrics |
| grafana | grafana/grafana | No (localhost:3002) | Dashboards |
| caddy | caddy:2-alpine | Yes (80/443) | Reverse proxy |

## Workflow

1. `missionctl tenant create <slug>` — Create tenant
2. `missionctl pack generate <slug>` — Generate agent pack
3. `missionctl hermes provision <slug>` — Provision Hermes config
4. `missionctl litellm sync <slug>` — Generate LiteLLM config
5. `missionctl langfuse sync <slug>` — Generate Langfuse config
6. `missionctl openwebui sync <slug>` — Generate Open WebUI config
7. `missionctl bundle up <slug> --dry-run` — Generate bundle
8. `missionctl bundle smoke <slug> --dry-run` — Verify bundle
9. Review generated files
10. Set provider API keys in `.env.managed`
11. Deploy: `docker compose -f docker-compose.managed.yml up -d --build`
