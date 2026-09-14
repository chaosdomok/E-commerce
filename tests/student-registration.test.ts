import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as mammoth from 'mammoth';
import { parseStudentDirectoryHtml } from '../src/lib/student-directory-parser';
import {
  normalizeClassName,
  normalizePersonName,
} from '../src/lib/student-normalization';
import {
  isExistingStudentAccount,
  resolveOfficialStudent,
} from '../src/lib/student-registration';

const syntheticDirectory = parseStudentDirectoryHtml(`
  <p>Oddział: <strong>4 D Technik Informatyk</strong></p>
  <table>
    <tr><td>Lp.</td><td>Nazwisko</td><td>Imię</td><td></td></tr>
    <tr><td>1</td><td>Żółć-Kowalska</td><td>Anna Maria</td><td></td></tr>
  </table>
  <p>Oddział: <strong>2AT Technik Mechatronik</strong></p>
  <table>
    <tr><td>Lp.</td><td>Nazwisko</td><td>Imię</td></tr>
    <tr><td>1</td><td>Nowak</td><td>Jan</td></tr>
    <tr><td>2</td><td>Kowalczyk</td><td>Ewa</td></tr>
    <tr><td></td><td></td><td></td></tr>
  </table>
`);

test('parser wiąże każdą tabelę z właściwą klasą i zachowuje polskie znaki', () => {
  assert.deepEqual(syntheticDirectory, [
    {
      firstName: 'Anna Maria',
      lastName: 'Żółć-Kowalska',
      fullName: 'Anna Maria Żółć-Kowalska',
      className: '4D',
    },
    {
      firstName: 'Jan',
      lastName: 'Nowak',
      fullName: 'Jan Nowak',
      className: '2AT',
    },
    {
      firstName: 'Ewa',
      lastName: 'Kowalczyk',
      fullName: 'Ewa Kowalczyk',
      className: '2AT',
    },
  ]);
});

test('poprawny uczeń jest znajdowany niezależnie od spacji i wielkości liter', () => {
  const result = resolveOfficialStudent(
    syntheticDirectory,
    '  ANNA   MARIA ',
    ' żółć - KOWALSKA ',
    ' 4 d ',
  );

  assert.equal(result.status, 'found');
  if (result.status === 'found') {
    assert.equal(result.student.className, '4D');
  }
  assert.equal(normalizePersonName('  Jan   NOWAK '), 'jan nowak');
  assert.equal(normalizeClassName(' 4 d '), '4D');
});

test('błędna klasa nie może zastąpić klasy z oficjalnej listy', () => {
  assert.equal(
    resolveOfficialStudent(
      syntheticDirectory,
      'Anna Maria',
      'Żółć-Kowalska',
      '3A',
    ).status,
    'class_mismatch',
  );
});

test('nieistniejący uczeń nie przechodzi weryfikacji', () => {
  assert.equal(
    resolveOfficialStudent(syntheticDirectory, 'Nieznany', 'Uczeń').status,
    'not_found',
  );
});

test('niejednoznaczne imię i nazwisko nie powoduje zgadywania klasy', () => {
  const ambiguousDirectory = [
    syntheticDirectory[1],
    { ...syntheticDirectory[1], className: '3BT' },
  ];
  assert.equal(
    resolveOfficialStudent(ambiguousDirectory, 'Jan', 'Nowak').status,
    'ambiguous',
  );
  assert.equal(
    resolveOfficialStudent(ambiguousDirectory, 'Jan', 'Nowak', '3BT').status,
    'ambiguous',
  );
});

test('wykrywa drugie konto ucznia po znormalizowanym imieniu, nazwisku i klasie', () => {
  assert.equal(
    isExistingStudentAccount(
      [
        {
          accountType: 'student',
          fullName: ' anna maria  ŻÓŁĆ - kowalska ',
          className: '4 d',
          school: 'Technikum nr 5 w Opolu',
        },
      ],
      syntheticDirectory[0],
    ),
    true,
  );
});

test('osoba zewnętrzna o takim samym nazwisku nie jest uznawana za duplikat ucznia', () => {
  assert.equal(
    isExistingStudentAccount(
      [
        {
          accountType: 'other',
          fullName: 'Anna Maria Żółć-Kowalska',
          className: '4D',
          school: 'Pozostałe osoby',
        },
      ],
      syntheticDirectory[0],
    ),
    false,
  );
});

test('aktualne pliki DOCX mają rozpoznawalne nagłówki klas i wiersze uczniów', async () => {
  const directoryPath = path.join(process.cwd(), 'data', 'uczniowie');
  const fileNames = (await fs.readdir(directoryPath)).filter((fileName) =>
    fileName.toLowerCase().endsWith('.docx'),
  );
  assert.ok(fileNames.length > 0);
  const allStudents: ReturnType<typeof parseStudentDirectoryHtml> = [];
  const observedClassSizes = new Set<number>();

  for (const fileName of fileNames) {
    const buffer = await fs.readFile(path.join(directoryPath, fileName));
    const result = await mammoth.convertToHtml({ buffer });
    const students = parseStudentDirectoryHtml(result.value);
    assert.ok(students.length > 0, `${fileName} powinien zawierać uczniów`);
    assert.ok(
      students.every((student) => /^\d+[A-ZĄĆĘŁŃÓŚŹŻ]+\d*$/u.test(student.className)),
      `${fileName} powinien mieć znormalizowane klasy`,
    );
    allStudents.push(...students);
    const classSizes = new Map<string, number>();
    for (const student of students) {
      classSizes.set(
        student.className,
        (classSizes.get(student.className) ?? 0) + 1,
      );
    }
    for (const size of classSizes.values()) observedClassSizes.add(size);
  }

  assert.ok(observedClassSizes.size > 1, 'parser musi obsługiwać różne liczebności klas');
  const normalizedIdentities = allStudents.map(
    (student) =>
      `${normalizePersonName(student.fullName)}|${normalizeClassName(student.className)}`,
  );
  assert.equal(
    new Set(normalizedIdentities).size,
    normalizedIdentities.length,
    'oficjalna lista zawiera powtórzony wpis tej samej osoby i klasy',
  );

  const studentsByName = new Map<string, typeof allStudents>();
  for (const student of allStudents) {
    const key = normalizePersonName(student.fullName);
    studentsByName.set(key, [...(studentsByName.get(key) ?? []), student]);
  }
  const ambiguousGroups = [...studentsByName.values()].filter(
    (students) => new Set(students.map((student) => student.className)).size > 1,
  );
  assert.equal(ambiguousGroups.length, 1);
  const ambiguousStudent = ambiguousGroups[0][0];
  assert.equal(
    resolveOfficialStudent(
      allStudents,
      ambiguousStudent.firstName,
      ambiguousStudent.lastName,
    ).status,
    'ambiguous',
  );
});
