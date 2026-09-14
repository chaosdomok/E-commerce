import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as mammoth from 'mammoth';
import {
  parseStudentDirectoryHtml,
  type StudentDirectoryEntry,
} from './student-directory-parser';

let studentDirectoryPromise: Promise<readonly StudentDirectoryEntry[]> | null =
  null;

async function loadStudentDirectory(): Promise<readonly StudentDirectoryEntry[]> {
  const directoryPath = path.join(process.cwd(), 'data', 'uczniowie');
  const fileNames = (await fs.readdir(directoryPath))
    .filter((fileName) => fileName.toLowerCase().endsWith('.docx'))
    .sort((left, right) => left.localeCompare(right, 'pl-PL'));

  if (fileNames.length === 0) {
    throw new Error('Brak plików DOCX z listami uczniów.');
  }

  const documents = await Promise.all(
    fileNames.map(async (fileName) => {
      const buffer = await fs.readFile(path.join(directoryPath, fileName));
      const result = await mammoth.convertToHtml({ buffer });
      return parseStudentDirectoryHtml(result.value);
    }),
  );

  const students = documents.flat();
  if (students.length === 0) {
    throw new Error('Nie udało się odczytać uczniów z plików DOCX.');
  }

  return students;
}

export function getStudentDirectory(): Promise<readonly StudentDirectoryEntry[]> {
  studentDirectoryPromise ??= loadStudentDirectory().catch((error) => {
    studentDirectoryPromise = null;
    throw error;
  });

  return studentDirectoryPromise;
}
