export type EffectiveRole = 'user' | 'admin' | 'head_admin';

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function parseEmailList(value: string | null | undefined): string[] {
  return [...new Set((value ?? '').split(/[\s,;]+/).map(normalizeEmail).filter(Boolean))];
}

export function getEffectiveRole(
  email: string | null | undefined,
  storedRole: string | null | undefined = 'user',
  env: {
    adminEmails?: string;
    headAdminEmails?: string;
  } = {},
): EffectiveRole {
  const normalizedEmail = normalizeEmail(email);
  const adminEmails = parseEmailList(
    env.adminEmails ?? process.env.ADMIN_EMAILS,
  );
  const headAdminEmails = parseEmailList(
    env.headAdminEmails ?? process.env.HEAD_ADMIN_EMAILS,
  );

  if (normalizedEmail && headAdminEmails.includes(normalizedEmail)) {
    return 'head_admin';
  }

  if (
    (normalizedEmail && adminEmails.includes(normalizedEmail)) ||
    storedRole === 'admin'
  ) {
    return 'admin';
  }

  return 'user';
}
