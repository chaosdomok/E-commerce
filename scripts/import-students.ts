import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import {
  parseStudentDirectoryHtml,
  type StudentDirectoryEntry,
} from '../src/lib/student-directory-parser';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the script.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function generateEmail(firstName: string, lastName: string, className: string): string {
  // Generuj tymczasowy email na podstawie danych ucznia
  // Format: imie.nazwisko@klasa.technikum5.pl
  const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanClass = className.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanFirstName}.${cleanLastName}@${cleanClass}.technikum5.pl`;
}

async function parseDocxFile(filePath: string): Promise<StudentDirectoryEntry[]> {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    console.log(`Parsing ${path.basename(filePath)}...`);
    const students = parseStudentDirectoryHtml(result.value);
    console.log(`Found ${students.length} students in ${path.basename(filePath)}`);
    return students;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return [];
  }
}

async function importStudentsFromDocx() {
  try {
    const studentsDir = path.join(process.cwd(), 'data', 'uczniowie');
    const files = fs.readdirSync(studentsDir).filter(f => f.endsWith('.docx'));
    
    console.log(`Found ${files.length} DOCX files to process`);
    
    let totalImported = 0;
    let totalSkipped = 0;
    
    for (const file of files) {
      const filePath = path.join(studentsDir, file);
      console.log(`Processing ${file}...`);
      
      const students = await parseDocxFile(filePath);
      console.log(`Found ${students.length} students in ${file}`);
      
      for (const student of students) {
        // Generuj email na podstawie danych ucznia
        const email = generateEmail(student.firstName, student.lastName, student.className);
        
        // Sprawdź czy uczeń już istnieje
        const existing = await prisma.allowedStudent.findUnique({
          where: { email }
        });
        
        if (existing) {
          console.log(`Skipping existing student: ${email}`);
          totalSkipped++;
          continue;
        }
        
        // Dodaj nowego ucznia
        await prisma.allowedStudent.create({
          data: {
            email,
            firstName: student.firstName,
            lastName: student.lastName,
            className: student.className,
            isClaimed: false
          }
        });
        
        console.log(`Imported: ${email} (${student.className})`);
        totalImported++;
      }
    }
    
    console.log(`\nImport complete!`);
    console.log(`Total imported: ${totalImported}`);
    console.log(`Total skipped: ${totalSkipped}`);
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Uruchom import
importStudentsFromDocx();
