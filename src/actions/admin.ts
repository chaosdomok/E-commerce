'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/system-notifications';
import { calculatePriceWithMarkup } from '@/actions/pricing';
import { logAuditEvent } from '@/lib/audit';
import {
  sendBookApprovedEmail,
  sendBookRejectedEmail,
  sendBookSoldEmail,
  sendOfflineAccountActivationEmail,
  sendPayoutReadyEmail,
  sendReservationReadyEmail,
  sendAccountBlockedEmail,
} from '@/lib/email';
import { normalizePolishPhone } from '@/lib/profile';
import { getEffectiveRole } from '@/lib/roles';
import { normalizeClassName } from '@/lib/student-normalization';
import { Prisma } from '@/generated/prisma/client';
import {
  BLOCKED_ACCOUNT_MESSAGE,
} from '@/lib/account-access';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { validatePasswordConfirmation } from '@/lib/password-policy';
import { formatWholePln, parseWholePln } from '@/lib/money';
import { validateMarkupRules } from '@/lib/pricing';
import { logPerformance } from '@/lib/performance';
import { validateAndNormalizeIsbn13 } from '@/lib/isbn-validation';

export type PaymentMethodValue = 'BLIK' | 'CASH';

export type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

type AdminLevel = 'admin' | 'head_admin';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function verifyAdmin(requiredLevel: AdminLevel = 'admin') {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Musisz być zalogowany.');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { email: true, role: true, isBlocked: true },
  });

  if (profile?.isBlocked) {
    await supabase.auth.signOut();
    throw new Error(BLOCKED_ACCOUNT_MESSAGE);
  }

  const effectiveRole = getEffectiveRole(
    user.email ?? profile?.email,
    profile?.role,
  );
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'head_admin';
  const isHeadAdmin = effectiveRole === 'head_admin';

  if (!isAdmin || (requiredLevel === 'head_admin' && !isHeadAdmin)) {
    throw new Error('Brak uprawnień administratora.');
  }

  return user;
}

type FulfillmentStatusValue = 'PREPARING' | 'READY';

export async function setReservationFulfillmentStatus(
  reservationId: string,
  status: FulfillmentStatusValue,
): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();
    if (!['PREPARING', 'READY'].includes(status)) {
      return { success: false, error: 'Nieprawidłowy status przygotowania.' };
    }

    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, status: 'ACTIVE' },
      select: {
        id: true,
        code: true,
        userId: true,
        user: { select: { email: true, fullName: true } },
      },
    });
    if (!reservation) {
      return {
        success: false,
        error: 'Status przygotowania można zmienić tylko dla aktywnej rezerwacji.',
      };
    }

    const result = await prisma.reservation.updateMany({
      where: { id: reservationId, status: 'ACTIVE' },
      data: { fulfillmentStatus: status },
    });
    if (result.count !== 1) {
      return {
        success: false,
        error: 'Status przygotowania można zmienić tylko dla aktywnej rezerwacji.',
      };
    }

    await logAuditEvent({
      action: 'RESERVATION_FULFILLMENT_UPDATE',
      userId: admin.id,
      details: { reservationId, status },
    });
    if (status === 'READY') {
      await createNotification({
        userId: reservation.userId,
        title: 'Rezerwacja gotowa do odbioru',
        message: `Rezerwacja ${reservation.code} jest gotowa do odbioru.`,
        type: 'success',
        eventKey: `reservation-ready:${reservation.id}`,
      });
      if (reservation.user.email) {
        const emailResult = await sendReservationReadyEmail({
          email: reservation.user.email,
          fullName: reservation.user.fullName || 'Użytkowniku',
          reservationCode: reservation.code,
        });
        if (!emailResult.success) {
          console.error('[RESERVATION_READY_EMAIL_FAILED]', emailResult.error);
        }
      }
    }
    revalidatePath('/admin');
    return { success: true, message: 'Zmieniono status przygotowania rezerwacji.' };
  } catch (err) {
    return {
      success: false,
      error: getErrorMessage(err, 'Nie udało się zmienić statusu przygotowania.'),
    };
  }
}

