import { describe, expect, it } from 'vitest';
import { classifyAction, requiresApproval, assertTenantBoundary } from '../src/safety.js';

describe('safety policy', () => {
  it('routes youth and grant submission to red approval', () => {
    expect(classifyAction('submit grant with youth records')).toBe('red');
    expect(requiresApproval('submit grant with youth records')).toBe(true);
  });
  it('blocks tenant path traversal', () => {
    expect(() => assertTenantBoundary('asc3nd', '../secrets')).toThrow();
  });
});
