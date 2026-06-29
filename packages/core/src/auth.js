import crypto from 'node:crypto';
import { createRepositories } from '../../db/src/index.js';

const getRepos = () => createRepositories();

export function hashSecret(secret) {
  if (!secret) return '';
  return crypto.createHash('sha256').update(String(secret)).digest('hex');
}

export function createUser({ tenantId, email, name, passwordHash, role = 'readonly' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!email) throw new Error('email is required');

  const repos = getRepos();
  const users = repos.users ? repos.users.list(tenantId) : [];
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error(`User with email ${email} already exists`);
  }

  const user = {
    id: `usr_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    email: email.toLowerCase(),
    name: name || '',
    passwordHash: passwordHash || '',
    role,
    createdAt: new Date().toISOString()
  };

  repos.users.add(tenantId, user);
  return user;
}

export function createMembership({ tenantId, userId, role }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!userId) throw new Error('userId is required');

  const repos = getRepos();
  const membership = {
    id: `mbr_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    userId,
    role,
    createdAt: new Date().toISOString()
  };
  repos.memberships.add(tenantId, membership);
  return membership;
}

export function createInvite({ tenantId, email, role, invitedBy, expiresAt }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!email) throw new Error('email is required');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSecret(rawToken);

  const invite = {
    id: `inv_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    email: email.toLowerCase(),
    role,
    tokenHash,
    invitedBy,
    expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  const repos = getRepos();
  repos.invites.add(tenantId, invite);

  return { invite, rawToken };
}

export function acceptInvite({ inviteToken, tenantId, userId }) {
  if (!inviteToken) throw new Error('inviteToken is required');
  const tokenHash = hashSecret(inviteToken);
  const repos = getRepos();

  const invite = repos.invites.findByHash(tenantId, tokenHash);
  if (!invite) {
    throw new Error('Invite not found or invalid');
  }

  if (new Date(invite.expiresAt) < new Date()) {
    throw new Error('Invite has expired');
  }

  const membership = createMembership({
    tenantId: invite.tenantId,
    userId,
    role: invite.role
  });

  repos.invites.remove(invite.tenantId, invite.id);

  return membership;
}

export function createSession({ userId, tenantId, ttlSeconds = 3600 }) {
  if (!userId) throw new Error('userId is required');
  if (!tenantId) throw new Error('tenantId is required');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const sessionTokenHash = hashSecret(rawToken);

  const session = {
    id: `ses_${crypto.randomBytes(12).toString('hex')}`,
    userId,
    tenantId,
    sessionTokenHash,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  const repos = getRepos();
  repos.sessions.add(tenantId, session);

  return { session, rawToken };
}

export function validateSession({ sessionToken, tenantId }) {
  if (!sessionToken) throw new Error('sessionToken is required');
  const sessionTokenHash = hashSecret(sessionToken);
  const repos = getRepos();

  const session = repos.sessions.findByHash(tenantId, sessionTokenHash);
  if (!session) {
    throw new Error('Session not found or invalid');
  }

  if (new Date(session.expiresAt) < new Date()) {
    repos.sessions.remove(session.tenantId, session.id);
    throw new Error('Session has expired');
  }

  return session;
}

export function revokeSession({ sessionToken, tenantId }) {
  if (!sessionToken) throw new Error('sessionToken is required');
  const sessionTokenHash = hashSecret(sessionToken);
  const repos = getRepos();

  const session = repos.sessions.findByHash(tenantId, sessionTokenHash);
  if (session) {
    repos.sessions.remove(session.tenantId, session.id);
  }
  return true;
}

export function createOperatorKey({ tenantId, label, scopes = ['operator'], createdBy = 'system' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!label) throw new Error('label is required');

  const rawKey = `ok_${tenantId}_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = hashSecret(rawKey);

  const operatorKey = {
    id: `opk_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    label,
    scopes,
    keyHash,
    createdBy,
    createdAt: new Date().toISOString()
  };

  const repos = getRepos();
  repos.operatorKeys.add(tenantId, operatorKey);

  import('./events.js').then(({ emitEvent }) => {
    emitEvent({
      tenantId,
      type: 'OPERATOR_KEY.CREATED',
      actor: createdBy,
      subject: operatorKey.id,
      payload: { label, scopes }
    });
  }).catch(() => {});

  return { operatorKey, rawKey };
}

export function validateOperatorKey({ key, tenantId, requiredScope }) {
  if (!key) throw new Error('key is required');
  const keyHash = hashSecret(key);
  const repos = getRepos();

  const opKey = repos.operatorKeys.findByHash(tenantId, keyHash);
  if (!opKey) {
    throw new Error('Invalid operator key');
  }

  if (requiredScope && !opKey.scopes.includes(requiredScope)) {
    throw new Error(`Missing required scope: ${requiredScope}`);
  }

  return opKey;
}