export async function setUserBlocked(
  userId: string,
  isBlocked: boolean,
): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin('head_admin');
    if (admin.id === userId && isBlocked) {
      return { success: false, error: 'Nie możesz zablokować własnego konta.' };
    }

    // Odczytaj poprzedni stan konta, żeby wiedzieć czy to przejście active→blocked
    const previousProfile = isBlocked
      ? await prisma.profile.findUnique({
          where: { id: userId },
          select: { isBlocked: true, email: true, fullName: true },
        })
      : null;

    const result = await prisma.profile.updateMany({
      where: { id: userId },
      data: {
        isBlocked,
        blockedAt: isBlocked ? new Date() : null,
      },
    });
    if (result.count !== 1) {
      return { success: false, error: 'Użytkownik nie został znaleziony.' };
    }

    await logAuditEvent({
      action: isBlocked ? 'USER_BLOCK' : 'USER_UNBLOCK',
      userId: admin.id,
      details: { targetUserId: userId },
    });
    revalidatePath('/admin');

    // Wyślij email wyłącznie przy przejściu active → blocked (nie przy ponownej blokadzie)
    if (isBlocked && previousProfile && !previousProfile.isBlocked) {
      const userEmail = previousProfile.email;
      if (userEmail) {
        const emailResult = await sendAccountBlockedEmail({
          email: userEmail,
          fullName: previousProfile.fullName ?? 'Użytkowniku',
        });
        if (!emailResult.success) {
          console.error('[ACCOUNT_BLOCKED_EMAIL_FAILED]', emailResult.error);
        }
      }
    }

    return {
      success: true,
      message: isBlocked ? 'Konto zostało zablokowane.' : 'Konto zostało odblokowane.',
    };
  } catch (err) {
    return {
      success: false,
      error: getErrorMessage(err, 'Nie udało się zmienić blokady konta.'),
    };
  }
}


/**
 * Approve one or multiple books
 */
export async function approveBooksBatch(bookIds: string[]): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();

    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, author: true, isbn: true, price: true, basePrice: true, sellerId: true, seller: { select: { email: true, fullName: true } } },
    });

    await prisma.book.updateMany({
      where: {
        id: { in: bookIds },
      },
      data: {
        status: 'AVAILABLE',
        acceptedAt: new Date(),
      },
    });

    for (const bookId of bookIds) {
      await logAuditEvent({
        action: 'BOOK_APPROVE',
        userId: admin.id,
        details: { bookId },
      });
    }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booksBySeller = new Map<string, { seller: any; books: any[] }>();
    for (const book of books) {
      if (book.isbn) {
        const { validateAndNormalizeIsbn13 } = await import('@/lib/isbn-validation');
        const validIsbn = validateAndNormalizeIsbn13(book.isbn);
        if (validIsbn) {
          try {
            await prisma.isbnBook.upsert({
              where: { isbn: validIsbn },
              update: { title: book.title, author: book.author },
              create: { isbn: validIsbn, title: book.title, author: book.author },
            });
          } catch (e) {
            console.error('[ISBN_CATALOG_UPSERT_FAILED]', e);
          }
        }
      }
      
      if (!book.sellerId) continue;
      if (!booksBySeller.has(book.sellerId)) {
        booksBySeller.set(book.sellerId, { seller: book.seller, books: [] });
      }
      booksBySeller.get(book.sellerId)!.books.push(book);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processApproveSideEffects = async (entry: { seller: any; books: any[] }) => {
      const { seller, books } = entry;
      for (const book of books) {
        await createNotification({
          userId: seller.id,
          title: 'Książka zatwierdzona',
          message: `Podręcznik „${book.title}” został zatwierdzony i jest widoczny w katalogu.`,
          type: 'success',
          eventKey: `book-approved:${book.id}`,
        });
      }
      
      if (seller?.email) {
        const { sendBooksApprovedBatchEmail } = await import('@/lib/email');
        const formattedBooks = books.map(b => ({ title: b.title, price: Number(b.basePrice || b.price) }));
        const emailResult = await sendBooksApprovedBatchEmail({
          email: seller.email,
          fullName: seller.fullName || 'Użytkowniku',
          books: formattedBooks
        });
        if (!emailResult.success) console.error('[BOOK_APPROVED_BATCH_EMAIL_FAILED]', emailResult.error);
      }
    };
    
    const approveSellerEntries = Array.from(booksBySeller.values());
    for (let i = 0; i < approveSellerEntries.length; i += 5) {
      const chunk = approveSellerEntries.slice(i, i + 5);
      await Promise.allSettled(chunk.map(processApproveSideEffects));
    }

    revalidatePath('/admin');
    revalidatePath('/katalog');
    revalidatePath('/');
    revalidatePath('/profile');
    return { success: true, message: `Zaakceptowano ${bookIds.length} podręcznik(ów).` };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas akceptacji książek.') };
  }
}

/**
 * Reject one or multiple books
 */
