export const RESERVATION_TIME_ZONE = 'Europe/Warsaw';
export const ADDITIONAL_SALES_DAY_SETTING_KEY =
  'additional_sales_day_enabled';
export const MAX_ACTIVE_RESERVATIONS = 15;

type ReservationBook = {
  courseCode: string | null;
};

const regularSalesDeadlines = [
  {
    date: '2026-09-17',
    deadline: '2026-09-17T12:25:00+02:00',
  },
  {
    date: '2026-09-18',
    deadline: '2026-09-18T12:25:00+02:00',
  },
] as const;

const additionalSalesDeadline = {
  date: '2026-09-21',
  deadline: '2026-09-21T12:25:00+02:00',
} as const;

function getWarsawDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESERVATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function isAdditionalSalesDayEnabled(value?: string | null) {
  return value === 'true' || value === '1';
}

/**
 * Returns 12:25 Europe/Warsaw on the first enabled sales day whose local
 * calendar date is later than the reservation date.
 */
export function getReservationExpiry(
  now = new Date(),
  additionalSalesDayEnabled = false,
): Date | null {
  if (!Number.isFinite(now.getTime())) return null;

  const currentDate = getWarsawDateKey(now);
  const deadlines = additionalSalesDayEnabled
    ? [...regularSalesDeadlines, additionalSalesDeadline]
    : regularSalesDeadlines;
  const next = deadlines.find((item) => item.date > currentDate);

  return next ? new Date(next.deadline) : null;
}

export function formatReservationDeadline(value: Date | string) {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: RESERVATION_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

function normalizeCourseCode(value: string | null) {
  return value?.trim().toLocaleLowerCase('pl-PL') || null;
}

export function getReservationLimitError(
  activeBooks: ReservationBook[],
  requestedBooks: ReservationBook[],
): string | null {
  if (activeBooks.length + requestedBooks.length > MAX_ACTIVE_RESERVATIONS) {
    return `Możesz posiadać maksymalnie ${MAX_ACTIVE_RESERVATIONS} aktywnych rezerwacji.`;
  }

  const occupiedCourses = new Set(
    activeBooks
      .map((book) => normalizeCourseCode(book.courseCode))
      .filter((course): course is string => course !== null),
  );
  const requestedCourses = new Set<string>();

  for (const book of requestedBooks) {
    const course = normalizeCourseCode(book.courseCode);
    if (!course) continue;
    if (occupiedCourses.has(course) || requestedCourses.has(course)) {
      return 'Możesz posiadać tylko jedną aktywną rezerwację z danego przedmiotu.';
    }
    requestedCourses.add(course);
  }

  return null;
}
