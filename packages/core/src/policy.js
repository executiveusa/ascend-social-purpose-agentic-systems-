export const APPROVAL_CLASSES = {
  GREEN: 'green',
  YELLOW: 'yellow',
  ORANGE: 'orange',
  RED: 'red'
};

export const HARD_BLOCK_KEYWORDS = {
  GRANT_SUBMISSION: 'grant_submission',
  LEGAL_FINANCIAL_FILING: 'legal_financial_filing',
  OUTBOUND_MESSAGE: 'outbound_message',
  PUBLIC_PUBLISHING: 'public_publishing',
  UNRESTRICTED_EXECUTION: 'unrestricted_execution',
  CROSS_TENANT_ACCESS: 'cross_tenant_access'
};

export function evaluateActionPolicy({ actionType, actionPayload }) {
  if (actionType === 'GRANT_SUBMISSION' || (actionPayload && actionPayload.intent === 'submit_grant')) {
    return {
      allowed: false,
      reason: 'Hard block: Automatic grant submission is prohibited.',
      approvalClass: APPROVAL_CLASSES.RED
    };
  }

  if (actionType === 'LEGAL_FINANCIAL_FILING' || (actionPayload && actionPayload.intent === 'file_legal')) {
    return {
      allowed: false,
      reason: 'Hard block: Automatic legal or financial filing is prohibited.',
      approvalClass: APPROVAL_CLASSES.RED
    };
  }

  if (actionType === 'OUTBOUND_MESSAGE' || (actionPayload && actionPayload.intent === 'send_outbound')) {
    return {
      allowed: false,
      reason: 'Hard block: Automatic outbound message to donor/youth/family is prohibited.',
      approvalClass: APPROVAL_CLASSES.ORANGE
    };
  }

  if (actionType === 'PUBLIC_PUBLISHING' || (actionPayload && actionPayload.intent === 'publish_public')) {
    return {
      allowed: false,
      reason: 'Hard block: Public publishing without approval is prohibited.',
      approvalClass: APPROVAL_CLASSES.ORANGE
    };
  }

  if (actionType === 'UNRESTRICTED_EXECUTION' || (actionPayload && actionPayload.unrestricted === true)) {
    return {
      allowed: false,
      reason: 'Hard block: Unrestricted shell, browser, or tool execution is prohibited.',
      approvalClass: APPROVAL_CLASSES.RED
    };
  }

  if (actionPayload && actionPayload.crossTenant === true) {
    return {
      allowed: false,
      reason: 'Hard block: Cross-tenant file access is prohibited.',
      approvalClass: APPROVAL_CLASSES.RED
    };
  }

  if (actionType === 'GENERATE_DRAFT' || actionType === 'CREATE_ARTIFACT') {
    return {
      allowed: true,
      reason: 'Yellow: Action allowed as draft/artifact creation only.',
      approvalClass: APPROVAL_CLASSES.YELLOW
    };
  }

  if (actionType === 'READ_ONLY' || actionType === 'AUDIT_LOG') {
    return {
      allowed: true,
      reason: 'Green: Action allowed with audit.',
      approvalClass: APPROVAL_CLASSES.GREEN
    };
  }

  return {
    allowed: false,
    reason: 'Orange: Action requires explicit human approval.',
    approvalClass: APPROVAL_CLASSES.ORANGE
  };
}