export async function rejectBooksBatch(bookIds: string[], reason?: string): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();

    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: {
        id: true,
        title: true,
        sellerId: true,
        seller: { select: { email: true, fullName: true } },
      },
    });

    await prisma.book.updateMany({
      where: {
        id: { in: bookIds },
      },
      data: {
        status: 'REJECTED',
      },
    });

    for (const bookId of bookIds) {
      await logAuditEvent({
        action: 'BOOK_REJECT',
        userId: admin.id,
        details: { bookId, reason },
      });
    }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booksBySeller = new Map<string, { seller: any; books: any[] }>();
    for (const book of books) {
      if (!book.sellerId) continue;
      if (!booksBySeller.has(book.sellerId)) {
        booksBySeller.set(book.sellerId, { seller: book.seller, books: [] });
      }
      booksBySeller.get(book.sellerId)!.books.push(book);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processRejectSideEffects = async (entry: { seller: any; books: any[] }) => {
      const { seller, books } = entry;
      for (const book of books) {
        await createNotification({
          userId: seller.id,
          title: 'Książka odrzucona',
          message: reason
            ? `Podręcznik „${book.title}” został odrzucony. Powód: ${reason}`
            : `Podręcznik „${book.title}” został odrzucony.`,
          type: 'error',
          eventKey: `book-rejected:${book.id}`,
        });
      }
      
      if (seller?.email) {
        const { sendBooksRejectedBatchEmail } = await import('@/lib/email');
        const formattedBooks = books.map(b => ({ title: b.title, reason }));
        const emailResult = await sendBooksRejectedBatchEmail({
          email: seller.email,
          fullName: seller.fullName || 'Użytkowniku',
          books: formattedBooks
        });
        if (!emailResult.success) console.error('[BOOK_REJECTED_BATCH_EMAIL_FAILED]', emailResult.error);
      }
    };

    const rejectSellerEntries = Array.from(booksBySeller.values());
    for (let i = 0; i < rejectSellerEntries.length; i += 5) {
      const chunk = rejectSellerEntries.slice(i, i + 5);
      await Promise.allSettled(chunk.map(processRejectSideEffects));
    }

    revalidatePath('/admin');
    revalidatePath('/katalog');
    revalidatePath('/profile');
    return { success: true, message: `Odrzucono ${bookIds.length} podręcznik(ów).` };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas odrzucania książek.') };
  }
}

/**
 * Delete a book completely
 */
export async function deleteBook(bookId: string): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();

    await prisma.book.delete({
      where: { id: bookId },
    });

    await logAuditEvent({
      action: 'BOOK_DELETE',
      userId: admin.id,
      details: { bookId },
    });

    revalidatePath('/admin');
    revalidatePath('/katalog');
    revalidatePath('/');
    return { success: true, message: 'Książka została usunięta.' };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Nie udało się usunąć książki.') };
  }
}

/**
 * Update book data
 */
export async function updateBookData(
  bookId: string,
  data: {
    title?: string;
    author?: string;
    isbn?: string | null;
    condition?: string | null;
    courseCode?: string | null;
    basePrice?: number;
    status?: string | null;
  }
): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();

    const updateData: {
      title?: string;
      author?: string;
      isbn?: string | null;
      condition?: string;
      courseCode?: string | null;
      basePrice?: number;
      price?: number;
      status?: 'PENDING_APPROVAL' | 'AVAILABLE' | 'REJECTED';
    } = {};

    if (typeof data.title === 'string') {
      const title = data.title.trim();
      if (!title) return { success: false, error: 'Tytuł nie może być pusty.' };
      updateData.title = title;
    }
    if (typeof data.author === 'string') {
      const author = data.author.trim();
      if (!author) return { success: false, error: 'Autor nie może być pusty.' };
      updateData.author = author;
    }
    if (data.isbn !== undefined) {
      updateData.isbn = data.isbn?.trim() || null;
    }
    if (typeof data.condition === 'string') {
      const condition = data.condition.trim();
      if (!condition) return { success: false, error: 'Stan książki nie może być pusty.' };
      updateData.condition = condition;
    }
    if (data.courseCode !== undefined) {
      updateData.courseCode = data.courseCode?.trim() || null;
    }
    if (data.basePrice !== undefined) {
      const price = parseWholePln(data.basePrice, 'Cena bazowa');
      if (!price.success) return { success: false, error: price.error };
      const { finalPrice } = await calculatePriceWithMarkup(price.value);
      updateData.basePrice = price.value;
      updateData.price = finalPrice;
    }
    if (data.status !== undefined && data.status !== null) {
      if (data.status === 'RESERVED') {
        return {
          success: false,
          error: 'Status RESERVED może zostać ustawiony wyłącznie przez mechanizm rezerwacji.',
        };
      }
      if (data.status === 'SOLD') {
        return {
          success: false,
          error: 'Status SOLD ustaw przez akcję sprzedaży z wyborem metody płatności.',
        };
      }
      if (!['PENDING_APPROVAL', 'AVAILABLE', 'REJECTED'].includes(data.status)) {
        return { success: false, error: 'Nieprawidłowy status książki.' };
      }

      const currentBook = await prisma.book.findUnique({
        where: { id: bookId },
        select: { status: true },
      });
      if (!currentBook) {
        return { success: false, error: 'Nie znaleziono podręcznika.' };
      }
      if (currentBook.status === 'RESERVED' && currentBook.status !== data.status) {
        return {
          success: false,
          error: 'Aktywną rezerwację anuluj dedykowaną akcją.',
        };
      }
      if (currentBook.status === 'SOLD' && currentBook.status !== data.status) {
        return {
          success: false,
          error: 'Statusu sprzedanej książki nie można zmienić zwykłą edycją.',
        };
      }
      updateData.status = data.status as typeof updateData.status;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'Nie przekazano danych do aktualizacji.' };
    }

    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: updateData,
    });

    await logAuditEvent({
      action: 'BOOK_UPDATE',
      userId: admin.id,
      details: { bookId, changes: updateData },
    });

    if (updatedBook.status === 'AVAILABLE' && updatedBook.isbn) {
      const validIsbn = validateAndNormalizeIsbn13(updatedBook.isbn);
      if (validIsbn) {
        try {
          await prisma.isbnBook.upsert({
            where: { isbn: validIsbn },
            update: { title: updatedBook.title, author: updatedBook.author },
            create: { isbn: validIsbn, title: updatedBook.title, author: updatedBook.author },
          });
        } catch (e) {
          console.error('[ISBN_CATALOG_UPSERT_FAILED]', e);
        }
      }
    }

    revalidatePath('/admin');
    revalidatePath('/katalog');
    revalidatePath(`/book/${bookId}`);
    return { success: true, message: 'Podręcznik został zaktualizowany.' };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas edycji podręcznika.') };
  }
}

