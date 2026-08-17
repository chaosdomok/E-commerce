import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { Toaster } from 'sonner';

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
  title: 'SUE — Giełda podręczników studenckich bez prowizji',
  description:
    'Wymieniaj, sprzedawaj i odkrywaj podręczniki bez prowizji. Stworzone dla studentów technicznych, którzy cenią cyfrową wolność.',
  openGraph: {
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark w-full max-w-full overflow-x-hidden">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} font-body antialiased w-full max-w-full overflow-x-hidden min-h-[100dvh] flex flex-col`}
      >
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#fafafa',
            },
          }}
        />
      </body>
    </html>
  );
}
