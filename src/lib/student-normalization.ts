export function normalizePersonName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pl-PL');
}

export function normalizeClassName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim()
    .toLocaleUpperCase('pl-PL');
}

export function cleanDisplayName(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
