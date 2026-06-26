import crypto from 'node:crypto';

export const pipelineTemplates = {
  funding: ['Discovered', 'Eligible', 'Docs Needed', 'Drafting', 'Review Needed', 'Submitted', 'Follow-up', 'Awarded', 'Declined', 'Report Due'],
  donor: ['New Contact', 'Warm', 'First Gift', 'Thanked', 'Impact Update Due', 'Recurring Donor', 'Major Donor', 'Sponsor Candidate'],
  volunteer: ['Applied', 'Screening', 'Orientation', 'Approved', 'Assigned', 'Active', 'Follow-up Needed', 'Inactive'],
  youth_program: ['Inquiry', 'Guardian Contacted', 'Consent Needed', 'Enrolled', 'Active', 'Needs Support', 'Completed', 'Alumni'],
  sponsor: ['Target', 'Contacted', 'Meeting Set', 'Proposal Sent', 'Committed', 'Renewal Due'],
  general_inbox: ['New', 'Triaged', 'In Progress', 'Waiting', 'Done', 'Archived']
};

export function id(prefix = 'crm') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }

export function normalizeEmail(email = '') { return String(email || '').trim().toLowerCase(); }
export function normalizePhone(phone = '') { return String(phone || '').replace(/[^+0-9]/g, '').slice(0, 32); }

export function upsertContact(contacts = [], input = {}) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const now = new Date().toISOString();
  const index = contacts.findIndex((c) => (email && normalizeEmail(c.email) === email) || (phone && normalizePhone(c.phone) === phone));
  const tags = Array.from(new Set([...(input.tags || []), ...(input.kind ? [input.kind] : [])].filter(Boolean)));
  if (index >= 0) {
    const existing = contacts[index];
    const merged = {
      ...existing,
      ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== '')),
      id: existing.id,
      email: existing.email || email,
      phone: existing.phone || phone,
      tags: Array.from(new Set([...(existing.tags || []), ...tags])),
      updatedAt: now
    };
    return { contacts: [merged, ...contacts.filter((_, i) => i !== index)], contact: merged, created: false };
  }
  const contact = {
    id: id('person'),
    displayName: input.displayName || input.name || [input.firstName, input.lastName].filter(Boolean).join(' ') || email || phone || 'New contact',
    firstName: input.firstName || '',
    lastName: input.lastName || '',
    email,
    phone,
    role: input.role || input.kind || 'community',
    organization: input.organization || '',
    relationshipStrength: input.relationshipStrength || 'new',
    tags,
    consent: input.consent || {},
    source: input.source || 'public-form',
    notes: input.notes || '',
    createdAt: now,
    updatedAt: now
  };
  return { contacts: [contact, ...contacts], contact, created: true };
}

export function addInteraction(interactions = [], { contactId, channel = 'web', direction = 'inbound', subject = '', body = '', source = '', metadata = {} } = {}) {
  const interaction = { id: id('int'), contactId, channel, direction, subject, body, source, metadata, at: new Date().toISOString() };
  return { interactions: [interaction, ...interactions], interaction };
}

export function createPipelineItem(items = [], { pipeline = 'donor', stage, title, contactId, organizationId, value, source, metadata = {} } = {}) {
  const stages = pipelineTemplates[pipeline] || pipelineTemplates.donor;
  const item = {
    id: id('pipe'),
    pipeline,
    stage: stage || stages[0],
    title: title || `${pipeline} item`,
    contactId: contactId || null,
    organizationId: organizationId || null,
    value: value || null,
    source: source || 'system',
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return { items: [item, ...items], item };
}

export function movePipelineItem(items = [], itemId, nextStage) {
  let moved = null;
  const next = items.map((item) => {
    if (item.id !== itemId) return item;
    moved = { ...item, stage: nextStage, updatedAt: new Date().toISOString() };
    return moved;
  });
  return { items: next, item: moved };
}

export function publicKindToPipeline(kind) {
  return {
    contact: 'general_inbox',
    message: 'general_inbox',
    volunteer: 'volunteer',
    'program-application': 'youth_program',
    newsletter: 'general_inbox',
    'event-rsvp': 'volunteer',
    'donation-intent': 'donor',
    'impact-story': 'sponsor'
  }[kind] || 'general_inbox';
}

export function publicKindToTitle(kind, payload = {}) {
  const name = payload.name || payload.displayName || payload.email || 'New person';
  return {
    contact: `Follow up with ${name}`,
    message: `Respond to ${name}`,
    volunteer: `Screen volunteer: ${name}`,
    'program-application': `Review program application: ${name}`,
    newsletter: `Welcome newsletter signup: ${name}`,
    'event-rsvp': `Confirm event RSVP: ${name}`,
    'donation-intent': `Follow up donation intent: ${name}`,
    'impact-story': `Review impact story: ${name}`
  }[kind] || `Follow up with ${name}`;
}
