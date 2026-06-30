import { describe, expect, it } from 'vitest';
import { buildLiteLlmConfig, validateLiteLlmConfig } from '../src/litellm-config.js';

describe('litellm config', () => {
  it('builds a config with default surfaces and no raw keys', () => {
    const config = buildLiteLlmConfig({ tenantId: 'demo-pnw' });
    expect(config.tenantId).toBe('demo-pnw');
    expect(config.surfaces.length).toBeGreaterThan(0);
    expect(JSON.stringify(config)).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
  });

  it('references provider keys via env var names only', () => {
    const config = buildLiteLlmConfig({ tenantId: 'demo-pnw' });
    const standard = config.modelList.find((m) => m.modelName === 'standard');
    expect(standard.apiKeyEnvVar).toBe('LITELLM_OPENAI_API_KEY');
  });

  it('validates a well-formed config', () => {
    const config = buildLiteLlmConfig({ tenantId: 'demo-pnw' });
    const result = validateLiteLlmConfig(config);
    expect(result.valid).toBe(true);
  });

  it('rejects a config missing required fields', () => {
    const result = validateLiteLlmConfig({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('flags a config containing a raw provider key', () => {
    const config = buildLiteLlmConfig({ tenantId: 'demo-pnw' });
    config.leaked = 'sk-1234567890abcdef';
    const result = validateLiteLlmConfig(config);
    expect(result.valid).toBe(false);
  });
});
