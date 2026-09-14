import { isFrontendPreview } from '@/lib/preview';
import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { AppToaster } from '@/components/ui/app-toaster';
import { VerificationBanner } from '@/components/site/verification-banner';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Targi Książek 2026 | Samorząd Uczniowski',
  description:
    'Sprzedaj używane podręczniki i znajdź książki na kolejny rok szkolny. Targi Książek organizowane przez Samorząd Uczniowski.',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html data-scroll-behavior="smooth" lang="pl" className="w-full max-w-full">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} font-body antialiased w-full max-w-full overflow-x-hidden min-h-[100dvh] flex flex-col`}
      >
        {isFrontendPreview && (
          <div
            role="status"
            className="border-b border-border bg-elevated px-4 py-1.5 text-center text-xs text-muted-foreground"
          >
            Podgląd frontendu · dane przykładowe · logowanie i zapisy wyłączone
          </div>
        )}
        <VerificationBanner />
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
