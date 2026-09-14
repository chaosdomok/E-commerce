export const WHOLE_PLN_ERROR = 'Cena musi być podana w pełnych złotych, bez groszy.';
export const PRICE_RANGE_ERROR = 'Cena musi mieścić się w zakresie 1-999 zł.';

export type WholePlnResult =
  | { success: true; value: number }
  | { success: false; error: string };

export function parseWholePln(value: unknown, label = 'Cena'): WholePlnResult {
  if (typeof value === 'string' && value.trim() === '') {
    return { success: false, error: `${label} musi być prawidłową liczbą.` };
  }

  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return { success: false, error: `${label} musi być prawidłową liczbą.` };
  }
  if (!Number.isInteger(amount)) {
    return { success: false, error: WHOLE_PLN_ERROR };
  }
  if (amount <= 0) {
    return { success: false, error: `${label} musi być większa od zera.` };
  }
  if (amount > 999) {
    return { success: false, error: PRICE_RANGE_ERROR };
  }

  return { success: true, value: amount };
}

export function requireWholePln(value: unknown, label = 'Cena'): number {
  const result = parseWholePln(value, label);
  if (!result.success) throw new Error(result.error);
  return result.value;
}

export function formatWholePlnAmount(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWholePln(value: number): string {
  return `${formatWholePlnAmount(value)} zł`;
}
