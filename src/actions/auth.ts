'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { deriveInitials, ensureProfile, getPostAuthRedirect, normalizePolishPhone } from '@/lib/profile';
import { logAuditEvent } from '@/lib/audit';
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '@/lib/email';
import { getEffectiveRole } from '@/lib/roles';
import { studentAlreadyHasAccount } from '@/lib/student-account';
import { getStudentDirectory } from '@/lib/student-directory';
import { cleanDisplayName, normalizeClassName } from '@/lib/student-normalization';
import {
  assertAccountActive,
  BLOCKED_ACCOUNT_MESSAGE,
  BlockedAccountError,
} from '@/lib/account-access';
import {
  OFFICIAL_SCHOOL_NAME,
  resolveOfficialStudent,
  STUDENT_AMBIGUOUS_MESSAGE,
  STUDENT_CLASS_MISMATCH_MESSAGE,
  STUDENT_DUPLICATE_MESSAGE,
  STUDENT_NOT_FOUND_MESSAGE,
} from '@/lib/student-registration';
import { validatePassword, validatePasswordConfirmation } from '@/lib/password-policy';
import { createNotification } from '@/lib/system-notifications';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function getRequestOrigin(headersList: Headers): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }

  const host = headersList.get('x-forwarded-host') || headersList.get('host');
  const protocol =
    headersList.get('x-forwarded-proto') ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  if (host) {
    return `${protocol}://${host}`;
  }

  return (
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : '')
  );
}

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  redirect?: string;
  success?: boolean;
  message?: string;
};

export async function signUpWithEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const accountType = formData.get('accountType') === 'other' ? 'other' : 'student';
  let firstName = cleanDisplayName((formData.get('firstName') as string) ?? '');
  let lastName = cleanDisplayName((formData.get('lastName') as string) ?? '');
  const phone = (formData.get('phone') as string)?.trim();
  const submittedClass = (formData.get('className') as string)?.trim();
  let className = '';
  const refundMethod = (formData.get('refundMethod') as string) || 'Gotówka w szkole';
  const termsAccepted = formData.get('termsAccepted') === 'on' || formData.get('termsAccepted') === 'true';

  if (!email || !password) {
    return { error: 'E-mail i hasło są wymagane.' };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) return { error: passwordValidation.error };

  if (!termsAccepted) {
    return { error: 'Musisz zaakceptować regulamin serwisu, aby założyć konto.' };
  }

  if (!firstName || !lastName) {
    return { error: 'Imię i nazwisko są wymagane.' };
  }

  const normalizedPhone = normalizePolishPhone(phone);
  if (phone && !normalizedPhone) {
    return { error: 'Podaj dokładnie 9 cyfr numeru telefonu.' };
  }

  let school = OFFICIAL_SCHOOL_NAME;

  if (accountType === 'student') {
    try {
      const directory = await getStudentDirectory();
      const resolution = resolveOfficialStudent(
        directory,
        firstName,
        lastName,
        submittedClass,
      );

      if (resolution.status === 'not_found') {
        return { error: STUDENT_NOT_FOUND_MESSAGE };
      }
      if (resolution.status === 'class_mismatch') {
        return { error: STUDENT_CLASS_MISMATCH_MESSAGE };
      }
      if (resolution.status === 'ambiguous') {
        return { error: STUDENT_AMBIGUOUS_MESSAGE };
      }
      if (await studentAlreadyHasAccount(resolution.student)) {
        return { error: STUDENT_DUPLICATE_MESSAGE };
      }

      firstName = resolution.student.firstName;
      lastName = resolution.student.lastName;
      className = normalizeClassName(resolution.student.className);
    } catch (verificationError) {
      console.error('Student directory verification failed:', verificationError);
      return {
        error:
          'Nie udało się teraz sprawdzić listy uczniów. Spróbuj ponownie później.',
      };
    }
  } else {
    school = 'Pozostałe osoby';
  }

  const fullName = `${firstName} ${lastName}`;

  const headersList = await headers();
  const origin = getRequestOrigin(headersList);
  const callbackUrl = origin ? `${origin}/auth/callback` : '/auth/callback';

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        full_name: fullName,
        phone: normalizedPhone,
        class: className || null,
        school,
        account_type: accountType,
        refund_method: refundMethod,
        terms_accepted: true,
      },
    },
  });

  if (error) {
    console.error('Sign up error:', error);
    if (error.message.includes('User already registered')) {
      return { error: 'Konto z tym adresem e-mail już istnieje.' };
    }
    if (error.message.includes('Invalid email')) {
      return { error: 'Nieprawidłowy adres e-mail.' };
    }
    return { error: `Błąd rejestracji: ${error.message}` };
  }

  if (data.user) {
    try {
      const initials = deriveInitials(fullName);
      const role = getEffectiveRole(email);

      // Upsert profile directly in database
      await prisma.profile.upsert({
        where: { id: data.user.id },
        update: {
          email,
          fullName,
          initials,
          phone: normalizedPhone,
          class: className || null,
          school,
          accountType,
          refundMethod,
          termsAccepted: true,
          role,
        },
        create: {
          id: data.user.id,
          email,
          fullName,
          initials,
          phone: normalizedPhone,
          class: className || null,
          school,
          accountType,
          refundMethod,
          termsAccepted: true,
          role,
        },
      });

      await logAuditEvent({
        action: 'USER_REGISTER',
        userId: data.user.id,
        details: { email, accountType, school, className },
      });

      const welcomeEmail = await sendWelcomeEmail({ email, fullName });
      if (!welcomeEmail.success) {
        console.error('[USER_REGISTER_EMAIL_FAILED]', welcomeEmail.error);
      }

      if (!data.user.email_confirmed_at) {
        return { success: true, message: 'Sprawdź swoją skrzynkę. Wysłaliśmy link aktywacyjny na Twój adres e-mail.' };
      }

      // Po rejestracji kierujemy od razu na stronę dodawania książek lub stronę główną
      return { redirect: '/dodaj-ksiazke' };
    } catch (profileError) {
      console.error('Profile creation error:', profileError);
    }
  }

  return { error: 'Rejestracja nie powiodła się.' };
}

