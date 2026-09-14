/** Explicit frontend-only developer opt-in. Target middleware is unchanged. */
export const isFrontendPreview = process.env.NEXT_PUBLIC_FRONTEND_PREVIEW === 'true';
export const PREVIEW_MESSAGE = 'Tryb podglądu frontendu — operacje backendowe są wyłączone. Dane nie zostały zapisane.';
