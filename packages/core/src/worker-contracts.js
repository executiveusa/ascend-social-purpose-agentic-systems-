import crypto from 'node:crypto';
import { evaluateActionPolicy } from './policy.js';
import { emitEvent } from './events.js';

const DRY_RUN_MESSAGE = 'Hermes dispatch contract validated; live execution disabled.';

export function createHermesConnector() {
  return {
    type: 'hermes-connector',
    mode: 'dry-run',
    connect({ tenantId }) {
      if (!tenantId) throw new Error('tenantId is required');
      return {
        ok: true,
        mode: 'dry-run',
        tenantId,
        message: 'Hermes connector initialized in dry-run mode. Live connection deferred to Phase 4.',
        connectedAt: new Date().toISOString()
      };
    }
  };
}

export function createHermesProvisioner() {
  return {
    type: 'hermes-provisioner',
    mode: 'dry-run',
    provision({ tenantId, agentSlug, agentType = 'hermes', packVersion = '1.0.0' }) {
      if (!tenantId) throw new Error('tenantId is required');
      if (!agentSlug) throw new Error('agentSlug is required');
      const provisionId = `prov_${crypto.randomBytes(8).toString('hex')}`;
      try {
        emitEvent({
          tenantId,
          type: 'HERMES.PROVISION.DRY_RUN',
          actor: 'worker-contracts',
          subject: agentSlug,
          payload: { agentType, packVersion, provisionId }
        });
      } catch {}
      return {
        ok: true,
        mode: 'dry-run',
        status: 'queued',
        provisionId,
        tenantId,
        agentSlug,
        agentType,
        packVersion,
        message: DRY_RUN_MESSAGE,
        note: 'Live Docker provisioning deferred to Phase 4.'
      };
    }
  };
}

export function createHermesHealthChecker() {
  return {
    type: 'hermes-health-checker',
    mode: 'dry-run',
    check({ tenantId, agentSlug }) {
      if (!tenantId) throw new Error('tenantId is required');
      try {
        emitEvent({
          tenantId,
          type: 'HERMES.HEALTH.DRY_RUN',
          actor: 'worker-contracts',
          subject: agentSlug || 'all',
          payload: {}
        });
      } catch {}
      return {
        ok: true,
        mode: 'dry-run',
        status: 'healthy',
        tenantId,
        agentSlug: agentSlug || null,
        healthStatus: 'dry-run',
        message: 'Health check contract validated; live Hermes health check deferred to Phase 4.',
        checkedAt: new Date().toISOString()
      };
    }
  };
}

export function createHermesRunDispatcher() {
  return {
    type: 'hermes-run-dispatcher',
    mode: 'dry-run',
    dispatch({ tenantId, prompt = '', agentSlug, risk = 'green', contextSize = 0, actionType, actionPayload } = {}) {
      if (!tenantId) throw new Error('tenantId is required');

      // Policy-first: check explicit hard-blocked action types only.
      // The policy module's default "orange" fallthrough is for named action types, not general runs.
      const HARD_BLOCKED = ['GRANT_SUBMISSION', 'LEGAL_FINANCIAL_FILING', 'OUTBOUND_MESSAGE', 'PUBLIC_PUBLISHING', 'UNRESTRICTED_EXECUTION'];
      if (actionType && HARD_BLOCKED.includes(actionType)) {
        const policy = evaluateActionPolicy({ actionType, actionPayload: actionPayload || {} });
        return {
          ok: false,
          mode: 'dry-run',
          status: 'blocked',
          blocked: true,
          reason: policy.reason,
          approvalClass: policy.approvalClass,
          message: `Dispatch blocked by policy: ${policy.reason}`
        };
      }
      if (actionPayload?.unrestricted === true || actionPayload?.crossTenant === true) {
        const policy = evaluateActionPolicy({ actionType: actionPayload.crossTenant ? 'CROSS_TENANT' : 'UNRESTRICTED_EXECUTION', actionPayload });
        return {
          ok: false,
          mode: 'dry-run',
          status: 'blocked',
          blocked: true,
          reason: policy.reason,
          approvalClass: policy.approvalClass,
          message: `Dispatch blocked by policy: ${policy.reason}`
        };
      }

      if (risk === 'orange' || risk === 'red') {
        return {
          ok: false,
          mode: 'dry-run',
          status: 'blocked',
          blocked: true,
          reason: `Risk level ${risk} requires approval before dispatch.`,
          approvalClass: risk,
          message: `Dispatch blocked: ${risk} risk requires human approval.`
        };
      }

      const dispatchId = `dsp_${crypto.randomBytes(8).toString('hex')}`;
      try {
        emitEvent({
          tenantId,
          type: 'HERMES.RUN.DRY_RUN',
          actor: 'worker-contracts',
          subject: dispatchId,
          payload: { risk, agentSlug: agentSlug || null, contextSize, mode: 'dry-run' }
        });
      } catch {}

      return {
        ok: true,
        mode: 'dry-run',
        status: 'queued',
        dispatchId,
        tenantId,
        agentSlug: agentSlug || null,
        risk,
        message: DRY_RUN_MESSAGE,
        note: 'Live Hermes execution deferred to Phase 4.'
      };
    }
  };
}
