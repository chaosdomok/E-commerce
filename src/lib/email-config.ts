export type SmtpConfiguration = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

type SmtpEnvironment = {
  [key: string]: string | undefined;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
};

export function readSmtpConfiguration(
  env: SmtpEnvironment = process.env,
): SmtpConfiguration | null {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASS;
  const from = env.SMTP_FROM?.trim();
  const port = Number(env.SMTP_PORT ?? 465);
  const secureValue = env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureValue
    ? ['1', 'true', 'yes', 'on'].includes(secureValue)
    : port === 465;

  if (
    !host ||
    !user ||
    !password ||
    !from ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    return null;
  }

  return { host, port, secure, user, password, from };
}

export function isSmtpConfigured(env: SmtpEnvironment = process.env): boolean {
  return readSmtpConfiguration(env) !== null;
}

const SENDER_DISPLAY_NAME = 'Targi Książek 2026';

/**
 * Zwraca pole From w formacie:
 *   "Targi Książek 2026 <address@example.com>"
 * Jeśli SMTP_FROM zawiera już display name (ma '<'), zwraca je bez zmian.
 */
export function buildFromHeader(from: string): string {
  if (from.includes('<')) return from;
  return `${SENDER_DISPLAY_NAME} <${from}>`;
}
