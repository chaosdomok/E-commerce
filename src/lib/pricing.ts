import { parseWholePln, requireWholePln } from '@/lib/money';

export interface MarkupRule {
  minPrice: number;
  maxPrice: number | null;
  markup: number;
}

export const DEFAULT_MARKUPS: MarkupRule[] = [
  { minPrice: 1, maxPrice: 10, markup: 4 },
  { minPrice: 11, maxPrice: 20, markup: 5 },
  { minPrice: 21, maxPrice: 30, markup: 6 },
  { minPrice: 31, maxPrice: 50, markup: 7 },
  { minPrice: 51, maxPrice: 80, markup: 8 },
  { minPrice: 81, maxPrice: null, markup: 10 },
];

export function validateMarkupRules(
  rules: MarkupRule[],
): { success: true } | { success: false; error: string } {
  if (rules.length === 0) {
    return { success: false, error: 'Dodaj przynajmniej jeden próg narzutu.' };
  }

  for (const rule of rules) {
    const minimum = parseWholePln(rule.minPrice, 'Minimalna cena');
    if (!minimum.success) return minimum;

    if (rule.maxPrice !== null) {
      const maximum = parseWholePln(rule.maxPrice, 'Maksymalna cena');
      if (!maximum.success) return maximum;
      if (maximum.value < minimum.value) {
        return {
          success: false,
          error: 'Maksymalna cena progu nie może być niższa od minimalnej.',
        };
      }
    }

    if (!Number.isFinite(rule.markup) || !Number.isInteger(rule.markup) || rule.markup < 0) {
      return {
        success: false,
        error: 'Narzut musi być nieujemną kwotą w pełnych złotych.',
      };
    }
  }

  return { success: true };
}

/**
 * Calculates markup synchronously using rules (pure client-safe)
 */
export function calculateMarkupSync(basePrice: number, rules: MarkupRule[] = DEFAULT_MARKUPS): number {
  const normalizedBasePrice = requireWholePln(basePrice, 'Cena bazowa');
  const validation = validateMarkupRules(rules);
  if (!validation.success) throw new Error(validation.error);

  for (const rule of rules) {
    if (normalizedBasePrice >= rule.minPrice) {
      if (rule.maxPrice === null || normalizedBasePrice <= rule.maxPrice) {
        return rule.markup;
      }
    }
  }

  return 5; // Default fallback
}

/**
 * Calculates final sale price given a base price (pure client-safe)
 */
export function calculateFinalPriceSync(basePrice: number, rules: MarkupRule[] = DEFAULT_MARKUPS): {
  basePrice: number;
  markup: number;
  finalPrice: number;
} {
  const normalizedBasePrice = requireWholePln(basePrice, 'Cena bazowa');
  const markup = calculateMarkupSync(normalizedBasePrice, rules);
  return {
    basePrice: normalizedBasePrice,
    markup,
    finalPrice: normalizedBasePrice + markup,
  };
}
