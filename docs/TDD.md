# Test-Driven Development Plan

## Critical tests before every backend change

```bash
npm test
```

Coverage targets:

- Safety classification: red/orange/yellow/green routing.
- Tenant boundary enforcement: no path escape.
- Opportunity scoring: Seattle/youth/sports fit appears at top.
- Model routing: cheap tasks do not hit expensive models.
- LLM importer: JSON and markdown normalize into notes.
- ICM generation: all stages created with CONTEXT.md, references, output.

## Smoke tests

```bash
npm run dev
npm run smoke
```

## Flywheel loop

1. Write/update test.
2. Implement in `packages/core` first.
3. Wire to `services/mission-api`.
4. Expose in `apps/site`.
5. Run unit and smoke tests.
6. Update docs and ICM template.
