import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const siteRoot = path.resolve(__dirname, '..');

// Files that ship to the browser: anything marked 'use client', plus the
// shared client-side fetch helper. None of these may reference an operator
// API key literal, an OPERATOR_KEY env var, or the operator-key validation
// module — operator auth must stay entirely server-side.
function collectClientFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectClientFiles(full, acc);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.startsWith("'use client'") || content.startsWith('"use client"') || full.endsWith(path.join('lib', 'opsApi.js'))) {
        acc.push({ file: full, content });
      }
    }
  }
  return acc;
}

describe('Phase 5 client-code security', () => {
  const clientFiles = collectClientFiles(path.join(siteRoot, 'app'))
    .concat(collectClientFiles(path.join(siteRoot, 'components')))
    .concat(collectClientFiles(path.join(siteRoot, 'lib')));

  it('found at least one client file to scan', () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  const forbiddenPatterns = [
    /ok_[a-zA-Z0-9-]+_[0-9a-f]{16,}/, // operator key literal shape
    /OPERATOR_KEY/,
    /operator-key/i,
    /validateOperatorKey/
  ];

  for (const { file, content } of clientFiles) {
    const rel = path.relative(siteRoot, file);
    it(`no operator key material in ${rel}`, () => {
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    });
  }
});