/**
 * Add book created by admin directly (auto AVAILABLE and assigned to seller or admin)
 */
export async function adminCreateBook(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();

    const title = (formData.get('title') as string)?.trim();
    const author = (formData.get('author') as string)?.trim();
    const isbn = (formData.get('isbn') as string)?.trim();
    const condition = (formData.get('condition') as string) || 'DOBRY';
    const courseCode = (formData.get('course_code') as string)?.trim();
    const basePrice = Number(formData.get('base_price') || formData.get('price'));
    const targetUserId = (formData.get('targetUserId') as string)?.trim() || admin.id;

    if (!title || !author) {
      return { success: false, error: 'Wypełnij wymagane pola.' };
    }

    const price = parseWholePln(basePrice, 'Cena bazowa');
    if (!price.success) return { success: false, error: price.error };

    const { finalPrice } = await calculatePriceWithMarkup(price.value);

    const created = await prisma.book.create({
      data: {
        title,
        author,
        isbn: isbn || null,
        condition,
        courseCode: courseCode || null,
        basePrice: price.value,
        price: finalPrice,
        status: 'AVAILABLE',
        acceptedAt: new Date(),
        sellerId: targetUserId,
        addedByAdminId: admin.id,
      },
    });

    await logAuditEvent({
      action: 'ADMIN_CREATE_BOOK',
      userId: admin.id,
      details: { bookId: created.id, title, targetUserId, basePrice: price.value, finalPrice },
    });

    if (isbn) {
      const validIsbn = validateAndNormalizeIsbn13(isbn);
      if (validIsbn) {
        try {
          await prisma.isbnBook.upsert({
            where: { isbn: validIsbn },
            update: { title, author },
            create: { isbn: validIsbn, title, author },
          });
        } catch (e) {
          console.error('[ISBN_CATALOG_UPSERT_FAILED]', e);
        }
      }
    }

    revalidatePath('/admin');
    revalidatePath('/katalog');
    revalidatePath('/');
    return { success: true, message: 'Podręcznik został dodany i jest od razu dostępny w katalogu.' };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas dodawania książki.') };
  }
}

const saleBookSelect = {
  id: true,
  title: true,
  status: true,
  reservedByUserId: true,
  sellerId: true,
  basePrice: true,
  seller: { select: { email: true, fullName: true, refundMethod: true } },
  reservationItems: {
    where: { reservation: { status: 'ACTIVE' as const } },
    select: { reservationId: true },
    take: 1,
  },
} satisfies Prisma.BookSelect;

type SoldBookContext = Prisma.BookGetPayload<{ select: typeof saleBookSelect }>;

async function sellBookInTransaction(
  tx: Prisma.TransactionClient,
  bookId: string,
  paymentMethod: PaymentMethodValue,
  requiredReservationId?: string,
): Promise<SoldBookContext> {
  const book = await tx.book.findUnique({ where: { id: bookId }, select: saleBookSelect });
  if (!book) throw new Error('Nie znaleziono podręcznika.');

  const allowed = requiredReservationId
    ? book.status === 'RESERVED' &&
      book.reservationItems.some((item) => item.reservationId === requiredReservationId)
    : book.status === 'AVAILABLE' || book.status === 'RESERVED';
  if (!allowed) {
    throw new Error(
      requiredReservationId
        ? 'Jedna z książek nie należy już do aktywnej rezerwacji.'
        : 'Jako sprzedaną można oznaczyć tylko książkę dostępną lub zarezerwowaną.',
    );
  }
  if (book.basePrice === null) {
    throw new Error('Przed oznaczeniem sprzedaży uzupełnij cenę bazową właściciela.');
  }

  const update = await tx.book.updateMany({
    where: { id: bookId, status: book.status },
    data: { status: 'SOLD', paymentMethod },
  });
  if (update.count !== 1) {
    throw new Error('Status książki zmienił się podczas realizacji sprzedaży.');
  }
  return book;
}

