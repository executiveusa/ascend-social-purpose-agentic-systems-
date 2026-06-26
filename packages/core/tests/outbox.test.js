import { describe, expect, it } from 'vitest';
import {
  createApprovalRequest, decideApproval, canApprove, approvalToOutboxEvent,
  executeOutboxEvent, drainOutbox, SIGNER_ROLES, requiresApprovalForRisk
} from '../src/outbox.js';

describe('approval-to-outbox execution', () => {
  it('orange actions require approval', () => {
    expect(requiresApprovalForRisk('orange')).toBe(true);
    expect(requiresApprovalForRisk('red')).toBe(true);
    expect(requiresApprovalForRisk('yellow')).toBe(false);
    expect(requiresApprovalForRisk('green')).toBe(false);
  });

  it('red actions require a signer role', () => {
    expect(canApprove('red', 'owner')).toBe(true);
    expect(canApprove('red', 'executive_director')).toBe(true);
    expect(canApprove('red', 'finance')).toBe(true);
    expect(canApprove('red', 'staff')).toBe(false);
    expect(canApprove('red', 'volunteer_manager')).toBe(false);
    expect(SIGNER_ROLES).toContain('owner');
  });

  it('orange actions can be approved by any authenticated staff', () => {
    expect(canApprove('orange', 'staff')).toBe(true);
    expect(canApprove('orange', 'volunteer_manager')).toBe(true);
  });

  it('staff cannot approve a red action', () => {
    const approval = createApprovalRequest({ tenantId: 'asc3nd', risk: 'red', title: 'Submit grant' });
    expect(() => decideApproval(approval, 'approved', 'staff@asc3nd.org', 'staff')).toThrow(/signer role/);
  });

  it('approval creates an outbox event only when approved', () => {
    const approval = createApprovalRequest({ tenantId: 'asc3nd', risk: 'orange', title: 'Send sponsor email', executionPolicy: { type: 'email', adapter: 'postiz' } });
    expect(approvalToOutboxEvent(approval)).toBeNull();
    const approved = decideApproval(approval, 'approved', 'ed@asc3nd.org', 'executive_director');
    const event = approvalToOutboxEvent(approved);
    expect(event).not.toBeNull();
    expect(event.status).toBe('approved_ready');
    expect(event.approvalId).toBe(approved.id);
    expect(event.adapter).toBe('postiz');
  });

  it('worker executes only approved events', async () => {
    const pending = createApprovalRequest({ tenantId: 'asc3nd', risk: 'orange', title: 'X' });
    const event = approvalToOutboxEvent(decideApproval(pending, 'approved', 'ed@asc3nd.org', 'executive_director'));
    const executed = await executeOutboxEvent(event, async () => ({ sent: true }));
    expect(executed.status).toBe('executed');
    expect(executed.result.sent).toBe(true);
  });

  it('failed events retry safely and go dead after 3 attempts', async () => {
    const pending = createApprovalRequest({ tenantId: 'asc3nd', risk: 'orange', title: 'X' });
    let event = approvalToOutboxEvent(decideApproval(pending, 'approved', 'ed@asc3nd.org', 'executive_director'));
    const failer = async () => { throw new Error('adapter down'); };
    event = await executeOutboxEvent(event, failer);
    expect(event.status).toBe('failed_retryable');
    expect(event.attempts).toBe(1);
    event = await executeOutboxEvent({ ...event, status: 'approved_ready' }, failer);
    expect(event.attempts).toBe(2);
    event = await executeOutboxEvent({ ...event, status: 'approved_ready' }, failer);
    expect(event.status).toBe('dead');
    expect(event.attempts).toBe(3);
  });

  it('drainOutbox processes all approved_ready events', async () => {
    const a = approvalToOutboxEvent(decideApproval(createApprovalRequest({ tenantId: 'asc3nd', risk: 'orange', title: 'A' }), 'approved', 'ed@asc3nd.org', 'executive_director'));
    const b = approvalToOutboxEvent(decideApproval(createApprovalRequest({ tenantId: 'asc3nd', risk: 'orange', title: 'B' }), 'approved', 'ed@asc3nd.org', 'executive_director'));
    const results = await drainOutbox([a, b], async () => ({ ok: true }));
    expect(results.every((e) => e.status === 'executed')).toBe(true);
  });

  it('rejected approvals do not create outbox events', () => {
    const approval = createApprovalRequest({ tenantId: 'asc3nd', risk: 'red', title: 'Wire funds' });
    const rejected = decideApproval(approval, 'rejected', 'ed@asc3nd.org', 'executive_director');
    expect(approvalToOutboxEvent(rejected)).toBeNull();
  });
});
