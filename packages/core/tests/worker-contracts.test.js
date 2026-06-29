import { describe, it, expect, beforeEach } from 'vitest';
import { createHermesConnector, createHermesProvisioner, createHermesHealthChecker, createHermesRunDispatcher } from '../src/worker-contracts.js';
import { createRepositories } from '../../db/src/index.js';

beforeEach(() => {
  process.env.MISSION_STORAGE = 'memory';
  createRepositories({ forceNew: true });
});

describe('createHermesConnector', () => {
  it('returns dry-run connection result', () => {
    const connector = createHermesConnector();
    expect(connector.mode).toBe('dry-run');
    const result = connector.connect({ tenantId: 'test-org' });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('dry-run');
    expect(result.tenantId).toBe('test-org');
  });

  it('throws when tenantId missing', () => {
    const connector = createHermesConnector();
    expect(() => connector.connect({})).toThrow('tenantId is required');
  });
});

describe('createHermesProvisioner', () => {
  it('returns dry-run queued status', () => {
    const provisioner = createHermesProvisioner();
    expect(provisioner.mode).toBe('dry-run');
    const result = provisioner.provision({ tenantId: 'test-org', agentSlug: 'hermes-founder' });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('dry-run');
    expect(result.status).toBe('queued');
    expect(result.provisionId).toBeDefined();
  });

  it('throws when agentSlug missing', () => {
    const provisioner = createHermesProvisioner();
    expect(() => provisioner.provision({ tenantId: 'test-org' })).toThrow('agentSlug is required');
  });
});

describe('createHermesHealthChecker', () => {
  it('returns dry-run healthy result', () => {
    const checker = createHermesHealthChecker();
    expect(checker.mode).toBe('dry-run');
    const result = checker.check({ tenantId: 'test-org', agentSlug: 'hermes-founder' });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('dry-run');
    expect(result.healthStatus).toBe('dry-run');
  });
});

describe('createHermesRunDispatcher', () => {
  it('dispatches green run in dry-run mode', () => {
    const dispatcher = createHermesRunDispatcher();
    expect(dispatcher.mode).toBe('dry-run');
    const result = dispatcher.dispatch({ tenantId: 'test-org', prompt: 'summarize outcomes', risk: 'green' });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('dry-run');
    expect(result.status).toBe('queued');
    expect(result.dispatchId).toBeDefined();
  });

  it('dispatches yellow run in dry-run mode', () => {
    const dispatcher = createHermesRunDispatcher();
    const result = dispatcher.dispatch({ tenantId: 'test-org', prompt: 'draft board report', risk: 'yellow' });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('dry-run');
    expect(result.status).toBe('queued');
  });

  it('blocks orange run without approval', () => {
    const dispatcher = createHermesRunDispatcher();
    const result = dispatcher.dispatch({ tenantId: 'test-org', prompt: 'send email to donors', risk: 'orange' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.blocked).toBe(true);
  });

  it('blocks red run without approval', () => {
    const dispatcher = createHermesRunDispatcher();
    const result = dispatcher.dispatch({ tenantId: 'test-org', prompt: 'submit grant application', risk: 'red' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
  });

  it('blocks hard-blocked action types', () => {
    const dispatcher = createHermesRunDispatcher();
    const result = dispatcher.dispatch({
      tenantId: 'test-org',
      prompt: 'run internal scan',
      risk: 'green',
      actionType: 'GRANT_SUBMISSION'
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
  });

  it('is policy-first: hard block overrides risk level', () => {
    const dispatcher = createHermesRunDispatcher();
    const result = dispatcher.dispatch({
      tenantId: 'test-org',
      risk: 'green',
      actionType: 'UNRESTRICTED_EXECUTION',
      actionPayload: { unrestricted: true }
    });
    expect(result.ok).toBe(false);
  });

  it('throws when tenantId missing', () => {
    const dispatcher = createHermesRunDispatcher();
    expect(() => dispatcher.dispatch({})).toThrow('tenantId is required');
  });
});
