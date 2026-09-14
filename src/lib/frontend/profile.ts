import { isFrontendPreview, PREVIEW_MESSAGE } from '@/lib/preview';


export async function updateProfileData(...args: Parameters<typeof import('@/actions/profile').updateProfileData>): Promise<Awaited<ReturnType<typeof import('@/actions/profile').updateProfileData>>> {
  if (isFrontendPreview) { return { error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/profile').updateProfileData>>; }
  return (await import('@/actions/profile')).updateProfileData(...args);
}
