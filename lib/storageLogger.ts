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

function emitStorageError(ctx: StorageErrorContext): void {
  const isDev =
    typeof process !== 'undefined'
      ? process.env.NODE_ENV !== 'production'
      : true;
  const debugEnabled =
    typeof process !== 'undefined'
      ? process.env.DEBUG_STORAGE === 'true'
      : false;

  if (isDev || debugEnabled) {
    console.warn(
      `[storage] Parse error for key "${ctx.key}" at ${ctx.timestamp}:`,
      ctx.error,
      '\nRaw value (first 200 chars):',
      (ctx.rawValue ?? '').slice(0, 200),
    );
  }

  for (const handler of errorHandlers) {
    try {
      handler(ctx);
    } catch {
      // Never let a handler crash the app
    }
  }
}

export function safeParseStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);

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