async function sendSaleSideEffects(
  adminId: string,
  book: SoldBookContext,
  paymentMethod: PaymentMethodValue,
) {
  if (book.reservedByUserId) {
    await createNotification({
      userId: book.reservedByUserId,
      title: 'Książka odebrana',
      message: `Twoja rezerwacja "${book.title}" została zrealizowana. Dziękujemy!`,
      type: 'success',
      eventKey: `book-purchased:${book.id}:${book.reservedByUserId}`,
    });
  }
  if (book.sellerId) {
    await createNotification({
      userId: book.sellerId,
      title: 'Twój podręcznik został sprzedany!',
      message: `Podręcznik "${book.title}" został sprzedany. Kwota do wypłaty: ${formatWholePln(Number(book.basePrice))}.`,
      type: 'success',
      eventKey: `book-sold:${book.id}:${book.sellerId}`,
    });
    if (book.seller?.email) {
      const emailResult = await sendBookSoldEmail({
        email: book.seller.email,
        fullName: book.seller.fullName || 'Użytkowniku',
        title: book.title,
        payoutAmount: Number(book.basePrice),
        refundMethod: book.seller.refundMethod || 'Gotówka w szkole',
      });
      if (!emailResult.success) console.error('[BOOK_SOLD_EMAIL_FAILED]', emailResult.error);
      const payoutEmail = await sendPayoutReadyEmail({
        email: book.seller.email,
        fullName: book.seller.fullName || 'Użytkowniku',
        amount: Number(book.basePrice),
        paymentMethod: paymentMethod,
      });
      if (!payoutEmail.success) console.error('[PAYOUT_READY_EMAIL_FAILED]', payoutEmail.error);
    }
  }
  await logAuditEvent({
    action: 'BOOK_FULFILL_SALE',
    userId: adminId,
    details: {
      bookId: book.id,
      title: book.title,
      sellerId: book.sellerId,
      buyerId: book.reservedByUserId,
      paymentMethod,
    },
  });
}

/** Fulfill one book while keeping individual sales possible. */
export async function fulfillOrder(
  bookId: string,
  paymentMethod: PaymentMethodValue,
): Promise<ActionResult> {
  const perfStart = performance.now();
  try {
    const admin = await verifyAdmin();
    if (!['BLIK', 'CASH'].includes(paymentMethod)) {
      return { success: false, error: 'Nieprawidłowa metoda płatności.' };
    }

    const book = await prisma.$transaction(async (tx) => {
      const sold = await sellBookInTransaction(tx, bookId, paymentMethod);
      const reservationId = sold.reservationItems[0]?.reservationId;
      if (reservationId) {
        const remaining = await tx.reservationItem.count({
          where: { reservationId, book: { status: 'RESERVED' } },
        });
        if (remaining === 0) {
          await tx.reservation.updateMany({
            where: { id: reservationId, status: 'ACTIVE' },
            data: { status: 'COMPLETED' },
          });
        }
      }
      return sold;
    });

    await sendSaleSideEffects(admin.id, book, paymentMethod);
    revalidatePath('/admin');
    revalidatePath('/profile');
    revalidatePath('/');
    logPerformance({
      operation: 'fulfillOrder',
      durationMs: performance.now() - perfStart,
      result: 'success',
      metadata: { paymentMethod },
    });
    return { success: true, message: 'Sprzedaż zrealizowana. Poinformowano kupującego i sprzedawcę.' };
  } catch (err) {
    logPerformance({
      operation: 'fulfillOrder',
      durationMs: performance.now() - perfStart,
      result: 'error',
      metadata: { paymentMethod },
    });
    return { success: false, error: getErrorMessage(err, 'Błąd podczas realizacji sprzedaży.') };
  }
}

