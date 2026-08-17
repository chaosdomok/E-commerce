'use client';

import { useState } from 'react';
import { Navbar } from '@/components/site/navbar';
import { CommandPalette } from '@/components/ui/command-palette';
import type { Profile } from '@/lib/profile';

interface ProfileShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function ProfileShell({ profile, children }: ProfileShellProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <Navbar
        profile={profile}
        onSearchClick={() => setIsCommandPaletteOpen(true)}
      />
      <main className="mx-auto max-w-3xl w-full px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 sm:px-6">
        {children}
      </main>
      <CommandPalette
        books={[]}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
