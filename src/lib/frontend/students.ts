import { isFrontendPreview, PREVIEW_MESSAGE } from '@/lib/preview';


export async function checkStudentEligibility(...args: Parameters<typeof import('@/actions/students').checkStudentEligibility>): Promise<Awaited<ReturnType<typeof import('@/actions/students').checkStudentEligibility>>> {
  if (isFrontendPreview) { return { found: false, message: PREVIEW_MESSAGE }; }
  return (await import('@/actions/students')).checkStudentEligibility(...args);
}
