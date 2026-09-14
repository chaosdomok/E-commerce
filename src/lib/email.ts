import nodemailer, { type Transporter } from 'nodemailer';
import { formatReservationDeadline } from '@/lib/reservation-policy';
import { buildFromHeader, readSmtpConfiguration } from '@/lib/email-config';
import { formatWholePln } from '@/lib/money';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

function getSmtpTransporter() {
  if (transporter) return transporter;

  const config = readSmtpConfiguration();
  if (!config) {
    throw new Error(
      'Brak kompletnej konfiguracji SMTP (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM).',
    );
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
  });

  return transporter;
}

function getSafeSmtpError(error: unknown) {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const candidate = error as { code?: unknown; command?: unknown; name?: unknown };
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    command:
      typeof candidate.command === 'string' ? candidate.command : undefined,
    name: typeof candidate.name === 'string' ? candidate.name : 'Error',
  };
}

export async function verifyEmailTransport(): Promise<{ success: boolean; error?: string }> {
  try {
    await getSmtpTransporter().verify();
    return { success: true };
  } catch (error) {
    console.error('[SMTP_VERIFY_ERROR]', getSafeSmtpError(error));
    return { success: false, error: 'Nie udało się zweryfikować połączenia SMTP.' };
  }
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const config = readSmtpConfiguration();
    if (!config) {
      throw new Error('Brak kompletnej konfiguracji SMTP.');
    }

    const mail = await getSmtpTransporter().sendMail({
      from: buildFromHeader(config.from),
      to,
      subject,
      html,
      text,
    });

    return { success: true, id: mail.messageId };
  } catch (error) {
    console.error('[SMTP_SEND_ERROR]', getSafeSmtpError(error));
    return { success: false, error: 'Nie udało się wysłać wiadomości e-mail przez SMTP.' };
  }
}

