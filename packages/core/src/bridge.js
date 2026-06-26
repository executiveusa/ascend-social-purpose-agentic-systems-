import crypto from 'node:crypto';
import { publicKindToPipeline, publicKindToTitle, upsertContact, addInteraction, createPipelineItem } from './crm.js';

export const allowedPublicKinds = ['contact', 'message', 'volunteer', 'program-application', 'newsletter', 'event-rsvp', 'donation-intent', 'impact-story'];

export function normalizePublicPayload(kind, payload = {}, meta = {}) {
  const name = String(payload.name || payload.displayName || '').trim().slice(0, 160);
  const email = String(payload.email || '').trim().toLowerCase().slice(0, 180);
  const message = String(payload.message || payload.note || payload.body || '').trim().slice(0, 6000);
  const consent = Boolean(payload.consent || payload.optIn || kind === 'newsletter');
  return {
    kind,
    name,
    email,
    phone: String(payload.phone || '').slice(0, 40),
    organization: String(payload.organization || '').slice(0, 180),
    message,
    sourcePage: String(payload.sourcePage || meta.referer || '').slice(0, 500),
    consent,
    honeypot: String(payload.companyWebsite || payload.websiteUrl || payload._gotcha || '').trim(),
    metadata: { ...payload.metadata, userAgent: meta.userAgent, ipHash: meta.ip ? hashIp(meta.ip) : undefined }
  };
}

export function validatePublicSubmission(submission) {
  const errors = [];
  if (!allowedPublicKinds.includes(submission.kind)) errors.push('Unsupported public form type.');
  if (submission.honeypot) errors.push('Submission rejected.');
  if (!submission.name && !submission.email && !submission.phone) errors.push('Provide at least a name, email, or phone.');
  if (submission.email && !submission.email.includes('@')) errors.push('Email does not look valid.');
  if (submission.kind === 'program-application' && !submission.consent) errors.push('Guardian/participant consent acknowledgement is required for program applications.');
  if (submission.message.length > 6000) errors.push('Message is too long.');
  return { ok: errors.length === 0, errors };
}

export function applyPublicSubmission({ kind, payload, meta, state }) {
  const normalized = normalizePublicPayload(kind, payload, meta);
  const check = validatePublicSubmission(normalized);
  if (!check.ok) return { ok: false, status: 422, errors: check.errors };

  const { contacts, contact, created } = upsertContact(state.contacts || [], {
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    organization: normalized.organization,
    kind,
    tags: [kind, 'website'],
    consent: { publicSubmission: normalized.consent, at: new Date().toISOString() },
    source: normalized.sourcePage || 'public-bridge',
    notes: normalized.message
  });
  const { interactions, interaction } = addInteraction(state.interactions || [], {
    contactId: contact.id,
    channel: 'web',
    direction: 'inbound',
    subject: publicKindToTitle(kind, normalized),
    body: normalized.message,
    source: normalized.sourcePage,
    metadata: normalized.metadata
  });
  const { items, item } = createPipelineItem(state.pipelineItems || [], {
    pipeline: publicKindToPipeline(kind),
    title: publicKindToTitle(kind, normalized),
    contactId: contact.id,
    source: normalized.sourcePage || 'public-bridge',
    metadata: { publicKind: kind, interactionId: interaction.id }
  });
  return {
    ok: true,
    status: created ? 201 : 200,
    contact,
    interaction,
    pipelineItem: item,
    state: { contacts, interactions, pipelineItems: items },
    receipt: { id: interaction.id, message: 'Received. A staff member will review this in Mission OS.' }
  };
}

export function verifyOrigin(origin, allowedOrigins = []) {
  if (!origin) return true;
  if (!allowedOrigins || allowedOrigins.length === 0) return false;
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

export function verifyPublicKey(headerKey, tenantKeys = {}) {
  if (!tenantKeys.publicKey) return false;
  return timingSafeEqual(String(headerKey || ''), String(tenantKeys.publicKey));
}

export function timingSafeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
}