export async function sellEntireReservation(
  reservationId: string,
  paymentMethod: PaymentMethodValue,
): Promise<ActionResult> {
  const perfStart = performance.now();
  try {
    const admin = await verifyAdmin();
    if (!['BLIK', 'CASH'].includes(paymentMethod)) {
      return { success: false, error: 'Nieprawidłowa metoda płatności.' };
    }

    const soldBooks = await prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          select: {
            id: true,
            status: true,
            items: {
              where: { book: { status: 'RESERVED' } },
              select: { bookId: true },
            },
          },
        });
        if (!reservation || reservation.status !== 'ACTIVE') {
          throw new Error('Nie znaleziono aktywnej rezerwacji.');
        }
        if (reservation.items.length === 0) {
          throw new Error('Rezerwacja nie zawiera książek oczekujących na sprzedaż.');
        }

        const books: SoldBookContext[] = [];
        for (const item of reservation.items) {
          books.push(
            await sellBookInTransaction(tx, item.bookId, paymentMethod, reservation.id),
          );
        }

        const completed = await tx.reservation.updateMany({
          where: { id: reservation.id, status: 'ACTIVE' },
          data: { status: 'COMPLETED' },
        });
        if (completed.count !== 1) {
          throw new Error('Rezerwacja zmieniła status podczas sprzedaży.');
        }
        return books;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booksBySeller = new Map<string, { seller: any; books: any[] }>();
    for (const book of soldBooks) {
      if (!book.sellerId) continue;
      if (!booksBySeller.has(book.sellerId)) {
        booksBySeller.set(book.sellerId, { seller: book.seller, books: [] });
      }
      booksBySeller.get(book.sellerId)!.books.push(book);
      
      if (book.reservedByUserId) {
        await createNotification({
          userId: book.reservedByUserId,
          title: 'Książka odebrana',
          message: `Twoja rezerwacja "${book.title}" została zrealizowana. Dziękujemy!`,
          type: 'success',
          eventKey: `book-purchased:${book.id}:${book.reservedByUserId}`,
        });
      }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processSellerSideEffects = async (entry: { seller: any; books: any[] }) => {
      const { seller, books } = entry;
      for (const book of books) {
        await createNotification({
          userId: seller.id,
          title: 'Twój podręcznik został sprzedany!',
          message: `Podręcznik "${book.title}" został sprzedany. Kwota do wypłaty: ${formatWholePln(Number(book.basePrice))}.`,
          type: 'success',
          eventKey: `book-sold:${book.id}:${seller.id}`,
        });
      }
      
      if (seller?.email) {
        const titles = books.map(b => b.title);
        const totalPayout = books.reduce((sum, b) => sum + Number(b.basePrice), 0);
        const { sendBooksSoldBatchEmail } = await import('@/lib/email');
        const emailResult = await sendBooksSoldBatchEmail({
          email: seller.email,
          fullName: seller.fullName || 'Użytkowniku',
          titles,
          totalPayoutAmount: totalPayout,
          refundMethod: seller.refundMethod || 'Gotówka w szkole',
        });
        if (!emailResult.success) console.error('[BOOK_SOLD_BATCH_EMAIL_FAILED]', emailResult.error);
      }
    };

    const sellerEntries = Array.from(booksBySeller.values());
    for (let i = 0; i < sellerEntries.length; i += 5) {
      const chunk = sellerEntries.slice(i, i + 5);
      await Promise.allSettled(chunk.map(processSellerSideEffects));
    }
    await logAuditEvent({
      action: 'RESERVATION_FULFILL_SALE',
      userId: admin.id,
      details: { reservationId, bookIds: soldBooks.map((book) => book.id), paymentMethod },
    });
    revalidatePath('/admin');
    revalidatePath('/profile');
    revalidatePath('/katalog');
    logPerformance({
      operation: 'sellEntireReservation',
      durationMs: performance.now() - perfStart,
      result: 'success',
      metadata: { books: soldBooks.length, paymentMethod },
    });
    return {
      success: true,
      message: `Sprzedano wszystkie książki w rezerwacji (${soldBooks.length}).`,
    };
  } catch (err) {
    logPerformance({
      operation: 'sellEntireReservation',
      durationMs: performance.now() - perfStart,
      result: 'error',
      metadata: { paymentMethod },
    });
    return {
      success: false,
      error: getErrorMessage(err, 'Nie udało się sprzedać całej rezerwacji.'),
    };
  }
}

export async function markBooksPaid(bookIds: string[]): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();
    if (bookIds.length === 0) return { success: false, error: 'Nie zaznaczono książek.' };

    // Security check: Verify books exist and are SOLD
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, status: true, sellerId: true, payoutPaidAt: true, paymentMethod: true, basePrice: true, seller: { select: { email: true, fullName: true, refundMethod: true } } },
    });

    if (books.length !== bookIds.length) {
      return { success: false, error: 'Nie znaleziono wszystkich wybranych książek.' };
    }

    const invalidBooks = books.filter(book => book.status !== 'SOLD' || book.payoutPaidAt !== null);
    if (invalidBooks.length > 0) {
      return { success: false, error: 'Można oznaczyć jako wypłacone tylko sprzedane książki, które jeszcze nie zostały wypłacone.' };
    }

    const result = await prisma.book.updateMany({
      where: { id: { in: bookIds }, status: 'SOLD', payoutPaidAt: null },
      data: { payoutPaidAt: new Date(), payoutPaidById: admin.id },
    });

    await logAuditEvent({
      action: 'PAYOUT_MARKED_PAID',
      userId: admin.id,
      details: { bookIds, count: result.count },
    });

    // Send intelligent payout notifications grouped by seller
    const booksBySeller = new Map<string, { seller: any; books: any[]; totalAmount: number }>();
    for (const book of books) {
      if (!book.sellerId) continue;
      if (!booksBySeller.has(book.sellerId)) {
        booksBySeller.set(book.sellerId, { seller: book.seller, books: [], totalAmount: 0 });
      }
      const entry = booksBySeller.get(book.sellerId)!;
      entry.books.push(book);
      entry.totalAmount += Number(book.basePrice);
    }

    for (const [currentSellerId, entry] of booksBySeller) {
      if (entry.seller?.email) {
        const payoutEmail = await sendPayoutReadyEmail({
          email: entry.seller.email,
          fullName: entry.seller.fullName || 'Użytkowniku',
          amount: entry.totalAmount,
          paymentMethod: entry.seller.refundMethod || 'Gotówka w szkole',
        });
        if (!payoutEmail.success) {
          console.error('[PAYOUT_EMAIL_FAILED]', payoutEmail.error);
        }
      }
    }

    revalidatePath('/admin');
    revalidatePath('/profile');
    return { success: true, message: `Oznaczono jako wypłacone: ${result.count}.` };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas oznaczania wypłat.') };
  }
}

