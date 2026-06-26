# Hostinger VPS Deployment

## 1. Prepare VPS

Use Ubuntu. Run the agentic coding flywheel first if this is a build/maintenance VPS:

```bash
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/agentic_coding_flywheel_setup/main/install.sh?$(date +%s)" | bash -s -- --yes --mode vibe
```

## 2. Upload repo

```bash
mkdir -p /data/projects
cd /data/projects
git clone <your-repo-url> asc3nd-social-purpose-os
cd asc3nd-social-purpose-os
cp .env.example .env
nano .env
```

## 3. Launch

```bash
bash scripts/bootstrap-vps.sh
```

## 4. Configure DNS

Point the client domain to the VPS. Use a reverse proxy or the included nginx service.

## 5. Tenant deployment pattern

For a new client:

1. Create tenant ID.
2. Clone public frontend theme/copy.
3. Save onboarding profile.
4. Generate ICM workspace.
5. Verify llms.txt, sitemap, robots, and schema.
6. Connect integrations only after signed approval.
