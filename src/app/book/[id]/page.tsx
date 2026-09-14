import { BookCover } from '@/components/site/book-card';
import { isFrontendPreview } from '@/lib/preview';
import { previewUser, previewProfile, previewBooks } from '@/mocks/frontend';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag } from 'lucide-react';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/profile';
import { Badge } from '@/components/ui/badge';
import { BookDetailCartButton } from '@/components/site/book-detail-cart-button';
import { formatWholePlnAmount } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = isFrontendPreview
    ? previewBooks.find((book) => book.id === id)
    : await (await import('@/lib/prisma')).prisma.book.findUnique({
        where: { id },
        select: { title: true, author: true },
      });

  if (!book) {
    return { title: 'Podręcznik nie znaleziony | SUE' };
  }

  return {
    title: `${book.title} – ${book.author} | SUE`,
    description: `Kup używany podręcznik ${book.title} na szkolnym kiermaszu SUE.`,
  };
}

export default async function BookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = isFrontendPreview ? null : await createClient();
  const {
    data: { user },
  } = isFrontendPreview
    ? { data: { user: previewUser } }
    : await supabase!.auth.getUser();

  const [profile, book] = await Promise.all([
    isFrontendPreview
      ? Promise.resolve(previewProfile)
      : user
        ? getProfile(supabase!, user.id, 'email' in user ? user.email : undefined)
        : Promise.resolve(null),
    isFrontendPreview
      ? Promise.resolve(previewBooks.find((b) => b.id === id) ?? null)
      : (await import('@/lib/prisma')).prisma.book.findUnique({
          where: { id },
          include: {
            seller: {
              select: {
                class: true,
                school: true,
                accountType: true,
              },
            },
          },
        }),
  ]);

  if (!book) {
    notFound();
  }

  const isAvailable = book.status === 'AVAILABLE' && !book.reservedByUserId;
  const isOwner = user && book.sellerId === user.id;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-sue selection:text-primary-foreground flex flex-col justify-between">
      <div>
        <Navbar profile={profile} />

        {/* Back breadcrumb */}
        <div className="border-b border-border bg-surface ">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-3.5">
            <Link
              href="/katalog"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-sue" />
              Wróć do katalogu podręczników
            </Link>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            {/* Book Cover (5 cols) */}
            <div className="md:col-span-5">
              <div className="sticky top-24">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-surface border border-border  flex items-center justify-center">
                  <BookCover
                    title={book.title}
                    url={book.coverUrl}
                    subject={book.courseCode}
                    className="absolute inset-0"
                  />

                  {/* Floating Status Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-surface text-foreground border border-border  px-3 py-1 text-xs">
                      Stan: {book.condition}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Info & Reservation Action (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                {/* Subject & Category */}
                {book.courseCode && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sue uppercase tracking-wider bg-sue/10 border border-sue/20 px-3 py-1 rounded-xl">
                    <Tag className="h-3 w-3" />
                    {book.courseCode}
                  </span>
                )}

                <div>
                  <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {book.title}
                  </h1>
                  <p className="mt-2 text-base sm:text-lg text-foreground font-medium">
                    Autor: <span className="text-foreground">{book.author}</span>
                  </p>
                </div>

                {/* Price box */}
                <div className="border-b border-border py-5 ">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                    Cena zakupu na kiermaszu
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-4xl sm:text-5xl font-extrabold text-foreground">
                      {formatWholePlnAmount(Number(book.price))}
                    </span>
                    <span className="text-xl font-bold text-sue">PLN</span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="border-b border-border py-3 space-y-1">
                    <span className="text-muted-foreground font-medium">
                      Numer ISBN:
                    </span>
                    <p className="font-mono text-foreground text-sm">
                      {book.isbn || 'Brak w zgłoszeniu'}
                    </p>
                  </div>

                  <div className="border-b border-border py-3 space-y-1">
                    <span className="text-muted-foreground font-medium">
                      Stan egzemplarza:
                    </span>
                    <p className="text-foreground text-sm font-semibold">
                      {book.condition}
                    </p>
                  </div>

                  <div className="border-b border-border py-3 space-y-1">
                    <span className="text-muted-foreground font-medium">
                      Wystawiający:
                    </span>
                    <p className="text-foreground text-sm">
                      {book.seller?.accountType === 'other'
                        ? 'Pozostałe osoby'
                        : book.seller?.class
                          ? `Uczeń klasy ${book.seller.class}`
                          : 'Uczeń szkoły'}
                    </p>
                  </div>

                  <div className="border-b border-border py-3 space-y-1">
                    <span className="text-muted-foreground font-medium">
                      Lokalizacja odbioru:
                    </span>
                    <p className="text-foreground text-sm">
                      Sala nr 13
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-sue/20 bg-sue/5 p-4 flex items-start gap-3">
                  <Clock className="h-5 w-5 text-sue shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-foreground">
                      Dokładny termin odbioru znajdziesz po rezerwacji w profilu
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Po zarezerwowaniu podręcznik jest zablokowany dla Ciebie.
                      Z kodem rezerwacji zgłoś się do punktu kiermaszu, aby
                      opłacić i odebrać książkę.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action area */}
              <div className="pt-4 border-t border-border">
                <BookDetailCartButton
                  book={{
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    price: Number(book.price),
                    condition: book.condition,
                    course_code: book.courseCode,
                    cover_url: book.coverUrl,
                    seller_id: book.sellerId,
                  }}
                  currentUserId={user?.id}
                  isAvailable={isAvailable}
                  isOwnBook={Boolean(isOwner)}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
