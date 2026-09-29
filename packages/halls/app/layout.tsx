import type { Metadata, Viewport } from 'next';
import './globals.css';
import { themeScript } from '@/lib/theme';
export const metadata: Metadata = {
  title: 'UBIO Halls',
  icons: { icon: '/favicon.svg' },
  description: 'Live student accommodation stock from A3, and the bookings prepared against it.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
