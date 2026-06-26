export const readinessAreas = [
  {
    id: 'nonprofit-proof',
    title: 'Nonprofit eligibility proof',
    plainTitle: 'Prove we qualify',
    why: 'Google, Microsoft, TechSoup, funders, and government portals usually require legal status, EIN/fiscal sponsor proof, leadership/contact info, and a public mission footprint.',
    fields: ['legalStatus', 'orgName', 'region'],
    tasks: [
      'Upload determination letter, fiscal sponsor letter, or social-purpose incorporation proof.',
      'Confirm EIN or fiscal sponsor EIN with an authorized human.',
      'Store official organization address, officers, and signer names in the Evidence Room.'
    ],
    opportunityIds: ['google-for-nonprofits', 'techsoup', 'microsoft-nonprofits-ai']
  },
  {
    id: 'ai-readable-site',
    title: 'AI-readable public site',
    plainTitle: 'Make the website easy for people and AI to understand',
    why: 'Modern search, grant reviewers, donors, and AI agents need clear program pages, schema, sitemap, robots, and llms.txt. The site should explain mission, programs, outcomes, donations, volunteering, and safety policies without forcing anyone to search.',
    fields: ['mission', 'programs', 'audience'],
    tasks: [
      'Publish mission, programs, outcomes, volunteer, donation, and contact pages.',
      'Generate llms.txt, sitemap.xml, robots.txt, JSON-LD, and program schema.',
      'Add clear conversion goals for donors, volunteers, sponsors, and families.'
    ],
    opportunityIds: ['google-ad-grants']
  },
  {
    id: 'youth-safety',
    title: 'Youth safety and approval policy',
    plainTitle: 'Protect kids and staff',
    why: 'Youth-serving organizations need strict human review for minors, records, photos, calls, background checks, transportation, medical data, and public claims.',
    fields: ['audience', 'programs'],
    tasks: [
      'Create youth data policy, media release rules, incident escalation, and approved contact policy.',
      'Classify actions into green, yellow, orange, and red approval classes.',
      'Require signer review before submissions, outbound calls, donor promises, and public posts.'
    ],
    opportunityIds: ['king-county-youth', 'city-seattle-youth']
  },
  {
    id: 'funding-engine',
    title: 'Funding engine readiness',
    plainTitle: 'Get ready to apply for money',
    why: 'Grant applications move faster when mission, budget, program model, outcomes, partner letters, photos, impact proof, and standard narratives already exist.',
    fields: ['mission', 'programs', 'priorities'],
    tasks: [
      'Prepare reusable program narrative, outcome metrics, budget notes, and partner list.',
      'Create funder-fit memo for Seattle, King County, Washington, corporate sponsors, and tech credits.',
      'Run monthly opportunity scan and create approval-gated application workflows.'
    ],
    opportunityIds: ['seattle-foundation', 'king-county-youth', 'city-seattle-youth', 'corporate-sponsors-seattle']
  },
  {
    id: 'founder-brain',
    title: 'Founder Second Brain',
    plainTitle: 'Save what the founder already knows',
    why: 'Founders carry relationships, stories, strategy, funder context, donor history, and hard-earned judgment. Capturing that into an Obsidian-compatible vault makes the AI useful without retraining a custom model.',
    fields: ['founderName', 'priorities'],
    tasks: [
      'Import LLM conversations and founder notes into markdown.',
      'Tag contacts, funders, stories, decisions, and operating principles.',
      'Use vault notes as Layer 3 reference material, never as uncontrolled public content.'
    ],
    opportunityIds: []
  }
];

