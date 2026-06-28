# Spec: Approval/Policy Lifecycle

## Purpose

Extend the v0.5 approval queue (pending/decided) into a full lifecycle state machine with execution tracking.

## State machine

```
                    ┌──────────┐
                    │  draft   │
                    └────┬─────┘
                         │ submit
                         v
                    ┌──────────┐
         ┌──────────│ pending  │──────────┐
         │          └────┬─────┘          │
         │   approve     │          reject│
         v               │               v
   ┌──────────┐          │         ┌──────────┐
   │ approved │          │         │ rejected │
   └────┬─────┘          │         └──────────┘
        │ execute        │
        v               │
   ┌──────────┐          │
   │executing │          │
   └────┬─────┘          │
        │                │
   ┌────┴────┐           │
   │         │           │
   v         v           │
┌──────┐ ┌──────┐        │
│ done │ │failed│        │
└──────┘ └──────┘        │
```

## Schema changes

Add to `approvals` table:
```sql
ALTER TABLE approvals ADD COLUMN executed_at timestamptz;
ALTER TABLE approvals ADD COLUMN execution_result jsonb;
ALTER TABLE approvals ADD COLUMN retry_count int NOT NULL DEFAULT 0;
ALTER TABLE approvals ADD COLUMN max_retries int NOT NULL DEFAULT 3;
```

Add CHECK constraint:
```sql
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
ALTER TABLE approvals ADD CONSTRAINT approvals_status_check
  CHECK (status IN ('draft','pending','approved','rejected','executing','completed','failed'));
```

## Transition rules

| From | To | Trigger | Actor |
|---|---|---|---|
| draft | pending | Submit for review | Staff |
| pending | approved | Human approval | Director/Owner |
| pending | rejected | Human rejection | Director/Owner |
| approved | executing | Outbox worker picks up | System |
| executing | completed | Execution success | System |
| executing | failed | Execution error (retry if count < max) | System |
| failed | executing | Manual retry | Director/Owner |

## Policy integration

- Risk level (green/yellow/orange/red) determines auto-approval eligibility.
- Green actions can auto-approve if `AUTO_APPROVE_GREEN=true`.
- Yellow actions can auto-draft but need approval before execution.
- Orange/red actions ALWAYS require human approval.
- Tool allowlist (`config/tool-allowlist.json`) gates which tools can be used.

## Events

Every state transition logs a typed event:
- `approval.created` (draft → pending)
- `approval.decided` (pending → approved/rejected)
- `approval.executing` (approved → executing)
- `approval.completed` (executing → completed)
- `approval.failed` (executing → failed)

## Core package

`packages/core/src/approval-lifecycle.js`:
- `transitionApproval(id, toState, actor)`
- `canTransition(currentState, toState)` — validates state machine
- `getApprovalHistory(id)` — returns all events for an approval
