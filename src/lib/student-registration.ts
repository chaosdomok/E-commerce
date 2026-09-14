import type { StudentDirectoryEntry } from './student-directory-parser';
import {
  normalizeClassName,
  normalizePersonName,
} from './student-normalization';

export const OFFICIAL_SCHOOL_NAME = 'Technikum nr 5 w Opolu';

export const STUDENT_NOT_FOUND_MESSAGE =
  'Nie znaleźliśmy Cię na liście uczniów. Sprawdź imię i nazwisko albo wybierz rejestrację jako osoba spoza szkoły.';

export const STUDENT_DUPLICATE_MESSAGE =
  'Dla tego ucznia istnieje już konto. Zaloguj się lub skontaktuj z obsługą, jeśli nie masz do niego dostępu.';

export const STUDENT_CLASS_MISMATCH_MESSAGE =
  'Klasa nie zgadza się z oficjalną listą uczniów. Odśwież weryfikację imienia i nazwiska.';

export const STUDENT_AMBIGUOUS_MESSAGE =
  'Na liście znajduje się więcej niż jedna osoba o tym imieniu i nazwisku. Skontaktuj się z obsługą, aby potwierdzić klasę.';

export type StudentResolution =
  | { status: 'found'; student: StudentDirectoryEntry }
  | { status: 'not_found' }
  | { status: 'ambiguous' }
  | { status: 'class_mismatch' };

export type ExistingStudentProfile = {
  accountType: string | null;
  className: string | null;
  fullName: string | null;
  school: string | null;
};

export function resolveOfficialStudent(
  directory: readonly StudentDirectoryEntry[],
  firstName: string,
  lastName: string,
  submittedClass?: string | null,
): StudentResolution {
  const normalizedFullName = normalizePersonName(`${firstName} ${lastName}`);
  const matches = directory.filter(
    (entry) => normalizePersonName(entry.fullName) === normalizedFullName,
  );

  if (matches.length === 0) return { status: 'not_found' };

  if (matches.length > 1) {
    return { status: 'ambiguous' };
  }

  const student = submittedClass
    ? matches.find(
        (entry) =>
          normalizeClassName(entry.className) ===
          normalizeClassName(submittedClass),
      )
    : matches[0];

  if (!student) {
    return { status: 'class_mismatch' };
  }

  return { status: 'found', student };
}

export function isExistingStudentAccount(
  profiles: readonly ExistingStudentProfile[],
  student: Pick<StudentDirectoryEntry, 'fullName' | 'className'>,
): boolean {
  const expectedName = normalizePersonName(student.fullName);
  const expectedClass = normalizeClassName(student.className);

  return profiles.some((profile) => {
    const isSchoolStudent =
      profile.accountType?.toLowerCase() === 'student' ||
      normalizePersonName(profile.school) ===
        normalizePersonName(OFFICIAL_SCHOOL_NAME);

    return (
      isSchoolStudent &&
      normalizePersonName(profile.fullName) === expectedName &&
      normalizeClassName(profile.className) === expectedClass
    );
  });
}