export const outcomeActions = [
  { id: 'find-funding', label: 'Find funding', plain: 'Show grants, credits, and sponsors we can act on this week.', stage: '02_opportunity_scan', risk: 'yellow', href: '/ops/opportunities' },
  { id: 'prepare-application', label: 'Prepare application', plain: 'Build a draft package, checklist, and evidence list for one opportunity.', stage: '03_grant_application', risk: 'red', href: '/ops/opportunities' },
  { id: 'grow-donors', label: 'Grow donors', plain: 'Draft sponsor and donor campaigns without sending anything automatically.', stage: '04_campaign_creation', risk: 'orange', href: '/ops/campaigns' },
  { id: 'coordinate-volunteers', label: 'Coordinate volunteers', plain: 'Create volunteer intake, follow-up messages, and event reminders for review.', stage: '04_campaign_creation', risk: 'orange', href: '/ops/campaigns' },
  { id: 'report-impact', label: 'Report impact', plain: 'Turn outcomes into a board, funder, or donor-ready update.', stage: '07_outcome_logging', risk: 'yellow', href: '/ops/reports' },
  { id: 'improve-system', label: 'Improve the system', plain: 'Convert repeated edits and staff feedback into better ICM source files.', stage: '08_workspace_learning', risk: 'yellow', href: '/ops/icm' }
];

export function scoreReadinessArea(area, profile = {}) {
  const total = area.fields.length || 1;
  const filled = area.fields.filter((field) => String(profile[field] || '').trim().length > 8).length;
  const percent = Math.round((filled / total) * 100);
  const status = percent >= 85 ? 'ready' : percent >= 45 ? 'needs-proof' : 'not-ready';
  return { ...area, score: percent, status, missingFields: area.fields.filter((field) => !String(profile[field] || '').trim()) };
}

export function buildReadiness(profile = {}) {
  return readinessAreas.map((area) => scoreReadinessArea(area, profile));
}

export function buildTodayPlan({ profile = {}, opportunities = [], approvals = [], outcomes = [], adapters = [] } = {}) {
  const readiness = buildReadiness(profile);
  const pendingApprovals = approvals.filter((item) => item.status === 'pending');
  const topOpportunity = opportunities[0];
  const incompleteReadiness = readiness.find((area) => area.status !== 'ready');
  const offlineAdapters = adapters.filter((adapter) => adapter.status !== 'configured' && adapter.requiredForProduction);
  const actions = [];

  if (incompleteReadiness) actions.push({ id: 'readiness', label: `Finish: ${incompleteReadiness.plainTitle}`, href: '/ops/onboarding', priority: 1, reason: incompleteReadiness.why });
  if (topOpportunity) actions.push({ id: 'opportunity', label: `Start: ${topOpportunity.name}`, href: '/ops/opportunities', priority: 2, reason: topOpportunity.nextAction });
  if (pendingApprovals.length) actions.push({ id: 'approvals', label: `Review ${pendingApprovals.length} pending action${pendingApprovals.length === 1 ? '' : 's'}`, href: '/ops/approvals', priority: 0, reason: 'External, money, youth, or public actions are waiting for human review.' });
  if (!outcomes.length) actions.push({ id: 'outcomes', label: 'Log this week’s outcomes', href: '/ops/reports', priority: 3, reason: 'Impact data is the raw material for grants, donors, board reports, and sponsor updates.' });
  if (offlineAdapters.length) actions.push({ id: 'adapters', label: 'Connect production tools', href: '/ops/settings', priority: 4, reason: `${offlineAdapters.length} required production adapter(s) are still in dry-run mode.` });

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

export function computeMissionScore({ readiness = [], approvals = [], outcomes = [], opportunities = [] } = {}) {
  const avgReadiness = readiness.length ? readiness.reduce((sum, area) => sum + area.score, 0) / readiness.length : 0;
  const approvalPenalty = approvals.filter((item) => item.status === 'pending' && ['orange', 'red'].includes(item.risk)).length * 4;
  const outcomeBoost = Math.min(20, outcomes.length * 2);
  const opportunityBoost = Math.min(15, opportunities.filter((item) => item.score >= 80).length * 3);
  return Math.max(0, Math.min(100, Math.round(avgReadiness + outcomeBoost + opportunityBoost - approvalPenalty)));
}
