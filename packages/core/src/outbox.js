import crypto from 'node:crypto';
export function outboxId(prefix = 'out') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }
export function createOutboxEvent({ type, tenantId, approvalId, adapter, payload, risk = 'yellow', status = 'pending_approval' }) {
  return { id: outboxId(), tenantId, type, adapter, approvalId: approvalId || null, risk, payload: payload || {}, status, attempts: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
export function markOutboxApproved(event, actor) {
  return { ...event, status: 'approved_ready', approvedBy: actor, updatedAt: new Date().toISOString() };
}
export function markOutboxExecuted(event, result = {}) {
  return { ...event, status: 'executed', attempts: (event.attempts || 0) + 1, result, updatedAt: new Date().toISOString() };
}
export function markOutboxFailed(event, error = '') {
  return { ...event, status: 'failed_retryable', attempts: (event.attempts || 0) + 1, error: String(error).slice(0, 1000), updatedAt: new Date().toISOString() };
}
