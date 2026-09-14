import type { Profile } from '@/lib/profile';
import type { Notification } from '@/actions/notifications';
import type { Database } from '@/types/supabase';
import { CASH_PAYOUT_METHOD } from '@/lib/frontend/payout-display';

const createdAt = new Date('2026-09-01T10:00:00.000Z');

export const previewUser = { id: '00000000-0000-4000-8000-000000000001' };
export const previewDbProfile = {
  ...previewUser,
  fullName: 'Anna Nowak',
  email: 'anna.preview@example.test',
  initials: 'AN',
  class: '2A',
  school: 'Przykładowe Liceum w Opolu',
  department: null,
  reputationScore: 12,
  role: 'admin',
  phone: null,
  accountType: 'student',
  refundMethod: CASH_PAYOUT_METHOD,
  termsAccepted: true,
  createdAt,
  updatedAt: createdAt,
};

export const previewProfile: Profile = {
  id: previewUser.id,
  full_name: previewDbProfile.fullName,
  initials: previewDbProfile.initials,
  class: previewDbProfile.class,
  school: previewDbProfile.school,
  department: null,
  reputation_score: 12,
  role: 'admin',
  created_at: createdAt.toISOString(),
};

// Fictional listings; no remote covers or real personal data.
const titles = [
  ['MATeMAtyka 1. Zakres podstawowy', 'Wojciech Babiański, Lech Chańko', 'Matematyka', 'DOBRY', 32, '9788326740012'],
  ['Ponad słowami 2. Część 1', 'Małgorzata Chmiel, Anna Równy', 'Język polski', 'JAK NOWY', 38, '9788326740029'],
  ['Biologia na czasie 1', 'Anna Helmin, Jolanta Holeczek', 'Biologia', 'IDEALNY', 45, '9788326740036'],
  ['To jest chemia 1', 'Romuald Hassa, Aleksandra Mrzigod', 'Chemia', 'DOBRY', 29, '9788326740043'],
  ['Oblicza geografii 2', 'Tomasz Rachwał, Radosław Uliszak', 'Geografia', 'UŻYWANY', 24, '9788326740050'],
  ['Focus 3. Student’s Book', 'Sue Kay, Vaughan Jones', 'Język angielski', 'JAK NOWY', 42, '9788326740067'],
] as const;

export const previewBooks = titles.map(([title, author, courseCode, condition, price, isbn], index) => ({
  id: `00000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
  inventoryNumber: index + 1,
  title, author, courseCode, condition, price, isbn,
  basePrice: price - 5,
  currency: 'PLN',
  status: 'AVAILABLE' as const,
  sellerId: index === 0 ? previewUser.id : '00000000-0000-4000-8000-000000000002',
  seller: index === 0 ? previewDbProfile : { ...previewDbProfile,
    id: '00000000-0000-4000-8000-000000000002', fullName: 'Jan Kowalski',
    email: 'jan.preview@example.test', initials: 'JK',
  },
  coverUrl: null,
  reservedByUserId: null,
  reservedUntil: null,
  reservationCode: null,
  createdAt,
  updatedAt: createdAt,
  acceptedAt: createdAt,
  paymentMethod: null,
  payoutPaidAt: null,
  addedByAdminId: null,
  originalOwnerName: null,
}));

export const previewCatalogBooks = previewBooks.map((book) => ({
  id: book.id, title: book.title, author: book.author, isbn: book.isbn,
  price: book.price, condition: book.condition, course_code: book.courseCode,
  cover_url: book.coverUrl, created_at: book.createdAt.toISOString(),
}));

export const previewHomeBooks: Database['public']['Tables']['books']['Row'][] =
  previewBooks.map((book, index) => ({
    ...previewCatalogBooks[index], seller_id: book.sellerId,
    status: book.status, reserved_by_user_id: null,
  }));

export const previewReservations = [{
  ...previewBooks[1], status: 'RESERVED', reservedByUserId: previewUser.id,
  reservationCode: 'PODGLAD-001',
  reservedUntil: new Date('2026-09-17T12:25:00+02:00'),
}];

export const previewNotifications: Notification[] = [
  { id: 'preview-notification-1', user_id: previewUser.id, title: 'Podręcznik przyjęty',
    message: 'Przykładowa książka MATeMAtyka 1 jest widoczna w katalogu.',
    type: 'success', is_read: false, created_at: createdAt.toISOString() },
  { id: 'preview-notification-2', user_id: previewUser.id, title: 'Rezerwacja aktywna',
    message: 'Twoja rezerwacja jest ważna do 17.09, godz. 12:25. Odbiór w sali nr 13.',
    type: 'info', is_read: false, created_at: createdAt.toISOString() },
];
