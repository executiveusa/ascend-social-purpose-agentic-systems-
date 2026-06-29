import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { emitEvent } from './events.js';
import { evaluateActionPolicy, APPROVAL_CLASSES } from './policy.js';
import { can } from './rbac.js';
import { createRepositories } from '../../db/src/index.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

export const APPROVAL_STATES = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXECUTED: 'executed',
  VERIFIED: 'verified',
  LOGGED: 'logged'
};

const VALID_TRANSITIONS = {
  [APPROVAL_STATES.DRAFT]: [APPROVAL_STATES.REVIEW, APPROVAL_STATES.REJECTED],
  [APPROVAL_STATES.REVIEW]: [APPROVAL_STATES.APPROVED, APPROVAL_STATES.REJECTED],
  [APPROVAL_STATES.APPROVED]: [APPROVAL_STATES.EXECUTED],
  [APPROVAL_STATES.EXECUTED]: [APPROVAL_STATES.VERIFIED],
  [APPROVAL_STATES.VERIFIED]: [APPROVAL_STATES.LOGGED],
  [APPROVAL_STATES.REJECTED]: []
};

function resolveActorUser(actor, tenantId) {
  if (typeof actor === 'object' && actor !== null) {
    return actor;
  }
  if (typeof actor === 'string') {
    if (actor === 'system') {
      return { role: 'owner', tenantId };
    }
    const repos = createRepositories();
    const users = repos.users ? repos.users.list(tenantId) : [];
    const user = users.find(u => u.id === actor || u.email === actor);
    if (user) return user;
    return { role: actor, tenantId };
  }
  return null;
}

export function requestApproval({ tenantId, actionType, actionPayload, requester }) {
  if (!tenantId) throw new Error('tenantId is required');

  const policy = evaluateActionPolicy({ actionType, actionPayload });

  const approvalRequest = {
    id: `app_${crypto.randomBytes(12).toString('hex')}`,
    tenantId,
    actionType,
    actionPayload,
    approvalClass: policy.approvalClass,
    status: policy.approvalClass === APPROVAL_CLASSES.GREEN ? APPROVAL_STATES.APPROVED : APPROVAL_STATES.DRAFT,
    requester: requester || 'system',
    approver: null,
    comments: policy.reason,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveApproval(approvalRequest);

  emitEvent({
    tenantId,
    type: 'APPROVAL.REQUESTED',
    actor: requester || 'system',
    subject: approvalRequest.id,
    payload: { actionType, approvalClass: policy.approvalClass }
  });

  return approvalRequest;
}

export function updateApprovalStatus({ tenantId, approvalId, nextStatus, actor, comments }) {
  const approval = getApproval(tenantId, approvalId);
  if (!approval) throw new Error(`Approval request ${approvalId} not found`);

  const currentStatus = approval.status;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid state transition from ${currentStatus} to ${nextStatus}`);
  }

  // Connect policy to RBAC for Approved transitions
  if (nextStatus === APPROVAL_STATES.APPROVED) {
    const user = resolveActorUser(actor, tenantId);
    if (approval.approvalClass === APPROVAL_CLASSES.RED) {
      if (!user || !can(user, 'approvals.approve.red')) {
        throw new Error('Restricted approval class RED cannot be automatically approved. Restricted approval class RED requires red approval permission.');
      }
    }
    if (approval.approvalClass === APPROVAL_CLASSES.ORANGE) {
      if (!user || !can(user, 'approvals.approve.orange')) {
        throw new Error('Restricted approval class ORANGE requires orange approval permission.');
      }
    }
  }

  approval.status = nextStatus;
  approval.updatedAt = new Date().toISOString();
  if (nextStatus === APPROVAL_STATES.APPROVED) {
    approval.approver = typeof actor === 'object' ? (actor.id || actor.email) : actor;
  }
  if (comments) {
    approval.comments = comments;
  }

  saveApproval(approval);

  const eventType = nextStatus === APPROVAL_STATES.APPROVED ? 'APPROVAL.APPROVED' :
                    nextStatus === APPROVAL_STATES.REJECTED ? 'APPROVAL.REJECTED' : null;

  if (eventType) {
    emitEvent({
      tenantId,
      type: eventType,
      actor: typeof actor === 'object' ? (actor.id || actor.email) : (actor || 'system'),
      subject: approval.id,
      payload: { status: nextStatus, comments }
    });
  }

  return approval;
}

function saveApproval(approval) {
  const dataDir = getDataDir();
  const tenantDir = path.join(dataDir, approval.tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  const approvalsFile = path.join(tenantDir, 'approvals.json');
  let approvals = [];
  if (fs.existsSync(approvalsFile)) {
    try {
      approvals = JSON.parse(fs.readFileSync(approvalsFile, 'utf8'));
    } catch {
      approvals = [];
    }
  }

  const idx = approvals.findIndex(a => a.id === approval.id);
  if (idx >= 0) {
    approvals[idx] = approval;
  } else {
    approvals.push(approval);
  }

  fs.writeFileSync(approvalsFile, JSON.stringify(approvals, null, 2), 'utf8');
}

export function getApproval(tenantId, approvalId) {
  const dataDir = getDataDir();
  const approvalsFile = path.join(dataDir, tenantId, 'approvals.json');
  if (!fs.existsSync(approvalsFile)) return null;

  try {
    const approvals = JSON.parse(fs.readFileSync(approvalsFile, 'utf8'));
    return approvals.find(a => a.id === approvalId) || null;
  } catch {
    return null;
  }
}
