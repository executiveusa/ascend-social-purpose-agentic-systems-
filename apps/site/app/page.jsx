import { PublicNav } from '../components/PublicNav';
import { tenantSite } from '../tenant.config';

const proof = [
  ['Frontend changes per client', 'Public pages, visuals, copy, schema, and AI-readable files are customized for each nonprofit.'],
  ['Backend stays shared', 'Approvals, ICM, opportunity scans, reports, imports, campaigns, and adapters improve centrally.'],
  ['One primary agent', 'ICM folders route the work. Models can change without rewriting the operating system.']
];

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: tenantSite.productName, applicationCategory: 'NonprofitOperationsPlatform', areaServed: tenantSite.region, audience: tenantSite.audience, offers: { '@type': 'Offer', category: 'AI operations system for nonprofits' } })}} />
      <main>
        <section className="hero refined">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Seattle youth + sports + social purpose</span>
              <h1>One calm AI operating system for the work nonprofits actually need to finish.</h1>
              <p className="lead">Funding, approvals, donors, calls, reports, campaigns, founder memory, and an AI-readable public site. Built once as a shared backend. Customized through the frontend and ICM files for each organization.</p>
              <div className="hero-actions">
                <a className="cta" href="/login">Open demo cockpit</a>
                <a className="cta ghost" href="#offer">View the deployment package</a>
              </div>
            </div>
            <div className="device-card" aria-label="Mission OS preview">
              <div className="device-top"><span></span><span></span><span></span></div>
              <div className="preview-pane">
                <span className="badge mint">Today</span>
                <h3>3 decisions need a human.</h3>
                {[
                  ['Review youth grant package', 'Red approval · signer needed'],
                  ['Start Google for Nonprofits readiness', 'Yellow review · documents needed'],
                  ['Draft sponsor campaign', 'Orange review · no auto-send']
                ].map(([a,b]) => <div className="preview-row clean" key={a}><span><strong>{a}</strong><small>{b}</small></span><span className="score-chip">Open</span></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="system" className="section surface">
          <div className="container">
            <div className="section-heading"><span className="eyebrow">Repeatable deployment</span><h2>Stop selling websites. Ship a mission operating layer.</h2><p>The public site is part of the package because AI agents, grant reviewers, donors, and volunteers need a readable front door. The operating backend remains productized and reusable.</p></div>
            <div className="grid cols-3">{proof.map(([title, text]) => <Card key={title} title={title} text={text} />)}</div>
          </div>
        </section>

        <section id="outcomes" className="section">
          <div className="container split">
            <div><span className="eyebrow">Nontechnical by default</span><h2>Users choose outcomes, not agents.</h2><p>No one has to understand MCP, Pi, Absurd, Sandcastle, Postiz, or model routing. Staff see clear buttons: find funding, prepare application, grow donors, coordinate volunteers, report impact, and review before sending.</p></div>
            <div className="grid">
              {['Find funding', 'Prepare application', 'Grow donors', 'Report impact'].map((x, i) => <div className="card outcome-card" key={x}><span className="score-chip">0{i+1}</span><h3>{x}</h3><p>Every action writes to an ICM stage, creates an audit trail, and waits for human approval when needed.</p></div>)}
            </div>
          </div>
        </section>

        <section id="offer" className="section surface">
          <div className="container">
            <div className="card offer-card">
              <span className="badge gold">Seattle Social Purpose OS</span>
              <h2>{tenantSite.offerTitle}</h2>
              <p>{tenantSite.offerBody}</p>
              <div className="grid cols-4">
                {['AI-ready website', 'Seattle opportunity engine', 'Founder Second Brain', 'Postiz campaigns', 'Voice/call lane', 'Approval/audit trail', 'ICM workspace', 'Flywheel hosting'].map((x) => <div className="mini-tile" key={x}>{x}</div>)}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer"><div className="container">{tenantSite.productName} · Built for Seattle mission teams · llms.txt included</div></footer>
    </>
  );
}
function Card({ title, text }) { return <div className="card"><h3>{title}</h3><p>{text}</p></div>; }