// ---------------------------------------------------------------------------
// High-level Transactional Email Helpers
// ---------------------------------------------------------------------------

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://targi.postol.tech').replace(/\/$/, '');

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderTransactionalEmail({
  preheader,
  title,
  content,
  cta,
}: {
  preheader: string;
  title: string;
  content: string;
  cta?: { label: string; href: string };
}) {
  const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f1f5f0;color:#0d0f0e;font-family:Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f0;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dde5de;border-radius:16px;overflow:hidden;">
<tr><td style="padding:22px 28px;border-bottom:1px solid #dde5de;"><span style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#12863c;">TARGI KSIĄŻEK · 2026</span></td></tr>
<tr><td style="padding:30px 28px;"><h1 style="margin:0 0 18px;font-size:25px;line-height:1.25;color:#0d0f0e;">${escapeHtml(title)}</h1><div style="font-size:16px;line-height:1.65;color:#626a64;">${content}</div>
${cta ? `<div style="margin-top:26px;"><a href="${escapeHtml(cta.href)}" style="display:inline-block;border-radius:9px;background:#0d0f0e;color:#ffffff;padding:12px 20px;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(cta.label)}</a></div>` : ''}
</td></tr>
<tr><td style="padding:20px 28px;background:#f7f8f5;border-top:1px solid #dde5de;font-size:12px;line-height:1.6;color:#8a938c;">Masz pytanie? Napisz na <a href="mailto:targi.pomoc@postol.tech" style="color:#12863c;text-decoration:none;">targi.pomoc@postol.tech</a>.<br>Wiadomość wygenerowana automatycznie przez platformę Targów Książek 2026.</td></tr>
</table></td></tr></table></body></html>`;
  return html;
}

function greeting(fullName: string) {
  return `<p style="margin:0 0 14px;">Cześć <strong style="color:#0d0f0e;">${escapeHtml(fullName)}</strong>,</p>`;
}

export async function sendWelcomeEmail({ email, fullName }: { email: string; fullName: string }) {
  const html = renderTransactionalEmail({ preheader: 'Twoje konto jest gotowe.', title: 'Witaj na Targach Książek 2026', content: `${greeting(fullName)}<p style="margin:0;">Twoje konto zostało utworzone. Możesz przeglądać katalog, rezerwować podręczniki i wystawiać własne książki.</p>`, cta: { label: 'Przejdź do katalogu', href: `${siteUrl()}/katalog` } });
  return sendEmail({ to: email, subject: 'Witaj na platformie Targów Książek!', html, text: `Cześć ${fullName},\n\nTwoje konto zostało utworzone. Przejdź do katalogu: ${siteUrl()}/katalog\n\nKontakt: targi.pomoc@postol.tech` });
}

export async function sendReservationConfirmedEmail({
  email,
  fullName,
  reservationCode,
  totalPrice,
  reservedUntil,
  bookTitles,
}: {
  email: string;
  fullName: string;
  reservationCode: string;
  totalPrice: number;
  reservedUntil: string;
  bookTitles: string[];
}) {
  const formattedDeadline = formatReservationDeadline(reservedUntil);
  const list = bookTitles.map((title) => `<li>${escapeHtml(title)}</li>`).join('');
  const html = renderTransactionalEmail({ preheader: `Kod rezerwacji ${reservationCode}`, title: 'Rezerwacja potwierdzona', content: `${greeting(fullName)}<p>Twoja rezerwacja została przyjęta.</p><div style="margin:18px 0;padding:18px;border-radius:12px;background:#eaf7ed;border:1px solid #cfe8d5;"><p style="margin:0 0 8px;"><strong>Kod:</strong> <span style="font-family:monospace;font-size:20px;color:#12863c;">${escapeHtml(reservationCode)}</span></p><p style="margin:0 0 6px;"><strong>Do zapłaty:</strong> ${formatWholePln(totalPrice)}</p><p style="margin:0;"><strong>Ważna do:</strong> ${escapeHtml(formattedDeadline)}</p></div><p><strong>Książki:</strong></p><ul>${list}</ul><p>Zgłoś się do sali 13 z kodem rezerwacji.</p>`, cta: { label: 'Zobacz rezerwację', href: `${siteUrl()}/profile` } });
  return sendEmail({ to: email, subject: `Potwierdzenie rezerwacji: ${reservationCode}`, html, text: `Cześć ${fullName},\n\nKod rezerwacji: ${reservationCode}\nWażna do: ${formattedDeadline}\nDo zapłaty: ${formatWholePln(totalPrice)}\nKsiążki: ${bookTitles.join(', ')}\n\nOdbiór: sala 13.` });
}

export async function sendBookSoldEmail({
  email,
  fullName,
  title,
  payoutAmount,
  refundMethod,
}: {
  email: string;
  fullName: string;
  title: string;
  payoutAmount: number;
  refundMethod: string;
}) {
  const html = renderTransactionalEmail({ preheader: `Do wypłaty: ${formatWholePln(payoutAmount)}`, title: 'Twój podręcznik został sprzedany', content: `${greeting(fullName)}<p>Podręcznik <strong>„${escapeHtml(title)}”</strong> został kupiony i odebrany.</p><div style="margin:18px 0;padding:18px;border-radius:12px;background:#eaf7ed;border:1px solid #cfe8d5;"><strong>Kwota do wypłaty:</strong> ${formatWholePln(payoutAmount)}<br><span style="font-size:14px;">Forma rozliczenia: ${escapeHtml(refundMethod)}</span></div><p>Środki zostaną przekazane zgodnie z wybraną formą wypłaty.</p>`, cta: { label: 'Przejdź do profilu', href: `${siteUrl()}/profile` } });
  return sendEmail({ to: email, subject: `Twój podręcznik został sprzedany! (+${formatWholePln(payoutAmount)})`, html, text: `Cześć ${fullName},\n\nPodręcznik „${title}” został sprzedany. Do wypłaty: ${formatWholePln(payoutAmount)}. Forma rozliczenia: ${refundMethod}.` });
}

export async function sendBookSubmittedEmail({ email, fullName, title }: { email: string; fullName: string; title: string }) {
  const html = renderTransactionalEmail({ preheader: 'Książka czeka na weryfikację.', title: 'Książka wysłana do akceptacji', content: `${greeting(fullName)}<p>Podręcznik <strong>„${escapeHtml(title)}”</strong> został wysłany i czeka na weryfikację administratora.</p>`, cta: { label: 'Zobacz moje książki', href: `${siteUrl()}/profile` } });
  return sendEmail({ to: email, subject: `Książka „${title}” czeka na akceptację`, html, text: `Cześć ${fullName},\n\nKsiążka „${title}” została wysłana i czeka na akceptację.` });
}

export async function sendBooksSubmittedBatchEmail({ email, fullName, titles }: { email: string; fullName: string; titles: string[] }) {
  const list = titles.map(t => `<li>${escapeHtml(t)}</li>`).join('');
  const html = renderTransactionalEmail({ preheader: 'Książki czekają na weryfikację.', title: 'Książki wysłane do akceptacji', content: `${greeting(fullName)}<p>Przyjęliśmy ${titles.length} podręczników do weryfikacji przez administratora. Lista książek:</p><ul>${list}</ul>`, cta: { label: 'Zobacz moje książki', href: `${siteUrl()}/profile` } });
  return sendEmail({ to: email, subject: `Przyjęliśmy ${titles.length} podręczników do akceptacji`, html, text: `Cześć ${fullName},\n\nPrzyjęliśmy ${titles.length} podręczników do weryfikacji:\n${titles.join('\\n')}` });
}

export async function sendBookApprovedEmail({ email, fullName, title, price }: { email: string; fullName: string; title: string; price: number }) {
  const html = renderTransactionalEmail({ preheader: 'Książka jest już widoczna w katalogu.', title: 'Książka zatwierdzona', content: `${greeting(fullName)}<p>Podręcznik <strong>„${escapeHtml(title)}”</strong> został zaakceptowany i jest dostępny w katalogu. Cena katalogowa: ${formatWholePln(price)}.</p>`, cta: { label: 'Otwórz katalog', href: `${siteUrl()}/katalog` } });
  return sendEmail({ to: email, subject: `Książka „${title}” jest już dostępna`, html, text: `Cześć ${fullName},\n\nKsiążka „${title}” została zaakceptowana. Cena katalogowa: ${formatWholePln(price)}.` });
}

export async function sendBookRejectedEmail({ email, fullName, title, reason }: { email: string; fullName: string; title: string; reason?: string }) {
  const reasonText = reason ? ` Powód: ${reason}` : '';
  const html = renderTransactionalEmail({ preheader: 'Książka nie została przyjęta do katalogu.', title: 'Książka odrzucona', content: `${greeting(fullName)}<p>Podręcznik <strong>„${escapeHtml(title)}”</strong> nie został przyjęty do katalogu.${reason ? ` Powód: ${escapeHtml(reason)}` : ''}</p>`, cta: { label: 'Zobacz moje książki', href: `${siteUrl()}/profile` } });
  return sendEmail({ to: email, subject: `Książka „${title}” została odrzucona`, html, text: `Cześć ${fullName},\n\nKsiążka „${title}” została odrzucona.${reasonText}` });
}

export async function sendPayoutReadyEmail({ email, fullName, amount, paymentMethod }: { email: string; fullName: string; amount: number; paymentMethod?: string }) {
  let payoutMessage = '';
  let subject = 'Środki są gotowe do wypłaty';

  if (paymentMethod === 'CASH' || paymentMethod === 'Gotówka w szkole') {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('pl-PL', { month: 'long' });
    payoutMessage = `Odbiór dnia ${day} ${month} na długiej przerwie w sali 55.`;
    subject = 'Gotówka gotowa do odbioru';
  } else if (paymentMethod === 'BLIK' || paymentMethod === 'Przelew') {
    payoutMessage = 'Środki zostały przelane i do 7 dni roboczych powinny dojść na konto.';
    subject = 'Przelew wykonany';
  } else {
    payoutMessage = 'Kwota jest gotowa do wypłaty w sali 13.';
  }

  const html = renderTransactionalEmail({
    preheader: `Do wypłaty: ${formatWholePln(amount)}`,
    title: 'Środki są gotowe do wypłaty',
    content: `${greeting(fullName)}<p>Kwota <strong>${formatWholePln(amount)}</strong> została wypłacona.</p><div style="margin:18px 0;padding:18px;border-radius:12px;background:#eaf7ed;border:1px solid #cfe8d5;"><p style="margin:0;">${escapeHtml(payoutMessage)}</p></div>`,
    cta: { label: 'Przejdź do profilu', href: `${siteUrl()}/profile` }
  });
  return sendEmail({
    to: email,
    subject,
    html,
    text: `Cześć ${fullName},\n\nKwota ${formatWholePln(amount)} została wypłacona.\n\n${payoutMessage}`
  });
}

export async function sendOfflineAccountActivationEmail({ email, fullName }: { email: string; fullName: string }) {
  const html = renderTransactionalEmail({ preheader: 'Administrator utworzył Twoje konto.', title: 'Konto zostało utworzone', content: `${greeting(fullName)}<p>Administrator utworzył i aktywował Twoje konto. Zaloguj się adresem e-mail oraz hasłem ustalonym bezpośrednio z administratorem.</p>`, cta: { label: 'Przejdź do logowania', href: `${siteUrl()}/login` } });
  return sendEmail({ to: email, subject: 'Konto Targów Książek zostało utworzone', html, text: `Cześć ${fullName},\n\nAdministrator utworzył Twoje konto. Zaloguj się danymi ustalonymi bezpośrednio z administratorem: ${siteUrl()}/login` });
}

export async function sendReservationReadyEmail({ email, fullName, reservationCode }: { email: string; fullName: string; reservationCode: string }) {
  const html = renderTransactionalEmail({ preheader: `Rezerwacja ${reservationCode} jest gotowa.`, title: 'Rezerwacja gotowa do odbioru', content: `${greeting(fullName)}<p>Rezerwacja <strong style="font-family:monospace;color:#12863c;">${escapeHtml(reservationCode)}</strong> jest gotowa do odbioru w sali 13.</p>`, cta: { label: 'Zobacz rezerwację', href: `${siteUrl()}/profile` } });
  return sendEmail({ to: email, subject: `Rezerwacja ${reservationCode} jest gotowa do odbioru`, html, text: `Cześć ${fullName},\n\nRezerwacja ${reservationCode} jest gotowa do odbioru w sali 13.` });
}

export async function sendReservationExpiredEmail({
  email,
  fullName,
  title,
  reservedUntil,
}: {
  email: string;
  fullName: string;
  title: string;
  reservedUntil: Date | string;
}) {
  const formattedDeadline = formatReservationDeadline(reservedUntil);
  const html = renderTransactionalEmail({ preheader: 'Rezerwacja wygasła.', title: 'Twoja rezerwacja wygasła', content: `${greeting(fullName)}<p>Rezerwacja książki <strong>„${escapeHtml(title)}”</strong> była ważna do ${escapeHtml(formattedDeadline)} i wygasła. Książka wróciła do katalogu.</p>`, cta: { label: 'Otwórz katalog', href: `${siteUrl()}/katalog` } });
  return sendEmail({ to: email, subject: 'Twoja rezerwacja wygasła', html, text: `Cześć ${fullName},\n\nRezerwacja książki „${title}” ważna do ${formattedDeadline} wygasła. Książka wróciła do katalogu.` });
}

export async function sendPasswordChangedEmail({ email, fullName }: { email: string; fullName: string }) {
  const html = renderTransactionalEmail({ preheader: 'Hasło do konta zostało zmienione.', title: 'Hasło zostało zmienione', content: `${greeting(fullName)}<p>Hasło do Twojego konta zostało zmienione. Jeśli to nie Ty wykonałeś tę operację, skontaktuj się niezwłocznie z obsługą Targów.</p>`, cta: { label: 'Przejdź do logowania', href: `${siteUrl()}/login` } });
  return sendEmail({ to: email, subject: 'Hasło zostało zmienione', html, text: `Cześć ${fullName},\n\nHasło do Twojego konta zostało zmienione. Jeśli to nie Ty, napisz na targi.pomoc@postol.tech.` });
}

export async function sendPasswordResetEmail({ email, actionLink }: { email: string; actionLink: string }) {
  const html = renderTransactionalEmail({ preheader: 'Jednorazowy link do ustawienia nowego hasła.', title: 'Ustaw nowe hasło', content: '<p>Otrzymaliśmy prośbę o zmianę hasła. Użyj poniższego jednorazowego linku. Jeśli nie wysyłałeś tej prośby, zignoruj wiadomość.</p>', cta: { label: 'Ustaw nowe hasło', href: actionLink } });
  return sendEmail({ to: email, subject: 'Ustaw nowe hasło — Targi Książek', html, text: `Ustaw nowe hasło, korzystając z jednorazowego linku:\n${actionLink}\n\nJeśli nie wysyłałeś tej prośby, zignoruj wiadomość.` });
}

export async function sendAccountBlockedEmail({ email, fullName }: { email: string; fullName: string }) {
  const html = renderTransactionalEmail({
    preheader: 'Twoje konto zostało zablokowane.',
    title: 'Twoje konto zostało zablokowane',
    content: `${greeting(fullName)}<p style="margin:0 0 14px;">Twoje konto w systemie Targów Książek 2026 zostało zablokowane.</p><p style="margin:0 0 14px;">Nie możesz obecnie korzystać z funkcji wymagających zalogowania.</p><p style="margin:0;">Jeżeli uważasz, że blokada została nałożona omyłkowo, skontaktuj się z obsługą Targów Książek pisząc na <a href="mailto:targi.pomoc@postol.tech" style="color:#12863c;text-decoration:none;">targi.pomoc@postol.tech</a>.</p>`,
  });
  return sendEmail({
    to: email,
    subject: 'Twoje konto zostało zablokowane — Targi Książek 2026',
    html,
    text: `Cześć ${fullName},\n\nTwoje konto w systemie Targów Książek 2026 zostało zablokowane.\n\nNie możesz obecnie korzystać z funkcji wymagających zalogowania.\n\nJeżeli uważasz, że blokada została nałożona omyłkowo, skontaktuj się z obsługą Targów Książek: targi.pomoc@postol.tech`,
  });
}

export async function sendBooksSoldBatchEmail({ email, fullName, titles, totalPayoutAmount, refundMethod }: { email: string; fullName: string; titles: string[]; totalPayoutAmount: number; refundMethod: string }) {
  const list = titles.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const html = renderTransactionalEmail({
    preheader: `Do wypłaty: ${formatWholePln(totalPayoutAmount)}`,
    title: 'Twoje podręczniki zostały sprzedane',
    content: `${greeting(fullName)}<p>Odebrano ${titles.length} z Twoich podręczników:</p><ul>${list}</ul><div style="margin:18px 0;padding:18px;border-radius:12px;background:#eaf7ed;border:1px solid #cfe8d5;"><strong>Łączna kwota do wypłaty:</strong> ${formatWholePln(totalPayoutAmount)}<br><span style="font-size:14px;">Forma rozliczenia: ${escapeHtml(refundMethod)}</span></div><p>Środki zostaną przekazane zgodnie z wybraną formą wypłaty.</p>`,
    cta: { label: 'Przejdź do profilu', href: `${siteUrl()}/profile` }
  });
  return sendEmail({ to: email, subject: `Kolejne podręczniki sprzedane! (+${formatWholePln(totalPayoutAmount)})`, html, text: `Cześć ${fullName},\n\nOdebrano ${titles.length} z Twoich podręczników. Do wypłaty łącznie: ${formatWholePln(totalPayoutAmount)}. Forma rozliczenia: ${refundMethod}.` });
}

export async function sendBooksApprovedBatchEmail({ email, fullName, books }: { email: string; fullName: string; books: {title: string, price: number}[] }) {
  const list = books.map((b) => `<li>${escapeHtml(b.title)} - ${formatWholePln(b.price)}</li>`).join('');
  const html = renderTransactionalEmail({
    preheader: 'Twoje książki są już widoczne w katalogu.',
    title: 'Książki zatwierdzone',
    content: `${greeting(fullName)}<p>Zaakceptowano ${books.length} z Twoich podręczników, są one teraz dostępne w katalogu:</p><ul>${list}</ul>`,
    cta: { label: 'Otwórz katalog', href: `${siteUrl()}/katalog` }
  });
  return sendEmail({ to: email, subject: `Zaakceptowano ${books.length} podręczników`, html, text: `Cześć ${fullName},\n\nZaakceptowano ${books.length} z Twoich podręczników.` });
}

export async function sendBooksRejectedBatchEmail({ email, fullName, books }: { email: string; fullName: string; books: {title: string, reason?: string}[] }) {
  const list = books.map((b) => `<li><strong>${escapeHtml(b.title)}</strong>${b.reason ? `<br><span style="font-size:13px;color:#626a64;">Powód: ${escapeHtml(b.reason)}</span>` : ''}</li>`).join('');
  const html = renderTransactionalEmail({
    preheader: 'Niektóre książki nie zostały przyjęte do katalogu.',
    title: 'Książki odrzucone',
    content: `${greeting(fullName)}<p>Odrzucono ${books.length} z Twoich zgłoszonych podręczników:</p><ul>${list}</ul>`,
    cta: { label: 'Zobacz moje książki', href: `${siteUrl()}/profile` }
  });
  return sendEmail({ to: email, subject: `Odrzucono ${books.length} podręczników`, html, text: `Cześć ${fullName},\n\nOdrzucono ${books.length} z Twoich zgłoszonych podręczników.` });
}
