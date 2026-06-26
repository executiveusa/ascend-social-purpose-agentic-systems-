export const outcomeLanes = [
  { id: 'funding', label: 'Funding won', unit: '$', target: 50000 },
  { id: 'youth-served', label: 'Youth served', unit: 'people', target: 250 },
  { id: 'volunteers', label: 'Volunteers activated', unit: 'people', target: 50 },
  { id: 'sponsor-pipeline', label: 'Sponsor conversations', unit: 'contacts', target: 40 },
  { id: 'program-hours', label: 'Program hours delivered', unit: 'hours', target: 1200 }
];

export function summarizeOutcomes(events = []) {
  const totals = Object.fromEntries(outcomeLanes.map((lane) => [lane.id, 0]));
  for (const event of events) {
    if (event.lane && typeof totals[event.lane] === 'number') totals[event.lane] += Number(event.value || 0);
  }
  return outcomeLanes.map((lane) => ({ ...lane, value: totals[lane.id], progress: lane.target ? Math.min(100, Math.round((totals[lane.id] / lane.target) * 100)) : 0 }));
}
