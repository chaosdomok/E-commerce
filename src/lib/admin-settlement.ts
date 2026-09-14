import {
  CASH_PAYOUT_METHOD,
  normalizePayoutMethod,
  PHONE_BLIK_PAYOUT_METHOD,
} from '@/lib/frontend/payout-display';

export interface SettlementBook {
  status: string;
  price: number;
  basePrice: number | null;
  payoutPaidAt: string | null;
  seller?: {
    refundMethod?: string | null;
  } | null;
}

export interface FairSummary {
  totalBooks: number;
  catalogValue: number;
  soldBooks: number;
  soldValue: number;
  sellerValue: number;
  suMargin: number;
  cashOutstanding: number;
  blikOutstanding: number;
  missingBasePrice: number;
  unclassifiedOutstanding: number;
}

export function calculateFairSummary(books: SettlementBook[]): FairSummary {
  const soldBooks = books.filter((book) => book.status === 'SOLD');
  const withKnownBasePrice = soldBooks.filter(
    (book) => book.basePrice !== null && Number.isFinite(book.basePrice),
  );
  const outstanding = withKnownBasePrice.filter((book) => !book.payoutPaidAt);

  const payoutFor = (method: string) =>
    outstanding
      .filter(
        (book) => normalizePayoutMethod(book.seller?.refundMethod) === method,
      )
      .reduce((sum, book) => sum + Number(book.basePrice), 0);

  const knownOutstanding = outstanding.reduce(
    (sum, book) => sum + Number(book.basePrice),
    0,
  );
  const cashOutstanding = payoutFor(CASH_PAYOUT_METHOD);
  const blikOutstanding = payoutFor(PHONE_BLIK_PAYOUT_METHOD);

  return {
    totalBooks: books.length,
    catalogValue: books.reduce((sum, book) => sum + Number(book.price), 0),
    soldBooks: soldBooks.length,
    soldValue: soldBooks.reduce((sum, book) => sum + Number(book.price), 0),
    sellerValue: withKnownBasePrice.reduce(
      (sum, book) => sum + Number(book.basePrice),
      0,
    ),
    suMargin: withKnownBasePrice.reduce(
      (sum, book) => sum + Number(book.price) - Number(book.basePrice),
      0,
    ),
    cashOutstanding,
    blikOutstanding,
    missingBasePrice: soldBooks.length - withKnownBasePrice.length,
    unclassifiedOutstanding:
      knownOutstanding - cashOutstanding - blikOutstanding,
  };
}
