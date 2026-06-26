const { Plugin, Notice } = require('obsidian');
module.exports = class MissionOsSyncPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'send-active-note-to-mission-os',
      name: 'Send active note to Mission OS',
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return new Notice('No active note');
        const body = await this.app.vault.read(file);
        const apiUrl = localStorage.getItem('mission_os_api_url') || 'http://localhost:4000';
        const token = localStorage.getItem('mission_os_token') || '';
        await fetch(`${apiUrl}/api/second-brain/note`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ title: file.basename, body }) });
        new Notice('Sent to Mission OS');
      }
    });
  }
};
