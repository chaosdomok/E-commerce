import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('hotfix 1.0.2: approval email używa ceny bazowej', () => {
  const content = fs.readFileSync('src/actions/admin.ts', 'utf8');
  assert.ok(
    content.includes('price: Number(b.basePrice || b.price)'),
    'Plik admin.ts musi używać b.basePrice do e-maila zatwierdzenia'
  );
});

test('hotfix 1.0.2: approval tworzy notification', () => {
  const content = fs.readFileSync('src/actions/admin.ts', 'utf8');
  assert.ok(
    content.includes("title: 'Książka zatwierdzona'"),
    'Plik admin.ts musi tworzyć powiadomienie z tytułem Książka zatwierdzona'
  );
});

test('hotfix 1.0.2: mark one read używa prawidłowego pola', () => {
  const content = fs.readFileSync('src/actions/notifications.ts', 'utf8');
  assert.ok(
    content.includes('read: true') || content.includes('eq(\'read\', false)'),
    'Plik notifications.ts musi aktualizować/sprawdzać kolumnę read'
  );
  assert.ok(
    !content.includes('is_read: true'),
    'Plik notifications.ts nie może używać is_read w zapytaniach do BD'
  );
});

test('hotfix 1.0.2: mark all read działa', () => {
  const content = fs.readFileSync('src/actions/notifications.ts', 'utf8');
  // Weryfikacja że funkcja markAllNotificationsAsRead nie została usunięta
  assert.ok(content.includes('export async function markAllNotificationsAsRead()'));
});

test('hotfix 1.0.2: wersja stopki pochodzi z aktualnej wersji projektu', () => {
  const footerContent = fs.readFileSync('src/components/site/footer.tsx', 'utf8');
  assert.ok(footerContent.includes("import pkg from"), 'Stopka musi zawierać import package.json');
  assert.ok(footerContent.includes("v{pkg.version}"), 'Stopka musi wyświetlać v{pkg.version}');
});
