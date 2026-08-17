'use client';

import { useState } from 'react';
import { Navbar } from '@/components/site/navbar';
import { Hero } from '@/components/site/hero';
import { HowItWorks } from '@/components/site/how-it-works';
import { TextbookGrid } from '@/components/site/textbook-grid';
import { Footer } from '@/components/site/footer';
import { CommandPalette } from '@/components/ui/command-palette';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

export default function Home() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteBooks, setCommandPaletteBooks] = useState<Book[]>([]);

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
