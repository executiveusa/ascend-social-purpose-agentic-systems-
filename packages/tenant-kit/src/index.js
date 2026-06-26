export function createTenantTheme({ orgName, primary = '#15110b', accent = '#f3a51e', surface = '#fffaf0', region = 'Northwest' } = {}) {
  return { orgName, region, tokens: { primary, accent, surface, radius: '28px', font: 'Inter, ui-sans-serif, system-ui' } };
}
export function llmsTxt({ orgName, mission, programs = [], apiBaseUrl, tenant } = {}) {
  return `# ${orgName}\n\nMission: ${mission}\n\nPrograms:\n${programs.map((p) => `- ${p}`).join('\n')}\n\nMission OS endpoint: ${apiBaseUrl}/api/public/${tenant}\n`;
}
