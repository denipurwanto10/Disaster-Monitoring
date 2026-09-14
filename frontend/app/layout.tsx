import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Disaster Monitoring Indonesia — Pantauan Gempa BMKG',
  description:
    'Dasbor operasional pemantauan gempa bumi Indonesia berbasis data realtime BMKG: peta interaktif, riwayat, dan statistik.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