/**
 * Cancel a reservation
 */
export async function cancelReservation(reservationId: string): Promise<ActionResult> {
  const perfStart = performance.now();
  try {
    const admin = await verifyAdmin();

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        code: true,
        userId: true,
        status: true,
        items: {
          select: { bookId: true, book: { select: { title: true } } },
        },
      },
    });

    if (!reservation || reservation.status !== 'ACTIVE') {
      return { success: false, error: 'Nie znaleziono aktywnej rezerwacji.' };
    }

    await prisma.$transaction(async (tx) => {
      const statusUpdate = await tx.reservation.updateMany({
        where: { id: reservation.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });
      if (statusUpdate.count !== 1) {
        throw new Error('Rezerwacja nie jest już aktywna.');
      }
      await tx.book.updateMany({
        where: {
          id: { in: reservation.items.map((item) => item.bookId) },
          status: 'RESERVED',
          reservedByUserId: reservation.userId,
        },
        data: {
          status: 'AVAILABLE',
          reservedByUserId: null,
          reservedUntil: null,
          reservationCode: null,
        },
      });
    });

    await createNotification({
      userId: reservation.userId,
      title: 'Rezerwacja anulowana',
      message: `Rezerwacja ${reservation.code} została anulowana.`,
      type: 'warning',
      eventKey: `reservation-admin-cancelled:${reservation.id}`,
    });

    await logAuditEvent({
      action: 'BOOK_CANCEL_RESERVATION',
      userId: admin.id,
      details: {
        reservationId: reservation.id,
        reservationCode: reservation.code,
        bookIds: reservation.items.map((item) => item.bookId),
      },
    });

    revalidatePath('/admin');
    revalidatePath('/katalog');
    revalidatePath('/profile');
    logPerformance({
      operation: 'cancelReservation',
      durationMs: performance.now() - perfStart,
      result: 'success',
      metadata: { books: reservation.items.length },
    });
    return { success: true, message: 'Rezerwacja została anulowana.' };
  } catch (err) {
    logPerformance({
      operation: 'cancelReservation',
      durationMs: performance.now() - perfStart,
      result: 'error',
    });
    return { success: false, error: getErrorMessage(err, 'Błąd podczas anulowania rezerwacji.') };
  }
}

/**
 * Toggle system setting (e.g. allow_book_submission)
 */
export async function setSystemSetting(key: string, value: string): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin('head_admin');

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await logAuditEvent({
      action: 'ADMIN_UPDATE_SETTINGS',
      userId: admin.id,
      details: { key, value },
    });

    revalidatePath('/admin');
    revalidatePath('/dodaj-ksiazke');
    return { success: true, message: `Zaktualizowano ustawienie "${key}".` };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas zapisu ustawienia.') };
  }
}

/**
 * Update / save price markups
 */
export async function savePriceMarkups(
  rules: Array<{ id?: string; minPrice: number; maxPrice: number | null; markup: number }>
): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin('head_admin');
    const validation = validateMarkupRules(rules);
    if (!validation.success) return { success: false, error: validation.error };

    // Clear and re-populate price markups
    await prisma.priceMarkup.deleteMany();

    for (const r of rules) {
      await prisma.priceMarkup.create({
        data: {
          minPrice: r.minPrice,
          maxPrice: r.maxPrice,
          markup: r.markup,
        },
      });
    }

    await logAuditEvent({
      action: 'ADMIN_UPDATE_MARKUP',
      userId: admin.id,
      details: { rulesCount: rules.length },
    });

    revalidatePath('/admin');
    revalidatePath('/dodaj-ksiazke');
    revalidatePath('/katalog');
    return { success: true, message: 'Zaktualizowano progi narzutów cenowych.' };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd zapisu progów narzutu.') };
  }
}

