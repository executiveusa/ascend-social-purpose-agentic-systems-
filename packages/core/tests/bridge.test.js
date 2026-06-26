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
});
