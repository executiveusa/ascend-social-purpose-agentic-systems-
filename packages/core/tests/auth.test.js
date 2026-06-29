import { describe, expect, it, beforeEach } from 'vitest';
import { hashSecret, createUser, createInvite, acceptInvite, createSession, validateSession, revokeSession, createOperatorKey, validateOperatorKey } from '../src/auth.js';
import { createRepositories } from '../../db/src/index.js';

describe('auth module core', () => {
  beforeEach(() => {
    process.env.MISSION_STORAGE = 'memory';
    createRepositories({ forceNew: true });
  });

  it('hashSecret hashes raw secret correctly', () => {
    const hash = hashSecret('super-secret');
    expect(hash).toHaveLength(64); // SHA-256 is 64 hex characters
    expect(hashSecret('super-secret')).toBe(hash);
    expect(hashSecret('')).toBe('');
  });

  it('createUser registers new user and creates membership', () => {
    const u = createUser({
      tenantId: 'asc3nd',
      email: 'ed@asc3nd.org',
      name: 'ED Name',
      passwordHash: hashSecret('password'),
      role: 'owner'
    });

    expect(u.id).toBeDefined();
    expect(u.email).toBe('ed@asc3nd.org');
    expect(u.role).toBe('owner');

    // Trying to recreate same email throws
    expect(() => createUser({
      tenantId: 'asc3nd',
      email: 'ed@asc3nd.org'
    })).toThrow(/already exists/);
  });

  it('invitation lifecycle: create, accept, and expire', () => {
    const invited = createInvite({
      tenantId: 'asc3nd',
      email: 'invitee@test.org',
      role: 'grants',
      invitedBy: 'usr_ed'
    });

    expect(invited.invite.id).toBeDefined();
    expect(invited.rawToken).toHaveLength(64);
    expect(invited.invite.tokenHash).toBe(hashSecret(invited.rawToken));

    // Accept invite
    const user = { id: 'usr_new_grantee' };
    const membership = acceptInvite({
      inviteToken: invited.rawToken,
      tenantId: 'asc3nd',
      userId: user.id
    });

    expect(membership.userId).toBe(user.id);
    expect(membership.role).toBe('grants');

    // Invitation should be consumed and removed, trying to accept again should throw
    expect(() => acceptInvite({
      inviteToken: invited.rawToken,
      tenantId: 'asc3nd',
      userId: user.id
    })).toThrow(/not found or invalid/);

    // Invitation expiration check
    const expiredInv = createInvite({
      tenantId: 'asc3nd',
      email: 'expired@test.org',
      role: 'grants',
      invitedBy: 'usr_ed',
      expiresAt: new Date(Date.now() - 1000).toISOString() // in the past
    });

    expect(() => acceptInvite({
      inviteToken: expiredInv.rawToken,
      tenantId: 'asc3nd',
      userId: 'usr_expired'
    })).toThrow(/expired/);
  });

  it('sessions lifecycle: create, validate, and revoke', () => {
    const sessResult = createSession({
      userId: 'usr_ed',
      tenantId: 'asc3nd',
      ttlSeconds: 60
    });

    expect(sessResult.session.userId).toBe('usr_ed');
    expect(sessResult.rawToken).toHaveLength(64);

    // Validate valid session
    const validated = validateSession({
      sessionToken: sessResult.rawToken,
      tenantId: 'asc3nd'
    });
    expect(validated.userId).toBe('usr_ed');

    // Revoke session
    revokeSession({
      sessionToken: sessResult.rawToken,
      tenantId: 'asc3nd'
    });

    // Validating revoked session throws
    expect(() => validateSession({
      sessionToken: sessResult.rawToken,
      tenantId: 'asc3nd'
    })).toThrow(/Session not found/);
  });

  it('operator key lifecycle: create and validate', () => {
    const keyResult = createOperatorKey({
      tenantId: 'asc3nd',
      label: 'local-test-key',
      scopes: ['operator']
    });

    expect(keyResult.operatorKey.label).toBe('local-test-key');
    expect(keyResult.rawKey).toBeDefined();

    // Validate key
    const validated = validateOperatorKey({
      key: keyResult.rawKey,
      tenantId: 'asc3nd',
      requiredScope: 'operator'
    });
    expect(validated.id).toBe(keyResult.operatorKey.id);

    // Throws on scope mismatch
    expect(() => validateOperatorKey({
      key: keyResult.rawKey,
      tenantId: 'asc3nd',
      requiredScope: 'super-admin'
    })).toThrow(/Missing required scope/);

    // Throws on invalid key
    expect(() => validateOperatorKey({
      key: 'invalid-key',
      tenantId: 'asc3nd'
    })).toThrow(/Invalid operator key/);
  });
});
