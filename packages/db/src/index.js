import fs from 'node:fs';
import path from 'node:path';

// Storage mode resolution.
// - "json"        -> explicit JSON dry-run (dev/test only, MISSION_STORAGE=json)
// - "postgres"    -> Postgres is the production source of truth
// - "memory"      -> in-process Map (tests)
// Production refuses JSON mode: call assertProductionStorage() at boot when
// NODE_ENV=production to enforce Postgres.
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

// Factory: returns a repository bundle bound to the active storage mode.
// Each repo implements the same interface; the bundle picks the backend.
export function createRepositories({ baseDir, pool } = {}) {
  const mode = storageMode();
  if (mode === 'postgres') {
    // Lazy: only load pg when actually needed.
    return createPostgresRepos(pool);
  }
  if (mode === 'memory') {
    return createMemoryRepos();
  }
  return createJsonRepos(baseDir || path.resolve(process.cwd(), 'mission-data'));
}

// ---- JSON backend (dev/test, behind MISSION_STORAGE=json) ----
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
    writeTenantKeys: (t, k) => write(t, 'keys', k)
  });
}

// ---- Memory backend (unit tests) ----
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
    writeTenantKeys: (t, k) => store.set(`${t}:single:keys`, k)
  });
}

// ---- Postgres backend (production) ----
function createPostgresRepos(pool) {
  if (!pool) throw new Error('Postgres backend requires a pg Pool instance.');
  // The pg dependency is loaded lazily so the JSON/memory backends never need it.
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
    async writeTenantKeys(t, k) { await pool.query('INSERT INTO tenant_keys (tenant_id, public_key, secret_key_hash, allowed_origins, api_base_url, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (tenant_id) DO UPDATE SET public_key=$2, secret_key_hash=$3, allowed_origins=$4, api_base_url=$5', [t, k.publicKey, k.secretKeyHash, k.allowedOrigins || [], k.apiBaseUrl, k.createdAt || new Date().toISOString()]); }
  });
}

// Common bundle shape — every backend returns the same interface.
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
    tenant: { readProfile: (t) => impl.readTenantProfile(t), writeProfile: (t, p) => impl.writeTenantProfile(t, p), readKeys: (t) => impl.readTenantKeys(t), writeKeys: (t, k) => impl.writeTenantKeys(t, k) }
  };
}
