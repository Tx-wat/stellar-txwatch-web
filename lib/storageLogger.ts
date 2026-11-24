import { captureException } from '@sentry/nextjs'

export type StorageErrorHandler = (context: StorageErrorContext) => void

export interface StorageErrorContext {
  key: string
  rawValue: string | null
  error: unknown
  timestamp: string
}

const errorHandlers: StorageErrorHandler[] = []

export function onStorageError(handler: StorageErrorHandler): void {
  errorHandlers.push(handler)
}

export function clearStorageErrorHandlers(): void {
  errorHandlers.length = 0
}

function forwardToSentry(ctx: StorageErrorContext): void {
  // Read the DSN at call time so tests (and runtime configuration changes)
  // are honoured without re-importing the module.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  try {
    captureException(ctx.error, {
      tags: { source: 'storageLogger' },
      extra: {
        key: ctx.key,
        timestamp: ctx.timestamp,
        rawValue: (ctx.rawValue ?? '').slice(0, 200),
      },
    })
  } catch {
    // Never let Sentry reporting crash the app
  }
}

function isDevelopment(): boolean {
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production'
}

/** Report a storage error to the console, Sentry, and registered handlers. */
export function emitStorageError(ctx: StorageErrorContext): void {
  const debugEnabled =
    typeof process !== 'undefined' && process.env.DEBUG_STORAGE === 'true'

  if (isDevelopment() || debugEnabled) {
    console.warn(
      `[storage] Parse error for key "${ctx.key}" at ${ctx.timestamp}:`,
      ctx.error,
      '\nRaw value (first 200 chars):',
      (ctx.rawValue ?? '').slice(0, 200),
    )
  }

  forwardToSentry(ctx)

  for (const handler of errorHandlers) {
    try {
      handler(ctx)
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
  const raw = storage.getItem(key)

  if (raw === null) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    emitStorageError({
      key,
      rawValue: raw,
      error,
      timestamp: new Date().toISOString(),
    })
    return fallback
  }
}
