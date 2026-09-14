'use server';

import { getStudentDirectory } from '@/lib/student-directory';
import { studentAlreadyHasAccount } from '@/lib/student-account';
import {
  OFFICIAL_SCHOOL_NAME,
  resolveOfficialStudent,
  STUDENT_AMBIGUOUS_MESSAGE,
  STUDENT_CLASS_MISMATCH_MESSAGE,
  STUDENT_DUPLICATE_MESSAGE,
  STUDENT_NOT_FOUND_MESSAGE,
} from '@/lib/student-registration';

export interface StudentEligibilityResult {
  found: boolean;
  student?: {
    firstName: string;
    lastName: string;
    className: string;
    school: string;
  };
  message?: string;
}

export async function checkStudentEligibility(
  firstName: string,
  lastName: string,
  submittedClass?: string,
): Promise<StudentEligibilityResult> {
  if (!firstName.trim() || !lastName.trim()) {
    return { found: false, message: 'Podaj imię i nazwisko ucznia.' };
  }

  try {
    const directory = await getStudentDirectory();
    const resolution = resolveOfficialStudent(
      directory,
      firstName,
      lastName,
      submittedClass,
    );

    if (resolution.status === 'not_found') {
      return { found: false, message: STUDENT_NOT_FOUND_MESSAGE };
    }

    if (resolution.status === 'class_mismatch') {
      return { found: false, message: STUDENT_CLASS_MISMATCH_MESSAGE };
    }

    if (resolution.status === 'ambiguous') {
      return { found: false, message: STUDENT_AMBIGUOUS_MESSAGE };
    }

    const { student } = resolution;
    if (await studentAlreadyHasAccount(student)) {
      return { found: false, message: STUDENT_DUPLICATE_MESSAGE };
    }

    return {
      found: true,
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.className,
        school: OFFICIAL_SCHOOL_NAME,
      },
      message: 'Znaleziono ucznia.',
    };
  } catch (error) {
    console.error('Student directory verification failed:', error);
    return {
      found: false,
      message:
        'Nie udało się teraz sprawdzić listy uczniów. Spróbuj ponownie później.',
    };
  }
}
