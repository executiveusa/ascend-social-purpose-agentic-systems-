export const opportunityCatalog = [
  {
    id: 'google-for-nonprofits',
    name: 'Google for Nonprofits',
    type: 'platform-credit',
    region: 'National',
    audience: ['501c3', 'education', 'youth', 'community'],
    fitSignals: ['registered nonprofit', 'public website', 'mission statement', 'domain email'],
    nextAction: 'Verify eligibility, prepare nonprofit validation, and request access.',
    caution: 'Eligibility and product availability must be verified before any promise is made.',
    approvalClass: 'yellow',
    url: 'https://www.google.com/nonprofits/'
  },
  {
    id: 'google-ad-grants',
    name: 'Google Ad Grants',
    type: 'marketing-credit',
    region: 'National',
    audience: ['501c3', 'donations', 'program-recruitment', 'volunteers'],
    fitSignals: ['clear website', 'conversion goals', 'donation page', 'volunteer page'],
    nextAction: 'Audit site readiness, draft keyword plan, then prepare application.',
    caution: 'Requires compliant site and account management after approval.',
    approvalClass: 'orange',
    url: 'https://www.google.com/grants/'
  },
  {
    id: 'microsoft-nonprofits-ai',
    name: 'Microsoft nonprofit and AI resources',
    type: 'software-ai-credit',
    region: 'National / Seattle ecosystem',
    audience: ['501c3', 'youth', 'education', 'workforce', 'social-impact'],
    fitSignals: ['AI use case', 'data policy', 'staff training plan'],
    nextAction: 'Map programs to AI use cases and prepare responsible-AI readiness checklist.',
    caution: 'Program terms change; verify current eligibility before applying.',
    approvalClass: 'yellow',
    url: 'https://www.microsoft.com/en-us/nonprofits'
  },
  {
    id: 'techsoup',
    name: 'TechSoup validation and software marketplace',
    type: 'software-discounts',
    region: 'National',
    audience: ['501c3', 'small-nonprofit'],
    fitSignals: ['nonprofit documents', 'budget constraints', 'software needs'],
    nextAction: 'Prepare validation documents and software wishlist.',
    caution: 'Purchasing and eligibility should be reviewed by an authorized admin.',
    approvalClass: 'yellow',
    url: 'https://www.techsoup.org/'
  },
  {
    id: 'aws-nonprofit-cloud',
    name: 'AWS nonprofit cloud programs',
    type: 'cloud-credit',
    region: 'National',
    audience: ['data', 'web-apps', 'analytics', 'education'],
    fitSignals: ['cloud workload', 'security plan', 'technical owner'],
    nextAction: 'Estimate workload, document architecture, then check current credit programs.',
    caution: 'Cloud credits can create surprise costs if not governed.',
    approvalClass: 'orange',
    url: 'https://aws.amazon.com/government-education/nonprofits/'
  },
  {
    id: 'seattle-foundation',
    name: 'Seattle Foundation opportunity watch',
    type: 'local-funding-watch',
    region: 'Seattle / King County',
    audience: ['community', 'youth', 'equity', 'education'],
    fitSignals: ['King County impact', 'clear outcomes', 'community partners'],
    nextAction: 'Create funder-fit memo and monthly watch task.',
    caution: 'This is an opportunity watch lane, not a guaranteed open grant.',
    approvalClass: 'yellow',
    url: 'https://www.seattlefoundation.org/'
  },
  {
    id: 'king-county-youth',
    name: 'King County youth and community opportunity watch',
    type: 'local-government-watch',
    region: 'King County',
    audience: ['youth', 'sports', 'mentorship', 'violence-prevention', 'education'],
    fitSignals: ['serves King County youth', 'program attendance data', 'safety policy'],
    nextAction: 'Track open RFPs, prepare core narrative, budget, outcomes, and partner letters.',
    caution: 'Government applications need authorized review and document retention.',
    approvalClass: 'red',
    url: 'https://kingcounty.gov/'
  },
  {
    id: 'city-seattle-youth',
    name: 'City of Seattle youth/community opportunity watch',
    type: 'local-government-watch',
    region: 'Seattle',
    audience: ['youth', 'sports', 'parks', 'community-safety', 'arts'],
    fitSignals: ['Seattle neighborhood served', 'program calendar', 'community benefit'],
    nextAction: 'Build a reusable Seattle program profile and monitor open opportunities.',
    caution: 'Applications and public claims require human approval.',
    approvalClass: 'red',
    url: 'https://www.seattle.gov/'
  },
  {
    id: 'corporate-sponsors-seattle',
    name: 'Seattle corporate sponsor map',
    type: 'sponsorship-pipeline',
    region: 'Seattle / Bellevue / Redmond',
    audience: ['sports', 'youth', 'events', 'STEM', 'workforce'],
    fitSignals: ['clear sponsorship packages', 'youth safety', 'photos/media release policy'],
    nextAction: 'Generate sponsor list, package one-pager, and warm outreach sequence.',
    caution: 'No outreach should send without approval and contact review.',
    approvalClass: 'orange',
    url: ''
  }
];

export function scoreOpportunity(opportunity, profile = {}) {
  const text = [profile.mission, profile.programs, profile.audience, profile.region, profile.legalStatus]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  let score = 50;
  for (const audience of opportunity.audience || []) {
    if (text.includes(audience.toLowerCase())) score += 10;
  }
  for (const signal of opportunity.fitSignals || []) {
    const tokens = signal.toLowerCase().split(/\W+/).filter(Boolean);
    if (tokens.some((t) => text.includes(t))) score += 4;
  }
  if (opportunity.region.toLowerCase().includes('seattle') && text.includes('seattle')) score += 12;
  if (opportunity.region.toLowerCase().includes('king') && text.includes('king')) score += 10;
  if (text.includes('sports') && opportunity.audience.includes('sports')) score += 12;
  if (text.includes('youth') && opportunity.audience.includes('youth')) score += 12;
  return Math.max(0, Math.min(100, score));
}

export function rankedOpportunities(profile = {}) {
  return opportunityCatalog
    .map((opportunity) => ({ ...opportunity, score: scoreOpportunity(opportunity, profile) }))
    .sort((a, b) => b.score - a.score);
}

export function buildOpportunityChecklist(opportunity) {
  return [
    'Confirm eligibility from the source website.',
    'Collect proof of nonprofit/social-purpose status.',
    'Check website readiness and AI-readable pages.',
    'Prepare mission, program, budget, and outcome summary.',
    'Create application draft inside ICM stage output.',
    `Route final action through ${opportunity.approvalClass.toUpperCase()} approval.`
  ];
}
