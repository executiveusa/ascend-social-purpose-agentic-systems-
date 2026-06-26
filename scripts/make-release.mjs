import { execSync } from 'node:child_process';
const name = 'asc3nd-social-purpose-os-v0.5-production-handoff.zip';
execSync(`rm -f ${name}`);
execSync(`zip -qr ${name} . -x "node_modules/*" "*/node_modules/*" "mission-data/*" "backups/*" ".git/*" ".next/*" "*/.next/*" "*.log" "*.tmp" "playwright-report/*" "test-results/*"`);
console.log(name);
