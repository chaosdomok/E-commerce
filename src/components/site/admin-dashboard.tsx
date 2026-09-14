'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  Clock,
  Settings,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Plus,
  Search,
  DollarSign,
  FileText,
  UserPlus,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  PackageCheck,
  Download,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  approveBooksBatch,
  rejectBooksBatch,
  deleteBook,
  updateBookData,
  adminCreateBook,
  fulfillOrder,
  cancelReservation,
  setSystemSetting,
  savePriceMarkups,
  adminCreateOfflineUser,
  adminUpdateUserProfile,
  deleteUser,
  markBooksPaid,
  setReservationFulfillmentStatus,
  sellEntireReservation,
  setUserBlocked,
} from '@/lib/frontend/admin';
import { toast } from 'sonner';
import { formatReservationExpiry } from '@/lib/frontend/reservation-display';
import { searchIsbnSuggestions, type IsbnSuggestion } from '@/lib/frontend/isbn';
import { calculateFairSummary } from '@/lib/admin-settlement';
import { getPolishPhoneDigits, normalizePolishPhone } from '@/lib/profile';
import {
  normalizePayoutMethod,
  PHONE_BLIK_PAYOUT_METHOD,
} from '@/lib/frontend/payout-display';
import { formatInventoryNumber } from '@/lib/inventory-number';
import { toggleExpandedReservation } from '@/lib/admin-reservation-ui';
import { formatAuditLogsText } from '@/lib/audit-export';
import { formatPrice } from '@/components/site/book-card';

interface AdminBook {
  id: string;
  inventoryNumber: number;
  title: string;
  author: string;
  isbn: string | null;
  condition: string;
  price: number;
  basePrice: number | null;
  courseCode: string | null;
  status: string;
  coverUrl?: string | null;
  reservationCode: string | null;
  reservedUntil: string | null;
  reservedByUserId: string | null;
  paymentMethod: string | null;
  payoutPaidAt: string | null;
  sellerId: string | null;
  seller: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    class: string | null;
    school: string | null;
    refundMethod: string | null;
  } | null;
  createdAt: string;
  acceptedAt: string | null;
}

interface AdminUser {
  id: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  class: string | null;
  school: string | null;
  accountType: string;
  refundMethod: string;
  role: string;
  isBlocked: boolean;
  blockedAt: string | null;
  createdAt: string | null;
  stats: {
    totalBooks: number;
    soldBooks: number;
    pendingBooks: number;
    availableBooks: number;
    totalPayout: number | null;
    totalProfit: number | null;
  };
}

interface AdminMarkup {
  id?: string;
  minPrice: number;
  maxPrice: number | null;
  markup: number;
}

interface AdminLog {
  id: string;
  action: string;
  userId: string | null;
  userName: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

interface AdminReservation {
  id: string;
  code: string;
  status: string;
  fulfillmentStatus: 'PREPARING' | 'READY';
  reservedUntil: string;
  user: { id: string; fullName: string | null; email: string | null };
  items: Array<{
    bookId: string;
    book: {
      id: string;
      inventoryNumber: number;
      title: string;
      author: string;
      courseCode: string | null;
      price: number;
      status: string;
      reservedByUserId: string | null;
    };
  }>;
}

interface AdminDashboardProps {
  initialBooks: AdminBook[];
  initialUsers: AdminUser[];
  initialSettings: Record<string, string>;
  initialMarkups: AdminMarkup[];
  initialLogs: AdminLog[];
  initialReservations: AdminReservation[];
  role: 'admin' | 'head_admin';
  currentUserId: string;
  booksTotal?: number;
  usersTotal?: number;
  reservationsTotal?: number;
  logsTotal?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalStats?: any[];
  pageSize?: number;
  currentPage?: number;
  activeTab?: string;
}

type ConfirmationRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  loadingLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => Promise<boolean>;
};

