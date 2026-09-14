import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { readSmtpConfiguration } from '../src/lib/email-config';

let transportOptions: Record<string, unknown> | null = null;
const sentMessages: Record<string, unknown>[] = [];

const previousEnvironment = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
};

before(async () => {
  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USER = 'sender@example.test';
  process.env.SMTP_PASS = 'test-password-never-logged';
  process.env.SMTP_FROM = 'sender@example.test';

  mock.module('nodemailer', {
    defaultExport: {
      createTransport: (options: Record<string, unknown>) => {
        transportOptions = options;
        return {
          verify: async () => true,
          sendMail: async (message: Record<string, unknown>) => {
            sentMessages.push(message);
            return { messageId: 'mock-message-id' };
          },
        };
      },
    },
  });
});

after(() => {
  for (const [key, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('konfiguracja używa SMTP_PASS, SMTP_FROM i secure dla portu 465', () => {
  const config = readSmtpConfiguration({
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USER: 'user@example.test',
    SMTP_PASS: 'secret',
    SMTP_FROM: 'sender@example.test',
  });
  assert.ok(config);
  assert.equal(config.port, 465);
  assert.equal(config.secure, true);
  assert.equal(config.from, 'sender@example.test');
  assert.equal(
    readSmtpConfiguration({
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'user@example.test',
      SMTP_FROM: 'sender@example.test',
    }),
    null,
  );
});

test('mock transport wysyła oba maile rezerwacji z rzeczywistym reservedUntil', async () => {
  const { sendReservationConfirmedEmail, sendReservationExpiredEmail } =
    await import('../src/lib/email');
  const confirmedResult = await sendReservationConfirmedEmail({
    email: 'recipient@example.test',
    fullName: 'Odbiorca',
    reservationCode: 'REZ-TEST',
    totalPrice: 25,
    reservedUntil: '2026-09-18T10:25:00.000Z',
    bookTitles: ['Podręcznik'],
  });
  const expiredResult = await sendReservationExpiredEmail({
    email: 'recipient@example.test',
    fullName: 'Odbiorca',
    title: 'Podręcznik',
    reservedUntil: '2026-09-18T10:25:00.000Z',
  });

  assert.equal(confirmedResult.success, true);
  assert.equal(expiredResult.success, true);
  assert.equal(transportOptions?.port, 465);
  assert.equal(transportOptions?.secure, true);
  assert.equal(sentMessages.length, 2);

  for (const sentMessage of sentMessages) {
    assert.match(
      String(sentMessage.from),
      /Targi Książek 2026 <sender@example\.test>/,
      'Pole From powinno zawierać display name i adres email',
    );
    assert.match(String(sentMessage.html), /18\.09\.2026, 12:25/);
    assert.doesNotMatch(String(sentMessage.html), /12 godzin/i);
  }
});

test('szablony resetu, gotowości, zatwierdzenia i odrzucenia mają branding, CTA i fallback tekstowy', async () => {
  const {
    sendBookApprovedEmail,
    sendBookRejectedEmail,
    sendPasswordResetEmail,
    sendReservationReadyEmail,
  } = await import('../src/lib/email');
  const before = sentMessages.length;

  await sendPasswordResetEmail({
    email: 'user@example.test',
    actionLink: 'https://example.test/reset?token=one-time',
  });
  await sendReservationReadyEmail({
    email: 'user@example.test',
    fullName: 'Jan Kowalski',
    reservationCode: 'REZ-ABC123',
  });
  await sendBookApprovedEmail({
    email: 'user@example.test',
    fullName: 'Jan Kowalski',
    title: 'Matematyka',
    price: 30,
  });
  await sendBookRejectedEmail({
    email: 'user@example.test',
    fullName: 'Jan Kowalski',
    title: 'Biologia',
    reason: 'Brak stron',
  });

  const messages = sentMessages.slice(before);
  assert.equal(messages.length, 4);
  for (const message of messages) {
    assert.match(String(message.html), /TARGI KSIĄŻEK · 2026/);
    assert.match(String(message.html), /targi\.pomoc@postol\.tech/);
    assert.match(String(message.html), /<a href=/);
    assert.ok(String(message.text).length > 20);
  }
  assert.match(String(messages[0].html), /Ustaw nowe hasło/);
  assert.match(String(messages[0].text), /one-time/);
  assert.doesNotMatch(String(messages[0].text), /nowe hasło:\s*\S+/i);
});
