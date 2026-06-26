export function PublicNav() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a className="brand" href="/">
          <span className="logo">A3</span>
          <span>Asc3nd Social Purpose OS</span>
        </a>
        <div className="nav-links">
          <a href="/#system">System</a>
          <a href="/#outcomes">Outcomes</a>
          <a href="/#offer">Offer</a>
          <a href="/login" className="cta dark">Ops login</a>
        </div>
      </div>
    </nav>
  );
}
