import { describe, expect, it } from 'vitest';
import { checkIdempotency, fingerprintSubmission, recordIdempotency } from '../src/idempotency.js';

describe('idempotency guard', () => {
  it('replays a duplicate public form submission', () => {
    const fingerprint = fingerprintSubmission({ tenantId: 'asc3nd', kind: 'volunteer', payload: { email: 'a@example.org' } });
    const response = { ok: true, receipt: { id: 'int_1' } };
    const records = recordIdempotency({ records: [], key: 'same', fingerprint, status: 201, response });
    const replay = checkIdempotency({ records, key: 'same', fingerprint });
    expect(replay.replay).toBe(true);
    expect(replay.status).toBe(201);
    expect(replay.response.receipt.id).toBe('int_1');
  });

  it('rejects the same key with a different payload', () => {
    const first = fingerprintSubmission({ tenantId: 'asc3nd', kind: 'volunteer', payload: { email: 'a@example.org' } });
    const second = fingerprintSubmission({ tenantId: 'asc3nd', kind: 'volunteer', payload: { email: 'b@example.org' } });
    const records = recordIdempotency({ records: [], key: 'same', fingerprint: first, status: 201, response: { ok: true } });
    const replay = checkIdempotency({ records, key: 'same', fingerprint: second });
    expect(replay.conflict).toBe(true);
    expect(replay.status).toBe(409);
  });
});
