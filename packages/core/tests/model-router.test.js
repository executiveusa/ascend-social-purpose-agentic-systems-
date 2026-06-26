import { describe, expect, it } from 'vitest';
import { routeModel } from '../src/model-router.js';

describe('model router', () => {
  it('uses cheap model for low-risk formatting', () => {
    expect(routeModel({ prompt: 'format this note', risk: 'green' }).tier).toBe('cheap');
  });
  it('uses critical model for red risk', () => {
    expect(routeModel({ prompt: 'reason about youth data grant submission', risk: 'red' }).tier).toBe('critical');
  });
});
