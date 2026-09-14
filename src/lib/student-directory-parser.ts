import {
  cleanDisplayName,
  normalizeClassName,
} from './student-normalization';

export type StudentDirectoryEntry = {
  firstName: string;
  lastName: string;
  fullName: string;
  className: string;
};

function decodeHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(
    /&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith('#x') || code.startsWith('#X')) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      }
      return namedEntities[code.toLowerCase()] ?? entity;
    },
  );
}

function textContent(html: string): string {
  return cleanDisplayName(decodeHtml(html.replace(/<[^>]*>/g, ' ')));
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/gi, 'l')
    .replace(/[^a-z]/gi, '')
    .toLowerCase();
}

export function parseClassNameFromHeading(heading: string): string | null {
  const cleanHeading = cleanDisplayName(heading).toLocaleUpperCase('pl-PL');
  const match = cleanHeading.match(
    /^\d+\s*[A-ZĄĆĘŁŃÓŚŹŻ]+(?:\s*\d+)?(?=\s|$)/u,
  );
  const className = normalizeClassName(match?.[0]);
  return className || null;
}

function parseTable(
  tableHtml: string,
  className: string,
): StudentDirectoryEntry[] {
  const rows = tableHtml.match(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gi) ?? [];
  if (rows.length < 2) return [];

  const cellsForRow = (row: string) =>
    [...row.matchAll(/<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/gi)].map(
      (match) => textContent(match[1]),
    );

  const headers = cellsForRow(rows[0] ?? '').map(normalizeHeader);
  const firstNameIndex = headers.indexOf('imie');
  const lastNameIndex = headers.indexOf('nazwisko');
  const ordinalIndex = headers.findIndex((header) => header === 'lp');

  if (firstNameIndex < 0 || lastNameIndex < 0) return [];

  return rows.slice(1).flatMap((row) => {
    const cells = cellsForRow(row);
    const ordinal = ordinalIndex >= 0 ? cells[ordinalIndex] : '';
    const firstName = cleanDisplayName(cells[firstNameIndex] ?? '');
    const lastName = cleanDisplayName(cells[lastNameIndex] ?? '');

    if ((ordinal && !/^\d+$/.test(ordinal)) || !firstName || !lastName) {
      return [];
    }

    return [
      {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        className,
      },
    ];
  });
}

export function parseStudentDirectoryHtml(
  html: string,
): StudentDirectoryEntry[] {
  const students: StudentDirectoryEntry[] = [];
  let currentClass: string | null = null;
  const blocks = [
    ...html.matchAll(
      /Oddział\s*:\s*<strong(?:\s[^>]*)?>([\s\S]*?)<\/strong>|(<table(?:\s[^>]*)?>[\s\S]*?<\/table>)/gi,
    ),
  ];

  for (const block of blocks) {
    const classHeading = block[1];
    if (classHeading) {
      currentClass = parseClassNameFromHeading(textContent(classHeading));
      continue;
    }

    const table = block[2];
    if (currentClass && table) {
      students.push(...parseTable(table, currentClass));
    }
  }

  return students;
}
