import { describe, expect, it } from 'vitest';
import { cleanTenantSlug, createPublicKey, defaultTenantProfile, tenantFrontendConfig } from '../src/tenant.js';

describe('tenant provisioning helpers', () => {
  it('cleans tenant slugs', () => expect(cleanTenantSlug('Northwest Youth!!')).toBe('northwest-youth'));
  it('creates frontend config', () => {
    const profile = defaultTenantProfile({ tenantId: 'abc', orgName: 'ABC' });
    const config = tenantFrontendConfig(profile, { publicKey: createPublicKey('abc'), apiBaseUrl: 'http://api' });
    expect(config.tenant).toBe('abc');
    expect(config.publicApiKey).toMatch(/^pk_mission_/);
  });
});
