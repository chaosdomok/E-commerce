'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { sendReservationConfirmedEmail, sendReservationExpiredEmail } from '@/lib/email';
import { Prisma } from '@/generated/prisma/client';
import {
  ADDITIONAL_SALES_DAY_SETTING_KEY,
  getReservationExpiry,
  getReservationLimitError,
  isAdditionalSalesDayEnabled,
} from '@/lib/reservation-policy';
import { assertAccountActive, BlockedAccountError } from '@/lib/account-access';
import { createNotification } from '@/lib/system-notifications';
import { logPerformance, measurePerformance } from '@/lib/performance';

export type ReserveBooksResult =
  | {
      success: true;
      totalPrice: number;
      reservation: {
        id: string;
        reservationCode: string;
        books: Array<{ bookId: string; title: string }>;
      };
      reservedUntil: string;
    }
  | { success: false; error: string };

export type CancelOwnReservationResult =
  | { success: true; message: string }
  | { success: false; error: string };

class ReservationActionError extends Error {}

function generateReservationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REZ-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueReservationCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const reservationCode = generateReservationCode();
    const existingReservation = await tx.reservation.findUnique({
      where: { code: reservationCode },
      select: { id: true },
    });
    if (!existingReservation) return reservationCode;
  }

  throw new ReservationActionError(
    'Nie udało się wygenerować unikalnego kodu rezerwacji.',
  );
}

/**
 * Automatically expires reservations that passed their stored deadline.
 */
