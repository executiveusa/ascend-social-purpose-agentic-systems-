import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { requestApproval, updateApprovalStatus, getApproval, APPROVAL_STATES } from '../src/approval-lifecycle.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('approval and policy lifecycle', () => {
  const tenantId = 'test-tenant-approvals';

  beforeEach(() => {
    const file = path.join(getDataDir(), tenantId, 'approvals.json');
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });

  it('evaluates policy and handles approval lifecycle', () => {
    // Green action should be auto-approved
    const green = requestApproval({
      tenantId,
      actionType: 'READ_ONLY',
      requester: 'bob'
    });
    expect(green.approvalClass).toBe('green');
    expect(green.status).toBe(APPROVAL_STATES.APPROVED);

    // Yellow action starts as draft
    const yellow = requestApproval({
      tenantId,
      actionType: 'GENERATE_DRAFT',
      requester: 'bob'
    });
    expect(yellow.approvalClass).toBe('yellow');
    expect(yellow.status).toBe(APPROVAL_STATES.DRAFT);

    // Request review transition
    const reviewed = updateApprovalStatus({
      tenantId,
      approvalId: yellow.id,
      nextStatus: APPROVAL_STATES.REVIEW,
      actor: 'bob'
    });
    expect(reviewed.status).toBe(APPROVAL_STATES.REVIEW);

    // Approve the yellow action
    const approved = updateApprovalStatus({
      tenantId,
      approvalId: yellow.id,
      nextStatus: APPROVAL_STATES.APPROVED,
      actor: 'manager-charlie',
      comments: 'approved draft generation'
    });
    expect(approved.status).toBe(APPROVAL_STATES.APPROVED);
    expect(approved.approver).toBe('manager-charlie');

    // Orange action evaluation (requires human approval)
    const orange = requestApproval({
      tenantId,
      actionType: 'OUTBOUND_MESSAGE',
      actionPayload: { intent: 'send_outbound' },
      requester: 'bob'
    });
    expect(orange.approvalClass).toBe('orange');
    expect(orange.status).toBe(APPROVAL_STATES.DRAFT);

    // Hard block RED action cannot be approved
    const red = requestApproval({
      tenantId,
      actionType: 'GRANT_SUBMISSION',
      requester: 'bob'
    });
    expect(red.approvalClass).toBe('red');
    expect(red.status).toBe(APPROVAL_STATES.DRAFT);

    const readyForReview = updateApprovalStatus({
      tenantId,
      approvalId: red.id,
      nextStatus: APPROVAL_STATES.REVIEW,
      actor: 'bob'
    });

    expect(() => updateApprovalStatus({
      tenantId,
      approvalId: red.id,
      nextStatus: APPROVAL_STATES.APPROVED,
      actor: 'admin-alice'
    })).toThrow(/Restricted approval class RED cannot be automatically approved/);
  });
});
