const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma Client.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function generateEmail(firstName, lastName, className) {
  const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanClass = className.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanFirstName}.${cleanLastName}@${cleanClass}.technikum5.pl`;
}

async function parseDocxFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    
    console.log(`Parsing ${path.basename(filePath)}...`);
    
    const students = [];
    
    // Znajdź wszystkie klasy
    const classMatches = html.match(/Oddział:\s*<strong>([^<]+)<\/strong>/g);
    if (classMatches) {
      console.log(`Found ${classMatches.length} classes`);
    }
    
    // Parsuj wszystkie wiersze tabeli
    const tableRows = html.match(/<tr>.*?<\/tr>/g);
    if (tableRows) {
      console.log(`Found ${tableRows.length} table rows`);
      
      let studentIndex = 0;
      let classIndex = 0;
      let currentClassName = 'unknown';
      
      for (const row of tableRows) {
        // Pomiń nagłówek tabeli
        if (row.includes('Lp') || row.includes('Nazwisko') || row.includes('Imię')) {
          continue;
        }
        
        // Parsuj komórki wiersza
        const cells = row.match(/<td>.*?<\/td>/g);
        if (cells && cells.length >= 3) {
          const lp = cells[0].replace(/<[^>]*>/g, '').trim();
          const lastName = cells[1].replace(/<[^>]*>/g, '').trim();
          const firstName = cells[2].replace(/<[^>]*>/g, '').trim();
          
          if (lp.match(/^\d+$/) && lastName && firstName) {
            // Znajdź odpowiednią klasę dla tego ucznia
            if (classMatches && classIndex < classMatches.length && studentIndex > 0 && studentIndex % 32 === 0) {
              classIndex++;
            }
            
            if (classMatches && classIndex < classMatches.length) {
              const fullClassName = classMatches[classIndex].replace(/Oddział:\s*<strong>|<\/strong>/g, '');
              currentClassName = fullClassName.split(/\s+/)[0];
            }
            
            students.push({
              firstName,
              lastName,
              className: currentClassName
            });
            studentIndex++;
          }
        }
      }
    }
    
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