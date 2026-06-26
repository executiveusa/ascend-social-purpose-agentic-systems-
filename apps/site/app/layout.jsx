import './globals.css';

export const metadata = {
  title: 'Asc3nd Social Purpose OS',
  description: 'Seattle-native AI operations system for nonprofits and social-purpose teams.',
  metadataBase: new URL(process.env.PUBLIC_SITE_URL || 'http://localhost:3000')
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
