import 'server-only';

import { prisma } from '@/lib/prisma';
import type { StudentDirectoryEntry } from './student-directory-parser';
import { isExistingStudentAccount } from './student-registration';

export async function studentAlreadyHasAccount(
  student: Pick<StudentDirectoryEntry, 'fullName' | 'className'>,
): Promise<boolean> {
  const profiles = await prisma.profile.findMany({
    where: {
      fullName: { not: null },
      class: { not: null },
    },
    select: {
      accountType: true,
      class: true,
      fullName: true,
      school: true,
    },
  });

  return isExistingStudentAccount(
    profiles.map((profile) => ({
      accountType: profile.accountType,
      className: profile.class,
      fullName: profile.fullName,
      school: profile.school,
    })),
    student,
  );
}
