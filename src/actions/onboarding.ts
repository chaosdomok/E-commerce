'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deriveInitials } from '@/lib/profile';
import { onboardingSchema } from '@/lib/validations/onboarding';
import { prisma } from '@/lib/prisma';
import { assertAccountActive, BlockedAccountError } from '@/lib/account-access';

export type OnboardingActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function completeOnboarding(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const raw = {
    fullName: formData.get('fullName') as string,
    class: formData.get('class') as string,
    school: formData.get('school') as string,
  };

  const parsed = onboardingSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as string;
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { fieldErrors };
  }

  const { fullName, class: className, school } = parsed.data;
  const initials = deriveInitials(fullName);

  try {
    await assertAccountActive(user.id, () => supabase.auth.signOut());
    await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        fullName,
        initials,
        class: className,
        school,
      },
      create: {
        id: user.id,
        fullName,
        initials,
        class: className,
        school,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof BlockedAccountError) {
      return { error: error.message };
    }
    console.error('Onboarding error:', error);
    return { error: 'Nie udało się zapisać profilu. Spróbuj ponownie.' };
  }

  redirect('/');
}
