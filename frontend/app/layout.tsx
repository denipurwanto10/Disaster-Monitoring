import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../components/design.css';

export const metadata: Metadata = {
  title: 'Disaster Monitoring Indonesia — Pantauan Gempa BMKG',
  description:
    'Dasbor operasional pemantauan gempa bumi Indonesia berbasis data realtime BMKG: peta interaktif, riwayat, dan statistik.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f2f4f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
