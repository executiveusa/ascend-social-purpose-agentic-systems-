export default function sitemap() {
  const base = process.env.PUBLIC_SITE_URL || 'http://localhost:3000';
  return ['', '/login', '/ops'].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
