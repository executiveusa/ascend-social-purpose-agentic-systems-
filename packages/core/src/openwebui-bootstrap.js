const REQUIRED_STARTER_AGENTS = [
  'founder',
  'grants',
  'comms',
  'programs',
  'board-packet',
  'donor-followup'
];

export function buildOpenWebuiBootstrap({ tenantId, litellmApiBase = 'http://litellm:4000', starterAgents = REQUIRED_STARTER_AGENTS } = {}) {
  if (!tenantId) throw new Error('tenantId is required');

  return {
    tenantId,
    litellmApiBase,
    enableSignup: false,
    starterAgents: [...starterAgents],
    workspace: { name: 'Mission OS AI Workspace', tenantId },
    generatedAt: new Date().toISOString(),
    note: 'Open WebUI connects only to LiteLLM. No direct provider keys are configured here.'
  };
}

export function validateOpenWebuiBootstrap(bootstrap) {
  if (!bootstrap || typeof bootstrap !== 'object') return { valid: false, errors: ['bootstrap must be an object'] };
  const errors = [];
  if (!bootstrap.tenantId) errors.push('tenantId is required');
  if (!bootstrap.litellmApiBase) errors.push('litellmApiBase is required');
  if (bootstrap.enableSignup !== false) errors.push('enableSignup must be false (auth is managed by Mission OS)');
  if (!Array.isArray(bootstrap.starterAgents) || bootstrap.starterAgents.length === 0) {
    errors.push('starterAgents must be a non-empty array');
  }
  if (/openai\.com|anthropic\.com/i.test(bootstrap.litellmApiBase || '')) {
    errors.push('litellmApiBase must not point directly at a third-party provider');
  }
  return { valid: errors.length === 0, errors };
}
