export class MissionClient {
  constructor({ apiBaseUrl = 'http://localhost:4000', tenant, publicKey, fetchImpl = globalThis.fetch } = {}) {
    if (!tenant) throw new Error('MissionClient requires tenant');
    if (!publicKey) throw new Error('MissionClient requires publicKey');
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    this.tenant = tenant;
    this.publicKey = publicKey;
    this.fetch = fetchImpl;
  }
  async submit(kind, payload, options = {}) {
    const res = await this.fetch(`${this.apiBaseUrl}/api/public/${this.tenant}/${kind}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mission-public-key': this.publicKey,
        'x-idempotency-key': options.idempotencyKey || cryptoRandom()
      },
      body: JSON.stringify({ ...payload, sourcePage: payload.sourcePage || options.sourcePage })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new MissionClientError(json.error || 'Mission OS request failed', res.status, json);
    return json;
  }
  contact = { create: (payload, options) => this.submit('contact', payload, options) };
  volunteer = { apply: (payload, options) => this.submit('volunteer', payload, options) };
  program = { apply: (payload, options) => this.submit('program-application', payload, options) };
  newsletter = { signup: (payload, options) => this.submit('newsletter', payload, options) };
  event = { rsvp: (payload, options) => this.submit('event-rsvp', payload, options) };
  donation = { intent: (payload, options) => this.submit('donation-intent', payload, options) };
  message = { create: (payload, options) => this.submit('message', payload, options) };
  impactStory = { submit: (payload, options) => this.submit('impact-story', payload, options) };
}

export class MissionClientError extends Error {
  constructor(message, status, payload) { super(message); this.name = 'MissionClientError'; this.status = status; this.payload = payload; }
}

export function createMissionForms(client) {
  return {
    contact: (formData) => client.contact.create(Object.fromEntries(formData)),
    volunteer: (formData) => client.volunteer.apply(Object.fromEntries(formData)),
    programApplication: (formData) => client.program.apply(Object.fromEntries(formData)),
    newsletter: (formData) => client.newsletter.signup(Object.fromEntries(formData)),
    impactStory: (formData) => client.impactStory.submit(Object.fromEntries(formData))
  };
}

function cryptoRandom() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
