import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const siteRoot = path.resolve(__dirname, '..');

// Phase 5: every required internal ops route must exist as a page, and every
// required server-side data source must exist as a route handler.
const requiredPages = [
  'app/ops/page.jsx',
  'app/ops/agents/page.jsx',
  'app/ops/agents/[id]/page.jsx',
  'app/ops/artifacts/page.jsx',
  'app/ops/events/page.jsx',
  'app/ops/budgets/page.jsx',
  'app/ops/health/page.jsx',
  'app/ops/deployments/page.jsx',
  'app/ops/openwebui/page.jsx'
];

const requiredApiRoutes = [
  'app/api/ops/dashboard-state/route.js',
  'app/api/ops/events/route.js',
  'app/api/ops/artifacts/route.js',
  'app/api/ops/managed-agents/route.js',
  'app/api/ops/managed-agents/[id]/route.js',
  'app/api/ops/budgets/route.js',
  'app/api/ops/model-usage-summary/route.js',
  'app/api/ops/traces/route.js'
];

describe('Phase 5 ops route existence', () => {
  for (const page of requiredPages) {
    it(`page exists: ${page}`, () => {
      expect(fs.existsSync(path.join(siteRoot, page))).toBe(true);
    });
  }

  for (const route of requiredApiRoutes) {
    it(`api route exists: ${route}`, () => {
      expect(fs.existsSync(path.join(siteRoot, route))).toBe(true);
    });
  }
});

describe('Phase 5 does not touch public frontend routes', () => {
  it('public homepage route is unchanged in place', () => {
    expect(fs.existsSync(path.join(siteRoot, 'app/page.jsx'))).toBe(true);
  });

  it('no public route group was added outside ops/api-ops/login', () => {
    const appDirs = fs.readdirSync(path.join(siteRoot, 'app'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(appDirs.sort()).toEqual(['api', 'llms.txt', 'login', 'ops'].sort());
  });
});
