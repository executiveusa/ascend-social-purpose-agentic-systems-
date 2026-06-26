import { describe, expect, it } from 'vitest';
import { MissionClient } from '../src/index.js';

describe('MissionClient', () => {
  it('submits public bridge requests with tenant and key', async () => {
    const calls = [];
    const client = new MissionClient({ tenant: 'asc3nd', publicKey: 'pk_test', apiBaseUrl: 'http://api.local', fetchImpl: async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ ok: true }) }; } });
    await client.volunteer.apply({ name: 'A', email: 'a@example.org' }, { idempotencyKey: 'same' });
    expect(calls[0].url).toBe('http://api.local/api/public/asc3nd/volunteer');
    expect(calls[0].init.headers['x-mission-public-key']).toBe('pk_test');
  });
});
