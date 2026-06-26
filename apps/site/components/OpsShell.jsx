'use client';
import { usePathname } from 'next/navigation';

const links = [
  ['Today', '/ops', 'What needs attention now'],
  ['Get Funding', '/ops/opportunities', 'Grants, credits, sponsors'],
  ['Review Actions', '/ops/approvals', 'Human approvals'],
  ['Founder Brain', '/ops/second-brain', 'Memory and notes'],
  ['Import AI Chats', '/ops/imports', 'LLM history importer'],
  ['Create Campaigns', '/ops/campaigns', 'Postiz-ready drafts'],
  ['Calls', '/ops/voice', 'Voice logs and follow-up'],
  ['Reports', '/ops/reports', 'Board and impact updates'],
  ['System Health', '/ops/settings', 'Tool connections'],
  ['ICM Files', '/ops/icm', 'Readable agent folders'],
  ['Flywheel', '/ops/flywheel', 'Repeatable upgrades'],
  ['Setup', '/ops/onboarding', 'Organization profile']
];

export function OpsShell({ children, title, subtitle }) {
  const pathname = usePathname();
  return (
    <div className="ops-layout">
      <aside className="sidebar">
        <a href="/" className="brand side-brand"><span className="logo">A3</span><span><strong>Mission OS</strong><small>Seattle social purpose</small></span></a>
        <div className="staff-mode">
          <span className="badge mint">Plain staff mode</span>
          <p>Tools stay under the hood. Work is organized by outcomes.</p>
        </div>
        <nav className="side-nav" aria-label="Operations navigation">
          {links.map(([label, href, help]) => (
            <a key={href} className={`side-link ${pathname === href ? 'active' : ''}`} href={href}>
              <strong>{label}</strong><small>{help}</small>
            </a>
          ))}
        </nav>
      </aside>
      <main className="ops-main">
        <div className="ops-top">
          <div className="ops-title">
            <span className="eyebrow">Human-in-command operations</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="top-actions">
            <a href="/ops/approvals" className="cta dark">Review queue</a>
            <a href="/login" className="cta ghost">Switch tenant</a>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