export async function expireOverdueReservations() {
  const perfStart = performance.now();
  try {
    const now = new Date();
    const overdueReservations = await prisma.reservation.findMany({
      where: {
        status: 'ACTIVE',
        reservedUntil: {
          lt: now,
        },
      },
      include: {
        user: { select: { email: true, fullName: true } },
        items: {
          select: {
            bookId: true,
            book: { select: { title: true } },
          },
        },
      },
    });

    const emailsToSend: Array<{ email: string; fullName: string; title: string; reservedUntil: Date }> = [];
    let expiredCount = 0;
    
    // Process expiries with bounded concurrency (chunking by 5)
    for (let i = 0; i < overdueReservations.length; i += 5) {
      const chunk = overdueReservations.slice(i, i + 5);
      
      await Promise.allSettled(chunk.map(async (reservation) => {
        const expired = await prisma.$transaction(
          async (tx) => {
            const statusUpdate = await tx.reservation.updateMany({
              where: {
                id: reservation.id,
                status: 'ACTIVE',
                reservedUntil: { lt: now },
              },
              data: { status: 'EXPIRED' },
            });
            if (statusUpdate.count !== 1) return false;

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
            return true;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if (!expired) return;
        expiredCount += 1;
        
        await logAuditEvent({
          action: 'RESERVATION_AUTO_EXPIRED',
          userId: reservation.userId,
          details: {
            reservationId: reservation.id,
            reservationCode: reservation.code,
            bookIds: reservation.items.map((item) => item.bookId),
          },
        });
        
        await createNotification({
          userId: reservation.userId,
          title: 'Rezerwacja wygasła',
          message: `Rezerwacja ${reservation.code} wygasła. Książki wróciły do katalogu.`,
          type: 'warning',
          eventKey: `reservation-expired:${reservation.id}`,
        });

        if (reservation.user?.email) {
          for (const item of reservation.items) {
            emailsToSend.push({
              email: reservation.user.email,
              fullName: reservation.user.fullName || 'Użytkowniku',
              title: item.book.title,
              reservedUntil: reservation.reservedUntil!,
            });
          }
        }
      }));
    }

    if (emailsToSend.length > 0) {
      await measurePerformance(
        'smtpBatch',
        async () => {
          await Promise.allSettled(
            emailsToSend.map((mail) =>
              sendReservationExpiredEmail(mail).then((result) => {
                if (!result.success) {
                  console.error('[RESERVATION_EXPIRED_EMAIL_FAILED]', result.error);
                }
              })
            )
          );
        },
        { getMetadata: () => ({ count: emailsToSend.length }) }
      );
    }

    if (expiredCount > 0) {
      revalidatePath('/katalog');
      revalidatePath('/');
      revalidatePath('/admin');
      revalidatePath('/profile');
    }

    logPerformance({
      operation: 'expireOverdueReservations',
      durationMs: performance.now() - perfStart,
      result: 'success',
      metadata: { expiredReservations: expiredCount },
    });

    return { expiredCount };
  } catch (error) {
    logPerformance({
      operation: 'expireOverdueReservations',
      durationMs: performance.now() - perfStart,
      result: 'error',
    });
    console.error('Error expiring overdue reservations:', error);
    return { expiredCount: 0 };
  }
}

/**
 * Reserves books for the logged-in user until the next active sales day.
 */
export async function reserveBooks(bookIds: string[]): Promise<ReserveBooksResult> {
  const perfStart = performance.now();
  if (!bookIds.length) {
    return { success: false, error: 'Lista książek jest pusta.' };
  }

  const uniqueBookIds = [...new Set(bookIds)];
  if (uniqueBookIds.length !== bookIds.length) {
    return { success: false, error: 'Lista książek zawiera powtórzone pozycje.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  if (!user.email_confirmed_at) {
    return { success: false, error: 'Najpierw potwierdź adres e-mail. Wysłaliśmy link aktywacyjny podczas rejestracji.' };
  }

  try {
    await assertAccountActive(user.id, () => supabase.auth.signOut());
    const now = new Date();
    let attempt = 0;
    let transactionResult:
      | {
          books: Awaited<ReturnType<typeof prisma.book.findMany>>;
          buyerProfile: {
            email: string | null;
            fullName: string | null;
          } | null;
          reservation: {
            id: string;
            code: string;
          };
          reservedUntil: Date;
          totalPrice: number;
        }
      | undefined;

    while (!transactionResult && attempt < 3) {
      attempt += 1;
      try {
        transactionResult = await prisma.$transaction(
          async (tx) => {
            // Serialize reservations for a given user using row-level locking
            const buyerProfile = await tx.profile.update({
              where: { id: user.id },
              data: { updatedAt: new Date() },
              select: { email: true, fullName: true },
            });

            const books = await tx.book.findMany({
              where: { id: { in: uniqueBookIds } },
            });
            const activeReservations = await tx.reservation.findMany({
              where: {
                status: 'ACTIVE',
                userId: user.id,
                reservedUntil: { gt: now },
              },
              select: {
                items: {
                  select: {
                    book: { select: { courseCode: true } },
                  },
                },
              },
            });
            const additionalDaySetting = await tx.systemSetting.findUnique({
              where: { key: ADDITIONAL_SALES_DAY_SETTING_KEY },
              select: { value: true },
            });

            if (books.length !== uniqueBookIds.length) {
              throw new ReservationActionError(
                'Nie znaleziono jednej z wybranych książek.',
              );
            }

            for (const book of books) {
              if (
                book.status !== 'AVAILABLE' ||
                book.reservedByUserId !== null
              ) {
                throw new ReservationActionError(
                  `Książka "${book.title}" została już zarezerwowana lub sprzedana.`,
                );
              }
              if (book.sellerId === user.id) {
                throw new ReservationActionError(
                  'Nie możesz zarezerwować własnej książki.',
                );
              }
            }

            const activeBooks = activeReservations.flatMap((active) =>
              active.items.map((item) => item.book),
            );
            const limitError = getReservationLimitError(activeBooks, books);
            if (limitError) throw new ReservationActionError(limitError);

            const reservedUntil = getReservationExpiry(
              now,
              isAdditionalSalesDayEnabled(additionalDaySetting?.value),
            );
            if (!reservedUntil) {
              throw new ReservationActionError(
                'Brak kolejnego aktywnego dnia sprzedażowego.',
              );
            }

            const reservationCode = await generateUniqueReservationCode(tx);
            const createdReservation = await tx.reservation.create({
              data: {
                code: reservationCode,
                userId: user.id,
                reservedUntil,
                items: {
                  create: books.map((book) => ({ bookId: book.id })),
                },
              },
              select: { id: true, code: true },
            });

            for (const book of books) {
              const update = await tx.book.updateMany({
                where: {
                  id: book.id,
                  status: 'AVAILABLE',
                  reservedByUserId: null,
                },
                data: {
                  status: 'RESERVED',
                  reservedByUserId: user.id,
                  reservedUntil,
                },
              });
              if (update.count !== 1) {
                throw new ReservationActionError(
                  'Jedna z książek została właśnie zarezerwowana przez inną osobę.',
                );
              }
            }

            return {
              books,
              buyerProfile,
              reservation: createdReservation,
              reservedUntil,
              totalPrice: books.reduce(
                (sum, book) => sum + Number(book.price),
                0,
              ),
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2002');
        if (!retryable || attempt === 3) throw error;
      }
    }

    if (!transactionResult) {
      return { success: false, error: 'Nie udało się utworzyć rezerwacji.' };
    }

    const {
      books,
      buyerProfile,
      reservation,
      reservedUntil,
      totalPrice,
    } = transactionResult;

    for (const b of books) {
      await logAuditEvent({
        action: 'BOOK_RESERVE',
        userId: user.id,
        details: {
          bookId: b.id,
          title: b.title,
          reservationId: reservation.id,
          reservationCode: reservation.code,
          reservedUntil: reservedUntil.toISOString(),
          price: Number(b.price),
        },
      });
    }

    await createNotification({
      userId: user.id,
      title: 'Rezerwacja utworzona',
      message: `Rezerwacja ${reservation.code} została utworzona i jest ważna do ${reservedUntil.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}.`,
      type: 'success',
      eventKey: `reservation-created:${reservation.id}`,
    });

    if (buyerProfile?.email) {
      const emailResult = await sendReservationConfirmedEmail({
        email: buyerProfile.email,
        fullName: buyerProfile.fullName || 'Użytkowniku',
        reservationCode: reservation.code,
        totalPrice,
        reservedUntil: reservedUntil.toISOString(),
        bookTitles: books.map((item) => item.title),
      });
      if (!emailResult.success) console.error('[RESERVATION_CONFIRMED_EMAIL_FAILED]', emailResult.error);
    }

    revalidatePath('/katalog');
    revalidatePath('/profile');
    revalidatePath('/');
    revalidatePath('/admin');

    logPerformance({
      operation: 'reserveBooks',
      durationMs: performance.now() - perfStart,
      result: 'success',
      metadata: { books: books.length },
    });

    return {
      success: true,
      totalPrice,
      reservation: {
        id: reservation.id,
        reservationCode: reservation.code,
        books: books.map((book) => ({
          bookId: book.id,
          title: book.title,
        })),
      },
      reservedUntil: reservedUntil.toISOString(),
    };
  } catch (error) {
    logPerformance({
      operation: 'reserveBooks',
      durationMs: performance.now() - perfStart,
      result: 'error',
      metadata: { books: bookIds?.length || 0 },
    });
    if (error instanceof BlockedAccountError) {
      return { success: false, error: error.message };
    }
    if (error instanceof ReservationActionError) {
      return { success: false, error: error.message };
    }
    console.error('Error reserving books:', error);
    return { success: false, error: 'Wystąpił błąd podczas rezerwacji książek.' };
  }
}

export async function cancelOwnReservation(
  reservationId: string,
): Promise<CancelOwnReservationResult> {
  const perfStart = performance.now();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Musisz być zalogowany.' };
  }
  if (!reservationId) {
    return { success: false, error: 'Nie wskazano rezerwacji.' };
  }

  const now = new Date();
  try {
    await assertAccountActive(user.id, () => supabase.auth.signOut());
    const cancelledReservation = await prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findFirst({
          where: {
            id: reservationId,
            userId: user.id,
            status: 'ACTIVE',
            reservedUntil: { gt: now },
          },
          select: {
            id: true,
            code: true,
            items: { select: { bookId: true, book: { select: { title: true } } } },
          },
        });
        if (!reservation) return null;

        const statusUpdate = await tx.reservation.updateMany({
          where: {
            id: reservation.id,
            userId: user.id,
            status: 'ACTIVE',
            reservedUntil: { gt: now },
          },
          data: { status: 'CANCELLED' },
        });
        if (statusUpdate.count !== 1) return null;

        await tx.book.updateMany({
          where: {
            id: { in: reservation.items.map((item) => item.bookId) },
            status: 'RESERVED',
            reservedByUserId: user.id,
          },
          data: {
            status: 'AVAILABLE',
            reservedByUserId: null,
            reservedUntil: null,
            reservationCode: null,
          },
        });
        return reservation;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!cancelledReservation) {
      return {
        success: false,
        error: 'Nie znaleziono aktywnej rezerwacji należącej do użytkownika.',
      };
    }

    await logAuditEvent({
      action: 'BOOK_CANCEL_RESERVATION',
      userId: user.id,
      details: {
        reservationId: cancelledReservation.id,
        reservationCode: cancelledReservation.code,
        bookIds: cancelledReservation.items.map((item) => item.bookId),
        titles: cancelledReservation.items.map((item) => item.book.title),
        cancelledBy: 'reservation_owner',
      },
    });
    await createNotification({
      userId: user.id,
      title: 'Rezerwacja anulowana',
      message: `Rezerwacja ${cancelledReservation.code} została anulowana.`,
      type: 'warning',
      eventKey: `reservation-user-cancelled:${cancelledReservation.id}`,
    });

    revalidatePath('/katalog');
    revalidatePath('/profile');
    revalidatePath('/admin');

    logPerformance({
      operation: 'cancelOwnReservation',
      durationMs: performance.now() - perfStart,
      result: 'success',
      metadata: { books: cancelledReservation.items.length },
    });

    return { success: true, message: 'Rezerwacja została anulowana.' };
  } catch (error) {
    logPerformance({
      operation: 'cancelOwnReservation',
      durationMs: performance.now() - perfStart,
      result: 'error',
    });
    if (error instanceof BlockedAccountError) {
      return { success: false, error: error.message };
    }
    console.error('Error cancelling own reservation:', error);
    return { success: false, error: 'Nie udało się anulować rezerwacji.' };
  }
}
