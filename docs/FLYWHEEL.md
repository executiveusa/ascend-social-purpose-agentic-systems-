# Agentic Coding Flywheel Integration

This project is meant to live inside an ACFS-configured VPS.

## Use ACFS for

- Claude/Codex/Antigravity agent coding sessions.
- Shell/runtime/tool installation.
- Repeatable dev VPS setup.
- Agent coordination and task hygiene.

## Mission OS flywheel

```text
bead/task -> failing test -> core package change -> API route -> UI -> docs -> deployment
```

## Repo guardrail

Every change should preserve this separation:

- Reusable backend: product code.
- Tenant custom frontend: theme/copy/content.
- Tenant intelligence: ICM `_config` and stage outputs.
