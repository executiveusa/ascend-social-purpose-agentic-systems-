'use client';
import { useEffect, useState } from 'react';
import { OpsShell } from '../../../components/OpsShell';
import { api } from '../../../lib/api';

export default function IcmPage() {
  const [tree, setTree] = useState([]);
  useEffect(() => { api('/api/icm/tree').then((d) => setTree(d.tree)).catch(() => {}); }, []);
  const renderedTree = tree.map((x) => `${x.type === 'dir' ? '📁' : '📄'} ${x.path}`).join('\n');
  return <OpsShell title="ICM workspace" subtitle="Folder structure is the agent architecture. Stage files are the control surface.">
    <div className="card"><pre className="code">{renderedTree}</pre></div>
  </OpsShell>;
}
