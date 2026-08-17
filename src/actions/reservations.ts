'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

export type ReserveBooksResult =
  | { success: true; totalPrice: number }
  | { success: false; error: string };

export async function reserveBooks(bookIds: string[]): Promise<ReserveBooksResult> {
  if (!bookIds.length) {
    return { success: false, error: 'Koszyk jest pusty.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: books, error: fetchError } = await supabase
    .from('books')
    .select('*')
    .in('id', bookIds);

  if (fetchError) {
    return { success: false, error: 'Nie udało się pobrać książek.' };
  }

  const unavailable = books?.filter(
    (book) => book.status !== 'AVAILABLE' || book.reserved_by !== null
  );

  if (unavailable?.length) {
    const unavailableIds = unavailable.map((book) => book.id).join(', ');
    return {
      success: false,
      error: `Niektóre książki nie są już dostępne: ${unavailableIds}`,
    };
  }

  const totalPrice = (books ?? []).reduce((sum, book) => sum + Number(book.price || 0), 0);
  const reservationResults: Array<{ id: string; updated: boolean }> = [];

  for (const bookId of bookIds) {
    const { data, error: updateError } = await supabase
      .from('books')
      .update({ status: 'RESERVED', reserved_by: user.id })
      .eq('id', bookId)
      .eq('status', 'AVAILABLE')
      .is('reserved_by', null)
      .select('id');

    if (updateError) {
      return { success: false, error: 'Nie udało się zarezerwować książek.' };
    }

    reservationResults.push({ id: bookId, updated: (data ?? []).length > 0 });
  }

  const failedReservations = reservationResults.filter((result) => !result.updated);

  if (failedReservations.length > 0) {
    return {
      success: false,
      error: `Niektóre książki nie są już dostępne: ${failedReservations.map((result) => result.id).join(', ')}`,
    };
  }

  return { success: true, totalPrice };
}
