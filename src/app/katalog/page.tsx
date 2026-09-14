import { isFrontendPreview } from '@/lib/preview';
import { previewUser, previewProfile, previewBooks } from '@/mocks/frontend';
import { CatalogExplorer } from '@/components/site/catalog-explorer';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/profile';
import { measurePerformance } from '@/lib/performance';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Katalog podręczników | SUE',
  description:
    'Przeglądaj, filtruj i rezerwuj dostępne podręczniki szkolne w kiermaszu SUE.',
};

async function loadCatalogData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderBy: any,
  skip: number,
  pageSize: number,
  page: number,
) {
  return measurePerformance(
    'catalogPageLoad',
    async () => {
      const [countResult, booksResult, subjectsResult, conditionsResult] = await Promise.all([
        prisma.book.count({ where }),
        prisma.book.findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            price: true,
            condition: true,
            courseCode: true,
            coverUrl: true,
            sellerId: true,
            createdAt: true,
          },
        }),
        prisma.book.findMany({
          where: { status: 'AVAILABLE', reservedByUserId: null, courseCode: { not: null } },
          select: { courseCode: true },
          distinct: ['courseCode'],
        }),
        prisma.book.findMany({
          where: { status: 'AVAILABLE', reservedByUserId: null },
          select: { condition: true },
          distinct: ['condition'],
        }),
      ]);

      return {
        totalCount: countResult,
        books: booksResult,
        availableSubjects: subjectsResult.map((s) => s.courseCode).filter(Boolean) as string[],
        availableConditions: conditionsResult.map((c) => c.condition).sort(),
      };
    },
    {
      getMetadata: (res) => ({
        page,
        pageSize,
        totalCount: res.totalCount,
        returnedBooks: res.books.length,
      }),
    },
  );
}

export default async function KatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = isFrontendPreview ? null : await createClient();
  const {
    data: { user },
  } = isFrontendPreview
    ? { data: { user: previewUser } }
    : await supabase!.auth.getUser();

  const profile = isFrontendPreview
    ? previewProfile
    : user
      ? await getProfile(
          supabase!,
          user.id,
          'email' in user ? user.email : null,
        )
      : null;

  // Resolve searchParams
  const params = (await searchParams) ?? {};

  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const subject = typeof params.subject === 'string' ? params.subject : '';
  const condition = typeof params.condition === 'string' ? params.condition : '';
  const minPrice = typeof params.minPrice === 'string' ? Number(params.minPrice) : NaN;
  const maxPrice = typeof params.maxPrice === 'string' ? Number(params.maxPrice) : NaN;
  const sort = typeof params.sort === 'string' ? params.sort : 'newest';
  
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const pageSize = 24;
  const skip = (Math.max(1, page) - 1) * pageSize;

  let books = [];
  let totalCount = 0;
  let availableSubjects: string[] = [];
  let availableConditions: string[] = [];

  if (isFrontendPreview) {
    let filtered = previewBooks.filter(
      (book) => book.status === 'AVAILABLE' && !book.reservedByUserId,
    );
    availableSubjects = Array.from(new Set(filtered.map((b) => b.courseCode).filter(Boolean))) as string[];
    availableSubjects.sort();
    availableConditions = Array.from(new Set(filtered.map((b) => b.condition))).sort();
    
    if (q) {
      const qLower = q.toLowerCase();
      filtered = filtered.filter(b => 
        b.title.toLowerCase().includes(qLower) || 
        (b.author || '').toLowerCase().includes(qLower) || 
        (b.isbn || '').toLowerCase().includes(qLower)
      );
    }
    if (subject && subject !== 'Wszystkie przedmioty') filtered = filtered.filter(b => b.courseCode === subject);
    if (condition && condition !== 'ALL') filtered = filtered.filter(b => b.condition === condition);
    if (!Number.isNaN(minPrice)) filtered = filtered.filter(b => Number(b.price) >= minPrice);
    if (!Number.isNaN(maxPrice)) filtered = filtered.filter(b => Number(b.price) <= maxPrice);

    if (sort === 'price_asc') filtered.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === 'price_desc') filtered.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title));
    totalCount = previewBooks.length;
    books = previewBooks.slice(skip, skip + pageSize);
    availableSubjects = Array.from(new Set(previewBooks.map((b) => b.courseCode).filter(Boolean))) as string[];
    availableConditions = Array.from(new Set(previewBooks.map((b) => b.condition))).sort();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: 'AVAILABLE',
      reservedByUserId: null,
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
        { isbn: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (subject && subject !== 'ALL') {
      where.courseCode = subject;
    }

    if (condition && condition !== 'ALL') {
      where.condition = condition;
    }

    if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
      where.price = {};
      if (!Number.isNaN(minPrice)) where.price.gte = minPrice;
      if (!Number.isNaN(maxPrice)) where.price.lte = maxPrice;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any = {};
    if (sort === 'price_asc') orderBy.price = 'asc';
    else if (sort === 'price_desc') orderBy.price = 'desc';
    else if (sort === 'title') orderBy.title = 'asc';
    else orderBy.createdAt = 'desc';

    const data = await loadCatalogData(where, orderBy, skip, pageSize, page);
    totalCount = data.totalCount;
    books = data.books;
    availableSubjects = data.availableSubjects;
    availableConditions = data.availableConditions;
  }

  const serializedBooks = books.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    price: Number(b.price),
    condition: b.condition,
    course_code: b.courseCode,
    cover_url: b.coverUrl,
    seller_id: b.sellerId,
    created_at: b.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-sue selection:text-primary-foreground flex flex-col justify-between">
      <div>
        <Navbar profile={profile} />
        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Katalog podręczników
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Znajdź podręczniki, których potrzebujesz na nowy rok szkolny.
            </p>
          </div>

          <CatalogExplorer
            books={serializedBooks}
            totalCount={totalCount}
            pageSize={pageSize}
            availableSubjects={availableSubjects}
            availableConditions={availableConditions}
            currentUserId={profile?.id ?? user?.id ?? null}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
}
