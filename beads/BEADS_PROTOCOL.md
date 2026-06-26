# BEADS PROTOCOL — Asc3nd Social Purpose OS

All communication, rollback, checkpoints, and decisions must use the Beads skill.
Every major action writes a Bead. No "done" claim without a Bead.

## Layout

```
beads/
├── BEADS_PROTOCOL.md      (this file)
├── manifest.json          (bead index)
├── checkpoints/           (phase checkpoints)
├── rollback/              (rollback recipes)
└── decisions/             (decision log)
```

## Bead format

```yaml
id: bead-NNNN
timestamp: <ISO-8601>
actor: <agent|human>
phase: <phase name>
repo: ascend-social-purpose-agentic-systems-
branch: main
files_changed:
  - <path>
decision: <one-line>
reason: <why>
rollback_command: <command to undo>
risks:
  - <risk>
next_action: <next step>
human_needed: false
```

## Mandatory beads

- bead-0001: repo inventory
- bead-0002: skills discovered and activated
- bead-0003: blog template inspection
- bead-0004: content schema created
- bead-0005: monetization model implemented
- bead-0006: Pi Agent backend plan
- bead-0007: editorial/social agents created
- bead-0008: build/test result
- bead-0009: browser verification
- bead-0010: PR/review/merge status

Adapted for this build: bead-0003..0007 map to the P0 task phases
(bridge config, Postgres repos, CRM flow, approval/outbox, ICM runner, RBAC).
