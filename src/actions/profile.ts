'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { normalizePolishPhone } from '@/lib/profile';
import { assertAccountActive, BlockedAccountError } from '@/lib/account-access';

export async function updateProfileData(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Musisz być zalogowany.' };
  }

  const phone = (formData.get('phone') as string)?.trim();
  const refundMethod = (formData.get('refundMethod') as string)?.trim();
  const normalizedPhone = normalizePolishPhone(phone);

  if (phone && !normalizedPhone) {
    return { error: 'Podaj dokładnie 9 cyfr numeru telefonu.' };
  }

  try {
    await assertAccountActive(user.id, () => supabase.auth.signOut());
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        phone: normalizedPhone,
        refundMethod: refundMethod || null,
      },
    });

    await logAuditEvent({
      action: 'USER_UPDATE_PROFILE',
      userId: user.id,
      details: { phone: normalizedPhone, refundMethod },
    });

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    if (error instanceof BlockedAccountError) {
      return { error: error.message };
    }
    console.error('Error updating profile:', error);
    return { error: 'Nie udało się zaktualizować danych.' };
  }
}
