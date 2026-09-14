import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { isFrontendPreview } from '@/lib/preview';
import { previewUser } from '@/mocks/frontend';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserBookWizard } from '@/components/site/user-book-wizard';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { isAccountBlocked } from '@/lib/account-access';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Wystaw Podręcznik | SUE',
  description:
    'Wystaw swoje podręczniki szkolne na kiermaszu SUE w kilku prostych krokach.',
};

export default async function DodajKsiazkePage() {
  const supabase = isFrontendPreview ? null : await createClient();
  const {
    data: { user },
  } = isFrontendPreview
    ? { data: { user: previewUser } }
    : await supabase!.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (!isFrontendPreview && (await isAccountBlocked(user.id))) {
    redirect('/auth/blocked');
  }

  const isAllowed = isFrontendPreview
    ? true
    : await import('@/actions/submit-books').then(
        ({ checkSubmissionAllowed }) => checkSubmissionAllowed(),
      );

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-sue selection:text-primary-foreground flex flex-col">
      <Navbar authenticatedUserId={user.id} />
      <main className="page-container py-10">
        {!isAllowed ? (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-8 text-center max-w-xl mx-auto mt-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/20 text-warning mx-auto mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Dodawanie książek jest tymczasowo zamknięte
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Organizatorzy kiermaszu zamknęli przyjmowanie nowych zgłoszeń.
              Zajrzyj ponownie w kolejnym okresie zgłoszeniowym.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-xl bg-elevated px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-elevated transition"
            >
              Wróć do profilu
            </Link>
          </div>
        ) : (
          <UserBookWizard />
        )}
      </main>
      <Footer />
    </div>
  );
}
