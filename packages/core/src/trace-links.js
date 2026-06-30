import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { emitEvent } from './events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

function tracesFile(tenantId) {
  return path.join(getDataDir(), tenantId, 'trace-links.json');
}

function readTraces(tenantId) {
  const file = tracesFile(tenantId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeTraces(tenantId, rows) {
  const dir = path.join(getDataDir(), tenantId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tracesFile(tenantId), JSON.stringify(rows, null, 2), 'utf8');
}

export function createTraceLink({ tenantId, surface, agentSlug, runId = null, artifactId = null, langfuseTraceUrl = null, actor = 'system' }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!surface) throw new Error('surface is required');

  const trace = {
    id: `trc_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    surface,
    agentSlug: agentSlug || null,
    runId,
    artifactId,
    langfuseTraceUrl,
    createdAt: new Date().toISOString()
  };

  const rows = readTraces(tenantId);
  rows.push(trace);
  writeTraces(tenantId, rows);

  emitEvent({
    tenantId,
    type: 'TRACE.LINK.CREATED',
    actor,
    subject: trace.id,
    payload: { surface, agentSlug, runId, artifactId }
  });

  return trace;
}

export function getTraceLinks({ tenantId, surface, runId } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  let rows = readTraces(tenantId);
  if (surface) rows = rows.filter((t) => t.surface === surface);
  if (runId) rows = rows.filter((t) => t.runId === runId);
  return rows;
}

export function getTraceLink({ tenantId, id }) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!id) throw new Error('id is required');
  return readTraces(tenantId).find((t) => t.id === id) || null;
}
