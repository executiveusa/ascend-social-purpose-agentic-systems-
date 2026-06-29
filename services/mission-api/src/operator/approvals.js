import { updateApprovalStatus, getApproval, APPROVAL_STATES } from '@asc3nd/core/approval-lifecycle';
import { can } from '@asc3nd/core/rbac';
import { emitEvent } from '@asc3nd/core/events';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

function resolveOperatorUser(operator) {
  return { role: operator.scopes?.[0] || 'operator', tenantId: operator.tenantId, id: operator.id };
}

export function approveApproval(req, res) {
  try {
    const { tenantId, operator } = loadTenantContext(req);
    const { id } = req.params;
    const { note } = req.body || {};

    const existing = getApproval(tenantId, id);
    if (!existing) return operatorError(res, 'NOT_FOUND', `Approval ${id} not found`, 404);

    const user = resolveOperatorUser(operator);

    if (existing.approvalClass === 'red' && !can(user, 'approvals.approve.red')) {
      return operatorError(res, 'FORBIDDEN', 'Permission denied: approvals.approve.red required for red approvals', 403);
    }
    if (existing.approvalClass === 'orange' && !can(user, 'approvals.approve.orange')) {
      return operatorError(res, 'FORBIDDEN', 'Permission denied: approvals.approve.orange required for orange approvals', 403);
    }

    const approval = updateApprovalStatus({
      tenantId,
      approvalId: id,
      nextStatus: APPROVAL_STATES.APPROVED,
      actor: user,
      comments: note || ''
    });

    emitEvent({ tenantId, type: 'OPERATOR.APPROVAL.APPROVED', actor: operator.id, subject: id, payload: { approvalClass: existing.approvalClass } });
    return operatorSuccess(res, { approval });
  } catch (e) {
    return operatorError(res, 'APPROVE_ERROR', e.message, 400);
  }
}

export function rejectApproval(req, res) {
  try {
    const { tenantId, operator } = loadTenantContext(req);
    const { id } = req.params;
    const { note } = req.body || {};

    const existing = getApproval(tenantId, id);
    if (!existing) return operatorError(res, 'NOT_FOUND', `Approval ${id} not found`, 404);

    const user = resolveOperatorUser(operator);
    const approval = updateApprovalStatus({
      tenantId,
      approvalId: id,
      nextStatus: APPROVAL_STATES.REJECTED,
      actor: user,
      comments: note || ''
    });

    emitEvent({ tenantId, type: 'OPERATOR.APPROVAL.REJECTED', actor: operator.id, subject: id, payload: {} });
    return operatorSuccess(res, { approval });
  } catch (e) {
    return operatorError(res, 'REJECT_ERROR', e.message, 400);
  }
}
