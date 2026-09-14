'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getPriceMarkups } from '@/actions/pricing';
import { calculateFinalPriceSync } from '@/lib/pricing';
import { logAuditEvent } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { sendBookSubmittedEmail, sendBooksSubmittedBatchEmail } from '@/lib/email';
import { ensureProfile } from '@/lib/profile';
import {
  BOOK_COVERS_BUCKET,
  getOwnedBookCoverPath,
  validateBookCoverBytes,
} from '@/lib/book-cover-upload';
import { randomUUID } from 'node:crypto';
import {
  assertAccountActive,
  BlockedAccountError,
} from '@/lib/account-access';
import { createNotification } from '@/lib/system-notifications';
import { parseWholePln } from '@/lib/money';
import { validateAndNormalizeIsbn13 } from '@/lib/isbn-validation';
import { logPerformance, measurePerformance } from '@/lib/performance';

export interface BookSubmissionItem {
  title: string;
  author: string;
  isbn?: string;
  condition: string;
  price: number;
  courseCode?: string;
  coverUrl?: string;
}

export async function checkSubmissionAllowed(): Promise<boolean> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'allow_book_submission' },
    });
    if (!setting) return true; // default allowed
    return setting.value === 'true' || setting.value === '1';
  } catch {
    return true;
  }
}

