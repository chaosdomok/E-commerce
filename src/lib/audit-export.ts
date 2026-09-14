export type ExportableAuditLog = {
  action: string;
  userName: string;
  details: unknown;
  createdAt: string;
};

const SENSITIVE_KEY = /password|token|secret|authorization|cookie|session|api.?key|env/i;

function sanitizeDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDetails);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitizeDetails(nestedValue),
    ]),
  );
}

export function formatAuditLogsText(logs: ExportableAuditLog[]): string {
  return logs
    .map((log) => {
      const timestamp = new Date(log.createdAt).toLocaleString('sv-SE', {
        timeZone: 'Europe/Warsaw',
      });
      const details = JSON.stringify(sanitizeDetails(log.details), null, 2);
      return `[${timestamp}]\nUSER: ${log.userName}\nACTION: ${log.action}\nDETAILS: ${details}`;
    })
    .join('\n\n');
}
