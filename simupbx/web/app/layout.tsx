import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimuPBX — Business Phone, Reimagined',
  description:
    'AI-powered cloud phone system for Kenya and beyond. Calls, queues, Zuri AI receptionist, M-Pesa on the IVR, WhatsApp follow-ups.',
  applicationName: 'SimuPBX',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#070B14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}
