import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export function deriveInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts.at(-1)!.charAt(0)).toUpperCase();
}

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.full_name?.trim() &&
      profile.class?.trim() &&
      profile.school?.trim()
  );
}

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email?.toLowerCase() ?? '';
    const role = adminEmails.includes(email) ? 'admin' : 'user';

    await supabase.from('profiles').insert({ id: userId, role });
    return;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase() ?? '';

  if (adminEmails.includes(email) && existing.role !== 'admin') {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
  }
}

export async function getPostAuthRedirect(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string> {
  const profile = await getProfile(supabase, userId);
  return isProfileComplete(profile) ? '/' : '/onboarding';
}
