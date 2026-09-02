'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  ensureProfile,
  getPostAuthRedirect,
} from '@/lib/profile';

export type AuthActionState = {
  error?: string;
};

export async function signUpWithEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'E-mail i hasło są wymagane.' };
  }

  if (password.length < 8) {
    return { error: 'Hasło musi mieć co najmniej 8 znaków.' };
  }

  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Sign up error:', error);
    return { error: 'Nie udało się utworzyć konta. Spróbuj ponownie.' };
  }

  if (data.user) {
    await ensureProfile(supabase, data.user.id);
    const redirectTo = await getPostAuthRedirect(supabase, data.user.id);
    redirect(redirectTo);
  }

  return { error: 'Sprawdź skrzynkę e-mail, aby potwierdzić konto.' };
}

export async function signInWithEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'E-mail i hasło są wymagane.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Nieprawidłowy e-mail lub hasło.' };
  }

  if (data.user) {
    await ensureProfile(supabase, data.user.id);
    const redirectTo = await getPostAuthRedirect(supabase, data.user.id);
    redirect(redirectTo);
  }

  redirect('/');
}

export async function signInWithGoogle() {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect('/login?error=oauth');
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
