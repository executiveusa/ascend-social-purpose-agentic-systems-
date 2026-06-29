import fs from 'node:fs';
import path from 'node:path';

export function storageMode() {
  if (process.env.MISSION_STORAGE === 'json') return 'json';
  if (process.env.MISSION_STORAGE === 'memory') return 'memory';
  if (process.env.DATABASE_URL && process.env.STORAGE_MODE === 'postgres') return 'postgres';
  if (process.env.DATABASE_URL) return 'postgres';
  return 'json';
}

export function assertProductionStorage() {
  if (process.env.NODE_ENV !== 'production') return;
  const mode = storageMode();
  if (mode === 'json') {
    throw new Error('Production refuses JSON storage. Set DATABASE_URL and STORAGE_MODE=postgres.');
  }
}

let cachedRepos = null;

export function clearRepositoryCache() {
  cachedRepos = null;
}

export function createRepositories({ baseDir, pool, forceNew = false } = {}) {
  if (forceNew) {
    cachedRepos = null;
  }
  const mode = storageMode();
  if (mode === 'postgres') {
    return createPostgresRepos(pool);
  }
  if (cachedRepos && cachedRepos.mode === mode) {
    return cachedRepos;
  }
  if (mode === 'memory') {
    cachedRepos = createMemoryRepos();
    return cachedRepos;
  }
  cachedRepos = createJsonRepos(baseDir || path.resolve(process.cwd(), 'mission-data'));
  return cachedRepos;
}