export type BookCoverUploadResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function uploadBookCover(
  formData: FormData,
): Promise<BookCoverUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Musisz być zalogowany, aby przesłać zdjęcie.' };
  }

  try {
    await assertAccountActive(user.id, () => supabase.auth.signOut());
  } catch (error) {
    if (error instanceof BlockedAccountError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  if (!(await checkSubmissionAllowed())) {
    return {
      success: false,
      error: 'Dodawanie podręczników jest obecnie zablokowane przez organizatorów.',
    };
  }

  const value = formData.get('file');
  if (!value || typeof value === 'string' || typeof value.arrayBuffer !== 'function') {
    return { success: false, error: 'Wybierz zdjęcie okładki.' };
  }

  const bytes = new Uint8Array(await value.arrayBuffer());
  const validation = validateBookCoverBytes({
    bytes,
    mimeType: value.type,
    size: value.size,
  });
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const objectPath = `${user.id}/${randomUUID()}.${validation.extension}`;
  const { error } = await supabase.storage
    .from(BOOK_COVERS_BUCKET)
    .upload(objectPath, bytes, {
      cacheControl: '3600',
      contentType: validation.mimeType,
      upsert: false,
    });

  if (error) {
    console.error('[BOOK_COVER_UPLOAD_FAILED]', error.message);
    return {
      success: false,
      error: 'Nie udało się przesłać zdjęcia. Spróbuj ponownie.',
    };
  }

  const { data } = supabase.storage
    .from(BOOK_COVERS_BUCKET)
    .getPublicUrl(objectPath);

  if (!data.publicUrl) {
    return {
      success: false,
      error: 'Nie udało się utworzyć adresu przesłanego zdjęcia.',
    };
  }

  return { success: true, url: data.publicUrl };
}

async function isStoredBookCoverOwnedByUser(
  publicUrl: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  const object = getOwnedBookCoverPath({ publicUrl, supabaseUrl, userId });
  if (!object) return false;

  const { data, error } = await supabase.storage
    .from(BOOK_COVERS_BUCKET)
    .list(object.folder, { limit: 10, search: object.fileName });

  return !error && Boolean(data?.some((file) => file.name === object.fileName));
}

export async function submitBooksBatch(books: BookSubmissionItem[]) {
  const perfStart = performance.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Musisz być zalogowany, aby dodać podręcznik.' };
  }

  if (!user.email_confirmed_at) {
    return { error: 'Najpierw potwierdź adres e-mail. Wysłaliśmy link aktywacyjny podczas rejestracji.' };
  }

  const isAllowed = await checkSubmissionAllowed();
  if (!isAllowed) {
    return { error: 'Dodawanie podręczników jest obecnie zablokowane przez organizatorów.' };
  }

  if (!books || books.length === 0) {
    return { error: 'Lista książek do dodania jest pusta.' };
  }

  try {
    await ensureProfile(supabase, user.id);
    await assertAccountActive(user.id, () => supabase.auth.signOut());

    const sellerProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { email: true, fullName: true },
    });

    if (!sellerProfile) {
      return {
        error:
          'Nie udało się odczytać profilu sprzedającego. Wyloguj się i zaloguj ponownie.',
      };
    }

    for (const item of books) {
      if (!item.title.trim() || !item.author.trim()) {
        return { error: 'Uzupełnij wymagane dane wszystkich książek.' };
      }
      const price = parseWholePln(item.price);
      if (!price.success) return { error: price.error };
      if (item.isbn && item.isbn.trim() !== '') {
        const validIsbn = validateAndNormalizeIsbn13(item.isbn);
        if (!validIsbn) {
          return { error: `Niepoprawny numer ISBN: ${item.isbn}. Jeśli go nie znasz, zostaw pole puste.` };
        }
        item.isbn = validIsbn;
      }
    }
    const validBooks = books;

    try {
      await Promise.all(
        validBooks.map(async (item) => {
          if (
            item.coverUrl &&
            !(await isStoredBookCoverOwnedByUser(item.coverUrl, user.id, supabase))
          ) {
            throw new Error('Zdjęcie okładki nie istnieje albo nie należy do zalogowanego użytkownika.');
          }
        })
      );
    } catch (e) {
      if (e instanceof Error) {
        return { error: e.message };
      }
      return { error: 'Wystąpił błąd podczas walidacji.' };
    }

    // Fetch markups once before the loop
    const markups = await getPriceMarkups();

    const createdBooks = await prisma.$transaction(async (tx) => {
      // Serialize requests using row-level locking on user profile
      await tx.profile.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
        select: { id: true },
      });

      // Count currently pending books
      const pendingCount = await tx.book.count({
        where: {
          sellerId: user.id,
          status: 'PENDING_APPROVAL',
        },
      });

      if (pendingCount + validBooks.length > 20) {
        throw new Error(`Możesz mieć maksymalnie 20 książek oczekujących na akceptację. Obecnie masz ${pendingCount}, a próbujesz dodać ${validBooks.length}.`);
      }

      const results = [];
      for (const item of validBooks) {
        const { basePrice, finalPrice } = calculateFinalPriceSync(item.price, markups);

        const created = await tx.book.create({
          data: {
            title: item.title.trim(),
            author: item.author.trim(),
            isbn: item.isbn?.trim() || null,
            condition: item.condition || 'DOBRY',
            courseCode: item.courseCode?.trim() || null,
            coverUrl: item.coverUrl?.trim() || null,
            basePrice,
            price: finalPrice,
            status: 'PENDING_APPROVAL',
            sellerId: user.id,
          },
        });

        results.push(created);
      }
      return results;
    });

    const createdTitles = createdBooks.map((b) => b.title);

    // Best-effort external operations after commit
    for (const created of createdBooks) {
      await createNotification({
        userId: user.id,
        title: 'Książka wysłana do akceptacji',
        message: `Podręcznik „${created.title}” został wysłany do akceptacji.`,
        type: 'success',
        eventKey: `book-submitted:${created.id}`,
      });

      await logAuditEvent({
        action: 'BOOK_CREATE',
        userId: user.id,
        details: {
          bookId: created.id,
          title: created.title,
          basePrice: created.basePrice ? Number(created.basePrice) : null,
          finalPrice: Number(created.price),
          status: 'PENDING_APPROVAL',
        },
      });
    }

    if (sellerProfile?.email && createdTitles.length > 0) {
      const sellerEmail = sellerProfile.email;
      const sellerName = sellerProfile.fullName || 'Użytkowniku';
      if (createdTitles.length === 1) {
        const emailResult = await measurePerformance(
          'smtpBatch',
          () =>
            sendBookSubmittedEmail({
              email: sellerEmail,
              fullName: sellerName,
              title: createdTitles[0],
            }),
          { getMetadata: () => ({ count: 1 }) },
        );
        if (!emailResult.success) console.error('[BOOK_SUBMITTED_EMAIL_FAILED]', emailResult.error);
      } else {
        const emailResult = await measurePerformance(
          'smtpBatch',
          () =>
            sendBooksSubmittedBatchEmail({
              email: sellerEmail,
              fullName: sellerName,
              titles: createdTitles,
            }),
          { getMetadata: () => ({ count: createdTitles.length }) },
        );
        if (!emailResult.success) console.error('[BOOK_SUBMITTED_EMAIL_FAILED]', emailResult.error);
      }
    }

    revalidatePath('/profile');
    revalidatePath('/admin');
    revalidatePath('/katalog');
    revalidatePath('/');

    logPerformance({
      operation: 'submitBooksBatch',
      durationMs: performance.now() - perfStart,
      result: 'success',
      metadata: { books: createdBooks.length },
    });

    return {
      success: true,
      count: createdBooks.length,
    };
  } catch (error) {
    logPerformance({
      operation: 'submitBooksBatch',
      durationMs: performance.now() - perfStart,
      result: 'error',
      metadata: { books: books?.length || 0 },
    });
    if (error instanceof BlockedAccountError) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message.includes('maksymalnie')) {
      return { error: error.message };
    }
    console.error('Error submitting books batch:', error);
    return { error: 'Wystąpił błąd podczas zapisywania książek.' };
  }
}
