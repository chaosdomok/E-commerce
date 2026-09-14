import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { AdminDashboard } from '@/components/site/admin-dashboard';
import { DEFAULT_MARKUPS } from '@/lib/pricing';
import { getEffectiveRole } from '@/lib/roles';
import { normalizePolishPhone } from '@/lib/profile';
import { measurePerformance } from '@/lib/performance';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Panel Administratora | SUE',
  description: 'Zarządzanie kiermaszem, książkami, użytkownikami i ustawieniami.',
};

async function loadAdminData({
  tab,
  skip,
  pageSize,
  bookWhere,
  userWhere,
  reservationWhere,
  logWhere,
  isHeadAdmin,
  page,
}: {
  tab: string;
  skip: number;
  pageSize: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookWhere: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userWhere: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reservationWhere: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logWhere: any;
  isHeadAdmin: boolean;
  page: number;
}) {
  return measurePerformance(
    'adminPageLoad',
    async () => {
      const [
        books, booksTotal,
        profiles, usersTotal,
        systemSettings,
        priceMarkups,
        auditLogs, logsTotal,
        reservations, reservationsTotal,
        globalStats
      ] = await Promise.all([
        // Books
        prisma.book.findMany({
          where: bookWhere,
          take: pageSize,
          skip: tab === 'books' ? skip : 0,
          include: {
            seller: {
              select: { id: true, fullName: true, email: true, phone: true, class: true, school: true, refundMethod: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.book.count({ where: bookWhere }),

        // Users
                prisma.profile.findMany({
          where: userWhere,
          take: pageSize,
          skip: tab === 'users' ? skip : 0,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.profile.count({ where: userWhere }),

        // System settings
        isHeadAdmin ? prisma.systemSetting.findMany() : Promise.resolve([]),

        // Price markups
        isHeadAdmin ? prisma.priceMarkup.findMany({
          orderBy: { minPrice: 'asc' },
        }) : Promise.resolve([]),

        // Audit logs
        isHeadAdmin ? prisma.auditLog.findMany({
          where: logWhere,
          take: pageSize,
          skip: tab === 'logs' ? skip : 0,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { fullName: true, email: true } },
          },
        }) : Promise.resolve([]),
        isHeadAdmin ? prisma.auditLog.count({ where: logWhere }) : Promise.resolve(0),

        // Reservations
        prisma.reservation.findMany({
          where: reservationWhere,
          take: pageSize,
          skip: tab === 'reservations' ? skip : 0,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            items: {
              include: {
                book: {
                  select: {
                    id: true, inventoryNumber: true, title: true, author: true,
                    courseCode: true, price: true, status: true, reservedByUserId: true,
                  },
                },
              },
            },
          },
        }),
        prisma.reservation.count({ where: reservationWhere }),

        // Global Stats Aggregation
        prisma.book.groupBy({
          by: ['status'],
          _count: true,
          _sum: { price: true, basePrice: true }
        })
      ]);

      
      // Fetch stats using groupBy instead of eager loading
      const profileIds = profiles.map(p => p.id);
      const userBookStats = profileIds.length > 0 ? await prisma.book.groupBy({
        by: ['sellerId', 'status'],
        _count: true,
        _sum: { price: true, basePrice: true },
        where: { sellerId: { in: profileIds } },
      }) : [];
      
      const unpaidPayouts = profileIds.length > 0 ? await prisma.book.groupBy({
        by: ['sellerId'],
        _sum: { price: true, basePrice: true },
        where: { sellerId: { in: profileIds }, status: 'SOLD', payoutPaidAt: null }
      }) : [];
      
      const statsByProfile = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
      for (const id of profileIds) {
        statsByProfile.set(id, { totalBooks: 0, soldBooks: 0, pendingBooks: 0, availableBooks: 0, totalProfit: 0, unpaidPayout: 0 });
      }
      
      for (const stat of userBookStats) {
        if (!stat.sellerId) continue;
        const s = statsByProfile.get(stat.sellerId);
        if (!s) continue;
        s.totalBooks += stat._count;
        if (stat.status === 'SOLD') {
          s.soldBooks += stat._count;
          const priceSum = Number(stat._sum.price || 0);
          const baseSum = Number(stat._sum.basePrice || stat._sum.price || 0);
          s.totalProfit += (priceSum - baseSum);
        }
        if (stat.status === 'PENDING_APPROVAL') s.pendingBooks += stat._count;
        if (stat.status === 'AVAILABLE' || stat.status === 'RESERVED') s.availableBooks += stat._count;
      }
      
      for (const unpaid of unpaidPayouts) {
        if (!unpaid.sellerId) continue;
        const s = statsByProfile.get(unpaid.sellerId);
        if (s) {
          s.unpaidPayout = Number(unpaid._sum.basePrice || unpaid._sum.price || 0);
        }
      }
      
      const profilesWithStats = profiles.map(p => ({
        ...p,
        stats: statsByProfile.get(p.id)
      }));

      return {
        books, booksTotal,
        profiles: profilesWithStats, usersTotal,
        systemSettings,
        priceMarkups,
        auditLogs, logsTotal,
        reservations, reservationsTotal,
        globalStats
      };
    },
    {
      slowThresholdMs: 1500,
      metadata: {
        tab,
        page,
        pageSize,
      },
    }
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { email: true, role: true },
  });

  const role = getEffectiveRole(user.email ?? profile?.email, profile?.role);
  const isAdmin = role === 'admin' || role === 'head_admin';
  const isHeadAdmin = role === 'head_admin';

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Brak uprawnień</h1>
        <p className="text-muted-foreground text-sm">
          Ta sekcja jest dostępna wyłącznie dla wyznaczonych administratorów kiermaszu.
        </p>
      </div>
    );
  }

  const params = (await searchParams) ?? {};
  const tab = typeof params.tab === 'string' ? params.tab : 'books';
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1;
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookWhere: any = {};
  if (tab === 'books' && q) {
    const qnum = parseInt(q, 10);
    bookWhere.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { author: { contains: q, mode: 'insensitive' } },
      { reservationCode: { contains: q, mode: 'insensitive' } },
      ...(!isNaN(qnum) ? [{ inventoryNumber: qnum }] : [])
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userWhere: any = {};
  if (tab === 'users' && q) {
    userWhere.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reservationWhere: any = {};
  if (tab === 'reservations' && q) {
    reservationWhere.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } }
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logWhere: any = {};
  if (tab === 'logs' && q) {
    logWhere.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } }
    ];
  }

  // Fetch all required data in parallel
  const {
    books, booksTotal,
    profiles, usersTotal,
    systemSettings,
    priceMarkups,
    auditLogs, logsTotal,
    reservations, reservationsTotal,
    globalStats
  } = await loadAdminData({
    tab,
    skip,
    pageSize,
    bookWhere,
    userWhere,
    reservationWhere,
    logWhere,
    isHeadAdmin,
    page,
  });

  // Serialize books
  const serializedBooks = books.map((b) => ({
    id: b.id,
    inventoryNumber: b.inventoryNumber,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    condition: b.condition,
    price: Number(b.price),
    basePrice: isHeadAdmin && b.basePrice ? Number(b.basePrice) : null,
    courseCode: b.courseCode,
    status: b.status,
    coverUrl: b.coverUrl,
    reservationCode: b.reservationCode,
    reservedUntil: b.reservedUntil ? b.reservedUntil.toISOString() : null,
    reservedByUserId: b.reservedByUserId,
    paymentMethod: b.paymentMethod,
    payoutPaidAt: b.payoutPaidAt ? b.payoutPaidAt.toISOString() : null,
    sellerId: b.sellerId,
    seller: b.seller,
    createdAt: b.createdAt.toISOString(),
    acceptedAt: b.acceptedAt ? b.acceptedAt.toISOString() : null,
  }));

  // Serialize users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedUsers = profiles.map((p: any) => {
    const { totalBooks, soldBooks, pendingBooks, availableBooks, unpaidPayout, totalProfit } = p.stats;

    return {
      id: p.id,
      email: p.email,
      fullName: p.fullName || 'Brak imienia i nazwiska',
      phone: normalizePolishPhone(p.phone) || p.phone,
      class: p.class,
      school: p.school,
      accountType: p.accountType || 'student',
      refundMethod: p.refundMethod || 'Gotówka w szkole',
      role: p.role || 'user',
      isBlocked: p.isBlocked,
      blockedAt: p.blockedAt ? p.blockedAt.toISOString() : null,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      stats: {
        totalBooks,
        soldBooks,
        pendingBooks,
        availableBooks,
          totalPayout: isHeadAdmin ? unpaidPayout : null,
          totalProfit: isHeadAdmin ? totalProfit : null,
      },
    };
  });

  // Settings map
  const settingsMap: Record<string, string> = {};
  for (const s of systemSettings) {
    settingsMap[s.key] = s.value;
  }

  // Active markups
  const activeMarkups =
    priceMarkups.length > 0
      ? priceMarkups.map((m) => ({
          id: m.id,
          minPrice: Number(m.minPrice),
          maxPrice: m.maxPrice ? Number(m.maxPrice) : null,
          markup: Number(m.markup),
        }))
      : DEFAULT_MARKUPS;

  // Serialize logs
  const serializedLogs = auditLogs.map((l) => ({
    id: l.id,
    action: l.action,
    userId: l.userId,
    userName: l.user?.fullName || l.user?.email || 'Anonim / System',
    details: l.details,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
  }));

  const serializedReservations = reservations.map((reservation) => ({
    id: reservation.id,
    code: reservation.code,
    status: reservation.status,
    fulfillmentStatus: reservation.fulfillmentStatus,
    reservedUntil: reservation.reservedUntil.toISOString(),
    user: reservation.user,
    items: reservation.items.map((item) => ({
      bookId: item.bookId,
      book: { ...item.book, price: Number(item.book.price) },
    })),
  }));

  return (
    <>
    <Navbar authenticatedUserId={user.id} />
    <main className="min-h-screen bg-background px-3 sm:px-6 lg:px-8 py-8 sm:py-12 text-foreground">
      <div className="mx-auto max-w-7xl">
        <AdminDashboard
          initialBooks={serializedBooks}
          initialUsers={serializedUsers}
          initialSettings={settingsMap}
          initialMarkups={activeMarkups}
          initialLogs={serializedLogs}
          initialReservations={serializedReservations}
          role={role as 'admin' | 'head_admin'}
          currentUserId={user.id}
          // SSR pagination props
          booksTotal={booksTotal}
          usersTotal={usersTotal}
          reservationsTotal={reservationsTotal}
          logsTotal={logsTotal}
          globalStats={globalStats}
          pageSize={pageSize}
          currentPage={page}
          activeTab={tab}
        />
      </div>
    </main>
    <Footer />
    </>
  );
}
