export function normalizeLlmExport(sourceType = 'generic', payload = '') {
  if (typeof payload !== 'string') payload = JSON.stringify(payload, null, 2);
  const trimmed = payload.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((item, idx) => conversationToNote(item, idx, sourceType));
    if (Array.isArray(parsed.conversations)) return parsed.conversations.map((item, idx) => conversationToNote(item, idx, sourceType));
    if (parsed.mapping && parsed.title) return [chatgptMappingToNote(parsed, 0)];
    return [conversationToNote(parsed, 0, sourceType)];
  } catch {
    return markdownToNotes(trimmed, sourceType);
  }
}

function conversationToNote(item, idx, sourceType) {
  const title = safeTitle(item.title || item.name || `Imported conversation ${idx + 1}`);
  const body = extractText(item);
  return {
    title,
    filename: `${String(idx + 1).padStart(3, '0')}-${slug(title)}.md`,
    sourceType,
    body: `# ${title}\n\nSource: ${sourceType}\n\n${body}\n`
  };
}

function chatgptMappingToNote(item, idx) {
  const messages = Object.values(item.mapping || {})
    .map((node) => node.message)
    .filter(Boolean)
    .map((message) => {
      const role = message.author?.role || 'unknown';
      const parts = message.content?.parts || [];
      return `## ${role}\n\n${parts.join('\n\n')}`;
    })
    .join('\n\n');
  const title = safeTitle(item.title || `ChatGPT conversation ${idx + 1}`);
  return { title, filename: `${String(idx + 1).padStart(3, '0')}-${slug(title)}.md`, sourceType: 'chatgpt', body: `# ${title}\n\n${messages}\n` };
}

function markdownToNotes(text, sourceType) {
  const chunks = text.split(/\n(?=# )/g).filter(Boolean);
  return chunks.map((chunk, idx) => {
    const first = chunk.split('\n')[0].replace(/^#\s*/, '') || `Imported note ${idx + 1}`;
    const title = safeTitle(first);
    return { title, filename: `${String(idx + 1).padStart(3, '0')}-${slug(title)}.md`, sourceType, body: chunk.startsWith('#') ? chunk : `# ${title}\n\n${chunk}` };
  });
}

function extractText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value.messages)) return value.messages.map((m) => `## ${m.role || m.author || 'message'}\n\n${m.content || m.text || ''}`).join('\n\n');
  if (value.text) return value.text;
  if (value.content) return typeof value.content === 'string' ? value.content : JSON.stringify(value.content, null, 2);
  return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
}

function safeTitle(title) { return String(title).replace(/[\r\n#]/g, ' ').trim().slice(0, 90) || 'Imported note'; }
function slug(title) { return safeTitle(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'note'; }
