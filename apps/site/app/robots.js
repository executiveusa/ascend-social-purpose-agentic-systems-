export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/' }], sitemap: `${process.env.PUBLIC_SITE_URL || 'http://localhost:3000'}/sitemap.xml` };
}
