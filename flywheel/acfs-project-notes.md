# ACFS Project Notes

Recommended VPS loop:

```bash
cd /data/projects/asc3nd-social-purpose-os
npm test
npm run dev
# agent edits in small tasks
bash scripts/deploy-hostinger.sh
```

Do not give coding agents unrestricted production credentials. Use dry-run mode until tests and approvals pass.
