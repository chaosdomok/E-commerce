import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveRole } from '@/lib/roles';
import { isAccountBlocked } from '@/lib/account-access';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  if (await isAccountBlocked(user.id)) {
    redirect('/auth/blocked');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = getEffectiveRole(user.email, profile?.role);
  if (role !== 'admin' && role !== 'head_admin') {
    redirect('/');
  }

  return <>{children}</>;
}
