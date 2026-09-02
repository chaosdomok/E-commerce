'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/actions/notifications';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

type BookInsert = Database['public']['Tables']['books']['Insert'];

export type AdminBookFormState = {
  error?: string;
  success?: string;
};

export type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function addBookAction(
  _prevState: AdminBookFormState,
  formData: FormData
): Promise<AdminBookFormState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Musisz być zalogowany.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return { error: 'Brak dostępu do panelu admina.' };
  }

  const titleValue = formData.get('title');
  const authorValue = formData.get('author');
  const courseValue = formData.get('course_code');
  const conditionValue = formData.get('condition');
  const title = typeof titleValue === 'string' ? titleValue.trim() : '';
  const author = typeof authorValue === 'string' ? authorValue.trim() : '';
  const price = Number(formData.get('price'));
  const courseCode = typeof courseValue === 'string' ? courseValue.trim() : '';
  const condition = typeof conditionValue === 'string' ? conditionValue.trim() : '';
  const fileEntry = formData.get('cover');
  const file = fileEntry instanceof File ? fileEntry : null;

  if (!title || !author || !price || !courseCode || !condition) {
    return { error: 'Uzupełnij wszystkie pola formularza.' };
  }

  let coverUrl: string | null = null;

  if (file && file.size > 0) {
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(fileName, file, { upsert: false, contentType: file.type });

    if (uploadError || !uploadData?.path) {
      console.error('Upload error:', uploadError);
      return { error: 'Nie udało się wgrać okładki.' };
    }

    const { data: publicUrlData } = supabase.storage
      .from('book-covers')
      .getPublicUrl(uploadData.path);

    coverUrl = publicUrlData.publicUrl;
  }

  const payload: BookInsert = {
    title,
    author,
    price,
    course_code: courseCode,
    condition,
    cover_url: coverUrl,
    seller_id: user.id,
    status: 'AVAILABLE',
  };

  const { error: insertError } = await supabase.from('books').insert(payload);

  if (insertError) {
    console.error('Insert book error:', insertError);
    return { error: 'Nie udało się dodać książki.' };
  }

  revalidatePath('/admin');
  revalidatePath('/');

  return { success: 'Książka została dodana do katalogu.' };
}

export async function fulfillOrder(bookId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Musisz być zalogowany.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Brak dostępu do panelu admina.' };
    }

    // Get the book details to notify the user
    const { data: book } = await supabase
      .from('books')
      .select('title, reserved_by')
      .eq('id', bookId)
      .single();

    if (!book) {
      return { success: false, error: 'Nie znaleziono książki.' };
    }

    const { error } = await supabase
      .from('books')
      .update({ status: 'SOLD' })
      .eq('id', bookId);

    if (error) {
      console.error('Fulfill order error:', error);
      return { success: false, error: 'Nie udało się oznaczyć rezerwacji jako zrealizowana.' };
    }

    // Create notification for the user (non-blocking)
    try {
      if (book.reserved_by) {
        await createNotification({
          userId: book.reserved_by,
          title: 'Książka odebrana',
          message: `Twoja rezerwacja książki "${book.title}" została zrealizowana. Dziękujemy za zakup!`,
          type: 'success',
        });
      }
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue even if notification fails
    }

    revalidatePath('/admin');
    revalidatePath('/profile');
    return { success: true, message: 'Rezerwacja została zrealizowana.' };
  } catch (error) {
    console.error('Error in fulfillOrder:', error);
    return { success: false, error: 'Wystąpił nieoczekiwany błąd.' };
  }
}

export async function cancelReservation(bookId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Musisz być zalogowany.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Brak dostępu do panelu admina.' };
    }

    // Get the book details to notify the user
    const { data: book } = await supabase
      .from('books')
      .select('title, reserved_by')
      .eq('id', bookId)
      .single();

    if (!book) {
      return { success: false, error: 'Nie znaleziono książki.' };
    }

    const { error } = await supabase
      .from('books')
      .update({ status: 'AVAILABLE', reserved_by: null })
      .eq('id', bookId);

    if (error) {
      console.error('Cancel reservation error:', error);
      return { success: false, error: 'Nie udało się anulować rezerwacji.' };
    }

    // Create notification for the user (non-blocking)
    try {
      if (book.reserved_by) {
        await createNotification({
          userId: book.reserved_by,
          title: 'Rezerwacja anulowana',
          message: `Twoja rezerwacja książki "${book.title}" została anulowana, ponieważ nie została odebrana w terminie.`,
          type: 'warning',
        });
      }
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue even if notification fails
    }

    revalidatePath('/admin');
    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true, message: 'Rezerwacja została anulowana.' };
  } catch (error) {
    console.error('Error in cancelReservation:', error);
    return { success: false, error: 'Wystąpił nieoczekiwany błąd.' };
  }
}

