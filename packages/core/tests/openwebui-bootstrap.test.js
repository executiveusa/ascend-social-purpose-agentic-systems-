import { describe, expect, it } from 'vitest';
import { buildOpenWebuiBootstrap, validateOpenWebuiBootstrap } from '../src/openwebui-bootstrap.js';

describe('openwebui bootstrap', () => {
  it('builds a bootstrap config that disables signup and connects only to LiteLLM', () => {
    const bootstrap = buildOpenWebuiBootstrap({ tenantId: 'demo-pnw' });
    expect(bootstrap.enableSignup).toBe(false);
    expect(bootstrap.litellmApiBase).toBe('http://litellm:4000');
  });

  it('validates a well-formed bootstrap config', () => {
    const bootstrap = buildOpenWebuiBootstrap({ tenantId: 'demo-pnw' });
    const result = validateOpenWebuiBootstrap(bootstrap);
    expect(result.valid).toBe(true);
  });

  it('rejects a bootstrap config pointing directly at a third-party provider', () => {
    const bootstrap = buildOpenWebuiBootstrap({ tenantId: 'demo-pnw', litellmApiBase: 'https://api.openai.com' });
    const result = validateOpenWebuiBootstrap(bootstrap);
    expect(result.valid).toBe(false);
  });

  it('rejects a bootstrap config with signup enabled', () => {
    const bootstrap = buildOpenWebuiBootstrap({ tenantId: 'demo-pnw' });
    bootstrap.enableSignup = true;
    const result = validateOpenWebuiBootstrap(bootstrap);
    expect(result.valid).toBe(false);
  });
});
