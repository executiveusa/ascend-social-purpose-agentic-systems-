# ICM Workspaces

This folder is the durable operating system for each tenant. The app can regenerate a tenant workspace, but humans can also inspect and edit it with a text editor.

Layer model:

- Layer 0: `AGENT.md` — global agent identity and guardrails.
- Layer 1: `CONTEXT.md` — workspace routing.
- Layer 2: `stages/*/CONTEXT.md` — stage contract.
- Layer 3: `_config/*.md` and `references/*.md` — stable reference material.
- Layer 4: `output/*` — working artifacts from a specific run.

Do not replace this with a hidden swarm. One primary Pi-compatible agent reads the right files, executes a stage, writes output, and waits for review where needed.
