const defaultPolicy = {
  cheap: process.env.DEFAULT_CHEAP_MODEL || 'local/qwen2.5:7b',
  standard: process.env.DEFAULT_REASONING_MODEL || 'openai/gpt-4.1-mini',
  critical: process.env.DEFAULT_CRITICAL_MODEL || 'anthropic/claude-sonnet-4.5'
};

export function estimateTaskComplexity(task = {}) {
  const text = [task.type, task.prompt, task.risk, task.contextSize].join(' ').toLowerCase();
  let points = 0;
  if (text.includes('legal') || text.includes('grant submission') || text.includes('youth') || text.includes('finance')) points += 5;
  if (text.includes('strategy') || text.includes('reason') || text.includes('compare')) points += 3;
  if (Number(task.contextSize || 0) > 8000) points += 3;
  if (Number(task.contextSize || 0) > 30000) points += 5;
  if (text.includes('summarize') || text.includes('classify') || text.includes('format')) points -= 2;
  return Math.max(0, points);
}

export function routeModel(task = {}, policy = defaultPolicy) {
  const risk = String(task.risk || '').toLowerCase();
  const complexity = estimateTaskComplexity(task);
  if (risk === 'red' || complexity >= 7) {
    return { tier: 'critical', model: policy.critical, reason: 'high-risk or complex reasoning task' };
  }
  if (risk === 'orange' || complexity >= 3) {
    return { tier: 'standard', model: policy.standard, reason: 'moderate-risk workflow or reasoning needed' };
  }
  return { tier: 'cheap', model: policy.cheap, reason: 'low-risk formatting, classification, or extraction task' };
}

export function buildLiteLlmRequest({ messages, model, temperature = 0.2 }) {
  return { model, messages, temperature };
}
