'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deriveInitials } from '@/lib/profile';
import { onboardingSchema } from '@/lib/validations/onboarding';

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

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        initials,
        class: className,
        school,
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Onboarding error:', error);
    return { error: 'Nie udało się zapisać profilu. Spróbuj ponownie.' };
  }

  redirect('/');
}
