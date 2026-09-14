import { ProfileSections } from '@/components/site/profile-sections';
import { CopyCodeButton } from '@/components/site/copy-code-button';
import { isFrontendPreview } from '@/lib/preview';
import {
  previewUser,
  previewDbProfile,
  previewBooks,
  previewReservations,
} from '@/mocks/frontend';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BookOpen,
  Clock,
  Tag,
  CheckCircle,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProfileShell } from '@/components/site/profile-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileEditForm } from '@/components/site/profile-edit-form';
import { ReservationCountdown } from '@/components/site/reservation-countdown';
import { PasswordChangeForm } from '@/components/site/password-change-form';
import {
  formatReservationExpiry,
  getReservationDisplayStatus,
} from '@/lib/frontend/reservation-display';
import { normalizePayoutMethod } from '@/lib/frontend/payout-display';
import { getEffectiveRole } from '@/lib/roles';
import { CancelReservationButton } from '@/components/site/cancel-reservation-button';
import { normalizePolishPhone } from '@/lib/profile';
import { formatInventoryNumber } from '@/lib/inventory-number';
import { isAccountBlocked } from '@/lib/account-access';
import { formatWholePln } from '@/lib/money';

export const dynamic = 'force-dynamic';

type ReservationCardData = {
  id: string;
  code: string;
  status: string;
  fulfillmentStatus: 'PREPARING' | 'READY';
  reservedUntil: Date | null;
  items: Array<{
    bookId: string;
    book: {
      id: string;
      inventoryNumber: number;
      title: string;
      author: string | null;
      courseCode: string | null;
      price: number | string | { toString(): string };
    };
  }>;
};

function hasReservationExpired(reservedUntil: Date | null) {
  return reservedUntil
    ? reservedUntil.getTime() <= new Date().getTime()
    : false;
}

