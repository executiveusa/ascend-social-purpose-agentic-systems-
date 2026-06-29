import { describe, expect, it, beforeEach } from 'vitest';
import { createRepositories, storageMode, assertProductionStorage } from '../src/index.js';

describe('repository layer', () => {
  beforeEach(() => {
    process.env.MISSION_STORAGE = 'memory';
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('resolves storage mode', () => {
    process.env.MISSION_STORAGE = 'json';
    expect(storageMode()).toBe('json');
    process.env.MISSION_STORAGE = 'memory';
    expect(storageMode()).toBe('memory');
    process.env.MISSION_STORAGE = '';
    delete process.env.MISSION_STORAGE;
    process.env.DATABASE_URL = 'postgres://x';
    process.env.STORAGE_MODE = 'postgres';
    expect(storageMode()).toBe('postgres');
  });

  it('persists and retrieves contacts via memory backend', () => {
    const repos = createRepositories();
    repos.contacts.save('asc3nd', [{ id: 'person_1', displayName: 'Test', email: 't@example.org' }]);
    const list = repos.contacts.list('asc3nd');
    expect(list).toHaveLength(1);
    expect(list[0].email).toBe('t@example.org');
  });

  it('upserts a contact without duplicating', () => {
    const repos = createRepositories();
    const rows = [];
    const updated = repos.contacts.upsert('asc3nd', rows, { id: 'person_1', displayName: 'A' });
    expect(updated).toHaveLength(1);
    const again = repos.contacts.upsert('asc3nd', updated, { id: 'person_1', displayName: 'B' });
    expect(again).toHaveLength(1);
    expect(again[0].displayName).toBe('B');
  });

  it('appends audit events', () => {
    const repos = createRepositories();
    repos.audit.append('asc3nd', { id: 'a1', event: 'test', payload: {}, createdAt: new Date().toISOString() });
    const events = repos.audit.list('asc3nd');
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('test');
  });

  it('stores tenant profile and keys', () => {
    const repos = createRepositories();
    repos.tenant.writeProfile('asc3nd', { tenantId: 'asc3nd', orgName: 'Asc3nd' });
    repos.tenant.writeKeys('asc3nd', { publicKey: 'pk_1', secretKeyHash: 'h', allowedOrigins: ['https://asc3nd.org'] });
    expect(repos.tenant.readProfile('asc3nd').orgName).toBe('Asc3nd');
    expect(repos.tenant.readKeys('asc3nd').publicKey).toBe('pk_1');
  });

  it('production refuses JSON storage', () => {
    process.env.NODE_ENV = 'production';
    process.env.MISSION_STORAGE = 'json';
    expect(() => assertProductionStorage()).toThrow(/refuses JSON storage/);
    process.env.MISSION_STORAGE = 'memory';
    expect(() => assertProductionStorage()).not.toThrow();
    delete process.env.NODE_ENV;
  });

  it('manages users, memberships, invites, sessions, and operator keys', () => {
    const repos = createRepositories();
    const t = 'demo-tenant';

    // Users
    repos.users.save(t, [{ id: 'u1', tenantId: t, email: 'u1@test.com', role: 'operator', createdAt: new Date().toISOString() }]);
    const users = repos.users.list(t);
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('u1@test.com');

    repos.users.add(t, { id: 'u2', tenantId: t, email: 'u2@test.com', role: 'readonly', createdAt: new Date().toISOString() });
    expect(repos.users.list(t)).toHaveLength(2);

    // Memberships
    repos.memberships.save(t, [{ id: 'm1', tenantId: t, userId: 'u1', role: 'operator', createdAt: new Date().toISOString() }]);
    expect(repos.memberships.list(t)).toHaveLength(1);

    // Invites
    repos.invites.save(t, [{ id: 'i1', tenantId: t, email: 'i1@test.com', role: 'grants', tokenHash: 'h1', invitedBy: 'u1', expiresAt: new Date().toISOString(), createdAt: new Date().toISOString() }]);
    expect(repos.invites.list(t)).toHaveLength(1);
    expect(repos.invites.findByHash(t, 'h1')).not.toBeNull();
    repos.invites.remove(t, 'i1');
    expect(repos.invites.list(t)).toHaveLength(0);

    // Sessions
    repos.sessions.save(t, [{ id: 's1', tenantId: t, userId: 'u1', sessionTokenHash: 'sh1', expiresAt: new Date().toISOString(), createdAt: new Date().toISOString() }]);
    expect(repos.sessions.list(t)).toHaveLength(1);
    expect(repos.sessions.findByHash(t, 'sh1')).not.toBeNull();

    // Operator Keys
    repos.operatorKeys.save(t, [{ id: 'ok1', tenantId: t, label: 'test-key', scopes: ['operator'], keyHash: 'kh1', createdBy: 'u1', createdAt: new Date().toISOString() }]);
    expect(repos.operatorKeys.list(t)).toHaveLength(1);
    expect(repos.operatorKeys.findByHash(t, 'kh1')).not.toBeNull();
  });
});
