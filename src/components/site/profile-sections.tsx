'use client';
import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
export function ProfileSections({
  overview,
  reservations,
  books,
  account,
}: {
  overview: ReactNode;
  reservations: ReactNode;
  books: ReactNode;
  account: ReactNode;
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList
        aria-label="Sekcje profilu"
        className="mb-7 grid h-auto w-full grid-cols-2 gap-1 rounded-none border-b border-border p-0 pb-2 sm:flex sm:justify-start sm:gap-3"
      >
        {[
          ['overview', 'Przegląd'],
          ['reservations', 'Moje rezerwacje'],
          ['books', 'Moje książki'],
          ['account', 'Dane konta'],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="min-h-11 rounded-lg px-4 data-[state=active]:bg-green-soft data-[state=active]:text-green-ink"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="reservations">{reservations}</TabsContent>
      <TabsContent value="books">{books}</TabsContent>
      <TabsContent value="account">{account}</TabsContent>
    </Tabs>
  );
}
