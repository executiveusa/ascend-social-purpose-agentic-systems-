import { describe, expect, it } from 'vitest';
import { buildReadiness, buildTodayPlan, computeMissionScore } from '../src/readiness.js';

describe('readiness engine', () => {
  it('scores nonprofit profile readiness and flags missing proof', () => {
    const readiness = buildReadiness({ orgName: 'Asc3nd Collective', region: 'Seattle / King County', mission: 'Youth sports mentorship and leadership', programs: 'sports, mentorship, leadership', audience: 'youth' });
    expect(readiness.length).toBeGreaterThan(3);
    expect(readiness.find((area) => area.id === 'nonprofit-proof').status).not.toBe('ready');
  });

  it('turns system state into plain next actions', () => {
    const today = buildTodayPlan({
      profile: { orgName: 'A', mission: '', programs: '' },
      opportunities: [{ name: 'Google for Nonprofits', nextAction: 'Verify eligibility' }],
      approvals: [{ status: 'pending', risk: 'red' }],
      outcomes: [],
      adapters: [{ name: 'Postiz', status: 'dry-run', requiredForProduction: true }]
    });
    expect(today[0].id).toBe('approvals');
    expect(today.map((item) => item.id)).toContain('readiness');
  });

  it('computes a bounded mission score', () => {
    expect(computeMissionScore({ readiness: [{ score: 100 }], approvals: [], outcomes: [{ id: 1 }], opportunities: [{ score: 90 }] })).toBeLessThanOrEqual(100);
  });
});
