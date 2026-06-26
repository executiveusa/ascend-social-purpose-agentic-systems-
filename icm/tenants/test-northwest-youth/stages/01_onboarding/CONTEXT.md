# 01_onboarding

Collect the organization profile and write stable Layer 3 configuration.

## Inputs

- Layer 0: ../../AGENT.md
- Layer 1: ../../CONTEXT.md
- Layer 2: this CONTEXT.md
- Layer 3: ../../_config/*.md and references/*.md
- Layer 4: previous stage output/ as applicable

## Process

1. Load only relevant context.
2. Produce a concrete artifact, not vague advice.
3. Classify the action risk as green, yellow, orange, or red.
4. Write outputs to this stage's output folder.
5. If approval is needed, create an approval request.

## Outputs

- output/result.md
- output/audit.json
- optional output/approval-request.json

## Verify

- Output matches mission and safety policy.
- Claims have source notes or are marked for verification.
- No red/orange action is performed without approval.
