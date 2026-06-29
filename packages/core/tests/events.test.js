import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { emitEvent, readEvents, createCorrelationId } from '../src/events.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('event journal', () => {
  const tenantId = 'test-tenant-events';

  beforeEach(() => {
    const eventsFile = path.join(getDataDir(), tenantId, 'events.jsonl');
    if (fs.existsSync(eventsFile)) {
      fs.unlinkSync(eventsFile);
    }
  });

  it('emits and reads events correctly', () => {
    const correlationId = createCorrelationId();
    const event = emitEvent({
      tenantId,
      type: 'TENANT.CREATED',
      correlationId,
      actor: 'operator-alice',
      subject: 'demo-pnw',
      payload: { name: 'Demo Nonprofit', secret_key: 'super_secret' }
    });

    expect(event.id).toBeDefined();
    expect(event.tenantId).toBe(tenantId);
    expect(event.type).toBe('TENANT.CREATED');
    expect(event.correlationId).toBe(correlationId);
    expect(event.actor).toBe('operator-alice');
    // Secret keys in payload must be redacted
    expect(event.payload.secret_key).toBe('[REDACTED]');

    const events = readEvents({ tenantId });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe(event.id);
  });
});
