const DEFAULT_SURFACES = [
  { alias: 'mission-os', models: ['cheap', 'standard', 'critical'], maxBudgetUsd: 50.0 },
  { alias: 'openwebui', models: ['cheap', 'standard'], maxBudgetUsd: 30.0 },
  { alias: 'hermes-founder', models: ['standard'], maxBudgetUsd: 20.0 },
  { alias: 'hermes-grants', models: ['standard'], maxBudgetUsd: 25.0 },
  { alias: 'hermes-comms', models: ['cheap'], maxBudgetUsd: 10.0 },
  { alias: 'hermes-programs', models: ['cheap'], maxBudgetUsd: 10.0 },
  { alias: 'hermes-volunteers', models: ['cheap'], maxBudgetUsd: 10.0 },
  { alias: 'hermes-impact', models: ['standard'], maxBudgetUsd: 15.0 }
];

export function buildLiteLlmConfig({ tenantId, surfaces = DEFAULT_SURFACES, monthlyBudgetUsd } = {}) {
  if (!tenantId) throw new Error('tenantId is required');

  const modelList = [
    { modelName: 'cheap', model: 'ollama/qwen2.5:7b', apiKeyEnvVar: null },
    { modelName: 'standard', model: 'openai/gpt-4.1-mini', apiKeyEnvVar: 'LITELLM_OPENAI_API_KEY' },
    { modelName: 'critical', model: 'anthropic/claude-sonnet-4.5', apiKeyEnvVar: 'LITELLM_ANTHROPIC_API_KEY' }
  ];

  return {
    tenantId,
    surfaces: surfaces.map((s) => ({ alias: s.alias, models: s.models, maxBudgetUsd: s.maxBudgetUsd })),
    modelList,
    monthlyBudgetUsd: monthlyBudgetUsd ?? null,
    generatedAt: new Date().toISOString(),
    note: 'Provider API keys are referenced via environment variable names only. No raw keys are stored in this config object.'
  };
}

export function validateLiteLlmConfig(config) {
  if (!config || typeof config !== 'object') return { valid: false, errors: ['config must be an object'] };
  const errors = [];
  if (!config.tenantId) errors.push('tenantId is required');
  if (!Array.isArray(config.surfaces) || config.surfaces.length === 0) errors.push('surfaces must be a non-empty array');
  if (!Array.isArray(config.modelList) || config.modelList.length === 0) errors.push('modelList must be a non-empty array');
  const serialized = JSON.stringify(config);
  if (/sk-[a-zA-Z0-9]{10,}/.test(serialized)) errors.push('config appears to contain a raw provider key');
  return { valid: errors.length === 0, errors };
}
