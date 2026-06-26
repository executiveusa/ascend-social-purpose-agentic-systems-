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

// P0-4: Approval-to-outbox execution flow.
// An approval request is created for orange/red actions. When a human approves,
// an outbox event is created in 'approved_ready' status. A worker then executes
// only approved events. Red actions require a signer role.

export const SIGNER_ROLES = ['owner', 'executive_director', 'finance'];

export function requiresApprovalForRisk(risk) {
  return risk === 'orange' || risk === 'red';
}

export function createApprovalRequest({ tenantId, risk, title, summary = '', payload = {}, executionPolicy = {} }) {
  return {
    id: `appr_${crypto.randomBytes(6).toString('hex')}`,
    tenantId,
    status: 'pending',
    risk,
    title,
    summary,
    payload,
    executionPolicy,
    createdAt: new Date().toISOString(),
    decidedAt: null,
    decidedBy: null
  };
}

export function canApprove(risk, role) {
  if (!requiresApprovalForRisk(risk)) return true;
  if (risk === 'red') return SIGNER_ROLES.includes(role);
  return Boolean(role);
}

export function decideApproval(approval, decision, actor, role) {
  if (approval.status !== 'pending') throw new Error(`Approval ${approval.id} is already ${approval.status}`);
  if (decision === 'approved') {
    if (!canApprove(approval.risk, role)) {
      throw new Error(`Role '${role}' cannot approve ${approval.risk} actions. Red actions require a signer role.`);
    }
    return { ...approval, status: 'approved', decidedAt: new Date().toISOString(), decidedBy: actor };
  }
  if (decision === 'rejected') {
    return { ...approval, status: 'rejected', decidedAt: new Date().toISOString(), decidedBy: actor };
  }
  throw new Error(`Unknown decision: ${decision}`);
}

export function approvalToOutboxEvent(approval) {
  if (approval.status !== 'approved') return null;
  return createOutboxEvent({
    type: approval.executionPolicy.type || 'execute',
    tenantId: approval.tenantId,
    approvalId: approval.id,
    adapter: approval.executionPolicy.adapter || null,
    payload: approval.payload,
    risk: approval.risk,
    status: 'approved_ready'
  });
}

export async function executeOutboxEvent(event, executor) {
  if (event.status !== 'approved_ready') return event;
  try {
    const result = await executor(event);
    return markOutboxExecuted(event, result || {});
  } catch (err) {
    const failed = markOutboxFailed(event, err.message);
    if (failed.attempts >= 3) return { ...failed, status: 'dead' };
    return { ...failed, status: 'failed_retryable' };
  }
}

export async function drainOutbox(events, executor) {
  const results = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.status !== 'approved_ready') { results.push(e); continue; }
    results.push(await executeOutboxEvent(e, executor));
  }
  return results;
}
