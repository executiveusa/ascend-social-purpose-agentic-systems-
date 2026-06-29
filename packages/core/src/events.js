import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

export function createCorrelationId(prefix = 'corr') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function emitEvent({
  tenantId,
  type,
  version = "1",
  correlationId,
  traceId,
  actor,
  subject,
  payload = {},
  redaction = []
}) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!type) throw new Error('type is required');

  const cleanPayload = { ...payload };
  if (Array.isArray(redaction)) {
    for (const key of redaction) {
      if (key in cleanPayload) {
        cleanPayload[key] = '[REDACTED]';
      }
    }
  }

  const sensitiveKeys = ['secret', 'password', 'token', 'key', 'jwt'];
  for (const k of Object.keys(cleanPayload)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
      cleanPayload[k] = '[REDACTED]';
    }
  }

  const event = {
    id: `evt_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    type,
    version,
    correlationId: correlationId || createCorrelationId(),
    traceId: traceId || null,
    actor: actor || 'system',
    subject: subject || null,
    payload: cleanPayload,
    redactedKeys: redaction,
    createdAt: new Date().toISOString()
  };

  const dataDir = getDataDir();
  const tenantDir = path.join(dataDir, tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  const eventsFile = path.join(tenantDir, 'events.jsonl');
  fs.appendFileSync(eventsFile, JSON.stringify(event) + '\n', 'utf8');

  return event;
}

export function readEvents({ tenantId, type, limit } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  const dataDir = getDataDir();
  const eventsFile = path.join(dataDir, tenantId, 'events.jsonl');

  if (!fs.existsSync(eventsFile)) {
    return [];
  }

  const content = fs.readFileSync(eventsFile, 'utf8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  let events = lines.map(line => JSON.parse(line));

  if (type) {
    events = events.filter(e => e.type === type);
  }

  if (limit) {
    events = events.slice(-limit);
  }

  return events;
}
