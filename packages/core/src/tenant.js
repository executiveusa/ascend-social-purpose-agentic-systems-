import crypto from 'node:crypto';

export const TENANT_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

export function cleanTenantSlug(input = '') {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
    .slice(0, 60) || 'new-tenant';
}

export function validateTenantSlug(slug) {
  const clean = cleanTenantSlug(slug);
  if (!TENANT_SLUG_RE.test(clean)) throw new Error(`Invalid tenant slug: ${slug}`);
  return clean;
}

export function createPublicKey(slug, seed = crypto.randomBytes(18).toString('hex')) {
  const body = Buffer.from(`${validateTenantSlug(slug)}:${seed}`).toString('base64url').slice(0, 28);
  return `pk_mission_${body}`;
}

export function createSecretKey(slug, seed = crypto.randomBytes(24).toString('hex')) {
  const body = Buffer.from(`${validateTenantSlug(slug)}:${seed}`).toString('base64url').slice(0, 36);
  return `sk_mission_${body}`;
}

export function defaultTenantProfile({ tenantId = 'asc3nd', orgName = 'Asc3nd Collective', region = 'Seattle / King County', niche = 'youth, sports, mentorship' } = {}) {
  return {
    tenantId: validateTenantSlug(tenantId),
    orgName,
    region,
    niche,
    legalStatus: '501c3 or fiscal sponsor pending',
    publicOrigins: ['http://localhost:3000'],
    audience: 'youth, families, donors, sponsors, volunteers, board members',
    mission: 'Create measurable opportunity, mentorship, leadership, and wellness outcomes for Northwest youth.',
    programs: 'Youth sports, mentorship, leadership development, school partnerships, community engagement.',
    approvalPolicy: 'Orange and red actions require human approval before external execution.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function tenantFrontendConfig(profile, keys = {}) {
  return {
    tenant: profile.tenantId,
    orgName: profile.orgName,
    region: profile.region,
    niche: profile.niche,
    mission: profile.mission,
    publicApiKey: keys.publicKey,
    apiBaseUrl: keys.apiBaseUrl || process.env.NEXT_PUBLIC_MISSION_API_URL || 'http://localhost:4000',
    llmsTxt: true,
    schema: true
  };
}
