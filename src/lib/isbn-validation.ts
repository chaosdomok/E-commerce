/**
 * Parses and validates ISBN-13.
 * Automatically removes standard ISBN/ISBN-13 prefixes, hyphens, and spaces.
 * Only returns a string if it's a valid ISBN-13 checksum, otherwise null.
 */
export function validateAndNormalizeIsbn13(input: string | null | undefined): string | null {
  if (!input) return null;

  // Trim whitespace
  let cleaned = input.trim();

  // Remove standard ISBN prefixes only from the beginning
  const isbnPrefixes = [
    /^ISBN\s*:/i,
    /^ISBN\s*-?\s*13\s*:/i,
    /^ISBN\s*-?\s*13\s*/i,
    /^ISBN\s*/i,
    /^ISBN-\s*/i,
  ];

  for (const prefix of isbnPrefixes) {
    cleaned = cleaned.replace(prefix, '');
  }

  // Now remove only allowed characters: digits, hyphens, and spaces
  const digitsOnly = cleaned.replace(/[^0-9]/g, '');

  // We only support ISBN-13
  if (digitsOnly.length !== 13) {
    return null;
  }

  // ISBN-13 must be all digits
  if (!/^\d{13}$/.test(digitsOnly)) {
    return null;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digitsOnly[i], 10);
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  const actualCheckDigit = parseInt(digitsOnly[12], 10);

  if (checkDigit === actualCheckDigit) {
    return digitsOnly;
  }

  return null;
}
