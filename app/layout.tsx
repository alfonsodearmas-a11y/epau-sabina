import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppFrame } from '@/components/app/AppFrame';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dm-serif', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'EPAU Analyst Workbench',
  description: 'Economic Policy and Analysis Unit — internal analyst workbench',
};

// viewport-fit=cover lets body background extend under iOS safe areas; child
// layouts use env(safe-area-inset-*) padding to clear the notch and home bar.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0E1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSerif.variable} ${jetbrains.variable}`}>
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
