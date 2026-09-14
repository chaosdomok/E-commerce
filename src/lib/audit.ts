import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export type AuditAction =
  | 'USER_REGISTER'
  | 'USER_LOGIN'
  | 'USER_UPDATE_PROFILE'
  | 'BOOK_CREATE'
  | 'BOOK_UPDATE'
  | 'BOOK_DELETE'
  | 'BOOK_APPROVE'
  | 'BOOK_REJECT'
  | 'BOOK_RESERVE'
  | 'BOOK_CANCEL_RESERVATION'
  | 'BOOK_FULFILL_SALE'
  | 'ADMIN_CREATE_USER'
  | 'ADMIN_UPDATE_SETTINGS'
  | 'ADMIN_UPDATE_MARKUP';

interface LogAuditParams {
  action: AuditAction | string;
  userId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent({
  action,
  userId,
  details,
  ipAddress,
  userAgent,
}: LogAuditParams) {
  try {
    let resolvedIp = ipAddress;
    let resolvedUa = userAgent;

    if (!resolvedIp || !resolvedUa) {
      try {
        const headerList = await headers();
        resolvedIp = resolvedIp || headerList.get('x-forwarded-for')?.split(',')[0].trim() || headerList.get('x-real-ip') || '127.0.0.1';
        resolvedUa = resolvedUa || headerList.get('user-agent') || 'system';
      } catch {
        resolvedIp = resolvedIp || '127.0.0.1';
        resolvedUa = resolvedUa || 'system';
      }
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details: details ? (details as any) : undefined,
        ipAddress: resolvedIp.slice(0, 45),
        userAgent: resolvedUa.slice(0, 500),
      },
    });

    return log;
  } catch (error) {
    console.error(`[AUDIT_LOG_ERROR] Failed to record audit log for action ${action}:`, error);
    return null;
  }
}
