import { z } from 'zod';

const POLISH_NAME_PART =
  /^[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{1,}(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?$/;

const FULL_NAME_REGEX =
  /^[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{1,}(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)? [A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{1,}(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?(?: [A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{1,}(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)*$/;

const CLASS_REGEX = /^[1-5][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{1,3}$/;

const BLOCKED_NAMES = [
  'asdf',
  'asdfgh',
  'qwerty',
  'test',
  'admin',
  'user',
  'null',
  'undefined',
  'anonymous',
  'anonim',
  'janusz',
  'gracz',
  'player',
  'troll',
  'hacker',
  'bot',
  'fake',
  'fejk',
  'kupa',
  'siusiak',
  'dupa',
  'chuj',
  'kurwa',
  'pizda',
  'jebac',
  'jebać',
  'pierdol',
  'pierdolić',
  'debil',
  'idiota',
  'moron',
  'retard',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'penis',
  'vagina',
  'xxx',
  'lol',
  'lul',
  'xd',
  'haha',
  'hehe',
  'abc',
  'aaa',
  'bbb',
  'ccc',
  'xxx',
  'yyy',
  'zzz',
];

function normalizeForBlocklist(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

function containsBlockedTerm(value: string): boolean {
  const normalized = normalizeForBlocklist(value);
  const words = normalized.split(/\s+/);

  for (const word of words) {
    if (BLOCKED_NAMES.includes(word)) return true;
    if (word.length <= 2) return true;
    if (/^(.)\1{2,}$/.test(word)) return true;
    if (/^\d+$/.test(word)) return true;
  }

  for (const term of BLOCKED_NAMES) {
    if (term.length >= 4 && normalized.includes(term)) return true;
  }

  return false;
}

function validateFullName(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!FULL_NAME_REGEX.test(trimmed)) return false;

  const parts = trimmed.split(' ');
  if (parts.length < 2) return false;

  return parts.every((part) => POLISH_NAME_PART.test(part));
}

export const onboardingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Imię i nazwisko jest wymagane.')
    .refine(validateFullName, {
      message:
        'Podaj prawdziwe imię i nazwisko (min. 2 słowa, każde z wielkiej litery, tylko litery polskie/łacińskie).',
    })
    .refine((val) => !containsBlockedTerm(val), {
      message: 'Podane imię i nazwisko wygląda na nieprawidłowe.',
    }),
  class: z
    .string()
    .trim()
    .regex(CLASS_REGEX, {
      message: 'Podaj poprawną klasę (np. 1A, 3C, 4Tp, 2b).',
    }),
  school: z
    .string()
    .trim()
    .min(3, 'Nazwa szkoły musi mieć co najmniej 3 znaki.')
    .max(200, 'Nazwa szkoły jest zbyt długa.'),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
