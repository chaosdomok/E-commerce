'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/site/navbar';
import { Hero } from '@/components/site/hero';
import { HowItWorks } from '@/components/site/how-it-works';
import { TextbookGrid } from '@/components/site/textbook-grid';
import { Footer } from '@/components/site/footer';
import { CommandPalette } from '@/components/ui/command-palette';
import type { Database } from '@/types/supabase';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

type Book = Database['public']['Tables']['books']['Row'];

export default function Home() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteBooks, setCommandPaletteBooks] = useState<Book[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleOAuthCallback() {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (code || error) {
        console.log('OAuth callback detected on root, redirecting to /auth/callback');
        // Redirect to proper callback route with all params
        const params = new URLSearchParams();
        if (code) params.set('code', code);
        if (error) params.set('error', error);
        const errorDescription = searchParams.get('error_description');
        if (errorDescription) params.set('error_description', errorDescription);
        const next = searchParams.get('next');
        if (next) params.set('next', next);

        router.push(`/auth/callback?${params.toString()}`);
      }
    }

    handleOAuthCallback();
  }, [searchParams, router]);

  const handleSearchClick = () => {
    setIsCommandPaletteOpen(true);
  };

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full flex flex-col bg-zinc-950 text-white overflow-x-hidden">
      <Navbar onSearchClick={handleSearchClick} />
      <main>
        <Hero />
        <HowItWorks />
        <TextbookGrid
          onBooksLoaded={setCommandPaletteBooks}
          onSearchClick={handleSearchClick}
        />
      </main>
      <Footer />
      <CommandPalette
        books={commandPaletteBooks}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