// ---- JSON backend (dev/test) ----
function createJsonRepos(baseDir) {
  fs.mkdirSync(baseDir, { recursive: true });
  const tenantDir = (tenantId) => {
    const dir = path.join(baseDir, tenantId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };
  const read = (tenantId, name, fallback) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(tenantDir(tenantId), `${name}.json`), 'utf8'));
    } catch {
      return fallback;
    }
  };
  const write = (tenantId, name, data) => {
    fs.writeFileSync(path.join(tenantDir(tenantId), `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
  };
  return makeRepoBundle({
    listContacts: (t) => read(t, 'contacts', []),
    saveContacts: (t, rows) => write(t, 'contacts', rows),
    listInteractions: (t) => read(t, 'interactions', []),
    saveInteractions: (t, rows) => write(t, 'interactions', rows),
    listPipelineItems: (t) => read(t, 'pipeline-items', []),
    savePipelineItems: (t, rows) => write(t, 'pipeline-items', rows),
    listTasks: (t) => read(t, 'tasks', []),
    saveTasks: (t, rows) => write(t, 'tasks', rows),
    listApprovals: (t) => read(t, 'approvals', []),
    saveApprovals: (t, rows) => write(t, 'approvals', rows),
    listOutbox: (t) => read(t, 'outbox', []),
    saveOutbox: (t, rows) => write(t, 'outbox', rows),
    listAudit: (t) => read(t, 'audit', []),
    appendAudit: (t, event) => {
      const rows = read(t, 'audit', []);
      rows.unshift(event);
      write(t, 'audit', rows.slice(0, 1000));
    },
    readTenantProfile: (t) => read(t, 'profile', null),
    writeTenantProfile: (t, p) => write(t, 'profile', p),
    readTenantKeys: (t) => read(t, 'keys', null),
    writeTenantKeys: (t, k) => write(t, 'keys', k),
    // P2 extensions
    listUsers: (t) => read(t, 'users', []),
    saveUsers: (t, rows) => write(t, 'users', rows),
    listMemberships: (t) => read(t, 'memberships', []),
    saveMemberships: (t, rows) => write(t, 'memberships', rows),
    listInvites: (t) => read(t, 'invites', []),
    saveInvites: (t, rows) => write(t, 'invites', rows),
    listSessions: (t) => read(t, 'sessions', []),
    saveSessions: (t, rows) => write(t, 'sessions', rows),
    listOperatorKeys: (t) => read(t, 'operator-keys', []),
    saveOperatorKeys: (t, rows) => write(t, 'operator-keys', rows),
    listEvents: (t, type, limit) => {
      const file = path.join(tenantDir(t), 'events.jsonl');
      if (!fs.existsSync(file)) return [];
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
      let list = lines.map(line => JSON.parse(line));
      if (type) list = list.filter(e => e.type === type);
      if (limit) list = list.slice(-limit);
      return list;
    },
    appendEvent: (t, event) => {
      const file = path.join(tenantDir(t), 'events.jsonl');
      fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
    },
    listArtifacts: (t, kind) => {
      const list = read(t, 'artifacts', []);
      return kind ? list.filter(a => a.kind === kind) : list;
    },
    saveArtifacts: (t, rows) => write(t, 'artifacts', rows),
    listManagedAgents: (t) => read(t, 'managed-agents', []),
    saveManagedAgents: (t, rows) => write(t, 'managed-agents', rows),
    listAgentHealth: (t) => read(t, 'managed-agent-health', []),
    saveAgentHealth: (t, rows) => write(t, 'managed-agent-health', rows)
  });
}

// ---- Memory backend ----
function createMemoryRepos() {
  const store = new Map();
  const bucket = (t, name) => {
    const key = `${t}:${name}`;
    if (!store.has(key)) store.set(key, []);
    return store.get(key);
  };
  const single = (t, name) => {
    const key = `${t}:single:${name}`;
    return store.get(key) || null;
  };
  return makeRepoBundle({
    listContacts: (t) => bucket(t, 'contacts'),
    saveContacts: (t, rows) => store.set(`${t}:contacts`, rows),
    listInteractions: (t) => bucket(t, 'interactions'),
    saveInteractions: (t, rows) => store.set(`${t}:interactions`, rows),
    listPipelineItems: (t) => bucket(t, 'pipeline-items'),
    savePipelineItems: (t, rows) => store.set(`${t}:pipeline-items`, rows),
    listTasks: (t) => bucket(t, 'tasks'),
    saveTasks: (t, rows) => store.set(`${t}:tasks`, rows),
    listApprovals: (t) => bucket(t, 'approvals'),
    saveApprovals: (t, rows) => store.set(`${t}:approvals`, rows),
    listOutbox: (t) => bucket(t, 'outbox'),
    saveOutbox: (t, rows) => store.set(`${t}:outbox`, rows),
    listAudit: (t) => bucket(t, 'audit'),
    appendAudit: (t, event) => bucket(t, 'audit').unshift(event),
    readTenantProfile: (t) => single(t, 'profile'),
    writeTenantProfile: (t, p) => store.set(`${t}:single:profile`, p),
    readTenantKeys: (t) => single(t, 'keys'),
    writeTenantKeys: (t, k) => store.set(`${t}:single:keys`, k),
    // P2 extensions
    listUsers: (t) => bucket(t, 'users'),
    saveUsers: (t, rows) => store.set(`${t}:users`, rows),
    listMemberships: (t) => bucket(t, 'memberships'),
    saveMemberships: (t, rows) => store.set(`${t}:memberships`, rows),
    listInvites: (t) => bucket(t, 'invites'),
    saveInvites: (t, rows) => store.set(`${t}:invites`, rows),
    listSessions: (t) => bucket(t, 'sessions'),
    saveSessions: (t, rows) => store.set(`${t}:sessions`, rows),
    listOperatorKeys: (t) => bucket(t, 'operator-keys'),
    saveOperatorKeys: (t, rows) => store.set(`${t}:operator-keys`, rows),
    listEvents: (t, type, limit) => {
      let list = bucket(t, 'events');
      if (type) list = list.filter(e => e.type === type);
      if (limit) list = list.slice(-limit);
      return list;
    },
    appendEvent: (t, event) => bucket(t, 'events').push(event),
    listArtifacts: (t, kind) => {
      const list = bucket(t, 'artifacts');
      return kind ? list.filter(a => a.kind === kind) : list;
    },
    saveArtifacts: (t, rows) => store.set(`${t}:artifacts`, rows),
    listManagedAgents: (t) => bucket(t, 'managed-agents'),
    saveManagedAgents: (t, rows) => store.set(`${t}:managed-agents`, rows),
    listAgentHealth: (t) => bucket(t, 'managed-agent-health'),
    saveAgentHealth: (t, rows) => store.set(`${t}:managed-agent-health`, rows)
  });
}

// ---- Postgres backend ----
function createPostgresRepos(pool) {
  if (!pool) throw new Error('Postgres backend requires a pg Pool instance.');
  return makeRepoBundle({
    async listContacts(t) { const { rows } = await pool.query('SELECT * FROM contacts WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows; },
    async saveContacts(t, rows) {
      await pool.query('DELETE FROM contacts WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO contacts (id, tenant_id, display_name, email, phone, role, organization, tags, consent, source, notes, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [r.id, t, r.displayName, r.email, r.phone, r.role, r.organization, r.tags || [], r.consent || {}, r.source, r.notes, r.createdAt, r.updatedAt]);
      }
    },
    async listInteractions(t) { const { rows } = await pool.query('SELECT * FROM interactions WHERE tenant_id=$1 ORDER BY at DESC', [t]); return rows; },
    async saveInteractions(t, rows) {
      await pool.query('DELETE FROM interactions WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO interactions (id, tenant_id, contact_id, channel, direction, subject, body, source, metadata, at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [r.id, t, r.contactId, r.channel, r.direction, r.subject, r.body, r.source, r.metadata || {}, r.at]);
      }
    },
    async listPipelineItems(t) { const { rows } = await pool.query('SELECT * FROM pipeline_items WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows; },
    async savePipelineItems(t, rows) {
      await pool.query('DELETE FROM pipeline_items WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO pipeline_items (id, tenant_id, pipeline, stage, title, contact_id, source, metadata, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [r.id, t, r.pipeline, r.stage, r.title, r.contactId, r.source, r.metadata || {}, r.createdAt, r.updatedAt]);
      }
    },
    async listTasks(t) { const { rows } = await pool.query('SELECT * FROM tasks WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows; },
    async saveTasks(t, rows) {
      await pool.query('DELETE FROM tasks WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO tasks (id, tenant_id, title, type, contact_id, pipeline_item_id, due_at, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [r.id, t, r.title, r.type, r.contactId, r.pipelineItemId, r.dueAt, r.status, r.createdAt]);
      }
    },
    async listApprovals(t) { const { rows } = await pool.query('SELECT * FROM approvals WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows; },
    async saveApprovals(t, rows) {
      await pool.query('DELETE FROM approvals WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO approvals (id, tenant_id, status, risk, title, summary, payload, execution_policy, created_at, decided_at, decided_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [r.id, t, r.status, r.risk, r.title, r.summary, r.payload || {}, r.executionPolicy || {}, r.createdAt, r.decidedAt, r.decidedBy]);
      }
    },
    async listOutbox(t) { const { rows } = await pool.query('SELECT * FROM outbox_events WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows; },
    async saveOutbox(t, rows) {
      await pool.query('DELETE FROM outbox_events WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO outbox_events (id, tenant_id, type, adapter, approval_id, risk, payload, status, attempts, result, error, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [r.id, t, r.type, r.adapter, r.approvalId, r.risk, r.payload || {}, r.status, r.attempts || 0, r.result || {}, r.error, r.createdAt, r.updatedAt]);
      }
    },
    async listAudit(t) { const { rows } = await pool.query('SELECT * FROM audit_events WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1000', [t]); return rows; },
    async appendAudit(t, event) {
      await pool.query('INSERT INTO audit_events (id, tenant_id, actor_id, event, payload, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [event.id, t, event.actorId || null, event.event, event.payload || {}, event.createdAt || new Date().toISOString()]);
    },
    async readTenantProfile(t) { const { rows } = await pool.query('SELECT profile FROM tenants WHERE id=$1', [t]); return rows[0]?.profile || null; },
    async writeTenantProfile(t, p) { await pool.query('UPDATE tenants SET profile=$2, updated_at=now() WHERE id=$1', [t, p]); },
    async readTenantKeys(t) { const { rows } = await pool.query('SELECT * FROM tenant_keys WHERE tenant_id=$1', [t]); return rows[0] || null; },
    async writeTenantKeys(t, k) { await pool.query('INSERT INTO tenant_keys (tenant_id, public_key, secret_key_hash, allowed_origins, api_base_url, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (tenant_id) DO UPDATE SET public_key=$2, secret_key_hash=$3, allowed_origins=$4, api_base_url=$5', [t, k.publicKey, k.secretKeyHash, k.allowedOrigins || [], k.apiBaseUrl, k.createdAt || new Date().toISOString()]); },
    // P2 Extensions
    async listUsers(t) { const { rows } = await pool.query('SELECT * FROM users WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, email: r.email, role: r.role, createdAt: r.created_at })); },
    async saveUsers(t, rows) {
      await pool.query('DELETE FROM users WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO users (id, tenant_id, email, role, created_at) VALUES ($1,$2,$3,$4,$5)', [r.id, t, r.email, r.role, r.createdAt]);
      }
    },
    async listMemberships(t) { const { rows } = await pool.query('SELECT * FROM memberships WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, userId: r.user_id, role: r.role, createdAt: r.created_at })); },
    async saveMemberships(t, rows) {
      await pool.query('DELETE FROM memberships WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO memberships (id, tenant_id, user_id, role, created_at) VALUES ($1,$2,$3,$4,$5)', [r.id, t, r.userId, r.role, r.createdAt]);
      }
    },
    async listInvites(t) { const { rows } = await pool.query('SELECT * FROM invites WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, email: r.email, role: r.role, tokenHash: r.token_hash, invitedBy: r.invited_by, expiresAt: r.expires_at, createdAt: r.created_at })); },
    async saveInvites(t, rows) {
      await pool.query('DELETE FROM invites WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO invites (id, tenant_id, email, role, token_hash, invited_by, expires_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [r.id, t, r.email, r.role, r.tokenHash, r.invitedBy, r.expiresAt, r.createdAt]);
      }
    },
    async listSessions(t) { const { rows } = await pool.query('SELECT * FROM sessions WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows.map(r => ({ id: r.id, userId: r.user_id, tenantId: r.tenant_id, sessionTokenHash: r.session_token_hash, expiresAt: r.expires_at, createdAt: r.created_at })); },
    async saveSessions(t, rows) {
      await pool.query('DELETE FROM sessions WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO sessions (id, user_id, tenant_id, session_token_hash, expires_at, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [r.id, r.userId, t, r.sessionTokenHash, r.expiresAt, r.createdAt]);
      }
    },
    async listOperatorKeys(t) { const { rows } = await pool.query('SELECT * FROM operator_keys WHERE tenant_id=$1 ORDER BY created_at DESC', [t]); return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, label: r.label, scopes: r.scopes, keyHash: r.key_hash, createdBy: r.created_by, createdAt: r.created_at })); },
    async saveOperatorKeys(t, rows) {
      await pool.query('DELETE FROM operator_keys WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO operator_keys (id, tenant_id, label, scopes, key_hash, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [r.id, t, r.label, r.scopes, r.keyHash, r.createdBy, r.createdAt]);
      }
    },
    async listEvents(t, type, limit) {
      let q = 'SELECT * FROM typed_event_journal WHERE tenant_id=$1';
      const params = [t];
      if (type) {
        q += ' AND type=$2';
        params.push(type);
      }
      q += ' ORDER BY created_at DESC';
      if (limit) {
        q += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      const { rows } = await pool.query(q, params);
      return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, type: r.type, version: r.version, correlationId: r.correlation_id, traceId: r.trace_id, actor: r.actor, subject: r.subject, payload: r.payload, redactedKeys: r.redacted_keys, createdAt: r.created_at }));
    },
    async appendEvent(t, event) {
      await pool.query('INSERT INTO typed_event_journal (id, tenant_id, type, version, correlation_id, trace_id, actor, subject, payload, redacted_keys, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [event.id, t, event.type, event.version, event.correlationId, event.traceId, event.actor, event.subject, event.payload, event.redactedKeys || [], event.createdAt || new Date().toISOString()]);
    },
    async listArtifacts(t, kind) {
      let q = 'SELECT * FROM artifacts WHERE tenant_id=$1';
      const params = [t];
      if (kind) {
        q += ' AND kind=$2';
        params.push(kind);
      }
      const { rows } = await pool.query(q, params);
      return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, runId: r.run_id, approvalId: r.approval_id, kind: r.kind, title: r.title, mimeType: r.mime_type, storageBackend: r.storage_backend, storagePath: r.storage_path, checksumSha256: r.checksum_sha256, approvalClass: r.approval_class, approvalStatus: r.approval_status, sourceRefs: r.source_refs, traceId: r.trace_id, modelRoute: r.model_route, createdBy: r.created_by, createdAt: r.created_at }));
    },
    async saveArtifacts(t, rows) {
      await pool.query('DELETE FROM artifacts WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO artifacts (id, tenant_id, run_id, approval_id, kind, title, mime_type, storage_backend, storage_path, checksum_sha256, approval_class, approval_status, source_refs, trace_id, model_route, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)', [r.id, t, r.runId, r.approvalId, r.kind, r.title, r.mimeType, r.storageBackend, r.storagePath, r.checksumSha256, r.approvalClass, r.approvalStatus, JSON.stringify(r.sourceRefs || []), r.traceId, r.modelRoute, r.createdBy, r.createdAt]);
      }
    },
    async listManagedAgents(t) {
      const { rows } = await pool.query('SELECT * FROM managed_agents WHERE tenant_id=$1', [t]);
      return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, agentSlug: r.agent_slug, agentType: r.agent_type, status: r.status, runtime: r.runtime, profile: r.profile, packVersion: r.pack_version, healthStatus: r.health_status, lastSeenAt: r.last_seen_at, createdAt: r.created_at, updatedAt: r.updated_at }));
    },
    async saveManagedAgents(t, rows) {
      await pool.query('DELETE FROM managed_agents WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO managed_agents (id, tenant_id, agent_slug, agent_type, status, runtime, profile, pack_version, health_status, last_seen_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [r.id, t, r.agentSlug, r.agentType, r.status, r.runtime, r.profile, r.packVersion, r.healthStatus, r.lastSeenAt, r.createdAt, r.updatedAt]);
      }
    },
    async listAgentHealth(t) {
      const { rows } = await pool.query('SELECT * FROM managed_agent_health WHERE tenant_id=$1 ORDER BY timestamp DESC', [t]);
      return rows.map(r => ({ id: r.id, tenantId: r.tenant_id, agentSlug: r.agent_slug, healthStatus: r.health_status, checkOutput: r.check_output, timestamp: r.timestamp }));
    },
    async saveAgentHealth(t, rows) {
      await pool.query('DELETE FROM managed_agent_health WHERE tenant_id=$1', [t]);
      for (const r of rows) {
        await pool.query('INSERT INTO managed_agent_health (id, tenant_id, agent_slug, health_status, check_output, timestamp) VALUES ($1,$2,$3,$4,$5,$6)', [r.id, t, r.agentSlug, r.healthStatus, r.checkOutput, r.timestamp]);
      }
    }
  });
}

function makeRepoBundle(impl) {
  return {
    mode: storageMode(),
    contacts: {
      list: (t) => impl.listContacts(t),
      save: (t, rows) => impl.saveContacts(t, rows),
      upsert: (t, rows, contact) => {
        const idx = rows.findIndex((c) => c.id === contact.id);
        const next = idx >= 0 ? rows.map((c, i) => (i === idx ? contact : c)) : [contact, ...rows];
        impl.saveContacts(t, next);
        return next;
      }
    },
    interactions: { list: (t) => impl.listInteractions(t), save: (t, rows) => impl.saveInteractions(t, rows), add: (t, rows, interaction) => { const next = [interaction, ...rows]; impl.saveInteractions(t, next); return next; } },
    pipeline: { list: (t) => impl.listPipelineItems(t), save: (t, rows) => impl.savePipelineItems(t, rows), add: (t, rows, item) => { const next = [item, ...rows]; impl.savePipelineItems(t, next); return next; } },
    tasks: { list: (t) => impl.listTasks(t), save: (t, rows) => impl.saveTasks(t, rows), add: (t, rows, task) => { const next = [task, ...rows]; impl.saveTasks(t, next); return next; } },
    approvals: { list: (t) => impl.listApprovals(t), save: (t, rows) => impl.saveApprovals(t, rows), add: (t, rows, a) => { const next = [a, ...rows]; impl.saveApprovals(t, next); return next; } },
    outbox: { list: (t) => impl.listOutbox(t), save: (t, rows) => impl.saveOutbox(t, rows), add: (t, rows, e) => { const next = [e, ...rows]; impl.saveOutbox(t, next); return next; } },
    audit: { list: (t) => impl.listAudit(t), append: (t, event) => impl.appendAudit(t, event) },
    tenant: { readProfile: (t) => impl.readTenantProfile(t), writeProfile: (t, p) => impl.writeTenantProfile(t, p), readKeys: (t) => impl.readTenantKeys(t), writeKeys: (t, k) => impl.writeTenantKeys(t, k) },
    // P2 extensions
    users: {
      list: (t) => impl.listUsers(t),
      save: (t, rows) => impl.saveUsers(t, rows),
      add: (t, u) => {
        const rows = impl.listUsers(t);
        const next = [u, ...rows];
        impl.saveUsers(t, next);
        return next;
      }
    },
    memberships: {
      list: (t) => impl.listMemberships(t),
      save: (t, rows) => impl.saveMemberships(t, rows),
      add: (t, m) => {
        const rows = impl.listMemberships(t);
        const next = [m, ...rows];
        impl.saveMemberships(t, next);
        return next;
      }
    },
    invites: {
      list: (t) => impl.listInvites(t),
      save: (t, rows) => impl.saveInvites(t, rows),
      add: (t, i) => {
        const rows = impl.listInvites(t);
        const next = [i, ...rows];
        impl.saveInvites(t, next);
        return next;
      },
      findByHash: (t, hash) => {
        const rows = impl.listInvites(t);
        return rows.find(x => x.tokenHash === hash) || null;
      },
      remove: (t, id) => {
        const rows = impl.listInvites(t);
        const next = rows.filter(x => x.id !== id);
        impl.saveInvites(t, next);
        return next;
      }
    },
    sessions: {
      list: (t) => impl.listSessions(t),
      save: (t, rows) => impl.saveSessions(t, rows),
      add: (t, s) => {
        const rows = impl.listSessions(t);
        const next = [s, ...rows];
        impl.saveSessions(t, next);
        return next;
      },
      findByHash: (t, hash) => {
        const rows = impl.listSessions(t);
        return rows.find(x => x.sessionTokenHash === hash) || null;
      },
      remove: (t, id) => {
        const rows = impl.listSessions(t);
        const next = rows.filter(x => x.id !== id);
        impl.saveSessions(t, next);
        return next;
      }
    },
    operatorKeys: {
      list: (t) => impl.listOperatorKeys(t),
      save: (t, rows) => impl.saveOperatorKeys(t, rows),
      add: (t, k) => {
        const rows = impl.listOperatorKeys(t);
        const next = [k, ...rows];
        impl.saveOperatorKeys(t, next);
        return next;
      },
      findByHash: (t, hash) => {
        const rows = impl.listOperatorKeys(t);
        return rows.find(x => x.keyHash === hash) || null;
      }
    },
    events: {
      list: (t, type, limit) => impl.listEvents(t, type, limit),
      append: (t, e) => impl.appendEvent(t, e)
    },
    artifacts: {
      list: (t, kind) => impl.listArtifacts(t, kind),
      add: (t, a) => {
        const rows = impl.listArtifacts(t);
        const next = [...rows, a];
        impl.saveArtifacts(t, next);
        return next;
      }
    },
    managedAgents: {
      list: (t) => impl.listManagedAgents(t),
      save: (t, rows) => impl.saveManagedAgents(t, rows),
      add: (t, a) => {
        const rows = impl.listManagedAgents(t);
        const idx = rows.findIndex(x => x.agentSlug === a.agentSlug);
        const next = idx >= 0 ? rows.map((x, i) => i === idx ? a : x) : [...rows, a];
        impl.saveManagedAgents(t, next);
        return next;
      },
      updateHealth: (t, h) => {
        const rows = impl.listAgentHealth(t);
        const next = [...rows, h];
        impl.saveAgentHealth(t, next);
        return next;
      }
    }
  };
}
