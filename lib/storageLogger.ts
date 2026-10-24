import { env } from '@/lib/env';

export type StorageErrorHandler = (context: StorageErrorContext) => void;

export interface StorageErrorContext {
  key: string;
  rawValue: string | null;
  error: unknown;
  timestamp: string;
}

const errorHandlers: StorageErrorHandler[] = [];

export function onStorageError(handler: StorageErrorHandler): void {
  errorHandlers.push(handler);
}

export function clearStorageErrorHandlers(): void {
  errorHandlers.length = 0;
}

function forwardToSentry(ctx: StorageErrorContext): void {
  try {
    const client = Sentry.getClient();
    if (!client) {
      return;
    }

    Sentry.captureException(ctx.error, {
      tags: { source: 'storageLogger' },
      extra: {
        key: ctx.key,
        timestamp: ctx.timestamp,
        rawValue: (ctx.rawValue ?? '').slice(0, 200),
      },
    });
  } catch {
    // Never let Sentry reporting crash the app
  }
}

function emitStorageError(ctx: StorageErrorContext): void {
  const isDev = env.NODE_ENV !== 'production';
  const debugEnabled = env.DEBUG_STORAGE;

  if (isDev || debugEnabled) {
    console.warn(
      `[storage] Parse error for key "${ctx.key}" at ${ctx.timestamp}:`,
      ctx.error,
      '\nRaw value (first 200 chars):',
      (ctx.rawValue ?? '').slice(0, 200),
    );
  }

  forwardToSentry(ctx);

  for (const handler of errorHandlers) {
    try {
      handler(ctx);
    } catch {
      // Never let a handler crash the app
    }
  }
}

export function safeParseStorage<T>(
  key: string,
  fallback: T,
  storage: Pick<Storage, 'getItem'> = localStorage,
): T {
  const raw = storage.getItem(key);

  if (raw === null) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    emitStorageError({
      key,
      rawValue: raw,
      error,
      timestamp: new Date().toISOString(),
    });
    return fallback;
  }
}