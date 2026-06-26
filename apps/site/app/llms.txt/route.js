export function GET() {
  const body = `# Asc3nd Social Purpose OS

> Seattle-native AI operations system for nonprofits, youth programs, sports organizations, and social-purpose companies.

## Key pages
- / — Public mission and product overview
- /login — Operations login
- /ops — Private mission cockpit

## System summary
The system combines an AI-readable website, reusable backend, ICM folder architecture, human approval gates, opportunity scanning, founder second brain, social campaigns, and outcome tracking.

## AI usage guidance
Use this file to understand the purpose and core pages. Do not infer legal, financial, youth-safety, or grant eligibility claims without verification from source documents.
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