function ActiveReservationCard({
  reservation,
}: {
  reservation: ReservationCardData;
}) {
  const formattedDeadline = reservation.reservedUntil
    ? formatReservationExpiry(reservation.reservedUntil)
    : 'Brak terminu';
  const isExpired = hasReservationExpired(reservation.reservedUntil);
  const displayStatus = getReservationDisplayStatus(
    reservation.status,
    reservation.fulfillmentStatus,
    isExpired,
  );
  const statusClass = {
    success: `${reservation.status === 'ACTIVE' ? 'reservation-status-pulse ' : ''}border-green-border bg-green-soft text-green-ink`,
    warning: 'border-warning/20 bg-warning/10 text-warning',
    danger: 'border-danger/20 bg-danger/10 text-danger',
    muted: 'border-border bg-surface-soft text-muted-foreground',
  }[displayStatus.tone];
  const totalPrice = reservation.items.reduce(
    (sum, item) => sum + Number(item.book.price),
    0,
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug text-foreground">
            Rezerwacja {reservation.code}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {reservation.items.length}{' '}
            {reservation.items.length === 1 ? 'książka' : 'książki'}
          </p>
        </div>
        <Badge
          className={`${statusClass} shrink-0 border`}
        >
          {displayStatus.tone === 'danger' ? (
            <Clock className="mr-1 size-3" />
          ) : (
            <CheckCircle className="mr-1 size-3" />
          )}
          {displayStatus.label}
        </Badge>
      </div>

      <div className="mt-4 rounded-xl border border-green-border bg-green-soft p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-green-ink">
          Kod rezerwacji
        </p>
        <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
          <strong className="min-w-0 break-all font-mono text-xl font-bold tracking-[0.08em] text-foreground sm:text-2xl">
            {reservation.code}
          </strong>
          <CopyCodeButton code={reservation.code} />
        </div>
      </div>

      <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface-soft px-3">
        {reservation.items.map((item) => (
          <li key={item.bookId} className="py-3">
            <p className="font-mono text-[11px] font-semibold text-green-ink">
              {formatInventoryNumber(item.book.inventoryNumber)}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {item.book.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[item.book.author, item.book.courseCode]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3.5">
        <Clock className="size-5 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Rezerwacja ważna do</p>
          <p className="mt-0.5 font-semibold text-warning">
            {formattedDeadline}
          </p>
          {reservation.reservedUntil && !isExpired && (
            <ReservationCountdown
              expiresAt={reservation.reservedUntil.toISOString()}
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">
          Do zapłaty przy odbiorze:
        </span>
        <strong className="text-lg font-bold text-foreground">
          {formatWholePln(totalPrice)}
        </strong>
      </div>

      {displayStatus.canCancel && (
        <CancelReservationButton
          reservationId={reservation.id}
          bookCount={reservation.items.length}
        />
      )}
    </article>
  );
}

export default async function ProfilePage() {
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

  const [profile, myBooks, myReservations] = await Promise.all([
    isFrontendPreview
      ? Promise.resolve(previewDbProfile)
      : (await import('@/lib/prisma')).prisma.profile.findUnique({
          where: { id: user.id },
        }),
    isFrontendPreview
      ? Promise.resolve(previewBooks.filter((book) => book.sellerId === user.id))
      : (await import('@/lib/prisma')).prisma.book.findMany({
          where: { sellerId: user.id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            isbn: true,
            title: true,
            author: true,
            status: true,
            price: true,
            basePrice: true,
            payoutPaidAt: true,
          },
        }),
    isFrontendPreview
      ? Promise.resolve([
          {
            id: 'preview-reservation-1',
            code: previewReservations[0]?.reservationCode || 'REZ-PODGLAD',
            status: 'ACTIVE',
            fulfillmentStatus: 'READY' as const,
            reservedUntil: previewReservations[0]?.reservedUntil || null,
            items: previewReservations.map((book) => ({
              bookId: book.id,
              book: {
                id: book.id,
                inventoryNumber: book.inventoryNumber,
                title: book.title,
                author: book.author,
                courseCode: book.courseCode,
                price: book.price,
              },
            })),
          },
        ])
      : (await import('@/lib/prisma')).prisma.reservation.findMany({
          where: {
            userId: user.id,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            code: true,
            status: true,
            fulfillmentStatus: true,
            reservedUntil: true,
            items: {
              select: {
                bookId: true,
                book: {
                  select: {
                    id: true,
                    inventoryNumber: true,
                    title: true,
                    author: true,
                    courseCode: true,
                    price: true,
                  },
                },
              },
            },
          },
        }),
  ]);

  if (!profile) {
    redirect('/');
  }

  if (!isFrontendPreview && Boolean((profile as { isBlocked?: boolean }).isBlocked)) {
    redirect('/auth/blocked');
  }

  const effectiveRole = isFrontendPreview
    ? profile.role
    : getEffectiveRole('email' in user ? user.email : profile.email, profile.role);

  const activeReservationCount = myReservations.filter(
    (reservation) =>
      reservation.status === 'ACTIVE' &&
      !hasReservationExpired(reservation.reservedUntil),
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <Badge className="bg-warning/10 text-warning ring-1 ring-warning/20">
            <Clock className="h-3 w-3 mr-1" /> Oczekuje na akceptację
          </Badge>
        );
      case 'AVAILABLE':
        return (
          <Badge className="bg-success/10 text-success ring-1 ring-success/20">
            <CheckCircle className="h-3 w-3 mr-1" /> Wystawiona w katalogu
          </Badge>
        );
      case 'RESERVED':
        return (
          <Badge className="bg-info/10 text-info ring-1 ring-info/20">
            <Clock className="h-3 w-3 mr-1" /> Zarezerwowana przez kupującego
          </Badge>
        );
      case 'SOLD':
        return (
          <Badge className="bg-lavender/10 text-lavender ring-1 ring-lavender/20">
            <CheckCircle className="h-3 w-3 mr-1" /> Sprzedana (do wypłaty)
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-danger/10 text-danger ring-1 ring-danger/20">
            <XCircle className="h-3 w-3 mr-1" /> Odrzucona przez administratora
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalEarnings = myBooks
    .filter((b) => b.status === 'SOLD' && !b.payoutPaidAt)
    .reduce(
      (sum, b) => sum + (b.basePrice ? Number(b.basePrice) : Number(b.price)),
      0,
    );

  const pendingEarnings = myBooks
    .filter((b) => b.status === 'AVAILABLE' || b.status === 'RESERVED')
    .reduce(
      (sum, b) => sum + (b.basePrice ? Number(b.basePrice) : Number(b.price)),
      0,
    );

  // Map to format required by ProfileShell
  const profileCompat = {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    class: profile.class,
    school: profile.school,
    initials: profile.initials,
    phone: profile.phone,
    reputation_score: profile.reputationScore,
    role: effectiveRole,
    created_at: profile.createdAt ? profile.createdAt.toISOString() : null,
    updated_at: profile.updatedAt ? profile.updatedAt.toISOString() : null,
    department: profile.department,
  };

  return (
    <ProfileShell profile={profileCompat}>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-sue-soft text-xl font-semibold text-sue">
            {profile.initials || 'SU'}
          </div>
          <div>
            <p className="eyebrow">Twój profil</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {profile.fullName || 'Moje konto'}
            </h1>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {profile.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {effectiveRole === 'head_admin' ? 'Główny administrator' : effectiveRole === 'admin' ? 'Administrator' : 'Użytkownik'}
              {profile.class ? ` · Klasa ${profile.class}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          {(effectiveRole === 'admin' || effectiveRole === 'head_admin') && (
            <Link href="/admin" className="secondary-link">
              Panel administratora
            </Link>
          )}
          <Link href="/dodaj-ksiazke" className="primary-link">
            <PlusCircle className="size-4" />
            Wystaw podręcznik
          </Link>
        </div>
      </div>
      <ProfileSections
        overview={
          <div className="space-y-8">
            <div className="grid gap-5 rounded-xl border border-border bg-elevated p-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Aktywne rezerwacje
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {activeReservationCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Moje podręczniki
                </p>
                <p className="mt-2 text-3xl font-semibold">{myBooks.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Sprzedane · do wypłaty
                </p>
                <p className="mt-2 text-3xl font-semibold text-sue">
                  {formatWholePln(totalEarnings)}
                </p>
              </div>
            </div>
            <div>
              {' '}
              {/* Active Reservations Section */}
              <section className="mb-12">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sue" />
                    Moje rezerwacje ({myReservations.length})
                  </h2>
                </div>

                {myReservations.length === 0 ? (
                  <Card className="border-border bg-surface">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <p className="text-base font-semibold text-foreground">
                        Nie masz jeszcze żadnych rezerwacji.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                        Przeglądaj katalog podręczników i zarezerwuj potrzebne
                        pozycje, aby odebrać je w punkcie stacjonarnym.
                      </p>
                      <Link
                        href="/katalog"
                        className="mt-4 inline-flex items-center rounded-xl bg-sue px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-sue-deep"
                      >
                        Przeglądaj katalog
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myReservations.map((reservation) => (
                      <ActiveReservationCard
                        key={reservation.id}
                        reservation={reservation}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        }
        account={
          <>
            {' '}
            {/* Profile Overview Card & Edit Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              <Card className="lg:col-span-1 border-border bg-surface ">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl    text-xl font-bold text-foreground shadow-inner">
                      {profile.initials ?? '??'}
                    </div>
                    <div>
                      <CardTitle className="font-display text-xl text-foreground">
                        {profile.fullName}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-xs">
                        {profile.email}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-xs border-t border-border pt-3">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Typ konta:</span>
                      <span className="font-medium text-foreground">
                        {profile.accountType === 'other'
                          ? 'Pozostałe osoby'
                          : 'Uczeń szkoły'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Szkoła:</span>
                      <span className="font-medium text-foreground">
                        {profile.school || 'Nie określono'}
                      </span>
                    </div>
                    {profile.class && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Klasa:</span>
                        <span className="font-medium text-foreground">
                          Klasa {profile.class}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Telefon:</span>
                      <span className="font-medium text-foreground">
                        {normalizePolishPhone(profile.phone) || profile.phone || 'Brak'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        Forma wypłaty:
                      </span>
                      <span className="font-medium text-success">
                        {normalizePayoutMethod(profile.refundMethod)}
                      </span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Sprzedane i do wypłaty:
                      </span>
                      <span className="font-bold text-success">
                        {formatWholePln(totalEarnings)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Wystawione (w toku):
                      </span>
                      <span className="font-bold text-foreground">
                        {formatWholePln(pendingEarnings)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Edit data component */}
              <div className="lg:col-span-2">
                <ProfileEditForm profile={profile} />
                <PasswordChangeForm />
              </div>
            </div>
          </>
        }
        reservations={
          <>
            {' '}
            {/* Active Reservations Section */}
            <section className="mb-12">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-sue" />
                  Moje rezerwacje ({myReservations.length})
                </h2>
              </div>

              {myReservations.length === 0 ? (
                <Card className="border-border bg-surface">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      Nie masz jeszcze żadnych rezerwacji.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Przeglądaj katalog podręczników i zarezerwuj potrzebne
                      pozycje, aby odebrać je w punkcie stacjonarnym.
                    </p>
                    <Link
                      href="/katalog"
                      className="mt-4 inline-flex items-center rounded-xl bg-sue px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-sue-deep"
                    >
                      Przeglądaj katalog
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myReservations.map((reservation) => (
                    <ActiveReservationCard
                      key={reservation.id}
                      reservation={reservation}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        }
        books={
          <>
            {' '}
            {/* My Listed Books Section */}
            <section>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Tag className="h-5 w-5 text-success" />
                  Wystawione przeze mnie podręczniki ({myBooks.length})
                </h2>
              </div>

              {myBooks.length === 0 ? (
                <Card className="border-border bg-surface">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      Nie wystawiłeś jeszcze żadnego podręcznika.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Masz stare podręczniki, których już nie potrzebujesz?
                      Wystaw je w kilka sekund i odbierz pieniądze po sprzedaży!
                    </p>
                    <Link
                      href="/dodaj-ksiazke"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sue px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-sue-deep"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Wystaw pierwszą książkę
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myBooks.map((book) => (
                    <div
                      key={book.id}
                      className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex flex-col items-start gap-2 mb-2">
                          <span className="break-all text-xs text-muted-foreground font-mono">
                            {book.isbn ? `ISBN: ${book.isbn}` : 'Brak ISBN'}
                          </span>
                          {book.status === 'SOLD' && book.payoutPaidAt ? <Badge className="bg-success/10 text-success">Sprzedana · wypłacona</Badge> : getStatusBadge(book.status)}
                        </div>
                        <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1">
                          {book.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          {book.author}
                        </p>
                      </div>

                      <div className="border-t border-border pt-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-xs">
                            Twoja cena (bazowa):
                          </span>
                          <span className="mt-1 block text-base font-bold text-foreground">
                            {formatWholePln(
                              book.basePrice
                                ? Number(book.basePrice)
                                : Number(book.price),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        }
      />
    </ProfileShell>
  );
}
