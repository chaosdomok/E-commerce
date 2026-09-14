import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getEffectiveRole } from '@/lib/roles';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Create an admin Supabase client using the service role key.
 * This bypasses RLS and should ONLY be used for trusted server-side
 * operations like assigning roles.
 */
function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createSupabaseClient<Database>(url, serviceKey);
}

export function deriveInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts.at(-1)!.charAt(0)).toUpperCase();
}

export function normalizePolishPhone(value: string | null | undefined): string | null {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return null;
  const localDigits = digits.startsWith('48') && digits.length === 11 ? digits.slice(2) : digits;
  if (localDigits.length !== 9) return null;
  return `+48 ${localDigits.slice(0, 3)} ${localDigits.slice(3, 6)} ${localDigits.slice(6)}`;
}

export function getPolishPhoneDigits(value: string | null | undefined): string {
  const normalized = normalizePolishPhone(value);
  return normalized ? normalized.replace(/\D/g, '').slice(2) : '';
}

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.full_name?.trim() &&
      profile.class?.trim() &&
      profile.school?.trim()
  );
}

export async function getProfileWithStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
  authenticatedEmail?: string | null,
): Promise<{ profile: Profile | null; error: boolean }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error) {
      const email =
        authenticatedEmail === undefined
          ? (await supabase.auth.getUser()).data.user?.email
          : authenticatedEmail;
      return {
        profile: data
          ? {
              ...data,
              role: getEffectiveRole(email, data.role),
            }
          : null,
        error: false,
      };
    }
  }

  return { profile: null, error: true };
}

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  authenticatedEmail?: string | null,
): Promise<Profile | null> {
  const result = await getProfileWithStatus(
    supabase,
    userId,
    authenticatedEmail,
  );
  return result.profile;
}

export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? '';

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  const effectiveRole = getEffectiveRole(
    email,
    existing?.role,
  );

  if (!existing) {
    const adminClient = createServiceRoleClient();
    await adminClient.from('profiles').insert({ id: userId, role: effectiveRole });
    return;
  }

  if (existing.role !== effectiveRole) {
    const adminClient = createServiceRoleClient();
    await adminClient
      .from('profiles')
      .update({ role: effectiveRole })
      .eq('id', userId);
  }
}

export async function getPostAuthRedirect(
  _supabase: SupabaseClient<Database>,
  _userId: string
): Promise<string> {
  return '/';
}
