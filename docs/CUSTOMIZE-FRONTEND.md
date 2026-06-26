# Customizing the Frontend for a New Client

Backend remains shared. Customize these files:

- `apps/site/app/page.jsx` public copy and sections.
- `apps/site/app/globals.css` theme variables.
- `apps/site/public/llms.txt` AI-readable summary.
- `apps/site/app/llms.txt/route.js` dynamic AI-readable route.
- Tenant onboarding profile through `/ops/onboarding`.
- Tenant ICM files under `icm/tenants/<tenant>/_config`.

Do not fork backend logic unless the change benefits all tenants.
