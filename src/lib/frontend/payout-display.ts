// Keep stored backend values intact, including legacy payout preferences.
export const CASH_PAYOUT_METHOD = 'Gotówka w szkole';
export const PHONE_BLIK_PAYOUT_METHOD = 'Przelew na telefon BLIK';
export function normalizePayoutMethod(value?: string | null) { return value || CASH_PAYOUT_METHOD; }
