export const approvalClasses = {
  green: { label: 'Green', meaning: 'Read-only or internal summary. No external action.', requiresHuman: false },
  yellow: { label: 'Yellow', meaning: 'Draft or recommendation. Human review before use.', requiresHuman: true },
  orange: { label: 'Orange', meaning: 'External communication, publishing, sponsor/donor contact, or browser action.', requiresHuman: true },
  red: { label: 'Red', meaning: 'Money, legal/compliance, youth records, grant submission, or sensitive data.', requiresHuman: true }
};

const redFlags = [
  'submit grant', 'file tax', 'bank', 'wire', 'payment', 'donor commitment', 'youth record', 'minor', 'child', 'background check', 'legal filing', 'medical', 'ssn', 'ein application'
];
const orangeFlags = ['send email', 'post social', 'publish', 'call', 'sms', 'sponsor', 'donor outreach', 'browser apply'];
const yellowFlags = ['draft', 'recommend', 'review', 'prepare', 'summarize', 'score'];

export function classifyAction(action = '') {
  const text = action.toLowerCase();
  if (redFlags.some((flag) => text.includes(flag))) return 'red';
  if (orangeFlags.some((flag) => text.includes(flag))) return 'orange';
  if (yellowFlags.some((flag) => text.includes(flag))) return 'yellow';
  return 'green';
}

export function requiresApproval(action = '') {
  return approvalClasses[classifyAction(action)].requiresHuman;
}

export function assertTenantBoundary(tenantId, path = '') {
  if (!tenantId || !/^[a-z0-9][a-z0-9-]{1,60}$/.test(tenantId)) {
    throw new Error('Invalid tenant id. Use lowercase letters, numbers, and hyphens.');
  }
  if (path.includes('..') || path.includes('~') || path.startsWith('/')) {
    throw new Error('Unsafe path. Tenant operations cannot escape the tenant workspace.');
  }
  return true;
}

export function redactSensitive(text = '') {
  return String(text)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
}
