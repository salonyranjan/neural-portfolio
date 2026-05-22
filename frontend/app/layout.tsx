import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Neural Portfolio | Knowledge Graph',
  description: 'An interactive 3D neural network visualization of my portfolio',
  openGraph: {
    title: 'Neural Portfolio',
    description: 'An interactive 3D neural network visualization of my portfolio',
    type: 'website',
  },
};

// Moved themeColor to the viewport export
export const viewport: Viewport = {
  themeColor: '#050510',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#050510' }}>
        {children}
      </body>
    </html>
  );
}