export function AdminDashboard(props: AdminDashboardProps) {
  const {
    initialBooks,
    initialUsers,
    initialSettings,
    initialMarkups,
    initialLogs,
    initialReservations,
    role,
    currentUserId,
    booksTotal,
    usersTotal,
    reservationsTotal,
    logsTotal,
    globalStats,
    pageSize = 50,
    currentPage = 1,
    activeTab: initialActiveTab = 'books',
  } = props;

  const router = useRouter();
  const isHeadAdmin = role === 'head_admin';
  const initialDashboardData = useMemo(
    () => ({
      books: initialBooks,
      reservations: initialReservations,
      users: initialUsers,
      settings: initialSettings,
      markups: initialMarkups,
      logs: initialLogs,
    }),
    [
      initialBooks,
      initialReservations,
      initialUsers,
      initialSettings,
      initialMarkups,
      initialLogs,
    ],
  );

  const [activeTab, setLocalTab] = useState<'books' | 'reservations' | 'users' | 'offline-user' | 'settings' | 'logs'>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (initialActiveTab as any) || 'books'
  );

  const setActiveTab = (newTab: 'books' | 'reservations' | 'users' | 'offline-user' | 'settings' | 'logs') => {
    setLocalTab(newTab);
    const p = new URLSearchParams(window.location.search);
    p.set('tab', newTab);
    p.set('page', '1');
    p.delete('q'); // clean search on tab change
    router.push(`?${p.toString()}`, { scroll: false });
  };

  // State
  const [books, setBooks] = useState(initialBooks);
  const [reservations, setReservations] = useState(initialReservations);
  const [users, setUsers] = useState(initialUsers);
  const [settings, setSettings] = useState(initialSettings);
  const [markups, setMarkups] = useState(initialMarkups);
  const [logs, setLogs] = useState(initialLogs);
  const [previousInitialData, setPreviousInitialData] = useState(initialDashboardData);

  const [isPending, startTransition] = useTransition();

  const downloadAuditLogs = () => {
    if (!isHeadAdmin || logs.length === 0) return;
    const blob = new Blob([formatAuditLogsText(logs)], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `targi-audit-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Extract q from URL just once on mount
  const urlQ = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') || '' : '';

  // Books tab state
  const [bookFilterStatus, setBookFilterStatus] = useState<string>('ALL');
  const [bookSearch, setBookSearch] = useState(activeTab === 'books' ? urlQ : '');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [editingBook, setEditingBook] = useState<AdminBook | null>(null);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [saleBook, setSaleBook] = useState<AdminBook | null>(null);
  const [saleReservation, setSaleReservation] = useState<AdminReservation | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const [reservationSearch, setReservationSearch] = useState(activeTab === 'reservations' ? urlQ : '');
  const [expandedReservationIds, setExpandedReservationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [adminBookIsbn, setAdminBookIsbn] = useState('');
  const [adminIsbnSuggestions, setAdminIsbnSuggestions] = useState<IsbnSuggestion[]>([]);
  const [bookOwnerSearch, setBookOwnerSearch] = useState('');
  const [settingsUserSearch, setSettingsUserSearch] = useState('');
  const [settingsUserId, setSettingsUserId] = useState('');

  // Users tab state
  const [userSearch, setUserSearch] = useState(activeTab === 'users' ? urlQ : '');
  const [userClassFilter, setUserClassFilter] = useState('ALL');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Logs search
  const [logSearch, setLogSearch] = useState(activeTab === 'logs' ? urlQ : '');

  // URL Sync Effect for searches
  useEffect(() => {
    const t = setTimeout(() => {
      let q = '';
      if (activeTab === 'books') q = bookSearch;
      else if (activeTab === 'users') q = userSearch;
      else if (activeTab === 'reservations') q = reservationSearch;
      else if (activeTab === 'logs') q = logSearch;
      
      const p = new URLSearchParams(window.location.search);
      p.set('tab', activeTab);
      if (q) p.set('q', q); else p.delete('q');
      
      const currentQuery = p.toString();
      if (currentQuery !== window.location.search.replace('?', '')) {
         p.set('page', '1');
         router.push(`?${p.toString()}`, { scroll: false });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [bookSearch, userSearch, reservationSearch, logSearch, activeTab, router]);

  if (previousInitialData !== initialDashboardData) {
    setPreviousInitialData(initialDashboardData);
    setBooks(initialBooks);
    setReservations(initialReservations);
    setUsers(initialUsers);
    setSettings(initialSettings);
    setMarkups(initialMarkups);
    setLogs(initialLogs);
  }

  const refreshData = () => {
    startTransition(() => router.refresh());
  };

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [router]);

  // ---------------------------------------------------------------------------
  // Handlers: Books
  // ---------------------------------------------------------------------------
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (bookFilterStatus !== 'ALL') {
        if (b.status !== bookFilterStatus) return false;
      }
      return true;
    });
  }, [books, bookFilterStatus]);

  const toggleSelectAllBooks = () => {
    if (selectedBookIds.length === filteredBooks.length) {
      setSelectedBookIds([]);
    } else {
      setSelectedBookIds(filteredBooks.map((b) => b.id));
    }
  };

  const toggleSelectBook = (id: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApproveSelected = () => {
    if (selectedBookIds.length === 0) return;
    startTransition(async () => {
      const res = await approveBooksBatch(selectedBookIds);
      if (res.success) {
        toast.success(res.message);
        setBooks((prev) =>
          prev.map((b) => (selectedBookIds.includes(b.id) ? { ...b, status: 'AVAILABLE' } : b))
        );
        setSelectedBookIds([]);
      } else {
        toast.error(res.error);
      }
    });
  };

  const executeRejectBooks = async (bookIds: string[]) => {
    const res = await rejectBooksBatch(bookIds);
    if (res.success) {
      toast.success(res.message);
      setBooks((prev) =>
        prev.map((book) =>
          bookIds.includes(book.id) ? { ...book, status: 'REJECTED' } : book,
        ),
      );
      setSelectedBookIds([]);
      return true;
    }
    toast.error(res.error);
    return false;
  };

  const requestBookRejection = (bookIds: string[], bookTitle?: string) => {
    if (bookIds.length === 0) return;
    setConfirmation({
      title: bookIds.length === 1 ? 'Odrzucić książkę?' : 'Odrzucić wybrane książki?',
      description:
        bookIds.length === 1
          ? `Książka „${bookTitle ?? 'Wybrana książka'}” zostanie odrzucona i nie pojawi się w katalogu.`
          : `${bookIds.length} wybranych książek zostanie odrzuconych i nie pojawi się w katalogu.`,
      confirmLabel: bookIds.length === 1 ? 'Odrzuć książkę' : 'Odrzuć wybrane',
      loadingLabel: 'Odrzucanie…',
      onConfirm: () => executeRejectBooks(bookIds),
    });
  };

  const handleRejectSelected = () => {
    requestBookRejection([...selectedBookIds]);
  };

  const handleDeleteBook = (id: string) => {
    const book = books.find((item) => item.id === id);
    setConfirmation({
      title: 'Usunąć książkę?',
      description: `Czy na pewno chcesz usunąć ${book ? `„${book.title}”` : 'ten element'}? Tej operacji nie można cofnąć.`,
      confirmLabel: 'Usuń książkę',
      loadingLabel: 'Usuwanie…',
      onConfirm: async () => {
        const res = await deleteBook(id);
        if (res.success) {
          toast.success(res.message);
          setBooks((prev) => prev.filter((item) => item.id !== id));
          return true;
        }
        toast.error(res.error);
        return false;
      },
    });
  };

  const handleFulfillOrder = (id: string) => {
    const book = books.find((item) => item.id === id);
    if (book) setSaleBook(book);
  };

  const confirmFulfillOrder = (paymentMethod: 'BLIK' | 'CASH') => {
    if (!saleBook) return;
    startTransition(async () => {
      const res = await fulfillOrder(saleBook.id, paymentMethod);
      if (res.success) {
        toast.success(res.message);
        setBooks((prev) => prev.map((b) => (b.id === saleBook.id ? { ...b, status: 'SOLD', paymentMethod } : b)));
        setReservations((prev) =>
          prev.map((reservation) => {
            const items = reservation.items.map((item) =>
              item.bookId === saleBook.id
                ? { ...item, book: { ...item.book, status: 'SOLD' } }
                : item,
            );
            return {
              ...reservation,
              items,
              status: items.some((item) => item.book.status === 'RESERVED')
                ? reservation.status
                : 'COMPLETED',
            };
          }),
        );
        setSaleBook(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleMarkSelectedPaid = () => {
    const ids = selectedBookIds.filter((id) => {
      const book = books.find((item) => item.id === id);
      return book?.status === 'SOLD' && !book.payoutPaidAt;
    });
    if (ids.length === 0) return;
    setConfirmation({
      title: 'Potwierdzić wypłatę?',
      description: `Oznaczysz wypłatę za ${ids.length} ${ids.length === 1 ? 'książkę' : 'książki'} jako zrealizowaną.`,
      confirmLabel: 'Oznacz jako wypłacone',
      loadingLabel: 'Zapisywanie…',
      variant: 'default',
      onConfirm: async () => {
        const res = await markBooksPaid(ids);
        if (res.success) {
          toast.success(res.message);
          const paidAt = new Date().toISOString();
          setBooks((prev) =>
            prev.map((book) =>
              ids.includes(book.id) ? { ...book, payoutPaidAt: paidAt } : book,
            ),
          );
          setSelectedBookIds([]);
          return true;
        }
        toast.error(res.error);
        return false;
      },
    });
  };

  const handleCancelReservation = (reservationId: string) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    setConfirmation({
      title: 'Anulować rezerwację?',
      description: `Czy na pewno chcesz anulować rezerwację${reservation ? ` ${reservation.code}` : ''}? Książki wrócą do katalogu.`,
      confirmLabel: 'Anuluj rezerwację',
      loadingLabel: 'Anulowanie…',
      onConfirm: async () => {
        const res = await cancelReservation(reservationId);
        if (!res.success) {
          toast.error(res.error);
          return false;
        }

        toast.success(res.message);
        const cancelled = reservations.find((item) => item.id === reservationId);
        const cancelledBookIds = new Set(
          cancelled?.items.map((item) => item.bookId) ?? [],
        );
        setBooks((prev) =>
          prev.map((b) =>
            cancelledBookIds.has(b.id) && b.status === 'RESERVED'
              ? {
                  ...b,
                  status: 'AVAILABLE',
                  reservedByUserId: null,
                  reservationCode: null,
                  reservedUntil: null,
                }
              : b
          )
        );
        setReservations((prev) =>
          prev.map((item) =>
            item.id === reservationId ? { ...item, status: 'CANCELLED' } : item,
          ),
        );
        return true;
      },
    });
  };

  const handleReservationFulfillment = (
    reservationId: string,
    status: 'PREPARING' | 'READY',
  ) => {
    startTransition(async () => {
      const res = await setReservationFulfillmentStatus(reservationId, status);
      if (res.success) {
        toast.success(res.message);
        setReservations((prev) =>
          prev.map((reservation) =>
            reservation.id === reservationId
              ? { ...reservation, fulfillmentStatus: status }
              : reservation,
          ),
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const confirmSellEntireReservation = (paymentMethod: 'BLIK' | 'CASH') => {
    if (!saleReservation) return;
    const reservationId = saleReservation.id;
    const soldBookIds = new Set(
      saleReservation.items
        .filter((item) => item.book.status === 'RESERVED')
        .map((item) => item.bookId),
    );

    startTransition(async () => {
      const res = await sellEntireReservation(reservationId, paymentMethod);
      if (res.success) {
        toast.success(res.message);
        setBooks((prev) =>
          prev.map((book) =>
            soldBookIds.has(book.id)
              ? { ...book, status: 'SOLD', paymentMethod }
              : book,
          ),
        );
        setReservations((prev) =>
          prev.map((reservation) =>
            reservation.id === reservationId
              ? {
                  ...reservation,
                  status: 'COMPLETED',
                  items: reservation.items.map((item) =>
                    soldBookIds.has(item.bookId)
                      ? { ...item, book: { ...item.book, status: 'SOLD' } }
                      : item,
                  ),
                }
              : reservation,
          ),
        );
        setSaleReservation(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSetUserBlocked = (user: AdminUser, isBlocked: boolean) => {
    setConfirmation({
      title: isBlocked ? 'Zablokować konto?' : 'Odblokować konto?',
      description: isBlocked
        ? `Czy na pewno chcesz zablokować konto ${user.fullName}? Użytkownik straci dostęp do chronionych funkcji serwisu.`
        : `Czy na pewno chcesz odblokować konto ${user.fullName}? Użytkownik odzyska dostęp do chronionych funkcji serwisu.`,
      confirmLabel: isBlocked ? 'Zablokuj konto' : 'Odblokuj konto',
      loadingLabel: isBlocked ? 'Blokowanie…' : 'Odblokowywanie…',
      variant: isBlocked ? 'destructive' : 'default',
      onConfirm: async () => {
        const res = await setUserBlocked(user.id, isBlocked);
        if (!res.success) {
          toast.error(res.error);
          return false;
        }
        toast.success(res.message);
        setUsers((prev) =>
          prev.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  isBlocked,
                  blockedAt: isBlocked ? new Date().toISOString() : null,
                }
              : item,
          ),
        );
        router.refresh();
        return true;
      },
    });
  };

  const handleDeleteUser = (user: AdminUser) => {
    setConfirmation({
      title: 'Usunąć użytkownika?',
      description: `Czy na pewno chcesz usunąć użytkownika ${user.fullName}? Tej operacji nie można cofnąć.`,
      confirmLabel: 'Usuń użytkownika',
      loadingLabel: 'Usuwanie…',
      onConfirm: async () => {
        const res = await deleteUser(user.id);
        if (res.success) {
          toast.success(res.message);
          setUsers((prev) => prev.filter((item) => item.id !== user.id));
          return true;
        }
        toast.error(res.error);
        return false;
      },
    });
  };


  // ---------------------------------------------------------------------------
  // Handlers: Settings & Markups
  // ---------------------------------------------------------------------------
  const handleToggleSubmission = (currentVal: boolean) => {
    const nextVal = !currentVal;
    startTransition(async () => {
      const res = await setSystemSetting('allow_book_submission', String(nextVal));
      if (res.success) {
        setSettings((prev) => ({ ...prev, allow_book_submission: String(nextVal) }));
        toast.success(
          nextVal
            ? 'Dodawanie podręczników przez użytkowników zostało OTWARTE.'
            : 'Dodawanie podręczników przez użytkowników zostało ZABLOKOWANE.'
        );
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSaveMarkups = () => {
    setConfirmation({
      title: 'Zapisać progi cenowe?',
      description:
        'Nowe progi zastąpią obecną konfigurację narzutów używaną przy kolejnych książkach.',
      confirmLabel: 'Zapisz progi',
      loadingLabel: 'Zapisywanie…',
      variant: 'default',
      onConfirm: async () => {
        const res = await savePriceMarkups(markups);
        if (res.success) {
          toast.success(res.message);
          return true;
        }
        toast.error(res.error);
        return false;
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Handlers: Users
  // ---------------------------------------------------------------------------
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userClassFilter !== 'ALL') {
        if (userClassFilter === 'OTHER' && u.accountType !== 'other') return false;
        if (userClassFilter !== 'OTHER' && u.class !== userClassFilter) return false;
      }
      return true;
    });
  }, [users, userClassFilter]);

  const bookOwnerOptions = useMemo(() => {
    const query = bookOwnerSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.fullName, user.email, user.class].some((value) => value?.toLowerCase().includes(query))
    );
  }, [users, bookOwnerSearch]);

  const settingsUser = users.find((user) => user.id === settingsUserId) || null;
  const settingsUserOptions = useMemo(() => {
    const query = settingsUserSearch.trim().toLowerCase();
    if (!query) return users.slice(0, 20);
    return users.filter((user) =>
      [user.fullName, user.email, user.class].some((value) => value?.toLowerCase().includes(query))
    ).slice(0, 20);
  }, [users, settingsUserSearch]);

  const handleAdminIsbnChange = async (value: string) => {
    setAdminBookIsbn(value);
    if (value.trim().length < 3) {
      setAdminIsbnSuggestions([]);
      return;
    }
    setAdminIsbnSuggestions(await searchIsbnSuggestions(value));
  };

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.class) set.add(u.class);
    });
    return Array.from(set).sort();
  }, [users]);

  // Active reservations
  const activeReservations = useMemo(() => {
    return reservations.filter((reservation) => reservation.status === 'ACTIVE');
  }, [reservations]);

  const filteredReservations = reservations;

  const localPendingBooks = useMemo(() => books.filter((b) => b.status === 'PENDING_APPROVAL').length, [books]);
  const pendingBooksCount = globalStats
    ? globalStats.find((s: { status: string; _count: number }) => s.status === 'PENDING_APPROVAL')?._count || 0
    : localPendingBooks;

  const fairSummary = useMemo(() => calculateFairSummary(books), [books]);
  const formatMoney = formatPrice;

  return (
    <div className="admin-dashboard min-w-0 space-y-8">
      {/* Header with Title & Quick Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Panel Administratora Kiermaszu
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Zarządzanie Kiermaszem SUE
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={refreshData}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="text-xs"
            title="Odśwież dane panelu"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
            Odśwież dane
          </Button>
          <Link
            href="/katalog"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted-foreground transition hover:bg-elevated hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Otwórz Katalog
          </Link>
          <Button
            onClick={() => setShowAddBookModal(true)}
            size="sm"
            className="text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Dodaj podręcznik do bazy
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-surface border border-border rounded-2xl sm:flex-wrap scrollbar-hide pb-2 sm:pb-1.5">
        <button
          onClick={() => setActiveTab('books')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'books'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Książki ({books.length})
          {pendingBooksCount > 0 && (
            <span className="ml-1 rounded-full bg-warning px-1.5 py-0.2 text-[10px] font-bold text-zinc-950">
              {pendingBooksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'reservations'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
          }`}
        >
          <Clock className="h-4 w-4" />
          Rezerwacje ({activeReservations.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
          }`}
        >
          <Users className="h-4 w-4" />
          Użytkownicy ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('offline-user')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'offline-user'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Konto Stacjonarne
        </button>

        {isHeadAdmin && <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
          }`}
        >
          <Settings className="h-4 w-4" />
          Ustawienia
        </button>}

        {isHeadAdmin && <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
          }`}
        >
          <FileText className="h-4 w-4" />
          Logi Systemowe
        </button>}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: KSIĄŻKI */}
      {/* ===================================================================== */}
      {activeTab === 'books' && (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Szukaj książki, kodu K-, autora, ISBN…"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-border bg-surface text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <select
                value={bookFilterStatus}
                onChange={(e) => setBookFilterStatus(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:border-sue"
              >
                <option value="ALL">Wszystkie statusy</option>
                <option value="PENDING_APPROVAL">Oczekuje na akceptację</option>
                <option value="AVAILABLE">Dostępne w katalogu</option>
                <option value="RESERVED">Zarezerwowane</option>
                <option value="SOLD">Sprzedane</option>
                <option value="REJECTED">Odrzucone</option>
              </select>
            </div>

            {/* Mass actions buttons */}
            {selectedBookIds.length > 0 && (
              <div className="flex items-center gap-2 bg-surface border border-border p-1.5 rounded-xl text-xs animate-in fade-in">
                <span className="text-muted-foreground px-2 font-medium">
                  Zaznaczono: <strong className="text-foreground">{selectedBookIds.length}</strong>
                </span>
                <Button
                  onClick={handleApproveSelected}
                  disabled={isPending}
                  size="sm"
                  className="text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Zaakceptuj masowo
                </Button>
                {selectedBookIds.some((id) => {
                  const book = books.find((item) => item.id === id);
                  return book?.status === 'SOLD' && !book.payoutPaidAt;
                }) && (
                  <Button
                    onClick={handleMarkSelectedPaid}
                    disabled={isPending}
                    size="sm"
                    className="text-xs"
                  >
                    Oznacz wypłatę
                  </Button>
                )}
                <Button
                  onClick={handleRejectSelected}
                  disabled={isPending}
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Odrzuć masowo
                </Button>
              </div>
            )}
          </div>

          {/* Books Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface ">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={toggleSelectAllBooks}
                      aria-label="Zaznacz wszystkie widoczne książki"
                    >
                      {selectedBookIds.length === filteredBooks.length && filteredBooks.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-sue" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </th>
                  <th className="p-3">Tytuł i Autor</th>
                  <th className="p-3">Wystawiający</th>
                  {isHeadAdmin && <th className="p-3">Cena bazowa</th>}
                  <th className="p-3">Cena sprzedaży</th>
                  <th className="p-3">Stan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={isHeadAdmin ? 8 : 7} className="p-8 text-center text-muted-foreground">
                      Brak podręczników spełniających kryteria.
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((b) => (
                    <tr key={b.id} className="hover:bg-elevated transition-colors">
                      <td data-label="Wybór" className="p-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => toggleSelectBook(b.id)}
                          aria-label={`Zaznacz książkę ${b.title}`}
                        >
                          {selectedBookIds.includes(b.id) ? (
                            <CheckSquare className="h-4 w-4 text-sue" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </td>
                      <td data-label="Tytuł i autor" className="p-3">
                        <div className="font-mono text-[10px] font-semibold text-sue">
                          {formatInventoryNumber(b.inventoryNumber)}
                        </div>
                        <div className="font-semibold text-foreground">{b.title}</div>
                        <div className="text-muted-foreground text-[11px]">{b.author}</div>
                        {b.isbn && <div className="text-muted-foreground font-mono text-[10px]">ISBN: {b.isbn}</div>}
                      </td>
                      <td data-label="Wystawiający" className="p-3">
                        <div className="text-foreground font-medium">{b.seller?.fullName || 'Brak danych'}</div>
                        <div className="text-muted-foreground text-[10px]">
                          {b.seller?.class ? `Klasa ${b.seller.class}` : b.seller?.school || 'Pozostałe osoby'}
                        </div>
                      </td>
                      {isHeadAdmin && <td data-label="Cena bazowa" className="p-3 font-semibold text-success">
                        {b.basePrice ? formatPrice(Number(b.basePrice)) : 'Brak'}
                      </td>}
                      <td data-label="Cena sprzedaży" className="p-3 font-bold text-foreground">
                        {formatPrice(Number(b.price))}
                      </td>
                      <td data-label="Stan" className="p-3">
                        <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-foreground">
                          {b.condition}
                        </span>
                      </td>
                      <td data-label="Status" className="p-3">
                        {b.status === 'PENDING_APPROVAL' && (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                            Oczekuje
                          </Badge>
                        )}
                        {b.status === 'AVAILABLE' && (
                          <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                            Dostępna
                          </Badge>
                        )}
                        {b.status === 'RESERVED' && (
                          <Badge className="bg-info/10 text-info border-info/20 text-[10px]">
                            Zarezerwowana
                          </Badge>
                        )}
                        {b.status === 'SOLD' && (
                          <Badge className="bg-lavender/10 text-lavender border-lavender/20 text-[10px]">
                            Sprzedana
                          </Badge>
                        )}
                        {b.paymentMethod && (
                          <Badge className="ml-1 bg-info/10 text-info border-info/20 text-[10px]">
                            {b.paymentMethod === 'BLIK' ? 'BLIK' : 'Gotówka'}
                          </Badge>
                        )}
                        {b.status === 'SOLD' && (
                          <Badge className={`ml-1 text-[10px] ${b.payoutPaidAt ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                            {b.payoutPaidAt ? 'Wypłacona' : 'Do wypłaty'}
                          </Badge>
                        )}
                        {b.status === 'REJECTED' && (
                          <Badge className="bg-danger/10 text-danger border-danger/20 text-[10px]">
                            Odrzucona
                          </Badge>
                        )}
                      </td>
                      <td data-label="Akcje" className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {b.status === 'PENDING_APPROVAL' && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => {
                                  startTransition(async () => {
                                    const res = await approveBooksBatch([b.id]);
                                    if (res.success) {
                                      toast.success('Zaakceptowano');
                                      setBooks((prev) =>
                                        prev.map((x) => (x.id === b.id ? { ...x, status: 'AVAILABLE' } : x))
                                      );
                                    }
                                  });
                                }}
                                className="bg-success/10 text-success hover:bg-success/20"
                                title="Zaakceptuj"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => requestBookRejection([b.id], b.title)}
                                className="bg-danger/10 text-danger hover:bg-danger/20"
                                title="Odrzuć"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {b.status === 'AVAILABLE' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleFulfillOrder(b.id)}
                              className="bg-success/10 text-success hover:bg-success/20"
                              title="Oznacz ręcznie jako sprzedaną"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingBook(b)}
                            className="text-muted-foreground"
                            title="Edytuj dane"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteBook(b.id)}
                            className="text-muted-foreground hover:text-danger"
                            title="Usuń"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: REZERWACJE */}
      {/* ===================================================================== */}
      {activeTab === 'reservations' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Rezerwacje ({activeReservations.length} aktywnych)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Wyszukaj paczkę po kodzie rezerwacji lub kodzie książki.
              </p>
            </div>
            <div className="w-full sm:max-w-sm">
              <Label htmlFor="reservation-search" className="mb-1.5 block text-xs text-muted-foreground">
                Kod rezerwacji
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reservation-search"
                  value={reservationSearch}
                  onChange={(event) => setReservationSearch(event.target.value)}
                  placeholder="np. REZ-ABC123"
                  className="pl-9 font-mono uppercase"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredReservations.length === 0 ? (
              <div className="md:col-span-2 p-8 text-center text-muted-foreground border border-border rounded-2xl bg-surface">
                {reservationSearch.trim()
                  ? 'Nie znaleziono rezerwacji.'
                  : 'Brak rezerwacji.'}
              </div>
            ) : (
              filteredReservations.map((reservation) => {
                const totalPrice = reservation.items.reduce(
                  (sum, item) => sum + item.book.price,
                  0,
                );
                const reservedItems = reservation.items.filter(
                  (item) => item.book.status === 'RESERVED',
                );
                const isExpanded = expandedReservationIds.has(reservation.id);
                const isActive = reservation.status === 'ACTIVE';
                return (
                <div
                  key={reservation.id}
                  className="rounded-2xl border border-border bg-surface p-5 space-y-4 "
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-lg font-bold tracking-wider text-sue">
                          {reservation.code}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            reservation.fulfillmentStatus === 'READY'
                              ? 'border-success/30 bg-success/10 text-success'
                              : 'border-warning/30 bg-warning/10 text-warning'
                          }
                        >
                          {reservation.fulfillmentStatus === 'READY'
                            ? 'Gotowe do odbioru'
                            : 'W przygotowaniu'}
                        </Badge>
                        {!isActive && (
                          <Badge variant="outline" className="text-muted-foreground">
                            {reservation.status === 'COMPLETED'
                              ? 'Zakończona'
                              : reservation.status === 'CANCELLED'
                                ? 'Anulowana'
                                : reservation.status === 'EXPIRED'
                                  ? 'Wygasła'
                                  : reservation.status}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {reservation.user.fullName || 'Brak imienia i nazwiska'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reservation.user.email}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">Ważna do</p>
                      <p className="font-semibold text-warning">
                        {formatReservationExpiry(reservation.reservedUntil)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">
                        {reservation.items.length}{' '}
                        {reservation.items.length === 1 ? 'książka' : 'książki'}
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {formatPrice(totalPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-surface-soft">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-expanded={isExpanded}
                      aria-controls={`reservation-items-${reservation.id}`}
                      onClick={() =>
                        setExpandedReservationIds((prev) =>
                          toggleExpandedReservation(prev, reservation.id),
                        )
                      }
                      className="w-full justify-between rounded-xl px-3 text-sm"
                    >
                      {isExpanded ? 'Ukryj książki' : 'Pokaż książki'}
                      <ChevronDown
                        className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </Button>
                    {isExpanded && (
                    <div
                      id={`reservation-items-${reservation.id}`}
                      className="overflow-x-auto border-t border-border"
                    >
                      <table className="w-full min-w-[680px] text-left text-xs">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="p-3">Kod książki</th>
                            <th className="p-3">Tytuł</th>
                            <th className="p-3">Przedmiot</th>
                            <th className="p-3">Cena</th>
                            <th className="p-3 text-right">Akcja</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {reservation.items.map((item) => (
                            <tr key={item.bookId}>
                              <td className="p-3 font-mono text-[10px] text-muted-foreground">
                                {formatInventoryNumber(item.book.inventoryNumber)}
                              </td>
                              <td className="p-3 font-medium text-foreground">
                                {item.book.title}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {item.book.courseCode || '—'}
                              </td>
                              <td className="p-3 font-semibold text-foreground">
                                {formatPrice(item.book.price)}
                              </td>
                              <td className="p-3 text-right">
                                {item.book.status === 'RESERVED' ? (
                                  <Button
                                    onClick={() => handleFulfillOrder(item.bookId)}
                                    disabled={isPending}
                                    size="sm"
                                    className="text-xs"
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    Wydaj
                                  </Button>
                                ) : (
                                  <Badge variant="outline">{item.book.status}</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </div>

                  <div className="flex flex-col items-stretch gap-2 border-t border-border pt-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    {isActive && (
                      <>
                        <Button
                          type="button"
                          onClick={() =>
                            handleReservationFulfillment(
                              reservation.id,
                              reservation.fulfillmentStatus === 'READY' ? 'PREPARING' : 'READY',
                            )
                          }
                          disabled={isPending}
                          variant={reservation.fulfillmentStatus === 'READY' ? 'outline' : 'reserve'}
                          size="sm"
                        >
                          <PackageCheck className="size-3.5" />
                          {reservation.fulfillmentStatus === 'READY'
                            ? 'Cofnij do przygotowania'
                            : 'Oznacz jako gotowe'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setSaleReservation(reservation)}
                          disabled={isPending || reservedItems.length === 0}
                          size="sm"
                        >
                          <DollarSign className="size-3.5" />
                          Sprzedaj wszystko
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleCancelReservation(reservation.id)}
                          disabled={isPending}
                          variant="outline"
                          size="sm"
                        >
                          Anuluj rezerwację
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: UŻYTKOWNICY */}
      {/* ===================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po nazwisku, emailu, telefonie…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-border bg-surface text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <select
                value={userClassFilter}
                onChange={(e) => setUserClassFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:border-sue"
              >
                <option value="ALL">Wszystkie klasy / grupy</option>
                <option value="OTHER">Pozostałe osoby</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    Klasa {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-surface ">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Użytkownik</th>
                  <th className="p-3">Grupa / Klasa</th>
                  <th className="p-3">Kontakt</th>
                  <th className="p-3">Forma zwrotu</th>
                  <th className="p-3">Wystawione / Sprzedane</th>
                  {isHeadAdmin && <th className="p-3">Należność / narzut</th>}
                  <th className="p-3 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isHeadAdmin ? 7 : 6} className="p-8 text-center text-muted-foreground">
                      Brak użytkowników.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-elevated transition-colors">
                      <td data-label="Użytkownik" className="p-3">
                        <div className="font-semibold text-foreground">{u.fullName}</div>
                        <div className="text-muted-foreground text-[11px]">{u.email}</div>
                        <Badge
                          variant="outline"
                          className={`mt-1.5 text-[10px] ${
                            u.isBlocked
                              ? 'border-danger/30 bg-danger/10 text-danger'
                              : 'border-success/30 bg-success/10 text-success'
                          }`}
                        >
                          {u.isBlocked ? 'Zablokowane' : 'Aktywne'}
                        </Badge>
                      </td>
                      <td data-label="Grupa / klasa" className="p-3">
                        {u.accountType === 'other' ? (
                          <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                            Pozostałe osoby
                          </Badge>
                        ) : (
                          <Badge className="bg-sue/10 text-sue border-sue/20 text-[10px]">
                            Klasa {u.class || 'Brak'}
                          </Badge>
                        )}
                      </td>
                      <td data-label="Kontakt" className="p-3">
                        <div className="text-foreground font-medium">{u.phone || 'Brak telefonu'}</div>
                      </td>
                      <td data-label="Forma wypłaty" className="p-3">
                        <span className="text-success">{u.refundMethod}</span>
                      </td>
                      <td data-label="Wystawione / sprzedane" className="p-3">
                        <span className="font-bold text-foreground">{u.stats.totalBooks}</span> książek{' '}
                        <span className="text-muted-foreground">({u.stats.soldBooks} sprzedanych)</span>
                      </td>
                      {isHeadAdmin && <td data-label="Należność / narzut" className="p-3 font-bold text-success text-sm">
                        <div>{formatPrice(u.stats.totalPayout ?? 0)} do wypłaty</div>
                        <div className="text-[10px] text-info">Narzut: {formatPrice(u.stats.totalProfit ?? 0)}</div>
                      </td>}
                      <td data-label="Akcje" className="p-3 text-right">
                        {isHeadAdmin && (
                          <Button
                            type="button"
                            variant={u.isBlocked ? 'outline' : 'destructive'}
                            size="sm"
                            onClick={() => handleSetUserBlocked(u, !u.isBlocked)}
                            disabled={isPending || (!u.isBlocked && u.id === currentUserId)}
                            className="mr-1"
                            title={
                              !u.isBlocked && u.id === currentUserId
                                ? 'Nie możesz zablokować własnego konta'
                                : u.isBlocked
                                  ? 'Odblokuj konto'
                                  : 'Zablokuj konto'
                            }
                          >
                            {u.isBlocked ? (
                              <Unlock className="size-3.5" />
                            ) : (
                              <Lock className="size-3.5" />
                            )}
                            {u.isBlocked ? 'Odblokuj konto' : 'Zablokuj konto'}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditingUser(u)}
                          className="mr-1 text-muted-foreground"
                          title="Edytuj profil"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDeleteUser(u)}
                          className="text-muted-foreground hover:text-danger"
                          title="Usuń użytkownika"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: KONTO STACJONARNE */}
      {/* ===================================================================== */}
      {activeTab === 'offline-user' && (
        <Card className="max-w-2xl border-border bg-surface ">
          <CardHeader>
            <CardTitle className="font-display text-lg text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-sue" />
              Dodaj konto stacjonarne
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Użyj tego formularza, gdy uczeń lub osoba z zewnątrz przynosi książki bezpośrednio do szkoły i nie posiada konta internetowego.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await adminCreateOfflineUser(formData);
                  if (res.success) {
                    toast.success(res.message);
                    (e.target as HTMLFormElement).reset();
                  } else {
                    toast.error(res.error);
                  }
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">Imię *</Label>
                  <Input name="firstName" required placeholder="Jan" className="border-border bg-elevated text-foreground text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">Nazwisko *</Label>
                  <Input name="lastName" required placeholder="Kowalski" className="border-border bg-elevated text-foreground text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Hasło *</Label>
                  <Input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Minimum 8 znaków"
                    className="border-border bg-elevated text-xs text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Potwierdź hasło *</Label>
                  <Input
                    name="passwordConfirmation"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Powtórz hasło"
                    className="border-border bg-elevated text-xs text-foreground"
                  />
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Minimum 8 znaków, w tym co najmniej jedna litera i jedna cyfra. Hasło nie jest wysyłane e-mailem.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">E-mail (lub identyfikator) *</Label>
                  <Input name="email" type="email" required placeholder="jan.kowalski@stacjonarny.pl" className="border-border bg-elevated text-foreground text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">Telefon</Label>
                  <Input name="phone" placeholder="123456789" inputMode="numeric" maxLength={9} pattern="[0-9]{9}" className="border-border bg-elevated text-foreground text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">Typ konta</Label>
                  <select name="accountType" className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-xs text-foreground">
                    <option value="student">Uczeń szkoły</option>
                    <option value="other">Pozostałe osoby</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-medium">Klasa</Label>
                  <Input name="class" placeholder="np. 3A" className="border-border bg-elevated text-foreground text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground text-xs font-medium">Forma zwrotu środków</Label>
                <select name="refundMethod" className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-xs text-foreground">
                  <option value="Gotówka w szkole">Gotówka w punkcie stacjonarnym</option>
                  <option value="Przelew na telefon BLIK">Przelew na telefon BLIK</option>
                  <option value="Przelew bankowy">Przelew bankowy (dotychczasowa preferencja)</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isPending} className="w-full text-xs">
                  {isPending ? 'Tworzenie…' : 'Utwórz konto stacjonarne'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: USTAWIENIA & NARZUTY */}
      {/* ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-border bg-surface lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg text-foreground">
                Podsumowanie Targów
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Wartości katalogowe i rozliczenia na podstawie aktualnych danych książek.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['Wystawione książki', String(fairSummary.totalBooks)],
                  ['Wartość katalogowa', formatMoney(fairSummary.catalogValue)],
                  ['Sprzedane książki', String(fairSummary.soldBooks)],
                  ['Wartość sprzedaży', formatMoney(fairSummary.soldValue)],
                  ['Należne uczniom', formatMoney(fairSummary.sellerValue)],
                  ['Marża SU', formatMoney(fairSummary.suMargin)],
                  ['Do wypłaty gotówką', formatMoney(fairSummary.cashOutstanding)],
                  ['Do wypłaty BLIK', formatMoney(fairSummary.blikOutstanding)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-surface-soft p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-base font-bold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              {(fairSummary.missingBasePrice > 0 || fairSummary.unclassifiedOutstanding > 0) && (
                <p className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                  {fairSummary.missingBasePrice > 0 &&
                    `${fairSummary.missingBasePrice} sprzedanych książek nie ma ceny bazowej; część podsumowania może być niepełna. `}
                  {fairSummary.unclassifiedOutstanding > 0 &&
                    `Kwota ${formatMoney(fairSummary.unclassifiedOutstanding)} ma inną lub nieokreśloną formę wypłaty.`}
                </p>
              )}
            </CardContent>
          </Card>

          {/* General settings switch */}
          <Card className="border-border bg-surface ">
            <CardHeader>
              <CardTitle className="font-display text-lg text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-sue" />
                Konfiguracja Kiermaszu
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Główne przełączniki dostępności platformy dla uczniów
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border">
                <div className="space-y-1">
                  <span className="font-semibold text-foreground text-sm block">
                    Zezwalaj na dodawanie podręczników
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    Włącza lub wyłącza formularz zgłaszania książek przez uczniów (/dodaj-ksiazke)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSubmission(settings.allow_book_submission !== 'false')}
                  disabled={isPending}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    settings.allow_book_submission !== 'false'
                      ? 'bg-success/20 text-success border border-success/30'
                      : 'bg-danger/20 text-danger border border-danger/30'
                  }`}
                >
                  {settings.allow_book_submission !== 'false' ? (
                    <>
                      <Unlock className="h-3.5 w-3.5" />
                      OTWARTE
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      ZABLOKOWANE
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-surface ">
            <CardHeader>
              <CardTitle className="font-display text-lg text-foreground">Należności użytkownika</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Wyszukaj po imieniu, nazwisku, klasie lub e-mailu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={settingsUserSearch}
                onChange={(event) => setSettingsUserSearch(event.target.value)}
                placeholder="Szukaj użytkownika"
                className="border-border bg-elevated text-foreground"
              />
              <select
                value={settingsUserId}
                onChange={(event) => setSettingsUserId(event.target.value)}
                className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-xs text-foreground"
              >
                <option value="">Wybierz użytkownika</option>
                {settingsUserOptions.map((user) => (
                  <option key={user.id} value={user.id}>{user.fullName} - {user.email}</option>
                ))}
              </select>
              {settingsUser && (
                <div className="rounded-xl border border-border bg-surface p-4 text-sm">
                  <p className="font-semibold text-foreground">{settingsUser.fullName}</p>
                  <p className="mt-2 text-muted-foreground">
                    Preferowana wypłata:{' '}
                    <strong className="text-foreground">
                      {normalizePayoutMethod(settingsUser.refundMethod) === PHONE_BLIK_PAYOUT_METHOD
                        ? 'BLIK na telefon'
                        : 'Gotówka'}
                    </strong>
                  </p>
                  {normalizePayoutMethod(settingsUser.refundMethod) === PHONE_BLIK_PAYOUT_METHOD && (
                    <p className="text-muted-foreground">
                      Numer telefonu:{' '}
                      <strong className="text-foreground">
                        {normalizePolishPhone(settingsUser.phone) || 'Brak numeru'}
                      </strong>
                    </p>
                  )}
                  <p className="mt-2 text-success">Do wypłaty: {formatPrice(settingsUser.stats.totalPayout ?? 0)}</p>
                  <p className="text-info">Narzut z jego sprzedaży: {formatPrice(settingsUser.stats.totalProfit ?? 0)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price markups editor */}
          <Card className="border-border bg-surface ">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-success" />
                  Tabela Narzutów Cenowych
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs">
                  Konfigurowalny narzut doliczany do ceny bazowej właściciela
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setMarkups((prev) => [
                    ...prev,
                    { minPrice: 100, maxPrice: null, markup: 12 },
                  ]);
                }}
                className="bg-elevated hover:bg-elevated text-foreground text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Dodaj próg
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {markups.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      placeholder="Min"
                      value={m.minPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setMarkups((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, minPrice: val } : item))
                        );
                      }}
                      className="border-border bg-elevated text-foreground h-8 w-20 text-xs"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      placeholder="Brak (null)"
                      value={m.maxPrice ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setMarkups((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, maxPrice: val } : item))
                        );
                      }}
                      className="border-border bg-elevated text-foreground h-8 w-24 text-xs"
                    />
                    <span className="text-muted-foreground">Narzut:</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      placeholder="Narzut"
                      value={m.markup}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setMarkups((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, markup: val } : item))
                        );
                      }}
                      className="border-border bg-elevated text-success font-bold h-8 w-20 text-xs"
                    />
                    <span className="text-muted-foreground">zł</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setMarkups((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-danger"
                      aria-label="Usuń próg narzutu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSaveMarkups}
                  disabled={isPending}
                  size="sm"
                  className="text-xs"
                >
                  {isPending ? 'Zapisywanie…' : 'Zapisz progi narzutów'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: LOGI SYSTEMOWE */}
      {/* ===================================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-foreground">
              Ostatnie zdarzenia w systemie ({logs.length})
            </h2>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="relative min-w-56 flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtruj logi…"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-9 h-8 text-xs border-border bg-surface text-foreground"
                />
              </div>
              {isHeadAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logs.length === 0}
                  onClick={downloadAuditLogs}
                >
                  <Download className="size-4" />
                  Pobierz logi
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-surface ">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Data i Czas</th>
                  <th className="p-3">Zdarzenie / Akcja</th>
                  <th className="p-3">Użytkownik</th>
                  <th className="p-3">Adres IP</th>
                  <th className="p-3">Szczegóły</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-elevated font-mono text-[11px]">
                      <td data-label="Data i czas" className="p-3 text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString('pl-PL')}
                      </td>
                      <td data-label="Zdarzenie / akcja" className="p-3 font-semibold text-sue">{l.action}</td>
                      <td data-label="Użytkownik" className="p-3 text-foreground">{l.userName}</td>
                      <td data-label="Adres IP" className="p-3 text-muted-foreground">{l.ipAddress}</td>
                      <td data-label="Szczegóły" className="p-3 text-muted-foreground max-w-xs truncate">
                        {JSON.stringify(l.details)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmActionDialog
          open
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          loadingLabel={confirmation.loadingLabel}
          variant={confirmation.variant}
          onOpenChange={(open) => {
            if (!open) setConfirmation(null);
          }}
          onConfirm={confirmation.onConfirm}
        />
      )}

      {saleBook && (
        <Dialog open title="Metoda płatności" onOpenChange={(open) => { if (!open && !isPending) setSaleBook(null); }}>
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Metoda płatności</h3>
              <p className="mt-1 text-xs text-muted-foreground">Oznaczasz jako sprzedaną książkę „{saleBook.title}”.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => confirmFulfillOrder('BLIK')} disabled={isPending}>
                BLIK
              </Button>
              <Button onClick={() => confirmFulfillOrder('CASH')} disabled={isPending}>
                Gotówka
              </Button>
            </div>
            <Button variant="outline" onClick={() => setSaleBook(null)} className="w-full">
              Anuluj
            </Button>
          </div>
        </Dialog>
      )}

      {saleReservation && (
        <Dialog
          open
          title="Sprzedaj całą rezerwację"
          onOpenChange={(open) => {
            if (!open && !isPending) setSaleReservation(null);
          }}
        >
          <div className="space-y-5">
            <div className="pr-8">
              <h3 className="font-display text-lg font-bold text-foreground">
                Sprzedaj całą rezerwację
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ta operacja sprzeda wszystkie nadal zarezerwowane książki w jednej transakcji.
              </p>
            </div>
            <div className="grid gap-3 rounded-xl border border-border bg-surface-soft p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Kod rezerwacji</p>
                <p className="font-mono font-bold text-sue">{saleReservation.code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Liczba książek</p>
                <p className="font-bold text-foreground">
                  {saleReservation.items.filter((item) => item.book.status === 'RESERVED').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Łączna kwota</p>
                <p className="font-bold text-foreground">
                  {formatMoney(
                    saleReservation.items
                      .filter((item) => item.book.status === 'RESERVED')
                      .reduce((sum, item) => sum + item.book.price, 0),
                  )}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Metoda płatności</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => confirmSellEntireReservation('BLIK')}
                  disabled={isPending}
                >
                  BLIK
                </Button>
                <Button
                  onClick={() => confirmSellEntireReservation('CASH')}
                  disabled={isPending}
                >
                  Gotówka
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaleReservation(null)}
              disabled={isPending}
              className="w-full"
            >
              Anuluj
            </Button>
          </div>
        </Dialog>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Dodaj podręcznik przez admina z przypisaniem do użytkownika */}
      {/* ===================================================================== */}
      {showAddBookModal && (
        <Dialog open title="Dodaj podręcznik" onOpenChange={(open) => { if (!open && !isPending) setShowAddBookModal(false); }}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">
                Dodaj podręcznik do bazy (od razu dostępny)
              </h3>
              
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await adminCreateBook(formData);
                  if (res.success) {
                    toast.success(res.message);
                    setShowAddBookModal(false);
                    refreshData();
                  } else {
                    toast.error(res.error);
                  }
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-foreground">Tytuł *</Label>
                <Input name="title" required placeholder="np. Matematyka 3" className="border-border bg-elevated text-foreground" />
              </div>

              <div className="space-y-1">
                <Label className="text-foreground">Autor *</Label>
                <Input name="author" required placeholder="np. Marcin Kurczab" className="border-border bg-elevated text-foreground" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground">ISBN</Label>
                  <Input
                    name="isbn"
                    value={adminBookIsbn}
                    onChange={(event) => handleAdminIsbnChange(event.target.value)}
                    placeholder="978... (podpowiedzi od 3 znaków)"
                    className="border-border bg-elevated text-foreground"
                  />
                  {adminIsbnSuggestions.length > 0 && (
                    <div className="rounded-lg border border-border bg-surface p-1">
                      {adminIsbnSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.isbn}
                          type="button"
                          onClick={() => {
                            setAdminBookIsbn(suggestion.isbn);
                            setAdminIsbnSuggestions([]);
                          }}
                          className="block w-full rounded p-2 text-left text-[11px] text-foreground hover:bg-elevated"
                        >
                          {suggestion.title} - {suggestion.author} ({suggestion.isbn})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Przedmiot</Label>
                  <Input name="course_code" placeholder="np. Matematyka" className="border-border bg-elevated text-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground">Cena bazowa właściciela (PLN) *</Label>
                  <Input name="base_price" type="number" min="1" step="1" inputMode="numeric" required placeholder="25" className="border-border bg-elevated text-foreground font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Stan</Label>
                  <select name="condition" className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-foreground">
                    <option value="IDEALNY">Idealny</option>
                    <option value="JAK NOWY">Jak nowy</option>
                    <option value="DOBRY">Dobry</option>
                    <option value="UŻYWANY">Używany</option>
                  </select>
                </div>
              </div>

              {/* Assign to user */}
              <div className="space-y-1 pt-1">
                <Label className="text-foreground">Przypisz do zarejestrowanego użytkownika (Właściciel)</Label>
                <Input
                  value={bookOwnerSearch}
                  onChange={(event) => setBookOwnerSearch(event.target.value)}
                  placeholder="Szukaj po imieniu, nazwisku, klasie lub e-mailu"
                  className="mb-2 border-border bg-elevated text-foreground"
                />
                <select name="targetUserId" className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-foreground">
                  {bookOwnerOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email}) {u.class ? `• Klasa ${u.class}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddBookModal(false)}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Dodawanie…' : 'Zapisz i wystaw w katalogu'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Edycja książki */}
      {/* ===================================================================== */}
      {editingBook && (
        <Dialog open title="Edycja danych książki" onOpenChange={(open) => { if (!open && !isPending) setEditingBook(null); }}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">Edycja danych książki</h3>
              
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await updateBookData(editingBook.id, {
                    title: formData.get('title') as string,
                    author: formData.get('author') as string,
                    isbn: formData.get('isbn') as string,
                    courseCode: formData.get('course_code') as string,
                    basePrice: Number(formData.get('basePrice')),
                    status: formData.get('status') as string | null,
                  });
                  if (res.success) {
                    toast.success(res.message);
                    setEditingBook(null);
                    refreshData();
                  } else {
                    toast.error(res.error);
                  }
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-foreground">Tytuł</Label>
                <Input name="title" defaultValue={editingBook.title} required className="border-border bg-elevated text-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Autor</Label>
                <Input name="author" defaultValue={editingBook.author} required className="border-border bg-elevated text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground">ISBN</Label>
                  <Input name="isbn" defaultValue={editingBook.isbn || ''} className="border-border bg-elevated text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Przedmiot</Label>
                  <Input name="course_code" defaultValue={editingBook.courseCode || ''} className="border-border bg-elevated text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground">Cena bazowa właściciela</Label>
                  <Input name="basePrice" type="number" min="1" step="1" inputMode="numeric" defaultValue={editingBook.basePrice ?? ''} required className="border-border bg-elevated text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Status</Label>
                  {editingBook.status === 'RESERVED' || editingBook.status === 'SOLD' ? (
                    <div className="flex min-h-11 items-center rounded-md border border-border bg-surface-soft px-3 text-sm text-muted-foreground">
                      {editingBook.status === 'RESERVED'
                        ? 'Zarezerwowana — użyj akcji rezerwacji'
                        : 'Sprzedana — status rozliczeniowy'}
                    </div>
                  ) : (
                    <select name="status" defaultValue={editingBook.status} className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-foreground">
                      <option value="PENDING_APPROVAL">Oczekuje na akceptację</option>
                      <option value="AVAILABLE">Dostępna</option>
                      <option value="REJECTED">Odrzucona</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingBook(null)}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Zapisywanie…' : 'Zapisz zmiany'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Edycja profilu użytkownika przez admina */}
      {/* ===================================================================== */}
      {editingUser && (
        <Dialog open title="Edycja użytkownika" onOpenChange={(open) => { if (!open && !isPending) setEditingUser(null); }}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">
                Edycja użytkownika: {editingUser.fullName}
              </h3>
              
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await adminUpdateUserProfile(editingUser.id, {
                    fullName: formData.get('fullName') as string,
                    phone: formData.get('phone') as string,
                    class: formData.get('class') as string,
                    school: formData.get('school') as string,
                    refundMethod: formData.get('refundMethod') as string,
                    role: isHeadAdmin ? (formData.get('role') as string) : editingUser.role,
                  });
                  if (res.success) {
                    toast.success(res.message);
                    setEditingUser(null);
                    refreshData();
                  } else {
                    toast.error(res.error);
                  }
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-foreground">Imię i nazwisko</Label>
                <Input name="fullName" defaultValue={editingUser.fullName} required className="border-border bg-elevated text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground">Telefon</Label>
                  <Input name="phone" defaultValue={getPolishPhoneDigits(editingUser.phone)} inputMode="numeric" maxLength={9} pattern="[0-9]{9}" className="border-border bg-elevated text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Klasa</Label>
                  <Input name="class" defaultValue={editingUser.class || ''} className="border-border bg-elevated text-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Forma zwrotu środków</Label>
                <select name="refundMethod" defaultValue={editingUser.refundMethod} className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-foreground">
                  <option value="Gotówka w szkole">Gotówka w punkcie stacjonarnym</option>
                  <option value="Przelew na telefon BLIK">Przelew na telefon BLIK</option>
                  <option value="Przelew bankowy">Przelew bankowy (dotychczasowa preferencja)</option>
                </select>
              </div>
              {isHeadAdmin && <div className="space-y-1">
                <Label className="text-foreground">Rola</Label>
                <select name="role" defaultValue={editingUser.role} className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-foreground">
                  <option value="user">Użytkownik (user)</option>
                  <option value="admin">Administrator (admin)</option>
                  <option value="head_admin">Head Admin</option>
                </select>
              </div>}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Zapisywanie…' : 'Zapisz profil'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
      
      {['books', 'users', 'reservations', 'logs'].includes(activeTab) && (
        <div className="flex items-center justify-center gap-3 pt-6 pb-2 border-t border-border mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const p = new URLSearchParams(window.location.search);
              p.set('page', String(Math.max(1, (currentPage || 1) - 1)));
              router.push(`?${p.toString()}`, { scroll: true });
            }}
            disabled={(currentPage || 1) <= 1}
          >
            Poprzednia
          </Button>
          <span className="text-sm font-medium">
            Strona {currentPage || 1} z {Math.max(1, Math.ceil((
              activeTab === 'books' ? booksTotal || 0 :
              activeTab === 'users' ? usersTotal || 0 :
              activeTab === 'reservations' ? reservationsTotal || 0 :
              activeTab === 'logs' ? logsTotal || 0 : 0
            ) / (pageSize || 50)))}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const p = new URLSearchParams(window.location.search);
              p.set('page', String((currentPage || 1) + 1));
              router.push(`?${p.toString()}`, { scroll: true });
            }}
            disabled={(currentPage || 1) >= Math.ceil((
              activeTab === 'books' ? booksTotal || 0 :
              activeTab === 'users' ? usersTotal || 0 :
              activeTab === 'reservations' ? reservationsTotal || 0 :
              activeTab === 'logs' ? logsTotal || 0 : 0
            ) / (pageSize || 50))}
          >
            Następna
          </Button>
        </div>
      )}
    </div>
  );
}
