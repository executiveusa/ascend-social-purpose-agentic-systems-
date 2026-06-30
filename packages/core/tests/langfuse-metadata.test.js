import { describe, expect, it } from 'vitest';
import { buildLangfuseTraceMetadata } from '../src/langfuse-metadata.js';

describe('langfuse metadata', () => {
  it('builds required trace tag fields', () => {
    const { metadata } = buildLangfuseTraceMetadata({ tenantId: 'demo-pnw', surface: 'mission-os', workflowKind: 'grant-draft' });
    expect(metadata.tenant_id).toBe('demo-pnw');
    expect(metadata.surface).toBe('mission-os');
    expect(metadata.workflow_kind).toBe('grant-draft');
  });

  it('redacts sensitive extra fields and does not include raw prompts', () => {
    const { metadata, redacted } = buildLangfuseTraceMetadata({
      tenantId: 'demo-pnw',
      surface: 'mission-os',
      extra: { prompt: 'sensitive donor data', apiKey: 'sk-secret', label: 'safe-value' }
    });
    expect(redacted).toContain('prompt');
    expect(redacted).toContain('apiKey');
    expect(metadata.prompt).toBeUndefined();
    expect(metadata.apiKey).toBeUndefined();
    expect(metadata.label).toBe('safe-value');
  });

  it('throws without tenantId or surface', () => {
    expect(() => buildLangfuseTraceMetadata({ surface: 'mission-os' })).toThrow();
    expect(() => buildLangfuseTraceMetadata({ tenantId: 'demo-pnw' })).toThrow();
  });
});
