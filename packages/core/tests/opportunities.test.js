import { describe, expect, it } from 'vitest';
import { rankedOpportunities } from '../src/opportunities.js';

describe('opportunity engine', () => {
  it('scores Seattle youth sports organizations with local opportunities', () => {
    const results = rankedOpportunities({ mission: 'Seattle youth sports mentorship in King County', legalStatus: '501c3' });
    expect(results[0].score).toBeGreaterThanOrEqual(70);
  });
});
