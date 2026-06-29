import { describe, expect, it } from 'vitest';
import { assertTenantScope, filterTenantRecords, assertNoTraversal, safeTenantPath } from '../src/tenant-isolation.js';
import path from 'node:path';

describe('tenant isolation helpers', () => {
  it('assertTenantScope validates and throws on mismatch', () => {
    expect(() => assertTenantScope({ actorTenantId: 'tenant-a', targetTenantId: 'tenant-a' })).not.toThrow();
    expect(() => assertTenantScope({ actorTenantId: 'tenant-a', targetTenantId: 'tenant-b' })).toThrow(/Tenant boundary violation/);
  });

  it('filterTenantRecords filters list correctly', () => {
    const list = [
      { tenantId: 'tenant-a', name: 'rec1' },
      { tenantId: 'tenant-b', name: 'rec2' },
      { tenantId: 'tenant-a', name: 'rec3' }
    ];
    const filtered = filterTenantRecords({ tenantId: 'tenant-a', records: list });
    expect(filtered.length).toBe(2);
    expect(filtered.map(x => x.name)).toEqual(['rec1', 'rec3']);
  });

  it('assertNoTraversal throws on traversal patterns', () => {
    expect(() => assertNoTraversal('safe/file.txt')).not.toThrow();
    expect(() => assertNoTraversal('../unsafe/file.txt')).toThrow(/Directory traversal/);
    expect(() => assertNoTraversal('/absolute/path')).toThrow(/Directory traversal/);
  });

  it('safeTenantPath resolves path correctly within tenant boundary', () => {
    const p = safeTenantPath({
      tenantId: 'tenant-a',
      relativePath: 'reports/july.pdf',
      baseDataDir: '/data'
    });
    // cross-platform check
    expect(p.replace(/\\/g, '/')).toContain('/data/tenant-a/reports/july.pdf');

    expect(() => safeTenantPath({
      tenantId: 'tenant-a',
      relativePath: '../../etc/passwd',
      baseDataDir: '/data'
    })).toThrow(/Directory traversal/);
  });
});
