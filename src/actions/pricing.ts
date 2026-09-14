'use server';

import { prisma } from '@/lib/prisma';
import { DEFAULT_MARKUPS, MarkupRule, calculateFinalPriceSync } from '@/lib/pricing';

/**
 * Server function to fetch active price markups from DB
 */
export async function getPriceMarkups(): Promise<MarkupRule[]> {
  try {
    const dbMarkups = await prisma.priceMarkup.findMany({
      orderBy: { minPrice: 'asc' },
    });

    if (dbMarkups.length === 0) {
      return DEFAULT_MARKUPS;
    }

    return dbMarkups.map((m) => ({
      minPrice: Number(m.minPrice),
      maxPrice: m.maxPrice ? Number(m.maxPrice) : null,
      markup: Number(m.markup),
    }));
  } catch (error) {
    console.error('Failed to fetch price markups from DB, using defaults:', error);
    return DEFAULT_MARKUPS;
  }
}

/**
 * Server function to calculate final price using live database markups
 */
export async function calculatePriceWithMarkup(basePrice: number) {
  const rules = await getPriceMarkups();
  return calculateFinalPriceSync(basePrice, rules);
}
