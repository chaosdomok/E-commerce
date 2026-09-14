import 'server-only';

export const DEFAULT_SLOW_THRESHOLD_MS = 1000;

export interface PerfLogEntry {
  operation: string;
  durationMs: number;
  result: 'success' | 'error';
  slowThresholdMs?: number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  error?: unknown;
}

const SENSITIVE_KEY_REGEX =
  /password|token|secret|cookie|auth|email|phone|credential|connection|authorization/i;

function sanitizeValue(value: unknown): string | number | boolean {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  const str = String(value ?? '');
  if (str.includes('@')) return '[REDACTED_EMAIL]';
  if (str.length > 100) return str.slice(0, 30) + '...[TRUNCATED]';
  return str;
}

export function formatPerformanceLog(entry: PerfLogEntry): { tag: string; message: string } {
  const threshold = entry.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS;
  const isSlow = entry.durationMs >= threshold;
  const isError = entry.result === 'error';

  let tag = '[PERF]';
  if (isSlow) tag += '[SLOW]';
  if (isError) tag += '[ERROR]';

  const parts = [
    tag,
    `operation=${entry.operation}`,
    `durationMs=${Math.round(entry.durationMs)}`,
    `result=${entry.result}`,
  ];

  if (entry.result === 'error' && entry.error) {
    const errorMsg = entry.error instanceof Error ? entry.error.message : String(entry.error);
    parts.push(`errorMessage=${sanitizeValue(errorMsg)}`);
  }

  if (entry.metadata) {
    for (const [key, rawValue] of Object.entries(entry.metadata)) {
      if (rawValue === undefined || rawValue === null) continue;
      if (SENSITIVE_KEY_REGEX.test(key)) continue;
      parts.push(`${key}=${sanitizeValue(rawValue)}`);
    }
  }

  return { tag, message: parts.join(' ') };
}

export function logPerformance(entry: PerfLogEntry): void {
  const { message } = formatPerformanceLog(entry);
  if (entry.result === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
}

export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    slowThresholdMs?: number;
    metadata?: Record<string, string | number | boolean | null | undefined>;
    getMetadata?: (res: T) => Record<string, string | number | boolean | null | undefined>;
  },
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = performance.now() - start;
    const computedMeta = {
      ...(options?.metadata || {}),
      ...(options?.getMetadata ? options.getMetadata(result) : {}),
    };
    logPerformance({
      operation,
      durationMs,
      result: 'success',
      slowThresholdMs: options?.slowThresholdMs,
      metadata: Object.keys(computedMeta).length > 0 ? computedMeta : undefined,
    });
    return result;
  } catch (error) {
    const durationMs = performance.now() - start;
    logPerformance({
      operation,
      durationMs,
      result: 'error',
      slowThresholdMs: options?.slowThresholdMs,
      metadata: options?.metadata,
      error,
    });
    throw error;
  }
}
