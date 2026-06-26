import { describe, expect, it } from 'vitest';
import { applyPublicSubmission, verifyOrigin, verifyPublicKey } from '../src/bridge.js';

describe('public frontend bridge', () => {
  it('turns volunteer form into CRM state', () => {
    const result = applyPublicSubmission({ kind: 'volunteer', payload: { name: 'Jordan', email: 'j@example.org', message: 'I can coach.' }, meta: { referer: 'https://example.org' }, state: {} });
    expect(result.ok).toBe(true);
    expect(result.state.contacts).toHaveLength(1);
    expect(result.state.pipelineItems[0].pipeline).toBe('volunteer');
  });
  it('requires consent for youth program applications', () => {
    const result = applyPublicSubmission({ kind: 'program-application', payload: { name: 'Parent', email: 'p@example.org' }, meta: {}, state: {} });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
  });
  it('rejects honeypot bot submissions', () => {
    const result = applyPublicSubmission({ kind: 'contact', payload: { name: 'Bot', email: 'bot@example.org', websiteUrl: 'spam' }, meta: {}, state: {} });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
  });

  it('checks public origin and key', () => {
    expect(verifyOrigin('https://client.org', ['https://client.org'])).toBe(true);
    expect(verifyOrigin('https://evil.org', ['https://client.org'])).toBe(false);
    expect(verifyPublicKey('pk_1', { publicKey: 'pk_1' })).toBe(true);
  });

  it('rejects unknown origins against tenant allowlist', () => {
    expect(verifyOrigin('https://asc3nd.org', ['https://asc3nd.org', 'http://localhost:3000'])).toBe(true);
    expect(verifyOrigin('https://evil.org', ['https://asc3nd.org'])).toBe(false);
    expect(verifyOrigin(undefined, ['https://asc3nd.org'])).toBe(true);
    expect(verifyOrigin('https://asc3nd.org', [])).toBe(false);
  });

  it('routes public kinds to the correct CRM pipeline', () => {
    const kinds = [
      ['volunteer', 'volunteer'],
      ['contact', 'donor'],
      ['message', 'donor'],
      ['program-application', 'youth_program'],
      ['donation-intent', 'donor'],
      ['impact-story', 'sponsor'],
      ['newsletter', 'donor'],
      ['event-rsvp', 'volunteer']
    ];
    for (const [kind, pipeline] of kinds) {
      const result = applyPublicSubmission({ kind, payload: { name: 'Test', email: 't@example.org', consent: true }, meta: {}, state: {} });
      expect(result.ok, `${kind} should succeed`).toBe(true);
      expect(result.pipelineItem.pipeline, `${kind} -> ${pipeline}`).toBe(pipeline);
    }
  });

  it('replays identical idempotency key with same receipt', () => {
    const state = {};
    const first = applyPublicSubmission({ kind: 'volunteer', payload: { name: 'Sam', email: 's@example.org' }, meta: {}, state });
    expect(first.ok).toBe(true);
    const second = applyPublicSubmission({ kind: 'volunteer', payload: { name: 'Sam', email: 's@example.org' }, meta: {}, state: first.state });
    expect(second.ok).toBe(true);
    expect(second.contact.id).toBe(first.contact.id);
  });
});