/**
 * Create offline account stacjonarnie by admin
 */
export async function adminCreateOfflineUser(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();

    const firstName = (formData.get('firstName') as string)?.trim();
    const lastName = (formData.get('lastName') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const phone = (formData.get('phone') as string)?.trim();
    const normalizedPhone = normalizePolishPhone(phone);
    const className = normalizeClassName(formData.get('class') as string);
    const school = (formData.get('school') as string)?.trim() || 'Technikum nr 5 w Opolu';
    const accountType = (formData.get('accountType') as string) || 'student';
    const refundMethod = (formData.get('refundMethod') as string) || 'Gotówka w szkole';
    const password = String(formData.get('password') || '');
    const passwordConfirmation = String(formData.get('passwordConfirmation') || '');

    if (!firstName || !lastName || !email) {
      return { success: false, error: 'Imię, nazwisko i e-mail są wymagane.' };
    }
    if (phone && !normalizedPhone) {
      return { success: false, error: 'Podaj dokładnie 9 cyfr numeru telefonu.' };
    }
    const passwordValidation = validatePasswordConfirmation(
      password,
      passwordConfirmation,
    );
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error };
    }

    const fullName = `${firstName} ${lastName}`;
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    const authAdmin = createSupabaseAdminClient();
    const { data: authData, error: authError } =
      await authAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message?.toLowerCase().includes('already')
          ? 'Konto z tym adresem e-mail już istnieje.'
          : 'Nie udało się utworzyć konta w systemie logowania.',
      };
    }

    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          email,
          fullName,
          initials,
          phone: normalizedPhone,
          class: className || null,
          school,
          accountType,
          refundMethod,
          termsAccepted: true,
          role: 'user',
        },
      });
    } catch (profileError) {
      await authAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    const activationEmail = await sendOfflineAccountActivationEmail({ email, fullName });
    if (!activationEmail.success) console.error('[OFFLINE_ACCOUNT_EMAIL_FAILED]', activationEmail.error);

    await logAuditEvent({
      action: 'ADMIN_CREATE_USER',
      userId: admin.id,
      details: { createdUserId: authData.user.id, email, fullName, accountType },
    });

    revalidatePath('/admin');
    return { success: true, message: `Pomyślnie utworzono konto stacjonarne dla: ${fullName} (${email}).` };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas tworzenia konta stacjonarnego.') };
  }
}

/**
 * Update user profile by admin
 */
export async function adminUpdateUserProfile(
  userId: string,
  data: {
    fullName: string;
    phone?: string;
    class?: string;
    school?: string;
    refundMethod?: string;
    role: string;
  }
): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();
    const target = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return { success: false, error: 'Użytkownik nie został znaleziony.' };
    if (!['user', 'admin', 'head_admin'].includes(data.role)) {
      return { success: false, error: 'Nieprawidłowa rola użytkownika.' };
    }
    if (target.role !== data.role) {
      await verifyAdmin('head_admin');
    }

    const normalizedPhone = normalizePolishPhone(data.phone);
    if (data.phone && !normalizedPhone) {
      return { success: false, error: 'Podaj dokładnie 9 cyfr numeru telefonu.' };
    }

    await prisma.profile.update({
      where: { id: userId },
      data: {
        fullName: data.fullName.trim(),
        phone: normalizedPhone,
        class: normalizeClassName(data.class) || null,
        school: data.school?.trim() || null,
        refundMethod: data.refundMethod || null,
        role: target.role === data.role ? target.role : data.role,
      },
    });

    await logAuditEvent({
      action: 'ADMIN_UPDATE_USER_PROFILE',
      userId: admin.id,
      details: { targetUserId: userId, ...data },
    });

    revalidatePath('/admin');
    return { success: true, message: 'Dane użytkownika zostały zaktualizowane.' };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd aktualizacji użytkownika.') };
  }
}

/**
 * Delete user by admin
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const admin = await verifyAdmin();

    const user = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        sellerBooks: true,
        reservedBooks: true,
      },
    });

    if (!user) {
      return { success: false, error: 'Użytkownik nie został znaleziony.' };
    }

    if (user.role === 'admin' || user.role === 'head_admin') {
      return { success: false, error: 'Nie można usunąć konta administratora.' };
    }

    if (user.sellerBooks.length > 0 || user.reservedBooks.length > 0) {
      return { success: false, error: 'Nie można usunąć użytkownika z aktywnymi książkami w systemie.' };
    }

    await prisma.profile.delete({
      where: { id: userId },
    });

    await logAuditEvent({
      action: 'ADMIN_DELETE_USER',
      userId: admin.id,
      details: { deletedUserId: userId, deletedUserEmail: user.email },
    });

    revalidatePath('/admin');
    return { success: true, message: `Użytkownik ${user.fullName} został usunięty.` };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Błąd podczas usuwania użytkownika.') };
  }
}
