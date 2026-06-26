import { describe, expect, it } from 'vitest';
import { upsertContact, addInteraction, createPipelineItem, movePipelineItem, publicKindToPipeline } from '../src/crm.js';

describe('nonprofit CRM core', () => {
  it('deduplicates contacts by email and preserves tags', () => {
    let state = upsertContact([], { name: 'A', email: 'a@example.org', tags: ['volunteer'] });
    state = upsertContact(state.contacts, { name: 'A B', email: 'A@example.org', tags: ['donor'] });
    expect(state.contacts).toHaveLength(1);
    expect(state.contact.tags).toContain('volunteer');
    expect(state.contact.tags).toContain('donor');
  });
  it('creates interaction and pipeline item', () => {
    const contact = upsertContact([], { name: 'A', email: 'a@example.org' }).contact;
    const { interaction } = addInteraction([], { contactId: contact.id, subject: 'Hello' });
    const { item } = createPipelineItem([], { pipeline: 'volunteer', title: 'Screen A', contactId: contact.id });
    expect(interaction.contactId).toBe(contact.id);
    expect(item.stage).toBe('Applied');
  });
  it('moves pipeline stage', () => {
    const first = createPipelineItem([], { pipeline: 'funding', title: 'Grant' }).item;
    const { item } = movePipelineItem([first], first.id, 'Submitted');
    expect(item.stage).toBe('Submitted');
  });

  it('routes every public kind to the acceptance-criteria pipeline', () => {
    const cases = [
      ['volunteer', 'volunteer'],
      ['contact', 'general_inbox'],
      ['program-application', 'youth_program'],
      ['donation-intent', 'donor'],
      ['impact-story', 'sponsor']
    ];
    for (const [kind, pipeline] of cases) {
      const item = createPipelineItem([], { pipeline: publicKindToPipeline(kind), title: kind, contactId: 'c1' }).item;
      expect(item.pipeline, `${kind} -> ${pipeline}`).toBe(pipeline);
    }
  });
});
