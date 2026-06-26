import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ensureIcmWorkspace, runIcmStage, readStageContext, safeStagePath, validateStageName } from '../src/icm.js';

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-test-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('ICM runner hardening', () => {
  it('validates tenant paths and refuses path traversal in stage names', () => {
    expect(() => validateStageName('../escape')).toThrow(/Invalid stage name/);
    expect(() => validateStageName('02_opportunity_scan')).not.toThrow();
  });

  it('safeStagePath refuses traversal via filename', () => {
    ensureIcmWorkspace({ base: tmp, tenantId: 'asc3nd' });
    expect(() => safeStagePath(tmp, 'asc3nd', '02_opportunity_scan', '../../../etc/passwd')).toThrow(/traversal|Unsafe path/);
  });

  it('refuses tenant path traversal via tenantId', () => {
    expect(() => ensureIcmWorkspace({ base: tmp, tenantId: '../escape' })).toThrow(/Invalid tenant id|Unsafe path/);
  });

  it('reads Layer 0-4 context for a stage', () => {
    ensureIcmWorkspace({ base: tmp, tenantId: 'asc3nd' });
    const ctx = readStageContext({ base: tmp, tenantId: 'asc3nd', stage: '02_opportunity_scan' });
    expect(ctx.agent).toContain('Mission Agent');
    expect(ctx.workspace).toContain('Workspace Routing');
    expect(ctx.stageContext).toContain('02_opportunity_scan');
    expect(ctx.config.length).toBeGreaterThan(0);
  });

  it('writes result.md, audit.json, and optional approval-request.json', () => {
    ensureIcmWorkspace({ base: tmp, tenantId: 'asc3nd' });
    const artifacts = [];
    const result = runIcmStage({
      base: tmp,
      tenantId: 'asc3nd',
      stage: '03_grant_application',
      result: '# Draft grant\n\nEligibility confirmed.',
      audit: { riskClass: 'red' },
      approvalRequest: { risk: 'red', title: 'Submit grant', summary: 'King County RFP' },
      onArtifact: (a) => artifacts.push(a)
    });
    expect(fs.existsSync(path.join(result.outDir, 'result.md'))).toBe(true);
    expect(fs.existsSync(path.join(result.outDir, 'audit.json'))).toBe(true);
    expect(fs.existsSync(path.join(result.outDir, 'approval-request.json'))).toBe(true);
    expect(artifacts).toHaveLength(3);
    expect(artifacts.every((a) => a.tenantId === 'asc3nd')).toBe(true);
  });

  it('never loads unrelated tenant files', () => {
    ensureIcmWorkspace({ base: tmp, tenantId: 'asc3nd' });
    ensureIcmWorkspace({ base: tmp, tenantId: 'other-tenant' });
    // Plant a file in other-tenant's stage.
    const otherFile = path.join(tmp, 'tenants', 'other-tenant', 'stages', '02_opportunity_scan', 'output', 'result.md');
    fs.mkdirSync(path.dirname(otherFile), { recursive: true });
    fs.writeFileSync(otherFile, 'secret other tenant data', 'utf8');
    const ctx = readStageContext({ base: tmp, tenantId: 'asc3nd', stage: '02_opportunity_scan' });
    const allText = JSON.stringify(ctx);
    expect(allText).not.toContain('secret other tenant data');
  });

  it('indexes artifact metadata via onArtifact callback', () => {
    ensureIcmWorkspace({ base: tmp, tenantId: 'asc3nd' });
    const indexed = [];
    runIcmStage({ base: tmp, tenantId: 'asc3nd', stage: '02_opportunity_scan', result: 'scan done', onArtifact: (a) => indexed.push(a) });
    expect(indexed.length).toBeGreaterThanOrEqual(2);
    expect(indexed.every((a) => a.id && a.stage && a.filename && a.path && a.createdAt)).toBe(true);
  });
});
