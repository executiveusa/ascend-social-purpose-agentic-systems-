# AdamsReview Final Pass

This repository includes `scripts/adamsreview-lite.mjs`, a local release gate modeled after the public `adamjgmiller/adamsreview` approach: multi-lens review, validation gates, persistent JSON artifact, and fix-oriented findings.

Run:

```bash
npm run adamsreview
```

Output:

```text
reviews/adamsreview/artifact.json
reviews/adamsreview/FINAL-REVIEW.md
```

This local script does not replace the full Claude Code plugin. It gives the release a committed review artifact and catches missing handoff, bridge, CRM, safety, ICM, and repeatability pieces before packaging.
