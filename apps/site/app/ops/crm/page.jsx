'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function CrmPage() {
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pipelines, setPipelines] = useState({ templates: {}, items: [] });
  useEffect(() => {
    api('/api/crm/contacts').then((d) => setContacts(d.contacts || [])).catch(() => {});
    api('/api/crm/pipelines').then(setPipelines).catch(() => {});
    api('/api/crm/tasks').then((d) => setTasks(d.tasks || [])).catch(() => {});
  }, []);
  return <OpsShell title="People + pipelines" subtitle="A nonprofit-native CRM for donors, volunteers, sponsors, youth-program inquiries, and community partners.">
    <div className="grid cols-4">
      <div className="card"><span className="badge mint">CRM</span><h3>{contacts.length} people</h3><p>Every public form, call, campaign, and import can create or update a relationship record.</p></div>
      <div className="card"><span className="badge gold">Pipelines</span><h3>{pipelines.items?.length || 0} active items</h3><p>Funding, donors, volunteers, youth programs, and sponsors move through clear stages.</p></div>
      <div className="card"><span className="badge">Staff tasks</span><h3>{tasks.filter((t) => t.status !== 'completed').length} open</h3><p>Website submissions become specific next actions instead of disappearing into email.</p></div>
      <div className="card"><span className="badge">Native workflow</span><h3>Outcome-first</h3><p>Staff see next actions. The system handles CRM structure underneath.</p></div>
    </div>
    <div className="split section compact">
      <div className="card"><h3>People</h3><div className="stack">{contacts.length === 0 && <p>No contacts yet. Submit a public bridge form or import data.</p>}{contacts.map((c) => <div className="preview-row" key={c.id}><span><strong>{c.displayName}</strong><small>{c.email || c.phone || c.role}</small></span><span className="badge">{c.role || 'community'}</span></div>)}</div></div>
      <div className="card"><h3>Pipeline items</h3><div className="stack">{pipelines.items?.length === 0 && <p>No pipeline items yet.</p>}{pipelines.items?.map((item) => <div className="preview-row" key={item.id}><span><strong>{item.title}</strong><small>{item.pipeline} · {item.stage}</small></span><span className="badge gold">Open</span></div>)}</div></div>
    </div>
    <div className="card elevated"><h3>Open staff tasks</h3><div className="stack">{tasks.length === 0 && <p>No tasks yet. Public bridge submissions will create follow-up tasks automatically.</p>}{tasks.map((task) => <div className="preview-row" key={task.id}><span><strong>{task.title}</strong><small>{task.type} · due {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'soon'}</small></span><span className="badge mint">{task.status}</span></div>)}</div></div>
  </OpsShell>;
}
