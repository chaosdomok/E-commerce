import { isFrontendPreview, PREVIEW_MESSAGE } from '@/lib/preview';


export async function signInWithEmail(...args: Parameters<typeof import('@/actions/auth').signInWithEmail>): Promise<Awaited<ReturnType<typeof import('@/actions/auth').signInWithEmail>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/auth').signInWithEmail>>; }
  return (await import('@/actions/auth')).signInWithEmail(...args);
}

export async function signUpWithEmail(...args: Parameters<typeof import('@/actions/auth').signUpWithEmail>): Promise<Awaited<ReturnType<typeof import('@/actions/auth').signUpWithEmail>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/auth').signUpWithEmail>>; }
  return (await import('@/actions/auth')).signUpWithEmail(...args);
}

export async function signOut(...args: Parameters<typeof import('@/actions/auth').signOut>): Promise<Awaited<ReturnType<typeof import('@/actions/auth').signOut>>> {
  if (isFrontendPreview) { return; }
  return (await import('@/actions/auth')).signOut(...args);
}

export async function changePassword(...args: Parameters<typeof import('@/actions/auth').changePassword>): Promise<Awaited<ReturnType<typeof import('@/actions/auth').changePassword>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/auth').changePassword>>; }
  return (await import('@/actions/auth')).changePassword(...args);
}

export async function requestPasswordReset(...args: Parameters<typeof import('@/actions/auth').requestPasswordReset>): Promise<Awaited<ReturnType<typeof import('@/actions/auth').requestPasswordReset>>> {
  if (isFrontendPreview) { return { success: true, message: 'Jeżeli konto istnieje, wysłaliśmy instrukcję zmiany hasła.' }; }
  return (await import('@/actions/auth')).requestPasswordReset(...args);
}

export async function completePasswordReset(...args: Parameters<typeof import('@/actions/auth').completePasswordReset>): Promise<Awaited<ReturnType<typeof import('@/actions/auth').completePasswordReset>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE }; }
  return (await import('@/actions/auth')).completePasswordReset(...args);
}