export async function signInWithEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
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

    try {
      await assertAccountActive(data.user.id, () => supabase.auth.signOut());
    } catch (accountError) {
      if (accountError instanceof BlockedAccountError) {
        return { error: BLOCKED_ACCOUNT_MESSAGE };
      }
      throw accountError;
    }

    await logAuditEvent({
      action: 'USER_LOGIN',
      userId: data.user.id,
      details: { email },
    });

    const redirectTo = await getPostAuthRedirect(supabase, data.user.id);
    return { redirect: redirectTo };
  }

  return { redirect: '/' };
}

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAuditEvent({
      action: 'USER_LOGOUT',
      userId: user.id,
    });
  }

  await supabase.auth.signOut();
  redirect('/');
}

async function sendPasswordChangedSideEffects(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });
  await createNotification({
    userId,
    title: 'Hasło zostało zmienione',
    message: 'Hasło do Twojego konta zostało zmienione.',
    type: 'success',
    eventKey: `password-changed:${userId}:${Date.now()}`,
  });
  if (profile?.email) {
    const emailResult = await sendPasswordChangedEmail({
      email: profile.email,
      fullName: profile.fullName || 'Użytkowniku',
    });
    if (!emailResult.success) {
      console.error('[PASSWORD_CHANGED_EMAIL_FAILED]', emailResult.error);
    }
  }
}

export type PasswordActionState = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function requestPasswordReset(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const genericResult = {
    success: true,
    message: 'Jeżeli konto istnieje, wysłaliśmy instrukcję zmiany hasła.',
  };
  if (!email) return genericResult;

  const origin = getRequestOrigin(await headers());
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    if (error || !data.properties?.hashed_token) {
      console.error('[PASSWORD_RESET_REQUEST_FAILED]', {
        code: error?.code,
        status: error?.status,
      });
      return genericResult;
    }

    const emailResult = await sendPasswordResetEmail({
      email,
      actionLink: `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=/reset-hasla`,
    });
    if (!emailResult.success) {
      console.error('[PASSWORD_RESET_EMAIL_FAILED]', emailResult.error);
    }
  } catch (error) {
    console.error('[PASSWORD_RESET_REQUEST_FAILED]', {
      name: error instanceof Error ? error.name : 'UNKNOWN',
    });
  }
  return genericResult;
}

export async function changePassword(formData: FormData): Promise<PasswordActionState> {
  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  const passwordConfirmation = String(formData.get('passwordConfirmation') || '');
  if (!currentPassword) return { error: 'Podaj obecne hasło.' };
  const validation = validatePasswordConfirmation(newPassword, passwordConfirmation);
  if (!validation.valid) return { error: validation.error };
  if (currentPassword === newPassword) {
    return { error: 'Nowe hasło musi różnić się od obecnego.' };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.email) return { error: 'Musisz być zalogowany.' };

  try {
    await assertAccountActive(authData.user.id, () => supabase.auth.signOut());
  } catch (accountError) {
    if (accountError instanceof BlockedAccountError) {
      return { error: BLOCKED_ACCOUNT_MESSAGE };
    }
    throw accountError;
  }

  const { data: verification, error: verificationError } =
    await supabase.auth.signInWithPassword({
      email: authData.user.email,
      password: currentPassword,
    });
  if (verificationError || verification.user?.id !== authData.user.id) {
    return { error: 'Obecne hasło jest nieprawidłowe.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: 'Nie udało się zmienić hasła.' };

  await sendPasswordChangedSideEffects(authData.user.id);
  return { success: true, message: 'Hasło zostało zmienione.' };
}

export async function completePasswordReset(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const newPassword = String(formData.get('newPassword') || '');
  const passwordConfirmation = String(formData.get('passwordConfirmation') || '');
  const validation = validatePasswordConfirmation(newPassword, passwordConfirmation);
  if (!validation.valid) return { error: validation.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Link do zmiany hasła jest nieprawidłowy lub wygasł.' };
  }

  try {
    await assertAccountActive(user.id, () => supabase.auth.signOut());
  } catch (accountError) {
    if (accountError instanceof BlockedAccountError) {
      return { error: BLOCKED_ACCOUNT_MESSAGE };
    }
    throw accountError;
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: 'Nie udało się ustawić nowego hasła.' };

  await sendPasswordChangedSideEffects(user.id);
  await supabase.auth.signOut();
  return { success: true, message: 'Nowe hasło zostało ustawione.' };
}
