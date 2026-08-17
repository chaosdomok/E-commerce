import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getProfile, isProfileComplete } from '@/lib/profile';
import { ProfileShell } from '@/components/site/profile-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile(supabase, user.id);

  if (!isProfileComplete(profile)) {
    redirect('/onboarding');
  }

  const { data: reservedBooks } = await supabase
    .from('books')
    .select('*')
    .eq('reserved_by', user.id)
    .eq('status', 'RESERVED')
    .order('created_at', { ascending: false });

  const reservations = reservedBooks ?? [];

  return (
    <ProfileShell profile={profile!}>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mój profil
        </h1>
        <p className="mt-2 text-zinc-400">
          Twoje dane uczniowskie na platformie SUE
        </p>
      </div>

      <Card className="mb-8 border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sue to-sue-deep text-xl font-bold text-white ring-2 ring-zinc-800">
              {profile!.initials ?? '??'}
            </div>
            <div>
              <CardTitle className="font-display text-2xl text-white">
                {profile!.full_name}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {profile!.school}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              Klasa {profile!.class}
            </Badge>
            {profile!.reputation_score != null &&
              profile!.reputation_score > 0 && (
                <Badge className="bg-sue/10 text-sue ring-1 ring-sue/30">
                  Reputacja: {profile!.reputation_score}
                </Badge>
              )}
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="font-display mb-4 text-xl font-semibold">
          Moje Rezerwacje
        </h2>
        <Card className="border-zinc-800 bg-zinc-900/40">
          {reservations.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/80">
                <BookOpen className="h-7 w-7 text-zinc-500" />
              </div>
              <p className="text-lg font-medium text-zinc-300">Brak rezerwacji</p>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                Gdy zarezerwujesz podręcznik, pojawi się on tutaj. Przeglądaj
                katalog, aby znaleźć potrzebne książki.
              </p>
              <Link
                href="/#catalog"
                className="mt-6 inline-flex min-h-[44px] h-11 items-center rounded-full bg-sue px-6 text-sm font-semibold text-white transition hover:bg-sue-deep"
              >
                Przeglądaj katalog
              </Link>
            </CardContent>
          ) : (
            <CardContent className="space-y-4 p-4 sm:p-6">
              {reservations.map((book) => (
                <div
                  key={book.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{book.title}</p>
                      <p className="mt-1 text-sm text-zinc-400">{book.author}</p>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
                      Oczekuje na odbiór
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                    {book.course_code ? (
                      <span className="rounded-full bg-zinc-800 px-3 py-1">
                        {book.course_code}
                      </span>
                    ) : null}
                    <span>{book.price} zł</span>
                    <span>{book.condition}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      </section>
    </ProfileShell>
  );
}
