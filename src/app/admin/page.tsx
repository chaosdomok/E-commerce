import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from '@/components/site/admin-dashboard';
import type { Database } from '@/types/supabase';

type ReservationBook = Database['public']['Tables']['books']['Row'] & {
  reserved_by_profile?: {
    full_name: string | null;
    class: string | null;
    school: string | null;
  } | null;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: reservations, error } = await supabase
    .from('books')
    .select('*, reserved_by_profile:profiles!books_reserved_by_fkey(full_name, class, school)')
    .eq('status', 'RESERVED');

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-24 text-zinc-400 sm:px-6 overflow-x-hidden">
        Nie udało się pobrać rezerwacji.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16 text-white sm:py-24 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="mx-auto max-w-6xl w-full">
        <AdminDashboard reservations={(reservations as ReservationBook[]) ?? []} />
      </div>
    </div>
  );
}
